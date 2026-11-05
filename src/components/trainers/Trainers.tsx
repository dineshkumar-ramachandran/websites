import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { Award, Quote, Timer } from 'lucide-react'
import { trainers, trainerDisclaimer, type Trainer } from '../../data/trainers'
import { Visual } from '../common/Visual'
import { LineReveal } from '../animations/Reveal'
import { Magnetic } from '../animations/Magnetic'
import { useAssistant } from '../../lib/assistantBus'

type Tab = 'philosophy' | 'certs' | 'experience'

function Row({ t, i, active, onActive }: { t: Trainer; i: number; active: boolean; onActive: (i: number) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' })
  useEffect(() => { if (inView) onActive(i) }, [inView, i, onActive])
  return (
    <button ref={ref} onClick={() => onActive(i)} aria-pressed={active} className={`group flex w-full items-baseline gap-5 border-t border-white/10 py-8 text-left transition-opacity lg:min-h-[34vh] lg:items-center ${active ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}>
      <span className="display text-xl text-lime">0{i + 1}</span>
      <span>
        <span className="display block text-4xl sm:text-6xl">{t.name}</span>
        <span className="mt-1 block text-sm uppercase tracking-widest text-white/60">{t.specialisation}</span>
      </span>
    </button>
  )
}

function Panel({ t }: { t: Trainer }) {
  const [tab, setTab] = useState<Tab>('philosophy')
  const { openAssistant } = useAssistant()
  const tabs: { id: Tab; label: string }[] = [{ id: 'philosophy', label: 'Philosophy' }, { id: 'certs', label: 'Certifications' }, { id: 'experience', label: 'Experience' }]
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-char">
      <div className="relative aspect-[4/3] sm:aspect-[16/10]">
        <AnimatePresence mode="popLayout">
          <motion.div key={t.id} className="absolute inset-0" initial={{ clipPath: 'inset(0 0 100% 0)', scale: 1.15 }} animate={{ clipPath: 'inset(0 0 0% 0)', scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
            <Visual kind={t.visual} seed={t.id} image={t.image} alt={`${t.name}, ${t.specialisation} — fictional placeholder profile`} label="Placeholder profile" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-char via-transparent to-transparent" aria-hidden />
      </div>
      <div className="p-6 sm:p-8">
        <h3 className="display text-4xl">{t.name}</h3>
        <p className="text-sm uppercase tracking-widest text-lime">{t.specialisation}</p>
        <div role="tablist" aria-label="Trainer details" className="mt-5 flex gap-1 rounded-full border border-white/10 p-1">
          {tabs.map((x) => (
            <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} className={`relative flex-1 rounded-full px-2 py-2 text-[10px] font-bold uppercase tracking-widest sm:text-[11px] ${tab === x.id ? 'text-black' : 'text-white/60'}`}>
              {tab === x.id && <motion.span layoutId="tr-tab" className="absolute inset-0 rounded-full bg-lime" />}<span className="relative">{x.label}</span>
            </button>
          ))}
        </div>
        <div role="tabpanel" className="mt-5 min-h-[88px] text-white/75">
          <AnimatePresence mode="wait">
            <motion.div key={t.id + tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {tab === 'philosophy' && <p className="flex gap-3"><Quote className="mt-1 h-5 w-5 shrink-0 text-lime" />{t.philosophy}</p>}
              {tab === 'certs' && <ul className="space-y-2">{t.certifications.map((c) => <li key={c} className="flex items-center gap-3"><Award className="h-4 w-4 text-lime" />{c}</li>)}</ul>}
              {tab === 'experience' && <p className="flex items-center gap-3"><Timer className="h-5 w-5 text-lime" />{t.experience} · Focus: {t.specialisation}</p>}
            </motion.div>
          </AnimatePresence>
        </div>
        <Magnetic className="mt-6"><button className="btn btn-primary" onClick={() => openAssistant('pt')}>Train with {t.name.split(' ')[0]}</button></Magnetic>
      </div>
    </div>
  )
}

export function Trainers() {
  const [i, setI] = useState(0)
  return (
    <section id="trainers" className="relative py-24 sm:py-32">
      <div className="container-x">
        <p className="eyebrow mb-4">Coaches · fictional placeholders</p>
        <LineReveal className="display text-[clamp(2.6rem,7vw,6.5rem)]" lines={['TRAIN WITH', <span key="b" className="text-lime">THE BEST.</span>]} />
        <p className="sample-tag mt-5">{trainerDisclaimer}</p>
        <div className="mt-14 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:py-[8vh]" role="group" aria-label="Choose a trainer">
              {trainers.map((t, k) => <Row key={t.id} t={t} i={k} active={k === i} onActive={setI} />)}
              <div className="border-t border-white/10" />
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="lg:sticky lg:top-24"><Panel t={trainers[i]} /></div>
          </div>
        </div>
      </div>
    </section>
  )
}
