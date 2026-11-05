"use client";

import { useState } from "react";

type View = {
  reference: string;
  status: string;
  payment_status: string;
  hall: string;
  location: string;
  address: string;
  date: string;
  time: string;
  event: string;
  guests: number;
  name: string;
  total_paise: number;
  rental_paise: number;
  cleaning_fee_paise: number;
  tax_paise: number;
  tax_percent: number;
};

const inr = (p: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(p / 100);
const STATUS: Record<string, string> = { held: "On hold — awaiting payment", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", expired: "Hold expired" };
const PAY: Record<string, string> = { unpaid: "Unpaid", pending: "Payment pending", paid: "Paid", demo: "Demo — no money collected", refunded: "Refunded", failed: "Payment failed" };

export function LookupForm() {
  const [reference, setReference] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [view, setView] = useState<View | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    setView(null);
    const f: Record<string, string> = {};
    if (!reference.trim()) f.reference = "Enter your booking reference.";
    if (!contact.trim()) f.contact = "Enter the email or phone number used for the booking.";
    if (Object.keys(f).length) return setFields(f);
    setBusy(true);
    try {
      const res = await fetch("/api/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, contact }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setView(data.booking);
      else if (data?.error?.fields) setFields(data.error.fields);
      else setError(data?.error?.message ?? "Something went wrong.");
    } catch {
      setError("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} noValidate className="card space-y-4 p-5" aria-label="Find my booking">
        <div>
          <label htmlFor="lk-ref" className="label">Booking reference</label>
          <input id="lk-ref" className="input font-mono uppercase" placeholder="BC-XXXX-XXXX" value={reference} onChange={(e) => setReference(e.target.value)} aria-invalid={!!fields.reference} aria-describedby={fields.reference ? "lk-ref-err" : undefined} autoComplete="off" />
          {fields.reference && <p id="lk-ref-err" className="field-error">{fields.reference}</p>}
        </div>
        <div>
          <label htmlFor="lk-contact" className="label">Email or phone used for booking</label>
          <input id="lk-contact" className="input" value={contact} onChange={(e) => setContact(e.target.value)} aria-invalid={!!fields.contact} aria-describedby={fields.contact ? "lk-c-err" : undefined} autoComplete="email" />
          {fields.contact && <p id="lk-c-err" className="field-error">{fields.contact}</p>}
        </div>
        {error && <p role="alert" className="rounded-lg bg-bad-bg p-3 text-bad">{error}</p>}
        <button className="btn-primary w-full sm:w-auto" disabled={busy}>{busy ? "Searching…" : "Find booking"}</button>
      </form>

      {view && (
        <section className="card p-5" aria-live="polite" aria-labelledby="lk-res">
          <h2 id="lk-res" className="text-2xl">Booking {view.reference}</h2>
          <p className="mt-1">
            <span className="badge bg-plum-50 px-3 py-1 text-sm text-plum-800">{STATUS[view.status] ?? view.status}</span>{" "}
            <span className="badge bg-ivory-200 px-3 py-1 text-sm">{PAY[view.payment_status] ?? view.payment_status}</span>
          </p>
          <dl className="mt-4 divide-y divide-ivory-300">
            {[
              ["Name", view.name],
              ["Hall", `${view.hall}, ${view.location}`],
              ["Address", view.address],
              ["Date", view.date],
              ["Time (IST)", view.time],
              ["Event", view.event],
              ["Guests", String(view.guests)],
              ["Hall rental", inr(view.rental_paise)],
              ...(view.cleaning_fee_paise ? [["Cleaning fee", inr(view.cleaning_fee_paise)]] : []),
              ...(view.tax_paise ? [[`Tax (${view.tax_percent}%)`, inr(view.tax_paise)]] : []),
              ["Total", inr(view.total_paise)],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-1 py-2 sm:grid-cols-[160px_1fr]">
                <dt className="text-sm text-ink-soft">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="hint mt-3">To change or cancel, contact us with your reference.</p>
        </section>
      )}
    </div>
  );
}
