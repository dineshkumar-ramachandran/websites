import type { Enquiry } from '../../lib/enquiry'
import type { Membership } from '../../data/memberships'
import type { Trainer } from '../../data/trainers'
import type { Program } from '../../data/programs'

export type Ctx = Record<string, string>

export type Rich =
  | { kind: 'text'; text: string }
  | { kind: 'plan'; plan: Membership }
  | { kind: 'timings' }
  | { kind: 'trainers'; trainers: Trainer[] }
  | { kind: 'programs'; programs: Program[] }
  | { kind: 'facilities' }
  | { kind: 'contact' }
  | { kind: 'summary'; enquiry: Enquiry; delivered: boolean; note?: string }

export interface Option { label: string; to: string; set?: Ctx }

export interface FormField {
  name: string
  label: string
  type: 'text' | 'tel' | 'email' | 'date' | 'select'
  required?: boolean
  options?: string[]
  value?: string
  placeholder?: string
}
export interface FormSpec { id: 'lead' | 'trial'; submitLabel: string; fields: FormField[] }

/** One bot turn: messages are shown sequentially, followed by quick replies and/or a form. */
export interface Turn { messages: Rich[]; options?: Option[]; form?: FormSpec; ctx?: Ctx }

export interface ChatMessage { id: number; from: 'bot' | 'user'; content: Rich }

/**
 * Future AI integration point: implement this interface with an LLM/API-backed brain
 * (e.g. calling a server route) and pass it to <Assistant brain={...} />.
 */
export interface AssistantBrain {
  respond(node: string, ctx: Ctx): Turn
  freeText(text: string, ctx: Ctx): Turn
}
