import Link from "next/link";
import { PaymentBadge, StatusBadge } from "@/components/booking-summary";
import { filtersToQuery, listBookings, parseFilters } from "@/lib/admin-bookings";
import { query } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatDate, formatTime, istTimeOf } from "@/lib/time";
import { eventTypeLabel } from "@/lib/validation";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminBookings({ searchParams }: { searchParams: SP }) {
  const f = parseFilters(await searchParams);
  const [rows, halls, locations] = await Promise.all([
    listBookings(f),
    query<{ id: number; name: string; is_active: boolean }>("SELECT id, name, is_active FROM halls ORDER BY sort_order, name"),
    query<{ id: number; name: string }>("SELECT id, name FROM locations ORDER BY sort_order, name"),
  ]);
  const qs = filtersToQuery(f);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl">Bookings</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/bookings/calendar${qs ? `?${qs}` : ""}`} className="btn-outline btn-sm">Calendar view</Link>
          <a href={`/api/admin/bookings/export${qs ? `?${qs}` : ""}`} className="btn-outline btn-sm">Export CSV</a>
          <Link href="/admin/bookings/new" className="btn-primary btn-sm">+ New booking</Link>
        </div>
      </div>

      <form method="get" className="card grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4" aria-label="Filter bookings">
        <div>
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" className="input" placeholder="Reference, name, phone, email" defaultValue={f.q ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="hall">Hall</label>
          <select id="hall" name="hall" className="input" defaultValue={f.hall ?? ""}>
            <option value="">All halls</option>
            {halls.map((h) => <option key={h.id} value={h.id}>{h.name}{h.is_active ? "" : " (inactive)"}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="location">Location</label>
          <select id="location" name="location" className="input" defaultValue={f.location ?? ""}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Booking status</label>
          <select id="status" name="status" className="input" defaultValue={f.status ?? ""}>
            <option value="">Any</option>
            <option value="upcoming">Confirmed — upcoming</option>
            <option value="completed">Confirmed — completed</option>
            <option value="confirmed">Confirmed — all</option>
            <option value="held">On hold (checkout)</option>
            <option value="expired">Expired holds</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="payment">Payment status</label>
          <select id="payment" name="payment" className="input" defaultValue={f.payment ?? ""}>
            <option value="">Any</option>
            {["unpaid", "pending", "paid", "demo", "refunded", "failed"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="from">Event date from</label>
          <input id="from" name="from" type="date" className="input" defaultValue={f.from ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="to">Event date to</label>
          <input id="to" name="to" type="date" className="input" defaultValue={f.to ?? ""} />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex min-h-[48px] items-center gap-2"><input type="checkbox" name="attention" value="1" defaultChecked={f.attention} className="h-5 w-5" /> Needs attention</label>
        </div>
        <div className="flex gap-2 sm:col-span-3 lg:col-span-4">
          <button className="btn-primary btn-sm">Apply</button>
          <Link href="/admin/bookings" className="btn-ghost btn-sm">Reset</Link>
        </div>
      </form>

      <p className="text-sm text-ink-soft">{rows.length} booking{rows.length === 1 ? "" : "s"}{rows.length === 500 ? " (first 500 — narrow the filters)" : ""}</p>
      {rows.length === 0 ? (
        <p className="card p-6 text-ink-soft">No bookings match these filters.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-ivory-200 text-ink-soft">
              <tr><th className="p-3">Reference</th><th>Event date &amp; time</th><th>Hall</th><th>Customer</th><th>Event</th><th>Status</th><th>Payment</th><th className="p-3 text-right">Total</th></tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className={`border-t border-ivory-300 ${b.needs_attention ? "bg-bad-bg/60" : ""}`}>
                  <td className="p-3"><Link href={`/admin/bookings/${b.id}`} className="font-mono font-semibold">{b.reference}</Link>{b.needs_attention && <span className="badge ml-1 bg-bad text-white">!</span>}<span className="block text-xs text-ink-soft">{b.source === "admin" ? "Manual" : "Online"}</span></td>
                  <td>{formatDate(b.event_date)}<span className="block text-ink-soft">{b.slot_label} · {formatTime(istTimeOf(new Date(b.start_at)))}–{formatTime(istTimeOf(new Date(b.end_at)))}</span></td>
                  <td>{b.hall_name}<span className="block text-ink-soft">{b.location_name}</span></td>
                  <td>{b.customer_name}<span className="block text-ink-soft">{b.customer_phone}</span></td>
                  <td>{eventTypeLabel(b.event_type, b.event_type_other)}<span className="block text-ink-soft">{b.guest_count} guests</span></td>
                  <td><StatusBadge b={b} /></td>
                  <td><PaymentBadge status={b.payment_status} /></td>
                  <td className="p-3 text-right">{formatINR(b.total_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
