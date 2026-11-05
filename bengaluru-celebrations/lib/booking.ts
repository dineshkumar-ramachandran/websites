// Booking engine. Every write that can affect availability runs in a transaction that
//   1. locks the hall row (SELECT ... FOR UPDATE) so writes for one hall are serialised,
//   2. expires stale holds for that hall,
//   3. re-checks availability against active bookings and admin blocks,
//   4. writes, relying on the bookings_no_overlap exclusion constraint as a final guard.
// Different halls never block each other.
import crypto from "node:crypto";
import type { PoolClient } from "pg";
import { Db, getPool, isExclusionViolation, queryOne, withTransaction } from "./db";
import {
  BookingChoice,
  computeWindow,
  conflictFor,
  dateOutOfRange,
  dayAvailability,
  DayAvailability,
  HallTimingConfig,
  Occupied,
  SlotConfig,
  windowTimingProblem,
} from "./availability";
import { audit } from "./audit";
import { AppError, NotFoundError, UnavailableError, ValidationError } from "./errors";
import { computeTax } from "./money";
import { getSettings } from "./settings";
import { addDays, istInstant } from "./time";
import { normalizePhone } from "./validation";

export type HallRecord = HallTimingConfig & {
  name: string;
  slug: string;
  location_id: number;
  location_name: string;
  location_active: boolean;
  is_active: boolean;
  capacity_min: number;
  capacity_max: number;
  cleaning_fee_paise: number;
};

export type BookingRow = {
  id: string;
  reference: string;
  hall_id: number;
  event_date: string;
  booking_kind: "slot" | "full_day";
  slot_id: number | null;
  slot_label: string;
  start_at: Date;
  end_at: Date;
  block_start: Date;
  block_end: Date;
  status: "held" | "confirmed" | "cancelled" | "expired";
  payment_status: "unpaid" | "pending" | "paid" | "demo" | "refunded" | "failed";
  hold_expires_at: Date | null;
  source: "online" | "admin";
  event_type: string;
  event_type_other: string;
  guest_count: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  notes: string;
  rental_paise: number;
  cleaning_fee_paise: number;
  tax_percent: number;
  tax_paise: number;
  total_paise: number;
  amount_paid_paise: number;
  needs_attention: boolean;
  attention_reason: string;
  confirmed_at: Date | null;
  cancelled_at: Date | null;
  cancel_reason: string;
  created_at: Date;
  updated_at: Date;
};

export type Actor = { kind: "customer" } | { kind: "system" } | { kind: "webhook" } | { kind: "admin"; id: number; email: string };
export function actorLabel(a: Actor): string {
  return a.kind === "admin" ? `admin:${a.email}` : a.kind;
}

// ---------------------------------------------------------------------------
// Loading helpers
// ---------------------------------------------------------------------------
const HALL_SELECT = `
  SELECT h.id, h.name, h.slug, h.location_id, l.name AS location_name, l.is_active AS location_active,
         h.is_active, h.capacity_min, h.capacity_max, h.cleaning_fee_paise,
         h.open_time::text AS open_time, h.close_time::text AS close_time, h.allow_full_day,
         h.full_day_price_paise, h.setup_buffer_min, h.cleanup_buffer_min, h.min_notice_hours, h.max_advance_days
    FROM halls h JOIN locations l ON l.id = h.location_id
   WHERE h.id = $1`;

export async function loadHall(db: Db, hallId: number, lock = false): Promise<HallRecord | null> {
  const r = await db.query<HallRecord>(HALL_SELECT + (lock ? " FOR UPDATE OF h" : ""), [hallId]);
  return r.rows[0] ?? null;
}

export async function loadSlots(db: Db, hallId: number): Promise<SlotConfig[]> {
  const r = await db.query<SlotConfig>(
    `SELECT id, label, start_time::text AS start_time, end_time::text AS end_time, price_paise, is_active
       FROM hall_slots WHERE hall_id = $1 ORDER BY sort_order, start_time`,
    [hallId]
  );
  return r.rows;
}

