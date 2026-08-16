import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
  buildOnePieceSealedIdentityReviewPlanV1,
  buildOnePieceSealedIdentityReviewRowV1,
  inferOnePieceSealedPackageFormV1,
  validateOnePieceSealedIdentityReviewPlanV1,
} from "../../backend/pricing/one_piece_sealed_identity_review_v1.mjs";

const candidatePlan = JSON.parse(gunzipSync(fs.readFileSync(new URL(
  "../../docs/audits/pricing/one_piece_complete_sealed_candidate_v1/frozen_plan_v1/candidate_plan.json.gz",
  import.meta.url,
))));

function candidate(sourceProductId) {
  const row = candidatePlan.payload.candidates.find((entry) =>
    entry.source_product_id === sourceProductId);
  assert.ok(row, `missing fixture candidate ${sourceProductId}`);
  return row;
}

test("package-form proposals preserve exact distribution distinctions", () => {
  const cases = new Map([
    [450085, "pack"],
    [531774, "sleeved_pack"],
    [450086, "booster_box"],
    [594069, "booster_box"],
    [450087, "case"],
    [288221, "deck"],
    [288222, "deck_display"],
    [493744, "display"],
    [518704, "kit"],
    [620278, "tin"],
    [628478, "bundle"],
    [484943, "collection"],
    [457043, "promo_pack"],
  ]);
  for (const [id, expected] of cases) {
    assert.equal(inferOnePieceSealedPackageFormV1(candidate(id)).package_form,
      expected, String(id));
  }
});

test("booster waves share a proposed family without collapsing variants", () => {
  const waveOne = buildOnePieceSealedIdentityReviewRowV1(candidate(450086));
  const waveTwo = buildOnePieceSealedIdentityReviewRowV1(candidate(557280));
  assert.equal(waveOne.proposed_family.proposed_family_key,
    waveTwo.proposed_family.proposed_family_key);
  assert.equal(waveOne.proposed_variant.proposed_wave, "Wave 1 - Blue");
  assert.equal(waveTwo.proposed_variant.proposed_wave, "Wave 2 - White");
  assert.notEqual(waveOne.proposed_variant.proposed_variant_key,
    waveTwo.proposed_variant.proposed_variant_key);
});

test("deck, display, and case proposals share the source deck family", () => {
  const rows = [455859, 455860, 477332].map((id) =>
    buildOnePieceSealedIdentityReviewRowV1(candidate(id)));
  assert.equal(new Set(rows.map((row) =>
    row.proposed_family.proposed_family_key)).size, 1);
  assert.deepEqual(rows.map((row) =>
    row.proposed_variant.proposed_package_form), ["deck", "deck_display", "case"]);
});

test("set-of quantities are proposals backed only by exact source text", () => {
  const row = buildOnePieceSealedIdentityReviewRowV1(candidate(288225));
  assert.equal(row.proposed_variant.proposed_package_form, "bundle");
  assert.deepEqual(row.proposed_variant.proposed_explicit_contents,
    [{ unit: "source_named_item", quantity: 4 }]);
  assert.equal(row.canonical_authority, false);
  assert.equal(row.mapping_authority, false);
});

test("language and release holds never gain authority", () => {
  const japanese = buildOnePieceSealedIdentityReviewRowV1(candidate(536154));
  const future = candidatePlan.payload.candidates.find((row) =>
    row.candidate_identity.release.future_release === true ||
    row.candidate_identity.release.explicit_presale === true);
  const futureReview = buildOnePieceSealedIdentityReviewRowV1(future);
  assert.ok(japanese.blockers.includes("non_english_lane_hold"));
  assert.ok(futureReview.blockers.includes("future_or_presale_hold"));
  assert.equal(japanese.review_priority, "held_or_unresolved");
  assert.equal(futureReview.promotion_eligible, false);
});

test("complete offline plan accounts for all 403 candidates without authority", () => {
  const plan = buildOnePieceSealedIdentityReviewPlanV1({
    repository: { commit_sha: "a".repeat(40), branch: "test" },
    candidatePlan,
  });
  const validation = validateOnePieceSealedIdentityReviewPlanV1(plan);
  assert.deepEqual(validation, { valid: true, findings: [] });
  assert.equal(plan.counts.candidate_rows, 403);
  assert.equal(plan.counts.review_rows, 403);
  assert.equal(plan.counts.canonical_rows, 0);
  assert.equal(plan.counts.mapping_rows, 0);
  assert.ok(plan.payload.rows.every((row) =>
    row.promotion_eligible === false && row.publication_authority === false));
});

test("tampering with a proposal or authority fails closed", () => {
  const plan = buildOnePieceSealedIdentityReviewPlanV1({
    repository: { commit_sha: "a".repeat(40), branch: "test" },
    candidatePlan,
  });
  plan.payload.rows[0].canonical_authority = true;
  const validation = validateOnePieceSealedIdentityReviewPlanV1(plan);
  assert.equal(validation.valid, false);
  assert.ok(validation.findings.some((finding) =>
    finding.startsWith("authority_overclaim:")));
  assert.ok(validation.findings.includes("payload_fingerprint_mismatch"));
});

test("audit runner is offline and contains no database or provider dependency", () => {
  const body = fs.readFileSync(new URL(
    "../../scripts/audits/one_piece_sealed_identity_review_plan_v1.mjs",
    import.meta.url,
  ), "utf8");
  assert.doesNotMatch(body, /from\s+["']pg["']|SUPABASE_DB_URL|fetch\s*\(/);
  assert.doesNotMatch(body,
    /\b(insert|update|delete|truncate|alter table|create table|drop table)\b/i);
});
