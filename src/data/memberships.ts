export interface Membership {
  id: string
  name: string
  short: string
  price: number
  months: number
  duration: string
  badge?: 'POPULAR' | 'BEST VALUE'
  features: string[]
  facilities: string[]
  additionalCharges: string
}

/** ILLUSTRATIVE PRICING — requires gym owner confirmation. Single source of truth for site + assistant. */
export const PRICING_DISCLAIMER =
  'Illustrative pricing — dummy values pending gym owner confirmation.'

export const memberships: Membership[] = [
  {
    id: 'monthly', name: 'Monthly Membership', short: 'Monthly', price: 2499, months: 1, duration: '1 Month',
    features: ['Gym access', 'Standard equipment access', 'General fitness assessment', 'Group workout sessions'],
    facilities: ['Strength & cardio floor', 'Free weights', 'Locker access'],
    additionalCharges: 'Joining fee, GST and personal training are not confirmed — ask the membership team.',
  },
  {
    id: 'quarterly', name: 'Three Month Membership', short: '3 Months', price: 6499, months: 3, duration: '3 Months',
    features: ['Gym access', 'Fitness assessment', 'Group workout sessions', 'Basic fitness guidance'],
    facilities: ['Strength & cardio floor', 'Free weights', 'Locker access'],
    additionalCharges: 'Joining fee, GST and personal training are not confirmed — ask the membership team.',
  },
  {
    id: 'half-yearly', name: 'Six Month Membership', short: '6 Months', price: 11499, months: 6, duration: '6 Months', badge: 'POPULAR',
    features: ['Gym access', 'Fitness assessment', 'Group workout sessions', 'Progress tracking', 'Fitness consultation'],
    facilities: ['Strength & cardio floor', 'Free weights', 'Functional zone', 'Locker access'],
    additionalCharges: 'Joining fee, GST and personal training are not confirmed — ask the membership team.',
  },
  {
    id: 'annual', name: 'Annual Membership', short: 'Annual', price: 19999, months: 12, duration: '12 Months', badge: 'BEST VALUE',
    features: ['Gym access', 'Fitness assessment', 'Group workout sessions', 'Progress tracking', 'Priority consultation', 'Membership renewal assistance'],
    facilities: ['Strength & cardio floor', 'Free weights', 'Functional zone', 'Locker access'],
    additionalCharges: 'Joining fee, GST and personal training are not confirmed — ask the membership team.',
  },
]

export const formatINR = (n: number) => '₹' + n.toLocaleString('en-IN')
export const perMonth = (m: Membership) => Math.round(m.price / m.months)
export const savingsVsMonthly = (m: Membership) => {
  const base = memberships[0]
  return Math.max(0, Math.round(base.price * m.months - m.price))
}
