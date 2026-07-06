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

const REQUIRED_TABLES = [
  "market_listing_acquisition_runs",
  "market_listing_query_cache",
  "market_listing_raw_snapshots",
  "market_listing_observations",
  "market_listing_seller_snapshots",
  "market_listing_card_candidates",
  "market_listing_price_events",
  "market_listing_rollups",
];

test("market listing warehouse schema candidate matches local migration file", () => {
  const candidate = source("docs/sql/market_listing_warehouse_v1_migration_candidate.sql");
  const migration = source("supabase/migrations/20260625050000_market_listing_warehouse_v1.sql");
  const stripped = stripSqlComments(candidate);

  assert.match(candidate, /MARKET_LISTING_WAREHOUSE_V1 migration candidate/);
  assert.equal(sha256(candidate), sha256(migration));
  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /commit\s*;\s*$/i);
  assert.doesNotMatch(stripped, /\brollback\s*;/i);
});

test("market listing warehouse schema candidate creates the contracted internal tables", () => {
  const stripped = stripSqlComments(source("docs/sql/market_listing_warehouse_v1_migration_candidate.sql"));

  for (const tableName of REQUIRED_TABLES) {
    assert.match(stripped, new RegExp(`create\\s+table\\s+public\\.${tableName}\\b`, "i"));
    assert.match(stripped, new RegExp(`alter\\s+table\\s+public\\.${tableName}\\s+enable\\s+row\\s+level\\s+security`, "i"));
    assert.match(stripped, new RegExp(`create\\s+policy\\s+${tableName}_service_role_all`, "i"));
  }

  assert.match(stripped, /8::int\s+as\s+proposed_table_count/i);
  assert.match(stripped, /15::int\s+as\s+proposed_index_count/i);
  assert.match(stripped, /8::int\s+as\s+proposed_service_role_policy_count/i);
});

test("market listing warehouse schema candidate keeps ebay active evidence internal and review-only", () => {
  const stripped = stripSqlComments(source("docs/sql/market_listing_warehouse_v1_migration_candidate.sql"));

  assert.match(stripped, /source\s+in\s*\(\s*'ebay_active'\s*\)/i);
  assert.match(stripped, /provider_route\s+in\s*\(\s*'ebay_browse_api'\s*\)/i);
  assert.match(stripped, /market_listing_card_candidates_needs_review_check\s+check\s*\(\s*needs_review\s*=\s*true\s*\)/i);
  assert.match(stripped, /market_listing_card_candidates_no_direct_publish_check\s+check\s*\(\s*can_publish_price_directly\s*=\s*false\s*\)/i);
  assert.match(stripped, /market_listing_rollups_internal_only_check\s+check\s*\([\s\S]*needs_review\s*=\s*true[\s\S]*publishable\s*=\s*false[\s\S]*app_visible\s*=\s*false[\s\S]*market_truth\s*=\s*false[\s\S]*\)/i);
  assert.match(stripped, /active_listings_are_asking_price_only/i);
});

test("market listing warehouse schema candidate cannot publish or mutate existing app data", () => {
  const stripped = stripSqlComments(source("docs/sql/market_listing_warehouse_v1_migration_candidate.sql"));

  assert.doesNotMatch(stripped, /\binsert\s+into\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\./i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.doesNotMatch(stripped, /\bmerge\s+into\b/i);
  assert.doesNotMatch(stripped, /\bpricing_observations\b/i);
  assert.doesNotMatch(stripped, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(stripped, /\bjusttcg\b/i);
  assert.doesNotMatch(stripped, /\bcreate\s+(materialized\s+)?view\b/i);
  assert.doesNotMatch(stripped, /\bto\s+(anon|authenticated|public)\b/i);
});
