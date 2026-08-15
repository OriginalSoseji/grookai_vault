import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_COMPLETE_NUMBERED_APPLY_PINNED_INPUTS,
  buildOnePieceCompleteNumberedApplyPlanV1,
  validateOnePieceCompleteNumberedApplyPlanV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_apply_v1.mjs";

function load(file, compressed = false) {
  const body = fs.readFileSync(file);
  return JSON.parse(compressed ? gunzipSync(body) : body);
}

function fixture() {
  const promotionPlan = load(
    "docs/audits/pricing/one_piece_complete_numbered_canonical_promotion_v1/frozen_plan_v1/promotion_plan.json.gz",
    true,
  );
  const applyPlan = buildOnePieceCompleteNumberedApplyPlanV1({
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
      tracked_worktree_clean: true,
    },
    inputHashes: ONE_PIECE_COMPLETE_NUMBERED_APPLY_PINNED_INPUTS,
    promotionPlan,
    preflightSummary: load(
      "docs/audits/pricing/one_piece_complete_numbered_canonical_preflight_v1/production_read_only_v1/summary.json"),
    rollbackSummary: load(
      "docs/audits/pricing/one_piece_complete_numbered_canonical_rollback_canary_v1/production_rollback_v1/summary.json"),
    rollbackTransaction: load(
      "docs/audits/pricing/one_piece_complete_numbered_canonical_rollback_canary_v1/production_rollback_v1/transaction_proof.json"),
    postRollbackReadback: load(
      "docs/audits/pricing/one_piece_complete_numbered_canonical_rollback_canary_v1/production_rollback_v1/post_rollback_readback.json"),
  });
  return { promotionPlan, applyPlan };
}

test("durable plan freezes exact hidden insert-only scope", () => {
  const { promotionPlan, applyPlan } = fixture();
  assert.equal(validateOnePieceCompleteNumberedApplyPlanV1(
    applyPlan, promotionPlan).valid, true);
  assert.deepEqual(applyPlan.target_binding.counts, {
    sets: 58,
    card_prints: 6491,
    card_print_identity: 6491,
    card_print_identity_source_evidence: 6491,
    external_mappings: 6491,
  });
  assert.equal(applyPlan.execution.chunk_size, 250);
  assert.equal(applyPlan.boundaries.app_visibility_enabled, false);
});

test("proof drift and scope expansion fail closed", () => {
  const { promotionPlan, applyPlan } = fixture();
  const changed = structuredClone(applyPlan);
  changed.boundaries.pricing_writes = 1;
  changed.target_binding.card_print_ids_sha256 = "0".repeat(64);
  assert.equal(validateOnePieceCompleteNumberedApplyPlanV1(
    changed, promotionPlan).valid, false);
  assert.throws(() => buildOnePieceCompleteNumberedApplyPlanV1({
    repository: applyPlan.repository,
    inputHashes: { ...ONE_PIECE_COMPLETE_NUMBERED_APPLY_PINNED_INPUTS,
      rollback_summary_sha256: "0".repeat(64) },
    promotionPlan,
  }), /proof inputs changed/i);
});

test("apply-plan generator is offline", () => {
  const source = fs.readFileSync(
    "scripts/audits/one_piece_complete_numbered_canonical_apply_plan_v1.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /from ["']pg["']|dotenv|marketEvidenceDbUrl/);
});
