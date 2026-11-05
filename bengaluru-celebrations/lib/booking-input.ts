// Server-side parsing/validation of booking form payloads (shared by public and admin routes).
import type { BookingChoice } from "./availability";
import type { BookingInput } from "./booking";
import { Checker, EVENT_TYPE_VALUES } from "./validation";

export function parseChoice(c: Checker, key: string): BookingChoice | null {
  const raw = c.str("option", { required: true, label: "Time slot" });
  if (!raw) return null;
  if (raw === "full_day") return { kind: "full_day" };
  const m = raw.match(/^slot:(\d+)$/);
  if (!m) {
    c.fail(key, "Please choose a time slot.");
    return null;
  }
  return { kind: "slot", slotId: Number(m[1]) };
}

export function parseBookingInput(body: Record<string, unknown>): BookingInput {
  const c = new Checker(body);
  const hallId = c.int("hallId", { required: true, min: 1, label: "Hall" });
  const date = c.date("date", { required: true, label: "Event date" });
  const choice = parseChoice(c, "option");
  const eventType = c.oneOf("eventType", EVENT_TYPE_VALUES, { required: true, label: "Event type" });
  const eventTypeOther = c.str("eventTypeOther", { max: 80, label: "Event description", required: eventType === "other" });
  const guestCount = c.int("guestCount", { required: true, min: 1, max: 5000, label: "Guest count" });
  const customerName = c.str("customerName", { required: true, min: 2, max: 100, label: "Your name" });
  const customerPhone = c.phone("customerPhone", { required: true });
  const customerEmail = c.email("customerEmail", { required: true });
  const notes = c.str("notes", { max: 1000, label: "Notes" });
  c.done();
  return { hallId, date, choice: choice!, eventType, eventTypeOther, guestCount, customerName, customerPhone, customerEmail, notes };
}
