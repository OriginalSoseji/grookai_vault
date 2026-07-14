import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PACKAGE_ID } from "../../scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE reference warehouse delta writer is guarded and non-public", () => {
  const script = source("scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs");
  const pkg = source("package.json");

  assert.equal(PACKAGE_ID, "MEE-REFERENCE-WAREHOUSE-DELTA-WRITER-V1");
  assert.match(pkg, /mee:reference-warehouse-delta-writer:dry-run/);
  assert.match(pkg, /mee:reference-warehouse-delta-writer:run/);
  assert.match(script, /dry_run_read_only_no_writes/);
  assert.match(script, /MEE_REFERENCE_WAREHOUSE_DELTA_ALLOW_RUN/);
  assert.match(script, /guarded_run_missing_rows_only/);
  assert.match(script, /market_reference_candidates/);
  assert.match(script, /market_reference_normalized_evidence/);
  assert.match(script, /SUPABASE_DB_URL/);
  assert.match(script, /REFERENCE_WAREHOUSE_TABLES/);
  assert.match(script, /unsafe table for pg count/);
  assert.match(script, /countRowsBySourceWithPg/);
  assert.match(script, /fetchExistingCandidateMapWithPg/);
  assert.match(script, /fetchExistingNormalizedKeysWithPg/);
  assert.match(script, /db_writes:\s*run\s*&&\s*applyResults\.some/);
  assert.match(script, /pricing_observations_writes:\s*false/);
  assert.match(script, /ebay_active_prices_latest_writes:\s*false/);
  assert.match(script, /public_pricing_views:\s*false/);
  assert.match(script, /app_visible_pricing:\s*false/);
  assert.doesNotMatch(script, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(script, /\.from\(["']ebay_active_prices_latest["']\)/);
  assert.doesNotMatch(script, /\.from\(["']card_prints["']\)\.(?:insert|update|upsert|delete)/);
  assert.doesNotMatch(script, /\.from\(["']card_printings["']\)\.(?:insert|update|upsert|delete)/);
  assert.doesNotMatch(script, /\.upsert\s*\(|\.delete\s*\(/);
});

test("MEE reference warehouse delta writer checks all reference sources", () => {
  const script = source("scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs");

  assert.match(script, /tcgdex_tcgplayer_reference/);
  assert.match(script, /tcgdex_cardmarket_reference/);
  assert.match(script, /pokemontcg_io_reference/);
  assert.match(script, /tcgcsv_reference/);
  assert.match(script, /tcgdex_candidate_row_manifest_missing/);
  assert.match(script, /market_reference_candidates/);
  assert.match(script, /market_reference_normalized_evidence/);
});
