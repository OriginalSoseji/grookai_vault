import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
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

test("MEE-07B free-reference warehouse SQL is rollback-only", () => {
  const sql = source("docs/sql/market_reference_warehouse_v1_guarded_dry_run.sql");
  const stripped = stripSqlComments(sql);

  assert.match(sql, /MARKET_REFERENCE_WAREHOUSE_V1 guarded dry-run/);
  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /rollback\s*;\s*$/i);
  assert.doesNotMatch(stripped, /\bcommit\s*;/i);
});

test("MEE-07B creates only the isolated reference warehouse tables", () => {
  const sql = source("docs/sql/market_reference_warehouse_v1_guarded_dry_run.sql");
  const stripped = stripSqlComments(sql);

  const createTableMatches = [...stripped.matchAll(/create\s+table\s+public\.([a-z0-9_]+)/gi)].map((match) => match[1]);

  assert.deepEqual(createTableMatches, [
    "market_reference_acquisition_runs",
    "market_reference_raw_snapshots",
    "market_reference_candidates",
    "market_reference_normalized_evidence",
    "market_reference_coverage_reports",
  ]);
  assert.match(stripped, /source\s+in\s+\('tcgcsv_reference',\s*'pokemontcg_io_reference'\)/i);
  assert.match(stripped, /can_publish_price_directly\s+boolean\s+not\s+null\s+default\s+false/i);
  assert.match(stripped, /needs_review\s+boolean\s+not\s+null\s+default\s+true/i);
});

test("MEE-07B dry-run SQL cannot alter pricing truth or public app pricing", () => {
  const sql = source("docs/sql/market_reference_warehouse_v1_guarded_dry_run.sql");
  const stripped = stripSqlComments(sql);

  assert.doesNotMatch(stripped, /\binsert\s+into\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(stripped, /\balter\s+table\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(stripped, /\b(insert|update|alter\s+table)\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(stripped, /\bcreate\s+(materialized\s+)?view\b/i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.match(stripped, /publishes_public_prices/i);
  assert.match(stripped, /creates_app_facing_pricing_view/i);
});

test("MEE-07B dry-run remains rollback-only after approved migration creation", () => {
  const migrations = readdirSync(new URL("../../supabase/migrations/", import.meta.url));
  const referenceWarehouseMigrations = migrations.filter((name) => /market_reference_warehouse_v1/i.test(name));
  const dryRun = source("docs/sql/market_reference_warehouse_v1_guarded_dry_run.sql");
  const migration = source("supabase/migrations/20260625000000_market_reference_warehouse_v1.sql");

  assert.deepEqual(referenceWarehouseMigrations, ["20260625000000_market_reference_warehouse_v1.sql"]);
  assert.notEqual(sha256(dryRun), sha256(migration));
  assert.match(stripSqlComments(dryRun), /rollback\s*;\s*$/i);
});
