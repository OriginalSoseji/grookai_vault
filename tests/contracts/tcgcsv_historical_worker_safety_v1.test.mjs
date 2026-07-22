import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const worker = fs.readFileSync(
  path.join(repoRoot, "scripts", "workers", "tcgcsv_full_source_warehouse_worker_v1.mjs"),
  "utf8",
);

test("historical worker admits only one production writer", () => {
  assert.match(worker, /pg_try_advisory_lock\(hashtext\(\$1\)\)/);
  assert.match(worker, /skipped_worker_locked/);
  assert.match(worker, /pg_advisory_unlock\(hashtext\(\$1\)\)/);
});

test("historical worker skips completed dates unless forced", () => {
  assert.match(worker, /completedHistoricalDates/);
  assert.match(worker, /skipped_already_completed/);
  assert.match(worker, /if \(!args\.force\)/);
});

test("historical worker uses deterministic single-date identity and honest timing", () => {
  assert.match(worker, /TCGCSV-FULL-HISTORICAL-\$\{args\.dateFrom\}/);
  assert.match(worker, /&& !args\.force && args\.dateFrom === args\.dateTo/);
  assert.match(worker, /actualStartedAt/);
  assert.match(worker, /run\.finished_at = new Date\(\)\.toISOString\(\)/);
  assert.match(worker, /recordHistoricalFailure/);
  assert.match(worker, /status: "failed"/);
});

test("historical worker reconciles abandoned run records after taking the lock", () => {
  assert.match(worker, /TCGCSV_HISTORICAL_STALE_RUN_HOURS/);
  assert.match(worker, /reconciled_abandoned_historical_run/);
  assert.match(worker, /status = 'running'/);
  assert.match(worker, /now\(\) - \(\$1::integer \* interval '1 hour'\)/);
});

test("price writes are bulked and yield between batches", () => {
  assert.match(worker, /DEFAULT_PRICE_OBSERVATION_BATCH_SIZE = 2000/);
  assert.match(worker, /TCGCSV_PRICE_BATCH_DELAY_MS/);
  assert.match(worker, /await sleep\(batchDelayMs\)/);
});
