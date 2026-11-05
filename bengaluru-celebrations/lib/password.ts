import crypto from "node:crypto";

// scrypt (built into Node) — no native dependencies required.
const N = 16384,
  R = 8,
  P = 1,
  KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, rr, pp, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  if (expected.length === 0) return false;
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, "base64"), expected.length, { N: Number(n), r: Number(rr), p: Number(pp) });
  return crypto.timingSafeEqual(expected, actual);
}

export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain letters and numbers.";
  return null;
}
