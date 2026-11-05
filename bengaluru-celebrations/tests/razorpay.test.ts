import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyCheckoutSignature, verifyWebhookSignature } from "../lib/razorpay";
import { csvCell } from "../lib/admin-bookings";

test("checkout signature: HMAC(order|payment) with key secret", () => {
  const sig = crypto.createHmac("sha256", "sek").update("order_1|pay_1").digest("hex");
  assert.equal(verifyCheckoutSignature("order_1", "pay_1", sig, "sek"), true);
  assert.equal(verifyCheckoutSignature("order_1", "pay_2", sig, "sek"), false);
  assert.equal(verifyCheckoutSignature("order_1", "pay_1", sig, ""), false, "no secret → never valid");
});

test("webhook signature over the raw body", () => {
  const body = JSON.stringify({ event: "payment.captured" });
  const sig = crypto.createHmac("sha256", "whsec").update(body).digest("hex");
  assert.equal(verifyWebhookSignature(body, sig, "whsec"), true);
  assert.equal(verifyWebhookSignature(body + " ", sig, "whsec"), false);
  assert.equal(verifyWebhookSignature(body, "", "whsec"), false);
});

test("CSV cells are quoted and formula-safe", () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell(null), "");
});
