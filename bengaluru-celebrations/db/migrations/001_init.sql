-- Bengaluru Celebrations: initial schema
-- All instants are stored as timestamptz. Business dates/times are interpreted in Asia/Kolkata.
-- Money is stored as integer paise (1 INR = 100 paise) to avoid floating point errors.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- Settings (brand name, hold expiry, tax, editable page content)
-- ---------------------------------------------------------------------------
CREATE TABLE settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Locations (managed separately; halls are assigned to them)
-- ---------------------------------------------------------------------------
CREATE TABLE locations (
  id          serial PRIMARY KEY,
  name        text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  area_description text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Halls (no limit on count; deactivate instead of delete)
-- ---------------------------------------------------------------------------
CREATE TABLE halls (
  id                  serial PRIMARY KEY,
  location_id         integer NOT NULL REFERENCES locations(id),
  name                text NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  slug                text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  tagline             text NOT NULL DEFAULT '',
  description         text NOT NULL DEFAULT '',
  address             text NOT NULL DEFAULT '',
  map_url             text NOT NULL DEFAULT '',
  capacity_min        integer NOT NULL DEFAULT 1 CHECK (capacity_min >= 1),
  capacity_max        integer NOT NULL CHECK (capacity_max >= 1),
  amenities           text[] NOT NULL DEFAULT '{}',
  policies            text NOT NULL DEFAULT '',
  contact_name        text NOT NULL DEFAULT '',
  contact_phone       text NOT NULL DEFAULT '',
  contact_email       text NOT NULL DEFAULT '',
  -- operating hours for the hall (same calendar day; overnight events not supported)
  open_time           time NOT NULL DEFAULT '08:00',
  close_time          time NOT NULL DEFAULT '23:00',
  allow_full_day      boolean NOT NULL DEFAULT true,
  full_day_price_paise integer NOT NULL DEFAULT 0 CHECK (full_day_price_paise >= 0),
  cleaning_fee_paise  integer NOT NULL DEFAULT 0 CHECK (cleaning_fee_paise >= 0),
  setup_buffer_min    integer NOT NULL DEFAULT 60 CHECK (setup_buffer_min BETWEEN 0 AND 720),
  cleanup_buffer_min  integer NOT NULL DEFAULT 60 CHECK (cleanup_buffer_min BETWEEN 0 AND 720),
  min_notice_hours    integer NOT NULL DEFAULT 24 CHECK (min_notice_hours BETWEEN 0 AND 2160),
  max_advance_days    integer NOT NULL DEFAULT 365 CHECK (max_advance_days BETWEEN 1 AND 1095),
  sort_order          integer NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  is_demo             boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (capacity_max >= capacity_min),
  CHECK (close_time > open_time)
);
CREATE INDEX halls_location_idx ON halls(location_id);

-- Configurable time slots per hall
CREATE TABLE hall_slots (
  id          serial PRIMARY KEY,
  hall_id     integer NOT NULL REFERENCES halls(id),
  label       text NOT NULL CHECK (length(label) BETWEEN 1 AND 60),
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  price_paise integer NOT NULL CHECK (price_paise >= 0),
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX hall_slots_hall_idx ON hall_slots(hall_id);

-- Hall images stored in the database so uploads survive redeploys on any host.
CREATE TABLE hall_images (
  id            serial PRIMARY KEY,
  hall_id       integer NOT NULL REFERENCES halls(id),
  content_type  text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp','image/svg+xml')),
  data          bytea NOT NULL,
  alt_text      text NOT NULL DEFAULT '',
  is_demo       boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hall_images_hall_idx ON hall_images(hall_id, sort_order);

-- ---------------------------------------------------------------------------
-- Admin users and sessions
-- ---------------------------------------------------------------------------
CREATE TABLE admin_users (
  id            serial PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  name          text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE admin_sessions (
  token_hash  text PRIMARY KEY,
  admin_id    integer NOT NULL REFERENCES admin_users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);
CREATE INDEX admin_sessions_admin_idx ON admin_sessions(admin_id);

-- ---------------------------------------------------------------------------
-- Bookings
--   status:          held | confirmed | cancelled | expired
--   payment_status:  unpaid | pending | paid | demo | refunded | failed
--   "held" and "confirmed" block availability. "cancelled" and "expired" do not.
--   block_start/block_end include the hall's setup and cleanup buffers.
-- ---------------------------------------------------------------------------
CREATE TABLE bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference           text NOT NULL UNIQUE,
  hall_id             integer NOT NULL REFERENCES halls(id),
  event_date          date NOT NULL,
  booking_kind        text NOT NULL CHECK (booking_kind IN ('slot','full_day')),
  slot_id             integer REFERENCES hall_slots(id),
  slot_label          text NOT NULL,
  start_at            timestamptz NOT NULL,
  end_at              timestamptz NOT NULL,
  block_start         timestamptz NOT NULL,
  block_end           timestamptz NOT NULL,
  status              text NOT NULL CHECK (status IN ('held','confirmed','cancelled','expired')),
  payment_status      text NOT NULL DEFAULT 'unpaid'
                        CHECK (payment_status IN ('unpaid','pending','paid','demo','refunded','failed')),
  hold_expires_at     timestamptz,
  source              text NOT NULL CHECK (source IN ('online','admin')),
  event_type          text NOT NULL,
  event_type_other    text NOT NULL DEFAULT '',
  guest_count         integer NOT NULL CHECK (guest_count >= 1),
  customer_name       text NOT NULL,
  customer_phone      text NOT NULL,
  customer_email      text NOT NULL,
  notes               text NOT NULL DEFAULT '',
  -- price snapshot (paise) taken when the booking is created
  rental_paise        integer NOT NULL CHECK (rental_paise >= 0),
  cleaning_fee_paise  integer NOT NULL DEFAULT 0 CHECK (cleaning_fee_paise >= 0),
  tax_percent         numeric(5,2) NOT NULL DEFAULT 0,
  tax_paise           integer NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  total_paise         integer NOT NULL CHECK (total_paise >= 0),
  amount_paid_paise   integer NOT NULL DEFAULT 0 CHECK (amount_paid_paise >= 0),
  access_token_hash   text NOT NULL,
  needs_attention     boolean NOT NULL DEFAULT false,
  attention_reason    text NOT NULL DEFAULT '',
  confirmed_at        timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text NOT NULL DEFAULT '',
  created_by_admin_id integer REFERENCES admin_users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  CHECK (block_start <= start_at AND block_end >= end_at),
  CHECK (status <> 'held' OR hold_expires_at IS NOT NULL),
  CHECK ((booking_kind = 'slot') = (slot_id IS NOT NULL)),
  -- The core double-booking guard. Two active bookings for the same hall can never
  -- have overlapping blocked ranges. This is enforced by PostgreSQL itself, so it
  -- holds even under concurrent transactions and for any code path.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    hall_id WITH =,
    tstzrange(block_start, block_end, '[)') WITH &&
  ) WHERE (status IN ('held','confirmed'))
);
CREATE INDEX bookings_hall_date_idx ON bookings(hall_id, event_date);
CREATE INDEX bookings_status_idx ON bookings(status);
CREATE INDEX bookings_hold_expiry_idx ON bookings(hold_expires_at) WHERE status = 'held';
CREATE INDEX bookings_email_idx ON bookings(lower(customer_email));

-- ---------------------------------------------------------------------------
-- Admin blocks (maintenance, private events). These also block availability.
-- ---------------------------------------------------------------------------
CREATE TABLE hall_blocks (
  id          serial PRIMARY KEY,
  hall_id     integer NOT NULL REFERENCES halls(id),
  start_at    timestamptz NOT NULL,
  end_at      timestamptz NOT NULL,
  reason      text NOT NULL DEFAULT '',
  is_active   boolean NOT NULL DEFAULT true,
  created_by_admin_id integer REFERENCES admin_users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);
CREATE INDEX hall_blocks_hall_idx ON hall_blocks(hall_id, start_at);

-- Cross-table guard: a booking can't overlap an active admin block and vice versa.
-- Each trigger first locks the hall row, so concurrent inserts into the two tables
-- for the same hall are serialised and cannot both pass the check.
CREATE FUNCTION bookings_check_blocks() RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('held','confirmed') THEN
    PERFORM 1 FROM halls WHERE id = NEW.hall_id FOR UPDATE;
    IF EXISTS (
      SELECT 1 FROM hall_blocks b
       WHERE b.hall_id = NEW.hall_id AND b.is_active
         AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(NEW.block_start, NEW.block_end, '[)')
    ) THEN
      RAISE EXCEPTION 'hall % is blocked by an administrator for this time', NEW.hall_id
        USING ERRCODE = '23P01', CONSTRAINT = 'bookings_vs_blocks';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_check_blocks_trg
  BEFORE INSERT OR UPDATE OF status, block_start, block_end, hall_id ON bookings
  FOR EACH ROW EXECUTE FUNCTION bookings_check_blocks();

CREATE FUNCTION blocks_check_bookings() RETURNS trigger AS $$
BEGIN
  IF NEW.is_active THEN
    PERFORM 1 FROM halls WHERE id = NEW.hall_id FOR UPDATE;
    IF EXISTS (
      SELECT 1 FROM bookings k
       WHERE k.hall_id = NEW.hall_id AND k.status IN ('held','confirmed')
         AND (k.status = 'confirmed' OR k.hold_expires_at > now())
         AND tstzrange(k.block_start, k.block_end, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)')
    ) THEN
      RAISE EXCEPTION 'hall % has an active booking in this period', NEW.hall_id
        USING ERRCODE = '23P01', CONSTRAINT = 'blocks_vs_bookings';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER blocks_check_bookings_trg
  BEFORE INSERT OR UPDATE ON hall_blocks
  FOR EACH ROW EXECUTE FUNCTION blocks_check_bookings();

-- ---------------------------------------------------------------------------
-- Payments and webhook idempotency
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id                  serial PRIMARY KEY,
  booking_id          uuid NOT NULL REFERENCES bookings(id),
  provider            text NOT NULL CHECK (provider IN ('razorpay','demo','offline')),
  provider_order_id   text,
  provider_payment_id text,
  amount_paise        integer NOT NULL CHECK (amount_paise >= 0),
  currency            text NOT NULL DEFAULT 'INR',
  status              text NOT NULL CHECK (status IN ('created','captured','failed','refunded')),
  note                text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_order_uniq ON payments(provider, provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE UNIQUE INDEX payments_payment_uniq ON payments(provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX payments_booking_idx ON payments(booking_id);

CREATE TABLE webhook_events (
  provider     text NOT NULL,
  event_id     text NOT NULL,
  event_type   text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  payload      jsonb NOT NULL,
  PRIMARY KEY (provider, event_id)
);

-- ---------------------------------------------------------------------------
-- Audit history
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  booking_id  uuid REFERENCES bookings(id),
  entity      text NOT NULL,
  entity_id   text NOT NULL,
  action      text NOT NULL,
  actor       text NOT NULL,           -- 'customer', 'system', 'webhook', or 'admin:<email>'
  details     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_booking_idx ON audit_log(booking_id, created_at);
CREATE INDEX audit_log_created_idx ON audit_log(created_at DESC);
