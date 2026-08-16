import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  evaluateOnePieceSealedPricingQualificationPostApplyV1,
  evaluateOnePieceSealedPricingQualificationPrecommitV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_apply_v1.mjs";
import { parseArgs } from
  "../../scripts/audits/one_piece_sealed_pricing_qualification_apply_v1.mjs";

function baseline(qualifications = 0) {
  return { sealed_product_families: 242, sealed_product_variants: 390,
    sealed_product_source_mappings: 390,
    sealed_product_pricing_lane_qualifications: qualifications,
    sealed_product_releases: 0, sealed_product_release_members: 0,
    sealed_product_release_pointer: 0, one_piece_release_control_rows: 1,
    one_piece_release_status: "hidden" };
}

function readback() {
  return { count: 374, status_counts: { qualified_exact: 332,
    blocked_stale: 4, blocked_missing_price: 38 }, exact: true,
  expected_sha256: "a".repeat(64), actual_sha256: "a".repeat(64) };
}

function precommit() {
  return { transaction: { started: true, committed: false },
    transaction_local_preflight: { valid: true,
      lineage: { expected_rows: 374, matched_variants: 374,
        matched_exact_mappings: 374, matched_source_observations: 374 },
      collisions: { id_collisions: 0, unique_key_collisions: 0 } },
    baseline_before: baseline(), baseline_after_transaction: baseline(374),
    readback: readback(), write_attribution: [{
      table_name: "sealed_product_pricing_lane_qualifications",
      inserted: 374, updated: 0, deleted: 0, hot_updated: 0 }],
    boundaries: { release_writes: 0, release_member_writes: 0,
      release_pointer_writes: 0, publication_writes: 0, card_writes: 0,
      storage_writes: 0, vault_writes: 0, app_visibility_changes: 0 } };
}

test("exact one-table precommit and read-only post-apply proofs pass", () => {
  assert.deepEqual(evaluateOnePieceSealedPricingQualificationPrecommitV1(
    precommit()), { valid: true, findings: [] });
  const applySummary = { status:
    "durable_apply_committed_and_exact_readback_passed", committed: true };
  const verification = { transaction_read_only: true, baseline: baseline(374),
    readback: readback(), write_attribution: [], boundaries: {
      database_writes: 0, release_writes: 0, publication_writes: 0,
      card_writes: 0, storage_writes: 0, vault_writes: 0,
      app_visibility_changes: 0 } };
  assert.deepEqual(evaluateOnePieceSealedPricingQualificationPostApplyV1({
    applySummary, verification }), { valid: true, findings: [] });
});

test("unexpected writes, count drift, or release state fail closed", () => {
  const proof = precommit();
  proof.write_attribution.push({ table_name: "sealed_product_releases",
    inserted: 1, updated: 0, deleted: 0, hot_updated: 0 });
  proof.baseline_before.sealed_product_pricing_lane_qualifications = 1;
  proof.baseline_after_transaction.sealed_product_releases = 1;
  proof.readback.status_counts.qualified_exact = 331;
  const result = evaluateOnePieceSealedPricingQualificationPrecommitV1(proof);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("write_attribution_mismatch"));
  assert.ok(result.findings.includes("qualification_baseline_not_empty"));
  assert.ok(result.findings.includes("protected_baseline_delta_mismatch"));
  assert.ok(result.findings.includes(
    "readback_status_count_mismatch:qualified_exact"));
});

test("apply mode requires explicit execution and exact fresh preflight", () => {
  const common = [`--expected-head-sha=${"a".repeat(40)}`,
    `--expected-apply-plan-fingerprint=${"b".repeat(64)}`,
    `--expected-payload-fingerprint=${"c".repeat(64)}`,
    `--expected-mutation-contract-hash=${"d".repeat(64)}`];
  assert.throws(() => parseArgs(["--mode=apply", ...common]),
    /explicit execution/);
  assert.equal(parseArgs(["--mode=apply", "--execute-durable-apply", ...common,
    "--fresh-preflight-summary=x.json",
    `--expected-fresh-preflight-fingerprint=${"e".repeat(64)}`]).execute, true);
});

test("writer has one insert table and no update, delete, or upsert path", () => {
  const source = fs.readFileSync(
    "scripts/audits/one_piece_sealed_pricing_qualification_apply_v1.mjs",
    "utf8");
  const inserts = [...source.matchAll(/insert into public\.([a-z0-9_]+)/g)]
    .map((match) => match[1]);
  assert.deepEqual([...new Set(inserts)],
    ["sealed_product_pricing_lane_qualifications"]);
  assert.doesNotMatch(source, /update\s+public\.|delete\s+from\s+public\./i);
  assert.doesNotMatch(source, /on\s+conflict/i);
  assert.match(source, /--execute-durable-apply/);
});
