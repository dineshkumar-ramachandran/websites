// Razorpay webhook endpoint. Configure in Razorpay Dashboard → Settings → Webhooks:
//   URL: https://<your-domain>/api/webhooks/razorpay
//   Events: payment.captured, payment.failed, order.paid
//   Secret: same value as RAZORPAY_WEBHOOK_SECRET
// Deliveries are verified (HMAC of the raw body) and de-duplicated by event id, so retries are safe.
import { applyCapturedPayment, recordPaymentFailure } from "@/lib/booking";
import { NotFoundError } from "@/lib/errors";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

type RzPayment = { id: string; order_id: string; amount: number; status: string; error_description?: string };

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, sig)) return new Response("invalid signature", { status: 400 });

  let evt: { event: string; payload?: { payment?: { entity: RzPayment } } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const payment = evt.payload?.payment?.entity;
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${evt.event}:${payment?.id ?? "unknown"}`;
  const webhook = { eventId, eventType: evt.event, payload: evt };

  try {
    if ((evt.event === "payment.captured" || evt.event === "order.paid") && payment && payment.status === "captured") {
      await applyCapturedPayment({ provider: "razorpay", orderId: payment.order_id, paymentId: payment.id, amountPaise: payment.amount, actor: { kind: "webhook" }, webhook });
    } else if (evt.event === "payment.failed" && payment) {
      await recordPaymentFailure("razorpay", payment.order_id, payment.id, payment.error_description ?? "failed", webhook);
    }
    return new Response("ok", { status: 200 });
  } catch (err) {
    if (err instanceof NotFoundError) {
      // Not one of our orders — acknowledge so Razorpay stops retrying.
      console.warn("[webhook] unknown order", payment?.order_id);
      return new Response("ignored", { status: 200 });
    }
    console.error("[webhook] processing failed", err);
    return new Response("error", { status: 500 }); // Razorpay will retry; processing is idempotent.
  }
}
