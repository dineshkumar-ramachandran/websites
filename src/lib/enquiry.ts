import { brand, hasWhatsApp } from '../data/brand'

export interface Enquiry {
  source: 'contact-form' | 'assistant-lead' | 'assistant-trial' | 'assistant-pt' | 'assistant-membership'
  name?: string
  phone?: string
  email?: string
  membership?: string
  goal?: string
  personalTraining?: string
  timing?: string
  preferredDate?: string
  frequency?: string
  experience?: string
  message?: string
}

export interface SubmitResult {
  /** true ONLY if a real backend accepted the enquiry. */
  delivered: boolean
  message: string
}

/** Swap this transport to plug in WhatsApp Business API, email, CRM, Supabase or a custom backend. */
export interface EnquiryTransport {
  send(enquiry: Enquiry): Promise<SubmitResult>
}

/** Default: frontend-only demo. Nothing is transmitted. */
export const demoTransport: EnquiryTransport = {
  async send() {
    return {
      delivered: false,
      message: 'Demo mode: no backend is connected, so this enquiry has NOT been sent. Use WhatsApp or copy the details below.',
    }
  },
}

let transport: EnquiryTransport = demoTransport
export const setEnquiryTransport = (t: EnquiryTransport) => { transport = t }
export const submitEnquiry = (e: Enquiry) => transport.send(e)

const labels: Record<keyof Enquiry, string> = {
  source: 'Source', name: 'Name', phone: 'Mobile', email: 'Email', membership: 'Membership',
  goal: 'Fitness goal', personalTraining: 'Personal training', timing: 'Preferred timing',
  preferredDate: 'Preferred date', frequency: 'Frequency', experience: 'Experience', message: 'Message',
}

export const enquiryLines = (e: Enquiry): [string, string][] =>
  (Object.keys(labels) as (keyof Enquiry)[])
    .filter((k) => k !== 'source' && e[k])
    .map((k) => [labels[k], String(e[k])])

export const enquiryText = (e: Enquiry) =>
  [`New enquiry — ${brand.name}`, ...enquiryLines(e).map(([k, v]) => `${k}: ${v}`)].join('\n')

export const whatsappUrl = (e: Enquiry) => {
  const text = encodeURIComponent(enquiryText(e))
  return hasWhatsApp() ? `https://wa.me/${brand.contact.whatsapp}?text=${text}` : `https://wa.me/?text=${text}`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}
