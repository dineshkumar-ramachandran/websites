import { Dumbbell, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

/** Floating decorative elements — pure CSS (cheap), hidden for reduced motion via global rule. */
export function FloatingDecor({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <Plus className="floaty absolute left-[8%] top-[18%] h-8 w-8 text-lime/40" strokeWidth={1.5} />
      <Dumbbell className="floaty absolute right-[10%] top-[30%] hidden h-14 w-14 text-white/10 sm:block" strokeWidth={1} style={{ animationDelay: '-2s' }} />
      <div className="floaty absolute bottom-[14%] left-[40%] h-3 w-3 rounded-full bg-lime/50" style={{ animationDelay: '-4s' }} />
      <div className="floaty absolute right-[24%] top-[12%] h-24 w-24 rounded-full border border-white/10" style={{ animationDelay: '-1s' }} />
    </div>
  )
}

/** Animated section divider — line draws in on view. */
export function Divider({ label }: { label?: string }) {
  return (
    <div aria-hidden className="container-x flex items-center gap-4 py-2">
      <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} className="h-px flex-1 origin-left bg-gradient-to-r from-lime via-white/20 to-transparent" />
      {label && <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-white/35">{label}</span>}
    </div>
  )
}
