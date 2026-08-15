import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  buildOnePieceSt01PrintingImageDurableApplyPlanV1,
  evaluateOnePieceSt01PrintingImageDurableReadbackV1,
  evaluateOnePieceSt01PrintingImagePostApplyV1,
  expectedOnePieceSt01PrintingImageDurableReadbackV1,
  ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_VERSION,
  ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_PINNED_INPUTS,
  requiredOnePieceSt01PrintingImageDurableApprovalV1,
  validateOnePieceSt01PrintingImageDurableApplyPlanV1,
} from "../../backend/pricing/one_piece_st01_printing_image_apply_v1.mjs";
import { parseArgs as parseWriterArgs } from
  "../../scripts/audits/one_piece_st01_printing_image_apply_v1.mjs";
import { parseArgs as parseVerifierArgs } from
  "../../scripts/audits/one_piece_st01_printing_image_post_apply_v1.mjs";

const paths = {
  mutationPlan:
    "docs/audits/pricing/one_piece_st01_printing_image_mutation_plan_v1/hot_update_policy_frozen_plan_v1/mutation_plan.json",
  rollbackSummary:
    "docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/production_rollback_hot_policy_v1/summary.json",
  transactionProof:
    "docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/production_rollback_hot_policy_v1/transaction_proof.json",
  independentSummary:
    "docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/independent_post_rollback_hot_policy_v1/summary.json",
  independentReadback:
    "docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/independent_post_rollback_hot_policy_v1/production_readback.json",
};

async function fixture() {
  const entries = await Promise.all(Object.entries(paths).map(
    async ([key, file]) => [key, JSON.parse(await fs.readFile(file, "utf8"))],
  ));
  const values = Object.fromEntries(entries);
  const applyPlan = buildOnePieceSt01PrintingImageDurableApplyPlanV1({
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
      tracked_worktree_clean: true,
    },
    inputHashes: ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_PINNED_INPUTS,
    mutationPlan: values.mutationPlan,
    rollbackSummary: values.rollbackSummary,
    transactionProof: values.transactionProof,
    independentSummary: values.independentSummary,
    independentReadback: values.independentReadback,
  });
  return { ...values, applyPlan };
}

function freshDurableReadback(mutationPlan) {
  return {
    ...expectedOnePieceSt01PrintingImageDurableReadbackV1(mutationPlan),
    image_constraints: {},
    blocking_pids: [],
    transaction_read_only: true,
  };
}

test("durable apply plan freezes the exact hidden 17/14/14 scope", async () => {
  const value = await fixture();
  assert.equal(validateOnePieceSt01PrintingImageDurableApplyPlanV1(
    value.applyPlan,
    value.mutationPlan,
  ).valid, true);
  assert.deepEqual(value.applyPlan.boundaries, {
    exact_parent_pointer_updates: 17,
    exact_normal_child_inserts: 14,
    exact_printing_mapping_inserts: 14,
    exact_total_updates: 17,
    exact_total_inserts: 28,
    delete_rows: 0,
    foil_child_writes: 0,
    child_image_pointer_writes: 0,
    storage_writes: 0,
    don_writes: 0,
    sealed_writes: 0,
    pricing_writes: 0,
    publication_writes: 0,
    vault_writes: 0,
    app_visibility_enabled: false,
    release_status: "hidden",
  });
});

test("durable plan fails closed on proof, target, or boundary drift", async () => {
  const value = await fixture();
  const changed = structuredClone(value.applyPlan);
  changed.target.normal_child_inserts.pop();
  changed.boundaries.publication_writes = 1;
  const findings = validateOnePieceSt01PrintingImageDurableApplyPlanV1(
    changed,
    value.mutationPlan,
  ).findings;
  assert.ok(findings.includes("apply_plan_fingerprint_mismatch"));
  assert.ok(findings.includes("target_payload_mismatch"));
  assert.ok(findings.includes("boundaries_mismatch"));

  const brokenProof = structuredClone(value.rollbackSummary);
  brokenProof.status = "blocked";
  assert.throws(() => buildOnePieceSt01PrintingImageDurableApplyPlanV1({
    repository: value.applyPlan.repository,
    inputHashes: ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_PINNED_INPUTS,
    mutationPlan: value.mutationPlan,
    rollbackSummary: brokenProof,
    transactionProof: value.transactionProof,
    independentSummary: value.independentSummary,
    independentReadback: value.independentReadback,
  }), /Rollback and independent proof/);
});

test("durable readback accepts only the exact hidden rows", async () => {
  const value = await fixture();
  const readback = freshDurableReadback(value.mutationPlan);
  assert.deepEqual(evaluateOnePieceSt01PrintingImageDurableReadbackV1({
    mutationPlan: value.mutationPlan,
    readback,
  }), []);
  readback.child_rows[0].finish_key = "foil";
  readback.authenticated_visible = true;
  assert.deepEqual(evaluateOnePieceSt01PrintingImageDurableReadbackV1({
    mutationPlan: value.mutationPlan,
    readback,
  }), [
    "durable_readback_mismatch:child_rows",
    "durable_readback_mismatch:authenticated_visible",
  ]);
});

