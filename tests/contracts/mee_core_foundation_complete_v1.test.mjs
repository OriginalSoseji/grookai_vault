import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const batchReportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1/report.json";
const publishReportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-PUBLISH-GATE-CONTRACT-V1/report.json";
const runbookReportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-DAILY-RUNBOOK-V1/report.json";
const finalReportPath = "docs/audits/market_evidence_engine_v1/MEE-CORE-FOUNDATION-COMPLETE-V1/report.json";
const batchManifestPath =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1/row_manifest.jsonl";
const batchApplySqlPath = "docs/sql/mee_core_batch_review_action_workflow_v1_apply_candidate.sql";
const batchPreflightSqlPath = "docs/sql/mee_core_batch_review_action_workflow_v1_preflight.sql";
const batchReadbackSqlPath = "docs/sql/mee_core_batch_review_action_workflow_v1_readback.sql";
const batchRollbackSqlPath = "docs/sql/mee_core_batch_review_action_workflow_v1_rollback_candidate.sql";
const scriptPath = "scripts/audits/market_evidence_foundation_complete_v1.mjs";

test("MEE core foundation complete checkpoint marks remaining blockers complete", () => {
  const report = loadJson(finalReportPath);

  assert.equal(report.package_id, "MEE-CORE-FOUNDATION-COMPLETE-V1");
  assert.equal(report.mode, "foundation_complete_checkpoint");
  assert.equal(report.package_fingerprint_sha256, "b24aa4df37d6a509fe12e2a0e8c6b6bf0b2ddecd7327173fd7c387aa7a6e860a");
  assert.equal(report.foundation_status, "complete");
  assert.deepEqual(report.completed_blockers, [
    "post_ingest_review_orchestrator",
    "lane_policy_contract",
    "batch_review_action_workflow",
    "publish_gate_contract",
    "runbook",
  ]);
  assert.deepEqual(report.findings, []);
});

test("MEE core foundation complete checkpoint keeps pricing and provider truth blocked", () => {
  const report = loadJson(finalReportPath);

  assert.deepEqual(report.still_not_allowed, [
    "public pricing writes without publish-gate apply",
    "pricing_observations writes from providers",
    "ebay_active_prices_latest writes from MEE review",
    "identity/vault/image writes from MEE",
    "treating active listings or reference metrics as market truth",
  ]);
  assert.match(report.next_operational_step, /550 require_split rows/);
  for (const [key, value] of Object.entries(report.boundary_proof)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE core batch review action workflow creates one safe internal apply package", () => {
  const report = loadJson(batchReportPath);
  const manifest = read(batchManifestPath).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));

  assert.equal(report.package_id, "MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1");
  assert.equal(report.package_fingerprint_sha256, "39ce2ce20a6896b7e4558eeab97a263aed45127cbe092631b74251166ef8aa89");
  assert.equal(report.workflow_status, "ready_for_single_safe_internal_apply_package");
  assert.deepEqual(report.batch_plan, {
    safe_internal_action_rows: 550,
    actions: { require_split: 550 },
    applies_public_pricing: false,
    creates_market_truth: false,
    sets_public_flags: false,
    one_approval_per_post_ingest_cycle: true,
  });
  assert.equal(manifest.length, 550);
  assert.equal(manifest.every((row) => row.action_name === "require_split"), true);
  assert.equal(manifest.every((row) => row.reason_code === "mixed_raw_slab_requires_split"), true);
  assert.equal(manifest.every((row) => row.public_pricing_allowed === false), true);
});

test("MEE core batch review action workflow hashes and SQL candidates are stable", () => {
  const report = loadJson(batchReportPath);

  assert.equal(sha256(read(batchManifestPath)), report.hashes.row_manifest_sha256);
  assert.equal(sha256(read(batchApplySqlPath)), report.hashes.apply_sql_sha256);
  assert.equal(sha256(read(batchPreflightSqlPath)), report.hashes.preflight_sql_sha256);
  assert.equal(sha256(read(batchReadbackSqlPath)), report.hashes.readback_sql_sha256);
  assert.equal(sha256(read(batchRollbackSqlPath)), report.hashes.rollback_sql_sha256);
  assert.deepEqual(report.hashes, {
    row_manifest_sha256: "a1b20d39495ae76afa2f24b1158183dc85fa51d288f5ce4e8afe812a214ff416",
    apply_sql_sha256: "e39091c11747b4382c03aabb827cab3e6ca74a5c1c66a819561d63c3dadba5c4",
    preflight_sql_sha256: "ff9d2f079d03be6b2eecc1fd3eb34f38b82a7c8b16a2ebeb4dc703a6ba901eb5",
    readback_sql_sha256: "a2c8941820b1660f24ddacd4da01115f9223f4973572de9621adcd7f309fc50d",
    rollback_sql_sha256: "a47e7cacc13d5d63186d5411e789e0ba945174c525a8d12c8975ae3ee4cf49e6",
  });
});

test("MEE core publish gate contract exists but allows no current public writes", () => {
  const report = loadJson(publishReportPath);

  assert.equal(report.package_id, "MEE-CORE-PUBLISH-GATE-CONTRACT-V1");
  assert.equal(report.package_fingerprint_sha256, "7c9f62e8c1d7d89f4065a51ce6f1dcdd269dd08ff7fb1fd8b01a55a04dd6d736");
  assert.equal(report.publish_gate_status, "contract_defined_no_public_apply");
  assert.equal(report.current_allowed_public_writes, false);
  assert.deepEqual(report.gate_rules, [
    "Only resolved review_confirmed_internal_candidate rows may be considered.",
    "Evidence lane must be raw_single or slab, never mixed_raw_slab.",
    "All public flags must still be false before publish-gate apply.",
    "Source mix, confidence, freshness, outlier rules, and replay references must be present.",
    "Reference metrics alone cannot publish.",
    "Active listing asking prices alone cannot publish as market truth.",
    "Publish gate writes require a separate future approval and must never be bundled with ingest or review actions.",
  ]);
});

test("MEE core daily runbook gives one operator loop", () => {
  const report = loadJson(runbookReportPath);

  assert.equal(report.package_id, "MEE-CORE-DAILY-RUNBOOK-V1");
  assert.equal(report.package_fingerprint_sha256, "e54a7a414e92c55b9ff8a2eb4822a2e3d8d8d0a5c281b92f57a5ac72b5ac8569");
  assert.equal(report.runbook_status, "complete");
  assert.equal(report.steps.length, 7);
  assert.equal(report.steps.at(-1), "Stop before public pricing unless a separate publish-gate package is prepared and approved.");
});

test("MEE core foundation complete artifacts are present and generator stays local", () => {
  const script = read(scriptPath);

  for (const artifactPath of [
    batchReportPath,
    publishReportPath,
    runbookReportPath,
    finalReportPath,
    batchManifestPath,
    batchApplySqlPath,
    batchPreflightSqlPath,
    batchReadbackSqlPath,
    batchRollbackSqlPath,
    "docs/contracts/MEE_CORE_PUBLISH_GATE_CONTRACT_V1.md",
    "docs/contracts/MEE_CORE_DAILY_RUNBOOK_V1.md",
    "docs/checkpoints/market_evidence_engine/MEE_CORE_FOUNDATION_COMPLETE_V1.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
  }
  assert.doesNotMatch(script, /\bsupabase\b/i);
  assert.doesNotMatch(script, /\bfetch\s*\(/i);
  assert.doesNotMatch(script, /\bhttps\.request\b/i);
});
