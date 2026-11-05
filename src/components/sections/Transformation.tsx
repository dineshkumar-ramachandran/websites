import { useRef, useState } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { ChevronsLeftRight } from 'lucide-react'
import { milestones } from '../../data/brand'
import { stories, TESTIMONIAL_DISCLAIMER } from '../../data/testimonials'
import { Counter } from '../animations/Counter'
import { Reveal } from '../animations/Reveal'
import { Visual } from '../common/Visual'

function Word({ w, range, p }: { w: string; range: [number, number]; p: MotionValue<number> }) {
  const o = useTransform(p, range, [0.12, 1])
  const c = useTransform(p, range, ['#ffffff', '#c6ff00'])
  return <motion.span style={{ opacity: o, color: c }} className="mr-[0.25em] inline-block">{w}</motion.span>
}

/** Scroll-driven typography: each word lights up as you scroll; background shifts black → charcoal-lime glow. */
function ScrollHeadline() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.4'] })
  const words = 'YOUR NEXT CHAPTER STARTS HERE.'.split(' ')
  return (
    <div ref={ref} className="relative flex min-h-[70svh] items-center">
      <h2 className="display text-[clamp(3rem,10vw,9.5rem)]">
        {words.map((w, i) => <Word key={i} w={w} p={scrollYProgress} range={[i / words.length * 0.9, (i + 1) / words.length * 0.9]} />)}
      </h2>
    </div>
  )
}

function BeforeAfter() {
  const box = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(50)
  const set = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (r) setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }
  return (
    <div>
      <div ref={box} className="relative aspect-[4/3] w-full touch-pan-y select-none overflow-hidden rounded-3xl border border-white/10 sm:aspect-[16/10]"
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); set(e.clientX) }}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') set(e.clientX) }}>
        <div className="absolute inset-0 [filter:grayscale(1)_brightness(.65)]"><Visual kind="seed" seed="before" alt="Before: illustrative placeholder" /></div>
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}><Visual kind="barbell" seed="after" alt="After: illustrative placeholder" /></div>
        <span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Before</span>
        <span className="absolute right-4 top-4 rounded-full bg-lime px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black">After</span>
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-amber-300/50 bg-black/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-200">Illustrative placeholder — not a real result</span>
        <div className="absolute inset-y-0 w-px bg-lime" style={{ left: `${pos}%` }} aria-hidden>
          <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-lime text-black shadow-xl"><ChevronsLeftRight className="h-5 w-5" /></span>
        </div>
      </div>
      <label className="mt-4 block text-xs uppercase tracking-widest text-white/50">
        Compare (drag image or use slider)
        <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} aria-label="Before and after comparison position" className="mt-2 w-full accent-[#c6ff00]" />
      </label>
    </div>
  )
}

export function Transformation() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const glow = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [0, 0.22, 0.22, 0])
  return (
    <section id="transformation" ref={ref} className="relative overflow-hidden py-24 sm:py-32">
      <motion.div aria-hidden style={{ opacity: glow }} className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#c6ff00,transparent_60%)]" />
      <div className="container-x relative">
        <p className="eyebrow">Transformation · illustrative</p>
        <ScrollHeadline />
        <div className="mt-8 grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-7"><BeforeAfter /></Reveal>
          <div className="space-y-4 lg:col-span-5">
            {stories.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.1}>
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-lime/50">
                  <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-widest text-lime">{s.tag}</span><span className="sample-tag">Illustrative</span></div>
                  <h3 className="display mt-3 text-3xl">{s.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{s.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
        <dl className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 lg:grid-cols-4">
          {milestones.map((m) => (
            <div key={m.label} className="bg-ink p-6 sm:p-8">
              <dd className="display text-5xl text-lime sm:text-7xl"><Counter value={m.value} suffix={m.suffix} /></dd>
              <dt className="mt-2 text-xs uppercase tracking-widest text-white/50">{m.label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-white/40">{TESTIMONIAL_DISCLAIMER} All figures and stories on this page are illustrative placeholders.</p>
      </div>
    </section>
  )
}
