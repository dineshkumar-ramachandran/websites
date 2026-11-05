import { useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { copyText, enquiryLines, enquiryText, whatsappUrl, type Enquiry } from '../../lib/enquiry'
import { hasWhatsApp } from '../../data/brand'

/** Summary + honest delivery status. Never claims the enquiry was sent unless a real transport confirms. */
export function EnquirySummary({ enquiry, delivered, note, compact = false }: { enquiry: Enquiry; delivered: boolean; note?: string; compact?: boolean }) {
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  return (
    <div className={`rounded-2xl border ${delivered ? 'border-lime/50' : 'border-amber-300/40'} bg-black/30 ${compact ? 'p-3' : 'p-5'}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${delivered ? 'text-lime' : 'text-amber-200'}`}>{delivered ? 'Enquiry sent' : 'Enquiry summary — NOT sent yet'}</p>
      {note && <p className="mt-1 text-xs text-white/60">{note}</p>}
      <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
        {enquiryLines(enquiry).map(([k, v]) => (<div key={k} className="contents"><dt className="text-white/45">{k}</dt><dd className="break-words">{v}</dd></div>))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={whatsappUrl(enquiry)} target="_blank" rel="noopener noreferrer" className="btn btn-primary !px-4 !py-2.5 !text-[11px]"><MessageCircle className="h-4 w-4" />Send via WhatsApp</a>
        <button type="button" className="btn btn-ghost !px-4 !py-2.5 !text-[11px]" onClick={async () => { setCopied((await copyText(enquiryText(enquiry))) ? 'ok' : 'fail'); setTimeout(() => setCopied(null), 2500) }}>
          {copied === 'ok' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === 'ok' ? 'Copied' : copied === 'fail' ? 'Copy failed' : 'Copy details'}
        </button>
      </div>
      {!hasWhatsApp() && <p className="mt-3 text-[11px] text-white/40">The gym’s WhatsApp number isn’t configured yet, so WhatsApp will ask you to choose a contact.</p>}
    </div>
  )
}
