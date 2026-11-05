// Status polling for the customer's own booking (requires the private access token).
import { displayStatus, getBookingWithToken } from "@/lib/booking";
import { NotFoundError } from "@/lib/errors";
import { handler, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const b = await getBookingWithToken(id, token);
  if (!b) throw new NotFoundError("Booking not found.");
  return json({ reference: b.reference, status: displayStatus(b), payment_status: b.payment_status, hold_expires_at: b.hold_expires_at });
});
