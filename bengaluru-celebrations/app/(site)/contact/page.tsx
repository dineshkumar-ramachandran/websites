import { TextBlock } from "@/components/site-chrome";
import { listActiveLocations, listPublicHalls } from "@/lib/halls";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const [s, halls, locations] = await Promise.all([getSettings(), listPublicHalls(), listActiveLocations()]);
  return (
    <div className="container-page max-w-4xl py-10">
      <h1 className="text-4xl">Contact us</h1>
      <TextBlock text={s.page_contact_intro} className="mt-3 text-lg text-ink-soft" />
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-2xl">{s.brand_name}</h2>
          <dl className="mt-3 space-y-3">
            <div><dt className="text-sm text-ink-soft">Phone</dt><dd className="text-lg">{s.contact_phone}</dd></div>
            {s.contact_whatsapp && <div><dt className="text-sm text-ink-soft">WhatsApp</dt><dd className="text-lg">{s.contact_whatsapp}</dd></div>}
            <div><dt className="text-sm text-ink-soft">Email</dt><dd className="text-lg">{s.contact_email}</dd></div>
            <div><dt className="text-sm text-ink-soft">Office</dt><dd>{s.contact_address}</dd></div>
            <div><dt className="text-sm text-ink-soft">Hours</dt><dd>{s.contact_hours}</dd></div>
          </dl>
        </section>
        <section className="card p-5">
          <h2 className="text-2xl">Venues</h2>
          {locations.length === 0 ? (
            <p className="mt-2 text-ink-soft">Venue details coming soon.</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {halls.map((h) => (
                <li key={h.id}>
                  <a href={`/halls/${h.slug}`} className="font-semibold">{h.name}</a>
                  <span className="block text-sm text-ink-soft">{h.location_name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
