import { BlockForm, RemoveBlock } from "@/components/admin/blocks-ui";
import { query } from "@/lib/db";
import { formatInstant, todayIST } from "@/lib/time";

export default async function AdminBlocks() {
  const [halls, blocks] = await Promise.all([
    query<{ id: number; name: string }>("SELECT id, name FROM halls ORDER BY sort_order, name"),
    query<{ id: number; hall_name: string; start_at: Date; end_at: Date; reason: string }>(
      `SELECT k.id, h.name AS hall_name, k.start_at, k.end_at, k.reason FROM hall_blocks k JOIN halls h ON h.id=k.hall_id
        WHERE k.is_active AND k.end_at > now() ORDER BY k.start_at`
    ),
  ]);
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl">Blocked dates</h1>
      <p className="text-ink-soft">Block a hall for maintenance or private events. Blocked times show as unavailable to customers. A block can’t overlap an existing booking.</p>
      <section className="card p-5">
        <h2 className="mb-3 text-xl">New block</h2>
        <BlockForm halls={halls} today={todayIST()} />
      </section>
      <section>
        <h2 className="mb-2 text-xl">Current and upcoming blocks</h2>
        {blocks.length === 0 ? (
          <p className="card p-5 text-ink-soft">No blocks.</p>
        ) : (
          <ul className="card divide-y divide-ivory-300">
            {blocks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="flex-1">
                  <p className="font-semibold">{b.hall_name} — {b.reason}</p>
                  <p className="text-sm text-ink-soft">{formatInstant(b.start_at)} → {formatInstant(b.end_at)}</p>
                </div>
                <RemoveBlock id={b.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
