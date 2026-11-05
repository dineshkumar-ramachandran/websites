export const assistantConfig = {
  greeting: `Hey! Welcome to Iron District Fitness. I'm your gym assistant. How can I help you get started?`,
  disclaimer: 'Rule-based assistant · answers use sample data pending gym confirmation. No AI service is connected.',
}
export const mainMenu = [
  { id: 'membership', label: 'Membership Plans' },
  { id: 'timings', label: 'Gym Timings' },
  { id: 'trainers', label: 'Trainers' },
  { id: 'pt', label: 'Personal Training' },
  { id: 'facilities', label: 'Facilities & Amenities' },
  { id: 'programs', label: 'Workout Programs' },
  { id: 'trial', label: 'Free Trial' },
  { id: 'contact', label: 'Location & Contact' },
  { id: 'faq', label: 'General Questions' },
] as const
export const assistantSuggestions = ['Membership Plans', 'Gym Timings', 'Free Trial']
