import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Home, MessageCircle, Send, X } from 'lucide-react'
import { assistantConfig } from '../../data/assistant'
import { brand } from '../../data/brand'
import { submitEnquiry } from '../../lib/enquiry'
import { useAssistant } from '../../lib/assistantBus'
import { useLenis } from '../../lib/scroll'
import { usePrefersReducedMotion } from '../../hooks/useMedia'
import { AssistantForm } from './AssistantForm'
import { RichView } from './MessageView'
import { enquiryFromForm, MENU, ruleBrain } from './ruleBrain'
import type { AssistantBrain, ChatMessage, Ctx, FormSpec, Option, Rich } from './types'

interface Snap { messages: ChatMessage[]; options?: Option[]; form?: FormSpec; ctx: Ctx }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let uid = 0
const mk = (from: 'bot' | 'user', content: Rich): ChatMessage => ({ id: ++uid, from, content })

export function Assistant({ brain = ruleBrain }: { brain?: AssistantBrain }) {
  const { open, closeAssistant, toggleAssistant, pendingFlow, consumeFlow } = useAssistant()
  const reduce = usePrefersReducedMotion()
  const lenis = useLenis()
  const delay = reduce ? 0 : 1

  const [snap, setSnap] = useState<Snap>(() => ({ messages: [mk('bot', { kind: 'text', text: assistantConfig.greeting })], options: MENU, ctx: {} }))
  const [history, setHistory] = useState<Snap[]>([])
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const snapRef = useRef(snap); snapRef.current = snap
  const token = useRef(0)
  const scroller = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)

  const commit = (s: Snap) => { snapRef.current = s; setSnap(s) }

  /** Play a bot turn with typing indicators between messages. */
  const play = useCallback(async (node: string | null, base: Snap, textInput?: string) => {
    const my = ++token.current
    const turn = textInput !== undefined ? brain.freeText(textInput, base.ctx) : brain.respond(node!, base.ctx)
    let cur: Snap = { ...base, options: undefined, form: undefined, ctx: { ...base.ctx, ...(turn.ctx ?? {}) } }
    commit(cur)
    for (const m of turn.messages) {
      setTyping(true)
      await sleep((m.kind === 'text' ? 550 : 800) * delay)
      if (token.current !== my) return
      setTyping(false)
      cur = { ...cur, messages: [...cur.messages, mk('bot', m)] }
      commit(cur)
    }
    commit({ ...cur, options: turn.options, form: turn.form })
  }, [brain, delay])

  const choose = useCallback((o: Option) => {
    const base = snapRef.current
    setHistory((h) => [...h, base])
    const next: Snap = { ...base, messages: [...base.messages, mk('user', { kind: 'text', text: o.label })], ctx: { ...base.ctx, ...(o.set ?? {}) } }
    void play(o.to, next)
  }, [play])

  const goHome = () => {
    const base = snapRef.current
    setHistory((h) => [...h, base])
    token.current++; setTyping(false)
    void play('menu', { ...base, messages: [...base.messages, mk('user', { kind: 'text', text: 'Main menu' })] })
  }
  const goBack = () => {
    setHistory((h) => {
      if (!h.length) return h
      token.current++; setTyping(false)
      commit(h[h.length - 1])
      return h.slice(0, -1)
    })
  }

  const sendText = (e: FormEvent) => {
    e.preventDefault()
    const v = text.trim()
    if (!v || typing) return
    setText('')
    const base = snapRef.current
    setHistory((h) => [...h, base])
    void play(null, { ...base, messages: [...base.messages, mk('user', { kind: 'text', text: v })] }, v)
  }

  const submitForm = async (values: Record<string, string>) => {
    const base = snapRef.current
    setHistory((h) => [...h, base])
    const id = base.form!.id
    const enquiry = enquiryFromForm(id, values, base.ctx)
    const ctx = { ...base.ctx, name: values.name, phone: values.phone }
    let cur: Snap = { messages: [...base.messages, mk('user', { kind: 'text', text: `Submitted my details (${values.name})` })], ctx }
    commit(cur)
    const my = ++token.current
    setTyping(true)
    const res = await submitEnquiry(enquiry)
    await sleep(500 * delay)
    if (token.current !== my) return
    setTyping(false)
    cur = { ...cur, messages: [...cur.messages, mk('bot', { kind: 'text', text: id === 'trial' ? `Thanks ${values.name}. Here’s your free trial request summary — it’s a request only, not a confirmed booking.` : `Thanks ${values.name}. Here’s your enquiry summary.` }), mk('bot', { kind: 'summary', enquiry, delivered: res.delivered, note: res.message })], options: [{ label: 'Main menu', to: 'menu' }] }
    commit(cur)
  }

  // Open with a requested flow (from CTAs elsewhere on the page).
  useEffect(() => {
    if (!open || !pendingFlow) return
    const flow = pendingFlow
    consumeFlow()
    const base = snapRef.current
    setHistory((h) => [...h, base])
    void play(flow, base)
  }, [open, pendingFlow, consumeFlow, play])

  // Scroll to newest content.
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }) }, [snap, typing, open, reduce])

  // Focus + Escape + mobile scroll-lock.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => closeBtn.current?.focus(), 350)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { closeAssistant(); launcher.current?.focus() } }
    window.addEventListener('keydown', esc)
    const mobile = window.matchMedia('(max-width: 639px)').matches
    if (mobile) { lenis?.stop(); document.body.style.overflow = 'hidden' }
    return () => { clearTimeout(t); window.removeEventListener('keydown', esc); if (mobile) { lenis?.start(); document.body.style.overflow = '' } }
  }, [open, closeAssistant, lenis])

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog" aria-label={`${brand.assistantName} gym assistant`}
            className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[#0b0b0b] pt-[env(safe-area-inset-top)] sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[640px] sm:max-h-[calc(100dvh-7.5rem)] sm:w-[400px] sm:rounded-3xl sm:border sm:border-white/15 sm:pt-0 sm:shadow-[0_30px_80px_-10px_rgba(0,0,0,.9)]"
            initial={{ opacity: 0, y: 40, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'bottom right' }}
          >
            <header className="flex items-center gap-2 border-b border-white/10 bg-ink px-3 py-3">
              <button onClick={goBack} disabled={!history.length} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 disabled:opacity-25"><ArrowLeft className="h-4 w-4" /></button>
              <button onClick={goHome} aria-label="Main menu" className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10"><Home className="h-4 w-4" /></button>
              <div className="ml-1 flex-1 leading-tight">
                <p className="display text-xl tracking-wider">{brand.assistantName}</p>
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/45"><span className="h-1.5 w-1.5 rounded-full bg-lime" />Rule-based · sample data</p>
              </div>
              <button ref={closeBtn} onClick={() => { closeAssistant(); launcher.current?.focus() }} aria-label="Close assistant" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-lime hover:text-black"><X className="h-4 w-4" /></button>
            </header>

            <div ref={scroller} data-lenis-prevent className="scroll-thin flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4" aria-live="polite">
              {snap.messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={m.from === 'user' ? 'flex justify-end' : 'flex'}>
                  <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.from === 'user' ? 'rounded-br-md bg-lime font-semibold text-black' : 'rounded-bl-md border border-white/10 bg-white/[0.06]'} ${m.content.kind !== 'text' ? 'w-full' : ''}`}>
                    <RichView c={m.content} />
                  </div>
                </motion.div>
              ))}
              {typing && (
                <div className="flex" aria-label="Iron Assist is typing"><div className="dot-bounce flex gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3.5"><span className="h-1.5 w-1.5 rounded-full bg-white" /><span className="h-1.5 w-1.5 rounded-full bg-white" /><span className="h-1.5 w-1.5 rounded-full bg-white" /></div></div>
              )}
              {snap.form && !typing && <AssistantForm key={snap.form.id + snap.messages.length} spec={snap.form} onSubmit={submitForm} />}
              {snap.options && !typing && (
                <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Quick replies">
                  {snap.options.map((o, i) => (
                    <motion.button key={o.label + i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => choose(o)}
                      className={`rounded-full border px-4 py-2 text-left text-[13px] font-semibold transition hover:border-lime hover:bg-lime hover:text-black ${o.to === 'menu' ? 'border-white/15 text-white/60' : 'border-lime/60 text-lime'}`}>
                      {o.label}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={sendText} className="flex items-center gap-2 border-t border-white/10 bg-ink p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a question…" aria-label="Type a message" className="field !rounded-full !py-2.5" maxLength={200} />
              <button aria-label="Send" disabled={!text.trim() || typing} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime text-black disabled:opacity-30"><Send className="h-4 w-4" /></button>
            </form>
            <p className="bg-ink px-4 pb-2 text-center text-[9px] uppercase tracking-widest text-white/30 sm:pb-2">{assistantConfig.disclaimer}</p>
          </motion.section>
        )}
      </AnimatePresence>

      <button ref={launcher} onClick={toggleAssistant} aria-label={open ? 'Close Iron Assist gym assistant' : 'Open Iron Assist gym assistant'} aria-expanded={open}
        className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[90] items-center gap-2 rounded-full bg-lime text-black shadow-[0_10px_40px_-5px_rgba(198,255,0,.5)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:bottom-6 ${open ? 'hidden sm:flex' : 'flex'} h-14 w-14 justify-center sm:h-auto sm:w-auto sm:px-5 sm:py-3.5`}>
        {!open && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-lime/40 [animation-duration:2.6s]" />}
        <span className="relative flex items-center gap-2">{open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}<span className="hidden text-[12px] font-extrabold uppercase tracking-widest sm:inline">{open ? 'Close' : 'Ask Iron Assist'}</span></span>
      </button>
    </>
  )
}
