import { assertSameOrigin, login, logout } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { clientIp, handler, json, rateLimit, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  await assertSameOrigin(req);
  rateLimit(`login:${clientIp(req)}`, 10, 15 * 60_000);
  const body = await readJson(req);
  if (body.logout === true) {
    await logout();
    return json({ ok: true });
  }
  const email = typeof body.email === "string" ? body.email.slice(0, 200) : "";
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  if (!email || !password) throw new AppError(400, "validation_error", "Enter your email and password.");
  const admin = await login(email, password);
  if (!admin) throw new AppError(401, "invalid_login", "Email or password is incorrect.");
  return json({ ok: true });
});
