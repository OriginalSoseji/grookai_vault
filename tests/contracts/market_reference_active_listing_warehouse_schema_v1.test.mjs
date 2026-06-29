import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

test("active-listing warehouse schema candidate matches local migration file", () => {
  const candidate = source("docs/sql/market_reference_active_listing_warehouse_schema_v1_migration_candidate.sql");
  const migration = source("supabase/migrations/20260625020000_market_reference_active_listing_warehouse_schema_v1.sql");
  const stripped = stripSqlComments(candidate);

  assert.match(candidate, /MARKET_REFERENCE_ACTIVE_LISTING_WAREHOUSE_SCHEMA_V1 migration candidate/);
  assert.equal(sha256(candidate), sha256(migration));
  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /commit\s*;\s*$/i);
  assert.doesNotMatch(stripped, /\brollback\s*;/i);
});

test("active-listing warehouse schema candidate allows ebay active evidence without loosening publish gates", () => {
  const stripped = stripSqlComments(source("docs/sql/market_reference_active_listing_warehouse_schema_v1_migration_candidate.sql"));

  assert.match(stripped, /source\s+in\s*\(\s*'tcgcsv_reference'\s*,\s*'pokemontcg_io_reference'\s*,\s*'ebay_active'\s*\)/i);
  assert.match(stripped, /source\s*=\s*'ebay_active'\s+and\s+source_type\s*=\s*'active_listing'/i);
  assert.match(stripped, /source_object_type\s+in\s*\([\s\S]*'ebay_browse_item_summary'[\s\S]*'ebay_active_listing'[\s\S]*\)/i);
  assert.doesNotMatch(stripped, /drop\s+constraint\s+if\s+exists\s+market_reference_candidates_needs_review_check/i);
  assert.doesNotMatch(stripped, /drop\s+constraint\s+if\s+exists\s+market_reference_candidates_no_direct_publish_check/i);
  assert.match(stripped, /keeps_candidates_needs_review/i);
  assert.match(stripped, /keeps_candidates_no_direct_publish/i);
});

test("active-listing warehouse schema candidate cannot publish prices or change public pricing surfaces", () => {
  const stripped = stripSqlComments(source("docs/sql/market_reference_active_listing_warehouse_schema_v1_migration_candidate.sql"));

  assert.doesNotMatch(stripped, /\binsert\s+into\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\./i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.doesNotMatch(stripped, /\bmerge\s+into\b/i);
  assert.doesNotMatch(stripped, /\bpricing_observations\b/i);
  assert.doesNotMatch(stripped, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(stripped, /\bcreate\s+(materialized\s+)?view\b/i);
  assert.doesNotMatch(stripped, /\bto\s+(anon|authenticated|public)\b/i);
});
