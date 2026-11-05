// Browser end-to-end check against a running server (demo payments mode).
//   BASE_URL=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node tests/e2e.mjs
// Uses Playwright (not a project dependency — install it or run where it is available).
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR || "";
const browser = await chromium.launch();
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

function dateInDays(n) {
  const d = new Date(Date.now() + 5.5 * 3600e3);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const D = dateInDays(Number(process.env.E2E_DAYS || 20));

async function fillDetails(page, who) {
  await page.selectOption("#f-eventType", "birthday");
  await page.fill("#f-guestCount", "40");
  await page.fill("#f-customerName", who.name);
  await page.fill("#f-customerPhone", who.phone);
  await page.fill("#f-customerEmail", who.email);
  await page.check("#f-agree");
}

// 1. Customer books Mallige Hall evening slot on D (demo checkout)
const ctx1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p1 = await ctx1.newPage();
await p1.goto(`${BASE}/halls/mallige-hall?date=${D}`);
await p1.click(`[data-date="${D}"]`);
await p1.getByLabel(/Evening/).check();
await p1.getByRole("link", { name: "Continue to booking" }).click();
await p1.waitForURL(/\/book\?/);
await p1.waitForSelector('input[name="slot-option"]:checked');
// Validation state
await p1.getByRole("button", { name: /Hold this slot/ }).click();
await p1.waitForSelector("text=Please fix");
await shot(p1, "e2e-validation");
await fillDetails(p1, { name: "Asha Rao", phone: "98450 11111", email: "asha@example.com" });
await p1.getByRole("button", { name: /Hold this slot/ }).click();
await p1.waitForURL(/\/book\/review\//);
await p1.waitForSelector("text=Slot held for you");
await shot(p1, "e2e-review");

// 2. A second customer, already on the booking form for the same slot, gets the "just taken" state
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto(`${BASE}/book?hall=mallige-hall&date=${D}`);
await p2.waitForSelector('input[name="slot-option"]');
const eveningDisabled = await p2.locator('input[name="slot-option"]').nth(1).isDisabled();
assert.ok(eveningDisabled, "held slot shows as unavailable to others");
await shot(p2, "e2e-slot-unavailable");
// Simulate the race: a page loaded before the hold (radio enabled) — force-submit via API
const res = await p2.evaluate(async ({ D }) => {
  const halls = await (await fetch(`/api/halls/available?date=${D}`)).json();
  const r = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hallId: 1, date: D, option: "slot:2", eventType: "birthday", guestCount: 20, customerName: "Ravi", customerPhone: "9845022222", customerEmail: "ravi@example.com", agree: true }),
  });
  return { status: r.status, body: await r.json(), alternatives: halls.halls.length };
}, { D });
assert.equal(res.status, 409, "server rejects the overlapping hold");
assert.ok(res.alternatives >= 3, "other halls are offered");

// 3. Customer 1 completes demo checkout → confirmed with reference
await p1.check("text=I understand this is a demo");
await p1.getByRole("button", { name: "Confirm demo booking" }).click();
await p1.waitForSelector("text=Your booking is confirmed");
const ref = (await p1.locator("strong.font-mono").first().textContent()).trim();
assert.match(ref, /^BC-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
await shot(p1, "e2e-confirmed");

// 4. Lookup: wrong contact fails, right contact works
await p2.goto(`${BASE}/my-booking`);
await p2.fill("#lk-ref", ref);
await p2.fill("#lk-contact", "someone@else.com");
await p2.getByRole("button", { name: "Find booking" }).click();
await p2.waitForSelector("text=couldn’t find a booking");
await p2.fill("#lk-contact", "98450 11111");
await p2.getByRole("button", { name: "Find booking" }).click();
await p2.waitForSelector(`text=Booking ${ref}`);
await shot(p2, "e2e-lookup");

// 5. Admin
const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const a = await ctx3.newPage();
const r401 = await a.request.get(`${BASE}/api/admin/bookings/export`);
assert.equal(r401.status(), 401, "admin API is protected");
await a.goto(`${BASE}/admin`);
await a.waitForURL(/\/admin\/login/);
await a.fill("#email", process.env.ADMIN_EMAIL);
await a.fill("#pw", process.env.ADMIN_PASSWORD);
await a.getByRole("button", { name: "Sign in" }).click();
await a.waitForURL(`${BASE}/admin`);
await shot(a, "e2e-admin-dashboard");
await a.goto(`${BASE}/admin/bookings?q=${ref}`);
await a.getByRole("link", { name: ref }).click();
await a.waitForSelector("text=Audit history");
await shot(a, "e2e-admin-booking");
const csv = await a.request.get(`${BASE}/api/admin/bookings/export`);
assert.equal(csv.status(), 200);
assert.ok((await csv.text()).includes(ref), "CSV contains the booking");
await a.goto(`${BASE}/admin/bookings/calendar?month=${D.slice(0, 7)}`);
await shot(a, "e2e-admin-calendar");
for (const path of ["/admin/halls", "/admin/halls/1", "/admin/locations", "/admin/blocks", "/admin/settings", "/admin/audit", "/admin/bookings/new"]) {
  const r = await a.goto(`${BASE}${path}`);
  assert.equal(r.status(), 200, path);
}
await a.goto(`${BASE}/admin/halls/1`);
await shot(a, "e2e-admin-hall");

await browser.close();
console.log(`e2e OK — booking ${ref} on ${D}`);
