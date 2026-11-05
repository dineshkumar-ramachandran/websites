import Link from "next/link";
import { HallDetailsForm } from "@/components/admin/hall-editor";
import { adminListLocations } from "@/lib/halls";
import { toForm } from "@/components/admin/hall-form-defaults";

export default async function NewHall() {
  const locations = await adminListLocations();
  return (
    <div className="max-w-5xl space-y-4">
      <Link href="/admin/halls" className="text-sm">← All halls</Link>
      <h1 className="text-3xl">Add a hall</h1>
      {locations.length === 0 ? (
        <p className="card p-6">Create a <Link href="/admin/locations">location</Link> first.</p>
      ) : (
        <>
          <p className="text-ink-soft">New halls start inactive. After saving you can add time slots and photos, then activate the hall.</p>
          <HallDetailsForm initial={toForm()} locations={locations} />
        </>
      )}
    </div>
  );
}
