import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowDownRight } from 'lucide-react'
import { heroStats } from '../../data/brand'
import { LineReveal } from '../animations/Reveal'
import { Counter } from '../animations/Counter'
import { Magnetic } from '../animations/Magnetic'
import { Visual } from '../common/Visual'
import { FloatingDecor } from '../animations/Decor'
import { scrollToId, useLenis } from '../../lib/scroll'
import { useAssistant } from '../../lib/assistantBus'

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const lenis = useLenis()
  const { openAssistant } = useAssistant()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.3])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%'])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <section id="home" ref={ref} aria-label="Introduction" className="relative flex min-h-[100svh] items-end overflow-hidden pb-16 pt-32 sm:items-center sm:pb-10">
      <motion.div className="absolute inset-0" style={{ y: bgY, scale: bgScale }}>
        <Visual kind="barbell" seed="hero" alt="Cinematic gym floor with barbell and dramatic lime lighting (placeholder artwork)" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/30" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-transparent to-transparent" aria-hidden />
      <FloatingDecor />

      <motion.div style={{ y: textY, opacity: fade }} className="container-x relative z-10">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="eyebrow mb-6">Bangalore · Strength &amp; Conditioning Club</motion.p>
        <LineReveal as="h1" immediate delay={0.5} className="display text-[clamp(3.1rem,11.5vw,10.5rem)]"
          lines={['BUILT BY DISCIPLINE.', <span key="b" className="text-lime">DEFINED BY <span className="stroke-lime">STRENGTH.</span></span>]} />
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.8 }} className="mt-7 max-w-xl text-base text-white/75 sm:text-lg">
          Your transformation starts here. Train smarter, get stronger, and become the strongest version of yourself.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.8 }} className="mt-9 flex flex-wrap gap-3">
          <Magnetic><a href="#membership" onClick={(e) => { e.preventDefault(); scrollToId('membership', lenis) }} className="btn btn-primary">Explore Memberships <ArrowDownRight className="h-4 w-4" /></a></Magnetic>
          <Magnetic><button onClick={() => openAssistant('trial')} className="btn btn-ghost">Book a Free Trial</button></Magnetic>
        </motion.div>
      </motion.div>

      <motion.dl initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6, duration: 0.9 }} className="absolute bottom-28 right-8 z-10 hidden gap-3 lg:flex xl:right-12">
        {heroStats.map((s, i) => (
          <div key={s.label} className="floaty rounded-2xl border border-white/10 bg-black/40 px-5 py-4 backdrop-blur-md" style={{ animationDelay: `${-i * 1.7}s` }}>
            <dt className="text-[10px] uppercase tracking-widest text-white/50">{s.label}</dt>
            <dd className="display text-4xl text-lime"><Counter value={s.value} suffix={s.suffix} /></dd>
          </div>
        ))}
      </motion.dl>

      <div className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex" aria-hidden>
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">Scroll</span>
        <span className="relative block h-12 w-px overflow-hidden bg-white/20"><span className="scrollcue absolute inset-x-0 top-0 h-1/2 bg-lime" /></span>
      </div>
    </section>
  )
}
