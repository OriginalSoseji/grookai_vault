import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

const reportPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-DESIGN-V1/report.json";
const reportMdPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-DESIGN-V1.md";
const contractPath = "docs/contracts/MEE_PUBLICATION_GATE_DESIGN_V1.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_PUBLICATION_GATE_DESIGN_V1.md";
const checkpointPath = "docs/checkpoints/market_evidence_engine/MEE_PUBLICATION_GATE_DESIGN_V1.md";
const viewSqlPath = "docs/sql/mee_publication_gate_design_v1_view_candidates.sql";
const readbackSqlPath = "docs/sql/mee_publication_gate_design_v1_readback.sql";
const fastPathIndexMigrationPath = "supabase/migrations/20260625150000_market_evidence_publication_gate_fast_path_indexes_v1.sql";

test("MEE publication gate design remains plan-only and internal", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, "MEE-PUBLICATION-GATE-DESIGN-V1");
  assert.equal(report.mode, "plan_only_internal_publication_gate_design");
  assert.equal(report.remote_migration_apply, false);
  assert.equal(report.db_writes, false);
  assert.equal(report.provider_calls, false);
  assert.equal(report.public_pricing_views, false);
  assert.equal(report.app_visible_pricing, false);
  assert.deepEqual(report.findings, []);
});

test("MEE publication gate design preserves closed public flags", () => {
  const report = loadJson(reportPath);
  const sql = read(viewSqlPath);

  assert.deepEqual(report.boundary, {
    can_publish_price_directly: false,
    publishable: false,
    app_visible: false,
    market_truth: false,
  });
  assert.match(sql, /false\s+as\s+can_publish_price_directly/i);
  assert.match(sql, /false\s+as\s+publishable/i);
  assert.match(sql, /false\s+as\s+app_visible/i);
  assert.match(sql, /false\s+as\s+market_truth/i);
});

test("MEE publication gate design separates raw singles, slabs, and reference evidence", () => {
  const contract = read(contractPath);
  const sql = read(viewSqlPath);

  assert.match(contract, /raw_single/);
  assert.match(contract, /slab/);
  assert.match(contract, /reference_metric/);
  assert.match(sql, /rollup_raw_single_events/);
  assert.match(sql, /rollup_slab_events/);
  assert.match(sql, /rollup_reference_events/);
  assert.match(sql, /blocked_reference_only/);
  assert.match(sql, /blocked_lane_split_required/);
});

test("MEE publication gate reads the materialized lifecycle rollup summary", () => {
  const sql = read(viewSqlPath);

  assert.match(sql, /from public\.market_evidence_review_dispositions/i);
  assert.doesNotMatch(sql, /from public\.v_market_evidence_review_dashboard_queue_v1/i);
  assert.match(sql, /public\.mv_market_evidence_lifecycle_rollup_summary_v1/i);
  assert.match(sql, /l\.rollup_raw_single_events/);
  assert.match(sql, /l\.rollup_slab_events/);
  assert.match(sql, /l\.rollup_reference_events/);
  assert.match(sql, /l\.lifecycle_public_boundary_leaks/);
  assert.doesNotMatch(sql, /from public\.market_evidence_lifecycle_events\s+where card_print_id is not null/i);
});

test("MEE lifecycle materialized summary preserves rollup counts and public boundary checks", () => {
  const sql = read("supabase/migrations/20260625160000_market_evidence_lifecycle_rollup_summary_materialized_v1.sql");

  assert.match(sql, /create materialized view if not exists public\.mv_market_evidence_lifecycle_rollup_summary_v1/i);
  assert.match(sql, /e\.to_state = 'rollup_eligible'/i);
  assert.match(sql, /e\.rollup_eligible = true/i);
  assert.match(sql, /e\.source_type = 'active_listing'/i);
  assert.match(sql, /e\.evidence_class = 'raw_single'/i);
  assert.match(sql, /e\.publishable\s+or e\.app_visible\s+or e\.market_truth/i);
  assert.match(sql, /mv_market_evidence_lifecycle_rollup_summary_v1_card_idx/i);
});

test("MEE publication gate fast-path indexes support lifecycle summary and boundary checks", () => {
  const sql = read(fastPathIndexMigrationPath);

  assert.match(sql, /market_evidence_lifecycle_events_rollup_eligible_fast_idx/i);
  assert.match(sql, /where to_state = 'rollup_eligible'\s+and rollup_eligible = true/i);
  assert.match(sql, /market_evidence_lifecycle_events_public_boundary_fast_idx/i);
  assert.match(sql, /where publishable\s+or app_visible\s+or market_truth/i);
  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
});

test("MEE publication gate design does not write public pricing or provider data", () => {
  const sqlContents = [
    read(viewSqlPath),
    read(readbackSqlPath),
  ].join("\n");
  const contract = read(contractPath);

  assert.doesNotMatch(sqlContents, /\binsert\s+into\b/i);
  assert.doesNotMatch(sqlContents, /\bupdate\s+public\./i);
  assert.doesNotMatch(sqlContents, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sqlContents, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sqlContents, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sqlContents, /\bpricing_observations\s*\(/i);
  assert.doesNotMatch(sqlContents, /\bebay_active_prices_latest\b/i);
  assert.match(contract, /does not.*write `pricing_observations`/is);
  assert.match(contract, /does not.*write `ebay_active_prices_latest`/is);
});

test("MEE publication gate design artifacts exist and hash", () => {
  const report = loadJson(reportPath);

  for (const artifactPath of [
    reportPath,
    reportMdPath,
    contractPath,
    planPath,
    checkpointPath,
    viewSqlPath,
    readbackSqlPath,
    fastPathIndexMigrationPath,
    "supabase/migrations/20260625160000_market_evidence_lifecycle_rollup_summary_materialized_v1.sql",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
    assert.equal(typeof sha256(read(artifactPath)), "string");
  }
  assert.deepEqual(report.proposed_objects, ["public.v_market_evidence_publication_gate_candidates_v1"]);
});