/** Active bookings (confirmed, or held with an unexpired hold) and active admin blocks overlapping [from, to). */
export async function loadOccupied(db: Db, hallId: number, from: Date, to: Date, excludeBookingId?: string): Promise<Occupied[]> {
  const b = await db.query<{ start: Date; end: Date }>(
    `SELECT block_start AS start, block_end AS "end" FROM bookings
      WHERE hall_id = $1 AND status IN ('held','confirmed')
        AND (status = 'confirmed' OR hold_expires_at > now())
        AND block_start < $3 AND block_end > $2
        AND ($4::uuid IS NULL OR id <> $4::uuid)`,
    [hallId, from, to, excludeBookingId ?? null]
  );
  const k = await db.query<{ start: Date; end: Date }>(
    `SELECT start_at AS start, end_at AS "end" FROM hall_blocks
      WHERE hall_id = $1 AND is_active AND start_at < $3 AND end_at > $2`,
    [hallId, from, to]
  );
  return [...b.rows.map((r) => ({ ...r, type: "booking" as const })), ...k.rows.map((r) => ({ ...r, type: "block" as const }))];
}

/** Mark holds whose expiry time has passed as expired (releasing availability). */
export async function sweepExpiredHolds(db: Db, hallId?: number): Promise<number> {
  const r = await db.query<{ id: string; reference: string }>(
    `UPDATE bookings SET status = 'expired', updated_at = now()
      WHERE status = 'held' AND hold_expires_at <= now() ${hallId ? "AND hall_id = $1" : ""}
      RETURNING id, reference`,
    hallId ? [hallId] : []
  );
  for (const row of r.rows) {
    await audit(db, { bookingId: row.id, entity: "booking", entityId: row.reference, action: "hold_expired", actor: "system" });
  }
  return r.rowCount ?? 0;
}

// ---------------------------------------------------------------------------
// Read-side availability (calendar, slot pickers, listing filters)
// ---------------------------------------------------------------------------
export async function getAvailability(
  hallId: number,
  fromDate: string,
  toDate: string,
  opts: { ignoreNotice?: boolean; ignoreAdvanceLimit?: boolean } = {}
): Promise<{ hall: HallRecord; days: DayAvailability[] }> {
  const pool: Db = getPool();
  const hall = await loadHall(pool, hallId);
  if (!hall) throw new NotFoundError("Hall not found.");
  const slots = await loadSlots(pool, hallId);
  const from = new Date(istInstant(fromDate, "00:00").getTime() - 86_400_000);
  const to = new Date(istInstant(toDate, "23:59").getTime() + 86_400_000);
  const occupied = await loadOccupied(pool, hallId, from, to);
  const days: DayAvailability[] = [];
  for (let d = fromDate; d <= toDate; d = addDays(d, 1)) {
    days.push(dayAvailability(hall, slots, d, occupied, opts));
    if (days.length > 62) break;
  }
  return { hall, days };
}

// ---------------------------------------------------------------------------
// Creating bookings (customer holds and admin manual bookings)
// ---------------------------------------------------------------------------
export type BookingInput = {
  hallId: number;
  date: string;
  choice: BookingChoice;
  eventType: string;
  eventTypeOther?: string;
  guestCount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes?: string;
};

export type CreateOptions = {
  actor: Actor;
  /** confirm immediately (admin manual bookings); otherwise a temporary hold is created */
  confirm?: boolean;
  /** hold length override (tests) */
  holdMinutes?: number;
};

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomReference(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += REF_ALPHABET[crypto.randomInt(REF_ALPHABET.length)];
  return `BC-${s.slice(0, 4)}-${s.slice(4)}`;
}
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function tokenMatches(token: string, hash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function newReference(db: Db): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const ref = randomReference();
    const r = await db.query("SELECT 1 FROM bookings WHERE reference = $1", [ref]);
    if (r.rowCount === 0) return ref;
  }
  throw new AppError(500, "reference_failed", "Could not allocate a booking reference.");
}

