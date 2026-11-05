import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingActions } from "@/components/admin/booking-actions";
import { BookingDetails, PaymentBadge, PriceTable, StatusBadge } from "@/components/booking-summary";
import { BookingRow, displayStatus } from "@/lib/booking";
import { query, queryOne } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatInstant, todayIST } from "@/lib/time";
import { EVENT_TYPES } from "@/lib/validation";

export default async function AdminBookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const b = await queryOne<BookingRow & { hall_name: string; location_name: string; address: string; hall_active: boolean }>(
    `SELECT b.*, h.name AS hall_name, h.address, h.is_active AS hall_active, l.name AS location_name
       FROM bookings b JOIN halls h ON h.id=b.hall_id JOIN locations l ON l.id=h.location_id WHERE b.id=$1`,
    [id]
  );
  if (!b) notFound();
  const [audit, payments, halls, settings] = await Promise.all([
    query<{ id: number; action: string; actor: string; details: Record<string, unknown>; created_at: Date }>("SELECT id, action, actor, details, created_at FROM audit_log WHERE booking_id=$1 ORDER BY id DESC", [id]),
    query<{ id: number; provider: string; provider_order_id: string | null; provider_payment_id: string | null; amount_paise: number; status: string; note: string; created_at: Date }>("SELECT * FROM payments WHERE booking_id=$1 ORDER BY id", [id]),
    query<{ id: number; name: string; is_active: boolean }>("SELECT id, name, is_active FROM halls ORDER BY sort_order, name"),
    getSettings(),
  ]);
  const ds = displayStatus(b);

  return (
    <div className="space-y-4">
      <Link href="/admin/bookings" className="text-sm">← All bookings</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-3xl">{b.reference}</h1>
        <StatusBadge b={b} />
        <PaymentBadge status={b.payment_status} />
        <span className="badge bg-ivory-200">{b.source === "admin" ? "Manual booking" : "Online booking"}</span>
        {!b.hall_active && <span className="badge bg-bad-bg text-bad">Hall deactivated</span>}
      </div>
      {b.needs_attention && (
        <div role="alert" className="rounded-xl border border-bad bg-bad-bg p-4">
          <p className="font-semibold text-bad">Needs attention</p>
          <p className="whitespace-pre-line">{b.attention_reason}</p>
        </div>
      )}
      {b.status === "cancelled" && <p className="rounded-lg bg-bad-bg p-3">Cancelled {b.cancelled_at ? formatInstant(b.cancelled_at) : ""}: {b.cancel_reason}</p>}

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="text-xl">Customer &amp; event</h2>
            <BookingDetails b={b} hallName={b.hall_name} locationName={b.location_name} address={b.address} />
            {b.status === "held" && b.hold_expires_at && <p className="mt-2 text-sm text-warn">Hold {ds === "expired" ? "expired" : "expires"} {formatInstant(b.hold_expires_at)}</p>}
          </section>
          <section className="card p-4">
            <h2 className="text-xl">Pricing &amp; payments</h2>
            <PriceTable b={b} taxLabel={settings.tax_label} />
            <p className="mt-2 text-sm">Amount received: <strong>{formatINR(b.amount_paid_paise)}</strong>{b.payment_status === "demo" && " (demo — no money collected)"}</p>
            {payments.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-ink-soft"><tr><th className="py-1">When</th><th>Provider</th><th>Reference</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-ivory-300">
                        <td className="py-1">{formatInstant(p.created_at)}</td>
                        <td>{p.provider}</td>
                        <td className="font-mono text-xs">{p.provider_payment_id ?? p.provider_order_id ?? p.note}</td>
                        <td>{p.status}</td>
                        <td className="text-right">{formatINR(p.amount_paise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="card p-4" aria-labelledby="hist-h">
            <h2 id="hist-h" className="text-xl">Audit history</h2>
            <ol className="mt-2 space-y-2">
              {audit.map((a) => (
                <li key={a.id} className="border-l-2 border-gold-500 pl-3 text-sm">
                  <p><strong>{a.action.replace(/_/g, " ")}</strong> · {a.actor} · <span className="text-ink-soft">{formatInstant(a.created_at)}</span></p>
                  {Object.keys(a.details ?? {}).length > 0 && <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded bg-ivory-200 p-2 text-xs">{JSON.stringify(a.details, null, 1)}</pre>}
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside>
          <h2 className="mb-2 text-xl">Actions</h2>
          <BookingActions
            b={{ id: b.id, status: b.status, displayStatus: ds, payment_status: b.payment_status, hall_id: b.hall_id, needs_attention: b.needs_attention, customer_name: b.customer_name, customer_phone: b.customer_phone, customer_email: b.customer_email, guest_count: b.guest_count, event_type: b.event_type, event_type_other: b.event_type_other, notes: b.notes }}
            halls={halls}
            today={todayIST()}
            eventTypes={EVENT_TYPES.map((e) => ({ value: e.value, label: e.label }))}
          />
        </aside>
      </div>
    </div>
  );
}
