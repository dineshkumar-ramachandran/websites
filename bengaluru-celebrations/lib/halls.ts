import { Db, getPool, query, queryOne, withTransaction } from "./db";
import { dayAvailability, DayStatus } from "./availability";
import { loadOccupied, loadSlots, loadHall } from "./booking";
import { audit } from "./audit";
import { AppError, NotFoundError, ValidationError } from "./errors";
import { istInstant } from "./time";

export type Location = { id: number; name: string; slug: string; area_description: string; sort_order: number; is_active: boolean; hall_count?: number };

export type HallCard = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  location_id: number;
  location_name: string;
  location_slug: string;
  capacity_min: number;
  capacity_max: number;
  amenities: string[];
  from_price_paise: number | null;
  full_day_price_paise: number;
  allow_full_day: boolean;
  cover_image_id: number | null;
  is_demo: boolean;
  day_status?: DayStatus;
};

export type HallDetail = HallCard & {
  description: string;
  address: string;
  map_url: string;
  policies: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  open_time: string;
  close_time: string;
  cleaning_fee_paise: number;
  setup_buffer_min: number;
  cleanup_buffer_min: number;
  min_notice_hours: number;
  max_advance_days: number;
  is_active: boolean;
  location_active: boolean;
  images: { id: number; alt_text: string; is_demo: boolean }[];
  slots: { id: number; label: string; start_time: string; end_time: string; price_paise: number; is_active: boolean; sort_order: number }[];
};

const CARD_SELECT = `
  SELECT h.id, h.slug, h.name, h.tagline, h.location_id, l.name AS location_name, l.slug AS location_slug,
         h.capacity_min, h.capacity_max, h.amenities, h.full_day_price_paise, h.allow_full_day, h.is_demo,
         LEAST(
           (SELECT min(price_paise) FROM hall_slots s WHERE s.hall_id = h.id AND s.is_active),
           CASE WHEN h.allow_full_day THEN h.full_day_price_paise END
         ) AS from_price_paise,
         (SELECT i.id FROM hall_images i WHERE i.hall_id = h.id ORDER BY i.sort_order, i.id LIMIT 1) AS cover_image_id
    FROM halls h JOIN locations l ON l.id = h.location_id`;

export async function listActiveLocations(): Promise<Location[]> {
  return query<Location>(
    `SELECT l.*, (SELECT count(*) FROM halls h WHERE h.location_id = l.id AND h.is_active) AS hall_count
       FROM locations l WHERE l.is_active ORDER BY l.sort_order, l.name`
  );
}

export async function listAmenities(): Promise<string[]> {
  const rows = await query<{ a: string }>(
    `SELECT DISTINCT unnest(h.amenities) AS a FROM halls h JOIN locations l ON l.id=h.location_id WHERE h.is_active AND l.is_active ORDER BY 1`
  );
  return rows.map((r) => r.a);
}

export type HallFilters = { location?: string; guests?: number; maxPrice?: number; amenities?: string[]; date?: string };

/** Public listing: only active halls in active locations. */
export async function listPublicHalls(f: HallFilters = {}): Promise<HallCard[]> {
  const where = ["h.is_active", "l.is_active"];
  const params: unknown[] = [];
  if (f.location) {
    params.push(f.location);
    where.push(`l.slug = $${params.length}`);
  }
  if (f.guests && f.guests > 0) {
    params.push(f.guests);
    where.push(`h.capacity_max >= $${params.length}`);
  }
  if (f.amenities && f.amenities.length) {
    params.push(f.amenities);
    where.push(`h.amenities @> $${params.length}::text[]`);
  }
  let rows = await query<HallCard>(`${CARD_SELECT} WHERE ${where.join(" AND ")} ORDER BY h.sort_order, h.name`, params);
  if (f.maxPrice && f.maxPrice > 0) rows = rows.filter((r) => r.from_price_paise !== null && r.from_price_paise <= f.maxPrice! * 100);
  if (f.date) {
    const pool: Db = getPool();
    const from = new Date(istInstant(f.date, "00:00").getTime() - 86_400_000);
    const to = new Date(istInstant(f.date, "23:59").getTime() + 86_400_000);
    for (const r of rows) {
      const hall = await loadHall(pool, r.id);
      if (!hall) continue;
      const slots = await loadSlots(pool, r.id);
      const occ = await loadOccupied(pool, r.id, from, to);
      r.day_status = dayAvailability(hall, slots, f.date, occ).status;
    }
  }
  return rows;
}

