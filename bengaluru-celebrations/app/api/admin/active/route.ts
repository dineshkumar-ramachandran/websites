// Activate / deactivate halls and locations. Deactivating never deletes bookings:
// it only hides the hall (or all halls in a location) from new bookings.
import { requireAdminApi } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { setActive } from "@/lib/halls";
import { handler, json, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const admin = await requireAdminApi(req);
  const body = await readJson(req);
  const table = body.table === "halls" ? "halls" : body.table === "locations" ? "locations" : null;
  const id = Number(body.id);
  if (!table || !Number.isInteger(id) || typeof body.active !== "boolean") throw new AppError(400, "bad_request", "Invalid request.");
  await setActive(table, id, body.active, `admin:${admin.email}`);
  return json({ ok: true });
});
