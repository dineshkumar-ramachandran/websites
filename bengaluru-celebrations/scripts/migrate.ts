// Applies db/migrations/*.sql in order, once each, inside a transaction per file.
import fs from "node:fs";
import path from "node:path";
import { getPool, closePool } from "../lib/db";
import { loadEnv } from "./env";

export async function migrate(log = true) {
  const pool = getPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const dir = path.join(process.cwd(), "db", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set((await pool.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [f]);
      await client.query("COMMIT");
      if (log) console.log(`applied ${f}`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${f} failed: ${(e as Error).message}`);
    } finally {
      client.release();
    }
  }
  if (log) console.log("migrations up to date");
}

if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  loadEnv();
  migrate()
    .then(() => closePool())
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
