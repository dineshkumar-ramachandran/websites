export type CoachingFocus = 'weight-loss' | 'muscle' | 'strength' | 'general' | 'beginner'

/** FICTIONAL PLACEHOLDER PROFILES — not real people or real certifications. */
export interface Trainer {
  id: string
  name: string
  specialisation: string
  experience: string
  certifications: string[]
  philosophy: string
  focus: CoachingFocus[]
  visual: string
  /** Optional real photo URL once available. */
  image?: string
}

export const trainers: Trainer[] = [
  { id: 't1', name: 'Arjun Rao', specialisation: 'Strength & Conditioning', experience: '9 yrs (sample)', certifications: ['[Cert placeholder] CSCS', '[Cert placeholder] Olympic Lifting L1'], philosophy: 'Strength is a skill. Earn it with patience, technique and progressive overload.', focus: ['strength', 'muscle'], visual: 'barbell' },
  { id: 't2', name: 'Meera Nair', specialisation: 'Weight Loss & Metabolic Conditioning', experience: '7 yrs (sample)', certifications: ['[Cert placeholder] ACE-CPT', '[Cert placeholder] Nutrition Coach'], philosophy: 'Sustainable change beats crash plans — small wins, every single week.', focus: ['weight-loss', 'general'], visual: 'run' },
  { id: 't3', name: 'Kabir Shetty', specialisation: 'Muscle Building', experience: '8 yrs (sample)', certifications: ['[Cert placeholder] NASM-CPT', '[Cert placeholder] Hypertrophy Specialist'], philosophy: 'Train hard, recover harder. Muscle is built by consistency, not chaos.', focus: ['muscle', 'strength'], visual: 'dumbbell' },
  { id: 't4', name: 'Isha Menon', specialisation: 'Functional Fitness', experience: '6 yrs (sample)', certifications: ['[Cert placeholder] FMS Level 1', '[Cert placeholder] Kettlebell Instructor'], philosophy: 'Move well first, then move more. Fitness should power your everyday life.', focus: ['general', 'weight-loss'], visual: 'kettlebell' },
  { id: 't5', name: 'Rohan Iyer', specialisation: 'General & Beginner Fitness', experience: '5 yrs (sample)', certifications: ['[Cert placeholder] ACSM-CPT', '[Cert placeholder] First Aid / CPR'], philosophy: 'Everyone starts somewhere. I make your first month safe, simple and motivating.', focus: ['beginner', 'general'], visual: 'rope' },
]

export const trainerDisclaimer = 'Fictional placeholder profiles — replace with real trainers and verified certifications.'
