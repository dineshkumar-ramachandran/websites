"use client";

import { useState } from "react";
import { adminFetch, ApiError } from "./admin-fetch";

type L = { id?: number; name: string; slug: string; area_description: string; is_active: boolean };

export function LocationForm({ initial, onDoneLabel = "Add location" }: { initial?: L; onDoneLabel?: string }) {
  const [f, setF] = useState<L>(initial ?? { name: "", slug: "", area_description: "", is_active: true });
  const [err, setErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const p = initial?.id ? `loc${initial.id}` : "locnew";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr({});
    setMsg("");
    try {
      await adminFetch("/api/admin/locations", "POST", f);
      window.location.reload();
    } catch (x) {
      setErr((x as ApiError).fields ?? {});
      setMsg((x as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-[1fr_1fr_1.5fr_auto] sm:items-end" noValidate>
      <div>
        <label className="label" htmlFor={`${p}-name`}>Name *</label>
        <input id={`${p}-name`} className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-invalid={!!err.name} />
      </div>
      <div>
        <label className="label" htmlFor={`${p}-slug`}>URL name</label>
        <input id={`${p}-slug`} className="input" value={f.slug} placeholder="auto" onChange={(e) => setF({ ...f, slug: e.target.value })} aria-invalid={!!err.slug} />
      </div>
      <div>
        <label className="label" htmlFor={`${p}-area`}>Area description</label>
        <input id={`${p}-area`} className="input" value={f.area_description} onChange={(e) => setF({ ...f, area_description: e.target.value })} />
      </div>
      <button className="btn-primary btn-sm" disabled={busy}>{busy ? "Saving…" : onDoneLabel}</button>
      {msg && <p role="alert" className="field-error sm:col-span-4">{msg}</p>}
    </form>
  );
}
