"use client";

import { useState } from "react";
import { adminFetch } from "./admin-fetch";

export function BlockForm({ halls, today }: { halls: { id: number; name: string }[]; today: string }) {
  const [f, setF] = useState({ hallId: String(halls[0]?.id ?? ""), startDate: today, startTime: "", endDate: today, endTime: "", reason: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await adminFetch("/api/admin/blocks", "POST", { ...f, hallId: Number(f.hallId) });
      window.location.reload();
    } catch (x) {
      setMsg((x as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-3" noValidate>
      <div><label className="label" htmlFor="b-hall">Hall</label><select id="b-hall" className="input" value={f.hallId} onChange={set("hallId")}>{halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
      <div><label className="label" htmlFor="b-sd">From date</label><input id="b-sd" type="date" className="input" value={f.startDate} onChange={set("startDate")} /></div>
      <div><label className="label" htmlFor="b-st">From time (optional)</label><input id="b-st" type="time" className="input" value={f.startTime} onChange={set("startTime")} /><p className="hint">Blank = start of day</p></div>
      <div><label className="label" htmlFor="b-reason">Reason</label><input id="b-reason" className="input" value={f.reason} onChange={set("reason")} placeholder="Maintenance, private event…" /></div>
      <div><label className="label" htmlFor="b-ed">To date</label><input id="b-ed" type="date" className="input" value={f.endDate} onChange={set("endDate")} /></div>
      <div><label className="label" htmlFor="b-et">To time (optional)</label><input id="b-et" type="time" className="input" value={f.endTime} onChange={set("endTime")} /><p className="hint">Blank = end of day</p></div>
      {msg && <p role="alert" className="rounded bg-bad-bg p-2 text-bad sm:col-span-3">{msg}</p>}
      <div className="sm:col-span-3"><button className="btn-primary btn-sm" disabled={busy}>{busy ? "Saving…" : "Block these dates"}</button></div>
    </form>
  );
}

export function RemoveBlock({ id }: { id: number }) {
  return (
    <button
      type="button"
      className="btn-ghost btn-sm text-bad"
      onClick={async () => {
        if (!window.confirm("Remove this block? The time becomes bookable again.")) return;
        try {
          await adminFetch("/api/admin/blocks", "PATCH", { id });
          window.location.reload();
        } catch (e) {
          alert((e as Error).message);
        }
      }}
    >
      Remove
    </button>
  );
}
