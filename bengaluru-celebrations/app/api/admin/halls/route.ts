import { requireAdminApi } from "@/lib/auth";
import { parseHallInput } from "@/lib/hall-input";
import { saveHall } from "@/lib/halls";
import { handler, json, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const admin = await requireAdminApi(req);
  const row = await saveHall(`admin:${admin.email}`, parseHallInput(await readJson(req)));
  return json({ id: row.id }, 201);
});
