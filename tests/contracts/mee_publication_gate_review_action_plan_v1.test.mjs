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

const reportPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-ACTION-PLAN-V1/report.json";
const markdownPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-ACTION-PLAN-V1.md";
const rawAuditPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-ACTION-PLAN-V1/live_audit_raw.json";
const manifestPath = "docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-ACTION-PLAN-V1/defer_review_confirmation_manifest.json";
const preflightPath = "docs/sql/mee_publication_gate_review_action_plan_v1_preflight.sql";
const readbackPath = "docs/sql/mee_publication_gate_review_action_plan_v1_readback.sql";

test("publication gate review action plan is plan-only", () => {
  const report = loadJson(reportPath);

  assert.equal(report.package_id, "MEE-PUBLICATION-GATE-REVIEW-ACTION-PLAN-V1");
  assert.equal(report.remote_apply, false);
  assert.equal(report.db_writes, false);
  assert.equal(report.function_invocation, false);
  assert.equal(report.provider_calls, false);
  assert.equal(report.source_fetches, false);
  assert.equal(report.public_pricing_views, false);
  assert.equal(report.app_visible_pricing, false);
  assert.equal(report.apply_candidate_generated, false);
  assert.deepEqual(report.findings, []);
});

test("publication gate review action plan classifies all gate rows", () => {
  const report = loadJson(reportPath);

  assert.equal(report.gate_readback.total_rows, 2152);
  assert.equal(report.gate_readback.public_boundary_leak_rows, 0);
  assert.equal(report.gate_readback.would_be_publication_candidate_rows, 0);
  assert.deepEqual(
    Object.fromEntries(report.action_buckets.map((row) => [row.action_bucket, row.rows])),
    {
      require_reclassification_or_keep_blocked: 19,
      require_split_or_keep_split_block: 574,
      monitor_or_keep_blocked: 174,
      reference_only_hold_until_active_market_evidence: 915,
      review_confirmation_required: 470,
    },
  );
});

test("review confirmation candidates are held, not auto-applied", () => {
  const report = loadJson(reportPath);
  const manifest = loadJson(manifestPath);

  assert.equal(report.review_confirmation_candidates.total, 470);
  assert.equal(report.review_confirmation_candidates.raw_single, 378);
  assert.equal(report.review_confirmation_candidates.slab, 92);
  assert.equal(report.review_confirmation_candidates.automatic_confirmation_allowed, false);
  assert.equal(manifest.length, 470);
  assert.equal(manifest.every((row) => ["raw_single", "slab"].includes(row.evidence_lane)), true);
});

test("publication gate review SQL is read-only and does not invoke actions", () => {
  const sql = `${read(preflightPath)}\n${read(readbackPath)}`;

  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
  assert.doesNotMatch(sql, /apply_market_evidence_review_action_v1\s*\(/i);
  assert.doesNotMatch(sql, /\bpricing_observations\s*\(/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
});

test("publication gate review action plan artifacts exist and hash", () => {
  for (const artifactPath of [reportPath, markdownPath, rawAuditPath, manifestPath, preflightPath, readbackPath]) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
    assert.equal(typeof sha256(read(artifactPath)), "string");
  }
});

