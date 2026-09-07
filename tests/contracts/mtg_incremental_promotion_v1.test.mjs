import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const worker = fs.readFileSync(
  new URL("../../scripts/workers/mtg_incremental_promotion_v1.mjs", import.meta.url),
  "utf8",
);
const payloadBuilder = fs.readFileSync(
  new URL("../../scripts/audits/mtg_canonical_catalog_canary_plan_v1.mjs", import.meta.url),
  "utf8",
);

test("MTG incremental promotion uses existing canonical contracts dynamically", () => {
  assert.match(worker, /buildMtgCanonicalCandidateV1/);
  assert.match(worker, /buildMtgCanaryPayloadV1/);
  assert.match(worker, /buildMtgCanonicalSetPromotionContractV1/);
  assert.match(worker, /set:\$\{setCode\} game:paper lang:en/);
  assert.match(worker, /unique", "prints"/);
});

test("MTG incremental promotion blocks partial sets and external image pointers", () => {
  assert.match(worker, /Partial MTG set requires bounded repair/);
  assert.match(payloadBuilder, /image_url:\s*null/);
  assert.match(payloadBuilder, /image_pending_self_host/);
  assert.match(worker, /rollback absence proof failed/i);
  assert.match(worker, /Apply requires the exact clean frozen commit/);
  assert.doesNotMatch(worker, /\bupdate\s+public\.|\bdelete\s+from\b|\btruncate\b/i);
});

test("MTG plan status distinguishes absent, completed and future sets", () => {
  const initializer = worker.match(/let transactionResult = (\{[\s\S]*?\n    \});/);
  assert.ok(initializer, "worker retains the tested plan-result initializer");
  for (const [releaseEligible, shouldMutate, action, reason] of [
    [true, true, "plan_only", "eligible_absent_plan"],
    [true, false, "no_op", "already_exact_complete"],
    [false, false, "no_op", "future_release"],
  ]) {
    const result = vm.runInNewContext(`(${initializer[1]})`, {
      releaseEligible, shouldMutate,
    }, { timeout: 1000 });
    assert.equal(result.action, action);
    assert.equal(result.reason, reason);
  }
});
