import type { HallForm } from "./hall-editor";
import type { HallDetail } from "@/lib/halls";
import { hhmm } from "@/lib/time";

const rupees = (p: number) => String(p / 100);

export function toForm(h?: HallDetail): HallForm {
  return {
    location_id: h ? String(h.location_id) : "",
    name: h?.name ?? "",
    slug: h?.slug ?? "",
    tagline: h?.tagline ?? "",
    description: h?.description ?? "",
    address: h?.address ?? "",
    map_url: h?.map_url ?? "",
    capacity_min: h ? String(h.capacity_min) : "10",
    capacity_max: h ? String(h.capacity_max) : "100",
    amenities: h?.amenities.join("\n") ?? "",
    policies: h?.policies ?? "",
    contact_name: h?.contact_name ?? "",
    contact_phone: h?.contact_phone ?? "",
    contact_email: h?.contact_email ?? "",
    open_time: h ? hhmm(h.open_time) : "09:00",
    close_time: h ? hhmm(h.close_time) : "22:00",
    allow_full_day: h?.allow_full_day ?? true,
    full_day_price: h ? rupees(h.full_day_price_paise) : "",
    cleaning_fee: h ? rupees(h.cleaning_fee_paise) : "0",
    setup_buffer_min: h ? String(h.setup_buffer_min) : "60",
    cleanup_buffer_min: h ? String(h.cleanup_buffer_min) : "60",
    min_notice_hours: h ? String(h.min_notice_hours) : "24",
    max_advance_days: h ? String(h.max_advance_days) : "365",
    is_active: h?.is_active ?? false,
  };
}

