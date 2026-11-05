import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'framer-motion'

export function Counter({ value, suffix = '', className = '' }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? value : 0)
  useEffect(() => {
    if (!inView || reduce) return
    const c = animate(0, value, { duration: 2, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) })
    return () => c.stop()
  }, [inView, value, reduce])
  return <span ref={ref} className={`tabular-nums ${className}`}>{n.toLocaleString('en-IN')}{suffix}</span>
}
