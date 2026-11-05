import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { formatINR, memberships, perMonth, PRICING_DISCLAIMER, savingsVsMonthly } from '../../data/memberships'
import { LineReveal } from '../animations/Reveal'
import { Magnetic } from '../animations/Magnetic'
import { useAssistant } from '../../lib/assistantBus'

export function Membership() {
  const { openAssistant } = useAssistant()
  const [perMo, setPerMo] = useState(false)
  return (
    <section id="membership" className="relative bg-coal py-24 sm:py-32">
      <div className="container-x">
        <p className="eyebrow mb-4">Membership</p>
        <LineReveal className="display text-[clamp(2.6rem,7vw,6.5rem)]" lines={['CHOOSE YOUR', <span key="x" className="text-lime">COMMITMENT.</span>]} />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="sample-tag">{PRICING_DISCLAIMER}</p>
          <div role="group" aria-label="Price display" className="flex rounded-full border border-white/15 p-1 text-[11px] font-bold uppercase tracking-widest">
            {[{ v: false, l: 'Total price' }, { v: true, l: 'Per month' }].map((o) => (
              <button key={o.l} aria-pressed={perMo === o.v} onClick={() => setPerMo(o.v)} className={`relative rounded-full px-4 py-2 ${perMo === o.v ? 'text-black' : 'text-white/60'}`}>
                {perMo === o.v && <motion.span layoutId="price-toggle" className="absolute inset-0 rounded-full bg-lime" />}<span className="relative">{o.l}</span>
              </button>
            ))}
          </div>
        </div>
        <motion.ul className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-10%' }} transition={{ staggerChildren: 0.12 }}>
          {memberships.map((m) => {
            const hot = !!m.badge
            const sv = savingsVsMonthly(m)
            return (
              <motion.li key={m.id} variants={{ hidden: { opacity: 0, y: 70, rotateX: 12 }, show: { opacity: 1, y: 0, rotateX: 0 } }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -8 }}
                className={`relative flex flex-col rounded-3xl border p-7 ${m.badge === 'POPULAR' ? 'border-lime bg-lime/[0.06]' : m.badge ? 'border-white bg-white/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
                {m.badge && <span className={`absolute -top-3 left-7 rounded-full px-3 py-1 text-[10px] font-extrabold tracking-widest ${m.badge === 'POPULAR' ? 'bg-lime text-black' : 'bg-white text-black'}`}>{m.badge}</span>}
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/70">{m.name}</h3>
                <p className="display mt-4 text-6xl">{formatINR(perMo ? perMonth(m) : m.price)}</p>
                <p className="text-xs uppercase tracking-widest text-white/50">{perMo ? 'per month (approx.)' : m.duration}</p>
                <p className="mt-2 h-4 text-xs text-lime">{sv > 0 ? `Save ~${formatINR(sv)} vs monthly billing` : ' '}</p>
                <ul className="my-6 flex-1 space-y-2.5 text-sm text-white/75">{m.features.map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" />{f}</li>)}</ul>
                <div className="grid gap-2">
                  <Magnetic className="block"><button onClick={() => openAssistant(`plan:${m.id}`)} className={`btn w-full ${hot ? 'btn-primary' : 'btn-ghost'}`}>Join Now</button></Magnetic>
                  <button onClick={() => openAssistant(`plan:${m.id}`)} className="py-2 text-[11px] font-bold uppercase tracking-widest text-white/60 hover:text-lime">Enquire Now →</button>
                </div>
              </motion.li>
            )
          })}
        </motion.ul>
        <p className="mt-6 text-xs text-white/40">Joining fee, taxes and personal training are not included/confirmed. “Join Now” opens an enquiry — no payment is taken on this site.</p>
      </div>
    </section>
  )
}
