import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { testimonials, TESTIMONIAL_DISCLAIMER } from '../../data/testimonials'
import { LineReveal } from '../animations/Reveal'
import { usePrefersReducedMotion } from '../../hooks/useMedia'

export function Testimonials() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduce = usePrefersReducedMotion()
  useEffect(() => {
    if (paused || reduce) return
    const t = setInterval(() => setI((x) => (x + 1) % testimonials.length), 5500)
    return () => clearInterval(t)
  }, [paused, reduce])
  const t = testimonials[i]
  return (
    <section id="testimonials" className="relative py-24 sm:py-32" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="container-x">
        <p className="eyebrow mb-4">Member voices · sample</p>
        <LineReveal className="display text-[clamp(2.4rem,6vw,5.5rem)]" lines={['WHAT MEMBERS', <span key="x" className="text-lime">WILL SAY.</span>]} />
        <p className="sample-tag mt-5">{TESTIMONIAL_DISCLAIMER}</p>
        <div className="relative mt-12 min-h-[320px] rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-14" aria-live="polite">
          <span aria-hidden className="display absolute right-8 top-2 text-[12rem] leading-none text-lime/10">”</span>
          <AnimatePresence mode="wait">
            <motion.figure key={i} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.5 }} className="relative">
              <div className="flex gap-1" role="img" aria-label={`${t.rating} out of 5 stars (sample)`}>{[0, 1, 2, 3, 4].map((s) => <Star key={s} className={`h-5 w-5 ${s < t.rating ? 'fill-lime text-lime' : 'text-white/20'}`} />)}</div>
              <blockquote className="display mt-6 max-w-4xl text-3xl sm:text-5xl">{t.quote}</blockquote>
              <figcaption className="mt-8 text-sm"><span className="font-bold">{t.name}</span> · <span className="text-lime">{t.goal}</span> · <span className="text-white/50">{t.experience}</span></figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
        <div className="mt-5 flex items-center gap-2" role="tablist" aria-label="Testimonials">
          {testimonials.map((_, k) => <button key={k} role="tab" aria-selected={k === i} aria-label={`Sample testimonial ${k + 1}`} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-12 bg-lime' : 'w-6 bg-white/20'}`} />)}
        </div>
      </div>
    </section>
  )
}
