import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  evaluateOnePieceSt01PrintingImageFreshPreflightV1,
  parseArgs as parseCanaryArgs,
} from "../../scripts/audits/one_piece_st01_printing_image_rollback_canary_v1.mjs";
import {
  evaluateIndependentPostRollbackV1,
  parseArgs as parseVerifierArgs,
} from "../../scripts/audits/one_piece_st01_printing_image_post_rollback_v1.mjs";

const planPath = "docs/audits/pricing/one_piece_st01_printing_image_mutation_plan_v1/frozen_offline_plan_v1/mutation_plan.json";

async function plan() {
  return JSON.parse(await fs.readFile(planPath, "utf8"));
}

function zeroState(value) {
  const state = structuredClone(
    value.rollback_contract.expected_post_rollback_zero_residue,
  );
  state.blocking_pids = [];
  state.transaction_read_only = true;
  return state;
}

test("rollback canary requires an exact producer SHA", () => {
  assert.throws(() => parseCanaryArgs([]), /expected-head-sha/);
  assert.equal(parseCanaryArgs([
    `--expected-head-sha=${"a".repeat(40)}`,
  ]).expectedHeadSha, "a".repeat(40));
});

test("independent verifier requires both producer SHAs and summary hash", () => {
  assert.throws(() => parseVerifierArgs([]), /expected-head-sha/);
  const args = parseVerifierArgs([
    `--expected-head-sha=${"a".repeat(40)}`,
    `--expected-execution-producer-sha=${"b".repeat(40)}`,
    `--expected-execution-summary-sha256=${"c".repeat(64)}`,
  ]);
  assert.equal(args.expectedExecutionProducerSha, "b".repeat(40));
  assert.equal(args.expectedExecutionSummarySha256, "c".repeat(64));
});

test("fresh preflight accepts only the exact zero-residue baseline", async () => {
  const value = await plan();
  const state = zeroState(value);
  assert.deepEqual(evaluateOnePieceSt01PrintingImageFreshPreflightV1({
    plan: value,
    readback: state,
  }), []);
  state.child_rows.push({ id: "residue" });
  assert.deepEqual(evaluateOnePieceSt01PrintingImageFreshPreflightV1({
    plan: value,
    readback: state,
  }), ["post_rollback_residue:child_rows"]);
});

test("independent verifier detects execution or later production drift", async () => {
  const value = await plan();
  const before = zeroState(value);
  const after = structuredClone(before);
  const production = structuredClone(before);
  assert.deepEqual(evaluateIndependentPostRollbackV1({
    plan: value,
    executionBefore: before,
    executionAfter: after,
    production,
  }), []);
  production.parent_pointer_rows[0].image_status = "exact";
  assert.ok(evaluateIndependentPostRollbackV1({
    plan: value,
    executionBefore: before,
    executionAfter: after,
    production,
  }).includes("production_changed_after_execution:parent_pointer_rows"));
});

test("executor is rollback-only and touches only the frozen three tables", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_st01_printing_image_rollback_canary_v1.mjs",
    "utf8",
  );
  assert.match(source, /client\.query\("begin"\)/);
  assert.match(source, /client\.query\("rollback"\)/);
  assert.doesNotMatch(source, /client\.query\(\s*["'`]commit/i);
  assert.doesNotMatch(source, /\bdelete\s+from\b|\btruncate\b/i);
  const mutatedTables = [...source.matchAll(
    /(?:insert\s+into|update)\s+public\.([a-z0-9_]+)/gi,
  )].map((match) => match[1]);
  assert.deepEqual([...new Set(mutatedTables)].sort(), [
    "card_printings",
    "card_prints",
    "external_printing_mappings",
  ]);
  assert.ok(source.indexOf("captureOnePieceSt01PrintingImageStateV1(\n    connectionString,\n    plan,\n    \"one-piece-st01-printing-image-canary-post-rollback-v1\"") >
    source.indexOf("if (beforeFindings.length === 0)"));
});
