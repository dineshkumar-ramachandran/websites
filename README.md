# Iron District Fitness — Premium Gym Website (Bangalore)

React 19 · TypeScript · Tailwind CSS 3 · Framer Motion · GSAP + ScrollTrigger · Lenis · Lucide.

```bash
npm install
npm run dev        # development
npm run build      # typecheck + production build
npm run lint
```

> **All content is sample/placeholder** (brand name, prices, timings, trainers, amenities,
> testimonials, contact details). Nothing here is presented as genuine.

## Where to edit content (no component edits needed)

| File | Controls |
| --- | --- |
| `src/data/brand.ts` | Brand name, city, contact (address/phone/WhatsApp/email/Maps URL), nav, hero stats, milestones, `contentConfirmed` flag |
| `src/data/memberships.ts` | **Single source of truth for pricing** (site + assistant) |
| `src/data/timings.ts` | Opening hours + assistant time-preference answers |
| `src/data/trainers.ts` | Trainer profiles (add `image` URLs for real photos) |
| `src/data/amenities.ts` | Facilities (`assistant: true` shows them in the assistant) |
| `src/data/programs.ts` | 9 programs (add `image`), goal mapping used by the assistant |
| `src/data/faqs.ts` | FAQ answers used by the assistant |
| `src/data/testimonials.ts` | Sample testimonials & illustrative stories |
| `src/data/assistant.ts` | Assistant greeting / disclaimer |

### Photography
No stock photos are bundled (licensing). Every image slot uses `<Visual />`, which renders
generated cinematic placeholder artwork. Add an `image` URL in the data file (or pass `image`
to `<Visual>`) to swap in real photography with no layout changes. Use optimised, appropriately
sized WebP/AVIF assets.

## Gym Assistant (IRON ASSIST)
* UI: `src/components/assistant/Assistant.tsx` (launcher + chat panel). Opened from the floating
  button, the top navigation, and CTAs (`useAssistant().openAssistant('trial' | 'pt' | 'plan:annual' …)`).
* Brain: `ruleBrain.ts` — deterministic, rule-based, uses the data files above. It implements the
  `AssistantBrain` interface in `types.ts`; supply an AI-backed implementation to `<Assistant brain={…} />` later.
* **No AI service is connected.**

## Enquiries / lead capture
`src/lib/enquiry.ts` defines an `EnquiryTransport`. The default `demoTransport` sends nothing and
returns `delivered: false`, so the UI always says **"NOT sent yet"** and offers WhatsApp share / copy.
Call `setEnquiryTransport(...)` with an implementation for WhatsApp Business API, email, a CRM,
Supabase or a custom backend, and return `delivered: true` only once it is really accepted.

## Before publishing — owner must replace
Brand name · prices & fees · timings · trainer profiles & certifications · amenities · testimonials
& transformation stories · address, phone, WhatsApp (`contact.whatsapp`, digits only), email, Google
Maps embed · photography · `brand.siteUrl` · then set `brand.contentConfirmed = true` (enables
LocalBusiness JSON-LD; it is intentionally omitted while content is unconfirmed) · update `<title>`/OG
tags in `index.html`.

## Motion
Lenis smooth scroll (disabled for `prefers-reduced-motion`), GSAP ScrollTrigger pinned horizontal
programs showcase (desktop only; native swipe carousel on mobile), Framer Motion reveals, parallax,
scroll-driven typography, magnetic CTAs and a custom cursor (fine pointers only). All ScrollTriggers
are created in `gsap.context()` and reverted on unmount.
