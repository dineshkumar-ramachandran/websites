import { assistantConfig } from '../../data/assistant'
import { brand } from '../../data/brand'
import { faqs } from '../../data/faqs'
import { formatINR, memberships } from '../../data/memberships'
import { goalOptions, programs } from '../../data/programs'
import { preferenceWindows } from '../../data/timings'
import { trainers, type CoachingFocus } from '../../data/trainers'
import type { Enquiry } from '../../lib/enquiry'
import type { AssistantBrain, Ctx, FormSpec, Option, Turn } from './types'

export const MENU: Option[] = [
  { label: 'Membership Plans', to: 'membership' },
  { label: 'Gym Timings', to: 'timings' },
  { label: 'Trainers', to: 'trainers' },
  { label: 'Personal Training', to: 'pt' },
  { label: 'Facilities & Amenities', to: 'facilities' },
  { label: 'Workout Programs', to: 'programs' },
  { label: 'Free Trial', to: 'trial' },
  { label: 'Location & Contact', to: 'contact' },
  { label: 'General Questions', to: 'faq' },
]
const mainMenu: Option = { label: 'Main menu', to: 'menu' }
const t = (text: string) => ({ kind: 'text' as const, text })

const timeLabels = preferenceWindows.map((w) => w.label)
const goalLabels = goalOptions.map((g) => g.label)
const memberLabels = memberships.map((m) => m.name)

function leadForm(ctx: Ctx): FormSpec {
  return {
    id: 'lead', submitLabel: 'Prepare my enquiry',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, value: ctx.name },
      { name: 'phone', label: 'Mobile number', type: 'tel', required: true, value: ctx.phone, placeholder: '98XXXXXXXX' },
      { name: 'email', label: 'Email', type: 'email', value: ctx.email },
      { name: 'membership', label: 'Interested membership', type: 'select', options: ['Not sure yet', ...memberLabels], value: ctx.membership },
      { name: 'goal', label: 'Fitness goal', type: 'select', options: ['Not sure yet', ...goalLabels], value: ctx.goal },
      { name: 'personalTraining', label: 'Personal training?', type: 'select', options: ['Not needed', 'Interested in 1-on-1', 'Interested in group training', 'Need help deciding'], value: ctx.personalTraining },
      { name: 'timing', label: 'Preferred workout timing', type: 'select', options: ['No preference', ...timeLabels], value: ctx.timing },
    ],
  }
}
const trialForm = (ctx: Ctx): FormSpec => ({
  id: 'trial', submitLabel: 'Prepare trial request',
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, value: ctx.name },
    { name: 'phone', label: 'Mobile number', type: 'tel', required: true, value: ctx.phone, placeholder: '98XXXXXXXX' },
    { name: 'preferredDate', label: 'Preferred date', type: 'date', required: true },
    { name: 'timing', label: 'Preferred time', type: 'select', required: true, options: timeLabels, value: ctx.timing },
    { name: 'goal', label: 'Fitness goal', type: 'select', required: true, options: goalLabels, value: ctx.goal },
  ],
})

const focusOptions: { label: string; focus: CoachingFocus }[] = [
  { label: 'Weight loss', focus: 'weight-loss' }, { label: 'Muscle building', focus: 'muscle' }, { label: 'Strength training', focus: 'strength' },
  { label: 'General fitness', focus: 'general' }, { label: 'Beginner guidance', focus: 'beginner' },
]

/** Build the enquiry object from a submitted form (also used by the Assistant UI). */
export function enquiryFromForm(id: 'lead' | 'trial', v: Record<string, string>, ctx: Ctx): Enquiry {
  const clean = (x?: string) => (x && !/^(Not sure yet|No preference|Not needed)$/.test(x) ? x : undefined)
  if (id === 'trial') return { source: 'assistant-trial', name: v.name, phone: v.phone, preferredDate: v.preferredDate, timing: v.timing, goal: v.goal, message: 'Free trial request' }
  return { source: 'assistant-lead', name: v.name, phone: v.phone, email: v.email || undefined, membership: clean(v.membership), goal: clean(v.goal), personalTraining: v.personalTraining, timing: clean(v.timing), frequency: ctx.frequency, experience: ctx.experience }
}

