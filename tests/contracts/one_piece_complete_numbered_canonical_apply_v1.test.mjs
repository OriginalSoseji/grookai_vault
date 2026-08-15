import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_COMPLETE_NUMBERED_APPLY_PINNED_INPUTS,
  buildOnePieceCompleteNumberedApplyPlanV1,
  evaluateOnePieceCompleteNumberedAttributableWritesV1,
  evaluateOnePieceCompleteNumberedDurableReadbackV1,
  expectedOnePieceCompleteNumberedDurableReadbackV1,
  summarizeOnePieceCompleteNumberedDurableReadbackV1,
  validateOnePieceCompleteNumberedApplyPlanV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_apply_v1.mjs";
import { parseArgs } from
  "../../scripts/audits/one_piece_complete_numbered_canonical_apply_v1.mjs";

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

test("durable readback and attribution require exact hidden payload", () => {
  const { promotionPlan } = fixture();
  const readback = expectedOnePieceCompleteNumberedDurableReadbackV1(
    promotionPlan);
  assert.deepEqual(evaluateOnePieceCompleteNumberedDurableReadbackV1({
    promotionPlan, readback,
  }), []);
  const digest = summarizeOnePieceCompleteNumberedDurableReadbackV1(readback);
  assert.equal(digest.card_rows.row_count, 6491);
  readback.authenticated_visible = true;
  assert.deepEqual(evaluateOnePieceCompleteNumberedDurableReadbackV1({
    promotionPlan, readback,
  }), ["durable_visibility_mismatch:authenticated_visible"]);
  const writes = Object.entries({ sets: 58, card_prints: 6491,
    card_print_identity: 6491, card_print_identity_source_evidence: 6491,
    external_mappings: 6491 }).map(([table_name, inserted]) => ({
    table_name, inserted, updated: 0, deleted: 0, hot_updated: 0,
  }));
  assert.deepEqual(evaluateOnePieceCompleteNumberedAttributableWritesV1(
    writes), []);
  writes[0].updated = 1;
  assert.deepEqual(evaluateOnePieceCompleteNumberedAttributableWritesV1(
    writes), ["attributable_writes_mismatch"]);
});

test("durable writer requires exact execution fingerprints", () => {
  assert.throws(() => parseArgs([]), /--apply/);
  assert.throws(() => parseArgs(["--apply"]), /expected-head-sha/);
  const args = parseArgs([
    "--apply",
    `--expected-head-sha=${"a".repeat(40)}`,
    `--expected-apply-plan-fingerprint=${"b".repeat(64)}`,
    `--expected-payload-fingerprint=${"c".repeat(64)}`,
  ]);
  assert.equal(args.apply, true);
});

test("durable writer has one guarded commit and no destructive SQL", () => {
  const source = fs.readFileSync(
    "scripts/audits/one_piece_complete_numbered_canonical_apply_v1.mjs",
    "utf8",
  );
  assert.equal(source.match(/client\.query\("commit"\)/g)?.length, 1);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /Fresh apply preflight failed/);
  assert.doesNotMatch(source,
    /\bupdate\s+public\.|\bdelete\s+from\s+public\.|\btruncate\b/i);
});
