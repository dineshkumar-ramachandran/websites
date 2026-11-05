import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface AssistantCtx {
  open: boolean
  openAssistant: (flow?: string) => void
  closeAssistant: () => void
  toggleAssistant: () => void
  /** One-shot flow request consumed by the assistant after opening. */
  pendingFlow: string | null
  consumeFlow: () => void
}
const Ctx = createContext<AssistantCtx | null>(null)

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pendingFlow, setPending] = useState<string | null>(null)
  const openAssistant = useCallback((flow?: string) => { setPending(flow ?? null); setOpen(true) }, [])
  const closeAssistant = useCallback(() => setOpen(false), [])
  const toggleAssistant = useCallback(() => setOpen((o) => !o), [])
  const consumeFlow = useCallback(() => setPending(null), [])
  const value = useMemo(() => ({ open, openAssistant, closeAssistant, toggleAssistant, pendingFlow, consumeFlow }), [open, openAssistant, closeAssistant, toggleAssistant, pendingFlow, consumeFlow])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export function useAssistant() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAssistant outside provider')
  return c
}
