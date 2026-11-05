import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AssistantProvider } from './lib/assistantBus'
import { SmoothScroll } from './lib/scroll'
import { Navbar } from './components/navigation/Navbar'
import { Hero } from './components/hero/Hero'
import { Marquee } from './components/sections/Marquee'
import { About } from './components/sections/About'
import { Programs } from './components/sections/Programs'
import { Transformation } from './components/sections/Transformation'
import { Trainers } from './components/trainers/Trainers'
import { Facilities } from './components/sections/Facilities'
import { Membership } from './components/membership/Membership'
import { Timings } from './components/sections/Timings'
import { PersonalTraining } from './components/sections/PersonalTraining'
import { Testimonials } from './components/sections/Testimonials'
import { ContactSection } from './components/forms/ContactSection'
import { Footer } from './components/sections/Footer'
import { Assistant } from './components/assistant/Assistant'
import { Cursor } from './components/animations/Cursor'
import { Divider } from './components/animations/Decor'
import { brand } from './data/brand'

function Loader({ done }: { done: boolean }) {
  return (
    <AnimatePresence>
      {!done && (
        <motion.div className="fixed inset-0 z-[200] grid place-items-center bg-ink" exit={{ clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }} aria-hidden>
          <div className="text-center">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="display text-5xl sm:text-7xl">IRON <span className="text-lime">DISTRICT</span></motion.p>
            <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, ease: 'easeInOut' }} className="mx-auto mt-4 block h-0.5 w-40 origin-left bg-lime" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), 1200); return () => clearTimeout(t) }, [])
  return (
    <AssistantProvider>
      <SmoothScroll>
        <Loader done={ready} />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded focus:bg-lime focus:px-4 focus:py-2 focus:text-black">Skip to content</a>
        <Navbar />
        {!brand.contentConfirmed && (
          <p className="sr-only">This is a sample website. Prices, timings, trainers, amenities and contact details are placeholders pending confirmation.</p>
        )}
        <main id="main">
          <Hero />
          <Marquee words={['STRENGTH', 'DISCIPLINE', 'CONDITIONING', 'COMMUNITY', 'TRANSFORMATION']} />
          <About />
          <Programs />
          <Transformation />
          <Divider label="Coaches" />
          <Trainers />
          <Divider label="Facilities" />
          <Facilities />
          <Membership />
          <Timings />
          <PersonalTraining />
          <Testimonials />
          <ContactSection />
        </main>
        <Footer />
        <Assistant />
        <Cursor />
      </SmoothScroll>
    </AssistantProvider>
  )
}
