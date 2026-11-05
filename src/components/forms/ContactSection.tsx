import { useState, type FormEvent } from 'react'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { brand } from '../../data/brand'
import { memberships } from '../../data/memberships'
import { goalOptions } from '../../data/programs'
import { isValidEmail, isValidName, isValidPhone, normalisePhone } from '../../lib/validation'
import { submitEnquiry, whatsappUrl, type Enquiry } from '../../lib/enquiry'
import { LineReveal, Reveal } from '../animations/Reveal'
import { EnquirySummary } from './EnquirySummary'

type Errors = Partial<Record<'name' | 'phone' | 'email', string>>

export function ContactSection() {
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ enquiry: Enquiry; delivered: boolean; message: string } | null>(null)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const g = (k: string) => String(f.get(k) ?? '').trim()
    const errs: Errors = {}
    if (!isValidName(g('name'))) errs.name = 'Please enter your name.'
    if (!isValidPhone(g('phone'))) errs.phone = 'Enter a valid 10-digit Indian mobile number.'
    if (g('email') && !isValidEmail(g('email'))) errs.email = 'Enter a valid email address.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const enquiry: Enquiry = { source: 'contact-form', name: g('name'), phone: normalisePhone(g('phone'))!, email: g('email') || undefined, goal: g('goal') || undefined, membership: g('membership') || undefined, message: g('message') || undefined }
    setBusy(true)
    const r = await submitEnquiry(enquiry)
    setBusy(false)
    setResult({ enquiry, ...r })
  }

  const info = [
    { I: MapPin, k: 'Address', v: brand.contact.address },
    { I: Phone, k: 'Phone', v: brand.contact.phone },
    { I: Mail, k: 'Email', v: brand.contact.email },
  ]
  return (
    <section id="contact" className="relative bg-coal py-24 sm:py-32">
      <div className="container-x grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-4">Contact &amp; location</p>
          <LineReveal className="display text-[clamp(2.6rem,6vw,5.5rem)]" lines={['COME', <span key="x" className="text-lime">TRAIN.</span>]} />
          <p className="sample-tag mt-5">Placeholder contact details — to be confirmed</p>
          <ul className="mt-8 space-y-5">
            {info.map(({ I, k, v }) => <li key={k} className="flex gap-4"><I className="mt-1 h-5 w-5 shrink-0 text-lime" aria-hidden /><div><p className="text-[11px] uppercase tracking-widest text-white/40">{k}</p><p>{v}</p></div></li>)}
          </ul>
          <a href={whatsappUrl({ source: 'contact-form', message: 'Hi! I would like to enquire about membership.' })} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-8"><MessageCircle className="h-4 w-4" />WhatsApp enquiry</a>
          <div className="mt-8 aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-char">
            {brand.contact.mapsEmbedUrl ? <iframe title="Gym location map" src={brand.contact.mapsEmbedUrl} loading="lazy" className="h-full w-full border-0" referrerPolicy="no-referrer-when-downgrade" /> : (
              <div className="grid h-full place-items-center bg-[linear-gradient(#ffffff0d_1px,transparent_1px),linear-gradient(90deg,#ffffff0d_1px,transparent_1px)] [background-size:32px_32px] text-center"><div><MapPin className="mx-auto h-8 w-8 text-lime" /><p className="mt-2 text-sm text-white/60">Google Maps embed placeholder</p><p className="text-xs text-white/35">Bangalore, Karnataka</p></div></div>
            )}
          </div>
        </div>
        <Reveal className="lg:col-span-7">
          <div className="rounded-3xl border border-white/10 bg-ink p-6 sm:p-10">
            <h3 className="display text-4xl">Enquiry form</h3>
            <p className="mt-2 text-xs text-white/50">Frontend demo — no backend is connected, so submitting prepares a summary you can send via WhatsApp or copy. It is not delivered automatically.</p>
            {result ? (
              <div className="mt-6 space-y-4">
                <EnquirySummary enquiry={result.enquiry} delivered={result.delivered} note={result.message} />
                <button className="btn btn-ghost" onClick={() => setResult(null)}>Edit / new enquiry</button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="c-name" className="mb-1.5 block text-xs uppercase tracking-widest text-white/50">Name *</label><input id="c-name" name="name" autoComplete="name" className="field" placeholder="Your name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'e-name' : undefined} />{errors.name && <p id="e-name" role="alert" className="mt-1 text-xs text-red-400">{errors.name}</p>}</div>
                <div><label htmlFor="c-phone" className="mb-1.5 block text-xs uppercase tracking-widest text-white/50">Phone number *</label><input id="c-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className="field" placeholder="98XXXXXXXX" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'e-phone' : undefined} />{errors.phone && <p id="e-phone" role="alert" className="mt-1 text-xs text-red-400">{errors.phone}</p>}</div>
                <div className="sm:col-span-2"><label htmlFor="c-email" className="mb-1.5 block text-xs uppercase tracking-widest text-white/50">Email</label><input id="c-email" name="email" type="email" autoComplete="email" className="field" placeholder="you@email.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'e-email' : undefined} />{errors.email && <p id="e-email" role="alert" className="mt-1 text-xs text-red-400">{errors.email}</p>}</div>
                <div><label htmlFor="c-goal" className="mb-1.5 block text-xs uppercase tracking-widest text-white/50">Fitness goal</label><select id="c-goal" name="goal" className="field"><option value="">Select a goal</option>{goalOptions.map((o) => <option key={o.id} value={o.label}>{o.label}</option>)}</select></div>
                <div><label htmlFor="c-mem" className="mb-1.5 block text-xs uppercase tracking-widest text-white/50">Preferred membership</label><select id="c-mem" name="membership" className="field"><option value="">Not sure yet</option>{memberships.map((m) => <option key={m.id} value={m.name}>{m.short}</option>)}</select></div>
                <div className="sm:col-span-2"><label htmlFor="c-msg" className="mb-1.5 block text-xs uppercase tracking-widest text-white/50">Message</label><textarea id="c-msg" name="message" rows={4} className="field resize-none" placeholder="Tell us about your goals…" /></div>
                <div className="sm:col-span-2"><button disabled={busy} className="btn btn-primary w-full sm:w-auto">{busy ? 'Preparing…' : 'Prepare enquiry'}</button></div>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
