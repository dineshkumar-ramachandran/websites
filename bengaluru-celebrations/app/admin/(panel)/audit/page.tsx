import Link from "next/link";
import { query } from "@/lib/db";
import { formatInstant } from "@/lib/time";

type SP = Promise<{ entity?: string; q?: string }>;

export default async function AuditPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const entity = ["booking", "hall", "location", "hall_block", "settings"].includes(sp.entity ?? "") ? sp.entity! : "";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const params: unknown[] = [];
  const where: string[] = [];
  if (entity) { params.push(entity); where.push(`a.entity = $${params.length}`); }
  if (q) { params.push(`%${q.toLowerCase()}%`); where.push(`(lower(a.entity_id) LIKE $${params.length} OR lower(a.actor) LIKE $${params.length} OR lower(a.action) LIKE $${params.length})`); }
  const rows = await query<{ id: number; booking_id: string | null; entity: string; entity_id: string; action: string; actor: string; details: unknown; created_at: Date }>(
    `SELECT a.* FROM audit_log a ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY a.id DESC LIMIT 300`,
    params
  );
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Audit history</h1>
      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label htmlFor="a-entity" className="label">Type</label>
          <select id="a-entity" name="entity" className="input" defaultValue={entity}>
            <option value="">All</option>
            <option value="booking">Bookings</option>
            <option value="hall">Halls</option>
            <option value="location">Locations</option>
            <option value="hall_block">Blocks</option>
            <option value="settings">Settings</option>
          </select>
        </div>
        <div>
          <label htmlFor="a-q" className="label">Search</label>
          <input id="a-q" name="q" className="input" defaultValue={q} placeholder="Reference, admin email, action" />
        </div>
        <button className="btn-primary btn-sm">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ivory-200 text-ink-soft"><tr><th className="p-2">When (IST)</th><th>What</th><th>Item</th><th>By</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-ivory-300 align-top">
                <td className="whitespace-nowrap p-2">{formatInstant(r.created_at)}</td>
                <td className="p-2">{r.entity} · <strong>{r.action.replace(/_/g, " ")}</strong></td>
                <td className="p-2 font-mono">{r.booking_id ? <Link href={`/admin/bookings/${r.booking_id}`}>{r.entity_id}</Link> : r.entity_id}</td>
                <td className="p-2">{r.actor}</td>
                <td className="max-w-md p-2"><code className="break-words text-xs">{JSON.stringify(r.details)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-ink-soft">No entries.</p>}
      </div>
    </div>
  );
}
