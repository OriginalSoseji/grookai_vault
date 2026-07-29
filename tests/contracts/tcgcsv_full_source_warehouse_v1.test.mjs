import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isRetryableTcgcsvSourceFetchErrorV1,
  tcgcsvSourceRetryDelayMsV1,
} from "../../backend/pricing/tcgcsv_source_fetch_retry_policy_v1.mjs";

const migration = readFileSync(
  "supabase/migrations/20260715110000_tcgcsv_full_source_warehouse_v1.sql",
  "utf8",
);
const worker = readFileSync("scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs", "utf8");
const contract = readFileSync("docs/contracts/TCGCSV_FULL_SOURCE_WAREHOUSE_V1.md", "utf8");

test("TCGCSV full warehouse is service-role-only", () => {
  for (const table of [
    "tcgcsv_source_sync_runs",
    "tcgcsv_source_artifacts",
    "tcgcsv_source_categories",
    "tcgcsv_source_groups",
    "tcgcsv_source_products",
    "tcgcsv_source_group_fetch_status",
    "tcgcsv_source_price_daily_observations",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security;`));
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from public, anon, authenticated;`));
    assert.match(migration, new RegExp(`on public\\.${table} for all to service_role`));
  }
});

test("TCGCSV full warehouse does not grant public app-facing reads", () => {
  assert.doesNotMatch(migration, /grant\s+select\s+on\s+public\.tcgcsv_source_\w+\s+to\s+(anon|authenticated)/i);
  assert.match(migration, /revoke all on public\.v_tcgcsv_source_sync_latest_status from public, anon, authenticated;/);
});

test("TCGCSV worker defaults to dry-run and records no public pricing boundary", () => {
  assert.match(worker, /apply:\s*false/);
  assert.match(worker, /public_pricing_writes:\s*false/);
  assert.match(worker, /identity_writes:\s*false/);
  assert.match(worker, /vault_writes:\s*false/);
  assert.match(worker, /app_visible_pricing:\s*false/);
});

test("TCGCSV worker retries transient source fetches and fails closed on partial ingestion", () => {
  assert.match(worker, /DEFAULT_REQUEST_RETRIES = 3/);
  assert.match(worker, /TCGCSV_REQUEST_RETRIES/);
  assert.match(worker, /"--fail-with-body"/);
  assert.match(worker, /transient fetch failure retry=/);
  assert.match(
    worker,
    /\["partial_success", "failed", "aborted_request_ceiling"\]\.includes\(result\.run\.status\)/,
  );
  assert.match(worker, /process\.exitCode = 1/);
});

test("TCGCSV source retry policy retries transport failures but not permanent HTTP errors", () => {
  assert.equal(
    isRetryableTcgcsvSourceFetchErrorV1({
      code: 35,
      message: "curl: (35) Recv failure: Connection reset by peer",
    }),
    true,
  );
  assert.equal(
    isRetryableTcgcsvSourceFetchErrorV1({
      code: 22,
      message: "The requested URL returned error: 429",
    }),
    true,
  );
  assert.equal(
    isRetryableTcgcsvSourceFetchErrorV1({
      code: 22,
      message: "The requested URL returned error: 404",
    }),
    false,
  );
  assert.equal(
    tcgcsvSourceRetryDelayMsV1({
      retryNumber: 1,
      baseDelayMs: 1000,
      requestDelayMs: 100,
    }),
    1000,
  );
  assert.equal(
    tcgcsvSourceRetryDelayMsV1({
      retryNumber: 8,
      baseDelayMs: 1000,
      requestDelayMs: 100,
    }),
    10_000,
  );
});

test("TCGCSV contract preserves source-only and historical archive rules", () => {
  assert.match(contract, /not Grookai product truth and is not Grookai Value/);
  assert.match(contract, /2024-02-08/);
  assert.match(contract, /historical_price_only/);
  assert.match(contract, /source_price_row_identity = tcgplayer:<productId>:<normalized subTypeName>/);
});
