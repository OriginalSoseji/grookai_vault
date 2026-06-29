import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

const sqlPath = "docs/sql/mee_reference_anchored_pricing_compat_view_v1.sql";
const migrationPath = "supabase/migrations/20260629120000_mee_reference_anchored_pricing_compat_view_v1.sql";
const readbackPath = "docs/sql/mee_reference_anchored_pricing_compat_view_v1_readback.sql";

test("reference anchored compat view preserves legacy columns while using Grookai Value as primary", () => {
  const sql = stripSqlComments(read(sqlPath));

  assert.match(sql, /create\s+or\s+replace\s+view\s+public\.v_card_pricing_ui_v1/i);
  assert.match(sql, /from\s+public\.v_market_evidence_public_pricing_bridge_reference_anchored_v1\s+bridge/i);
  assert.match(sql, /bridge\.grookai_value_mid::numeric\(12,2\)\s+as\s+primary_price/i);
  assert.match(sql, /'grookai_value'::text\s+as\s+primary_source/i);
  assert.match(sql, /bridge\.grookai_value_mid::numeric\s+as\s+grookai_value/i);
  assert.match(sql, /bridge\.active_ask_mid::numeric\(12,2\)\s+as\s+ebay_median_price/i);
  assert.match(sql, /'evidence_anchored_grookai_value'::text\s+as\s+pricing_basis/i);
  assert.match(sql, /bridge\.grookai_value_block_reason\s+is\s+null/i);
  assert.match(sql, /bridge\.publishable\s+=\s+false/i);
  assert.match(sql, /bridge\.app_visible\s+=\s+false/i);
});

test("reference anchored compat view does not reintroduce active ask as primary value", () => {
  const sql = stripSqlComments(`${read(sqlPath)}\n${read(migrationPath)}`);

  assert.doesNotMatch(sql, /'ebay'::text\s+as\s+primary_source/i);
  assert.doesNotMatch(sql, /'active_listing_market_estimate'::text\s+as\s+pricing_basis/i);
  assert.doesNotMatch(sql, /active_ask_mid::numeric(?:\(12,2\))?\s+as\s+primary_price/i);
  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bjusttcg\b/i);
});

test("reference anchored compat readback proves DB-wide row count and Mightyena regression", () => {
  const readback = stripSqlComments(read(readbackPath));

  assert.match(readback, /MEE-REFERENCE-ANCHORED-PRICING-COMPAT-VIEW-V1/);
  assert.match(readback, /compat_rows/);
  assert.match(readback, /bridge_value_rows/);
  assert.match(readback, /ebay_primary_source_rows/);
  assert.match(readback, /active_listing_market_estimate_rows/);
  assert.match(readback, /GV-PK-HP-101/);
  assert.match(readback, /primary_source/);
  assert.match(readback, /ebay_median_price/);
});
