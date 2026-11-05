// Customer booking lookup: reference + the email or phone used. Rate limited; identical
// error for "not found" and "wrong contact" so references can't be probed. Only the
// matching booking's own details are returned.
import { displayStatus, lookupBooking } from "@/lib/booking";
import { AppError } from "@/lib/errors";
import { getHallDetail } from "@/lib/halls";
import { clientIp, handler, json, rateLimit, readJson } from "@/lib/http";
import { formatDate, formatTime, istTimeOf } from "@/lib/time";
import { eventTypeLabel, Checker } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  rateLimit(`lookup:${clientIp(req)}`, 10, 15 * 60_000);
  const body = await readJson(req);
  const c = new Checker(body);
  const reference = c.str("reference", { required: true, max: 20, label: "Booking reference" });
  const contact = c.str("contact", { required: true, max: 200, label: "Email or phone" });
  c.done();
  const b = await lookupBooking(reference, contact);
  if (!b) throw new AppError(404, "not_found", "We couldn’t find a booking with those details. Check the reference and use the same email or phone number you booked with.");
  const hall = await getHallDetail(b.hall_id, { includeInactive: true });
  return json({
    booking: {
      reference: b.reference,
      status: displayStatus(b),
      payment_status: b.payment_status,
      hall: hall?.name ?? "",
      location: hall?.location_name ?? "",
      address: hall?.address ?? "",
      date: formatDate(b.event_date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      time: `${b.slot_label}: ${formatTime(istTimeOf(new Date(b.start_at)))} – ${formatTime(istTimeOf(new Date(b.end_at)))}`,
      event: eventTypeLabel(b.event_type, b.event_type_other),
      guests: b.guest_count,
      name: b.customer_name,
      total_paise: b.total_paise,
      rental_paise: b.rental_paise,
      cleaning_fee_paise: b.cleaning_fee_paise,
      tax_paise: b.tax_paise,
      tax_percent: Number(b.tax_percent),
    },
  });
});
