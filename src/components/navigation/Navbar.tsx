import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { Menu, MessageCircle, X } from 'lucide-react'
import { brand, navLinks } from '../../data/brand'
import { useActiveSection } from '../../hooks/useActiveSection'
import { scrollToId, useLenis } from '../../lib/scroll'
import { useAssistant } from '../../lib/assistantBus'
import { Magnetic } from '../animations/Magnetic'

const ids = navLinks.map((n) => n.id)

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  const active = useActiveSection(ids)
  const lenis = useLenis()
  const { openAssistant } = useAssistant()
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    if (!menu) return
    lenis?.stop()
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', esc)
    return () => { lenis?.start(); document.body.style.overflow = ''; window.removeEventListener('keydown', esc) }
  }, [menu, lenis])

  const go = (id: string) => { setMenu(false); setTimeout(() => scrollToId(id, lenis), menu ? 350 : 0) }

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/10 bg-black/75 py-3 backdrop-blur-xl' : 'bg-transparent py-5'}`}>
        <nav aria-label="Primary" className="container-x flex items-center justify-between gap-4">
          <a href="#home" onClick={(e) => { e.preventDefault(); go('home') }} className="display flex items-center gap-2 text-xl tracking-wider sm:text-2xl" aria-label={`${brand.shortName} — home`}>
            <span className="grid h-8 w-8 place-items-center rounded-md bg-lime text-sm text-black">ID</span>
            <span>IRON <span className="text-lime">DISTRICT</span></span>
          </a>
          <ul className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`} onClick={(e) => { e.preventDefault(); go(l.id) }} aria-current={active === l.id ? 'page' : undefined}
                  className={`relative rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-widest transition-colors ${active === l.id ? 'text-black' : 'text-white/70 hover:text-white'}`}>
                  {active === l.id && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-lime" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                  <span className="relative">{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => openAssistant()} aria-label="Open Iron Assist gym assistant" className="hidden items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-widest text-white transition hover:border-lime hover:text-lime sm:inline-flex">
              <MessageCircle className="h-4 w-4" aria-hidden /> Gym Assistant
            </button>
            <Magnetic className="hidden md:inline-block">
              <a href="#membership" onClick={(e) => { e.preventDefault(); go('membership') }} className="btn btn-primary !py-2.5">Join Now</a>
            </Magnetic>
            <button className="grid h-11 w-11 place-items-center rounded-full border border-white/20 lg:hidden" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        <motion.div aria-hidden className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-lime" style={{ scaleX: progress }} />
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-40 flex flex-col bg-ink px-6 pb-8 pt-24 lg:hidden"
            initial={{ clipPath: 'circle(0% at calc(100% - 40px) 36px)' }} animate={{ clipPath: 'circle(150% at calc(100% - 40px) 36px)' }} exit={{ clipPath: 'circle(0% at calc(100% - 40px) 36px)' }} transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}>
            <ul className="flex flex-1 flex-col justify-center gap-1 overflow-y-auto">
              {navLinks.map((l, i) => (
                <motion.li key={l.id} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }}>
                  <a href={`#${l.id}`} onClick={(e) => { e.preventDefault(); go(l.id) }} className={`display flex items-baseline gap-4 py-1.5 text-5xl ${active === l.id ? 'text-lime' : 'text-white'}`}>
                    <span className="font-sans text-xs text-white/30">0{i + 1}</span>{l.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="grid gap-3 pt-6">
              <a href="#membership" onClick={(e) => { e.preventDefault(); go('membership') }} className="btn btn-primary">Join Now</a>
              <button className="btn btn-ghost" onClick={() => { setMenu(false); setTimeout(() => openAssistant(), 350) }}><MessageCircle className="h-4 w-4" /> Gym Assistant</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
