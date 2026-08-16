import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  ONE_PIECE_SEALED_PRICING_RELEASE_MEMBER_COUNT,
  buildOnePieceSealedPricingReleasePlanV1,
  validateOnePieceSealedPricingReleasePlanV1,
} from "../../backend/pricing/one_piece_sealed_pricing_release_v1.mjs";

const qualificationPlan = JSON.parse(gunzipSync(fs.readFileSync(
  "docs/audits/pricing/one_piece_sealed_pricing_qualification_plan_v1/frozen_plan_v1/qualification_plan.json.gz",
)));

function plan() {
  return buildOnePieceSealedPricingReleasePlanV1({
    qualificationPlan,
    sourceProducerSha: "a".repeat(40),
  });
}

test("release includes only the 332 qualified exact rows", () => {
  const value = plan();
  assert.equal(value.members.length,
    ONE_PIECE_SEALED_PRICING_RELEASE_MEMBER_COUNT);
  assert.ok(value.members.every((member) =>
    member.qualification_status === "qualified_exact"));
  assert.equal(value.exclusions.total, 58);
  assert.deepEqual(validateOnePieceSealedPricingReleasePlanV1(value),
    { valid: true, findings: [] });
});

test("release members retain qualification, variant, and mapping evidence", () => {
  const member = plan().members[0];
  assert.match(member.qualification_id, /^[0-9a-f-]{36}$/);
  assert.match(member.variant_id, /^[0-9a-f-]{36}$/);
  assert.match(member.source_mapping_id, /^[0-9a-f-]{36}$/);
  assert.match(member.member_fingerprint, /^[0-9a-f]{64}$/);
});

test("blocked or changed release members fail closed", () => {
  const value = plan();
  value.members[0].qualification_status = "blocked_stale";
  assert.equal(validateOnePieceSealedPricingReleasePlanV1(value).valid, false);
});

test("release plan is deterministic", () => {
  assert.deepEqual(plan(), plan());
});
