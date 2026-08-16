import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  buildOnePieceSt01DurableApplyPlanV1,
  evaluateOnePieceSt01DurableReadbackV1,
  evaluateOnePieceSt01PostApplyV1,
  expectedOnePieceSt01DurableReadbackV1,
  ONE_PIECE_ST01_DURABLE_PINNED_INPUTS,
  requiredOnePieceSt01DurableApprovalV1,
  validateFreshPreflightForApplyV1,
  validateOnePieceSt01DurableApplyPlanV1,
} from "../../backend/pricing/one_piece_st01_canonical_promotion_apply_v1.mjs";
import {
  expectedOnePieceSt01AttributableWritesV1,
} from "../../backend/pricing/one_piece_st01_canonical_promotion_v1.mjs";

const paths = {
  promotionPlan: "docs/audits/pricing/one_piece_st01_canonical_promotion_v1/frozen_plan_v1/plan.json",
  rollbackSummary: "docs/audits/pricing/one_piece_st01_canonical_promotion_v1/production_rollback_canary_v1/summary.json",
  transactionProof: "docs/audits/pricing/one_piece_st01_canonical_promotion_v1/production_rollback_canary_v1/transaction_proof.json",
  postRollbackSummary: "docs/audits/pricing/one_piece_st01_canonical_promotion_v1/post_rollback_read_only_v1/summary.json",
  preflight: "docs/audits/pricing/one_piece_st01_canonical_promotion_v1/production_preflight_v1/summary.json",
};

async function fixture() {
  const entries = await Promise.all(Object.entries(paths).map(async ([key, file]) => [
    key,
    JSON.parse(await fs.readFile(file, "utf8")),
  ]));
  const values = Object.fromEntries(entries);
  const applyPlan = buildOnePieceSt01DurableApplyPlanV1({
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
      tracked_worktree_clean: true,
    },
    inputHashes: ONE_PIECE_ST01_DURABLE_PINNED_INPUTS,
    promotionPlan: values.promotionPlan,
    rollbackSummary: values.rollbackSummary,
    transactionProof: values.transactionProof,
    postRollbackSummary: values.postRollbackSummary,
  });
  return { ...values, applyPlan };
}

function attributableRows() {
  return Object.entries(expectedOnePieceSt01AttributableWritesV1()).map(
    ([table_name, inserted]) => ({
      table_name,
      inserted,
      updated: 0,
      deleted: 0,
      hot_updated: 0,
    }),
  );
}

test("durable plan freezes the proven 17-card insert-only scope", async () => {
  const value = await fixture();
  assert.equal(validateOnePieceSt01DurableApplyPlanV1(
    value.applyPlan, value.promotionPlan).valid, true);
  assert.deepEqual(value.applyPlan.boundaries, {
    insert_only: true,
    exact_set_rows: 1,
    exact_card_print_rows: 17,
    exact_identity_rows: 17,
    exact_source_evidence_rows: 17,
    exact_external_mapping_rows: 17,
    update_rows: 0,
    delete_rows: 0,
    card_printing_child_writes: 0,
    don_writes: 0,
    sealed_writes: 0,
    storage_writes: 0,
    image_pointer_writes: 0,
    pricing_writes: 0,
    publication_writes: 0,
    vault_writes: 0,
    app_visibility_enabled: false,
  });
});

test("durable plan fails closed on payload and authorization drift", async () => {
  const value = await fixture();
  const changed = structuredClone(value.applyPlan);
  changed.target.numbered_cards.pop();
  assert.equal(validateOnePieceSt01DurableApplyPlanV1(
    changed, value.promotionPlan).valid, false);
  assert.throws(() => buildOnePieceSt01DurableApplyPlanV1({
    repository: value.applyPlan.repository,
    inputHashes: { ...ONE_PIECE_ST01_DURABLE_PINNED_INPUTS,
      promotion_plan_sha256: "0".repeat(64) },
    promotionPlan: value.promotionPlan,
    rollbackSummary: value.rollbackSummary,
    transactionProof: value.transactionProof,
    postRollbackSummary: value.postRollbackSummary,
  }), /proof inputs changed/i);
});

test("fresh preflight must be exact, passing, and collision free", async () => {
  const value = await fixture();
  assert.deepEqual(validateFreshPreflightForApplyV1({
    preflight: value.preflight,
    promotionPlan: value.promotionPlan,
  }), []);
  const collision = structuredClone(value.preflight);
  collision.snapshot.collisions.external_mapping = 1;
  assert.deepEqual(validateFreshPreflightForApplyV1({
    preflight: collision,
    promotionPlan: value.promotionPlan,
  }), ["fresh_preflight_collision"]);
});

