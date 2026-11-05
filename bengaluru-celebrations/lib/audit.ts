import { Db } from "./db";

export async function audit(
  db: Db,
  entry: { bookingId?: string | null; entity: string; entityId: string | number; action: string; actor: string; details?: Record<string, unknown> }
) {
  await db.query(
    `INSERT INTO audit_log(booking_id, entity, entity_id, action, actor, details) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
    [entry.bookingId ?? null, entry.entity, String(entry.entityId), entry.action, entry.actor, JSON.stringify(entry.details ?? {})]
  );
}
