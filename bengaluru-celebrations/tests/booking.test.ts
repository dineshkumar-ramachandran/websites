// Integration tests against a real PostgreSQL test database.
// Requires TEST_DATABASE_URL (default postgres://bc:bc@localhost:5432/bengaluru_celebrations_test).
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { admin, customer, expireHold, futureDate, hallBySlug, input, resetDb } from "./helpers";
import { closePool, getPool } from "../lib/db";
import {
  adminConfirm,
  applyCapturedPayment,
  cancelBooking,
  createBooking,
  getAvailability,
  getBookingWithToken,
  lookupBooking,
  rescheduleBooking,
} from "../lib/booking";
import { UnavailableError } from "../lib/errors";
import { istInstant } from "../lib/time";
import { setActive, listPublicHalls } from "../lib/halls";

let adminId = 0;
let A: Awaited<ReturnType<typeof hallBySlug>>;
let B: Awaited<ReturnType<typeof hallBySlug>>;
const D = futureDate(40);

before(async () => {});
beforeEach(async () => {
  ({ adminId } = await resetDb());
  A = await hallBySlug("mallige-hall"); // Lunch 11:00–15:30, Evening 17:00–22:00, buffers 45 min
  B = await hallBySlug("sampige-banquet");
});
after(async () => {
  await closePool();
});

describe("overlap rules", () => {
  test("Hall A booked for an evening: same hall/time rejected, other halls and other dates free", async () => {
    await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: admin(adminId), confirm: true });

    await assert.rejects(createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer }), UnavailableError);
    // Other halls unaffected
    await createBooking(input(B.id, D, { kind: "slot", slotId: B.slots.Evening }), { actor: customer });
    // Same hall, other date
    await createBooking(input(A.id, futureDate(41), { kind: "slot", slotId: A.slots.Evening }), { actor: customer });
    // Same hall, same date, non-overlapping slot (Lunch block ends 16:15, Evening block starts 16:15)
    await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Lunch }), { actor: customer });
  });

  test("full day vs slot conflicts in both directions", async () => {
    await createBooking(input(A.id, D, { kind: "full_day" }), { actor: customer });
    await assert.rejects(createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Lunch }), { actor: customer }), UnavailableError);
    await assert.rejects(createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer }), UnavailableError);

    const D2 = futureDate(42);
    await createBooking(input(A.id, D2, { kind: "slot", slotId: A.slots.Lunch }), { actor: customer });
    await assert.rejects(createBooking(input(A.id, D2, { kind: "full_day" }), { actor: customer }), UnavailableError);
  });

  test("buffers block adjacent times (hall with buffers that would overlap)", async () => {
    // Set a 3-hour cleanup buffer: the Lunch block now runs into the Evening setup.
    await getPool().query("UPDATE halls SET cleanup_buffer_min = 180 WHERE id=$1", [A.id]);
    await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Lunch }), { actor: customer });
    await assert.rejects(createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer }), UnavailableError);
  });

  test("the database itself rejects overlapping active bookings (exclusion constraint)", async () => {
    const { booking } = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer });
    await assert.rejects(
      getPool().query(
        `INSERT INTO bookings (reference, hall_id, event_date, booking_kind, slot_id, slot_label, start_at, end_at, block_start, block_end,
           status, source, event_type, guest_count, customer_name, customer_phone, customer_email, rental_paise, total_paise, access_token_hash)
         SELECT 'BC-RAW0-0001', hall_id, event_date, booking_kind, slot_id, slot_label, start_at, end_at, block_start, block_end,
           'confirmed', 'admin', 'other', 1, 'x', '9999999999', 'x@example.com', 0, 0, 'x' FROM bookings WHERE id=$1`,
        [booking.id]
      ),
      (e: { code?: string }) => e.code === "23P01"
    );
  });
});

describe("concurrency", () => {
  test("20 simultaneous attempts for the same hall/slot produce exactly one hold", async () => {
    const attempts = Array.from({ length: 20 }, () =>
      createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer })
    );
    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    assert.equal(ok.length, 1);
    assert.ok(failed.every((f) => f.reason instanceof UnavailableError), "losers get a clear 'unavailable' error");
    const n = await getPool().query("SELECT count(*)::int AS n FROM bookings WHERE hall_id=$1 AND status IN ('held','confirmed')", [A.id]);
    assert.equal(n.rows[0].n, 1);
  });

  test("simultaneous full-day and slot attempts: only one wins", async () => {
    const results = await Promise.allSettled([
      createBooking(input(A.id, D, { kind: "full_day" }), { actor: customer }),
      createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Lunch }), { actor: customer }),
      createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    // Either the full-day wins alone, or both slots win (they don't overlap each other).
    const fd = await getPool().query("SELECT count(*)::int AS n FROM bookings WHERE hall_id=$1 AND booking_kind='full_day' AND status='held'", [A.id]);
    if (fd.rows[0].n === 1) assert.equal(ok, 1);
    else assert.equal(ok, 2);
  });

  test("simultaneous bookings on different halls all succeed", async () => {
    const results = await Promise.allSettled([
      createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer }),
      createBooking(input(B.id, D, { kind: "slot", slotId: B.slots.Evening }), { actor: customer }),
    ]);
    assert.ok(results.every((r) => r.status === "fulfilled"));
  });
});

