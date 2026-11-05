export type Goal = 'lose-weight' | 'build-muscle' | 'stamina' | 'strength' | 'overall'

export interface Program {
  id: string
  title: string
  description: string
  audience: string
  visual: string
  image?: string
  goals: Goal[]
  details: string[]
}

export const programs: Program[] = [
  { id: 'strength', title: 'Strength Training', description: 'Progressive barbell and machine programming to build raw, usable strength.', audience: 'Intermediate lifters & anyone chasing PRs', visual: 'barbell', goals: ['strength', 'build-muscle'], details: ['Compound-lift focus', 'Structured progression', 'Technique coaching'] },
  { id: 'weight-loss', title: 'Weight Loss', description: 'Metabolic circuits, strength and cardio blended for sustainable fat loss.', audience: 'Anyone starting a fat-loss journey', visual: 'run', goals: ['lose-weight', 'overall'], details: ['Calorie-burning circuits', 'Habit coaching', 'Weekly check-ins'] },
  { id: 'muscle', title: 'Muscle Building', description: 'Hypertrophy splits designed around volume, tempo and recovery.', audience: 'Lifters wanting size and shape', visual: 'dumbbell', goals: ['build-muscle', 'strength'], details: ['Push/pull/legs splits', 'Volume tracking', 'Recovery guidance'] },
  { id: 'functional', title: 'Functional Training', description: 'Sleds, kettlebells and movement patterns that transfer to real life.', audience: 'Busy professionals & all-rounders', visual: 'kettlebell', goals: ['overall', 'stamina'], details: ['Movement quality', 'Core & stability', 'Everyday strength'] },
  { id: 'hiit', title: 'HIIT Workouts', description: 'Short, savage intervals that spike heart rate and torch calories.', audience: 'Time-poor members who like intensity', visual: 'bolt', goals: ['lose-weight', 'stamina'], details: ['20–40 min sessions', 'Group energy', 'Scalable intensity'] },
  { id: 'cardio', title: 'Cardio Training', description: 'Run, row, ride — build the engine that powers every other goal.', audience: 'Everyone, any fitness level', visual: 'heart', goals: ['stamina', 'lose-weight', 'overall'], details: ['Zone-based plans', 'Endurance builds', 'Heart-health focus'] },
  { id: 'pt', title: 'Personal Training', description: 'One coach. One plan. Fully tailored to your goal and schedule.', audience: 'Anyone wanting dedicated guidance', visual: 'rope', goals: ['overall', 'strength', 'build-muscle', 'lose-weight'], details: ['1-on-1 coaching', 'Custom programming', 'Form correction'] },
  { id: 'beginner', title: 'Beginner Fitness', description: 'A gentle, structured on-ramp with form-first coaching and zero intimidation.', audience: 'First-timers & returners', visual: 'seed', goals: ['overall', 'lose-weight'], details: ['Orientation session', 'Basic movement patterns', 'Confidence building'] },
  { id: 'mobility', title: 'Mobility & Flexibility', description: 'Unlock range, reduce stiffness and recover faster between hard sessions.', audience: 'Desk workers & active recovery days', visual: 'wave', goals: ['overall', 'stamina'], details: ['Stretch flows', 'Joint prep', 'Recovery routines'] },
]

export const goalOptions: { id: Goal; label: string }[] = [
  { id: 'lose-weight', label: 'Lose weight' },
  { id: 'build-muscle', label: 'Build muscle' },
  { id: 'stamina', label: 'Improve stamina' },
  { id: 'strength', label: 'Increase strength' },
  { id: 'overall', label: 'Improve overall fitness' },
]
