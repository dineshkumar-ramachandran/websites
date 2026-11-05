# Bengaluru Celebrations — party hall booking website

A complete booking site and admin dashboard for party halls across Bengaluru.

- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · PostgreSQL (`pg`), no ORM.
- **Brand:** “Bengaluru Celebrations” is an **editable placeholder** (Admin → Settings & pages).
- **Demo content:** the 4 halls, 4 locations, addresses, prices and photos in the seed are **sample data**, labelled “Demo listing” / “Demo photo” on the site. Replace them before going live. No reviews or testimonials are included.

## What’s live and what still needs configuration

| Area | Status |
|---|---|
| Booking engine, availability, holds, double-booking protection | ✅ Works as soon as the app runs against PostgreSQL |
| Admin dashboard (halls, locations, slots, photos, blocks, bookings, CSV, audit) | ✅ Works |
| **Payments** | ⚠️ **Demo checkout** until Razorpay keys are set. Demo bookings are marked “Demo — no money collected”. See [Going live with Razorpay](#going-live-with-razorpay). |
| Email/SMS confirmations | ❌ Not built in. Customers get an on-screen reference and can use “Find my booking”. |
| Business details, policies, FAQ | ⚠️ Placeholder text — edit in Admin → Settings & pages. The cancellation policy and privacy notice need the owner’s (and ideally a legal adviser’s) review. |
| GST rate | ⚠️ Default 18 %, configurable — confirm with your accountant. |

**Booking protection is only live once the app is deployed with its PostgreSQL database.** All rules are enforced by the server and the database, never by the browser.

## How double booking is prevented

Each hall has its own availability; Hall A being booked never affects Hall B.

1. **Blocked range.** Every booking stores `block_start`/`block_end` = event time **minus the hall’s setup buffer** and **plus its clean-up buffer** (Asia/Kolkata). A full-day booking spans the hall’s opening to closing hours, so it overlaps every slot that day.
2. **Database exclusion constraint.** `bookings_no_overlap` (PostgreSQL `EXCLUDE USING gist`) makes it impossible for two *held* or *confirmed* bookings of the same hall to have overlapping blocked ranges — for any code path, including manual SQL.
3. **Admin blocks** (maintenance/private events) are checked against bookings by triggers in both directions.
4. **Row lock per hall.** Creating, confirming or rescheduling a booking runs in a transaction that locks the hall row first, expires stale holds, re-checks availability, then writes. Simultaneous requests for the same hall queue up; the loser gets a clear “just taken” message with alternative slots and halls. Different halls never wait on each other.
5. **Holds.** Submitting the booking form creates a `held` booking that expires after the configured time (default 10 min). Active holds block; expired holds, cancelled bookings and failed checkouts don’t. Expired holds are released automatically (no cron required; `npm run holds:sweep` just tidies statuses).
6. **Confirmed bookings never expire.** They stay blocked until an administrator cancels or reschedules them. The calendar reaching the date changes nothing (a past confirmed booking is just shown as “Completed”).
7. **Payments are idempotent.** A captured payment id is applied once; webhook events are de-duplicated by event id in the same transaction. A payment that arrives after its hold expired is re-checked: if the time is still free the booking is confirmed and flagged for review; if someone else has it, the other booking is **never** touched — the late payment is flagged “Needs attention” for a refund or move.

## Local setup

Requirements: Node.js 20.9+ (22 recommended) and PostgreSQL 13+ (uses the `btree_gist` extension, which the migration creates).

```bash
cd bengaluru-celebrations
npm install
cp .env.example .env        # then edit DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
```

Create a database (example with a local Postgres):

```bash
createdb bengaluru_celebrations
```

Apply migrations and load demo data (also creates the first admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`):

```bash
npm run db:setup
```

```bash
npm run dev                 # http://localhost:3000  — admin at /admin
```

### Administrator accounts

- First admin: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (min 10 chars, letters + numbers) before `npm run db:seed`.
- Add or reset an admin any time (prompts for a password):

```bash
npm run admin:create -- owner@example.com
```

Passwords are hashed with scrypt; sessions are random tokens stored hashed in the DB, sent as `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookies, and expire after 12 hours. Admin APIs also reject cross-origin writes. Login is rate-limited.

## Tests

```bash
createdb bengaluru_celebrations_test     # once; or set TEST_DATABASE_URL
npm test
```

29 tests, run against a real PostgreSQL test database (it is wiped on every run): overlapping reservations, other halls/dates unaffected, full-day vs slot (both directions), buffers, the raw DB constraint, **20 simultaneous attempts → exactly one hold**, hold expiry/release, confirmed bookings not expiring, idempotent payments/webhooks, late payment conflicts, demo payments, cancellation, rescheduling with re-check (incl. moving halls), deactivated halls, admin blocks, private lookup, and signature/CSV helpers.

Browser end-to-end check (needs a running server and Playwright installed):

```bash
BASE_URL=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node tests/e2e.mjs
```

## Deployment

Any Node host + managed PostgreSQL works (e.g. Render, Railway, Fly.io, a VPS, or Vercel + Neon/Supabase).

1. Create a PostgreSQL database. For managed providers that require TLS set `DATABASE_SSL=true`. If a connection pooler rejects startup options, set `DATABASE_SET_TIMEZONE=false` (correctness doesn’t depend on it).
2. Set environment variables from `.env.example` (`DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, Razorpay keys when ready). Never commit `.env`.
3. Build and migrate:
   ```bash
   npm ci
   npm run build
   npm run db:migrate
   ```
4. First deploy only: `npm run db:seed` (demo data + first admin) or just `npm run admin:create -- you@example.com` for an empty site, then add locations and halls in the dashboard.
5. Start: `npm start` (honours `PORT`). Serve over HTTPS.
6. Optional cron every few minutes: `npm run holds:sweep`.

Notes: photos are stored in PostgreSQL, so they survive redeploys on hosts with ephemeral disks. The login/lookup rate limiter is in-memory per process; use a shared store if you run several instances.

## Going live with Razorpay

1. Create a Razorpay account and complete KYC. Start in **Test Mode**.
2. Dashboard → *Account & Settings → API Keys*: generate keys and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the server.
3. Dashboard → *Webhooks*: add `https://<your-domain>/api/webhooks/razorpay`, choose a secret, and select events **payment.captured**, **order.paid** and **payment.failed**. Set the same secret as `RAZORPAY_WEBHOOK_SECRET`.
4. Enable automatic capture for payments (Dashboard → *Payment Capture*), or bookings will wait for capture.
5. Redeploy. The demo checkout disappears automatically when keys are present (force with `DEMO_PAYMENTS=false`).
6. Make a test-mode booking, confirm it shows **Paid** in Admin and that re-sending the webhook from the Razorpay dashboard doesn’t change anything. Then switch to live keys.

How it works: the server creates the order with the amount from the database; after Checkout, the browser’s response is **not trusted** — the server verifies the signature and fetches the payment from Razorpay’s API before confirming. The webhook path confirms independently, so a closed browser tab still results in a confirmed booking.

## Using the admin dashboard

- **Halls:** add any number of halls, reorder (▲▼), activate/deactivate, edit capacity, amenities, address, contact, hours, full-day price, cleaning fee, setup/clean-up buffers, notice period and booking window. Time slots and photos are on each hall’s page. Deactivated halls disappear from the public site and can’t take new bookings; their existing bookings and history are kept. Nothing is deleted.
- **Locations:** managed separately; each hall is assigned to one. Deactivating a location hides its halls.
- **Blocked dates:** block a hall for maintenance or private events.
- **Bookings:** table with filters (hall, location, date, booking status, payment status, search), CSV export of the filtered list, calendar view, and a detail page to confirm, cancel (with reason), reschedule (re-checked), update payment status / record offline payments, edit customer details and resolve “Needs attention” items. Every change is in the audit history.
- **New booking:** for phone/walk-in customers; the same availability rules apply (admins may skip the online notice period).
- **Settings & pages:** brand name, hold minutes, tax rate, contact details, cancellation policy, privacy notice and FAQ.

## Project layout

```
db/migrations/      SQL schema (exclusion constraint, triggers)
lib/                booking engine, availability, auth, Razorpay, queries
app/(site)/         public pages      app/admin/   dashboard
app/api/            route handlers (public, checkout, webhooks, admin)
components/         UI (calendar/slot picker, booking form, checkout, admin)
scripts/            migrate, seed, create-admin, sweep-holds
tests/              node:test suites + e2e.mjs
```

## Next steps worth considering

- Email/SMS/WhatsApp confirmations (e.g. via an email API or MSG91) — hook into `applyCapturedPayment` and `createBooking`.
- Partial advance payments, refunds via the Razorpay Refunds API, and invoice PDFs.
- Multiple admin roles (e.g. read-only staff).
