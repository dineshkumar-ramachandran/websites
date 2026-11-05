import { requireAdminApi } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { withTransaction } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { handler, json, readJson } from "@/lib/http";
import { saveSettings, SiteSettings } from "@/lib/settings";
import { Checker } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PUT = handler(async (req: Request) => {
  const admin = await requireAdminApi(req);
  const body = await readJson(req);
  const c = new Checker(body);
  const s: SiteSettings = {
    brand_name: c.str("brand_name", { required: true, max: 80, label: "Brand name" }),
    brand_tagline: c.str("brand_tagline", { max: 200 }),
    hold_minutes: c.int("hold_minutes", { required: true, min: 2, max: 60, label: "Hold duration" }),
    tax_percent: c.int("tax_percent", { required: true, min: 0, max: 40, label: "Tax %" }),
    tax_label: c.str("tax_label", { required: true, max: 20, label: "Tax label" }),
    contact_phone: c.str("contact_phone", { max: 60 }),
    contact_whatsapp: c.str("contact_whatsapp", { max: 60 }),
    contact_email: c.str("contact_email", { max: 200 }),
    contact_address: c.str("contact_address", { max: 300 }),
    contact_hours: c.str("contact_hours", { max: 200 }),
    page_contact_intro: c.str("page_contact_intro", { max: 3000 }),
    page_cancellation: c.str("page_cancellation", { max: 10000 }),
    page_privacy: c.str("page_privacy", { max: 10000 }),
    faq: [],
  };
  if (!Array.isArray(body.faq) || body.faq.length > 50) throw new ValidationError({ faq: "FAQ must be a list of up to 50 items." });
  for (const item of body.faq as { q?: unknown; a?: unknown }[]) {
    const q = String(item?.q ?? "").trim().slice(0, 300);
    const a = String(item?.a ?? "").trim().slice(0, 3000);
    if (q && a) s.faq.push({ q, a });
  }
  c.done();
  await withTransaction(async (cl) => {
    await saveSettings(cl, s);
    await audit(cl, { entity: "settings", entityId: "site", action: "updated", actor: `admin:${admin.email}`, details: { hold_minutes: s.hold_minutes, tax_percent: s.tax_percent, brand_name: s.brand_name } });
  });
  return json({ ok: true });
});
