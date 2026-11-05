import { requireAdminApi } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { parseHallInput, parseSlots } from "@/lib/hall-input";
import { saveHall, saveSlots } from "@/lib/halls";
import { handler, json, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

async function hallId(ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) throw new NotFoundError("Hall not found.");
  return id;
}

/** Update hall details. */
export const PUT = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminApi(req);
  const id = await hallId(ctx);
  await saveHall(`admin:${admin.email}`, parseHallInput(await readJson(req)), id);
  return json({ ok: true });
});

/** Replace time slots: body { slots: [...] } */
export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminApi(req);
  const id = await hallId(ctx);
  await saveSlots(`admin:${admin.email}`, id, parseSlots(await readJson(req)));
  return json({ ok: true });
});
