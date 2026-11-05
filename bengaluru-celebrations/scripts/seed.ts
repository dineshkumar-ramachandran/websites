// Demo seed data. Every hall, address, price and photo here is DEMO content.
// Run: npm run db:seed        (skips if halls already exist)
//      npm run db:seed -- --reset   (DELETES all data first — development only)
import { getPool, closePool } from "../lib/db";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { demoHallSvg } from "../lib/demo-art";
import { hashPassword, validatePasswordStrength } from "../lib/password";
import { loadEnv } from "./env";

const L = [
  { name: "Indiranagar", slug: "indiranagar", area: "East Bengaluru — near 100 Feet Road (demo location)" },
  { name: "Koramangala", slug: "koramangala", area: "South-East Bengaluru (demo location)" },
  { name: "Whitefield", slug: "whitefield", area: "East Bengaluru, IT corridor (demo location)" },
  { name: "Jayanagar", slug: "jayanagar", area: "South Bengaluru (demo location)" },
];

const rupees = (n: number) => n * 100;

const H = [
  {
    loc: "indiranagar", name: "Mallige Hall", slug: "mallige-hall",
    tagline: "A warm, mid-sized hall for birthdays, engagements and family functions",
    description: "DEMO LISTING. Mallige Hall is a sample air-conditioned banquet hall with a raised stage, dining area and a green room. Use this text as a template and replace it with the real hall description.",
    address: "[Demo address] 1st Floor, Sample Building, 100 Feet Road, Indiranagar, Bengaluru 560038",
    cap: [40, 150], amenities: ["Air conditioning", "Stage", "Green room", "In-house catering", "Power backup", "Parking", "Wheelchair access", "Sound system"],
    open: "09:00", close: "23:00", fullDay: rupees(100000), cleaning: rupees(3000), setup: 45, cleanup: 45,
    slots: [
      { label: "Lunch", start: "11:00", end: "15:30", price: rupees(45000) },
      { label: "Evening", start: "17:00", end: "22:00", price: rupees(65000) },
    ],
  },
  {
    loc: "koramangala", name: "Sampige Banquet", slug: "sampige-banquet",
    tagline: "Spacious banquet for receptions and large gatherings",
    description: "DEMO LISTING. Sampige Banquet is a sample large-format hall with a pillar-free floor, bridal room and separate dining hall. Replace with the real description, photos and pricing.",
    address: "[Demo address] Sample Plot No. 00, 80 Feet Road, Koramangala, Bengaluru 560034",
    cap: [100, 400], amenities: ["Air conditioning", "Stage", "Bridal room", "Separate dining hall", "In-house catering", "Outside catering allowed", "Power backup", "Valet parking", "Lift", "Wheelchair access", "Sound system", "Projector"],
    open: "08:00", close: "23:30", fullDay: rupees(160000), cleaning: rupees(6000), setup: 60, cleanup: 60,
    slots: [
      { label: "Morning", start: "08:30", end: "13:00", price: rupees(75000) },
      { label: "Evening", start: "17:30", end: "23:00", price: rupees(110000) },
    ],
  },
  {
    loc: "whitefield", name: "Kaveri Terrace", slug: "kaveri-terrace",
    tagline: "Covered rooftop venue for intimate evening parties and team events",
    description: "DEMO LISTING. Kaveri Terrace is a sample covered rooftop space with fairy lights and a small indoor lounge — suited to corporate get-togethers, cocktail evenings and birthdays.",
    address: "[Demo address] Terrace Level, Sample Tech Park Road, Whitefield, Bengaluru 560066",
    cap: [20, 90], amenities: ["Covered rooftop", "Indoor lounge", "Projector", "Wi-Fi", "Sound system", "Outside catering allowed", "Power backup", "Lift", "Parking"],
    open: "10:00", close: "23:00", fullDay: rupees(70000), cleaning: rupees(2500), setup: 60, cleanup: 60,
    slots: [
      { label: "Afternoon", start: "12:00", end: "16:00", price: rupees(30000) },
      { label: "Evening", start: "18:00", end: "22:00", price: rupees(48000) },
    ],
  },
  {
    loc: "jayanagar", name: "Tulasi Mini Hall", slug: "tulasi-mini-hall",
    tagline: "Cosy hall for baby showers, naming ceremonies and small birthdays",
    description: "DEMO LISTING. Tulasi Mini Hall is a sample compact hall with a decorated backdrop wall, kitchenette and ground-floor access — ideal for smaller family functions.",
    address: "[Demo address] Ground Floor, Sample Complex, 9th Block, Jayanagar, Bengaluru 560069",
    cap: [10, 60], amenities: ["Air conditioning", "Backdrop wall", "Kitchenette", "Outside catering allowed", "Power backup", "Wheelchair access", "Parking"],
    open: "09:00", close: "22:00", fullDay: rupees(32000), cleaning: rupees(1500), setup: 30, cleanup: 30,
    slots: [
      { label: "Morning", start: "09:30", end: "12:30", price: rupees(12000) },
      { label: "Afternoon", start: "13:30", end: "16:30", price: rupees(12000) },
      { label: "Evening", start: "17:30", end: "21:30", price: rupees(16000) },
    ],
  },
];

