import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/gallery";
import { HallBookingPanel } from "@/components/hall-booking-panel";
import { TextBlock } from "@/components/site-chrome";
import { getHallDetail } from "@/lib/halls";
import { formatINR } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatTime, isValidDateString, todayIST } from "@/lib/time";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const h = await getHallDetail((await params).slug);
  return { title: h ? `${h.name}, ${h.location_name}` : "Hall not found" };
}

export default async function HallPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ date?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [hall, settings] = await Promise.all([getHallDetail(slug), getSettings()]);
  if (!hall) notFound();
  const today = todayIST();
  const initialDate = sp.date && isValidDateString(sp.date) && sp.date >= today ? sp.date : undefined;
  const activeSlots = hall.slots.filter((s) => s.is_active);

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <Link href="/halls">Halls</Link> <span aria-hidden>/</span> <Link href={`/halls?location=${hall.location_slug}`}>{hall.location_name}</Link>
      </nav>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl">{hall.name}</h1>
        {hall.is_demo && <span className="demo-badge">Demo listing — sample details</span>}
      </div>
      <p className="mt-1 text-lg text-ink-soft">{hall.tagline}</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <Gallery images={hall.images} hallName={hall.name} />
        <aside className="card h-fit p-5" aria-label="Key details">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-ink-soft">Capacity</dt>
              <dd className="text-xl font-semibold">{hall.capacity_min}–{hall.capacity_max} guests</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Starting from</dt>
              <dd className="text-xl font-semibold">{hall.from_price_paise !== null ? formatINR(hall.from_price_paise) : "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm text-ink-soft">Address</dt>
              <dd>{hall.address || "Address to be added"}</dd>
              {hall.map_url && (
                <dd>
                  <a href={hall.map_url} target="_blank" rel="noopener noreferrer">Open in maps</a>
                </dd>
              )}
            </div>
            <div className="col-span-2">
              <dt className="text-sm text-ink-soft">Booking hours</dt>
              <dd>{formatTime(hall.open_time)} – {formatTime(hall.close_time)} (IST)</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm text-ink-soft">Venue contact</dt>
              <dd>{hall.contact_name}</dd>
              <dd>{hall.contact_phone}{hall.contact_email ? ` · ${hall.contact_email}` : ""}</dd>
            </div>
          </dl>
          <a href="#availability" className="btn-primary mt-5 w-full">Check dates &amp; book</a>
        </aside>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="about-h">
          <h2 id="about-h" className="text-2xl">About this hall</h2>
          <TextBlock text={hall.description} className="mt-3" />
          <h2 className="mt-8 text-2xl">Amenities</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {hall.amenities.map((a) => (
              <li key={a} className="flex items-center gap-2">
                <span aria-hidden className="text-gold-700">✦</span> {a}
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="pricing-h" className="card h-fit p-5">
          <h2 id="pricing-h" className="text-2xl">Pricing</h2>
          {hall.is_demo && <p className="hint">Demo prices — to be replaced by the venue.</p>}
          <table className="mt-3 w-full text-left">
            <caption className="sr-only">Prices per booking option</caption>
            <thead className="text-sm text-ink-soft">
              <tr>
                <th scope="col" className="pb-2 font-semibold">Option</th>
                <th scope="col" className="pb-2 font-semibold">Time (IST)</th>
                <th scope="col" className="pb-2 text-right font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {activeSlots.map((s) => (
                <tr key={s.id} className="border-t border-ivory-300">
                  <th scope="row" className="py-2 font-semibold">{s.label}</th>
                  <td className="py-2 text-sm">{formatTime(s.start_time)}–{formatTime(s.end_time)}</td>
                  <td className="py-2 text-right">{formatINR(s.price_paise)}</td>
                </tr>
              ))}
              {hall.allow_full_day && (
                <tr className="border-t border-ivory-300">
                  <th scope="row" className="py-2 font-semibold">Full day</th>
                  <td className="py-2 text-sm">{formatTime(hall.open_time)}–{formatTime(hall.close_time)}</td>
                  <td className="py-2 text-right">{formatINR(hall.full_day_price_paise)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <ul className="mt-3 space-y-1 text-sm text-ink-soft">
            {hall.cleaning_fee_paise > 0 && <li>Cleaning fee: {formatINR(hall.cleaning_fee_paise)} per booking</li>}
            {settings.tax_percent > 0 && <li>{settings.tax_label} at {settings.tax_percent}% is added at checkout</li>}
            <li>Includes {hall.setup_buffer_min} min setup before and {hall.cleanup_buffer_min} min clean-up after your slot</li>
            {hall.min_notice_hours > 0 && <li>Online bookings need at least {hall.min_notice_hours} hours’ notice</li>}
          </ul>
        </section>
      </div>

      <section id="availability" aria-labelledby="avail-h" className="mt-10 scroll-mt-4">
        <h2 id="avail-h" className="text-3xl">Availability</h2>
        <p className="mb-4 mt-1 text-ink-soft">Booked dates and times are shown as unavailable and can’t be selected.</p>
        <HallBookingPanel hallId={hall.id} hallSlug={hall.slug} today={today} initialDate={initialDate} />
      </section>

      <section aria-labelledby="policy-h" className="mt-10">
        <h2 id="policy-h" className="text-2xl">Hall policies</h2>
        <TextBlock text={hall.policies || "Policies to be added by the venue."} className="mt-3" />
        <p className="mt-2">
          See also our <Link href="/cancellation-policy">cancellation policy</Link>.
        </p>
      </section>
    </div>
  );
}
