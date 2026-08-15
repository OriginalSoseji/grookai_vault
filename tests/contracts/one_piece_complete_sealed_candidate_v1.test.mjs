import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_COMPLETE_SEALED_EXPECTED,
  ONE_PIECE_COMPLETE_SEALED_PINNED_INPUTS,
  buildOnePieceCompleteSealedCandidatePlanV1,
  buildOnePieceCompleteSealedApplyPlanV1,
  evaluateOnePieceCompleteSealedCandidateReadbackV1,
  evaluateOnePieceCompleteSealedCandidateWritesV1,
  expectedOnePieceCompleteSealedCandidateWritesV1,
  selectOnePieceCompleteSealedCanaryV1,
  validateOnePieceCompleteSealedApplyPlanV1,
  validateOnePieceCompleteSealedCandidatePlanV1,
} from "../../backend/pricing/one_piece_complete_sealed_candidate_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const manifestPath =
  "docs/audits/pricing/one_piece_canonical_catalog_readiness_v1/current_complete_source_2026-08-14_v1/source_product_manifest.jsonl.gz";
const summaryPath =
  "docs/audits/pricing/one_piece_complete_canonical_reconciliation_v1/frozen_reconciliation_v1/summary.json";
const lanePath =
  "docs/audits/pricing/one_piece_complete_canonical_reconciliation_v1/frozen_reconciliation_v1/sealed_lane.jsonl";

function jsonl(body, compressed = false) {
  const text = compressed ? gunzipSync(body).toString("utf8") : body.toString("utf8");
  return text.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

let cached;
function fixture() {
  if (cached) return cached;
  const manifest = fs.readFileSync(manifestPath);
  const summary = fs.readFileSync(summaryPath);
  const lane = fs.readFileSync(lanePath);
  cached = buildOnePieceCompleteSealedCandidatePlanV1({
    repository: { commit_sha: "a".repeat(40) },
    inputHashes: { source_manifest_gzip_sha256: sha256(manifest),
      reconciliation_summary_sha256: sha256(summary),
      sealed_lane_sha256: sha256(lane) },
    manifestRows: jsonl(manifest, true), sealedLane: jsonl(lane),
  });
  return cached;
}

test("sealed candidate plan accounts for all 403 source products", () => {
  const plan = fixture();
  assert.deepEqual(plan.counts, ONE_PIECE_COMPLETE_SEALED_EXPECTED);
  assert.equal(validateOnePieceCompleteSealedCandidatePlanV1(plan).valid, true);
});

test("English, Japanese, future, and no-price products remain review-only", () => {
  const rows = fixture().payload.candidates;
  assert.equal(rows.filter((row) =>
    row.candidate_identity.language.normalized === "ja").length, 3);
  assert.equal(rows.filter((row) =>
    row.candidate_identity.release.future_release).length, 10);
  assert.equal(rows.filter((row) =>
    row.evidence[2].source_price_lanes.length === 0).length, 40);
  assert.ok(rows.every((row) => row.requires_review &&
    !row.promotion_eligible && !row.canonical_authority &&
    !row.publication_authority));
});

test("candidate graph contains no family, variant, mapping, or pointer authority", () => {
  const plan = fixture();
  assert.ok(plan.payload.candidates.every((row) =>
    row.candidate_identity.canonical_family === null &&
    row.candidate_identity.canonical_variant === null &&
    row.evidence[2].source_image_pointer_authorized === false));
  assert.deepEqual(expectedOnePieceCompleteSealedCandidateWritesV1(), {
    sealed_product_candidates: 403,
  });
});

test("tampering with authority or downstream scope fails closed", () => {
  for (const mutate of [
    (plan) => { plan.payload.candidates[0].promotion_eligible = true; },
    (plan) => { plan.payload.candidates[0].candidate_identity.canonical_family = "x"; },
    (plan) => { plan.boundaries.variant_writes = 1; },
  ]) {
    const plan = structuredClone(fixture());
    mutate(plan);
    assert.equal(validateOnePieceCompleteSealedCandidatePlanV1(plan).valid, false);
  }
});

test("sealed plan pins the complete source release", () => {
  assert.deepEqual(ONE_PIECE_COMPLETE_SEALED_PINNED_INPUTS, {
    source_manifest_gzip_sha256:
      "973bec5c186adc8853dcff91218e1057772aea384f9a3318919fb03b9c39bc0e",
    reconciliation_summary_sha256:
      "830418974b7eea09ce92f9197d0b39f643b40bd79029fcc4a84ed4e1f09d72f3",
    sealed_lane_sha256:
      "c2516e5396745c8b37ecc979b32c2045033656510479a60cc686be25259f54c4",
  });
});

test("ten-row canary spans product forms, Japanese, and future evidence", () => {
  const rows = selectOnePieceCompleteSealedCanaryV1(fixture());
  assert.equal(rows.length, 10);
  assert.equal(new Set(rows.map((row) => row.source_product_id)).size, 10);
  assert.ok(rows.some((row) => row.candidate_identity.language.normalized === "ja"));
  assert.ok(rows.some((row) => row.candidate_identity.release.future_release));
});

test("candidate readback, write attribution, and apply scope remain exact", () => {
  const plan = fixture();
  assert.deepEqual(evaluateOnePieceCompleteSealedCandidateReadbackV1({
    candidates: plan.payload.candidates, readback: plan.payload.candidates,
  }), []);
  assert.deepEqual(evaluateOnePieceCompleteSealedCandidateWritesV1([{
    table_name: "sealed_product_candidates", inserted: 403, updated: 0,
    deleted: 0, hot_updated: 0,
  }]), []);
  const preflight = { status: "production_read_only_preflight_passed",
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    preflight_fingerprint_sha256: "b".repeat(64), findings: [] };
  const canary = { status: "production_rollback_canary_passed",
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    canary_fingerprint_sha256: "c".repeat(64), findings: [] };
  const applyPlan = buildOnePieceCompleteSealedApplyPlanV1({
    repository: { commit_sha: "a".repeat(40) }, candidatePlan: plan,
    preflightSummary: preflight, canarySummary: canary,
    proofHashes: { preflight: "d".repeat(64), canary: "e".repeat(64) },
  });
  assert.equal(validateOnePieceCompleteSealedApplyPlanV1(applyPlan, plan).valid,
    true);
  applyPlan.boundaries.variant_writes = 1;
  assert.equal(validateOnePieceCompleteSealedApplyPlanV1(applyPlan, plan).valid,
    false);
});

test("sealed gate runner is read-only before one guarded insert-only commit", () => {
  const source = fs.readFileSync(
    "scripts/audits/one_piece_complete_sealed_candidate_gate_v1.mjs", "utf8");
  assert.match(source, /begin transaction isolation level repeatable read read only/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.equal(source.match(/client\.query\("commit"\)/g)?.length, 1);
  assert.doesNotMatch(source,
    /\bupdate\s+public\.|\bdelete\s+from\s+public\.|\btruncate\b/i);
});
