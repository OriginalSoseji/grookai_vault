import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  buildOnePieceSealedPricingQualificationApplyPlanV1,
  validateOnePieceSealedPricingQualificationApplyPlanV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_apply_plan_v1.mjs";

const dir = "docs/audits/pricing/";
const qualificationPlan = JSON.parse(gunzipSync(fs.readFileSync(
  `${dir}one_piece_sealed_pricing_qualification_plan_v1/frozen_plan_v1/` +
  "qualification_plan.json.gz")));
const rollbackCanarySummary = JSON.parse(fs.readFileSync(
  `${dir}one_piece_sealed_pricing_qualification_rollback_canary_v1/` +
  "production_rollback_v1/summary.json"));

function build() {
  return buildOnePieceSealedPricingQualificationApplyPlanV1({
    repository: { commit_sha: "a".repeat(40) }, qualificationPlan,
    qualificationPlanArtifactSha256: "b".repeat(64),
    rollbackCanarySummary,
    rollbackCanarySummarySha256: "c".repeat(64),
  });
}

test("exact insert-only qualification apply plan validates", () => {
  const plan = build();
  assert.deepEqual(validateOnePieceSealedPricingQualificationApplyPlanV1({
    plan, qualificationPlan }), { valid: true, findings: [] });
  assert.equal(plan.mutation_contract.expected_inserts
    .sealed_product_pricing_lane_qualifications, 374);
  assert.equal(plan.mutation_contract.excluded_missing_observation_holds, 16);
  assert.equal(plan.database_writes, 0);
  assert.equal(plan.apply_executed, false);
});

test("count, preflight, or scope drift invalidates the plan", () => {
  const plan = build();
  plan.mutation_contract.expected_inserts
    .sealed_product_pricing_lane_qualifications = 373;
  plan.mutation_contract.release_writes = 1;
  plan.bound_preflight.collisions.id_collisions = 1;
  const result = validateOnePieceSealedPricingQualificationApplyPlanV1({
    plan, qualificationPlan });
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("qualification_insert_count_mismatch"));
  assert.ok(result.findings.includes("forbidden_scope:release_writes"));
  assert.ok(result.findings.includes("bound_preflight_collision"));
});

test("apply-plan generator is offline and contains no database writes", () => {
  const source = fs.readFileSync(
    "scripts/audits/one_piece_sealed_pricing_qualification_apply_plan_v1.mjs",
    "utf8");
  assert.doesNotMatch(source, /from ["']pg["']/);
  assert.doesNotMatch(source,
    /insert\s+into\s+public\.|update\s+public\.|delete\s+from\s+public\./i);
});