function unavailableMessage(reason: string | null | undefined): string {
  switch (reason) {
    case "blocked":
      return "This hall is not available at that time (reserved by the venue).";
    case "too_soon":
      return "This time is too close to now to book online. Please call us or choose a later time.";
    case "past":
      return "That time has already passed. Please choose a future date.";
    case "too_far":
      return "That date is too far ahead to book online yet.";
    case "hall_inactive":
      return "This hall is not accepting new bookings.";
    default:
      return "Sorry — another booking has just taken this time for this hall. Please choose another slot, date or hall.";
  }
}

export async function createBooking(input: BookingInput, opts: CreateOptions): Promise<{ booking: BookingRow; accessToken: string }> {
  const isAdmin = opts.actor.kind === "admin";
  return withTransaction(async (c) => {
    const hall = await loadHall(c, input.hallId, true);
    if (!hall) throw new NotFoundError("Hall not found.");
    if (!hall.is_active || !hall.location_active) throw new UnavailableError(unavailableMessage("hall_inactive"), { reason: "hall_inactive" });
    if (input.guestCount > hall.capacity_max) {
      throw new ValidationError({ guestCount: `This hall holds up to ${hall.capacity_max} guests.` });
    }

    await sweepExpiredHolds(c, hall.id);

    const slots = await loadSlots(c, hall.id);
    const win = computeWindow(hall, slots, input.date, input.choice);
    if (!win) throw new ValidationError({ slot: "Please choose a time slot offered by this hall." });

    const range = dateOutOfRange(hall, input.date, { ignoreAdvanceLimit: isAdmin });
    if (range) throw new UnavailableError(unavailableMessage(range), { reason: range });
    const timing = windowTimingProblem(hall, win, { ignoreNotice: isAdmin });
    if (timing) throw new UnavailableError(unavailableMessage(timing), { reason: timing });

    const occupied = await loadOccupied(c, hall.id, win.blockStart, win.blockEnd);
    const hit = conflictFor(win, occupied);
    if (hit) throw new UnavailableError(unavailableMessage(hit.type === "block" ? "blocked" : "booked"), { reason: hit.type === "block" ? "blocked" : "booked" });

    const settings = await getSettings(c);
    const rental = win.pricePaise;
    const cleaning = hall.cleaning_fee_paise;
    const tax = computeTax(rental + cleaning, settings.tax_percent);
    const total = rental + cleaning + tax;
    const reference = await newReference(c);
    const accessToken = crypto.randomBytes(24).toString("base64url");
    const holdMinutes = opts.holdMinutes ?? settings.hold_minutes;
    const confirm = !!opts.confirm;

    let booking: BookingRow;
    try {
      const r = await c.query<BookingRow>(
        `INSERT INTO bookings (reference, hall_id, event_date, booking_kind, slot_id, slot_label, start_at, end_at,
            block_start, block_end, status, hold_expires_at, source, event_type, event_type_other, guest_count,
            customer_name, customer_phone, customer_email, notes, rental_paise, cleaning_fee_paise, tax_percent,
            tax_paise, total_paise, access_token_hash, confirmed_at, created_by_admin_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
            CASE WHEN $11 = 'held' THEN now() + make_interval(mins => $12::int) END,
            $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
            CASE WHEN $11 = 'confirmed' THEN now() END, $27)
         RETURNING *`,
        [
          reference, hall.id, input.date, win.kind, win.slotId, win.label, win.start, win.end,
          win.blockStart, win.blockEnd, confirm ? "confirmed" : "held", holdMinutes,
          isAdmin ? "admin" : "online", input.eventType, input.eventTypeOther ?? "", input.guestCount,
          input.customerName, input.customerPhone, input.customerEmail, input.notes ?? "",
          rental, cleaning, settings.tax_percent, tax, total, hashToken(accessToken),
          opts.actor.kind === "admin" ? opts.actor.id : null,
        ]
      );
      booking = r.rows[0];
    } catch (err) {
      if (isExclusionViolation(err)) throw new UnavailableError(unavailableMessage("booked"), { reason: "booked" });
      throw err;
    }
    await audit(c, {
      bookingId: booking.id,
      entity: "booking",
      entityId: booking.reference,
      action: confirm ? "created_confirmed" : "hold_created",
      actor: actorLabel(opts.actor),
      details: { hall: hall.name, date: input.date, slot: win.label, total_paise: total, hold_minutes: confirm ? null : holdMinutes },
    });
    return { booking, accessToken };
  });
}