function respond(node: string, ctx: Ctx): Turn {
  const [head, arg] = [node.split(':')[0], node.split(':').slice(1).join(':')]
  switch (head) {
    case 'menu':
      return { messages: [t('Here\'s what I can help with. Choose a topic:')], options: MENU }

    case 'membership':
      return {
        messages: [t('Which membership would you like to explore?')],
        options: [...memberships.map((m) => ({ label: `${m.short} – ${formatINR(m.price)}`, to: `plan:${m.id}`, set: { membership: m.name } })), mainMenu],
      }
    case 'plan': {
      const plan = memberships.find((m) => m.id === arg)
      if (!plan) return respond('membership', ctx)
      return {
        messages: [t(`Here are the details for the ${plan.name}. (Illustrative pricing — to be confirmed by the gym.)`), { kind: 'plan', plan }, t('Would you like to speak with our membership team?')],
        options: [{ label: 'Yes, contact me', to: 'lead', set: { membership: plan.name } }, { label: 'Explore other plans', to: 'membership' }, mainMenu],
        ctx: { membership: plan.name },
      }
    }

    case 'timings':
      return {
        messages: [t('Here are our sample opening hours (to be confirmed):'), { kind: 'timings' }, t('When do you usually prefer working out?')],
        options: [...preferenceWindows.map((w) => ({ label: w.label, to: `time:${w.id}`, set: { timing: w.label } })), mainMenu],
      }
    case 'time': {
      const w = preferenceWindows.find((x) => x.id === arg)
      if (!w) return respond('timings', ctx)
      return {
        messages: [t(w.response), t('Note: these are sample hours. I can’t show live crowd levels or slot availability — the team can advise on quieter times once confirmed.')],
        options: [{ label: 'See other times', to: 'timings' }, { label: 'Request a free trial', to: 'trial' }, mainMenu],
      }
    }

    case 'trainers':
      return {
        messages: [t('What type of fitness coaching are you looking for?')],
        options: [...focusOptions.map((f) => ({ label: f.label, to: `coach:${f.focus}`, set: { goal: f.label } })), mainMenu],
      }
    case 'coach': {
      const list = trainers.filter((x) => x.focus.includes(arg as CoachingFocus))
      return {
        messages: [t('These are fictional sample trainer profiles that match — real profiles will replace them.'), { kind: 'trainers', trainers: list.length ? list : trainers.slice(0, 2) }, t('Want a trainer consultation? Availability and pricing are enquiry-based.')],
        options: [{ label: 'Request trainer consultation', to: 'lead', set: { personalTraining: 'Interested in 1-on-1' } }, { label: 'Other coaching types', to: 'trainers' }, mainMenu],
      }
    }

    case 'pt':
      return {
        messages: [t('Would you prefer one-on-one personal training?')],
        options: [
          { label: 'Yes, I need a dedicated trainer', to: 'ptyes', set: { personalTraining: 'Interested in 1-on-1' } },
          { label: 'No, regular gym access is enough', to: 'ptno' },
          { label: 'I want group training', to: 'ptgroup', set: { personalTraining: 'Interested in group training' } },
          { label: 'I need help deciding', to: 'pthelp', set: { personalTraining: 'Need help deciding' } },
          mainMenu,
        ],
      }
    case 'ptno':
      return { messages: [t('Regular membership gives you gym access, a fitness assessment and group sessions (per plan) — you train on your own schedule, self-guided. Personal training is optional and can be added later.')], options: [{ label: 'View membership plans', to: 'membership' }, { label: 'Actually, tell me about 1-on-1', to: 'ptyes', set: { personalTraining: 'Interested in 1-on-1' } }, mainMenu] }
    case 'ptgroup':
      return { messages: [t('Group training is coach-led and community-driven: structured workouts at scheduled times. Group workout sessions are listed in every sample plan; class schedules and capacity are still to be confirmed.')], options: [{ label: 'Request a free trial', to: 'trial' }, { label: 'Talk to the team', to: 'lead' }, mainMenu] }
    case 'pthelp':
      return { messages: [t('Quick guide:\n• Regular membership — self-guided, lowest cost.\n• Group training — coach-led, social, scheduled.\n• One-on-one — dedicated coach, personalised plan, form correction, progress tracking, flexible schedule. Optional add-on; pricing is enquiry-based.\n\nIf you’re new or have a specific goal, 1-on-1 is usually the fastest route — the team can advise.')], options: [{ label: 'Yes, I need a dedicated trainer', to: 'ptyes', set: { personalTraining: 'Interested in 1-on-1' } }, { label: 'Talk to the team', to: 'lead' }, mainMenu] }
    case 'ptyes':
      return { messages: [t('Great choice. One-on-one training means a dedicated coach, a personalised plan, progress tracking, form correction and flexible scheduling. It’s an optional add-on, not included in membership, with enquiry-based pricing.'), t('First — what is your fitness goal?')], options: goalOptions.map((g) => ({ label: g.label, to: 'ptq2', set: { goal: g.label } })) }
    case 'ptq2':
      return { messages: [t('When would you prefer to train?')], options: preferenceWindows.map((w) => ({ label: w.label, to: 'ptq3', set: { timing: w.label } })) }
    case 'ptq3':
      return { messages: [t('How often would you like to train?')], options: ['2 days a week', '3 days a week', '4–5 days a week', 'Not sure yet'].map((f) => ({ label: f, to: 'ptq4', set: { frequency: f } })) }
    case 'ptq4':
      return { messages: [t('And your experience level?')], options: ['Beginner', 'Intermediate', 'Advanced'].map((f) => ({ label: f, to: 'ptsum', set: { experience: f } })) }
    case 'ptsum': {
      const enquiry: Enquiry = { source: 'assistant-pt', personalTraining: 'One-on-one personal training', goal: ctx.goal, timing: ctx.timing, frequency: ctx.frequency, experience: ctx.experience }
      return {
        messages: [t('Here’s your personal training enquiry summary. Trainer availability and pricing are not confirmed — the team will advise.'), { kind: 'summary', enquiry, delivered: false, note: 'Not sent yet. Add your contact details to complete the enquiry, or share via WhatsApp.' }],
        options: [{ label: 'Add my contact details', to: 'lead', set: { personalTraining: 'Interested in 1-on-1' } }, { label: 'Start over', to: 'pt' }, mainMenu],
      }
    }

    case 'facilities':
      return { messages: [t('Sample facilities (pending confirmation before publishing):'), { kind: 'facilities' }], options: [{ label: 'Request a free trial', to: 'trial' }, { label: 'Location & contact', to: 'contact' }, mainMenu] }

    case 'programs':
      return { messages: [t('What is your main fitness goal?')], options: [...goalOptions.map((g) => ({ label: g.label, to: `goal:${g.id}`, set: { goal: g.label } })), mainMenu] }
    case 'goal': {
      const list = programs.filter((p) => p.goals.includes(arg as never)).slice(0, 4)
      return {
        messages: [t('Based on that goal, these programs fit well:'), { kind: 'programs', programs: list }, t('Our team can help you choose the right mix.')],
        options: [{ label: 'Request a free trial', to: 'trial' }, { label: 'Choose another goal', to: 'programs' }, mainMenu],
      }
    }

    case 'trial':
      return { messages: [t('Want to experience the gym before joining?'), t('Share a few details and I’ll prepare a trial request. Trial availability is not guaranteed until the team confirms.')], form: trialForm(ctx), options: [mainMenu] }
    case 'lead':
      return { messages: [t('Happy to connect you with our team. Please share your details:')], form: leadForm(ctx), options: [mainMenu] }

    case 'contact':
      return { messages: [t(`We’re in ${brand.city}.`), { kind: 'contact' }], options: [{ label: 'Request a free trial', to: 'trial' }, { label: 'Talk to the team', to: 'lead' }, mainMenu] }

    case 'faq':
      return { messages: [t('Common questions — tap one:')], options: [...faqs.map((f) => ({ label: f.q, to: `faqa:${f.id}` })), mainMenu] }
    case 'faqa': {
      const f = faqs.find((x) => x.id === arg)
      if (!f) return respond('faq', ctx)
      return { messages: [t(f.a)], options: [{ label: 'More questions', to: 'faq' }, { label: 'Talk to the team', to: 'lead' }, mainMenu] }
    }
    default:
      return respond('menu', ctx)
  }
}

