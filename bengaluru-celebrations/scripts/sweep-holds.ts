// Optional cron job: expire stale checkout holds. Availability is always computed
// correctly without it (expired holds never block), this just tidies statuses.
import { closePool, getPool } from "../lib/db";
import { sweepExpiredHolds } from "../lib/booking";
import { loadEnv } from "./env";

loadEnv();
sweepExpiredHolds(getPool())
  .then(async (n) => {
    console.log(`expired ${n} hold(s)`);
    await closePool();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
