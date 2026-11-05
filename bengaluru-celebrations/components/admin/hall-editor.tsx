"use client";

import { useRef, useState } from "react";
import { adminFetch, ApiError } from "./admin-fetch";

type Loc = { id: number; name: string; is_active: boolean };
export type HallForm = {
  location_id: string; name: string; slug: string; tagline: string; description: string; address: string; map_url: string;
  capacity_min: string; capacity_max: string; amenities: string; policies: string; contact_name: string; contact_phone: string; contact_email: string;
  open_time: string; close_time: string; allow_full_day: boolean; full_day_price: string; cleaning_fee: string;
  setup_buffer_min: string; cleanup_buffer_min: string; min_notice_hours: string; max_advance_days: string; is_active: boolean;
};
type Slot = { id?: number; label: string; start_time: string; end_time: string; price: string; is_active: boolean };
type Img = { id: number; alt_text: string; is_demo: boolean };

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function HallDetailsForm({ hallId, initial, locations }: { hallId?: number; initial: HallForm; locations: Loc[] }) {
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof HallForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  const inp = (k: keyof HallForm, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={`h-${k}`} className="input" value={f[k] as string} onChange={set(k)} aria-invalid={!!errors[k]} {...extra} />
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErrors({});
    try {
      const body = { ...f, amenities: f.amenities.split("\n").map((s) => s.trim()).filter(Boolean) };
      if (hallId) {
        await adminFetch(`/api/admin/halls/${hallId}`, "PUT", body);
        setMsg({ ok: true, text: "Hall saved." });
      } else {
        const r = await adminFetch<{ id: number }>("/api/admin/halls", "POST", body);
        window.location.href = `/admin/halls/${r.id}?created=1`;
        return;
      }
    } catch (err) {
      const ae = err as ApiError;
      setErrors(ae.fields ?? {});
      setMsg({ ok: false, text: ae.message });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Basics</h2>
        <Field id="h-name" label="Hall name *" error={errors.name}>{inp("name")}</Field>
        <Field id="h-location_id" label="Location *" error={errors.location_id}>
          <select id="h-location_id" className="input" value={f.location_id} onChange={set("location_id")}>
            <option value="">Select…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}{l.is_active ? "" : " (inactive)"}</option>)}
          </select>
        </Field>
        <Field id="h-slug" label="URL name" hint="Used in the web address, e.g. /halls/mallige-hall. Leave blank to generate." error={errors.slug}>{inp("slug")}</Field>
        <Field id="h-tagline" label="Short tagline" error={errors.tagline}>{inp("tagline")}</Field>
        <div className="sm:col-span-2">
          <Field id="h-description" label="Description" error={errors.description}>
            <textarea id="h-description" rows={5} className="input" value={f.description} onChange={set("description")} />
          </Field>
        </div>
        <Field id="h-address" label="Address *" error={errors.address}>{inp("address")}</Field>
        <Field id="h-map_url" label="Map link (https://…)" error={errors.map_url}>{inp("map_url", { placeholder: "https://maps.google.com/…" })}</Field>
        <label className="flex min-h-[48px] items-center gap-3 sm:col-span-2">
          <input type="checkbox" className="h-5 w-5" checked={f.is_active} onChange={set("is_active")} /> Active (visible and bookable by customers)
        </label>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Capacity &amp; amenities</h2>
        <Field id="h-capacity_min" label="Minimum guests *" error={errors.capacity_min}>{inp("capacity_min", { type: "number", min: 1 })}</Field>
        <Field id="h-capacity_max" label="Maximum guests *" error={errors.capacity_max}>{inp("capacity_max", { type: "number", min: 1 })}</Field>
        <div className="sm:col-span-2">
          <Field id="h-amenities" label="Amenities (one per line)" error={errors.amenities}>
            <textarea id="h-amenities" rows={6} className="input" value={f.amenities} onChange={set("amenities")} />
          </Field>
        </div>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Hours, pricing &amp; buffers</h2>
        <Field id="h-open_time" label="Opens (IST) *" error={errors.open_time}>{inp("open_time", { type: "time" })}</Field>
        <Field id="h-close_time" label="Closes (IST) *" hint="Same day; overnight events are not supported." error={errors.close_time}>{inp("close_time", { type: "time" })}</Field>
        <label className="flex min-h-[48px] items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={f.allow_full_day} onChange={set("allow_full_day")} /> Offer full-day booking (opening to closing time)</label>
        <Field id="h-full_day_price" label="Full-day price (₹)" error={errors.full_day_price}>{inp("full_day_price", { type: "number", min: 0, step: "1" })}</Field>
        <Field id="h-cleaning_fee" label="Cleaning fee per booking (₹)" error={errors.cleaning_fee}>{inp("cleaning_fee", { type: "number", min: 0, step: "1" })}</Field>
        <div />
        <Field id="h-setup_buffer_min" label="Setup buffer before event (minutes)" hint="Blocks the hall before each booking." error={errors.setup_buffer_min}>{inp("setup_buffer_min", { type: "number", min: 0, max: 720 })}</Field>
        <Field id="h-cleanup_buffer_min" label="Clean-up buffer after event (minutes)" hint="Blocks the hall after each booking." error={errors.cleanup_buffer_min}>{inp("cleanup_buffer_min", { type: "number", min: 0, max: 720 })}</Field>
        <Field id="h-min_notice_hours" label="Minimum notice for online bookings (hours)" error={errors.min_notice_hours}>{inp("min_notice_hours", { type: "number", min: 0 })}</Field>
        <Field id="h-max_advance_days" label="How far ahead customers can book (days)" error={errors.max_advance_days}>{inp("max_advance_days", { type: "number", min: 1 })}</Field>
        <p className="hint sm:col-span-2">Changing hours or buffers affects new bookings only. Existing bookings keep the times they were booked with.</p>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Contact &amp; policies</h2>
        <Field id="h-contact_name" label="Venue contact name" error={errors.contact_name}>{inp("contact_name")}</Field>
        <Field id="h-contact_phone" label="Venue phone" error={errors.contact_phone}>{inp("contact_phone")}</Field>
        <Field id="h-contact_email" label="Venue email" error={errors.contact_email}>{inp("contact_email")}</Field>
        <div className="sm:col-span-2">
          <Field id="h-policies" label="Hall policies (lines starting with • become bullet points)" error={errors.policies}>
            <textarea id="h-policies" rows={6} className="input" value={f.policies} onChange={set("policies")} />
          </Field>
        </div>
      </section>

      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-lg p-3 ${msg.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}>{msg.text}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : hallId ? "Save hall" : "Create hall"}</button>
    </form>
  );
}

