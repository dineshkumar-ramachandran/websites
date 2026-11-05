import { adminActor, requireAdminApi } from "@/lib/auth";
import {
  adminConfirm,
  cancelBooking,
  PAYMENT_STATUSES,
  rescheduleBooking,
  resolveAttention,
  setPaymentStatus,
  updateBookingDetails,
} from "@/lib/booking";
import { parseChoice } from "@/lib/booking-input";
import { AppError } from "@/lib/errors";
import { handler, json, readJson } from "@/lib/http";
import { rupeesToPaise } from "@/lib/money";
import { Checker, EVENT_TYPE_VALUES } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminApi(req);
  const actor = adminActor(admin);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError(404, "not_found", "Booking not found.");
  const body = await readJson(req);
  const c = new Checker(body);
  switch (body.action) {
    case "confirm": {
      const b = await adminConfirm(id, actor);
      return json({ status: b.status });
    }
    case "cancel": {
      const reason = c.str("reason", { required: true, min: 3, max: 500, label: "Cancellation reason" });
      c.done();
      const b = await cancelBooking(id, actor, reason);
      return json({ status: b.status });
    }
    case "reschedule": {
      const hallId = c.int("hallId", { required: true, min: 1, label: "Hall" });
      const date = c.date("date", { required: true, label: "Date" });
      const choice = parseChoice(c, "option");
      c.done();
      const b = await rescheduleBooking(id, { hallId, date, choice: choice!, reprice: c.bool("reprice") }, actor);
      return json({ status: b.status, event_date: b.event_date });
    }
    case "payment": {
      const status = c.oneOf("paymentStatus", PAYMENT_STATUSES, { required: true, label: "Payment status" });
      const note = c.str("note", { max: 300, label: "Note" });
      const amount = body.offlineAmountRupees ? Number(body.offlineAmountRupees) : 0;
      if (!Number.isFinite(amount) || amount < 0) c.fail("offlineAmountRupees", "Enter a valid amount.");
      c.done();
      await setPaymentStatus(id, status, note, actor, amount > 0 ? rupeesToPaise(amount) : undefined);
      return json({ ok: true });
    }
    case "resolve": {
      const note = c.str("note", { required: true, min: 3, max: 500, label: "Resolution note" });
      c.done();
      await resolveAttention(id, note, actor);
      return json({ ok: true });
    }
    case "details": {
      const eventType = c.oneOf("eventType", EVENT_TYPE_VALUES, { required: true, label: "Event type" });
      const d = {
        customerName: c.str("customerName", { required: true, min: 2, max: 100, label: "Name" }),
        customerPhone: c.phone("customerPhone", { required: true }),
        customerEmail: c.email("customerEmail", { required: true }),
        guestCount: c.int("guestCount", { required: true, min: 1, max: 5000, label: "Guests" }),
        eventType,
        eventTypeOther: c.str("eventTypeOther", { max: 80, required: eventType === "other", label: "Event description" }),
        notes: c.str("notes", { max: 1000 }),
      };
      c.done();
      await updateBookingDetails(id, d, actor);
      return json({ ok: true });
    }
    default:
      throw new AppError(400, "bad_action", "Unknown action.");
  }
});