export async function getHallDetail(slugOrId: string | number, opts: { includeInactive?: boolean } = {}): Promise<HallDetail | null> {
  const byId = typeof slugOrId === "number";
  const h = await queryOne<HallDetail>(
    `${CARD_SELECT.replace("h.is_demo,", `h.is_demo, h.description, h.address, h.map_url, h.policies, h.contact_name, h.contact_phone,
       h.contact_email, h.open_time::text AS open_time, h.close_time::text AS close_time, h.cleaning_fee_paise, h.setup_buffer_min,
       h.cleanup_buffer_min, h.min_notice_hours, h.max_advance_days, h.is_active, l.is_active AS location_active,`)}
      WHERE ${byId ? "h.id = $1" : "h.slug = $1"}`,
    [slugOrId]
  );
  if (!h) return null;
  if (!opts.includeInactive && (!h.is_active || !h.location_active)) return null;
  h.images = await query(`SELECT id, alt_text, is_demo FROM hall_images WHERE hall_id = $1 ORDER BY sort_order, id`, [h.id]);
  h.slots = await query(
    `SELECT id, label, start_time::text AS start_time, end_time::text AS end_time, price_paise, is_active, sort_order
       FROM hall_slots WHERE hall_id = $1 ORDER BY sort_order, start_time`,
    [h.id]
  );
  return h;
}

// ---------------------------------------------------------------------------
// Admin: locations
// ---------------------------------------------------------------------------
export async function adminListLocations(): Promise<Location[]> {
  return query<Location>(
    `SELECT l.*, (SELECT count(*) FROM halls h WHERE h.location_id = l.id) AS hall_count FROM locations l ORDER BY l.sort_order, l.name`
  );
}

export async function saveLocation(actor: string, data: { name: string; slug: string; area_description: string; is_active: boolean }, id?: number) {
  return withTransaction(async (c) => {
    const dupe = await c.query("SELECT 1 FROM locations WHERE slug=$1 AND ($2::int IS NULL OR id <> $2)", [data.slug, id ?? null]);
    if (dupe.rowCount) throw new ValidationError({ slug: "Another location already uses this URL name." });
    let row;
    if (id) {
      row = (await c.query(`UPDATE locations SET name=$2, slug=$3, area_description=$4, is_active=$5, updated_at=now() WHERE id=$1 RETURNING *`, [id, data.name, data.slug, data.area_description, data.is_active])).rows[0];
      if (!row) throw new NotFoundError("Location not found.");
    } else {
      row = (
        await c.query(
          `INSERT INTO locations(name, slug, area_description, is_active, sort_order) VALUES ($1,$2,$3,$4,(SELECT coalesce(max(sort_order),0)+1 FROM locations)) RETURNING *`,
          [data.name, data.slug, data.area_description, data.is_active]
        )
      ).rows[0];
    }
    await audit(c, { entity: "location", entityId: row.id, action: id ? "updated" : "created", actor, details: data });
    return row;
  });
}

// ---------------------------------------------------------------------------
// Admin: halls
// ---------------------------------------------------------------------------
export async function adminListHalls() {
  return query<HallCard & { is_active: boolean; location_active: boolean; sort_order: number; active_bookings: number }>(
    `${CARD_SELECT.replace("h.is_demo,", "h.is_demo, h.is_active, l.is_active AS location_active, h.sort_order,")
      .replace(
        "FROM halls h",
        ", (SELECT count(*) FROM bookings b WHERE b.hall_id = h.id AND b.status = 'confirmed' AND b.end_at > now()) AS active_bookings FROM halls h"
      )} ORDER BY h.sort_order, h.name`
  );
}

