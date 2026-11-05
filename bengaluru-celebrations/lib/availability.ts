// Pure availability logic (no database access) so it can be unit-tested and reused
// by both the server-side booking engine and calendar rendering.
import { addDays, hhmm, istInstant, todayIST } from "./time";

export type HallTimingConfig = {
  id: number;
  open_time: string; // HH:MM[:SS]
  close_time: string;
  allow_full_day: boolean;
  full_day_price_paise: number;
  setup_buffer_min: number;
  cleanup_buffer_min: number;
  min_notice_hours: number;
  max_advance_days: number;
};

export type SlotConfig = {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  price_paise: number;
  is_active: boolean;
};

export type BookingChoice = { kind: "full_day" } | { kind: "slot"; slotId: number };

export type Window = {
  kind: "full_day" | "slot";
  slotId: number | null;
  label: string;
  startTime: string; // HH:MM
  endTime: string;
  start: Date;
  end: Date;
  blockStart: Date;
  blockEnd: Date;
  pricePaise: number;
};

export type Occupied = { start: Date; end: Date; type: "booking" | "block" };

export type OptionAvailability = {
  key: string; // "full_day" | "slot:<id>"
  kind: "full_day" | "slot";
  slotId: number | null;
  label: string;
  startTime: string;
  endTime: string;
  pricePaise: number;
  available: boolean;
  reason: null | "booked" | "blocked" | "too_soon" | "past";
};

export type DayStatus = "available" | "partial" | "full" | "closed";

export type DayAvailability = {
  date: string;
  status: DayStatus;
  closedReason: null | "past" | "too_far" | "no_options";
  options: OptionAvailability[];
};

const MIN = 60_000;

export function computeWindow(hall: HallTimingConfig, slots: SlotConfig[], date: string, choice: BookingChoice): Window | null {
  if (choice.kind === "full_day") {
    if (!hall.allow_full_day) return null;
    const start = istInstant(date, hall.open_time);
    const end = istInstant(date, hall.close_time);
    return {
      kind: "full_day",
      slotId: null,
      label: "Full day",
      startTime: hhmm(hall.open_time),
      endTime: hhmm(hall.close_time),
      start,
      end,
      blockStart: new Date(start.getTime() - hall.setup_buffer_min * MIN),
      blockEnd: new Date(end.getTime() + hall.cleanup_buffer_min * MIN),
      pricePaise: hall.full_day_price_paise,
    };
  }
  const slot = slots.find((s) => s.id === choice.slotId && s.is_active);
  if (!slot) return null;
  const start = istInstant(date, slot.start_time);
  const end = istInstant(date, slot.end_time);
  return {
    kind: "slot",
    slotId: slot.id,
    label: slot.label,
    startTime: hhmm(slot.start_time),
    endTime: hhmm(slot.end_time),
    start,
    end,
    blockStart: new Date(start.getTime() - hall.setup_buffer_min * MIN),
    blockEnd: new Date(end.getTime() + hall.cleanup_buffer_min * MIN),
    pricePaise: slot.price_paise,
  };
}

/** Half-open interval overlap: [a1,a2) and [b1,b2) */
export function overlaps(a1: Date, a2: Date, b1: Date, b2: Date): boolean {
  return a1.getTime() < b2.getTime() && b1.getTime() < a2.getTime();
}

export function conflictFor(win: Pick<Window, "blockStart" | "blockEnd">, occupied: Occupied[]): Occupied | null {
  // Admin blocks win over bookings when reporting the reason.
  const hits = occupied.filter((o) => overlaps(win.blockStart, win.blockEnd, o.start, o.end));
  return hits.find((h) => h.type === "block") ?? hits[0] ?? null;
}

export type DateRuleOptions = { now?: Date; ignoreNotice?: boolean; ignoreAdvanceLimit?: boolean };

export function dateOutOfRange(hall: HallTimingConfig, date: string, opts: DateRuleOptions = {}): null | "past" | "too_far" {
  const today = todayIST(opts.now ?? new Date());
  if (date < today) return "past";
  if (!opts.ignoreAdvanceLimit && date > addDays(today, hall.max_advance_days)) return "too_far";
  return null;
}

export function windowTimingProblem(hall: HallTimingConfig, win: Window, opts: DateRuleOptions = {}): null | "past" | "too_soon" {
  const now = opts.now ?? new Date();
  if (win.start.getTime() <= now.getTime()) return "past";
  if (!opts.ignoreNotice && win.start.getTime() < now.getTime() + hall.min_notice_hours * 60 * MIN) return "too_soon";
  return null;
}

export function dayAvailability(
  hall: HallTimingConfig,
  slots: SlotConfig[],
  date: string,
  occupied: Occupied[],
  opts: DateRuleOptions = {}
): DayAvailability {
  const out = dateOutOfRange(hall, date, opts);
  const choices: BookingChoice[] = [
    ...slots.filter((s) => s.is_active).map((s) => ({ kind: "slot" as const, slotId: s.id })),
    ...(hall.allow_full_day ? [{ kind: "full_day" as const }] : []),
  ];
  const options: OptionAvailability[] = [];
  for (const c of choices) {
    const win = computeWindow(hall, slots, date, c);
    if (!win) continue;
    let reason: OptionAvailability["reason"] = null;
    if (out) reason = "past";
    else {
      const t = windowTimingProblem(hall, win, opts);
      if (t) reason = t;
      else {
        const hit = conflictFor(win, occupied);
        if (hit) reason = hit.type === "block" ? "blocked" : "booked";
      }
    }
    options.push({
      key: c.kind === "full_day" ? "full_day" : `slot:${c.slotId}`,
      kind: win.kind,
      slotId: win.slotId,
      label: win.label,
      startTime: win.startTime,
      endTime: win.endTime,
      pricePaise: win.pricePaise,
      available: reason === null,
      reason,
    });
  }
  // stable order: by start time, full day last
  options.sort((a, b) => (a.kind === b.kind ? a.startTime.localeCompare(b.startTime) : a.kind === "full_day" ? 1 : -1));

  let status: DayStatus;
  let closedReason: DayAvailability["closedReason"] = null;
  if (out) {
    status = "closed";
    closedReason = out;
  } else if (options.length === 0) {
    status = "closed";
    closedReason = "no_options";
  } else {
    const free = options.filter((o) => o.available).length;
    const timingOnly = options.every((o) => o.reason === "too_soon" || o.reason === "past");
    if (free === options.length) status = "available";
    else if (free > 0) status = "partial";
    else if (timingOnly) {
      status = "closed";
      closedReason = "past";
    } else status = "full";
  }
  return { date, status, closedReason, options };
}
