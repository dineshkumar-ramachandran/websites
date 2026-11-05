import { Pool, PoolClient, QueryResultRow, types } from "pg";

// Return DATE columns as plain 'YYYY-MM-DD' strings (no implicit local-time conversion).
types.setTypeParser(1082, (v: string) => v);
// NUMERIC -> number (only used for small values such as tax percentages)
types.setTypeParser(1700, (v: string) => Number(v));
// BIGINT (count(*)) -> number
types.setTypeParser(20, (v: string) => Number(v));

declare global {
  // eslint-disable-next-line no-var
  var __bcPool: Pool | undefined;
}

function makePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and set it.");
  }
  const ssl =
    process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined;
  // All business times are Asia/Kolkata (set per connection).
  return new Pool({ connectionString, ssl, max: Number(process.env.DATABASE_POOL_MAX || 10),
    // Some connection poolers reject startup options; set DATABASE_SET_TIMEZONE=false for those. The app never relies on it for correctness.
    options: process.env.DATABASE_SET_TIMEZONE === "false" ? undefined : "-c timezone=Asia/Kolkata",
  });
}

export function getPool(): Pool {
  if (!globalThis.__bcPool) globalThis.__bcPool = makePool();
  return globalThis.__bcPool;
}

export type Db = Pick<PoolClient, "query">;

export async function query<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query<T>(text, params as any[]);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run fn inside a READ COMMITTED transaction. Row locks + DB constraints provide the concurrency safety. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (globalThis.__bcPool) {
    await globalThis.__bcPool.end();
    globalThis.__bcPool = undefined;
  }
}

export function isExclusionViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23P01";
}
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
