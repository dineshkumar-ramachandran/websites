import { Moon, Sunrise } from 'lucide-react'
import { slots, timings, TIMINGS_DISCLAIMER } from '../../data/timings'
import { LineReveal, Reveal } from '../animations/Reveal'

export function Timings() {
  const today = new Date().getDay()
  return (
    <section id="timings" className="relative py-24 sm:py-32">
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-4">Gym timings</p>
          <LineReveal className="display text-[clamp(2.6rem,6vw,5.5rem)]" lines={['OPEN WHEN', <span key="x" className="text-lime">YOU ARE.</span>]} />
          <p className="sample-tag mt-5">{TIMINGS_DISCLAIMER}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[{ s: slots.morning, I: Sunrise }, { s: slots.evening, I: Moon }].map(({ s, I }, i) => (
              <Reveal key={s.title} delay={i * 0.1}>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <I className="h-6 w-6 text-lime" aria-hidden />
                  <h3 className="display mt-3 text-3xl">{s.title}</h3>
                  <p className="text-sm font-semibold text-lime">{s.window}</p>
                  <p className="mt-2 text-sm text-white/60">{s.blurb}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <div className="lg:col-span-7">
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {timings.map((t, i) => {
              const now = t.dayIdx.includes(today)
              return (
                <Reveal as="li" key={t.days} delay={i * 0.08}>
                  <div className={`flex flex-wrap items-baseline justify-between gap-2 py-7 transition-colors sm:py-9 ${now ? 'text-lime' : ''}`}>
                    <span className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest sm:text-base">{now && <span className="rounded-full bg-lime px-2 py-0.5 text-[9px] text-black">Today</span>}{t.days}</span>
                    <span className="display text-3xl sm:text-5xl">{t.hours}</span>
                  </div>
                </Reveal>
              )
            })}
          </ul>
          <p className="mt-4 text-xs text-white/40">Holiday and special-day timings subject to confirmation. Live crowd levels and slot availability are not shown.</p>
        </div>
      </div>
    </section>
  )
}
