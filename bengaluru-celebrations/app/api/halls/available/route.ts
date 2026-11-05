// Alternatives: other active halls with free options on a date (used when a slot is taken during checkout).
import { getAvailability } from "@/lib/booking";
import { listPublicHalls } from "@/lib/halls";
import { AppError } from "@/lib/errors";
import { handler, json } from "@/lib/http";
import { isValidDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "";
  const guests = Number(url.searchParams.get("guests")) || undefined;
  const exclude = Number(url.searchParams.get("exclude")) || 0;
  if (!isValidDateString(date)) throw new AppError(400, "bad_date", "Invalid date.");
  const halls = await listPublicHalls({ date, guests });
  const out = [];
  for (const h of halls) {
    if (h.id === exclude || !(h.day_status === "available" || h.day_status === "partial")) continue;
    const { days } = await getAvailability(h.id, date, date);
    out.push({
      id: h.id,
      slug: h.slug,
      name: h.name,
      location: h.location_name,
      capacity_max: h.capacity_max,
      options: days[0].options.filter((o) => o.available).map((o) => ({ key: o.key, label: o.label, startTime: o.startTime, endTime: o.endTime, pricePaise: o.pricePaise })),
    });
  }
  return json({ halls: out });
});
