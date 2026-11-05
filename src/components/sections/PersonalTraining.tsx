import { Check } from 'lucide-react'
import { ptBenefits, ptOptions } from '../../data/personalTraining'
import { LineReveal, Reveal } from '../animations/Reveal'
import { Magnetic } from '../animations/Magnetic'
import { useAssistant } from '../../lib/assistantBus'
import { Parallax } from '../animations/Parallax'
import { Visual } from '../common/Visual'

export function PersonalTraining() {
  const { openAssistant } = useAssistant()
  return (
    <section id="personal-training" className="relative overflow-hidden bg-coal py-24 sm:py-32">
      <div className="container-x">
        <p className="eyebrow mb-4">Personal training</p>
        <LineReveal className="display text-[clamp(2.4rem,6.5vw,6rem)]" lines={['ONE GOAL.', 'ONE PLAN.', <span key="x" className="text-lime">ONE TRAINER.</span>]} />
        <p className="mt-6 max-w-2xl text-white/70">Personal training is an <strong className="text-white">optional add-on</strong> — it is not included in membership fees. Pricing is enquiry-based.</p>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {ptOptions.map((o, i) => (
            <Reveal key={o.id} delay={i * 0.1}>
              <article className={`h-full rounded-3xl border p-7 ${o.highlight ? 'border-lime bg-lime text-black' : 'border-white/10 bg-white/[0.03]'}`}>
                <p className={`text-[11px] font-bold uppercase tracking-widest ${o.highlight ? 'text-black/60' : 'text-lime'}`}>{o.tagline}</p>
                <h3 className="display mt-2 text-4xl">{o.title}</h3>
                <ul className="mt-5 space-y-2 text-sm">{o.points.map((p) => <li key={p} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />{p}</li>)}</ul>
                <p className={`mt-6 border-t pt-4 text-xs font-semibold uppercase tracking-widest ${o.highlight ? 'border-black/20' : 'border-white/10 text-white/50'}`}>{o.note}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
          <Parallax className="aspect-[16/10] rounded-3xl" speed={8} zoom={0.1}><Visual kind="rope" seed="pt-wide" alt="One-on-one coaching session (placeholder artwork)" /></Parallax>
          <div>
            <ul className="grid grid-cols-2 gap-3">{ptBenefits.map((b) => <li key={b} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold">{b}</li>)}</ul>
            <Magnetic className="mt-8"><button className="btn btn-primary" onClick={() => openAssistant('pt')}>Find Your Personal Trainer</button></Magnetic>
          </div>
        </div>
      </div>
    </section>
  )
}
