import Link from "next/link";
import { BookingForm } from "@/components/booking-form";
import { getHallDetail } from "@/lib/halls";
import { getSettings } from "@/lib/settings";
import { isValidDateString, todayIST } from "@/lib/time";
import { EVENT_TYPES } from "@/lib/validation";

export const metadata = { title: "Book a hall" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ hall?: string; date?: string; option?: string }> }) {
  const sp = await searchParams;
  const hall = sp.hall ? await getHallDetail(sp.hall) : null;
  if (!hall) {
    return (
      <div className="container-page py-12">
        <h1 className="text-3xl">Choose a hall first</h1>
        <p className="mt-2 text-ink-soft">This hall isn’t available for booking. It may have been removed or is temporarily closed.</p>
        <Link href="/halls" className="btn-primary mt-6">See available halls</Link>
      </div>
    );
  }
  const settings = await getSettings();
  const today = todayIST();
  const date = sp.date && isValidDateString(sp.date) && sp.date >= today ? sp.date : undefined;
  const option = sp.option && /^(full_day|slot:\d+)$/.test(sp.option) ? sp.option : undefined;
  return (
    <div className="container-page max-w-4xl py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <Link href={`/halls/${hall.slug}`}>← Back to {hall.name}</Link>
      </nav>
      <h1 className="mt-2 text-4xl">Book {hall.name}</h1>
      {hall.is_demo && <p className="demo-badge mt-2">Demo listing — sample hall and prices</p>}
      <div className="mt-6">
        <BookingForm
          hall={{ id: hall.id, slug: hall.slug, name: hall.name, location_name: hall.location_name, capacity_min: hall.capacity_min, capacity_max: hall.capacity_max, cleaning_fee_paise: hall.cleaning_fee_paise }}
          today={today}
          initialDate={date}
          initialOption={option}
          eventTypes={EVENT_TYPES.map((e) => ({ value: e.value, label: e.label }))}
          holdMinutes={settings.hold_minutes}
          taxPercent={settings.tax_percent}
          taxLabel={settings.tax_label}
        />
      </div>
    </div>
  );
}
