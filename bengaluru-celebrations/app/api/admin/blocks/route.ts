// Admin blocks (maintenance / private events). The database trigger rejects a block that
// overlaps an active booking, and bookings cannot be placed over an active block.
import { requireAdminApi } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sweepExpiredHolds } from "@/lib/booking";
import { isExclusionViolation, withTransaction } from "@/lib/db";
import { AppError, UnavailableError } from "@/lib/errors";
import { handler, json, readJson } from "@/lib/http";
import { istInstant } from "@/lib/time";
import { Checker } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const admin = await requireAdminApi(req);
  const body = await readJson(req);
  const c = new Checker(body);
  const hallId = c.int("hallId", { required: true, min: 1, label: "Hall" });
  const startDate = c.date("startDate", { required: true, label: "Start date" });
  const startTime = c.time("startTime", { label: "Start time" }) || "00:00";
  const endDate = c.date("endDate", { required: true, label: "End date" });
  const endTime = c.time("endTime", { label: "End time" }) || "23:59";
  const reason = c.str("reason", { required: true, max: 200, label: "Reason" });
  c.done();
  const start = istInstant(startDate, startTime);
  // An end time of 23:59 means "through the end of that day".
  const end = endTime === "23:59" ? istInstant(endDate, "00:00") : istInstant(endDate, endTime);
  if (endTime === "23:59") end.setTime(end.getTime() + 86_400_000);
  if (end <= start) throw new AppError(400, "validation_error", "End must be after start.", { fields: { endDate: "End must be after start." } });
  try {
    const id = await withTransaction(async (cl) => {
      await sweepExpiredHolds(cl, hallId);
      const r = await cl.query("INSERT INTO hall_blocks(hall_id, start_at, end_at, reason, created_by_admin_id) VALUES ($1,$2,$3,$4,$5) RETURNING id", [hallId, start, end, reason, admin.id]);
      await audit(cl, { entity: "hall_block", entityId: r.rows[0].id, action: "created", actor: `admin:${admin.email}`, details: { hall_id: hallId, start: start.toISOString(), end: end.toISOString(), reason } });
      return r.rows[0].id;
    });
    return json({ id }, 201);
  } catch (e) {
    if (isExclusionViolation(e)) throw new UnavailableError("This period overlaps an existing booking or checkout hold for that hall. Reschedule or cancel it first.");
    throw e;
  }
});

export const PATCH = handler(async (req: Request) => {
  const admin = await requireAdminApi(req);
  const body = await readJson(req);
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "bad_request", "Invalid block.");
  await withTransaction(async (cl) => {
    const r = await cl.query("UPDATE hall_blocks SET is_active=false WHERE id=$1 AND is_active RETURNING hall_id", [id]);
    if (!r.rowCount) throw new AppError(404, "not_found", "Block not found.");
    await audit(cl, { entity: "hall_block", entityId: id, action: "removed", actor: `admin:${admin.email}` });
  });
  return json({ ok: true });
});