const POLICY = [
  "DEMO POLICY — replace with the venue's real rules.",
  "• Setup and clean-up time before and after your slot is included and reserved automatically.",
  "• Loud music must end by 10:30 PM as per local regulations (confirm current rules).",
  "• Decorations must not damage walls; no open flames except approved lamps.",
  "• Outside catering: see amenities list for this hall.",
  "• Cancellation: see the site-wide Cancellation policy page.",
].join("\n");

export async function seed({ reset = false, log = true } = {}) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (reset) {
      await client.query(
        "TRUNCATE audit_log, webhook_events, payments, hall_blocks, bookings, hall_images, hall_slots, halls, locations, admin_sessions, settings RESTART IDENTITY CASCADE"
      );
    }
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      await client.query("INSERT INTO settings(key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING", [k, JSON.stringify(v)]);
    }
    const existing = await client.query("SELECT count(*)::int AS n FROM halls");
    if (existing.rows[0].n > 0) {
      if (log) console.log("halls already exist — skipping demo halls (use --reset to wipe and reseed in development)");
    } else {
      const locIds: Record<string, number> = {};
      for (let i = 0; i < L.length; i++) {
        const r = await client.query(
          "INSERT INTO locations(name, slug, area_description, sort_order) VALUES ($1,$2,$3,$4) RETURNING id",
          [L[i].name, L[i].slug, L[i].area, i + 1]
        );
        locIds[L[i].slug] = r.rows[0].id;
      }
      for (let i = 0; i < H.length; i++) {
        const h = H[i];
        const r = await client.query(
          `INSERT INTO halls(location_id, name, slug, tagline, description, address, capacity_min, capacity_max, amenities, policies,
             contact_name, contact_phone, contact_email, open_time, close_time, allow_full_day, full_day_price_paise, cleaning_fee_paise,
             setup_buffer_min, cleanup_buffer_min, min_notice_hours, max_advance_days, sort_order, is_demo)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,$16,$17,$18,$19,24,365,$20,true) RETURNING id`,
          [
            locIds[h.loc], h.name, h.slug, h.tagline, h.description, h.address, h.cap[0], h.cap[1], h.amenities, POLICY,
            "[Venue manager name]", "[Add phone]", "[Add email]", h.open, h.close, h.fullDay, h.cleaning, h.setup, h.cleanup, i + 1,
          ]
        );
        const hallId = r.rows[0].id;
        for (let s = 0; s < h.slots.length; s++) {
          const sl = h.slots[s];
          await client.query(
            "INSERT INTO hall_slots(hall_id, label, start_time, end_time, price_paise, sort_order) VALUES ($1,$2,$3,$4,$5,$6)",
            [hallId, sl.label, sl.start, sl.end, sl.price, s + 1]
          );
        }
        const allScenes = ["stage", "dining", "lights"] as const;
        const scenes = [0, 1, 2].map((k) => allScenes[(k + i) % 3]); // vary the cover image per hall
        for (let s = 0; s < scenes.length; s++) {
          const svg = demoHallSvg(h.name, scenes[s], i + s);
          await client.query(
            "INSERT INTO hall_images(hall_id, content_type, data, alt_text, is_demo, sort_order) VALUES ($1,'image/svg+xml',$2,$3,true,$4)",
            [hallId, Buffer.from(svg), `Demo placeholder illustration of ${h.name} (${scenes[s]})`, s + 1]
          );
        }
      }
      if (log) console.log(`seeded ${L.length} demo locations and ${H.length} demo halls`);
    }

    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (email && password) {
      const weak = validatePasswordStrength(password);
      if (weak) throw new Error(`ADMIN_PASSWORD: ${weak}`);
      const r = await client.query("SELECT 1 FROM admin_users WHERE email=$1", [email]);
      if (!r.rowCount) {
        await client.query("INSERT INTO admin_users(email, name, password_hash) VALUES ($1,$2,$3)", [email, "Administrator", hashPassword(password)]);
        if (log) console.log(`created admin user ${email}`);
      }
    } else if (log) {
      console.log("No ADMIN_EMAIL/ADMIN_PASSWORD set — create an admin with: npm run admin:create -- you@example.com");
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  loadEnv();
  const reset = process.argv.includes("--reset");
  if (reset && process.env.NODE_ENV === "production") {
    console.error("--reset is disabled when NODE_ENV=production");
    process.exit(1);
  }
  seed({ reset })
    .then(() => closePool())
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
