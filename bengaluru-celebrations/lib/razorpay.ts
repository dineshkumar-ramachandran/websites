// Razorpay integration (server side only). Credentials come from environment variables.
// Live payments need: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET.
import crypto from "node:crypto";
import { AppError } from "./errors";

export function razorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Demo checkout is only offered when live credentials are absent (or explicitly enabled for staging). */
export function demoPaymentsEnabled(): boolean {
  if (process.env.DEMO_PAYMENTS === "false") return false;
  if (process.env.DEMO_PAYMENTS === "true") return true;
  return !razorpayConfigured();
}

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

const API = "https://api.razorpay.com/v1";

export async function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>): Promise<{ id: string; amount: number; currency: string }> {
  if (!razorpayConfigured()) throw new AppError(503, "payments_unconfigured", "Online payments are not configured.");
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes }),
  });
  if (!res.ok) {
    console.error("[razorpay] order create failed", res.status);
    throw new AppError(502, "payment_provider_error", "Could not start the payment. Please try again.");
  }
  return res.json();
}

export async function fetchPayment(paymentId: string): Promise<{ id: string; order_id: string; amount: number; currency: string; status: string }> {
  const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new AppError(502, "payment_provider_error", "Could not verify the payment with Razorpay.");
  return res.json();
}

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret = process.env.RAZORPAY_KEY_SECRET ?? ""): boolean {
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook secret) in X-Razorpay-Signature. */
export function verifyWebhookSignature(rawBody: string, signature: string, secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ""): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
