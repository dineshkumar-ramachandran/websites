/** Configurable FAQ source — answers must not make unsupported promises. */
export interface Faq { id: string; q: string; a: string }
export const faqs: Faq[] = [
  { id: 'beginners', q: 'Is this gym suitable for beginners?', a: 'Yes — beginner fitness programs and an orientation are part of the plan (sample). Our team can guide your first sessions.' },
  { id: 'plans', q: 'Do you provide workout plans?', a: 'Plans depend on your membership. Several plans include a fitness assessment and guidance; fully personalised plans are available through personal training (enquiry-based).' },
  { id: 'pt-compulsory', q: 'Is a personal trainer compulsory?', a: 'No. Personal training is an optional add-on with enquiry-based pricing, not included in membership fees.' },
  { id: 'change', q: 'Can I change my membership?', a: 'Upgrade/transfer policies are yet to be confirmed. Please ask the membership team for the current terms.' },
  { id: 'classes', q: 'Are group classes included?', a: 'All sample plans list group workout sessions. Schedules and availability are to be confirmed.' },
  { id: 'assessment', q: 'Do you provide fitness assessments?', a: 'Yes, every sample plan lists a fitness assessment. Details will be confirmed by the gym.' },
  { id: 'joining', q: 'Is there a joining fee?', a: 'Not confirmed yet. Please ask the membership team about any joining fee, taxes or other charges.' },
  { id: 'visit', q: 'Can I visit before purchasing a membership?', a: 'You can request a free trial / visit. Availability is subject to confirmation — submit an enquiry and the team will respond.' },
  { id: 'diet', q: 'Do you provide diet guidance?', a: 'Diet guidance is not confirmed as part of any plan. Ask the team whether nutrition support is offered.' },
  { id: 'parking', q: 'Is parking available?', a: 'Parking is listed as a sample amenity and is pending confirmation.' },
]
