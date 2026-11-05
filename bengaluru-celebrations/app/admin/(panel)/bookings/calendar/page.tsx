import Link from "next/link";
import { listBookings } from "@/lib/admin-bookings";
import { displayStatus } from "@/lib/booking";
import { query } from "@/lib/db";
import { formatTime, istTimeOf, todayIST } from "@/lib/time";

type SP = Promise<Record<string, string | undefined>>;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CLS: Record<string, string> = {
  confirmed: "bg-ok-bg text-ok border-ok/30",
  completed: "bg-ivory-200 text-ink-soft border-ivory-300",
  held: "bg-warn-bg text-warn border-gold-500",
};

export default async function AdminCalendar({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : todayIST().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${month}-${String(lastDay).padStart(2, "0")}`;
  const hall = Number(sp.hall) > 0 ? Number(sp.hall) : undefined;
  const [rows, halls, blocks] = await Promise.all([
    listBookings({ from: first, to: last, hall }, 2000),
    query<{ id: number; name: string }>("SELECT id, name FROM halls ORDER BY sort_order, name"),
    query<{ id: number; hall_name: string; start_at: Date; end_at: Date; reason: string }>(
      `SELECT k.id, h.name AS hall_name, k.start_at, k.end_at, k.reason FROM hall_blocks k JOIN halls h ON h.id=k.hall_id
        WHERE k.is_active AND k.start_at < ($2::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata' AND k.end_at > $1::timestamp AT TIME ZONE 'Asia/Kolkata' ${hall ? "AND k.hall_id = $3" : ""}`,
      hall ? [first, last, hall] : [first, last]
    ),
  ]);
  const active = rows.filter((b) => ["confirmed", "held", "completed"].includes(displayStatus(b))).reverse();
  const byDate: Record<string, typeof active> = {};
  for (const b of active) (byDate[b.event_date] ??= []).push(b);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: lastDay }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const hq = hall ? `&hall=${hall}` : "";
  const dayStart = (d: string) => new Date(`${d}T00:00:00+05:30`).getTime();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl">Booking calendar</h1>
        <Link href="/admin/bookings" className="btn-outline btn-sm">Table view</Link>
      </div>
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Link href={`?month=${prev}${hq}`} className="btn-ghost btn-sm">← {MONTHS[(m + 10) % 12]}</Link>
        <h2 className="text-2xl">{MONTHS[m - 1]} {y}</h2>
        <Link href={`?month=${next}${hq}`} className="btn-ghost btn-sm">{MONTHS[m % 12]} →</Link>
        <form method="get" className="ml-auto flex items-end gap-2">
          <input type="hidden" name="month" value={month} />
          <div>
            <label htmlFor="cal-hall" className="label">Hall</label>
            <select id="cal-hall" name="hall" className="input" defaultValue={hall ?? ""}>
              <option value="">All halls</option>
              {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <button className="btn-primary btn-sm">Show</button>
        </form>
      </div>
      <p className="text-sm text-ink-soft">Green: confirmed · Gold: checkout hold · Grey: completed · Striped: blocked by admin. Cancelled and expired bookings are not shown.</p>
      <div className="overflow-x-auto">
        <div className="grid min-w-[840px] grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="p-1 text-center text-xs font-semibold text-ink-soft">{d}</div>)}
          {cells.map((c, i) =>
            !c ? (
              <div key={i} />
            ) : (
              <div key={c} className="min-h-[110px] rounded-lg border border-ivory-300 bg-white p-1.5">
                <div className={`text-sm font-semibold ${c === todayIST() ? "text-maroon" : "text-ink-soft"}`}>{Number(c.slice(8))}</div>
                <ul className="mt-1 space-y-1">
                  {blocks
                    .filter((k) => new Date(k.start_at).getTime() < dayStart(c) + 86_400_000 && new Date(k.end_at).getTime() > dayStart(c))
                    .map((k) => (
                      <li key={`k${k.id}`} className="rounded border border-dashed border-ink-soft bg-[repeating-linear-gradient(45deg,#eee,#eee_4px,#fff_4px,#fff_8px)] px-1 text-xs">
                        <Link href="/admin/blocks" className="text-ink no-underline">Blocked · {k.hall_name}</Link>
                      </li>
                    ))}
                  {(byDate[c] ?? []).map((b) => (
                    <li key={b.id}>
                      <Link href={`/admin/bookings/${b.id}`} className={`block rounded border px-1 text-xs no-underline ${CLS[displayStatus(b)]}`}>
                        {formatTime(istTimeOf(new Date(b.start_at)))} {b.hall_name}
                        <span className="block truncate">{b.customer_name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
