import Link from "next/link";
import { HallCard } from "@/components/hall-card";
import { listActiveLocations, listAmenities, listPublicHalls } from "@/lib/halls";
import { formatDate, isValidDateString, todayIST } from "@/lib/time";

export const metadata = { title: "Party halls" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function HallsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined)) ?? "";
  const location = one("location");
  const dateRaw = one("date");
  const date = isValidDateString(dateRaw) && dateRaw >= todayIST() ? dateRaw : "";
  const guests = Math.max(0, Math.min(5000, parseInt(one("guests")) || 0));
  const maxPrice = Math.max(0, parseInt(one("maxPrice")) || 0);
  const amenities = ([] as string[]).concat(sp.amenity ?? []).slice(0, 20);
  const [locations, allAmenities, rawHalls] = await Promise.all([
    listActiveLocations(),
    listAmenities(),
    listPublicHalls({ location: location || undefined, guests: guests || undefined, maxPrice: maxPrice || undefined, amenities, date: date || undefined }),
  ]);
  // With a date, show halls with free slots first; fully booked ones stay visible but last.
  const rank = { available: 0, partial: 1, full: 2, closed: 3 } as const;
  const halls = date ? [...rawHalls].sort((a, b) => rank[a.day_status ?? "closed"] - rank[b.day_status ?? "closed"]) : rawHalls;
  const freeCount = halls.filter((h) => h.day_status === "available" || h.day_status === "partial").length;
  const activeFilters = !!(location || date || guests || maxPrice || amenities.length);

  return (
    <div className="container-page py-8">
      <h1 className="text-4xl">Party halls in Bengaluru</h1>
      <p className="mt-2 text-ink-soft">Filter by area, date, guest count, budget and amenities. Prices shown are starting prices before tax.</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[300px_1fr]">
        <form method="get" action="/halls" className="card h-fit space-y-4 p-5" aria-label="Filter halls">
          <h2 className="text-xl">Filters</h2>
          <div>
            <label htmlFor="f-location" className="label">Location</label>
            <select id="f-location" name="location" defaultValue={location} className="input">
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.slug}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-date" className="label">Event date</label>
            <input id="f-date" type="date" name="date" min={todayIST()} defaultValue={date} className="input" />
          </div>
          <div>
            <label htmlFor="f-guests" className="label">Guests</label>
            <input id="f-guests" type="number" name="guests" min={1} max={5000} inputMode="numeric" defaultValue={guests || ""} className="input" />
          </div>
          <div>
            <label htmlFor="f-price" className="label">Max starting price (₹)</label>
            <input id="f-price" type="number" name="maxPrice" min={0} step={1000} inputMode="numeric" placeholder="e.g. 50000" defaultValue={maxPrice || ""} className="input" />
          </div>
          {allAmenities.length > 0 && (
            <fieldset>
              <legend className="label">Amenities</legend>
              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {allAmenities.map((a) => (
                  <label key={a} className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded px-1 hover:bg-plum-50">
                    <input type="checkbox" name="amenity" value={a} defaultChecked={amenities.includes(a)} className="h-5 w-5 accent-plum-700" />
                    <span>{a}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <button className="btn-primary w-full" type="submit">Apply filters</button>
          {activeFilters && (
            <Link href="/halls" className="btn-ghost w-full">Clear all</Link>
          )}
        </form>

        <section aria-live="polite" aria-labelledby="results-h">
          <h2 id="results-h" className="sr-only">Results</h2>
          <p className="mb-4 text-ink-soft">
            {halls.length} {halls.length === 1 ? "hall" : "halls"} found
            {date && <> · {freeCount} with free slots on <strong className="text-ink">{formatDate(date)}</strong></>}
          </p>
          {halls.length === 0 ? (
            <div className="card p-8 text-center">
              <h3 className="text-2xl">No halls match these filters</h3>
              <p className="mt-2 text-ink-soft">Try a different location, fewer amenities, a higher budget or a smaller guest count.</p>
              <Link href="/halls" className="btn-outline mt-4">Show all halls</Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {halls.map((h) => (
                <HallCard key={h.id} hall={h} date={date || undefined} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
