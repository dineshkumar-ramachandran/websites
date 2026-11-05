import Link from "next/link";
import { PaymentBadge, StatusBadge } from "@/components/booking-summary";
import { listBookings } from "@/lib/admin-bookings";
import { query } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { razorpayConfigured } from "@/lib/razorpay";
import { addDays, formatDate, formatTime, istTimeOf, todayIST } from "@/lib/time";

export default async function Dashboard() {
  const today = todayIST();
  const [stats] = await query<{ upcoming: number; holds: number; attention: number; halls: number; inactive_halls: number }>(`
    SELECT (SELECT count(*) FROM bookings WHERE status='confirmed' AND end_at > now()) AS upcoming,
           (SELECT count(*) FROM bookings WHERE status='held' AND hold_expires_at > now()) AS holds,
           (SELECT count(*) FROM bookings WHERE needs_attention) AS attention,
           (SELECT count(*) FROM halls WHERE is_active) AS halls,
           (SELECT count(*) FROM halls WHERE NOT is_active) AS inactive_halls`);
  const [attention, next7] = await Promise.all([
    listBookings({ attention: true }, 20),
    listBookings({ status: "upcoming", from: today, to: addDays(today, 7) }, 50),
  ]);
  next7.reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Dashboard</h1>
      {!razorpayConfigured() && (
        <p className="rounded-xl border border-gold-500 bg-[#FFF6E0] p-4 text-sm">
          <strong>Payments are in DEMO mode.</strong> Razorpay keys are not configured, so customers see a labelled demo checkout and no money is collected. See README → “Going live with Razorpay”.
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Upcoming confirmed", stats.upcoming, "/admin/bookings?status=upcoming"],
          ["Active checkout holds", stats.holds, "/admin/bookings?status=held"],
          ["Need attention", stats.attention, "/admin/bookings?attention=1"],
          ["Active halls", `${stats.halls}${stats.inactive_halls ? ` (+${stats.inactive_halls} inactive)` : ""}`, "/admin/halls"],
        ].map(([label, value, href]) => (
          <Link key={String(label)} href={String(href)} className="card block p-4 no-underline hover:border-gold-500">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className={`mt-1 text-3xl font-semibold ${label === "Need attention" && Number(value) > 0 ? "text-bad" : "text-plum-800"}`}>{value}</dd>
          </Link>
        ))}
      </dl>

      {attention.length > 0 && (
        <section className="card border-bad/40 p-4" aria-labelledby="att-h">
          <h2 id="att-h" className="text-xl text-bad">Needs attention</h2>
          <ul className="mt-2 divide-y divide-ivory-300">
            {attention.map((b) => (
              <li key={b.id} className="py-2">
                <Link href={`/admin/bookings/${b.id}`} className="font-mono font-semibold">{b.reference}</Link> · {b.hall_name} · {formatDate(b.event_date)}
                <p className="text-sm text-ink-soft">{b.attention_reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4" aria-labelledby="n7-h">
        <h2 id="n7-h" className="text-xl">Next 7 days</h2>
        {next7.length === 0 ? (
          <p className="mt-2 text-ink-soft">No confirmed events in the next 7 days.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-ink-soft"><tr><th className="py-2">Date</th><th>Time</th><th>Hall</th><th>Customer</th><th>Guests</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {next7.map((b) => (
                  <tr key={b.id} className="border-t border-ivory-300">
                    <td className="py-2"><Link href={`/admin/bookings/${b.id}`}>{formatDate(b.event_date)}</Link></td>
                    <td>{formatTime(istTimeOf(new Date(b.start_at)))}–{formatTime(istTimeOf(new Date(b.end_at)))}</td>
                    <td>{b.hall_name}</td>
                    <td>{b.customer_name}<span className="block text-ink-soft">{b.customer_phone}</span></td>
                    <td>{b.guest_count}</td>
                    <td><PaymentBadge status={b.payment_status} /> <StatusBadge b={b} /></td>
                    <td className="text-right">{formatINR(b.total_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
