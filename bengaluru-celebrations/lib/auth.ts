import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { query, queryOne } from "./db";
import { AppError } from "./errors";
import { hashPassword, verifyPassword } from "./password";
import type { Actor } from "./booking";

export const SESSION_COOKIE = "bc_admin";
const SESSION_HOURS = 12;
const DUMMY_HASH = hashPassword("timing-equaliser-not-a-real-password-1");

export type AdminUser = { id: number; email: string; name: string };

function hash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function login(email: string, password: string): Promise<AdminUser | null> {
  const u = await queryOne<{ id: number; email: string; name: string; password_hash: string; is_active: boolean }>(
    "SELECT id, email, name, password_hash, is_active FROM admin_users WHERE email = $1",
    [email.trim().toLowerCase()]
  );
  // Always run a hash comparison so unknown emails take similar time.
  const ok = verifyPassword(password, u ? u.password_hash : DUMMY_HASH);
  if (!u || !ok || !u.is_active) return null;
  const token = crypto.randomBytes(32).toString("base64url");
  await query("INSERT INTO admin_sessions(token_hash, admin_id, expires_at) VALUES ($1,$2, now() + make_interval(hours => $3))", [hash(token), u.id, SESSION_HOURS]);
  await query("UPDATE admin_users SET last_login_at = now() WHERE id = $1", [u.id]);
  await query("DELETE FROM admin_sessions WHERE expires_at < now()");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return { id: u.id, email: u.email, name: u.name };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM admin_sessions WHERE token_hash = $1", [hash(token)]);
  jar.delete(SESSION_COOKIE);
}

export async function currentAdmin(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return queryOne<AdminUser>(
    `SELECT u.id, u.email, u.name FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_active`,
    [hash(token)]
  );
}

/** For admin pages: redirect to login when not signed in. */
export async function requireAdminPage(): Promise<AdminUser> {
  const a = await currentAdmin();
  if (!a) redirect("/admin/login");
  return a;
}

/** For admin API routes: 401 when not signed in; rejects cross-site writes. */
export async function requireAdminApi(req?: Request): Promise<AdminUser> {
  if (req && req.method !== "GET" && req.method !== "HEAD") await assertSameOrigin(req);
  const a = await currentAdmin();
  if (!a) throw new AppError(401, "unauthorized", "Please sign in as an administrator.");
  return a;
}

export function adminActor(a: AdminUser): Actor {
  return { kind: "admin", id: a.id, email: a.email };
}

/** CSRF defence in depth (cookies are also SameSite=Lax): a present Origin header must match the host. */
export async function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError(403, "bad_origin", "Cross-site request blocked.");
  }
  if (originHost !== host) throw new AppError(403, "bad_origin", "Cross-site request blocked.");
}
