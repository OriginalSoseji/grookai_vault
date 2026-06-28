import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PACKAGE_ID,
  buildTcgdexPricingSourceConstraintsReportV1,
} from "../../scripts/audits/market_reference_tcgdex_pricing_source_constraints_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("TCGdex reference source constraint package is bounded and ready", () => {
  const report = buildTcgdexPricingSourceConstraintsReportV1("2026-06-28T00:00:00.000Z");

  assert.equal(report.package_id, PACKAGE_ID);
  assert.equal(report.ready, true);
  assert.equal(report.applied, false);
  assert.equal(report.boundary.evidence_backfill, false);
  assert.equal(report.boundary.public_pricing_views, false);
  assert.equal(report.boundary.app_visible_pricing, false);
  assert.equal(report.proposed_changes.allowed_sources_added.length, 2);
  assert.match(report.approval_prompt_for_next_step, /TCGdex TCGPlayer\/Cardmarket reference evidence sources/);
});

test("TCGdex source constraint migration only alters internal constraints", () => {
  const sql = source("supabase/migrations/20260625130000_market_reference_tcgdex_pricing_source_constraints_v1.sql");
  const stripped = sql.replace(/--.*$/gm, "");

  assert.match(stripped, /tcgdex_tcgplayer_reference/);
  assert.match(stripped, /tcgdex_cardmarket_reference/);
  assert.match(stripped, /market_reference_candidates_source_check/);
  assert.match(stripped, /market_reference_normalized_evidence_source_check/);
  assert.doesNotMatch(stripped, /\binsert\s+into\b/i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.doesNotMatch(stripped, /\bmerge\s+into\b/i);
  assert.doesNotMatch(stripped, /\bpricing_observations\b/i);
  assert.doesNotMatch(stripped, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(stripped, /\bcreate\s+(materialized\s+)?view\b/i);
});
