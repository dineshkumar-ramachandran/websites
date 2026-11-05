"use client";

import { useState } from "react";
import { AvailabilityPicker, PickerSelection } from "../availability-picker";
import { adminFetch } from "./admin-fetch";

type Hall = { id: number; name: string; is_active: boolean };
type B = {
  id: string;
  status: string;
  displayStatus: string;
  payment_status: string;
  hall_id: number;
  needs_attention: boolean;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  guest_count: number;
  event_type: string;
  event_type_other: string;
  notes: string;
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="card p-0">
      <summary className="flex min-h-[52px] cursor-pointer items-center px-4 font-semibold text-plum-800">{title}</summary>
      <div className="space-y-3 border-t border-ivory-300 p-4">{children}</div>
    </details>
  );
}

export function BookingActions({ b, halls, today, eventTypes }: { b: B; halls: Hall[]; today: string; eventTypes: { value: string; label: string }[] }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [pay, setPay] = useState({ paymentStatus: b.payment_status, note: "", offlineAmountRupees: "" });
  const [rsHall, setRsHall] = useState(b.hall_id);
  const [rsSel, setRsSel] = useState<PickerSelection>(null);
  const [reprice, setReprice] = useState(false);
  const [det, setDet] = useState({ customerName: b.customer_name, customerPhone: b.customer_phone, customerEmail: b.customer_email, guestCount: String(b.guest_count), eventType: b.event_type, eventTypeOther: b.event_type_other, notes: b.notes });

  const live = b.displayStatus === "confirmed" || b.displayStatus === "held";

  async function act(body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMsg(null);
    try {
      await adminFetch(`/api/admin/bookings/${b.id}`, "POST", body);
      setMsg({ ok: true, text: "Saved." });
      window.location.reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-lg p-3 ${msg.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}>{msg.text}</p>}

      {(b.status === "held" || b.status === "expired") && (
        <div className="card p-4">
          <p className="text-sm text-ink-soft">{b.status === "held" ? "Customer has not paid yet. Confirming will reserve the slot regardless of payment." : "This hold expired. Confirming re-checks availability first."}</p>
          <button className="btn-primary btn-sm mt-2" disabled={busy} onClick={() => act({ action: "confirm" }, "Confirm this booking? Availability will be re-checked.")}>Confirm booking</button>
        </div>
      )}

      {b.needs_attention && (
        <Panel title="Mark attention item resolved">
          <label htmlFor="res-note" className="label">What was done? (e.g. refunded, moved to another hall)</label>
          <textarea id="res-note" className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-primary btn-sm" disabled={busy} onClick={() => act({ action: "resolve", note })}>Mark resolved</button>
        </Panel>
      )}

      {live && (
        <Panel title="Reschedule (date, slot or hall)">
          <div className="max-w-sm">
            <label htmlFor="rs-hall" className="label">Hall</label>
            <select id="rs-hall" className="input" value={rsHall} onChange={(e) => { setRsHall(Number(e.target.value)); setRsSel(null); }}>
              {halls.filter((h) => h.is_active || h.id === b.hall_id).map((h) => <option key={h.id} value={h.id}>{h.name}{h.is_active ? "" : " (inactive)"}</option>)}
            </select>
          </div>
          <AvailabilityPicker key={rsHall} hallId={rsHall} today={today} onSelect={setRsSel} adminView />
          <p className="hint">The booking’s current slot shows as booked; pick a different free slot. Availability is checked again on save.</p>
          <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={reprice} onChange={(e) => setReprice(e.target.checked)} /> Recalculate price for the new slot (otherwise the original price is kept)</label>
          <button className="btn-primary btn-sm" disabled={busy || !rsSel} onClick={() => rsSel && act({ action: "reschedule", hallId: rsHall, date: rsSel.date, option: rsSel.optionKey, reprice }, `Move booking to ${rsSel.option.label} on ${rsSel.date}?`)}>Reschedule</button>
        </Panel>
      )}

      <Panel title="Payment status">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="ps" className="label">Status</label>
            <select id="ps" className="input" value={pay.paymentStatus} onChange={(e) => setPay({ ...pay, paymentStatus: e.target.value })}>
              {["unpaid", "pending", "paid", "refunded", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}
              {b.payment_status === "demo" && <option value="demo">demo</option>}
            </select>
          </div>
          <div>
            <label htmlFor="pa" className="label">Offline amount received (₹)</label>
            <input id="pa" type="number" min={0} step="0.01" className="input" value={pay.offlineAmountRupees} onChange={(e) => setPay({ ...pay, offlineAmountRupees: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pn" className="label">Note</label>
            <input id="pn" className="input" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} placeholder="e.g. Cash at office, UPI ref…" />
          </div>
        </div>
        <button className="btn-primary btn-sm" disabled={busy} onClick={() => act({ action: "payment", ...pay })}>Update payment</button>
      </Panel>

      <Panel title="Edit customer &amp; event details">
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["customerName", "Name"],
            ["customerPhone", "Phone"],
            ["customerEmail", "Email"],
            ["guestCount", "Guests"],
          ] as const).map(([k, l]) => (
            <div key={k}><label className="label" htmlFor={`d-${k}`}>{l}</label><input id={`d-${k}`} className="input" value={det[k]} onChange={(e) => setDet({ ...det, [k]: e.target.value })} /></div>
          ))}
          <div>
            <label className="label" htmlFor="d-type">Event type</label>
            <select id="d-type" className="input" value={det.eventType} onChange={(e) => setDet({ ...det, eventType: e.target.value })}>
              {eventTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {det.eventType === "other" && <div><label className="label" htmlFor="d-other">Describe</label><input id="d-other" className="input" value={det.eventTypeOther} onChange={(e) => setDet({ ...det, eventTypeOther: e.target.value })} /></div>}
          <div className="sm:col-span-2"><label className="label" htmlFor="d-notes">Notes</label><textarea id="d-notes" className="input" rows={3} value={det.notes} onChange={(e) => setDet({ ...det, notes: e.target.value })} /></div>
        </div>
        <button className="btn-primary btn-sm" disabled={busy} onClick={() => act({ action: "details", ...det, guestCount: Number(det.guestCount) })}>Save details</button>
      </Panel>

      {live && (
        <Panel title="Cancel booking">
          <label htmlFor="cx" className="label">Reason (kept in audit history)</label>
          <textarea id="cx" className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          <p className="hint">Cancelling releases the slot for others. Refunds are handled separately — update the payment status after refunding.</p>
          <button className="btn-danger btn-sm" disabled={busy || reason.trim().length < 3} onClick={() => act({ action: "cancel", reason }, "Cancel this booking? The slot will become available to others.")}>Cancel booking</button>
        </Panel>
      )}
    </div>
  );
}
