import type { Location } from "@/lib/halls";

/** Plain GET form → /halls. Works without JavaScript. */
export function SearchForm({
  locations,
  values = {},
  minDate,
  compact = false,
}: {
  locations: Location[];
  values?: { location?: string; date?: string; guests?: string };
  minDate: string;
  compact?: boolean;
}) {
  return (
    <form action="/halls" method="get" className={`grid gap-4 ${compact ? "sm:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4"} items-end`} role="search" aria-label="Check hall availability">
      <div>
        <label htmlFor="sf-location" className="label">
          Location in Bengaluru
        </label>
        <select id="sf-location" name="location" defaultValue={values.location ?? ""} className="input">
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.slug}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="sf-date" className="label">
          Event date
        </label>
        <input id="sf-date" type="date" name="date" min={minDate} defaultValue={values.date ?? ""} className="input" />
      </div>
      <div>
        <label htmlFor="sf-guests" className="label">
          Number of guests
        </label>
        <input id="sf-guests" type="number" name="guests" min={1} max={5000} inputMode="numeric" placeholder="e.g. 120" defaultValue={values.guests ?? ""} className="input" />
      </div>
      <button type="submit" className="btn-primary w-full">
        Check Availability
      </button>
    </form>
  );
}
