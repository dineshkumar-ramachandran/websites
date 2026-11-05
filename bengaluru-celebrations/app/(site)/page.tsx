import Link from "next/link";
import { HallCard } from "@/components/hall-card";
import { SearchForm } from "@/components/search-form";
import { listActiveLocations, listPublicHalls } from "@/lib/halls";
import { getSettings } from "@/lib/settings";
import { todayIST } from "@/lib/time";
import { EVENT_TYPES } from "@/lib/validation";

export default async function HomePage() {
  const [settings, locations, halls] = await Promise.all([getSettings(), listActiveLocations(), listPublicHalls()]);
  return (
    <>
      <section className="relative overflow-hidden bg-plum-800 text-ivory-50">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 15% 20%, #C49A45 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, #E4C98C 0 1.5px, transparent 2.5px)", backgroundSize: "120px 120px, 90px 90px" }} />
        <div className="container-page relative py-14 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-300">Party halls across Bengaluru</p>
          <h1 className="mt-3 max-w-3xl text-4xl text-ivory-50 sm:text-5xl">Find the right hall for your celebration — and see what’s free before you call.</h1>
          <p className="mt-4 max-w-2xl text-lg text-ivory-200">
            Birthdays, engagements, receptions, baby showers and team gatherings. Pick a location and date, check live availability, and reserve your slot online.
          </p>
          <div className="mt-8 rounded-2xl bg-ivory-50 p-5 text-ink shadow-card sm:p-6">
            <SearchForm locations={locations} minDate={todayIST()} />
          </div>
        </div>
      </section>

      <section className="container-page py-12" aria-labelledby="events-h">
        <h2 id="events-h" className="text-3xl">Every kind of get-together</h2>
        <div className="ornament !mx-0" />
        <ul className="mt-4 flex flex-wrap gap-2">
          {EVENT_TYPES.filter((e) => e.value !== "other").map((e) => (
            <li key={e.value} className="rounded-full border border-gold-500 bg-ivory-50 px-4 py-2 text-plum-800">
              {e.label}
            </li>
          ))}
          <li className="rounded-full border border-ivory-300 px-4 py-2 text-ink-soft">…and more</li>
        </ul>
      </section>

      <section className="container-page pb-4" aria-labelledby="halls-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="halls-h" className="text-3xl">Our halls</h2>
            <p className="text-ink-soft">{halls.length} {halls.length === 1 ? "hall" : "halls"} across {locations.length} {locations.length === 1 ? "location" : "locations"}.</p>
          </div>
          <Link href="/halls" className="btn-outline">
            Browse &amp; filter all halls
          </Link>
        </div>
        {halls.length === 0 ? (
          <p className="card mt-6 p-6 text-ink-soft">No halls are open for booking right now. Please check back soon or contact us.</p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {halls.map((h) => (
              <HallCard key={h.id} hall={h} />
            ))}
          </div>
        )}
      </section>

      <section className="container-page py-12" aria-labelledby="how-h">
        <h2 id="how-h" className="text-3xl">How booking works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["Choose a hall and date", "Each hall has its own calendar. Booked times are greyed out and can’t be selected."],
            ["Pick a slot and add details", "Select a time slot or the full day, then tell us about your event."],
            [`Review and pay within ${settings.hold_minutes} minutes`, "We hold your slot while you check the price breakdown and pay. You’ll get a booking reference."],
          ].map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="font-display text-3xl text-gold-700">{i + 1}</span>
              <h3 className="mt-1 text-xl">{t}</h3>
              <p className="mt-2 text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {locations.length > 0 && (
        <section className="container-page pb-4" aria-labelledby="loc-h">
          <h2 id="loc-h" className="text-3xl">Locations</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {locations.map((l) => (
              <li key={l.id}>
                <Link href={`/halls?location=${l.slug}`} className="card block p-4 no-underline hover:border-gold-500">
                  <span className="font-display text-xl text-plum-800">{l.name}</span>
                  <span className="block text-sm text-ink-soft">{l.area_description}</span>
                  <span className="mt-1 block text-sm text-plum-500">
                    {l.hall_count} {Number(l.hall_count) === 1 ? "hall" : "halls"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
