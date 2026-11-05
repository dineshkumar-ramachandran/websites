import { useState, type FormEvent } from 'react'
import { isValidEmail, isValidName, isValidPhone, normalisePhone } from '../../lib/validation'
import type { FormSpec } from './types'

export function AssistantForm({ spec, onSubmit, disabled }: { spec: FormSpec; onSubmit: (v: Record<string, string>) => void; disabled?: boolean }) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const today = new Date().toISOString().slice(0, 10)
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const v: Record<string, string> = {}
    spec.fields.forEach((x) => { v[x.name] = String(f.get(x.name) ?? '').trim() })
    const errs: Record<string, string> = {}
    if (!isValidName(v.name)) errs.name = 'Enter your name'
    if (!isValidPhone(v.phone)) errs.phone = 'Enter a valid 10-digit mobile number'
    else v.phone = normalisePhone(v.phone)!
    if (v.email && !isValidEmail(v.email)) errs.email = 'Enter a valid email'
    if (spec.id === 'trial') {
      if (!v.preferredDate) errs.preferredDate = 'Pick a date'
      else if (v.preferredDate < today) errs.preferredDate = 'Date can’t be in the past'
    }
    spec.fields.forEach((x) => { if (x.required && !v[x.name] && !errs[x.name]) errs[x.name] = 'Required' })
    setErrors(errs)
    if (!Object.keys(errs).length) onSubmit(v)
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4" aria-label={spec.id === 'trial' ? 'Free trial request' : 'Enquiry details'}>
      {spec.fields.map((x) => (
        <div key={x.name}>
          <label htmlFor={`af-${spec.id}-${x.name}`} className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-white/50">{x.label}{x.required && ' *'}</label>
          {x.type === 'select' ? (
            <select id={`af-${spec.id}-${x.name}`} name={x.name} defaultValue={x.value ?? (x.required ? '' : x.options?.[0])} className="field !py-2.5" aria-invalid={!!errors[x.name]}>
              {x.required && <option value="">Select…</option>}
              {x.options?.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input id={`af-${spec.id}-${x.name}`} name={x.name} type={x.type} defaultValue={x.value} min={x.type === 'date' ? today : undefined} placeholder={x.placeholder} inputMode={x.type === 'tel' ? 'tel' : undefined} autoComplete={x.name === 'name' ? 'name' : x.name === 'phone' ? 'tel' : x.name === 'email' ? 'email' : 'off'} className="field !py-2.5" aria-invalid={!!errors[x.name]} />
          )}
          {errors[x.name] && <p role="alert" className="mt-1 text-xs text-red-400">{errors[x.name]}</p>}
        </div>
      ))}
      <button disabled={disabled} className="btn btn-primary w-full !py-3">{spec.submitLabel}</button>
      <p className="text-[10px] leading-relaxed text-white/40">Frontend demo: submitting prepares a summary only. Nothing is sent to the gym until you share it via WhatsApp or a backend is connected.</p>
    </form>
  )
}
