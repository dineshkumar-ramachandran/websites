/** SAMPLE TIMINGS — pending confirmation. */
export const TIMINGS_DISCLAIMER = 'Sample timings — to be confirmed by the gym.'

export const timings = [
  { days: 'Monday – Friday', hours: '5:00 AM – 10:30 PM', dayIdx: [1, 2, 3, 4, 5] },
  { days: 'Saturday', hours: '6:00 AM – 10:00 PM', dayIdx: [6] },
  { days: 'Sunday', hours: '6:00 AM – 12:00 PM', dayIdx: [0] },
  { days: 'Public Holidays', hours: 'Subject to confirmation', dayIdx: [] as number[] },
]

export const slots = {
  morning: {
    title: 'Morning Rush',
    window: '5:00 AM – 10:00 AM',
    blurb: 'Start before the city wakes. Strength floor, functional zone and group sessions (sample).',
  },
  evening: {
    title: 'Evening Session',
    window: '5:00 PM – 10:30 PM',
    blurb: 'Decompress after work with lifting, HIIT and cardio (sample).',
  },
}

export interface PreferenceWindow { id: string; label: string; response: string }
export const preferenceWindows: PreferenceWindow[] = [
  { id: 'early', label: 'Early morning (5 AM – 8 AM)', response: 'Sample hours: Mon–Fri open from 5:00 AM, Saturday & Sunday from 6:00 AM.' },
  { id: 'morning', label: 'Morning (8 AM – 12 PM)', response: 'Sample hours: open Mon–Sat. On Sunday the gym closes at 12:00 PM.' },
  { id: 'afternoon', label: 'Afternoon (12 PM – 5 PM)', response: 'Sample hours: open Mon–Sat. Sunday is closed in the afternoon.' },
  { id: 'evening', label: 'Evening (5 PM – 10 PM)', response: 'Sample hours: Mon–Fri until 10:30 PM, Saturday until 10:00 PM. Sunday is closed in the evening.' },
]