const rules: [RegExp, string][] = [
  [/price|cost|fee|plan|member|₹|rupee|join|annual|monthly/i, 'membership'],
  [/time|hour|open|close|timing/i, 'timings'],
  [/personal|1.?on.?1|one.on.one/i, 'pt'],
  [/train(er|ers)|coach/i, 'trainers'],
  [/facilit|amenit|locker|shower|parking|wifi|wi-fi/i, 'facilities'],
  [/program|workout|class|hiit|goal|weight|muscle/i, 'programs'],
  [/trial|visit|try/i, 'trial'],
  [/where|location|address|contact|phone|whatsapp|map|call/i, 'contact'],
  [/hello|hi\b|hey|menu|help/i, 'menu'],
]
const words = (s: string) => s.toLowerCase().match(/[a-z]{3,}/g) ?? []

function freeText(text: string, ctx: Ctx): Turn {
  const w = new Set(words(text))
  let best: { id: string; s: number } | null = null
  for (const f of faqs) {
    const s = words(f.q).filter((x) => w.has(x)).length
    if (s >= 2 && (!best || s > best.s)) best = { id: f.id, s }
  }
  if (best) return respond(`faqa:${best.id}`, ctx)
  for (const [re, node] of rules) if (re.test(text)) return respond(node, ctx)
  return { messages: [t('I’m a simple rule-based assistant, so I may not understand every question. Pick a topic below or talk to our team.')], options: [...MENU.slice(0, 3), { label: 'Talk to the team', to: 'lead' }, mainMenu] }
}

export const ruleBrain: AssistantBrain = { respond, freeText }
export const greeting = assistantConfig.greeting
