import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("strict filtered rollup plan is local-only and filters before medians", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_listing_strict_filtered_rollup_plan_v1.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /MARKET-LISTING-STRICT-FILTERED-ROLLUP-PLAN-V1/);
  assert.match(script, /local_strict_filtered_rollup_plan_no_writes_no_provider_calls/);
  assert.match(script, /strict_filtered_review_ready_internal_candidate/);
  assert.match(script, /titleGate\(row\)/);
  assert.match(script, /median_active_ask/);
  assert.match(script, /--run-key=/);
  assert.match(script, /MEE_NIGHTLY_REQUIRE_DIRECT_DB/);
  assert.match(script, /where observation\.acquisition_run_id = \$1::uuid/);
  assert.match(script, /begin read only/);
  assert.match(script, /declare strict_candidate_rows_cursor no scroll cursor/);
  assert.match(script, /fetch forward \$\{DIRECT_FETCH_SIZE\} from strict_candidate_rows_cursor/);
  assert.match(script, /close strict_candidate_rows_cursor/);
  assert.match(script, /order by observation\.id asc, candidate\.id asc/);
  assert.match(script, /left join public\.sets set_row on set_row\.id = card\.set_id/);
  assert.match(script, /where card\.id = any\(\$1::uuid\[\]\)/);
  assert.match(script, /source_acquisition_run:\s*acquisitionRun/);
  assert.match(script, /app_visible_pricing:\s*false/);
  assert.match(script, /public_price_rollups:\s*false/);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
});
