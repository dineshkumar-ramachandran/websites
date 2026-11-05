import { query } from "./db";
import type { BookingRow } from "./booking";
import { isValidDateString } from "./time";

export type BookingFilters = {
  hall?: number;
  location?: number;
  status?: string;
  payment?: string;
  from?: string;
  to?: string;
  q?: string;
  attention?: boolean;
};

export type AdminBookingRow = BookingRow & { hall_name: string; location_name: string };

export function parseFilters(sp: URLSearchParams | Record<string, string | string[] | undefined>): BookingFilters {
  const get = (k: string) => {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? "";
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const f: BookingFilters = {};
  if (Number(get("hall")) > 0) f.hall = Number(get("hall"));
  if (Number(get("location")) > 0) f.location = Number(get("location"));
  if (["held", "confirmed", "cancelled", "expired", "upcoming", "completed"].includes(get("status"))) f.status = get("status");
  if (["unpaid", "pending", "paid", "demo", "refunded", "failed"].includes(get("payment"))) f.payment = get("payment");
  if (isValidDateString(get("from"))) f.from = get("from");
  if (isValidDateString(get("to"))) f.to = get("to");
  if (get("q").trim()) f.q = get("q").trim().slice(0, 100);
  if (get("attention") === "1") f.attention = true;
  return f;
}

export async function listBookings(f: BookingFilters, limit = 500): Promise<AdminBookingRow[]> {
  const where: string[] = [];
  const p: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    p.push(v);
    where.push(sql.replace("?", `$${p.length}`));
  };
  if (f.hall) add("b.hall_id = ?", f.hall);
  if (f.location) add("h.location_id = ?", f.location);
  if (f.status === "upcoming") where.push("b.status = 'confirmed' AND b.end_at > now()");
  else if (f.status === "completed") where.push("b.status = 'confirmed' AND b.end_at <= now()");
  else if (f.status === "held") where.push("b.status = 'held' AND b.hold_expires_at > now()");
  else if (f.status === "expired") where.push("(b.status = 'expired' OR (b.status = 'held' AND b.hold_expires_at <= now()))");
  else if (f.status) add("b.status = ?", f.status);
  if (f.payment) add("b.payment_status = ?", f.payment);
  if (f.from) add("b.event_date >= ?", f.from);
  if (f.to) add("b.event_date <= ?", f.to);
  if (f.attention) where.push("b.needs_attention");
  if (f.q) {
    p.push(`%${f.q.toLowerCase()}%`);
    const i = p.length;
    where.push(`(lower(b.reference) LIKE $${i} OR lower(b.customer_name) LIKE $${i} OR lower(b.customer_email) LIKE $${i} OR b.customer_phone LIKE $${i})`);
  }
  p.push(limit);
  return query<AdminBookingRow>(
    `SELECT b.*, h.name AS hall_name, l.name AS location_name
       FROM bookings b JOIN halls h ON h.id = b.hall_id JOIN locations l ON l.id = h.location_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY b.event_date DESC, b.start_at DESC LIMIT $${p.length}`,
    p
  );
}

export function filtersToQuery(f: BookingFilters): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== "" && v !== false) u.set(k, v === true ? "1" : String(v));
  return u.toString();
}

/** CSV-safe cell: quotes, and neutralises spreadsheet formula injection. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