export type HallInput = {
  location_id: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  address: string;
  map_url: string;
  capacity_min: number;
  capacity_max: number;
  amenities: string[];
  policies: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  open_time: string;
  close_time: string;
  allow_full_day: boolean;
  full_day_price_paise: number;
  cleaning_fee_paise: number;
  setup_buffer_min: number;
  cleanup_buffer_min: number;
  min_notice_hours: number;
  max_advance_days: number;
  is_active: boolean;
};

const HALL_FIELDS: (keyof HallInput)[] = [
  "location_id", "name", "slug", "tagline", "description", "address", "map_url", "capacity_min", "capacity_max", "amenities",
  "policies", "contact_name", "contact_phone", "contact_email", "open_time", "close_time", "allow_full_day", "full_day_price_paise",
  "cleaning_fee_paise", "setup_buffer_min", "cleanup_buffer_min", "min_notice_hours", "max_advance_days", "is_active",
];

export async function saveHall(actor: string, data: HallInput, id?: number) {
  return withTransaction(async (c) => {
    const dupe = await c.query("SELECT 1 FROM halls WHERE slug=$1 AND ($2::int IS NULL OR id <> $2)", [data.slug, id ?? null]);
    if (dupe.rowCount) throw new ValidationError({ slug: "Another hall already uses this URL name." });
    const loc = await c.query("SELECT 1 FROM locations WHERE id=$1", [data.location_id]);
    if (!loc.rowCount) throw new ValidationError({ location_id: "Choose a location." });
    const values = HALL_FIELDS.map((k) => data[k]);
    let row;
    if (id) {
      // Changing buffers or hours does not move existing bookings: their blocked ranges were fixed when booked.
      const sets = HALL_FIELDS.map((k, i) => `${k} = $${i + 2}`).join(", ");
      row = (await c.query(`UPDATE halls SET ${sets}, updated_at = now() WHERE id = $1 RETURNING *`, [id, ...values])).rows[0];
      if (!row) throw new NotFoundError("Hall not found.");
    } else {
      const cols = HALL_FIELDS.join(", ");
      const ph = HALL_FIELDS.map((_, i) => `$${i + 1}`).join(", ");
      row = (
        await c.query(`INSERT INTO halls (${cols}, sort_order) VALUES (${ph}, (SELECT coalesce(max(sort_order),0)+1 FROM halls)) RETURNING *`, values)
      ).rows[0];
    }
    await audit(c, { entity: "hall", entityId: row.id, action: id ? "updated" : "created", actor, details: { name: data.name, is_active: data.is_active } });
    return row;
  });
}

export async function setActive(table: "halls" | "locations", id: number, active: boolean, actor: string) {
  return withTransaction(async (c) => {
    const r = await c.query(`UPDATE ${table} SET is_active=$2, updated_at=now() WHERE id=$1 RETURNING id, name`, [id, active]);
    if (!r.rowCount) throw new NotFoundError();
    await audit(c, { entity: table === "halls" ? "hall" : "location", entityId: id, action: active ? "activated" : "deactivated", actor, details: { name: r.rows[0].name } });
  });
}

/** Persist a new display order. ids = full ordered list. */
export async function reorder(table: "halls" | "locations" | "hall_images" | "hall_slots", ids: number[], scope?: { hallId: number }) {
  return withTransaction(async (c) => {
    for (let i = 0; i < ids.length; i++) {
      if (scope) await c.query(`UPDATE ${table} SET sort_order=$2 WHERE id=$1 AND hall_id=$3`, [ids[i], i + 1, scope.hallId]);
      else await c.query(`UPDATE ${table} SET sort_order=$2 WHERE id=$1`, [ids[i], i + 1]);
    }
  });
}

// ---------------------------------------------------------------------------
// Admin: slots
// ---------------------------------------------------------------------------
export type SlotInput = { id?: number; label: string; start_time: string; end_time: string; price_paise: number; is_active: boolean };

