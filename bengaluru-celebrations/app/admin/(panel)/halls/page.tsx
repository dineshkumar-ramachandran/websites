import Link from "next/link";
import { SortableList } from "@/components/admin/sortable-list";
import { adminListHalls } from "@/lib/halls";
import { formatINR } from "@/lib/money";

export default async function AdminHalls() {
  const halls = await adminListHalls();
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl">Halls</h1>
        <Link href="/admin/halls/new" className="btn-primary btn-sm">+ Add hall</Link>
      </div>
      <p className="text-ink-soft">
        Order here is the order on the public site. Deactivated halls are hidden from customers and cannot take new bookings, but all existing bookings and history are kept. There is no limit on the number of halls.
      </p>
      {halls.length === 0 ? (
        <p className="card p-6">No halls yet. <Link href="/admin/halls/new">Add the first hall</Link>.</p>
      ) : (
        <SortableList
          table="halls"
          warnOnDeactivate="Deactivate {name}? It will be hidden from new bookings. Existing bookings stay in place."
          rows={halls.map((h) => ({
            id: h.id,
            title: h.name,
            subtitle: `${h.location_name}${h.location_active ? "" : " (location inactive)"} · ${h.capacity_min}–${h.capacity_max} guests · from ${h.from_price_paise !== null ? formatINR(h.from_price_paise) : "—"}`,
            extra: `${h.active_bookings} upcoming confirmed booking(s)${h.is_demo ? " · demo listing" : ""}`,
            active: h.is_active,
            href: `/admin/halls/${h.id}`,
          }))}
        />
      )}
    </div>
  );
}
