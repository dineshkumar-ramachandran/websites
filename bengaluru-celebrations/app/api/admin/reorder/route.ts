import { requireAdminApi } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { reorder } from "@/lib/halls";
import { handler, json, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  await requireAdminApi(req);
  const body = await readJson(req);
  const tables = ["halls", "locations", "hall_images"] as const;
  const table = tables.find((t) => t === body.table);
  const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
  if (!table || ids.length === 0 || ids.length > 500 || ids.some((n: number) => !Number.isInteger(n) || n <= 0)) throw new AppError(400, "bad_request", "Invalid order.");
  if (table === "hall_images") {
    const hallId = Number(body.hallId);
    if (!Number.isInteger(hallId) || hallId <= 0) throw new AppError(400, "bad_request", "hallId required.");
    await reorder(table, ids, { hallId });
  } else await reorder(table, ids);
  return json({ ok: true });
});
