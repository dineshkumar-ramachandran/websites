"use client";

import { useState } from "react";
import { adminFetch } from "./admin-fetch";

export type Row = { id: number; title: string; subtitle?: string; active: boolean; href?: string; extra?: string };

/** Keyboard-friendly reorder (up/down buttons) plus activate/deactivate toggles. */
export function SortableList({ table, rows: initial, activeLabel = "Active", warnOnDeactivate }: { table: "halls" | "locations"; rows: Row[]; activeLabel?: string; warnOnDeactivate?: string }) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
    setSaving(true);
    try {
      await adminFetch("/api/admin/reorder", "POST", { table, ids: next.map((r) => r.id) });
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setRows(rows);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(r: Row) {
    if (r.active && warnOnDeactivate && !window.confirm(warnOnDeactivate.replace("{name}", r.title))) return;
    try {
      await adminFetch("/api/admin/active", "POST", { table, id: r.id, active: !r.active });
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      {error && <p role="alert" className="mb-2 rounded bg-bad-bg p-2 text-bad">{error}</p>}
      <p className="sr-only" aria-live="polite">{saving ? "Saving order" : ""}</p>
      <ol className="card divide-y divide-ivory-300">
        {rows.map((r, i) => (
          <li key={r.id} className={`flex flex-wrap items-center gap-3 p-3 ${r.active ? "" : "bg-ivory-200/60"}`}>
            <div className="flex flex-col">
              <button type="button" className="btn-ghost btn-sm min-h-[32px] px-2" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${r.title} up`}>▲</button>
              <button type="button" className="btn-ghost btn-sm min-h-[32px] px-2" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move ${r.title} down`}>▼</button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {r.href ? <a href={r.href}>{r.title}</a> : r.title} {!r.active && <span className="badge ml-1 bg-ink-soft text-white">Inactive</span>}
              </p>
              {r.subtitle && <p className="text-sm text-ink-soft">{r.subtitle}</p>}
              {r.extra && <p className="text-xs text-ink-soft">{r.extra}</p>}
            </div>
            {r.href && <a href={r.href} className="btn-outline btn-sm">Edit</a>}
            <button type="button" className={r.active ? "btn-ghost btn-sm" : "btn-primary btn-sm"} onClick={() => toggle(r)} aria-pressed={r.active}>
              {r.active ? "Deactivate" : `Make ${activeLabel.toLowerCase()}`}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
