import { csvCell, listBookings, parseFilters } from "@/lib/admin-bookings";
import { requireAdminApi } from "@/lib/auth";
import { displayStatus } from "@/lib/booking";
import { handler } from "@/lib/http";
import { formatInstant, istTimeOf, todayIST } from "@/lib/time";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  await requireAdminApi(req);
  const rows = await listBookings(parseFilters(new URL(req.url).searchParams), 50_000);
  const header = [
    "reference", "status", "payment_status", "hall", "location", "event_date", "slot", "start_time_ist", "end_time_ist", "event_type", "guests",
    "customer_name", "customer_phone", "customer_email", "notes", "rental_inr", "cleaning_fee_inr", "tax_inr", "total_inr", "amount_paid_inr",
    "source", "needs_attention", "attention_reason", "created_at_ist", "cancelled_at_ist", "cancel_reason",
  ];
  const inr = (p: number) => (p / 100).toFixed(2);
  const lines = [header.join(",")];
  for (const b of rows) {
    lines.push(
      [
        b.reference, displayStatus(b), b.payment_status, b.hall_name, b.location_name, b.event_date, b.slot_label,
        istTimeOf(new Date(b.start_at)), istTimeOf(new Date(b.end_at)), b.event_type === "other" ? `other: ${b.event_type_other}` : b.event_type, b.guest_count,
        b.customer_name, b.customer_phone, b.customer_email, b.notes, inr(b.rental_paise), inr(b.cleaning_fee_paise), inr(b.tax_paise), inr(b.total_paise),
        inr(b.amount_paid_paise), b.source, b.needs_attention ? "yes" : "no", b.attention_reason, formatInstant(b.created_at),
        b.cancelled_at ? formatInstant(b.cancelled_at) : "", b.cancel_reason,
      ].map(csvCell).join(",")
    );
  }
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${todayIST()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
