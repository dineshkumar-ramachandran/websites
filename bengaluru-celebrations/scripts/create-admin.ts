// Create or reset an administrator account.
//   npm run admin:create -- owner@example.com            (prompts for a password)
//   ADMIN_PASSWORD='...' npm run admin:create -- owner@example.com
import readline from "node:readline";
import { getPool, closePool } from "../lib/db";
import { hashPassword, validatePasswordStrength } from "../lib/password";
import { loadEnv } from "./env";

async function ask(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => (rl.close(), res(a))));
}

async function main() {
  loadEnv();
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Usage: npm run admin:create -- you@example.com");
    process.exit(1);
  }
  const password = process.env.ADMIN_PASSWORD || (await ask("New password (min 10 chars, letters + numbers): "));
  const weak = validatePasswordStrength(password);
  if (weak) {
    console.error(weak);
    process.exit(1);
  }
  await getPool().query(
    `INSERT INTO admin_users(email, name, password_hash) VALUES ($1, 'Administrator', $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true`,
    [email, hashPassword(password)]
  );
  await getPool().query("DELETE FROM admin_sessions WHERE admin_id = (SELECT id FROM admin_users WHERE email=$1)", [email]);
  console.log(`Admin ${email} is ready. Sign in at /admin/login`);
  await closePool();
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
