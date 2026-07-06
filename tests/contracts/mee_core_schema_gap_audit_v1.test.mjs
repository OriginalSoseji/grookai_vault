import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("MEE_CORE_SCHEMA_GAP_AUDIT_V1 stays dry-run and proposes only lifecycle-state core objects", () => {
  const plan = readFileSync(
    new URL("../../docs/plans/market_evidence_engine_v1/MEE_CORE_SCHEMA_GAP_AUDIT_V1.md", import.meta.url),
    "utf8",
  );
  const audit = readFileSync(
    new URL("../../docs/audits/market_evidence_engine_v1/MEE_CORE_SCHEMA_GAP_AUDIT_V1.md", import.meta.url),
    "utf8",
  );
  const sql = readFileSync(
    new URL("../../docs/sql/mee_core_schema_gap_audit_v1_dry_run_migration_plan.sql", import.meta.url),
    "utf8",
  );
  const migration = readFileSync(
    new URL("../../supabase/migrations/20260625060000_market_evidence_core_lifecycle_v1.sql", import.meta.url),
    "utf8",
  );

  for (const stage of [
    "acquired",
    "raw_stored",
    "normalized",
    "matched",
    "classified",
    "quality_gated",
    "rollup_eligible",
    "rolled_up_internal",
    "publishable",
    "app_visible",
  ]) {
    assert.match(sql, new RegExp(`'${stage}'`));
    assert.match(migration, new RegExp(`'${stage}'`));
    assert.match(audit, new RegExp(`\\b${stage}\\b`));
  }

  for (const objectName of [
    "market_evidence_observations",
    "market_evidence_lifecycle_events",
    "v_market_evidence_lifecycle_current_v1",
  ]) {
    assert.match(plan, new RegExp(objectName));
    assert.match(audit, new RegExp(objectName));
    assert.match(sql, new RegExp(objectName));
    assert.match(migration, new RegExp(objectName));
  }

  assert.match(sql, /^begin;$/im);
  assert.match(sql, /^rollback;$/im);
  assert.doesNotMatch(sql, /commit;/i);
  assert.match(migration, /^begin;$/im);
  assert.match(migration, /^commit;$/im);
  assert.doesNotMatch(migration, /^rollback;$/im);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.pricing_observations/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.ebay_active_prices_latest/i);
  assert.doesNotMatch(sql, /create\s+(or\s+replace\s+)?view\s+public\.v_card_pricing_ui_v1/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.pricing_observations/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.ebay_active_prices_latest/i);
  assert.doesNotMatch(migration, /create\s+(or\s+replace\s+)?view\s+public\.v_card_pricing_ui_v1/i);
  assert.match(migration, /to service_role/);
  assert.match(plan, /No remote migration apply/);
  assert.match(audit, /No Supabase migration file was created/);
});
