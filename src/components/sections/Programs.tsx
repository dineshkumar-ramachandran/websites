import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, X } from 'lucide-react'
import { programs, type Program } from '../../data/programs'
import { gsap, ScrollTrigger } from '../../lib/scroll'
import { useIsDesktop, usePrefersReducedMotion } from '../../hooks/useMedia'
import { Visual } from '../common/Visual'
import { LineReveal } from '../animations/Reveal'
import { useAssistant } from '../../lib/assistantBus'

function ProgramCard({ p, i, onOpen }: { p: Program; i: number; onOpen: (p: Program) => void }) {
  return (
    <article className="group relative h-[62svh] w-[78vw] shrink-0 snap-center overflow-hidden rounded-3xl border border-white/10 bg-char sm:w-[52vw] lg:h-[52vh] lg:w-[34vw] xl:w-[28vw]">
      <div className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-110">
        <Visual kind={p.visual} seed={p.id} image={p.image} alt={`${p.title} (placeholder artwork)`} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" aria-hidden />
      <span className="display absolute right-5 top-4 text-7xl text-white/10 transition-colors group-hover:text-lime/40">{String(i + 1).padStart(2, '0')}</span>
      <div className="absolute inset-x-0 bottom-0 p-6">
        <h3 className="display text-4xl sm:text-5xl">{p.title}</h3>
        <p className="mt-2 text-sm text-white/70">{p.description}</p>
        <p className="mt-3 text-[11px] uppercase tracking-widest text-lime">For: {p.audience}</p>
        <button onClick={() => onOpen(p)} aria-label={`Explore ${p.title} program`} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition hover:border-lime hover:bg-lime hover:text-black">
          Explore program <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}

export function Programs() {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const desktop = useIsDesktop()
  const reduce = usePrefersReducedMotion()
  const [open, setOpen] = useState<Program | null>(null)
  const { openAssistant } = useAssistant()
  const pinned = desktop && !reduce

  useLayoutEffect(() => {
    if (!pinned || !section.current || !track.current) return
    const ctx = gsap.context(() => {
      const dist = () => Math.max(0, track.current!.scrollWidth - window.innerWidth + 80)
      gsap.to(track.current, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: section.current, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (self) => { if (bar.current) bar.current.style.transform = `scaleX(${self.progress})` } },
      })
    }, section)
    return () => ctx.revert()
  }, [pinned])

  useEffect(() => { const t = setTimeout(() => ScrollTrigger.refresh(), 600); return () => clearTimeout(t) }, [])

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  return (
    <section id="programs" ref={section} className="relative bg-coal py-20 lg:flex lg:h-screen lg:flex-col lg:justify-center lg:pb-6 lg:pt-24">
      <div className="container-x mb-10 flex flex-wrap items-end justify-between gap-6 lg:mb-6">
        <div>
          <p className="eyebrow mb-4">9 programs · sample</p>
          <LineReveal className="display text-[clamp(2.4rem,5vw,4.5rem)]" lines={[<>TRAIN YOUR <span className="text-lime">WAY.</span></>]} />
        </div>
        <p className="max-w-sm text-sm text-white/60">{pinned ? 'Keep scrolling — the showcase moves sideways as you go.' : 'Swipe to explore every program.'}</p>
      </div>
      <div className={pinned ? 'overflow-hidden' : 'scroll-thin overflow-x-auto'}>
        <div ref={track} className={`flex gap-5 px-5 sm:px-8 lg:px-12 ${pinned ? 'w-max' : 'snap-x snap-mandatory pb-4'}`}>
          {programs.map((p, i) => <ProgramCard key={p.id} p={p} i={i} onOpen={setOpen} />)}
          <div className="grid w-[60vw] shrink-0 place-items-center lg:w-[22vw]"><p className="display text-center text-4xl text-white/20">Not sure?<br /><button className="mt-3 text-lime underline-offset-4 hover:underline" onClick={() => openAssistant('programs')}>Ask Iron Assist</button></p></div>
        </div>
      </div>
      {pinned && <div className="container-x mt-8"><div className="h-px w-full bg-white/10"><div ref={bar} className="h-px origin-left scale-x-0 bg-lime" /></div></div>}

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div role="dialog" aria-modal="true" aria-label={open.title} onClick={(e) => e.stopPropagation()} initial={{ y: 60, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
              className="grid max-h-[90svh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-char md:grid-cols-2">
              <div className="aspect-[4/3] md:aspect-auto"><Visual kind={open.visual} seed={open.id} image={open.image} alt={`${open.title} (placeholder artwork)`} /></div>
              <div className="relative p-7 sm:p-10">
                <button autoFocus onClick={() => setOpen(null)} aria-label="Close" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/20 hover:border-lime"><X className="h-4 w-4" /></button>
                <h3 className="display text-5xl">{open.title}</h3>
                <p className="mt-4 text-white/70">{open.description}</p>
                <p className="mt-5 text-xs uppercase tracking-widest text-lime">Suitable for</p><p className="text-white/80">{open.audience}</p>
                <ul className="mt-5 space-y-2 text-sm text-white/70">{open.details.map((d) => <li key={d} className="flex gap-2"><span className="text-lime">▸</span>{d}</li>)}</ul>
                <p className="mt-5 text-[11px] text-white/40">Sample program details — schedules and inclusions to be confirmed.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="btn btn-primary" onClick={() => { setOpen(null); openAssistant('trial') }}>Book a free trial</button>
                  <button className="btn btn-ghost" onClick={() => { setOpen(null); openAssistant('programs') }}>Ask Iron Assist</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
