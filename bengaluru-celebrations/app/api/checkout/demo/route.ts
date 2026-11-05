// DEMO checkout: confirms a held booking without collecting money. Disabled when live payments are configured
// (unless DEMO_PAYMENTS=true). The booking's payment_status becomes "demo", never "paid".
import { applyCapturedPayment, getBookingWithToken } from "@/lib/booking";
import { AppError, NotFoundError, UnavailableError } from "@/lib/errors";
import { handler, json, readJson } from "@/lib/http";
import { demoPaymentsEnabled } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  if (!demoPaymentsEnabled()) throw new AppError(403, "demo_disabled", "Demo checkout is disabled.");
  const body = await readJson(req);
  const b = await getBookingWithToken(String(body.bookingId ?? ""), String(body.token ?? ""));
  if (!b) throw new NotFoundError("Booking not found.");
  if (b.status !== "held") throw new AppError(409, "invalid_state", b.status === "confirmed" ? "This booking is already confirmed." : "This hold is no longer active.");
  if (!b.hold_expires_at || new Date(b.hold_expires_at) <= new Date()) throw new UnavailableError("Your hold has expired. Please choose the slot again.");
  // Idempotent: the payment id is derived from the booking, so double clicks are no-ops.
  const r = await applyCapturedPayment({ provider: "demo", bookingId: b.id, paymentId: `demo_${b.id}`, amountPaise: b.total_paise, actor: { kind: "customer" } });
  if (r.outcome === "conflict") throw new UnavailableError("Your hold expired and the slot has been taken. Please choose another time.");
  return json({ status: r.booking.status, payment_status: r.booking.payment_status });
});
