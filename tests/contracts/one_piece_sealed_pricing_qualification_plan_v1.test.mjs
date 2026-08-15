import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  buildOnePieceSealedPricingQualificationPlanV1,
  validateOnePieceSealedPricingQualificationPlanV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_plan_v1.mjs";

const sourceBuffer = fs.readFileSync(
  "docs/audits/pricing/one_piece_sealed_pricing_lineage_v1/" +
  "production_read_only_v1/qualification_plan.json.gz");
const sourcePlan = JSON.parse(gunzipSync(sourceBuffer));

function build() {
  return buildOnePieceSealedPricingQualificationPlanV1({
    repository: { branch: "agent/one-piece-ingestion-readiness-v1",
      commit_sha: "a".repeat(40), tracked_worktree_clean: true },
    sourcePlan,
    sourceArtifactSha256: "b".repeat(64),
  });
}

test("database-shaped plan preserves exact qualification and hold counts", () => {
  const plan = build();
  assert.deepEqual(plan.counts, { qualification_rows: 374,
    missing_observation_holds: 16,
    qualification_statuses: { qualified_exact: 332, blocked_stale: 4,
      blocked_missing_price: 38 } });
  assert.deepEqual(validateOnePieceSealedPricingQualificationPlanV1(plan),
    { valid: true, findings: [] });
});

test("every persisted row has real evidence and no publication authority", () => {
  const plan = build();
  assert.ok(plan.payload.qualification_rows.every((row) =>
    row.id && row.variant_id && row.source_mapping_id &&
    row.source_price_row_identity && row.source_observation_fingerprint &&
    row.publication_authority === false &&
    row.qualification_evidence.decision.publication_authority === false));
  assert.ok(plan.payload.missing_observation_holds.every((row) =>
    row.source_price_row_identity === null &&
    row.persistable_in_existing_qualification_table === false));
});

test("missing evidence, duplicate database keys, and authority fail", () => {
  for (const mutate of [
    (plan) => { plan.payload.qualification_rows[0]
      .source_price_row_identity = null; },
    (plan) => { plan.payload.qualification_rows[1].id =
      plan.payload.qualification_rows[0].id; },
    (plan) => { plan.payload.qualification_rows[0]
      .publication_authority = true; },
  ]) {
    const plan = build();
    mutate(plan);
    assert.equal(validateOnePieceSealedPricingQualificationPlanV1(plan).valid,
      false);
  }
});

test("offline generator contains no database client or write statement", () => {
  const source = fs.readFileSync(
    "scripts/audits/one_piece_sealed_pricing_qualification_plan_v1.mjs",
    "utf8");
  assert.doesNotMatch(source, /from ["']pg["']/);
  assert.doesNotMatch(source,
    /insert\s+into\s+public\.|update\s+public\.|delete\s+from\s+public\./i);
});