// ---------------------------------------------------------------------------
// Confirming
// ---------------------------------------------------------------------------
type LockedBooking = BookingRow & { hold_active: boolean };

async function lockBooking(c: PoolClient, bookingId: string): Promise<LockedBooking> {
  // Lock order is always: hall row(s) first, then booking row.
  const pre = await c.query<{ hall_id: number }>("SELECT hall_id FROM bookings WHERE id = $1", [bookingId]);
  if (!pre.rows[0]) throw new NotFoundError("Booking not found.");
  await c.query("SELECT 1 FROM halls WHERE id = $1 FOR UPDATE", [pre.rows[0].hall_id]);
  const r = await c.query<LockedBooking>(
    `SELECT *, (status = 'held' AND hold_expires_at > now()) AS hold_active FROM bookings WHERE id = $1 FOR UPDATE`,
    [bookingId]
  );
  return r.rows[0];
}

type ActivateOutcome = "confirmed" | "confirmed_late" | "already_confirmed" | "conflict" | "cancelled";

/** Turn a held (or expired) booking into a confirmed one, re-checking availability if the hold lapsed. */
async function activate(c: PoolClient, b: LockedBooking): Promise<ActivateOutcome> {
  if (b.status === "confirmed") return "already_confirmed";
  if (b.status === "cancelled") return "cancelled";
  const late = !b.hold_active;
  if (late) {
    await sweepExpiredHolds(c, b.hall_id);
    const occ = await loadOccupied(c, b.hall_id, b.block_start, b.block_end, b.id);
    if (conflictFor({ blockStart: b.block_start, blockEnd: b.block_end }, occ)) {
      if (b.status === "held") await c.query("UPDATE bookings SET status='expired', updated_at=now() WHERE id=$1", [b.id]);
      return "conflict";
    }
  }
  await c.query("SAVEPOINT activate_booking");
  try {
    await c.query(
      `UPDATE bookings SET status = 'confirmed', hold_expires_at = NULL, confirmed_at = now(), updated_at = now() WHERE id = $1`,
      [b.id]
    );
    await c.query("RELEASE SAVEPOINT activate_booking");
  } catch (err) {
    await c.query("ROLLBACK TO SAVEPOINT activate_booking");
    if (isExclusionViolation(err)) {
      if (b.status === "held") await c.query("UPDATE bookings SET status='expired', updated_at=now() WHERE id=$1", [b.id]);
      return "conflict";
    }
    throw err;
  }
  return late ? "confirmed_late" : "confirmed";
}

export async function adminConfirm(bookingId: string, actor: Actor): Promise<BookingRow> {
  return withTransaction(async (c) => {
    const b = await lockBooking(c, bookingId);
    const outcome = await activate(c, b);
    if (outcome === "conflict") throw new UnavailableError("Cannot confirm: this time now overlaps another active booking or a venue block.");
    if (outcome === "cancelled") throw new AppError(409, "invalid_state", "Cancelled bookings cannot be confirmed. Create a new booking instead.");
    if (outcome !== "already_confirmed") {
      await audit(c, { bookingId: b.id, entity: "booking", entityId: b.reference, action: "confirmed", actor: actorLabel(actor), details: { late: outcome === "confirmed_late" } });
    }
    return (await c.query<BookingRow>("SELECT * FROM bookings WHERE id=$1", [b.id])).rows[0];
  });
}

// ---------------------------------------------------------------------------
// Payments (idempotent)
// ---------------------------------------------------------------------------
export type PaymentEvent = {
  provider: "razorpay" | "demo" | "offline";
  bookingId?: string;
  orderId?: string | null;
  paymentId: string;
  amountPaise: number;
  actor: Actor;
  /** for webhooks: dedupe key recorded in the same transaction */
  webhook?: { eventId: string; eventType: string; payload: unknown };
};

export type PaymentResult = { outcome: ActivateOutcome | "duplicate"; booking: BookingRow };

