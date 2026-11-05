import { useEffect, useRef, useState } from 'react'
import { useFinePointer, usePrefersReducedMotion } from '../../hooks/useMedia'

/** Custom cursor: dot + trailing ring that grows over interactive elements. Desktop fine-pointer only. */
export function Cursor() {
  const fine = useFinePointer()
  const reduce = usePrefersReducedMotion()
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState(false)
  const active = fine && !reduce
  useEffect(() => {
    if (!active) return
    document.documentElement.classList.add('custom-cursor-on')
    let tx = 0, ty = 0, rx = 0, ry = 0, raf = 0
    const move = (e: MouseEvent) => {
      tx = e.clientX; ty = e.clientY
      if (dot.current) dot.current.style.transform = `translate(${tx}px,${ty}px) translate(-50%,-50%)`
      setHover(!!(e.target as HTMLElement)?.closest('a,button,input,select,textarea,[data-cursor]'))
    }
    const loop = () => {
      rx += (tx - rx) * 0.16; ry += (ty - ry) * 0.16
      if (ring.current) ring.current.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', move, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      document.documentElement.classList.remove('custom-cursor-on')
      window.removeEventListener('mousemove', move)
      cancelAnimationFrame(raf)
    }
  }, [active])
  if (!active) return null
  return (
    <div aria-hidden className="pointer-events-none fixed left-0 top-0 z-[9999]">
      <div ref={ring} className={`fixed left-0 top-0 rounded-full border border-lime transition-[width,height,background] duration-200 ${hover ? 'h-14 w-14 bg-lime/15' : 'h-8 w-8'}`} />
      <div ref={dot} className="fixed left-0 top-0 h-1.5 w-1.5 rounded-full bg-lime" />
    </div>
  )
}
