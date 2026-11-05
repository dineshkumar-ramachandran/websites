import { getAvailability } from "@/lib/booking";
import { currentAdmin } from "@/lib/auth";
import { AppError, NotFoundError } from "@/lib/errors";
import { getHallDetail } from "@/lib/halls";
import { handler, json } from "@/lib/http";
import { addDays, isValidDateString, todayIST } from "@/lib/time";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const hallId = Number(id);
  if (!Number.isInteger(hallId) || hallId <= 0) throw new NotFoundError("Hall not found.");
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? todayIST();
  const to = url.searchParams.get("to") ?? addDays(from, 30);
  if (!isValidDateString(from) || !isValidDateString(to) || to < from) throw new AppError(400, "bad_range", "Invalid date range.");
  if (to > addDays(from, 62)) throw new AppError(400, "bad_range", "Date range too long (max 62 days).");

  // Admins (calendar inside the dashboard) can see options regardless of notice/advance rules and for inactive halls.
  const isAdminView = url.searchParams.get("admin") === "1" && !!(await currentAdmin());
  if (!isAdminView) {
    const hall = await getHallDetail(hallId);
    if (!hall) throw new NotFoundError("Hall not found.");
  }
  const { days } = await getAvailability(hallId, from, to, isAdminView ? { ignoreNotice: true, ignoreAdvanceLimit: true } : {});
  return json({ days });
});
