// Test helpers: point at the TEST database, migrate, and reseed before each test file.
import { loadEnv } from "../scripts/env";
loadEnv();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://bc:bc@localhost:5432/bengaluru_celebrations_test";
delete process.env.ADMIN_EMAIL;
delete process.env.ADMIN_PASSWORD;

import { getPool } from "../lib/db";
import { migrate } from "../scripts/migrate";
import { seed } from "../scripts/seed";
import { addDays, todayIST } from "../lib/time";
import type { BookingInput, Actor } from "../lib/booking";

export async function resetDb() {
  await migrate(false);
  await seed({ reset: true, log: false });
  const r = await getPool().query("INSERT INTO admin_users(email, name, password_hash) VALUES ('t@example.com','Test','x') ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id");
  return { adminId: r.rows[0].id as number };
}

export async function hallBySlug(slug: string) {
  const h = (await getPool().query("SELECT id FROM halls WHERE slug=$1", [slug])).rows[0];
  const slots = (await getPool().query("SELECT id, label FROM hall_slots WHERE hall_id=$1 ORDER BY sort_order", [h.id])).rows;
  return { id: h.id as number, slots: Object.fromEntries(slots.map((s: { id: number; label: string }) => [s.label, s.id])) as Record<string, number> };
}

export const futureDate = (days = 30) => addDays(todayIST(), days);

let n = 0;
export function input(hallId: number, date: string, choice: BookingInput["choice"], extra: Partial<BookingInput> = {}): BookingInput {
  n++;
  return {
    hallId,
    date,
    choice,
    eventType: "birthday",
    guestCount: 30,
    customerName: `Customer ${n}`,
    customerPhone: `98450${String(10000 + n).slice(-5)}`,
    customerEmail: `c${n}@example.com`,
    ...extra,
  };
}

export const customer: Actor = { kind: "customer" };
export const admin = (id: number): Actor => ({ kind: "admin", id, email: "t@example.com" });

export async function expireHold(bookingId: string) {
  await getPool().query("UPDATE bookings SET hold_expires_at = now() - interval '1 minute' WHERE id=$1", [bookingId]);
}
