import { ManualBookingForm } from "@/components/admin/manual-booking-form";
import { query } from "@/lib/db";
import { todayIST } from "@/lib/time";
import { EVENT_TYPES } from "@/lib/validation";

export default async function NewBookingPage() {
  const halls = await query<{ id: number; name: string; location_name: string; capacity_max: number }>(
    `SELECT h.id, h.name, l.name AS location_name, h.capacity_max FROM halls h JOIN locations l ON l.id=h.location_id
      WHERE h.is_active AND l.is_active ORDER BY h.sort_order, h.name`
  );
  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-3xl">New manual booking</h1>
      <p className="text-ink-soft">For phone and walk-in customers. Availability is re-checked on the server when you save.</p>
      <ManualBookingForm halls={halls} today={todayIST()} eventTypes={EVENT_TYPES.map((e) => ({ value: e.value, label: e.label }))} />
    </div>
  );
}
