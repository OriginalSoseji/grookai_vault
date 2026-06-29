import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
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

test("MEE-07C migration candidate commits and approved migration matches it", () => {
  const sql = source("docs/sql/market_reference_warehouse_v1_migration_candidate.sql");
  const stripped = stripSqlComments(sql);
  const migrations = readdirSync(new URL("../../supabase/migrations/", import.meta.url));
  const migration = source("supabase/migrations/20260625000000_market_reference_warehouse_v1.sql");

  assert.match(sql, /MARKET_REFERENCE_WAREHOUSE_V1 migration candidate/);
  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /commit\s*;\s*$/i);
  assert.doesNotMatch(stripped, /\brollback\s*;/i);
  assert.deepEqual(migrations.filter((name) => /market_reference_warehouse_v1/i.test(name)), ["20260625000000_market_reference_warehouse_v1.sql"]);
  assert.equal(sha256(migration), sha256(sql));
});

test("MEE-07C migration candidate keeps the same schema scope as the dry-run", () => {
  const dryRun = stripSqlComments(source("docs/sql/market_reference_warehouse_v1_guarded_dry_run.sql"))
    .replace(/MARKET_REFERENCE_WAREHOUSE_V1_DRY_RUN/g, "MARKET_REFERENCE_WAREHOUSE_V1_MIGRATION_CANDIDATE")
    .replace(/\brollback\s*;\s*$/i, "commit;");
  const candidate = stripSqlComments(source("docs/sql/market_reference_warehouse_v1_migration_candidate.sql"));

  const normalize = (sql) => sql
    .replace(/\s+/g, " ")
    .replace(/MARKET_REFERENCE_WAREHOUSE_V1 guarded dry-run\./i, "MARKET_REFERENCE_WAREHOUSE_V1 migration candidate.")
    .replace(/Purpose: draft schema only/i, "Purpose: proposed schema only")
    .replace(/This transaction intentionally ends with ROLLBACK\./i, "This is a review artifact, not an applied Supabase migration.")
    .trim();

  assert.equal(normalize(candidate), normalize(dryRun));
});

test("MEE-07C migration candidate cannot alter pricing truth or public app pricing", () => {
  const sql = source("docs/sql/market_reference_warehouse_v1_migration_candidate.sql");
  const stripped = stripSqlComments(sql);

  assert.doesNotMatch(stripped, /\binsert\s+into\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(stripped, /\balter\s+table\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(stripped, /\b(insert|update|alter\s+table)\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(stripped, /\bcreate\s+(materialized\s+)?view\b/i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.match(stripped, /can_publish_price_directly\s+boolean\s+not\s+null\s+default\s+false/i);
  assert.match(stripped, /needs_review\s+boolean\s+not\s+null\s+default\s+true/i);
});
