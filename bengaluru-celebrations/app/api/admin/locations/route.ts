import { requireAdminApi } from "@/lib/auth";
import { saveLocation } from "@/lib/halls";
import { handler, json, readJson } from "@/lib/http";
import { Checker, slugify } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Create (no id) or update (with id) a location. */
export const POST = handler(async (req: Request) => {
  const admin = await requireAdminApi(req);
  const body = await readJson(req);
  const c = new Checker(body);
  const id = Number(body.id) > 0 ? Number(body.id) : undefined;
  const name = c.str("name", { required: true, min: 2, max: 80, label: "Location name" });
  const slug = slugify(c.str("slug", { max: 60 }) || name);
  if (!slug) c.fail("slug", "URL name is required.");
  const area_description = c.str("area_description", { max: 200 });
  const is_active = body.is_active === undefined ? true : c.bool("is_active");
  c.done();
  const row = await saveLocation(`admin:${admin.email}`, { name, slug, area_description, is_active }, id);
  return json({ id: row.id }, id ? 200 : 201);
});