describe("holds", () => {
  test("an active hold blocks; an expired hold releases availability", async () => {
    const { booking } = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer });
    await assert.rejects(createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer }), UnavailableError);
    let av = await getAvailability(A.id, D, D);
    assert.equal(av.days[0].options.find((o) => o.key === `slot:${A.slots.Evening}`)!.available, false);

    await expireHold(booking.id);
    av = await getAvailability(A.id, D, D);
    assert.equal(av.days[0].options.find((o) => o.key === `slot:${A.slots.Evening}`)!.available, true, "expired hold no longer blocks");

    const second = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer });
    assert.equal(second.booking.status, "held");
    const first = await getPool().query("SELECT status FROM bookings WHERE id=$1", [booking.id]);
    assert.equal(first.rows[0].status, "expired");
  });

  test("confirmed bookings never expire just because time passes", async () => {
    const { booking } = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: admin(adminId), confirm: true });
    await getPool().query("SELECT 1"); // sweep happens on next write
    await assert.rejects(createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer }), UnavailableError);
    const r = await getPool().query("SELECT status, hold_expires_at FROM bookings WHERE id=$1", [booking.id]);
    assert.equal(r.rows[0].status, "confirmed");
    assert.equal(r.rows[0].hold_expires_at, null);
  });
});

describe("payments", () => {
  test("payment confirms a held booking; repeated notifications are idempotent", async () => {
    const { booking } = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer });
    const ev = { provider: "razorpay" as const, bookingId: booking.id, paymentId: "pay_TEST1", amountPaise: booking.total_paise, actor: { kind: "webhook" as const } };
    const r1 = await applyCapturedPayment({ ...ev, webhook: { eventId: "evt_1", eventType: "payment.captured", payload: {} } });
    assert.equal(r1.outcome, "confirmed");
    assert.equal(r1.booking.status, "confirmed");
    assert.equal(r1.booking.payment_status, "paid");
    // Same webhook delivered again, and the browser verify call for the same payment
    const r2 = await applyCapturedPayment({ ...ev, webhook: { eventId: "evt_1", eventType: "payment.captured", payload: {} } });
    assert.equal(r2.outcome, "duplicate");
    const r3 = await applyCapturedPayment(ev);
    assert.equal(r3.outcome, "duplicate");
    const p = await getPool().query("SELECT count(*)::int AS n FROM payments WHERE booking_id=$1", [booking.id]);
    assert.equal(p.rows[0].n, 1);
    const b = await getPool().query("SELECT count(*)::int AS n FROM bookings");
    assert.equal(b.rows[0].n, 1, "no duplicate bookings");
    const paid = await getPool().query("SELECT amount_paid_paise FROM bookings WHERE id=$1", [booking.id]);
    assert.equal(paid.rows[0].amount_paid_paise, booking.total_paise);
  });

  test("late payment after the slot was taken is flagged and never overrides the other booking", async () => {
    const first = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer });
    await expireHold(first.booking.id);
    const second = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer });
    await applyCapturedPayment({ provider: "razorpay", bookingId: second.booking.id, paymentId: "pay_2", amountPaise: second.booking.total_paise, actor: { kind: "webhook" } });

    const late = await applyCapturedPayment({ provider: "razorpay", bookingId: first.booking.id, paymentId: "pay_1", amountPaise: first.booking.total_paise, actor: { kind: "webhook" } });
    assert.equal(late.outcome, "conflict");
    assert.equal(late.booking.status, "expired");
    assert.equal(late.booking.payment_status, "paid");
    assert.equal(late.booking.needs_attention, true);
    const s = await getPool().query("SELECT status FROM bookings WHERE id=$1", [second.booking.id]);
    assert.equal(s.rows[0].status, "confirmed", "other customer's confirmed booking is untouched");
  });

  test("late payment while the slot is still free confirms and flags for review", async () => {
    const first = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer });
    await expireHold(first.booking.id);
    const late = await applyCapturedPayment({ provider: "razorpay", bookingId: first.booking.id, paymentId: "pay_x", amountPaise: first.booking.total_paise, actor: { kind: "webhook" } });
    assert.equal(late.outcome, "confirmed_late");
    assert.equal(late.booking.status, "confirmed");
    assert.equal(late.booking.needs_attention, true);
  });

  test("demo payments are labelled demo and record no money", async () => {
    const { booking } = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Lunch }), { actor: customer });
    const r = await applyCapturedPayment({ provider: "demo", bookingId: booking.id, paymentId: `demo_${booking.id}`, amountPaise: booking.total_paise, actor: customer });
    assert.equal(r.booking.status, "confirmed");
    assert.equal(r.booking.payment_status, "demo");
    assert.equal(r.booking.amount_paid_paise, 0);
  });
});