export async function applyCapturedPayment(ev: PaymentEvent): Promise<PaymentResult> {
  return withTransaction(async (c) => {
    if (ev.webhook) {
      const ins = await c.query(
        `INSERT INTO webhook_events(provider, event_id, event_type, payload) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT DO NOTHING RETURNING event_id`,
        [ev.provider, ev.webhook.eventId, ev.webhook.eventType, JSON.stringify(ev.webhook.payload)]
      );
      if (ins.rowCount === 0) {
        const bk = ev.bookingId ? (await c.query<BookingRow>("SELECT * FROM bookings WHERE id=$1", [ev.bookingId])).rows[0] : null;
        return { outcome: "duplicate", booking: bk as BookingRow };
      }
    }

    let bookingId = ev.bookingId;
    if (!bookingId && ev.orderId) {
      const p = await c.query<{ booking_id: string }>("SELECT booking_id FROM payments WHERE provider=$1 AND provider_order_id=$2", [ev.provider, ev.orderId]);
      bookingId = p.rows[0]?.booking_id;
    }
    if (!bookingId) throw new NotFoundError("No booking matches this payment.");

    const b = await lockBooking(c, bookingId);

    // Idempotency: the same captured payment is only ever applied once.
    const seen = await c.query("SELECT 1 FROM payments WHERE provider=$1 AND provider_payment_id=$2 AND status='captured'", [ev.provider, ev.paymentId]);
    if (seen.rowCount) return { outcome: "duplicate", booking: b };

    const upd = ev.orderId
      ? await c.query(
          `UPDATE payments SET provider_payment_id=$3, amount_paise=$4, status='captured', updated_at=now()
            WHERE provider=$1 AND provider_order_id=$2 AND booking_id=$5 AND status <> 'captured' RETURNING id`,
          [ev.provider, ev.orderId, ev.paymentId, ev.amountPaise, b.id]
        )
      : { rowCount: 0 };
    if (!upd.rowCount) {
      await c.query(
        `INSERT INTO payments(booking_id, provider, provider_order_id, provider_payment_id, amount_paise, status)
         VALUES ($1,$2,$3,$4,$5,'captured')`,
        [b.id, ev.provider, ev.orderId ?? null, ev.paymentId, ev.amountPaise]
      );
    }

    const wasConfirmed = b.status === "confirmed";
    const outcome = await activate(c, b);
    const isDemo = ev.provider === "demo";
    const attention: string[] = [];
    if (!isDemo && ev.amountPaise !== b.total_paise) attention.push(`Amount received (${ev.amountPaise} paise) differs from booking total (${b.total_paise} paise).`);
    if (outcome === "confirmed_late") attention.push("Payment arrived after the hold expired. The time was still free, so the booking was confirmed automatically. Please review.");
    if (outcome === "conflict") attention.push("Payment received after the hold expired, and this time is now reserved by another booking or a venue block. The other reservation was NOT changed. Refund the customer or move them to another slot/hall.");
    if (outcome === "cancelled") attention.push("Payment received for a cancelled booking. Refund needed or re-book.");
    if (outcome === "already_confirmed" && wasConfirmed && b.payment_status !== "unpaid" && b.payment_status !== "pending" && b.payment_status !== "failed") {
      attention.push("An additional payment was received for a booking that was already paid. Check for a duplicate charge.");
    }

    await c.query(
      `UPDATE bookings SET payment_status = $2, amount_paid_paise = amount_paid_paise + $3,
              needs_attention = needs_attention OR $4, attention_reason = CASE WHEN $4 THEN trim(both E'\n' from attention_reason || E'\n' || $5) ELSE attention_reason END,
              updated_at = now()
        WHERE id = $1`,
      [b.id, isDemo ? "demo" : "paid", isDemo ? 0 : ev.amountPaise, attention.length > 0, attention.join(" ")]
    );
    await audit(c, {
      bookingId: b.id,
      entity: "booking",
      entityId: b.reference,
      action: outcome === "conflict" ? "payment_after_expiry_conflict" : "payment_captured",
      actor: actorLabel(ev.actor),
      details: { provider: ev.provider, payment_id: ev.paymentId, order_id: ev.orderId ?? null, amount_paise: ev.amountPaise, outcome, demo: isDemo },
    });
    const fresh = (await c.query<BookingRow>("SELECT * FROM bookings WHERE id=$1", [b.id])).rows[0];
    return { outcome, booking: fresh };
  });
}

