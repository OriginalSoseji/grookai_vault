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

test("active-listing normalized schema candidate matches local migration file", () => {
  const candidate = source("docs/sql/market_reference_active_listing_normalized_evidence_schema_v1_migration_candidate.sql");
  const migration = source("supabase/migrations/20260625030000_market_reference_active_listing_normalized_evidence_schema_v1.sql");
  const stripped = stripSqlComments(candidate);

  assert.match(candidate, /MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZED_EVIDENCE_SCHEMA_V1 migration candidate/);
  assert.equal(sha256(candidate), sha256(migration));
  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /commit\s*;\s*$/i);
  assert.doesNotMatch(stripped, /\brollback\s*;/i);
});

test("active-listing normalized schema keeps ebay active review-only", () => {
  const stripped = stripSqlComments(source("docs/sql/market_reference_active_listing_normalized_evidence_schema_v1_migration_candidate.sql"));

  assert.match(stripped, /source\s+in\s*\(\s*'tcgcsv_reference'\s*,\s*'pokemontcg_io_reference'\s*,\s*'ebay_active'\s*\)/i);
  assert.match(stripped, /source\s*=\s*'ebay_active'[\s\S]*'review_required_active_listing'[\s\S]*'quarantined_active_listing_context'[\s\S]*'blocked_candidate'/i);
  assert.match(stripped, /market_reference_normalized_evidence_active_listing_review_only_check/i);
  assert.match(stripped, /source\s+<>\s+'ebay_active'[\s\S]*or\s+model_eligible\s*=\s*false/i);
  assert.doesNotMatch(stripped, /source\s*=\s*'ebay_active'[\s\S]*reference_model_candidate/i);
});

test("active-listing normalized schema candidate cannot publish prices or change app surfaces", () => {
  const stripped = stripSqlComments(source("docs/sql/market_reference_active_listing_normalized_evidence_schema_v1_migration_candidate.sql"));

  assert.doesNotMatch(stripped, /\binsert\s+into\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\./i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.doesNotMatch(stripped, /\bmerge\s+into\b/i);
  assert.doesNotMatch(stripped, /\bpricing_observations\b/i);
  assert.doesNotMatch(stripped, /\bebay_active_prices_latest\b/i);
  assert.doesNotMatch(stripped, /\bcreate\s+(materialized\s+)?view\b/i);
  assert.doesNotMatch(stripped, /\bto\s+(anon|authenticated|public)\b/i);
});
