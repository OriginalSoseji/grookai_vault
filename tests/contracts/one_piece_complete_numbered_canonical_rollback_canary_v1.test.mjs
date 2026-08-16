import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  evaluateOnePieceCompleteNumberedCanaryPostRollbackV1,
  evaluateOnePieceCompleteNumberedCanaryTransactionV1,
  expectedOnePieceCompleteNumberedCanaryReadbackV1,
  expectedOnePieceCompleteNumberedCanaryWritesV1,
  selectOnePieceCompleteNumberedCanaryV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_rollback_canary_v1.mjs";
import { parseArgs } from
  "../../scripts/audits/one_piece_complete_numbered_canonical_rollback_canary_v1.mjs";

const plan = JSON.parse(gunzipSync(fs.readFileSync(
  "docs/audits/pricing/one_piece_complete_numbered_canonical_promotion_v1/frozen_plan_v1/promotion_plan.json.gz",
)));

test("representative sample covers five distinct English product families", () => {
  const sample = selectOnePieceCompleteNumberedCanaryV1(plan);
  assert.deepEqual(sample.map((row) => row.set_code),
    ["OP01", "ST02", "EB01", "PRB01", "P"]);
  assert.equal(new Set(sample.map((row) => row.set_row.id)).size, 5);
  assert.equal(new Set(sample.map((row) =>
    row.numbered_card.card_print.id)).size, 5);
  assert.ok(sample.every((row) => row.set_code !== "ST01"));
});

test("transaction policy accepts only exact rows and hidden visibility", () => {
  const sample = selectOnePieceCompleteNumberedCanaryV1(plan);
  const readback = expectedOnePieceCompleteNumberedCanaryReadbackV1(sample);
  const writes = expectedOnePieceCompleteNumberedCanaryWritesV1();
  assert.deepEqual(evaluateOnePieceCompleteNumberedCanaryTransactionV1({
    sample, readback, attributableWrites: writes,
  }), []);
  readback.authenticated_visible = true;
  writes[0].updated = 1;
  assert.deepEqual(evaluateOnePieceCompleteNumberedCanaryTransactionV1({
    sample, readback, attributableWrites: writes,
  }), ["transaction_readback_mismatch", "attributable_writes_mismatch"]);
});

test("post-rollback policy rejects residue and protected-state drift", () => {
  const before = {
    foundation: { release_status: "hidden" },
    baseline: { card_prints: 17 },
    retained_rows: [{ source_product_id: 1 }],
    staging_rows: [{ id: "a" }],
    collisions: { card_print_ids: 0 },
  };
  assert.deepEqual(evaluateOnePieceCompleteNumberedCanaryPostRollbackV1({
    before,
    after: structuredClone(before),
    afterEvaluation: { valid: true, findings: [] },
  }), []);
  const after = structuredClone(before);
  after.collisions.card_print_ids = 1;
  assert.deepEqual(evaluateOnePieceCompleteNumberedCanaryPostRollbackV1({
    before,
    after,
    afterEvaluation: { valid: false, findings: ["collision:card_print_ids"] },
  }), [
    "post_rollback:collision:card_print_ids",
    "post_rollback_preflight_failed",
    "post_rollback_drift:collisions",
  ]);
});

test("executor is inert by default and requires exact frozen SHA", () => {
  assert.throws(() => parseArgs([]), /execute-rollback-canary/);
  assert.throws(() => parseArgs(["--execute-rollback-canary"]),
    /expected-head-sha/);
  assert.equal(parseArgs([
    "--execute-rollback-canary",
    `--expected-head-sha=${"a".repeat(40)}`,
  ]).execute, true);
});

test("executor writes its plan before DB access and cannot commit", () => {
  const source = fs.readFileSync(
    "scripts/audits/one_piece_complete_numbered_canonical_rollback_canary_v1.mjs",
    "utf8",
  );
  assert.ok(source.indexOf('artifacts["run_plan.json"] = await writeJson(') <
    source.indexOf("const connectionString = marketEvidenceDbUrl()"));
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /client\.query\("rollback"\)/);
  assert.doesNotMatch(source, /client\.query\(["']commit["']\)/i);
  assert.doesNotMatch(source,
    /\bupdate\s+public\.|\bdelete\s+from\s+public\.|\btruncate\b/i);
});