export async function recordPaymentFailure(provider: "razorpay", orderId: string, paymentId: string, reason: string, webhook?: PaymentEvent["webhook"]) {
  return withTransaction(async (c) => {
    if (webhook) {
      const ins = await c.query(
        `INSERT INTO webhook_events(provider, event_id, event_type, payload) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT DO NOTHING RETURNING event_id`,
        [provider, webhook.eventId, webhook.eventType, JSON.stringify(webhook.payload)]
      );
      if (ins.rowCount === 0) return;
    }
    const p = await c.query<{ booking_id: string }>(
      `UPDATE payments SET status='failed', provider_payment_id = COALESCE(provider_payment_id, $3), note=$4, updated_at=now()
        WHERE provider=$1 AND provider_order_id=$2 AND status='created' RETURNING booking_id`,
      [provider, orderId, paymentId, reason.slice(0, 300)]
    );
    const bookingId = p.rows[0]?.booking_id;
    if (!bookingId) return;
    const b = await c.query<{ reference: string }>(
      `UPDATE bookings SET payment_status='failed', updated_at=now() WHERE id=$1 AND payment_status IN ('unpaid','pending') RETURNING reference`,
      [bookingId]
    );
    if (b.rows[0]) await audit(c, { bookingId, entity: "booking", entityId: b.rows[0].reference, action: "payment_failed", actor: "webhook", details: { reason } });
  });
}

// ---------------------------------------------------------------------------
// Admin operations
// ---------------------------------------------------------------------------
export async function cancelBooking(bookingId: string, actor: Actor, reason: string): Promise<BookingRow> {
  if (actor.kind !== "admin" && actor.kind !== "system") throw new AppError(403, "forbidden", "Only an administrator can cancel bookings.");
  return withTransaction(async (c) => {
    const b = await lockBooking(c, bookingId);
    if (b.status === "cancelled") throw new AppError(409, "invalid_state", "This booking is already cancelled.");
    if (b.status === "expired") throw new AppError(409, "invalid_state", "This hold has already expired.");
    const r = await c.query<BookingRow>(
      `UPDATE bookings SET status='cancelled', cancelled_at=now(), cancel_reason=$2, hold_expires_at=NULL, updated_at=now()
        WHERE id=$1 RETURNING *`,
      [b.id, reason.slice(0, 500)]
    );
    await audit(c, {
      bookingId: b.id,
      entity: "booking",
      entityId: b.reference,
      action: "cancelled",
      actor: actorLabel(actor),
      details: { reason, previous_status: b.status, payment_status: b.payment_status },
    });
    return r.rows[0];
  });
}

