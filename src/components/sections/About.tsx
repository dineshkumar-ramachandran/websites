import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Check } from 'lucide-react'
import { pillars } from '../../data/brand'
import { LineReveal, Reveal } from '../animations/Reveal'
import { Parallax } from '../animations/Parallax'
import { Visual } from '../common/Visual'

export function About() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const big = useTransform(scrollYProgress, [0, 1], ['10%', '-35%'])
  const clip = useTransform(scrollYProgress, [0.05, 0.4], ['inset(18% 18% 18% 18%)', 'inset(0% 0% 0% 0%)'])
  return (
    <section id="about" ref={ref} className="relative overflow-hidden py-28 sm:py-40">
      <motion.p aria-hidden style={{ x: big }} className="display stroke-text pointer-events-none absolute left-0 top-10 whitespace-nowrap text-[22vw] opacity-30">STANDARD STANDARD</motion.p>
      <div className="container-x relative grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-7 lg:pt-24">
          <Reveal><p className="eyebrow mb-6">About the club</p></Reveal>
          <LineReveal className="display text-[clamp(2.6rem,7vw,6.5rem)]" lines={['MORE THAN A GYM.', <span key="2" className="text-lime">A DIFFERENT STANDARD.</span>]} />
          <Reveal delay={0.1} className="mt-8 max-w-2xl text-lg text-white/70">
            <p>We built Iron District around one idea: serious training should feel welcoming, not intimidating. Premium equipment, coaches who care about form, and a community that shows up — every day.</p>
          </Reveal>
          <ul className="mt-12 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {pillars.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 0.07}>
                <div className="flex gap-4 border-t border-white/10 pt-5">
                  <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime text-black"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                  <div><h3 className="font-bold uppercase tracking-wide">{p.title}</h3><p className="mt-1 text-sm text-white/55">{p.body}</p></div>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
        <div className="relative lg:col-span-5">
          <motion.div style={{ clipPath: clip }} className="relative aspect-[4/5] w-full">
            <Parallax className="h-full w-full rounded-3xl" speed={8} zoom={0.15}><Visual kind="dumbbell" seed="about-1" alt="Athlete training with dumbbells (placeholder artwork)" /></Parallax>
          </motion.div>
          <Reveal className="absolute -bottom-10 -left-6 hidden w-1/2 sm:block lg:-left-16" y={60}>
            <div className="aspect-square overflow-hidden rounded-2xl border-4 border-ink shadow-2xl"><Visual kind="kettlebell" seed="about-2" alt="Kettlebell training (placeholder artwork)" /></div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
