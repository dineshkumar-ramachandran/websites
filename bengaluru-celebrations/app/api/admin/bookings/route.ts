// Manual bookings (phone / walk-in). Same engine and availability rules as online bookings;
// admins may skip the online notice period and advance-booking limit.
import { adminActor, requireAdminApi } from "@/lib/auth";
import { createBooking, setPaymentStatus } from "@/lib/booking";
import { parseBookingInput } from "@/lib/booking-input";
import { handler, json, readJson } from "@/lib/http";
import { rupeesToPaise } from "@/lib/money";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const admin = await requireAdminApi(req);
  const body = await readJson(req);
  const input = parseBookingInput(body);
  const actor = adminActor(admin);
  const { booking } = await createBooking(input, { actor, confirm: body.confirm !== false });
  const paid = Number(body.offlinePaidRupees);
  if (Number.isFinite(paid) && paid > 0) {
    const amount = rupeesToPaise(paid);
    await setPaymentStatus(booking.id, amount >= booking.total_paise ? "paid" : "pending", "Offline payment recorded at manual booking", actor, amount);
  }
  return json({ id: booking.id, reference: booking.reference }, 201);
});
