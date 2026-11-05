import { brand } from '../data/brand'
import { timings } from '../data/timings'

/** Injects LocalBusiness JSON-LD ONLY when the owner has confirmed content. Placeholder data never reaches search engines. */
export function injectStructuredData() {
  if (!brand.contentConfirmed) return
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'HealthClub',
    name: brand.name,
    description: brand.description,
    url: brand.siteUrl || undefined,
    telephone: brand.contact.phone,
    email: brand.contact.email,
    address: { '@type': 'PostalAddress', streetAddress: brand.contact.address, addressLocality: 'Bangalore', addressRegion: 'Karnataka', addressCountry: 'IN' },
    openingHours: timings.filter((t) => t.dayIdx.length).map((t) => `${t.days}: ${t.hours}`),
  }
  const s = document.createElement('script')
  s.type = 'application/ld+json'
  s.text = JSON.stringify(ld)
  document.head.appendChild(s)
}
