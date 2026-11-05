import { requireAdminApi } from "@/lib/auth";
import { AppError, NotFoundError } from "@/lib/errors";
import { addImage, deleteImage, MAX_IMAGE_BYTES, updateImageAlt } from "@/lib/halls";
import { handler, json, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

async function hallId(ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) throw new NotFoundError("Hall not found.");
  return id;
}

/** Upload: multipart form with "file" and optional "alt". */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminApi(req);
  const id = await hallId(ctx);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") throw new AppError(400, "validation_error", "Choose an image file.", { fields: { file: "Choose an image file." } });
  if (file.size > MAX_IMAGE_BYTES) throw new AppError(400, "validation_error", "Images must be 5 MB or smaller.", { fields: { file: "Images must be 5 MB or smaller." } });
  const alt = String(form?.get("alt") ?? "").slice(0, 200);
  const imageId = await addImage(`admin:${admin.email}`, id, Buffer.from(await file.arrayBuffer()), alt);
  return json({ id: imageId }, 201);
});

export const DELETE = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminApi(req);
  const id = await hallId(ctx);
  const imageId = Number(new URL(req.url).searchParams.get("imageId"));
  if (!Number.isInteger(imageId) || imageId <= 0) throw new NotFoundError("Image not found.");
  await deleteImage(`admin:${admin.email}`, id, imageId);
  return json({ ok: true });
});

export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdminApi(req);
  const id = await hallId(ctx);
  const body = await readJson(req);
  await updateImageAlt(id, Number(body.imageId), String(body.alt ?? "").slice(0, 200));
  return json({ ok: true });
});
