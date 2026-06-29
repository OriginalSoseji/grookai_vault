import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

const migrationPath = "supabase/migrations/20260625170000_market_evidence_price_review_action_model_v1.sql";
const readbackPath = "docs/sql/mee_price_review_action_model_v1_readback.sql";
const contractPath = "docs/contracts/MEE_PRICE_REVIEW_ACTION_MODEL_V1.md";
const checkpointPath = "docs/checkpoints/market_evidence_engine/MEE_PRICE_REVIEW_ACTION_MODEL_V1.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_PRICE_REVIEW_ACTION_MODEL_V1.md";

test("MEE price review action model creates internal append-only objects", () => {
  const sql = stripSqlComments(read(migrationPath));

  assert.match(sql, /create\s+table\s+if\s+not\s+exists\s+public\.market_evidence_price_review_events/i);
  assert.match(sql, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_price_review_current_v1/i);
  assert.match(sql, /create\s+or\s+replace\s+view\s+public\.v_market_evidence_internal_approved_price_signals_v1/i);
  assert.match(sql, /grant\s+select,\s+insert\s+on\s+public\.market_evidence_price_review_events\s+to\s+service_role/i);
  assert.match(sql, /grant\s+select\s+on\s+public\.v_market_evidence_price_review_current_v1\s+to\s+service_role/i);
  assert.match(sql, /grant\s+select\s+on\s+public\.v_market_evidence_internal_approved_price_signals_v1\s+to\s+service_role/i);
  assert.doesNotMatch(sql, /grant\s+.*update/i);
  assert.doesNotMatch(sql, /grant\s+.*delete/i);
});

test("MEE price review action model keeps approved signals non-public", () => {
  const sql = stripSqlComments(read(migrationPath));

  assert.match(sql, /false\s+as\s+can_publish_price_directly/i);
  assert.match(sql, /false\s+as\s+publishable/i);
  assert.match(sql, /false\s+as\s+app_visible/i);
  assert.match(sql, /false\s+as\s+market_truth/i);
  assert.match(sql, /can_publish_price_directly\s+=\s+false/i);
  assert.match(sql, /publishable\s+=\s+false/i);
  assert.match(sql, /app_visible\s+=\s+false/i);
  assert.match(sql, /market_truth\s+=\s+false/i);
});

test("MEE price review action model accepts only raw-single active listing decisions", () => {
  const sql = stripSqlComments(read(migrationPath));

  assert.match(sql, /source_type\s+=\s+'active_listing'/i);
  assert.match(sql, /evidence_lane\s+=\s+'raw_single'/i);
  assert.match(sql, /'approve_internal_price_signal'/);
  assert.match(sql, /'hold_manual_review'/);
  assert.match(sql, /'reject_candidate'/);
  assert.match(sql, /'defer_more_evidence'/);
  assert.match(sql, /'clean_raw_single_policy_candidate'/);
  assert.match(sql, /'special_lane_hold'/);
});

test("MEE price review action model cannot write public pricing tables", () => {
  const sql = stripSqlComments(`${read(migrationPath)}\n${read(readbackPath)}`);

  assert.doesNotMatch(sql, /\binsert\s+into\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(sql, /\binsert\s+into\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bcreate\s+or\s+replace\s+view\s+public\.v_card_pricing_ui_v1\b/i);
});

test("MEE price review action model artifacts exist", () => {
  for (const artifactPath of [migrationPath, readbackPath, contractPath, checkpointPath, planPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});