export async function rescheduleBooking(
  bookingId: string,
  target: { hallId?: number; date: string; choice: BookingChoice; reprice?: boolean },
  actor: Actor
): Promise<BookingRow> {
  if (actor.kind !== "admin") throw new AppError(403, "forbidden", "Only an administrator can reschedule bookings.");
  return withTransaction(async (c) => {
    const pre = await c.query<{ hall_id: number }>("SELECT hall_id FROM bookings WHERE id=$1", [bookingId]);
    if (!pre.rows[0]) throw new NotFoundError("Booking not found.");
    const oldHallId = pre.rows[0].hall_id;
    const newHallId = target.hallId ?? oldHallId;
    // Lock both halls in a fixed order to avoid deadlocks.
    for (const id of [...new Set([oldHallId, newHallId])].sort((a, b) => a - b)) {
      await c.query("SELECT 1 FROM halls WHERE id=$1 FOR UPDATE", [id]);
    }
    const b = (
      await c.query<LockedBooking>(`SELECT *, (status='held' AND hold_expires_at > now()) AS hold_active FROM bookings WHERE id=$1 FOR UPDATE`, [bookingId])
    ).rows[0];
    if (b.status === "cancelled" || b.status === "expired") throw new AppError(409, "invalid_state", `A ${b.status} booking cannot be rescheduled.`);
    if (b.status === "held" && !b.hold_active) throw new AppError(409, "invalid_state", "This hold has expired and cannot be rescheduled.");

    const hall = await loadHall(c, newHallId);
    if (!hall) throw new NotFoundError("Hall not found.");
    if (!hall.is_active || !hall.location_active) throw new UnavailableError("The chosen hall is deactivated and cannot take bookings.");
    if (b.guest_count > hall.capacity_max) throw new ValidationError({ hallId: `That hall holds up to ${hall.capacity_max} guests (booking has ${b.guest_count}).` });

    await sweepExpiredHolds(c, newHallId);
    const slots = await loadSlots(c, newHallId);
    const win = computeWindow(hall, slots, target.date, target.choice);
    if (!win) throw new ValidationError({ slot: "Choose a slot offered by this hall." });
    const timing = windowTimingProblem(hall, win, { ignoreNotice: true });
    if (timing) throw new UnavailableError(unavailableMessage(timing));
    const occ = await loadOccupied(c, newHallId, win.blockStart, win.blockEnd, b.id);
    const hit = conflictFor(win, occ);
    if (hit) throw new UnavailableError(hit.type === "block" ? "The new time overlaps a venue block." : "The new time overlaps another active booking for that hall.");

    let price = { rental: b.rental_paise, cleaning: b.cleaning_fee_paise, tax: b.tax_paise, total: b.total_paise };
    if (target.reprice) {
      const rental = win.pricePaise;
      const cleaning = hall.cleaning_fee_paise;
      const tax = computeTax(rental + cleaning, Number(b.tax_percent));
      price = { rental, cleaning, tax, total: rental + cleaning + tax };
    }
    let updated: BookingRow;
    try {
      updated = (
        await c.query<BookingRow>(
          `UPDATE bookings SET hall_id=$2, event_date=$3, booking_kind=$4, slot_id=$5, slot_label=$6, start_at=$7, end_at=$8,
                  block_start=$9, block_end=$10, rental_paise=$11, cleaning_fee_paise=$12, tax_paise=$13, total_paise=$14, updated_at=now()
            WHERE id=$1 RETURNING *`,
          [b.id, newHallId, target.date, win.kind, win.slotId, win.label, win.start, win.end, win.blockStart, win.blockEnd, price.rental, price.cleaning, price.tax, price.total]
        )
      ).rows[0];
    } catch (err) {
      if (isExclusionViolation(err)) throw new UnavailableError("The new time overlaps another active booking for that hall.");
      throw err;
    }
    await audit(c, {
      bookingId: b.id,
      entity: "booking",
      entityId: b.reference,
      action: "rescheduled",
      actor: actorLabel(actor),
      details: {
        from: { hall_id: b.hall_id, date: b.event_date, slot: b.slot_label },
        to: { hall_id: newHallId, date: target.date, slot: win.label },
        repriced: !!target.reprice,
        total_paise: { before: b.total_paise, after: price.total },
      },
    });
    return updated;
  });
}

export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "demo", "refunded", "failed"] as const;

export async function setPaymentStatus(bookingId: string, status: (typeof PAYMENT_STATUSES)[number], note: string, actor: Actor, offlineAmountPaise?: number) {
  if (actor.kind !== "admin") throw new AppError(403, "forbidden", "Admin only.");
  return withTransaction(async (c) => {
    const b = await lockBooking(c, bookingId);
    if (offlineAmountPaise && offlineAmountPaise > 0) {
      await c.query(
        `INSERT INTO payments(booking_id, provider, amount_paise, status, note) VALUES ($1,'offline',$2,'captured',$3)`,
        [b.id, offlineAmountPaise, note.slice(0, 300)]
      );
    }
    const r = await c.query<BookingRow>(
      `UPDATE bookings SET payment_status=$2, amount_paid_paise = amount_paid_paise + $3, updated_at=now() WHERE id=$1 RETURNING *`,
      [b.id, status, offlineAmountPaise && offlineAmountPaise > 0 ? offlineAmountPaise : 0]
    );
    await audit(c, {
      bookingId: b.id,
      entity: "booking",
      entityId: b.reference,
      action: "payment_status_changed",
      actor: actorLabel(actor),
      details: { from: b.payment_status, to: status, note, offline_amount_paise: offlineAmountPaise ?? 0 },
    });
    return r.rows[0];
  });
}