test("post-apply policy reconciles transaction, attribution, and both readbacks", async () => {
  const value = await fixture();
  const durable = freshDurableReadback(value.mutationPlan);
  const applySummary = {
    version: ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_VERSION,
    status: "durable_apply_committed_and_readback_passed",
    mode: "apply",
    committed: true,
    apply_plan_fingerprint_sha256:
      value.applyPlan.apply_plan_fingerprint_sha256,
    mutation_payload_fingerprint_sha256:
      value.mutationPlan.mutation_payload_fingerprint_sha256,
    transaction_readback:
      value.mutationPlan.rollback_contract.expected_transaction_readback,
    attributable_writes: value.transactionProof.attributable_writes,
    durable_readback: structuredClone(durable),
    boundaries: value.applyPlan.boundaries,
  };
  assert.deepEqual(evaluateOnePieceSt01PrintingImagePostApplyV1({
    mutationPlan: value.mutationPlan,
    applyPlan: value.applyPlan,
    applySummary,
    freshReadback: structuredClone(durable),
  }), []);
  applySummary.committed = false;
  applySummary.durable_readback.child_rows.pop();
  const findings = evaluateOnePieceSt01PrintingImagePostApplyV1({
    mutationPlan: value.mutationPlan,
    applyPlan: value.applyPlan,
    applySummary,
    freshReadback: structuredClone(durable),
  });
  assert.ok(findings.includes("apply_not_committed"));
  assert.ok(findings.includes(
    "writer_durable:durable_readback_mismatch:child_rows",
  ));
});

test("exact approval binds fingerprints and excluded domains", async () => {
  const value = await fixture();
  const approval = requiredOnePieceSt01PrintingImageDurableApprovalV1({
    applyPlan: value.applyPlan,
  });
  assert.match(approval, /17 exact parent image-pointer updates/);
  assert.match(approval, /14 normal child/);
  assert.match(approval, new RegExp(value.applyPlan.apply_plan_fingerprint_sha256));
  assert.match(approval, new RegExp(
    value.mutationPlan.mutation_payload_fingerprint_sha256,
  ));
  assert.match(approval, /do not approve foil child writes/);
});

test("writer and verifier require exact execution bindings", () => {
  assert.throws(() => parseWriterArgs([]), /expected-head-sha/);
  const writer = parseWriterArgs([
    `--expected-head-sha=${"a".repeat(40)}`,
    `--expected-apply-plan-fingerprint=${"b".repeat(64)}`,
    `--expected-payload-fingerprint=${"c".repeat(64)}`,
    "--mode=apply",
  ]);
  assert.equal(writer.mode, "apply");
  assert.equal(writer.expectedApplyPlanFingerprint, "b".repeat(64));
  assert.throws(() => parseVerifierArgs([]), /expected-head-sha/);
  const verifier = parseVerifierArgs([
    `--expected-head-sha=${"a".repeat(40)}`,
    `--expected-execution-producer-sha=${"b".repeat(40)}`,
    `--expected-execution-summary-sha256=${"c".repeat(64)}`,
  ]);
  assert.equal(verifier.expectedExecutionProducerSha, "b".repeat(40));
});

test("writer has one guarded commit and verifier is read-only", async () => {
  const [writer, verifier, rollback] = await Promise.all([
    fs.readFile(
      "scripts/audits/one_piece_st01_printing_image_apply_v1.mjs",
      "utf8",
    ),
    fs.readFile(
      "scripts/audits/one_piece_st01_printing_image_post_apply_v1.mjs",
      "utf8",
    ),
    fs.readFile(
      "scripts/audits/one_piece_st01_printing_image_rollback_canary_v1.mjs",
      "utf8",
    ),
  ]);
  assert.match(writer, /mode:\s*"plan"/);
  assert.match(writer, /Exact approval missing/);
  assert.equal(writer.match(/client\.query\("commit"\)/g)?.length, 1);
  assert.match(writer, /client\.query\("rollback"\)/);
  assert.doesNotMatch(writer, /\bdelete\s+from\b|\btruncate\b|on\s+conflict/i);
  assert.ok(writer.indexOf("run_plan.json") < writer.indexOf("dotenv.config"));
  assert.doesNotMatch(verifier,
    /client\.query\(["'`]commit|\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b|\btruncate\b/i);
  const mutatedTables = [...rollback.matchAll(
    /(?:insert\s+into|update)\s+public\.([a-z0-9_]+)/gi,
  )].map((match) => match[1]);
  assert.deepEqual([...new Set(mutatedTables)].sort(), [
    "card_printings",
    "card_prints",
    "external_printing_mappings",
  ]);
});
