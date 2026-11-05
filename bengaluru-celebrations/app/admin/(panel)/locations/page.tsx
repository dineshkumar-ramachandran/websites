import { LocationForm } from "@/components/admin/location-form";
import { SortableList } from "@/components/admin/sortable-list";
import { adminListLocations } from "@/lib/halls";

export default async function AdminLocations() {
  const locs = await adminListLocations();
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl">Locations</h1>
      <p className="text-ink-soft">Bengaluru areas customers can search by. Deactivating a location hides all of its halls from new bookings (existing bookings are kept).</p>
      <section className="card p-5">
        <h2 className="mb-3 text-xl">Add a location</h2>
        <LocationForm />
      </section>
      {locs.length > 0 && (
        <SortableList
          table="locations"
          warnOnDeactivate="Deactivate {name}? All halls in this location will be hidden from new bookings."
          rows={locs.map((l) => ({ id: l.id, title: l.name, subtitle: `${l.area_description} · /halls?location=${l.slug}`, extra: `${l.hall_count} hall(s)`, active: l.is_active }))}
        />
      )}
      <section className="space-y-3">
        <h2 className="text-xl">Edit locations</h2>
        {locs.map((l) => (
          <details key={l.id} className="card p-0">
            <summary className="flex min-h-[48px] cursor-pointer items-center px-4 font-semibold">{l.name}</summary>
            <div className="border-t border-ivory-300 p-4">
              <LocationForm initial={{ id: l.id, name: l.name, slug: l.slug, area_description: l.area_description, is_active: l.is_active }} onDoneLabel="Save" />
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
