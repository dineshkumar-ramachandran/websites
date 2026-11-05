import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { gsap, ScrollTrigger } from '../../lib/scroll'
import { usePrefersReducedMotion } from '../../hooks/useMedia'

/** GSAP scroll parallax + zoom for a child block. Child should be taller than wrapper (use `inset-[-12%]`). */
export function Parallax({ children, speed = 15, zoom = 0, className = '' }: { children: ReactNode; speed?: number; zoom?: number; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const reduce = usePrefersReducedMotion()
  useLayoutEffect(() => {
    if (reduce || !wrap.current || !inner.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(inner.current, { yPercent: -speed, scale: 1 }, { yPercent: speed, scale: 1 + zoom, ease: 'none', scrollTrigger: { trigger: wrap.current, start: 'top bottom', end: 'bottom top', scrub: true } })
    }, wrap)
    return () => ctx.revert()
  }, [speed, zoom, reduce])
  return (
    <div ref={wrap} className={`relative overflow-hidden ${className}`}>
      <div ref={inner} className="absolute inset-[-12%] will-change-transform">{children}</div>
    </div>
  )
}

export { ScrollTrigger }
