import { useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useFinePointer } from '../../hooks/useMedia'

/** Magnetic hover wrapper — pulls child toward the pointer. Desktop/fine-pointer only. */
export function Magnetic({ children, strength = 0.35, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const fine = useFinePointer()
  const reduce = useReducedMotion()
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 })
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 })
  const on = fine && !reduce
  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      style={on ? { x, y } : undefined}
      onMouseMove={(e) => {
        if (!on || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onMouseLeave={() => { x.set(0); y.set(0) }}
    >
      {children}
    </motion.div>
  )
}