describe("cancellation and rescheduling", () => {
  test("cancelling releases availability; only admins can cancel", async () => {
    const { booking } = await createBooking(input(A.id, D, { kind: "full_day" }), { actor: admin(adminId), confirm: true });
    await assert.rejects(cancelBooking(booking.id, customer, "no"), /administrator/);
    await cancelBooking(booking.id, admin(adminId), "Customer called to cancel");
    await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: customer });
    const log = await getPool().query("SELECT action FROM audit_log WHERE booking_id=$1 ORDER BY id", [booking.id]);
    assert.deepEqual(log.rows.map((r) => r.action), ["created_confirmed", "cancelled"]);
  });

  test("reschedule rechecks availability and moves the block", async () => {
    const x = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Lunch }), { actor: admin(adminId), confirm: true });
    await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: admin(adminId), confirm: true });
    // Into an occupied slot → rejected
    await assert.rejects(rescheduleBooking(x.booking.id, { date: D, choice: { kind: "slot", slotId: A.slots.Evening } }, admin(adminId)), UnavailableError);
    // Into a free date → ok, and the old slot is released
    const D2 = futureDate(45);
    const moved = await rescheduleBooking(x.booking.id, { date: D2, choice: { kind: "slot", slotId: A.slots.Evening } }, admin(adminId));
    assert.equal(moved.event_date, D2);
    await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Lunch }), { actor: customer });
    // Move to another hall
    const moved2 = await rescheduleBooking(x.booking.id, { hallId: B.id, date: D2, choice: { kind: "slot", slotId: B.slots.Evening } }, admin(adminId));
    assert.equal(moved2.hall_id, B.id);
  });

  test("cannot confirm a cancelled booking", async () => {
    const { booking } = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Lunch }), { actor: customer });
    await cancelBooking(booking.id, admin(adminId), "test");
    await assert.rejects(adminConfirm(booking.id, admin(adminId)));
  });
});

describe("deactivated halls and admin blocks", () => {
  test("deactivated hall: hidden from listing, rejects new bookings, keeps existing records", async () => {
    const { booking } = await createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Evening }), { actor: admin(adminId), confirm: true });
    await setActive("halls", A.id, false, "admin:t@example.com");
    const list = await listPublicHalls();
    assert.ok(!list.some((h) => h.id === A.id));
    assert.equal(list.length, 3);
    await assert.rejects(createBooking(input(A.id, futureDate(50), { kind: "full_day" }), { actor: customer }), UnavailableError);
    await assert.rejects(createBooking(input(A.id, futureDate(50), { kind: "full_day" }), { actor: admin(adminId), confirm: true }), UnavailableError);
    const r = await getPool().query("SELECT status FROM bookings WHERE id=$1", [booking.id]);
    assert.equal(r.rows[0].status, "confirmed");
  });

  test("admin maintenance block prevents bookings, and cannot be placed over an active booking", async () => {
    await getPool().query("INSERT INTO hall_blocks(hall_id, start_at, end_at, reason) VALUES ($1,$2,$3,'Maintenance')", [
      A.id, istInstant(D, "00:00"), istInstant(futureDate(41), "00:00"),
    ]);
    await assert.rejects(createBooking(input(A.id, D, { kind: "slot", slotId: A.slots.Lunch }), { actor: admin(adminId), confirm: true }), UnavailableError);
    const D3 = futureDate(43);
    await createBooking(input(A.id, D3, { kind: "slot", slotId: A.slots.Lunch }), { actor: customer });
    await assert.rejects(
      getPool().query("INSERT INTO hall_blocks(hall_id, start_at, end_at, reason) VALUES ($1,$2,$3,'x')", [A.id, istInstant(D3, "00:00"), istInstant(futureDate(44), "00:00")]),
      (e: { code?: string }) => e.code === "23P01"
    );
  });
});

describe("customer access", () => {
  test("lookup requires the matching email or phone; token access is per booking", async () => {
    const { booking, accessToken } = await createBooking(
      input(A.id, D, { kind: "slot", slotId: A.slots.Lunch }, { customerEmail: "priya@example.com", customerPhone: "+919845012345" }),
      { actor: customer }
    );
    assert.ok(await lookupBooking(booking.reference, "PRIYA@example.com"));
    assert.ok(await lookupBooking(booking.reference.toLowerCase(), "98450 12345"));
    assert.equal(await lookupBooking(booking.reference, "someone@example.com"), null);
    assert.equal(await lookupBooking(booking.reference, "9999999999"), null);
    assert.ok(await getBookingWithToken(booking.id, accessToken));
    assert.equal(await getBookingWithToken(booking.id, "wrong-token"), null);
  });
});
