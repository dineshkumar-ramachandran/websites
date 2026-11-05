// Creates a Razorpay order for an active hold. Amount always comes from the server-side booking record.
import { getBookingWithToken } from "@/lib/booking";
import { query } from "@/lib/db";
import { AppError, NotFoundError, UnavailableError } from "@/lib/errors";
import { clientIp, handler, json, rateLimit, readJson } from "@/lib/http";
import { createOrder, razorpayConfigured } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  if (!razorpayConfigured()) throw new AppError(503, "payments_unconfigured", "Online payments are not configured.");
  rateLimit(`order:${clientIp(req)}`, 20, 10 * 60_000);
  const body = await readJson(req);
  const b = await getBookingWithToken(String(body.bookingId ?? ""), String(body.token ?? ""));
  if (!b) throw new NotFoundError("Booking not found.");
  if (b.status !== "held" || !b.hold_expires_at || new Date(b.hold_expires_at) <= new Date()) {
    throw new UnavailableError("Your hold is no longer active. Please choose the slot again.");
  }
  // Reuse an open order for this booking so retries don't create many orders.
  const existing = await query<{ provider_order_id: string; amount_paise: number }>(
    "SELECT provider_order_id, amount_paise FROM payments WHERE booking_id=$1 AND provider='razorpay' AND status='created' ORDER BY id DESC LIMIT 1",
    [b.id]
  );
  if (existing[0] && existing[0].amount_paise === b.total_paise) {
    return json({ orderId: existing[0].provider_order_id, amount: b.total_paise, reference: b.reference });
  }
  const order = await createOrder(b.total_paise, b.reference, { booking_id: b.id, reference: b.reference });
  await query(
    "INSERT INTO payments(booking_id, provider, provider_order_id, amount_paise, status) VALUES ($1,'razorpay',$2,$3,'created') ON CONFLICT DO NOTHING",
    [b.id, order.id, b.total_paise]
  );
  await query("UPDATE bookings SET payment_status='pending', updated_at=now() WHERE id=$1 AND payment_status IN ('unpaid','failed')", [b.id]);
  return json({ orderId: order.id, amount: b.total_paise, reference: b.reference });
});
