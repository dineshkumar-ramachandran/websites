// Asia/Kolkata helpers. IST is a fixed UTC+05:30 offset (no daylight saving),
// so a local date + time maps to exactly one instant.
export const TZ = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export function isValidDateString(s: unknown): s is string {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function isValidTimeString(s: unknown): s is string {
  return typeof s === "string" && TIME_RE.test(s);
}
export function hhmm(t: string): string {
  return t.slice(0, 5);
}

/** Instant for a local Bengaluru date and time ("HH:MM" or "HH:MM:SS"). */
export function istInstant(date: string, time: string): Date {
  const t = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${t}${IST_OFFSET}`);
}

/** Today's date in Bengaluru as YYYY-MM-DD. */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** 0 = Sunday */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatInstant(d: Date | string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }): string {
  return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: TZ }).format(new Date(d));
}

/** Local IST time-of-day "HH:MM" for an instant. */
export function istTimeOf(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}
