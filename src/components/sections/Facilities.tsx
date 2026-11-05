import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { amenities, AMENITIES_DISCLAIMER } from '../../data/amenities'
import { Visual } from '../common/Visual'
import { LineReveal, Reveal } from '../animations/Reveal'
import { Parallax } from '../animations/Parallax'

export function Facilities() {
  const featured = amenities.filter((a) => a.featured)
  const rest = amenities.filter((a) => !a.featured)
  const [hover, setHover] = useState<string | null>(null)
  return (
    <section id="facilities" className="relative py-24 sm:py-32">
      <div className="container-x">
        <p className="eyebrow mb-4">Facilities &amp; amenities</p>
        <LineReveal className="display text-[clamp(2.6rem,7vw,6.5rem)]" lines={['EVERYTHING', <span key="x" className="text-lime">YOU NEED.</span>]} />
        <p className="sample-tag mt-5">{AMENITIES_DISCLAIMER}</p>

        <div className="mt-14 grid gap-5 lg:grid-cols-12">
          {featured.map((a, i) => (
            <Reveal key={a.id} delay={i * 0.1} className={i === 0 ? 'lg:col-span-7 lg:row-span-2' : 'lg:col-span-5'}>
              <article className={`group relative overflow-hidden rounded-3xl ${i === 0 ? 'aspect-[4/5] sm:aspect-[16/12] lg:aspect-auto lg:h-full lg:min-h-[640px]' : 'aspect-[16/10]'}`}>
                <Parallax className="h-full w-full" speed={6} zoom={0.12}><Visual kind={a.visual} seed={a.id} alt={`${a.title} (placeholder artwork)`} /></Parallax>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" aria-hidden />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <h3 className="display text-3xl sm:text-5xl">{a.title}</h3>
                  <p className="mt-1 text-white/70">{a.blurb}</p>
                </div>
                <span className="sample-tag absolute left-5 top-5">Sample</span>
              </article>
            </Reveal>
          ))}
        </div>

        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" onMouseLeave={() => setHover(null)}>
          {rest.map((a, i) => (
            <Reveal as="li" key={a.id} delay={(i % 4) * 0.06}>
              <div onMouseEnter={() => setHover(a.id)} className="group relative h-full min-h-[132px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-lime/60">
                <AnimatePresence>{hover === a.id && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} exit={{ opacity: 0 }} className="absolute inset-0"><Visual kind={a.visual} seed={a.id} alt="" /></motion.div>}</AnimatePresence>
                <div className="relative"><h3 className="font-bold uppercase leading-tight tracking-wide">{a.title}</h3><p className="mt-1 text-xs text-white/55">{a.blurb}</p></div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
