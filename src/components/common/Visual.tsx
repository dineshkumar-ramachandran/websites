import { Activity, Car, Dumbbell, Droplets, Footprints, HeartPulse, Lock, ShieldCheck, Snowflake, Sprout, Target, Waves, Weight, Wifi, Zap, type LucideIcon } from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  barbell: Dumbbell, dumbbell: Dumbbell, run: Footprints, kettlebell: Weight, rope: Target, bolt: Zap, heart: HeartPulse,
  seed: Sprout, wave: Waves, locker: Lock, drop: Droplets, snow: Snowflake, shield: ShieldCheck, car: Car, wifi: Wifi, pulse: Activity,
}
const hues = [78, 62, 95, 150, 40, 120, 70, 100]
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

interface Props {
  kind: string
  seed?: string
  image?: string
  alt: string
  className?: string
  label?: string
}

/**
 * Cinematic placeholder artwork. Pass `image` (a real photo URL) to replace it —
 * no layout changes needed. Photography is intentionally NOT bundled (licensing).
 */
export function Visual({ kind, seed = kind, image, alt, className = '', label }: Props) {
  if (image) return <img src={image} alt={alt} loading="lazy" decoding="async" className={`h-full w-full object-cover ${className}`} />
  const h = hash(seed)
  const hue = hues[h % hues.length]
  const Icon = icons[kind] ?? Dumbbell
  const angle = 20 + (h % 50)
  const id = `v${h}`
  return (
    <div role="img" aria-label={alt} className={`grain relative h-full w-full overflow-hidden bg-[#0a0a0a] ${className}`}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <radialGradient id={`${id}a`} cx={h % 2 ? '25%' : '75%'} cy="25%" r="75%">
            <stop offset="0" stopColor={`hsl(${hue} 90% 50%)`} stopOpacity=".38" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".85" />
          </linearGradient>
        </defs>
        <rect width="400" height="500" fill="#101010" />
        <rect width="400" height="500" fill={`url(#${id}a)`} />
        <g transform={`rotate(${angle} 200 250)`} opacity=".55">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={-200 + i * 110} y="-200" width={i % 2 ? 3 : 18} height="900" fill={`hsl(${hue} 100% 55%)`} opacity={i % 2 ? 0.7 : 0.07} />
          ))}
        </g>
        <circle cx="200" cy="230" r="120" fill="none" stroke="#fff" strokeOpacity=".08" />
        <circle cx="200" cy="230" r="170" fill="none" stroke={`hsl(${hue} 100% 55%)`} strokeOpacity=".18" strokeDasharray="2 10" />
        <rect width="400" height="500" fill={`url(#${id}b)`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="h-1/3 w-1/3 text-white/90 drop-shadow-[0_0_30px_rgba(198,255,0,.35)]" strokeWidth={1} aria-hidden />
      </div>
      {label && <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-white/60 backdrop-blur">{label}</span>}
    </div>
  )
}
