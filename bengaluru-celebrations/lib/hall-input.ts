import type { HallInput, SlotInput } from "./halls";
import { rupeesToPaise } from "./money";
import { Checker, slugify } from "./validation";
import { ValidationError } from "./errors";

function money(c: Checker, name: string, label: string, required = true): number {
  const raw = (c as any).input?.[name];
  if (raw === "" || raw === undefined || raw === null) {
    if (required) c.fail(name, `${label} is required.`);
    return 0;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
    c.fail(name, `${label} must be an amount in rupees.`);
    return 0;
  }
  return rupeesToPaise(n);
}

export function parseHallInput(body: Record<string, unknown>): HallInput {
  const c = new Checker(body);
  const name = c.str("name", { required: true, min: 2, max: 100, label: "Hall name" });
  const slug = slugify(c.str("slug", { max: 60 }) || name);
  if (!slug) c.fail("slug", "URL name is required.");
  const amenitiesRaw = body.amenities;
  const amenities = (Array.isArray(amenitiesRaw) ? amenitiesRaw : typeof amenitiesRaw === "string" ? amenitiesRaw.split(/[\n,]/) : [])
    .map((a) => String(a).trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((a) => a.slice(0, 60));
  const mapUrl = c.str("map_url", { max: 500, label: "Map link", pattern: /^https:\/\//, patternMsg: "Map link must start with https://" });
  const input: HallInput = {
    location_id: c.int("location_id", { required: true, min: 1, label: "Location" }),
    name,
    slug,
    tagline: c.str("tagline", { max: 160 }),
    description: c.str("description", { max: 5000 }),
    address: c.str("address", { max: 300, required: true, label: "Address" }),
    map_url: mapUrl,
    capacity_min: c.int("capacity_min", { required: true, min: 1, max: 10000, label: "Minimum guests" }),
    capacity_max: c.int("capacity_max", { required: true, min: 1, max: 10000, label: "Maximum guests" }),
    amenities,
    policies: c.str("policies", { max: 5000 }),
    contact_name: c.str("contact_name", { max: 100 }),
    contact_phone: c.str("contact_phone", { max: 40 }),
    contact_email: c.str("contact_email", { max: 200 }),
    open_time: c.time("open_time", { required: true, label: "Opening time" }),
    close_time: c.time("close_time", { required: true, label: "Closing time" }),
    allow_full_day: c.bool("allow_full_day"),
    full_day_price_paise: money(c, "full_day_price", "Full-day price", c.bool("allow_full_day")),
    cleaning_fee_paise: money(c, "cleaning_fee", "Cleaning fee", false),
    setup_buffer_min: c.int("setup_buffer_min", { required: true, min: 0, max: 720, label: "Setup buffer" }),
    cleanup_buffer_min: c.int("cleanup_buffer_min", { required: true, min: 0, max: 720, label: "Clean-up buffer" }),
    min_notice_hours: c.int("min_notice_hours", { required: true, min: 0, max: 2160, label: "Minimum notice" }),
    max_advance_days: c.int("max_advance_days", { required: true, min: 1, max: 1095, label: "Booking window" }),
    is_active: c.bool("is_active"),
  };
  if (input.capacity_max < input.capacity_min) c.fail("capacity_max", "Maximum guests must be at least the minimum.");
  if (input.open_time && input.close_time && input.close_time <= input.open_time) c.fail("close_time", "Closing time must be after opening time (same day).");
  c.done();
  return input;
}

export function parseSlots(body: Record<string, unknown>): SlotInput[] {
  if (!Array.isArray(body.slots)) throw new ValidationError({ slots: "Slots are required." });
  if (body.slots.length > 20) throw new ValidationError({ slots: "At most 20 slots." });
  const errs: Record<string, string> = {};
  const out = body.slots.map((raw: unknown, i: number) => {
    const c = new Checker(raw as Record<string, unknown>);
    const s: SlotInput = {
      id: Number((raw as any)?.id) > 0 ? Number((raw as any).id) : undefined,
      label: c.str("label", { required: true, max: 60, label: "Slot name" }),
      start_time: c.time("start_time", { required: true, label: "Start" }),
      end_time: c.time("end_time", { required: true, label: "End" }),
      price_paise: money(c, "price", "Price"),
      is_active: c.bool("is_active"),
    };
    for (const [k, v] of Object.entries(c.errors)) errs[`slots.${i}.${k}`] = `Slot ${i + 1}: ${v}`;
    return s;
  });
  if (Object.keys(errs).length) throw new ValidationError(errs);
  return out;
}
