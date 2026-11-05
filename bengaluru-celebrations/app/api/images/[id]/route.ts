import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });
  const img = await queryOne<{ content_type: string; data: Buffer }>("SELECT content_type, data FROM hall_images WHERE id=$1", [id]);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.content_type,
      "Cache-Control": "public, max-age=86400",
      // SVGs are only built-in demo art; the CSP stops any script from running even so.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
