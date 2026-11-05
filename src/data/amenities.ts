/** SAMPLE AMENITIES — need confirmation before publishing. */
export const AMENITIES_DISCLAIMER = 'Sample amenities — to be confirmed before publishing.'

export interface Amenity { id: string; title: string; blurb: string; visual: string; featured?: boolean; assistant?: boolean }

export const amenities: Amenity[] = [
  { id: 'strength', title: 'Modern Strength Equipment', blurb: 'Selectorised and plate-loaded stations.', visual: 'barbell', featured: true, assistant: true },
  { id: 'cardio', title: 'Cardio Machines', blurb: 'Treadmills, bikes and rowers.', visual: 'run', assistant: true },
  { id: 'free-weights', title: 'Free Weights', blurb: 'Dumbbells, racks and platforms.', visual: 'dumbbell', featured: true, assistant: true },
  { id: 'functional', title: 'Functional Training Zone', blurb: 'Turf, sleds, ropes and rigs.', visual: 'kettlebell', featured: true, assistant: true },
  { id: 'pt-area', title: 'Personal Training Area', blurb: 'A focused space for 1-on-1 coaching.', visual: 'rope' },
  { id: 'lockers', title: 'Locker Rooms', blurb: 'Secure personal lockers.', visual: 'locker', assistant: true },
  { id: 'changing', title: 'Changing Rooms', blurb: 'Clean, private changing areas.', visual: 'locker', assistant: true },
  { id: 'showers', title: 'Shower Facilities', blurb: 'Hot & cold showers.', visual: 'drop', assistant: true },
  { id: 'water', title: 'Drinking Water', blurb: 'Filtered water stations.', visual: 'drop' },
  { id: 'ac', title: 'Air-Conditioned Space', blurb: 'Climate-controlled workout floor.', visual: 'snow', assistant: true },
  { id: 'cctv', title: 'CCTV & Security', blurb: 'Monitored premises.', visual: 'shield' },
  { id: 'parking', title: 'Parking', blurb: 'On-site / nearby parking.', visual: 'car', assistant: true },
  { id: 'wifi', title: 'Wi-Fi', blurb: 'Complimentary member Wi-Fi.', visual: 'wifi', assistant: true },
  { id: 'assessment', title: 'Fitness Assessment', blurb: 'Baseline testing and goal-setting.', visual: 'pulse' },
]
