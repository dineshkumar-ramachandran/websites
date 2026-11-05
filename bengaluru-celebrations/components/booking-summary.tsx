import type { BookingRow } from "@/lib/booking";
import { displayStatus } from "@/lib/booking";
import { formatINR } from "@/lib/money";
import { formatDate, formatInstant, formatTime, istTimeOf } from "@/lib/time";
import { eventTypeLabel } from "@/lib/validation";

export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  held: { label: "On hold — awaiting payment", cls: "bg-warn-bg text-warn" },
  confirmed: { label: "Confirmed", cls: "bg-ok-bg text-ok" },
  completed: { label: "Completed", cls: "bg-ivory-200 text-ink-soft" },
  cancelled: { label: "Cancelled", cls: "bg-bad-bg text-bad" },
  expired: { label: "Hold expired", cls: "bg-ivory-200 text-ink-soft" },
};
export const PAYMENT_LABEL: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "Unpaid", cls: "bg-ivory-200 text-ink" },
  pending: { label: "Payment pending", cls: "bg-warn-bg text-warn" },
  paid: { label: "Paid", cls: "bg-ok-bg text-ok" },
  demo: { label: "Demo — no money collected", cls: "bg-[#FFF6E0] text-gold-700 border border-gold-500" },
  refunded: { label: "Refunded", cls: "bg-ivory-200 text-ink" },
  failed: { label: "Payment failed", cls: "bg-bad-bg text-bad" },
};

export function StatusBadge({ b }: { b: Pick<BookingRow, "status" | "end_at" | "hold_expires_at"> }) {
  const s = STATUS_LABEL[displayStatus(b)] ?? STATUS_LABEL.held;
  return <span className={`badge px-3 py-1 text-sm ${s.cls}`}>{s.label}</span>;
}
export function PaymentBadge({ status }: { status: string }) {
  const s = PAYMENT_LABEL[status] ?? PAYMENT_LABEL.unpaid;
  return <span className={`badge px-3 py-1 text-sm ${s.cls}`}>{s.label}</span>;
}

export function PriceTable({ b, taxLabel = "GST" }: { b: BookingRow; taxLabel?: string }) {
  return (
    <table className="w-full text-left">
      <caption className="sr-only">Price breakdown</caption>
      <tbody>
        <tr>
          <th scope="row" className="py-1 font-normal">Hall rental — {b.slot_label}</th>
          <td className="py-1 text-right">{formatINR(b.rental_paise)}</td>
        </tr>
        {b.cleaning_fee_paise > 0 && (
          <tr>
            <th scope="row" className="py-1 font-normal">Cleaning fee</th>
            <td className="py-1 text-right">{formatINR(b.cleaning_fee_paise)}</td>
          </tr>
        )}
        {b.tax_paise > 0 && (
          <tr>
            <th scope="row" className="py-1 font-normal">{taxLabel} ({Number(b.tax_percent)}%)</th>
            <td className="py-1 text-right">{formatINR(b.tax_paise)}</td>
          </tr>
        )}
        <tr className="border-t border-ivory-300 text-lg font-semibold">
          <th scope="row" className="pt-2">Total</th>
          <td className="pt-2 text-right">{formatINR(b.total_paise)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function BookingDetails({ b, hallName, locationName, address }: { b: BookingRow; hallName: string; locationName: string; address?: string }) {
  const rows: [string, React.ReactNode][] = [
    ["Booking reference", <span key="r" className="font-mono text-lg font-semibold tracking-wider">{b.reference}</span>],
    ["Hall", `${hallName}, ${locationName}`],
    ...(address ? ([["Address", address]] as [string, React.ReactNode][]) : []),
    ["Date", formatDate(b.event_date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })],
    ["Time (IST)", `${b.slot_label}: ${formatTime(istTimeOf(new Date(b.start_at)))} – ${formatTime(istTimeOf(new Date(b.end_at)))}`],
    ["Event", eventTypeLabel(b.event_type, b.event_type_other)],
    ["Guests", String(b.guest_count)],
    ["Name", b.customer_name],
    ["Phone", b.customer_phone],
    ["Email", b.customer_email],
    ...(b.notes ? ([["Notes", b.notes]] as [string, React.ReactNode][]) : []),
    ["Booked on", formatInstant(b.created_at)],
  ];
  return (
    <dl className="divide-y divide-ivory-300">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 py-2 sm:grid-cols-[180px_1fr]">
          <dt className="text-sm text-ink-soft">{k}</dt>
          <dd className="break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
