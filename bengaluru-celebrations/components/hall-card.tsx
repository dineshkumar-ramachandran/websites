import Link from "next/link";
import type { HallCard as Hall } from "@/lib/halls";
import { formatINR } from "@/lib/money";

const STATUS: Record<string, { label: string; cls: string }> = {
  available: { label: "Available on your date", cls: "bg-ok-bg text-ok" },
  partial: { label: "Some slots available", cls: "bg-warn-bg text-warn" },
  full: { label: "Fully booked on your date", cls: "bg-bad-bg text-bad" },
  closed: { label: "Not bookable on this date", cls: "bg-ivory-200 text-ink-soft" },
};

export function HallCard({ hall, date }: { hall: Hall; date?: string }) {
  const href = `/halls/${hall.slug}${date ? `?date=${date}` : ""}`;
  const st = hall.day_status ? STATUS[hall.day_status] : null;
  return (
    <article className="card flex flex-col overflow-hidden">
      <Link href={href} className="block aspect-[3/2] overflow-hidden bg-plum-100" tabIndex={-1} aria-hidden>
        {hall.cover_image_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/images/${hall.cover_image_id}`} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center text-plum-500">No photo yet</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <span>{hall.location_name}</span>
          {hall.is_demo && <span className="demo-badge">Demo listing</span>}
        </div>
        <h3 className="text-2xl">
          <Link href={href} className="text-plum-800 no-underline hover:underline">
            {hall.name}
          </Link>
        </h3>
        <p className="text-ink-soft">{hall.tagline}</p>
        <dl className="mt-1 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-ink-soft">Guests</dt>
            <dd className="font-semibold">
              {hall.capacity_min}–{hall.capacity_max}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">From</dt>
            <dd className="font-semibold">{hall.from_price_paise !== null ? formatINR(hall.from_price_paise) : "—"}</dd>
          </div>
        </dl>
        {st && <p className={`badge mt-1 self-start px-3 py-1 text-sm ${st.cls}`}>{st.label}</p>}
        <div className="mt-auto pt-3">
          <Link href={href} className="btn-outline w-full">
            View hall &amp; availability
          </Link>
        </div>
      </div>
    </article>
  );
}
