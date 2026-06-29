import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PACKAGE_ID,
  buildMarketReferenceSignalRollupContractGateV1,
} from "../../scripts/audits/market_reference_signal_rollup_contract_gate_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

test("MEE-09D rollup SQL candidate is internal-only and non-public", () => {
  const sql = source("docs/sql/market_reference_signal_rollups_v1_migration_candidate.sql");
  const stripped = stripSqlComments(sql);

  assert.match(stripped, /\bcreate\s+table\s+public\.market_reference_signal_rollups\b/i);
  assert.match(stripped, /publishable\s+boolean\s+not\s+null\s+default\s+false/i);
  assert.match(stripped, /app_visible\s+boolean\s+not\s+null\s+default\s+false/i);
  assert.match(stripped, /market_truth\s+boolean\s+not\s+null\s+default\s+false/i);
  assert.match(stripped, /check\s*\(\s*publishable\s*=\s*false\s*\)/i);
  assert.match(stripped, /check\s*\(\s*app_visible\s*=\s*false\s*\)/i);
  assert.match(stripped, /check\s*\(\s*market_truth\s*=\s*false\s*\)/i);
  assert.match(stripped, /enable\s+row\s+level\s+security/i);
  assert.match(stripped, /to\s+service_role/i);
  assert.doesNotMatch(stripped, /\binsert\s+into\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(stripped, /\b(insert|update|alter\s+table)\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(stripped, /\bcreate\s+(materialized\s+)?view\b/i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
});

test("MEE-09D dry-run rolls back and candidate commits", () => {
  const dryRun = stripSqlComments(source("docs/sql/market_reference_signal_rollups_v1_guarded_dry_run.sql"));
  const candidate = stripSqlComments(source("docs/sql/market_reference_signal_rollups_v1_migration_candidate.sql"));

  assert.match(dryRun, /rollback\s*;\s*$/i);
  assert.match(candidate, /commit\s*;\s*$/i);
});

test("MEE-09D contract gate reports ready without writing", () => {
  const report = buildMarketReferenceSignalRollupContractGateV1({
    generatedAt: "2026-06-25T20:00:00.000Z",
  });
  const script = source("scripts/audits/market_reference_signal_rollup_contract_gate_v1.mjs");

  assert.equal(PACKAGE_ID, "MARKET-REFERENCE-SIGNAL-ROLLUP-CONTRACT-GATE-V1");
  assert.equal(report.ready_for_migration_file_candidate, true);
  assert.deepEqual(report.findings, []);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.boundary.migration_created, false);
  assert.equal(report.boundary.public_price_publication, false);
  assert.doesNotMatch(script, /createBackendClient|createClient|supabase\.from|supabase\.rpc|supabase\.storage/);
});