test("approval binds exact rows, fingerprints, and exclusions", async () => {
  const value = await fixture();
  const approval = requiredOnePieceSt01DurableApprovalV1({
    applyPlan: value.applyPlan,
    preflight: value.preflight,
  });
  assert.match(approval, /1 hidden set row/);
  assert.match(approval, /17 parent card_print rows/);
  assert.match(approval, new RegExp(value.applyPlan.apply_plan_fingerprint_sha256));
  assert.match(approval, new RegExp(value.promotionPlan.payload_fingerprint_sha256));
  assert.match(approval, new RegExp(value.preflight.preflight_fingerprint_sha256));
  assert.match(approval, /I do not approve child printing writes/);
});

test("durable readback accepts only exact hidden rows", async () => {
  const value = await fixture();
  const readback = expectedOnePieceSt01DurableReadbackV1(value.promotionPlan);
  assert.deepEqual(evaluateOnePieceSt01DurableReadbackV1({
    promotionPlan: value.promotionPlan,
    readback,
  }), []);
  readback.card_rows[0].name = "changed";
  readback.authenticated_visible = true;
  assert.deepEqual(evaluateOnePieceSt01DurableReadbackV1({
    promotionPlan: value.promotionPlan,
    readback,
  }), [
    "durable_readback_mismatch:card_rows",
    "durable_visibility_mismatch:authenticated_visible",
  ]);
});

test("independent post-apply policy checks transaction, durability, and attribution", async () => {
  const value = await fixture();
  const readback = expectedOnePieceSt01DurableReadbackV1(value.promotionPlan);
  const applySummary = {
    version: "ONE_PIECE_ST01_CANONICAL_PROMOTION_DURABLE_APPLY_V1",
    status: "durable_apply_committed_and_readback_passed",
    mode: "apply",
    committed: true,
    apply_plan_fingerprint_sha256: value.applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: value.promotionPlan.payload_fingerprint_sha256,
    boundaries: value.applyPlan.boundaries,
    apply_fresh_preflight_snapshot: value.preflight.snapshot,
    transaction_readback: structuredClone(readback),
    durable_readback: structuredClone(readback),
    attributable_writes: attributableRows(),
  };
  assert.deepEqual(evaluateOnePieceSt01PostApplyV1({
    promotionPlan: value.promotionPlan,
    applyPlan: value.applyPlan,
    applySummary,
    freshReadback: structuredClone(readback),
  }), []);
  applySummary.committed = false;
  applySummary.attributable_writes[0].updated = 1;
  assert.deepEqual(evaluateOnePieceSt01PostApplyV1({
    promotionPlan: value.promotionPlan,
    applyPlan: value.applyPlan,
    applySummary,
    freshReadback: structuredClone(readback),
  }), ["apply_not_committed", "attribution:attributable_write_mismatch:sets"]);
});

test("writer is inert by default and has one guarded commit path", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_st01_canonical_promotion_apply_v1.mjs", "utf8");
  assert.match(source, /mode:\s*"plan"/);
  assert.match(source, /Exact approval missing/);
  assert.equal(source.match(/client\.query\(["']commit["']\)/gi)?.length, 1);
  assert.doesNotMatch(source, /\bupdate\s+public\./i);
  assert.doesNotMatch(source, /\bdelete\s+from\s+public\./i);
  assert.doesNotMatch(source, /\btruncate\b/i);
});

test("plan generator is offline and independent verifier is read-only", async () => {
  const [generator, verifier] = await Promise.all([
    fs.readFile(
      "scripts/audits/one_piece_st01_canonical_promotion_apply_plan_v1.mjs",
      "utf8"),
    fs.readFile(
      "scripts/audits/one_piece_st01_canonical_promotion_post_apply_v1.mjs",
      "utf8"),
  ]);
  assert.doesNotMatch(generator, /from ["']pg["']|dotenv|marketEvidenceDbUrl/);
  assert.match(verifier, /fresh_read_only_post_apply_verification_passed/);
  assert.doesNotMatch(verifier, /client\.query\(["']commit["']\)/i);
  assert.doesNotMatch(verifier, /\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b|\btruncate\b/i);
});
