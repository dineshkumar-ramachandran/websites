"use client";

import { useState } from "react";
import { AvailabilityPicker, PickerSelection } from "../availability-picker";
import { adminFetch, ApiError } from "./admin-fetch";

type Hall = { id: number; name: string; location_name: string; capacity_max: number };

export function ManualBookingForm({ halls, today, eventTypes }: { halls: Hall[]; today: string; eventTypes: { value: string; label: string }[] }) {
  const [hallId, setHallId] = useState<number>(halls[0]?.id ?? 0);
  const [sel, setSel] = useState<PickerSelection>(null);
  const [f, setF] = useState({ eventType: "", eventTypeOther: "", guestCount: "", customerName: "", customerPhone: "", customerEmail: "", notes: "", offlinePaidRupees: "" });
  const [confirm, setConfirm] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const hall = halls.find((h) => h.id === hallId);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    if (!sel) return setError("Choose a date and an available slot.");
    setBusy(true);
    try {
      const r = await adminFetch<{ id: string }>("/api/admin/bookings", "POST", {
        hallId, date: sel.date, option: sel.optionKey, ...f, guestCount: Number(f.guestCount), confirm,
      });
      window.location.href = `/admin/bookings/${r.id}`;
    } catch (err) {
      const ae = err as ApiError;
      setError(ae.message);
      if (ae.fields) setFields(ae.fields);
      if (ae.status === 409) setRefreshKey((k) => k + 1);
      setBusy(false);
    }
  }

  const fe = (k: string) => (fields[k] ? <p className="field-error">{fields[k]}</p> : null);

  if (halls.length === 0) return <p className="card p-6">No active halls. Activate or add a hall first.</p>;

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <section className="card space-y-4 p-5">
        <h2 className="text-xl">Hall, date and time</h2>
        <div className="max-w-md">
          <label htmlFor="mb-hall" className="label">Hall</label>
          <select id="mb-hall" className="input" value={hallId} onChange={(e) => { setHallId(Number(e.target.value)); setSel(null); }}>
            {halls.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.location_name}</option>)}
          </select>
        </div>
        <AvailabilityPicker key={hallId} hallId={hallId} today={today} onSelect={setSel} adminView refreshKey={refreshKey} />
        <p className="hint">Admin view ignores the online notice period, but the same overlap, buffer and block rules apply.</p>
      </section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Customer and event</h2>
        <div><label className="label" htmlFor="mb-name">Customer name *</label><input id="mb-name" className="input" value={f.customerName} onChange={set("customerName")} />{fe("customerName")}</div>
        <div><label className="label" htmlFor="mb-phone">Phone *</label><input id="mb-phone" type="tel" className="input" value={f.customerPhone} onChange={set("customerPhone")} />{fe("customerPhone")}</div>
        <div><label className="label" htmlFor="mb-email">Email *</label><input id="mb-email" type="email" className="input" value={f.customerEmail} onChange={set("customerEmail")} />{fe("customerEmail")}</div>
        <div>
          <label className="label" htmlFor="mb-guests">Guests *</label>
          <input id="mb-guests" type="number" min={1} max={hall?.capacity_max} className="input" value={f.guestCount} onChange={set("guestCount")} />
          <p className="hint">Capacity up to {hall?.capacity_max}</p>{fe("guestCount")}
        </div>
        <div>
          <label className="label" htmlFor="mb-type">Event type *</label>
          <select id="mb-type" className="input" value={f.eventType} onChange={set("eventType")}>
            <option value="">Select…</option>
            {eventTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>{fe("eventType")}
        </div>
        {f.eventType === "other" && <div><label className="label" htmlFor="mb-other">Describe event *</label><input id="mb-other" className="input" value={f.eventTypeOther} onChange={set("eventTypeOther")} />{fe("eventTypeOther")}</div>}
        <div className="sm:col-span-2"><label className="label" htmlFor="mb-notes">Notes</label><textarea id="mb-notes" rows={3} className="input" value={f.notes} onChange={set("notes")} /></div>
      </section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Status and payment</h2>
        <label className="flex min-h-[48px] items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> Confirm immediately (otherwise a temporary hold is created)</label>
        <div>
          <label className="label" htmlFor="mb-paid">Payment received offline (₹, optional)</label>
          <input id="mb-paid" type="number" min={0} step="0.01" className="input" value={f.offlinePaidRupees} onChange={set("offlinePaidRupees")} placeholder="e.g. cash / UPI advance" />
          <p className="hint">Recorded as an offline payment. Leave empty if nothing was paid.</p>
        </div>
      </section>
      {error && <p role="alert" className="rounded-lg bg-bad-bg p-3 text-bad">{error}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Create booking"}</button>
    </form>
  );
}
