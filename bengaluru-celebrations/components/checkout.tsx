"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void };
  }
}

function useCountdown(until: string) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(until).getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, new Date(until).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [until]);
  return left;
}

export function HoldTimer({ until }: { until: string }) {
  const left = useCountdown(until);
  const reloaded = useRef(false);
  useEffect(() => {
    if (left === 0 && !reloaded.current) {
      reloaded.current = true;
      setTimeout(() => window.location.reload(), 1500);
    }
  }, [left]);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const low = left < 120_000;
  return (
    <div className={`rounded-xl border p-4 ${low ? "border-bad bg-bad-bg" : "border-gold-500 bg-warn-bg"}`}>
      <p className="font-semibold">
        Slot held for you:{" "}
        <span className="font-mono text-xl" aria-hidden>
          {m}:{String(s).padStart(2, "0")}
        </span>
        <span className="sr-only">{m} minutes {s} seconds remaining</span>
      </p>
      <p className="text-sm">If time runs out the slot is released and someone else may book it.</p>
      {/* Announce only at key moments to avoid noisy screen readers */}
      <p className="sr-only" aria-live="assertive">{left === 0 ? "Your hold has expired." : m === 2 && s === 0 ? "Two minutes left to complete payment." : ""}</p>
    </div>
  );
}

export function Checkout({
  bookingId,
  token,
  mode,
  razorpayKeyId,
  brandName,
  prefill,
}: {
  bookingId: string;
  token: string;
  mode: "demo" | "razorpay" | "none";
  razorpayKeyId?: string;
  brandName: string;
  prefill: { name: string; email: string; contact: string };
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [demoAck, setDemoAck] = useState(false);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function pollUntilSettled() {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(`/api/bookings/${bookingId}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (data?.status && data.status !== "held") return window.location.reload();
      if (data?.payment_status === "paid") return window.location.reload();
    }
    setMsg({ kind: "info", text: "We’re still waiting for the payment confirmation from Razorpay. You can safely close this page — your booking will update once the payment is confirmed. Use “Find my booking” to check later." });
  }

  async function payDemo() {
    setBusy(true);
    setMsg(null);
    const { res, data } = await post("/api/checkout/demo", { bookingId, token });
    if (res.ok) return window.location.reload();
    setMsg({ kind: "error", text: data?.error?.message ?? "Could not complete the demo booking." });
    setBusy(false);
  }

  async function payRazorpay() {
    setBusy(true);
    setMsg(null);
    try {
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Could not load Razorpay checkout."));
          document.body.appendChild(s);
        });
      }
      const { res, data } = await post("/api/checkout/razorpay/order", { bookingId, token });
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not start payment.");
      const rz = new window.Razorpay!({
        key: razorpayKeyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: "INR",
        name: brandName,
        description: `Booking ${data.reference}`,
        prefill,
        theme: { color: "#4A1838" },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // The browser callback is NOT proof of payment: the server verifies the signature and checks with Razorpay.
          setMsg({ kind: "info", text: "Verifying your payment with Razorpay…" });
          const v = await post("/api/checkout/razorpay/verify", { bookingId, token, ...resp });
          if (v.res.ok && v.data.status === "confirmed") return window.location.reload();
          if (v.res.ok) {
            setMsg({ kind: "info", text: v.data.message ?? "Payment received — waiting for final confirmation…" });
            return pollUntilSettled();
          }
          setMsg({ kind: "error", text: v.data?.error?.message ?? "We could not verify the payment. If money was deducted, it will be confirmed automatically or refunded — please contact us with your reference." });
          setBusy(false);
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rz.on("payment.failed", () => {
        setMsg({ kind: "error", text: "The payment did not go through. You can try again while your hold is active." });
        setBusy(false);
      });
      rz.open();
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div role={msg.kind === "error" ? "alert" : "status"} className={`rounded-lg p-3 ${msg.kind === "error" ? "bg-bad-bg text-bad" : "bg-plum-50 text-plum-800"}`}>
          {msg.text}
        </div>
      )}
      {mode === "razorpay" && (
        <>
          <button type="button" className="btn-primary w-full" onClick={payRazorpay} disabled={busy}>
            {busy ? "Processing…" : "Pay securely with Razorpay"}
          </button>
          <p className="hint">UPI, cards and net banking via Razorpay. Your booking is confirmed only after the payment is verified on our server.</p>
        </>
      )}
      {mode === "demo" && (
        <div className="rounded-xl border-2 border-dashed border-gold-500 bg-[#FFF9EC] p-4">
          <p className="font-semibold text-gold-700">DEMO CHECKOUT — no real payment</p>
          <p className="mt-1 text-sm">
            Online payments aren’t connected yet (Razorpay keys not configured). This button confirms the booking in demo mode. <strong>No money is collected</strong> and the booking is marked “Demo — no money collected”.
          </p>
          <label className="mt-3 flex min-h-[44px] items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-plum-700" checked={demoAck} onChange={(e) => setDemoAck(e.target.checked)} />
            <span className="text-sm">I understand this is a demo and no payment is being made.</span>
          </label>
          <button type="button" className="btn-gold mt-3 w-full" onClick={payDemo} disabled={busy || !demoAck}>
            {busy ? "Confirming…" : "Confirm demo booking"}
          </button>
        </div>
      )}
      {mode === "none" && <p className="rounded-lg bg-bad-bg p-3 text-bad">Online payment is currently unavailable. Please contact us to complete your booking.</p>}
    </div>
  );
}
