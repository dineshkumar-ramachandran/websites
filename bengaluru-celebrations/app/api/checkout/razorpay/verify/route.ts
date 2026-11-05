// Called by the browser after Razorpay Checkout returns. We do NOT trust the browser:
//  1. verify the HMAC signature with the key secret,
//  2. fetch the payment from Razorpay's API and check status, order and amount,
//  3. apply it through the same idempotent path as the webhook.
import { applyCapturedPayment, getBookingWithToken } from "@/lib/booking";
import { queryOne } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { handler, json, readJson } from "@/lib/http";
import { fetchPayment, verifyCheckoutSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const body = await readJson(req);
  const b = await getBookingWithToken(String(body.bookingId ?? ""), String(body.token ?? ""));
  if (!b) throw new NotFoundError("Booking not found.");
  const orderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");
  const own = await queryOne("SELECT 1 FROM payments WHERE booking_id=$1 AND provider='razorpay' AND provider_order_id=$2", [b.id, orderId]);
  if (!own) throw new AppError(400, "bad_order", "This payment does not belong to this booking.");
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) throw new AppError(400, "bad_signature", "Payment verification failed.");

  const p = await fetchPayment(paymentId);
  if (p.order_id !== orderId) throw new AppError(400, "bad_order", "Payment does not match the order.");
  if (p.status !== "captured") {
    // Authorized but not yet captured: the payment.captured webhook will confirm it.
    return json({ status: "held", payment_status: "pending", message: "Payment authorised — waiting for confirmation from Razorpay." });
  }
  const r = await applyCapturedPayment({ provider: "razorpay", bookingId: b.id, orderId, paymentId, amountPaise: p.amount, actor: { kind: "customer" } });
  return json({ status: r.booking.status, payment_status: r.booking.payment_status, outcome: r.outcome });
});
