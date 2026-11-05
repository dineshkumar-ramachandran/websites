"use client";

import { useEffect, useRef, useState } from "react";
import { AvailabilityPicker, fmtTime, PickerSelection } from "./availability-picker";

type Hall = { id: number; slug: string; name: string; location_name: string; capacity_min: number; capacity_max: number; cleaning_fee_paise: number };
type Alt = { id: number; slug: string; name: string; location: string; capacity_max: number; options: { key: string; label: string; startTime: string; endTime: string; pricePaise: number }[] };

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const DRAFT_KEY = "bc-booking-draft"; // convenience only: keeps typed details if the user switches hall. Never used for availability.

const FIELDS = ["eventType", "eventTypeOther", "guestCount", "customerName", "customerPhone", "customerEmail", "notes"] as const;
type FormState = Record<(typeof FIELDS)[number], string>;

function longDate(d: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
}

export function BookingForm({
  hall,
  today,
  initialDate,
  initialOption,
  eventTypes,
  holdMinutes,
  taxPercent,
  taxLabel,
}: {
  hall: Hall;
  today: string;
  initialDate?: string;
  initialOption?: string;
  eventTypes: { value: string; label: string }[];
  holdMinutes: number;
  taxPercent: number;
  taxLabel: string;
}) {
  const [sel, setSel] = useState<PickerSelection>(null);
  const [form, setForm] = useState<FormState>({ eventType: "", eventTypeOther: "", guestCount: "", customerName: "", customerPhone: "", customerEmail: "", notes: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ kind: "error" | "conflict"; text: string } | null>(null);
  const [alts, setAlts] = useState<Alt[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) setForm((f) => ({ ...f, ...JSON.parse(raw) }));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: "" }));
  };

  function clientValidate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!sel) e.option = "Choose a date and an available time slot.";
    if (!form.eventType) e.eventType = "Choose the type of event.";
    if (form.eventType === "other" && !form.eventTypeOther.trim()) e.eventTypeOther = "Tell us what kind of event it is.";
    const g = Number(form.guestCount);
    if (!form.guestCount || !Number.isInteger(g) || g < 1) e.guestCount = "Enter the number of guests.";
    else if (g > hall.capacity_max) e.guestCount = `This hall holds up to ${hall.capacity_max} guests.`;
    if (form.customerName.trim().length < 2) e.customerName = "Enter your name.";
    if (!/^\+?\d{10,13}$/.test(form.customerPhone.replace(/[\s()-]/g, ""))) e.customerPhone = "Enter a valid phone number, e.g. 98450 12345.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.customerEmail.trim())) e.customerEmail = "Enter a valid email address.";
    if (!agree) e.agree = "Please confirm you have read the cancellation policy.";
    return e;
  }

  async function loadAlternatives(date: string) {
    setAlts(null);
    try {
      const res = await fetch(`/api/halls/available?date=${date}&exclude=${hall.id}${form.guestCount ? `&guests=${Number(form.guestCount)}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      setAlts(res.ok ? data.halls : []);
    } catch {
      setAlts([]);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const errs = clientValidate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hallId: hall.id, date: sel!.date, option: sel!.optionKey, ...form, guestCount: Number(form.guestCount), agree }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {}
        window.location.href = data.reviewUrl;
        return;
      }
      if (res.status === 409) {
        const lost = sel!;
        setBanner({
          kind: "conflict",
          text: `${data?.error?.message ?? "This time is no longer available."} (${lost.option.label}, ${longDate(lost.date)} at ${hall.name}.) Your details are still filled in — pick another time below or try another hall.`,
        });
        setRefreshKey((k) => k + 1);
        loadAlternatives(lost.date);
      } else if (res.status === 400 && data?.error?.fields) {
        setErrors(data.error.fields);
        setTimeout(() => errorSummaryRef.current?.focus(), 0);
      } else {
        setBanner({ kind: "error", text: data?.error?.message ?? "Something went wrong. Please try again." });
      }
      setTimeout(() => bannerRef.current?.focus(), 0);
    } catch {
      setBanner({ kind: "error", text: "Network problem — please check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const errList = Object.entries(errors).filter(([, v]) => v);
  const fieldProps = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `${k}-err` : undefined });
  const err = (k: string) => (errors[k] ? <p id={`${k}-err`} className="field-error">{errors[k]}</p> : null);

  const rental = sel?.option.pricePaise ?? 0;
  const tax = Math.round(((rental + hall.cleaning_fee_paise) * taxPercent) / 100);

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      {banner && (
        <div ref={bannerRef} tabIndex={-1} role="alert" className={`rounded-xl border p-4 ${banner.kind === "conflict" ? "border-gold-500 bg-warn-bg text-ink" : "border-bad bg-bad-bg text-bad"}`}>
          <p className="font-semibold">{banner.kind === "conflict" ? "That slot was just taken" : "We couldn’t continue"}</p>
          <p className="mt-1">{banner.text}</p>
          {banner.kind === "conflict" && (
            <div className="mt-3">
              <p className="font-semibold">Other halls free on that date:</p>
              {alts === null ? (
                <p className="text-ink-soft">Looking for alternatives…</p>
              ) : alts.length === 0 ? (
                <p className="text-ink-soft">No other halls have free slots that day. Try another date on the calendar.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {alts.map((a) => (
                    <li key={a.id} className="rounded-lg bg-ivory-50 p-3">
                      <span className="font-semibold">{a.name}</span> <span className="text-ink-soft">· {a.location} · up to {a.capacity_max} guests</span>
                      <ul className="mt-1 flex flex-wrap gap-2">
                        {a.options.map((o) => (
                          <li key={o.key}>
                            <a className="btn-outline btn-sm" href={`/book?hall=${a.slug}&date=${sel?.date ?? ""}&option=${o.key}`}>
                              {o.label} {fmtTime(o.startTime)}–{fmtTime(o.endTime)} · {inr.format(o.pricePaise / 100)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {errList.length > 0 && (
        <div ref={errorSummaryRef} tabIndex={-1} role="alert" className="rounded-xl border border-bad bg-bad-bg p-4 text-bad">
          <p className="font-semibold">Please fix {errList.length === 1 ? "this" : "these"} to continue:</p>
          <ul className="mt-1 list-disc pl-6">
            {errList.map(([k, v]) => (
              <li key={k}>
                <a href={`#f-${k}`} className="text-bad underline">{v}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section aria-labelledby="s1" className="card p-5">
        <h2 id="s1" className="text-2xl">1. Date and time</h2>
        <p className="mb-4 text-ink-soft">
          {hall.name}, {hall.location_name}
        </p>
        <div id="f-option" tabIndex={-1}>
          <AvailabilityPicker hallId={hall.id} today={today} initialDate={initialDate} initialOption={initialOption} onSelect={setSel} refreshKey={refreshKey} />
        </div>
        {err("option")}
      </section>

      <section aria-labelledby="s2" className="card space-y-4 p-5">
        <h2 id="s2" className="text-2xl">2. Your event</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="f-eventType" className="label">Event type *</label>
            <select id="f-eventType" className="input" value={form.eventType} onChange={set("eventType")} required {...fieldProps("eventType")}>
              <option value="">Select…</option>
              {eventTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {err("eventType")}
          </div>
          <div>
            <label htmlFor="f-guestCount" className="label">Number of guests *</label>
            <input id="f-guestCount" type="number" inputMode="numeric" min={1} max={hall.capacity_max} className="input" value={form.guestCount} onChange={set("guestCount")} required {...fieldProps("guestCount")} />
            <p className="hint">This hall suits {hall.capacity_min}–{hall.capacity_max} guests.</p>
            {err("guestCount")}
          </div>
          {form.eventType === "other" && (
            <div className="sm:col-span-2">
              <label htmlFor="f-eventTypeOther" className="label">What are you celebrating? *</label>
              <input id="f-eventTypeOther" className="input" maxLength={80} value={form.eventTypeOther} onChange={set("eventTypeOther")} {...fieldProps("eventTypeOther")} />
              {err("eventTypeOther")}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="s3" className="card space-y-4 p-5">
        <h2 id="s3" className="text-2xl">3. Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="f-customerName" className="label">Full name *</label>
            <input id="f-customerName" autoComplete="name" className="input" maxLength={100} value={form.customerName} onChange={set("customerName")} {...fieldProps("customerName")} />
            {err("customerName")}
          </div>
          <div>
            <label htmlFor="f-customerPhone" className="label">Mobile number *</label>
            <input id="f-customerPhone" type="tel" autoComplete="tel" inputMode="tel" placeholder="98450 12345" className="input" maxLength={20} value={form.customerPhone} onChange={set("customerPhone")} {...fieldProps("customerPhone")} />
            {err("customerPhone")}
          </div>
          <div>
            <label htmlFor="f-customerEmail" className="label">Email *</label>
            <input id="f-customerEmail" type="email" autoComplete="email" className="input" maxLength={200} value={form.customerEmail} onChange={set("customerEmail")} {...fieldProps("customerEmail")} />
            <p className="hint">You’ll need this (or your phone number) to look up your booking.</p>
            {err("customerEmail")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="f-notes" className="label">Notes (optional)</label>
            <textarea id="f-notes" rows={3} maxLength={1000} className="input" value={form.notes} onChange={set("notes")} placeholder="Decoration plans, catering questions, accessibility needs…" />
          </div>
        </div>
      </section>

      <section aria-labelledby="s4" className="card p-5">
        <h2 id="s4" className="text-2xl">4. Summary</h2>
        {sel ? (
          <dl className="mt-3 space-y-1">
            <div className="flex justify-between gap-4"><dt>{sel.option.label}, {longDate(sel.date)}</dt><dd>{inr.format(rental / 100)}</dd></div>
            {hall.cleaning_fee_paise > 0 && <div className="flex justify-between gap-4"><dt>Cleaning fee</dt><dd>{inr.format(hall.cleaning_fee_paise / 100)}</dd></div>}
            {taxPercent > 0 && <div className="flex justify-between gap-4"><dt>{taxLabel} ({taxPercent}%)</dt><dd>{inr.format(tax / 100)}</dd></div>}
            <div className="flex justify-between gap-4 border-t border-ivory-300 pt-2 text-lg font-semibold"><dt>Estimated total</dt><dd>{inr.format((rental + hall.cleaning_fee_paise + tax) / 100)}</dd></div>
          </dl>
        ) : (
          <p className="mt-2 text-ink-soft">Choose a date and slot to see the price.</p>
        )}
        <label className="mt-4 flex min-h-[48px] cursor-pointer items-start gap-3" htmlFor="f-agree">
          <input id="f-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 accent-plum-700" {...fieldProps("agree")} />
          <span>
            I have read the <a href="/cancellation-policy" target="_blank">cancellation policy</a> and <a href="/privacy" target="_blank">privacy notice</a>.
          </span>
        </label>
        {err("agree")}
        <p className="hint mt-3">On the next screen we’ll hold this slot for you for {holdMinutes} minutes while you review and pay. The final price is confirmed by the server.</p>
        <button type="submit" className="btn-primary mt-4 w-full sm:w-auto" disabled={submitting}>
          {submitting ? "Checking availability…" : "Hold this slot & review"}
        </button>
      </section>
    </form>
  );
}