export function SlotsEditor({ hallId, initial }: { hallId: number; initial: Slot[] }) {
  const [slots, setSlots] = useState<Slot[]>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const upd = (i: number, k: keyof Slot, v: string | boolean) => setSlots((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await adminFetch(`/api/admin/halls/${hallId}`, "PATCH", { slots });
      setMsg({ ok: true, text: "Slots saved." });
      window.location.reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  }

  return (
    <section className="card space-y-3 p-5" aria-labelledby="slots-h">
      <h2 id="slots-h" className="text-xl">Time slots</h2>
      <p className="hint">Slots must fall within opening hours. Removing a slot deactivates it; existing bookings for it are kept.</p>
      {slots.length === 0 && <p className="text-ink-soft">No slots — customers can only book the full day (if enabled).</p>}
      <ul className="space-y-3">
        {slots.map((s, i) => (
          <li key={s.id ?? `n${i}`} className={`grid gap-2 rounded-lg border border-ivory-300 p-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] ${s.is_active ? "" : "opacity-60"}`}>
            <div><label className="label" htmlFor={`sl-l-${i}`}>Name</label><input id={`sl-l-${i}`} className="input" value={s.label} onChange={(e) => upd(i, "label", e.target.value)} /></div>
            <div><label className="label" htmlFor={`sl-s-${i}`}>Start</label><input id={`sl-s-${i}`} type="time" className="input" value={s.start_time} onChange={(e) => upd(i, "start_time", e.target.value)} /></div>
            <div><label className="label" htmlFor={`sl-e-${i}`}>End</label><input id={`sl-e-${i}`} type="time" className="input" value={s.end_time} onChange={(e) => upd(i, "end_time", e.target.value)} /></div>
            <div><label className="label" htmlFor={`sl-p-${i}`}>Price (₹)</label><input id={`sl-p-${i}`} type="number" min={0} className="input" value={s.price} onChange={(e) => upd(i, "price", e.target.value)} /></div>
            <div className="flex items-end gap-2">
              <label className="flex min-h-[48px] items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={s.is_active} onChange={(e) => upd(i, "is_active", e.target.checked)} /> Active</label>
              {!s.id && <button type="button" className="btn-ghost btn-sm" onClick={() => setSlots((x) => x.filter((_, j) => j !== i))} aria-label={`Remove new slot ${i + 1}`}>✕</button>}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-outline btn-sm" onClick={() => setSlots((s) => [...s, { label: "", start_time: "", end_time: "", price: "", is_active: true }])}>+ Add slot</button>
        <button type="button" className="btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save slots"}</button>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-lg p-3 ${msg.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}>{msg.text}</p>}
    </section>
  );
}

export function ImagesManager({ hallId, initial }: { hallId: number; initial: Img[] }) {
  const [imgs, setImgs] = useState(initial);
  const [alt, setAlt] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setMsg({ ok: false, text: "Choose a JPEG, PNG or WebP image." });
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("alt", alt);
    try {
      const r = await adminFetch<{ id: number }>(`/api/admin/halls/${hallId}/images`, "POST", fd);
      setImgs((x) => [...x, { id: r.id, alt_text: alt, is_demo: false }]);
      setAlt("");
      if (fileRef.current) fileRef.current.value = "";
      setMsg({ ok: true, text: "Photo uploaded." });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
    setBusy(false);
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await adminFetch(`/api/admin/halls/${hallId}/images?imageId=${id}`, "DELETE");
      setImgs((x) => x.filter((i) => i.id !== id));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  async function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= imgs.length) return;
    const next = [...imgs];
    [next[i], next[j]] = [next[j], next[i]];
    setImgs(next);
    await adminFetch("/api/admin/reorder", "POST", { table: "hall_images", hallId, ids: next.map((x) => x.id) }).catch((e) => setMsg({ ok: false, text: e.message }));
  }

  async function saveAlt(id: number, text: string) {
    await adminFetch(`/api/admin/halls/${hallId}/images`, "PATCH", { imageId: id, alt: text }).catch((e) => setMsg({ ok: false, text: e.message }));
  }

  return (
    <section className="card space-y-3 p-5" aria-labelledby="img-h">
      <h2 id="img-h" className="text-xl">Photos</h2>
      <p className="hint">The first photo is the cover. JPEG, PNG or WebP up to 5 MB. Describe each photo for screen-reader users.</p>
      {imgs.length === 0 && <p className="text-ink-soft">No photos yet.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {imgs.map((im, i) => (
          <li key={im.id} className="rounded-lg border border-ivory-300 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/images/${im.id}`} alt={im.alt_text} className="aspect-[3/2] w-full rounded object-cover" />
            {im.is_demo && <span className="demo-badge mt-1">Demo image</span>}
            {i === 0 && <span className="badge ml-1 mt-1 bg-plum-50 text-plum-800">Cover</span>}
            <label className="label mt-2" htmlFor={`alt-${im.id}`}>Description</label>
            <input id={`alt-${im.id}`} className="input" defaultValue={im.alt_text} onBlur={(e) => e.target.value !== im.alt_text && saveAlt(im.id, e.target.value)} />
            <div className="mt-2 flex gap-1">
              <button type="button" className="btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move photo earlier">◀</button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === imgs.length - 1} aria-label="Move photo later">▶</button>
              <button type="button" className="btn-ghost btn-sm ml-auto text-bad" onClick={() => remove(im.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={upload} className="grid gap-3 rounded-lg bg-ivory-200 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div><label className="label" htmlFor="img-file">Upload photo</label><input id="img-file" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="input bg-white" /></div>
        <div><label className="label" htmlFor="img-alt">Description</label><input id="img-alt" className="input" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="e.g. Stage decorated with flowers" /></div>
        <button className="btn-primary btn-sm" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
      </form>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-lg p-3 ${msg.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}>{msg.text}</p>}
    </section>
  );
}
