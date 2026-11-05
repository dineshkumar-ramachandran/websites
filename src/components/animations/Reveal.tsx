import { motion, useReducedMotion } from 'framer-motion'
import type { ElementType, ReactNode } from 'react'

/** Fade + rise on entering viewport. */
export function Reveal({ children, delay = 0, y = 40, className = '', as = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'li' | 'p' }) {
  const reduce = useReducedMotion()
  const M = motion[as] as ElementType
  return (
    <M className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-10% 0px' }} transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </M>
  )
}

/** Text clipping reveal: each line slides up from a clipped mask. */
export function LineReveal({ lines, className = '', lineClass = '', delay = 0, immediate = false, as = 'h2' }: { lines: ReactNode[]; className?: string; lineClass?: string; delay?: number; immediate?: boolean; as?: 'h1' | 'h2' | 'h3' | 'p' }) {
  const reduce = useReducedMotion()
  const Tag = as
  return (
    <Tag className={className}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className={`block ${lineClass}`}
            initial={reduce ? false : { y: '110%', rotate: 3 }}
            {...(immediate ? { animate: { y: 0, rotate: 0 } } : { whileInView: { y: 0, rotate: 0 }, viewport: { once: true, margin: '-10% 0px' } })}
            transition={{ duration: 1, delay: delay + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}
