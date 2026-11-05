// Pure-logic tests (no database).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeWindow, dayAvailability, HallTimingConfig, SlotConfig } from "../lib/availability";
import { istInstant } from "../lib/time";

const hall: HallTimingConfig = {
  id: 1, open_time: "09:00:00", close_time: "23:00:00", allow_full_day: true, full_day_price_paise: 100,
  setup_buffer_min: 45, cleanup_buffer_min: 45, min_notice_hours: 24, max_advance_days: 365,
};
const slots: SlotConfig[] = [
  { id: 1, label: "Lunch", start_time: "11:00:00", end_time: "15:30:00", price_paise: 50, is_active: true },
  { id: 2, label: "Evening", start_time: "17:00:00", end_time: "22:00:00", price_paise: 70, is_active: true },
];
const now = new Date("2026-12-01T06:00:00Z");

test("IST instants are UTC+05:30", () => {
  assert.equal(istInstant("2026-12-20", "17:00").toISOString(), "2026-12-20T11:30:00.000Z");
});

test("slot window includes setup and cleanup buffers", () => {
  const w = computeWindow(hall, slots, "2026-12-20", { kind: "slot", slotId: 2 })!;
  assert.equal(w.blockStart.toISOString(), "2026-12-20T10:45:00.000Z"); // 16:15 IST
  assert.equal(w.blockEnd.toISOString(), "2026-12-20T17:15:00.000Z"); // 22:45 IST
});

test("an evening booking leaves the lunch slot free but blocks full day", () => {
  const ev = computeWindow(hall, slots, "2026-12-20", { kind: "slot", slotId: 2 })!;
  const d = dayAvailability(hall, slots, "2026-12-20", [{ start: ev.blockStart, end: ev.blockEnd, type: "booking" }], { now });
  const by = Object.fromEntries(d.options.map((o) => [o.key, o]));
  assert.equal(by["slot:1"].available, true);
  assert.equal(by["slot:2"].available, false);
  assert.equal(by["slot:2"].reason, "booked");
  assert.equal(by["full_day"].available, false);
  assert.equal(d.status, "partial");
});

test("full-day booking blocks every slot that day", () => {
  const fd = computeWindow(hall, slots, "2026-12-20", { kind: "full_day" })!;
  const d = dayAvailability(hall, slots, "2026-12-20", [{ start: fd.blockStart, end: fd.blockEnd, type: "booking" }], { now });
  assert.ok(d.options.every((o) => !o.available));
  assert.equal(d.status, "full");
});

test("bookings on other dates do not affect a date", () => {
  const fd = computeWindow(hall, slots, "2026-12-21", { kind: "full_day" })!;
  const d = dayAvailability(hall, slots, "2026-12-20", [{ start: fd.blockStart, end: fd.blockEnd, type: "booking" }], { now });
  assert.equal(d.status, "available");
});

test("past dates and short notice are closed", () => {
  assert.equal(dayAvailability(hall, slots, "2026-11-30", [], { now }).status, "closed");
  // now = 11:30 IST on 1 Dec; 24h notice → 1 Dec slots not bookable
  const today = dayAvailability(hall, slots, "2026-12-01", [], { now });
  assert.ok(today.options.every((o) => !o.available));
  assert.equal(dayAvailability(hall, slots, "2026-12-01", [], { now, ignoreNotice: true }).options.find((o) => o.key === "slot:2")!.available, true);
});

test("admin block shows as blocked", () => {
  const d = dayAvailability(hall, slots, "2026-12-20", [{ start: istInstant("2026-12-20", "00:00"), end: istInstant("2026-12-21", "00:00"), type: "block" }], { now });
  assert.ok(d.options.every((o) => o.reason === "blocked"));
});
