// Customer checkout step 1: validate, re-check availability and create a temporary hold.
import { createBooking } from "@/lib/booking";
import { parseBookingInput } from "@/lib/booking-input";
import { AppError } from "@/lib/errors";
import { clientIp, handler, json, rateLimit, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  rateLimit(`hold:${clientIp(req)}`, 20, 10 * 60_000);
  const body = await readJson(req);
  if (body.agree !== true) throw new AppError(400, "validation_error", "Please accept the policies to continue.", { fields: { agree: "Please confirm you have read the cancellation policy." } });
  const input = parseBookingInput(body);
  const { booking, accessToken } = await createBooking(input, { actor: { kind: "customer" } });
  return json(
    {
      bookingId: booking.id,
      reference: booking.reference,
      token: accessToken,
      holdExpiresAt: booking.hold_expires_at,
      reviewUrl: `/book/review/${booking.id}?t=${encodeURIComponent(accessToken)}`,
    },
    201
  );
});
