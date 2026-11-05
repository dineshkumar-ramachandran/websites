import { useEffect, useState } from 'react'

export function useMediaQuery(query: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setM(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return m
}
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
export const useFinePointer = () => useMediaQuery('(hover: hover) and (pointer: fine)')
