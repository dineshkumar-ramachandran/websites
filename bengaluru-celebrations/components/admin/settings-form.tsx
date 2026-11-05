"use client";

import { useState } from "react";
import type { SiteSettings } from "@/lib/settings";
import { adminFetch, ApiError } from "./admin-fetch";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const txt = (k: keyof SiteSettings, label: string, opts: { rows?: number; type?: string; hint?: string } = {}) => (
    <div className={opts.rows ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={`s-${k}`}>{label}</label>
      {opts.rows ? (
        <textarea id={`s-${k}`} rows={opts.rows} className="input" value={s[k] as string} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
      ) : (
        <input id={`s-${k}`} type={opts.type ?? "text"} className="input" value={s[k] as string | number} onChange={(e) => setS({ ...s, [k]: opts.type === "number" ? Number(e.target.value) : e.target.value })} />
      )}
      {opts.hint && <p className="hint">{opts.hint}</p>}
    </div>
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await adminFetch("/api/admin/settings", "PUT", s);
      setMsg({ ok: true, text: "Settings saved." });
    } catch (x) {
      setMsg({ ok: false, text: (x as ApiError).message });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Brand</h2>
        {txt("brand_name", "Business / brand name", { hint: "Placeholder: “Bengaluru Celebrations”. Replace with your real brand." })}
        {txt("brand_tagline", "Tagline")}
      </section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Booking rules</h2>
        {txt("hold_minutes", "Checkout hold (minutes)", { type: "number", hint: "How long a slot is reserved while the customer pays (2–60)." })}
        {txt("tax_percent", "Tax rate (%)", { type: "number", hint: "Confirm the correct GST rate with your accountant." })}
        {txt("tax_label", "Tax label")}
      </section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Contact details</h2>
        {txt("contact_phone", "Phone")}
        {txt("contact_whatsapp", "WhatsApp (optional)")}
        {txt("contact_email", "Email")}
        {txt("contact_hours", "Office hours")}
        {txt("contact_address", "Office address", { rows: 2 })}
        {txt("page_contact_intro", "Contact page introduction", { rows: 3 })}
      </section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Policy pages</h2>
        <p className="hint sm:col-span-2">Plain text. Each line is a paragraph; lines starting with “•” become bullet points.</p>
        {txt("page_cancellation", "Cancellation policy", { rows: 10 })}
        {txt("page_privacy", "Privacy notice", { rows: 10 })}
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="text-xl">FAQ</h2>
        {s.faq.map((f, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-ivory-300 p-3">
            <label className="label" htmlFor={`fq-${i}`}>Question {i + 1}</label>
            <input id={`fq-${i}`} className="input" value={f.q} onChange={(e) => setS({ ...s, faq: s.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} />
            <label className="label" htmlFor={`fa-${i}`}>Answer</label>
            <textarea id={`fa-${i}`} rows={3} className="input" value={f.a} onChange={(e) => setS({ ...s, faq: s.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} />
            <button type="button" className="btn-ghost btn-sm justify-self-start text-bad" onClick={() => setS({ ...s, faq: s.faq.filter((_, j) => j !== i) })}>Remove question</button>
          </div>
        ))}
        <button type="button" className="btn-outline btn-sm" onClick={() => setS({ ...s, faq: [...s.faq, { q: "", a: "" }] })}>+ Add question</button>
      </section>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-lg p-3 ${msg.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}>{msg.text}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