/** Replace the editable slot list. Slots are never deleted (bookings reference them); removed ones are deactivated. */
export async function saveSlots(actor: string, hallId: number, slots: SlotInput[]) {
  return withTransaction(async (c) => {
    const hall = (await c.query("SELECT open_time::text AS open_time, close_time::text AS close_time FROM halls WHERE id=$1 FOR UPDATE", [hallId])).rows[0];
    if (!hall) throw new NotFoundError("Hall not found.");
    const errs: Record<string, string> = {};
    slots.forEach((s, i) => {
      if (s.end_time <= s.start_time) errs[`slots.${i}`] = `${s.label}: end time must be after start time.`;
      if (s.start_time < hall.open_time.slice(0, 5) || s.end_time > hall.close_time.slice(0, 5))
        errs[`slots.${i}`] = `${s.label}: must fall within operating hours ${hall.open_time.slice(0, 5)}–${hall.close_time.slice(0, 5)}.`;
    });
    if (Object.keys(errs).length) throw new ValidationError(errs);
    const keep: number[] = [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.id) {
        const r = await c.query(
          `UPDATE hall_slots SET label=$3, start_time=$4, end_time=$5, price_paise=$6, is_active=$7, sort_order=$8 WHERE id=$1 AND hall_id=$2 RETURNING id`,
          [s.id, hallId, s.label, s.start_time, s.end_time, s.price_paise, s.is_active, i + 1]
        );
        if (!r.rowCount) throw new AppError(400, "bad_slot", "Unknown slot.");
        keep.push(s.id);
      } else {
        const r = await c.query(
          `INSERT INTO hall_slots(hall_id, label, start_time, end_time, price_paise, is_active, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [hallId, s.label, s.start_time, s.end_time, s.price_paise, s.is_active, i + 1]
        );
        keep.push(r.rows[0].id);
      }
    }
    await c.query(`UPDATE hall_slots SET is_active=false WHERE hall_id=$1 AND NOT (id = ANY($2::int[]))`, [hallId, keep]);
    await audit(c, { entity: "hall", entityId: hallId, action: "slots_updated", actor, details: { slots: slots.map((s) => `${s.label} ${s.start_time}-${s.end_time}`) } });
  });
}

// ---------------------------------------------------------------------------
// Admin: images
// ---------------------------------------------------------------------------
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function sniffImageType(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null; // SVG uploads are not accepted from admins (only built-in demo art) to avoid script injection.
}

export async function addImage(actor: string, hallId: number, buf: Buffer, altText: string) {
  const type = sniffImageType(buf);
  if (!type) throw new ValidationError({ file: "Upload a JPEG, PNG or WebP image." });
  if (buf.length > MAX_IMAGE_BYTES) throw new ValidationError({ file: "Images must be 5 MB or smaller." });
  return withTransaction(async (c) => {
    const r = await c.query(
      `INSERT INTO hall_images(hall_id, content_type, data, alt_text, sort_order)
       VALUES ($1,$2,$3,$4,(SELECT coalesce(max(sort_order),0)+1 FROM hall_images WHERE hall_id=$1)) RETURNING id`,
      [hallId, type, buf, altText]
    );
    await audit(c, { entity: "hall", entityId: hallId, action: "image_added", actor, details: { image_id: r.rows[0].id } });
    return r.rows[0].id as number;
  });
}

export async function deleteImage(actor: string, hallId: number, imageId: number) {
  return withTransaction(async (c) => {
    const r = await c.query("DELETE FROM hall_images WHERE id=$1 AND hall_id=$2", [imageId, hallId]);
    if (!r.rowCount) throw new NotFoundError("Image not found.");
    await audit(c, { entity: "hall", entityId: hallId, action: "image_deleted", actor, details: { image_id: imageId } });
  });
}

export async function updateImageAlt(hallId: number, imageId: number, alt: string) {
  await query("UPDATE hall_images SET alt_text=$3 WHERE id=$1 AND hall_id=$2", [imageId, hallId, alt]);
}
