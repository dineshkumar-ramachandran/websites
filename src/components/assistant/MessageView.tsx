import { Check, MapPin, MessageCircle, Phone } from 'lucide-react'
import { amenities, AMENITIES_DISCLAIMER } from '../../data/amenities'
import { brand, hasWhatsApp } from '../../data/brand'
import { formatINR, PRICING_DISCLAIMER } from '../../data/memberships'
import { timings, TIMINGS_DISCLAIMER } from '../../data/timings'
import { EnquirySummary } from '../forms/EnquirySummary'
import { whatsappUrl } from '../../lib/enquiry'
import type { Rich } from './types'

const Tag = ({ children }: { children: string }) => <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-amber-200/80">{children}</p>

export function RichView({ c }: { c: Rich }) {
  switch (c.kind) {
    case 'text':
      return <p className="whitespace-pre-line">{c.text}</p>
    case 'plan': {
      const p = c.plan
      return (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between"><p className="font-bold uppercase tracking-wide">{p.name}</p>{p.badge && <span className="rounded-full bg-lime px-2 py-0.5 text-[9px] font-extrabold text-black">{p.badge}</span>}</div>
          <p className="display text-4xl text-lime">{formatINR(p.price)} <span className="font-sans text-xs normal-case tracking-normal text-white/50">/ {p.duration}</span></p>
          <div><p className="text-[10px] uppercase tracking-widest text-white/40">Included facilities</p><p className="text-sm">{p.facilities.join(' · ')}</p></div>
          <div><p className="text-[10px] uppercase tracking-widest text-white/40">Included benefits</p><ul className="mt-1 space-y-1">{p.features.map((f) => <li key={f} className="flex gap-2 text-sm"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" />{f}</li>)}</ul></div>
          <div><p className="text-[10px] uppercase tracking-widest text-white/40">Additional charges</p><p className="text-sm text-white/70">{p.additionalCharges}</p></div>
          <Tag>{PRICING_DISCLAIMER}</Tag>
        </div>
      )
    }
    case 'timings':
      return (
        <div>
          <ul className="divide-y divide-white/10 text-sm">{timings.map((x) => <li key={x.days} className="flex justify-between gap-3 py-2"><span className="text-white/70">{x.days}</span><span className="text-right font-semibold">{x.hours}</span></li>)}</ul>
          <Tag>{TIMINGS_DISCLAIMER}</Tag>
        </div>
      )
    case 'trainers':
      return (
        <ul className="space-y-3">
          {c.trainers.map((t) => (
            <li key={t.id} className="rounded-xl border border-white/10 p-3">
              <p className="font-bold">{t.name} <span className="text-xs font-normal text-white/50">· {t.experience}</span></p>
              <p className="text-xs uppercase tracking-widest text-lime">{t.specialisation}</p>
              <p className="mt-1 text-sm text-white/70">“{t.philosophy}”</p>
              <p className="mt-1 text-[11px] text-white/40">{t.certifications.join(' · ')}</p>
            </li>
          ))}
          <Tag>Fictional placeholder profiles</Tag>
        </ul>
      )
    case 'programs':
      return (
        <ul className="space-y-2">
          {c.programs.map((p) => <li key={p.id} className="rounded-xl border border-white/10 p-3"><p className="font-bold">{p.title}</p><p className="text-sm text-white/70">{p.description}</p><p className="mt-1 text-[11px] uppercase tracking-widest text-lime">For: {p.audience}</p></li>)}
        </ul>
      )
    case 'facilities':
      return (
        <div>
          <ul className="flex flex-wrap gap-1.5">{amenities.filter((a) => a.assistant).map((a) => <li key={a.id} className="rounded-full border border-white/15 px-2.5 py-1 text-xs">{a.title}</li>)}</ul>
          <Tag>{AMENITIES_DISCLAIMER}</Tag>
        </div>
      )
    case 'contact':
      return (
        <div className="space-y-2 text-sm">
          <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lime" />{brand.contact.address}</p>
          <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-lime" />{brand.contact.phone}</p>
          <a className="btn btn-primary !px-4 !py-2.5 !text-[11px]" target="_blank" rel="noopener noreferrer" href={whatsappUrl({ source: 'assistant-lead', message: 'Hi! I have a question about Iron District Fitness.' })}><MessageCircle className="h-4 w-4" />WhatsApp enquiry</a>
          {!hasWhatsApp() && <p className="text-[11px] text-white/40">WhatsApp number not configured yet.</p>}
          <div className="grid h-24 place-items-center rounded-lg border border-dashed border-white/20 text-xs text-white/50">Google Maps placeholder</div>
          <Tag>Placeholder contact details — to be confirmed</Tag>
        </div>
      )
    case 'summary':
      return <EnquirySummary compact enquiry={c.enquiry} delivered={c.delivered} note={c.note} />
  }
}