export async function resolveAttention(bookingId: string, note: string, actor: Actor) {
  return withTransaction(async (c) => {
    const r = await c.query<BookingRow>(
      `UPDATE bookings SET needs_attention=false, updated_at=now() WHERE id=$1 RETURNING *`,
      [bookingId]
    );
    if (!r.rows[0]) throw new NotFoundError("Booking not found.");
    await audit(c, { bookingId, entity: "booking", entityId: r.rows[0].reference, action: "attention_resolved", actor: actorLabel(actor), details: { note, previous_reason: r.rows[0].attention_reason } });
    return r.rows[0];
  });
}

export async function updateBookingDetails(
  bookingId: string,
  d: { customerName: string; customerPhone: string; customerEmail: string; guestCount: number; eventType: string; eventTypeOther: string; notes: string },
  actor: Actor
) {
  return withTransaction(async (c) => {
    const b = await lockBooking(c, bookingId);
    const hall = await loadHall(c, b.hall_id);
    if (hall && d.guestCount > hall.capacity_max) throw new ValidationError({ guestCount: `This hall holds up to ${hall.capacity_max} guests.` });
    const r = await c.query<BookingRow>(
      `UPDATE bookings SET customer_name=$2, customer_phone=$3, customer_email=$4, guest_count=$5, event_type=$6, event_type_other=$7, notes=$8, updated_at=now()
        WHERE id=$1 RETURNING *`,
      [b.id, d.customerName, d.customerPhone, d.customerEmail, d.guestCount, d.eventType, d.eventTypeOther, d.notes]
    );
    const changed: Record<string, unknown> = {};
    const before: Record<string, unknown> = { customerName: b.customer_name, customerPhone: b.customer_phone, customerEmail: b.customer_email, guestCount: b.guest_count, eventType: b.event_type, eventTypeOther: b.event_type_other, notes: b.notes };
    for (const [k, v] of Object.entries(d)) if (before[k] !== v) changed[k] = { from: before[k], to: v };
    await audit(c, { bookingId: b.id, entity: "booking", entityId: b.reference, action: "details_updated", actor: actorLabel(actor), details: changed });
    return r.rows[0];
  });
}

// ---------------------------------------------------------------------------
// Customer access
// ---------------------------------------------------------------------------
export async function getBookingWithToken(bookingId: string, token: string): Promise<BookingRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId) || !token) return null;
  const b = await queryOne<BookingRow & { access_token_hash: string }>("SELECT * FROM bookings WHERE id=$1", [bookingId]);
  if (!b || !tokenMatches(token, b.access_token_hash)) return null;
  return b;
}

/** Lookup by reference + the email or phone used when booking. Returns null for any mismatch. */
export async function lookupBooking(reference: string, contact: string): Promise<BookingRow | null> {
  const ref = reference.trim().toUpperCase();
  if (!/^BC-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(ref)) return null;
  const b = await queryOne<BookingRow>("SELECT * FROM bookings WHERE reference=$1", [ref]);
  if (!b) return null;
  const c = contact.trim().toLowerCase();
  const emailOk = c.includes("@") && c === b.customer_email.toLowerCase();
  const phoneOk = !c.includes("@") && normalizePhone(c).length >= 10 && normalizePhone(c) === normalizePhone(b.customer_phone);
  return emailOk || phoneOk ? b : null;
}

export function displayStatus(b: Pick<BookingRow, "status" | "end_at" | "hold_expires_at">, now = new Date()): string {
  if (b.status === "confirmed" && new Date(b.end_at) < now) return "completed";
  if (b.status === "held" && b.hold_expires_at && new Date(b.hold_expires_at) <= now) return "expired";
  return b.status;
}
