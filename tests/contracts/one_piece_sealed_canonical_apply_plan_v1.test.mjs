import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  buildOnePieceSealedCanonicalApplyPlanV1,
  validateOnePieceSealedCanonicalApplyPlanV1,
} from "../../backend/pricing/one_piece_sealed_canonical_apply_plan_v1.mjs";

const PLAN_PATH = new URL("../../docs/audits/pricing/" +
  "one_piece_sealed_online_evidence_resolution_v1/frozen_live_resolution_v1/" +
  "canonical_plan.json.gz", import.meta.url);

function build() {
  const canonicalPlan = JSON.parse(gunzipSync(fs.readFileSync(PLAN_PATH)));
  return buildOnePieceSealedCanonicalApplyPlanV1({
    repository: { commit_sha: "a".repeat(40) },
    canonicalPlan,
    canonicalPlanSha256: "b".repeat(64),
    preflight: { status: "production_read_only_preflight_passed",
      preflight_fingerprint_sha256: "c".repeat(64) },
    rollbackCanary: {
      status: "production_rollback_canary_passed_zero_residue",
      sample_fingerprint_sha256: "d".repeat(64),
    },
  });
}

test("full insert-only plan is exact and non-executing", () => {
  const plan = build();
  assert.deepEqual(validateOnePieceSealedCanonicalApplyPlanV1(plan),
    { valid: true, findings: [] });
  assert.equal(plan.mutation_contract.expected_inserts
    .sealed_product_variant_evidence, 1731);
  assert.equal(plan.database_writes, 0);
  assert.equal(plan.apply_executed, false);
});

test("scope expansion or count drift invalidates the frozen plan", () => {
  const plan = build();
  plan.mutation_contract.pricing_writes = 1;
  plan.mutation_contract.expected_inserts.sealed_product_variants = 389;
  const result = validateOnePieceSealedCanonicalApplyPlanV1(plan);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("forbidden_scope:pricing_writes"));
  assert.ok(result.findings.includes(
    "insert_count_mismatch:sealed_product_variants"));
});
