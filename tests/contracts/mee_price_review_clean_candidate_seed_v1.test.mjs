import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

const applyPath = "docs/sql/mee_price_review_clean_candidate_seed_v1_apply.sql";
const readbackPath = "docs/sql/mee_price_review_clean_candidate_seed_v1_readback.sql";

test("MEE price review clean candidate seed inserts only internal approvals", () => {
  const sql = stripSqlComments(read(applyPath));

  assert.match(sql, /insert\s+into\s+public\.market_evidence_price_review_events/i);
  assert.match(sql, /where\s+future_publication_review_candidate\s+=\s+true/i);
  assert.match(sql, /'approve_internal_price_signal'/);
  assert.match(sql, /'approved_internal'/);
  assert.match(sql, /'clean_raw_single_policy_candidate'/);
  assert.match(sql, /source_type\s+<>\s+'active_listing'/);
  assert.match(sql, /evidence_lane\s+<>\s+'raw_single'/);
  assert.match(sql, /price_policy_decision\s+<>\s+'raw_single_policy_candidate'/);
});

test("MEE price review clean candidate seed keeps public boundary closed", () => {
  const sql = stripSqlComments(`${read(applyPath)}\n${read(readbackPath)}`);

  assert.match(sql, /false,\s*false,\s*false,\s*false/s);
  assert.doesNotMatch(sql, /\binsert\s+into\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(sql, /\binsert\s+into\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\.pricing_observations\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\.ebay_active_prices_latest\b/i);
  assert.doesNotMatch(sql, /\bcreate\s+or\s+replace\s+view\s+public\.v_card_pricing_ui_v1\b/i);
});

test("MEE price review clean candidate seed artifacts exist", () => {
  for (const artifactPath of [applyPath, readbackPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
});
