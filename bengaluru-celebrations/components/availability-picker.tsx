"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Option = {
  key: string;
  kind: "full_day" | "slot";
  label: string;
  startTime: string;
  endTime: string;
  pricePaise: number;
  available: boolean;
  reason: null | "booked" | "blocked" | "too_soon" | "past";
};
type Day = { date: string; status: "available" | "partial" | "full" | "closed"; closedReason: string | null; options: Option[] };

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function longDate(d: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function monthStart(d: string) {
  return d.slice(0, 7) + "-01";
}
function addMonths(ym01: string, n: number) {
  const d = new Date(`${ym01}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}
function lastOfMonth(ym01: string) {
  const d = new Date(`${ym01}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}
function addDaysStr(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

const REASON_TEXT: Record<string, string> = {
  booked: "Booked",
  blocked: "Not available",
  too_soon: "Too soon to book online",
  past: "Not bookable",
};
const STATUS_TEXT: Record<Day["status"], string> = {
  available: "available",
  partial: "some slots available",
  full: "fully booked",
  closed: "not bookable",
};

export type PickerSelection = { date: string; optionKey: string; option: Option } | null;

export function AvailabilityPicker({
  hallId,
  today,
  initialDate,
  initialOption,
  onSelect,
  apiBase = "/api/halls",
  refreshKey = 0,
  adminView = false,
}: {
  hallId: number;
  today: string;
  initialDate?: string;
  initialOption?: string;
  onSelect?: (sel: PickerSelection) => void;
  apiBase?: string;
  refreshKey?: number;
  adminView?: boolean;
}) {
  const [month, setMonth] = useState(monthStart(initialDate || today));
  const [days, setDays] = useState<Record<string, Day>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(initialDate || "");
  const [optionKey, setOptionKey] = useState(initialOption || "");
  const gridRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/${hallId}/availability?from=${month}&to=${lastOfMonth(month)}${adminView ? "&admin=1" : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not load availability.");
      const map: Record<string, Day> = {};
      for (const d of data.days as Day[]) map[d.date] = d;
      setDays(map);
    } catch (e) {
      setError((e as Error).message || "Could not load availability.");
    } finally {
      setLoading(false);
    }
  }, [apiBase, hallId, month, adminView]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const selectedDay = date ? days[date] : undefined;
  const selectedOption = selectedDay?.options.find((o) => o.key === optionKey && o.available);

  // If data refreshes and the chosen option became unavailable, clear it.
  useEffect(() => {
    if (!onSelect) return;
    if (date && optionKey && selectedOption) onSelect({ date, optionKey, option: selectedOption });
    else onSelect(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, optionKey, selectedOption?.available, selectedOption?.key]);

  const cells = useMemo(() => {
    const first = new Date(`${month}T00:00:00Z`);
    const lead = first.getUTCDay();
    const n = Number(lastOfMonth(month).slice(8));
    const arr: (string | null)[] = Array(lead).fill(null);
    for (let i = 1; i <= n; i++) arr.push(`${month.slice(0, 8)}${pad(i)}`);
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [month]);

  const canPrev = month > monthStart(today);
  const [y, m] = month.split("-").map(Number);

  function onKey(e: React.KeyboardEvent) {
    const t = e.target as HTMLElement;
    const d = t.dataset.date;
    if (!d) return;
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = addDaysStr(d, delta);
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`);
    if (el) el.focus();
    else if (next.slice(0, 7) !== month.slice(0, 7) && (delta > 0 || canPrev)) setMonth(monthStart(next));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="btn-ghost btn-sm" onClick={() => setMonth(addMonths(month, -1))} disabled={!canPrev} aria-label="Previous month">
            ← Prev
          </button>
          <h3 className="text-xl" aria-live="polite">
            {MONTHS[m - 1]} {y}
          </h3>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
            Next →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-soft" aria-hidden>
          {WD.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div ref={gridRef} className="relative grid grid-cols-7 gap-1" onKeyDown={onKey} aria-busy={loading}>
          {cells.map((c, i) => {
            if (!c) return <div key={`e${i}`} />;
            const d = days[c];
            const status = d?.status ?? "closed";
            const disabled = loading || !d || status === "full" || status === "closed";
            const selected = c === date;
            const cls =
              status === "available"
                ? "border-ok/50 bg-ok-bg text-ok"
                : status === "partial"
                  ? "border-gold-500 bg-warn-bg text-warn"
                  : status === "full"
                    ? "border-transparent bg-[#EFE7EA] text-[#8A7480] line-through"
                    : "border-transparent bg-transparent text-[#A89AA2]";
            return (
              <button
                key={c}
                type="button"
                data-date={c}
                disabled={disabled}
                aria-pressed={selected}
                aria-label={`${longDate(c)}, ${loading ? "loading" : STATUS_TEXT[status]}`}
                onClick={() => {
                  setDate(c);
                  setOptionKey("");
                }}
                className={`flex aspect-square min-h-[44px] items-center justify-center rounded-lg border text-base font-semibold ${cls} ${selected ? "!border-plum-700 ring-2 ring-plum-700" : ""} disabled:cursor-not-allowed`}
              >
                {Number(c.slice(8))}
              </button>
            );
          })}
          {loading && (
            <div className="absolute inset-0 grid place-items-center rounded-lg bg-ivory-50/70" role="status">
              <span className="rounded-full bg-plum-700 px-4 py-2 text-sm text-ivory-50">Loading availability…</span>
            </div>
          )}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft" aria-label="Calendar legend">
          <li><span className="mr-1 inline-block h-3 w-3 rounded-sm border border-ok/50 bg-ok-bg align-middle" />Available</li>
          <li><span className="mr-1 inline-block h-3 w-3 rounded-sm border border-gold-500 bg-warn-bg align-middle" />Some slots free</li>
          <li><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-[#EFE7EA] align-middle" />Fully booked</li>
          <li>Faded: not bookable</li>
        </ul>
        {error && (
          <div role="alert" className="mt-3 rounded-lg bg-bad-bg p-3 text-bad">
            {error}{" "}
            <button type="button" className="underline" onClick={load}>
              Try again
            </button>
          </div>
        )}
      </div>

      <div>
        {!date ? (
          <div className="card grid h-full min-h-[200px] place-items-center p-6 text-center text-ink-soft">
            <p>Select a date on the calendar to see the time slots for this hall.</p>
          </div>
        ) : (
          <fieldset className="card p-5">
            <legend className="sr-only">Choose a time for {longDate(date)}</legend>
            <p className="font-display text-xl text-plum-800" aria-hidden>
              {longDate(date)}
            </p>
            {!selectedDay ? (
              <p className="mt-3 text-ink-soft">Loading…</p>
            ) : selectedDay.options.length === 0 ? (
              <p className="mt-3 text-ink-soft">No booking options are set up for this hall yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {selectedDay.options.map((o) => {
                  const id = `opt-${o.key}`;
                  return (
                    <li key={o.key}>
                      <label
                        htmlFor={id}
                        className={`flex min-h-[56px] items-center gap-3 rounded-xl border p-3 ${
                          o.available ? "cursor-pointer border-ivory-300 bg-white hover:border-plum-500" : "cursor-not-allowed border-transparent bg-[#F2ECEE] text-[#7D6C76]"
                        } ${optionKey === o.key ? "!border-plum-700 ring-2 ring-plum-700" : ""}`}
                      >
                        <input
                          id={id}
                          type="radio"
                          name="slot-option"
                          value={o.key}
                          disabled={!o.available}
                          checked={optionKey === o.key}
                          onChange={() => setOptionKey(o.key)}
                          className="h-5 w-5 accent-plum-700"
                        />
                        <span className="flex-1">
                          <span className="block font-semibold">{o.label}</span>
                          <span className="block text-sm">
                            {fmtTime(o.startTime)} – {fmtTime(o.endTime)}
                          </span>
                        </span>
                        <span className="text-right">
                          {o.available ? (
                            <span className="font-semibold">{inr.format(o.pricePaise / 100)}</span>
                          ) : (
                            <span className="badge bg-ivory-200 text-ink-soft">{REASON_TEXT[o.reason ?? "past"]}</span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="hint mt-3">Times are IST. Setup and clean-up time around each booking is reserved automatically.</p>
          </fieldset>
        )}
      </div>
    </div>
  );
}
