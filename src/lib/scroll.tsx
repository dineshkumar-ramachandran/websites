import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '../hooks/useMedia'

gsap.registerPlugin(ScrollTrigger)

const LenisCtx = createContext<Lenis | null>(null)
export const useLenis = () => useContext(LenisCtx)

/** Smooth scroll provider. Disabled for reduced-motion users. Wired into ScrollTrigger. No scroll hijacking: native wheel feel, light lerp. */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduce = usePrefersReducedMotion()
  const [lenis, setLenis] = useState<Lenis | null>(null)
  useEffect(() => {
    if (reduce) { setLenis(null); return }
    const l = new Lenis({ lerp: 0.12, wheelMultiplier: 1, anchors: false })
    setLenis(l)
    const onScroll = () => ScrollTrigger.update()
    l.on('scroll', onScroll)
    const tick = (t: number) => l.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      l.off('scroll', onScroll)
      l.destroy()
      setLenis(null)
    }
  }, [reduce])
  return <LenisCtx.Provider value={lenis}>{children}</LenisCtx.Provider>
}

export function scrollToId(id: string, lenis: Lenis | null) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { duration: 1.3 })
  else el.scrollIntoView({ behavior: 'auto', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}
export { gsap, ScrollTrigger }
