import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { brand, navLinks } from '../../data/brand'
import { scrollToId, useLenis } from '../../lib/scroll'

/** Footer reveal: sits beneath content and the giant wordmark rises into view on scroll. */
export function Footer() {
  const ref = useRef<HTMLElement>(null)
  const lenis = useLenis()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], ['40%', '0%'])
  return (
    <footer ref={ref} className="relative overflow-hidden border-t border-white/10 bg-ink pb-28 pt-20 lg:pb-12">
      <div className="container-x">
        <div className="grid gap-10 sm:grid-cols-3">
          <div className="sm:col-span-1"><p className="display text-3xl">{brand.shortName}</p><p className="mt-2 text-sm text-white/50">{brand.city}</p></div>
          <ul className="grid grid-cols-2 gap-2 text-sm sm:col-span-2 sm:grid-cols-4">
            {navLinks.map((l) => <li key={l.id}><a href={`#${l.id}`} onClick={(e) => { e.preventDefault(); scrollToId(l.id, lenis) }} className="text-white/60 hover:text-lime">{l.label}</a></li>)}
          </ul>
        </div>
        <motion.p aria-hidden style={{ y }} className="display mt-16 select-none text-center text-[17vw] leading-[0.85] text-white/[0.06]">IRON DISTRICT</motion.p>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {brand.name}. Sample website — prices, timings, trainers, amenities, testimonials and contact details are placeholders pending confirmation.</p>
          <button onClick={() => scrollToId('home', lenis)} className="text-left uppercase tracking-widest hover:text-lime">Back to top ↑</button>
        </div>
      </div>
    </footer>
  )
}
