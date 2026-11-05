import Link from "next/link";
import { notFound } from "next/navigation";
import { HallDetailsForm, ImagesManager, SlotsEditor } from "@/components/admin/hall-editor";
import { toForm } from "@/components/admin/hall-form-defaults";
import { adminListLocations, getHallDetail } from "@/lib/halls";
import { hhmm } from "@/lib/time";

const rupees = (p: number) => String(p / 100);

export default async function EditHall({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const hall = Number(id) > 0 ? await getHallDetail(Number(id), { includeInactive: true }) : null;
  if (!hall) notFound();
  const locations = await adminListLocations();
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/halls" className="text-sm">← All halls</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{hall.name}</h1>
        {!hall.is_active && <span className="badge bg-ink-soft text-white">Inactive</span>}
        {hall.is_active && <Link href={`/halls/${hall.slug}`} className="btn-ghost btn-sm">View public page ↗</Link>}
      </div>
      {sp.created && <p role="status" className="rounded-lg bg-ok-bg p-3 text-ok">Hall created. Add time slots and photos, then tick “Active” to publish it.</p>}
      <SlotsEditor
        hallId={hall.id}
        initial={hall.slots.map((s) => ({ id: s.id, label: s.label, start_time: hhmm(s.start_time), end_time: hhmm(s.end_time), price: rupees(s.price_paise), is_active: s.is_active }))}
      />
      <ImagesManager hallId={hall.id} initial={hall.images} />
      <HallDetailsForm hallId={hall.id} initial={toForm(hall)} locations={locations} />
    </div>
  );
}
