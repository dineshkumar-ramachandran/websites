/**
 * Central brand + contact configuration.
 * EVERYTHING here is placeholder content — replace before publishing.
 */
export const brand = {
  name: 'IRON DISTRICT FITNESS',
  shortName: 'IRON DISTRICT',
  assistantName: 'IRON ASSIST',
  city: 'Bangalore, Karnataka, India',
  tagline: 'Built by discipline. Defined by strength.',
  description:
    'Premium strength & conditioning club in Bangalore — personal training, body transformation, functional fitness and a supportive community. (Sample content.)',
  /** Set true only once the gym owner has confirmed every detail. Controls the "sample content" banners and structured data. */
  contentConfirmed: false,
  siteUrl: '', // e.g. https://www.irondistrict.in — leave empty until confirmed
  contact: {
    address: '[Exact gym address — to be confirmed], Bangalore, Karnataka',
    phone: '[Phone number — to be confirmed]',
    /** digits only incl. country code, e.g. 919XXXXXXXXX. Leave '' until confirmed. */
    whatsapp: '',
    email: '[email — to be confirmed]',
    mapsEmbedUrl: '', // Paste a Google Maps embed URL here when confirmed
  },
} as const

export const hasWhatsApp = () => /^\d{10,15}$/.test(brand.contact.whatsapp)

export const navLinks = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'programs', label: 'Programs' },
  { id: 'trainers', label: 'Trainers' },
  { id: 'membership', label: 'Membership' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'contact', label: 'Contact' },
] as const

export const heroStats = [
  { value: 9, suffix: '', label: 'Programs (sample)' },
  { value: 15, suffix: '+', label: 'Amenities (sample)' },
  { value: 17, suffix: 'h', label: 'Open daily (sample)' },
]

export const milestones = [
  { value: 1200, suffix: '+', label: 'Members trained (illustrative)' },
  { value: 48, suffix: '', label: 'Weekly classes (illustrative)' },
  { value: 15, suffix: 'kg', label: 'Avg. fat loss goal (illustrative)' },
  { value: 98, suffix: '%', label: 'Goal-setting rate (illustrative)' },
]

export const pillars = [
  { title: 'Modern equipment', body: 'Selectorised, plate-loaded and free-weight zones built for serious progression.' },
  { title: 'Expert trainers', body: 'Certified coaches focused on form, safety and measurable progress.' },
  { title: 'Personalised plans', body: 'Goal-based programming from your first fitness assessment.' },
  { title: 'Clean & hygienic', body: 'Sanitised floors, fresh towels policy and a spotless locker zone.' },
  { title: 'Supportive community', body: 'Train alongside people who push you — and cheer you on.' },
]
