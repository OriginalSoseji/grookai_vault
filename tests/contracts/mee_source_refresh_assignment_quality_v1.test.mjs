import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildMarketEvidenceSourceRefreshPlanV1,
} from "../../backend/pricing/market_evidence_source_refresh_policy_v1.mjs";
import {
  assertMarketEvidenceAssignmentSafeV1,
  classifyMarketEvidenceLaneV1,
  evaluateMarketEvidenceAssignmentV1,
} from "../../backend/pricing/market_evidence_assignment_policy_v1.mjs";
import {
  assertMarketEvidenceQualityGateSafeV1,
  evaluateMarketEvidenceQualityGateV1,
} from "../../backend/pricing/market_evidence_quality_gate_policy_v1.mjs";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE source refresh plan covers free/reference APIs without direct publication", () => {
  const plan = buildMarketEvidenceSourceRefreshPlanV1({
    generatedAt: "2026-06-28T00:00:00.000Z",
  });

  assert.equal(plan.package_id, "MEE-SOURCE-REFRESH-LAYER-V1");
  assert.equal(plan.boundary.public_pricing_views, false);
  assert.equal(plan.boundary.app_visible_pricing, false);
  assert.equal(plan.boundary.pricing_observations_writes, false);
  assert.equal(plan.boundary.ebay_active_prices_latest_writes, false);
  assert.equal(plan.proofs.no_source_can_publish_directly, true);

  const sources = plan.adapters.map((adapter) => adapter.source).sort();
  assert.deepEqual(sources, [
    "ebay_active",
    "pokemontcg_io_reference",
    "tcgcsv_reference",
    "tcgdex_cardmarket_reference",
    "tcgdex_tcgplayer_reference",
  ]);
  assert.equal(plan.summary.enabled_free_reference_adapter_count, 4);
});

test("MEE source refresh worker is gated and does not contain public pricing writes", () => {
  const worker = read("scripts/workers/mee_reference_source_refresh_worker_v1.mjs");
  const pkg = read("package.json");

  assert.match(pkg, /mee:reference-refresh:dry-run/);
  assert.match(worker, /MEE_REFERENCE_REFRESH_ALLOW_RUN/);
  assert.match(worker, /pricing_observations_writes:\s*false/);
  assert.match(worker, /ebay_active_prices_latest_writes:\s*false/);
  assert.match(worker, /public_pricing_views:\s*false/);
  assert.match(worker, /app_visible_pricing:\s*false/);
  assert.doesNotMatch(worker, /\.from\(["']pricing_observations["']\)/);
  assert.doesNotMatch(worker, /\.from\(["']ebay_active_prices_latest["']\)/);
});

test("MEE assignment policy rejects weak special-lane active listing matches", () => {
  const result = evaluateMarketEvidenceAssignmentV1({
    card_print_id: "11111111-1111-1111-1111-111111111111",
    gv_id: "GV-PK-WCD-2023-MEWS_REVENGE-03-FUSION-185-GENESECT_V",
    source: "ebay_active",
    source_type: "active_listing",
    match_confidence_hint: "high",
    raw_title: "Genesect V Fusion Strike 185/264 Pokemon",
    card: {
      set_name: "World Championship Decks 2023",
    },
  });

  assert.equal(classifyMarketEvidenceLaneV1(result), "world_championship");
  assert.equal(result.accepted, false);
  assert.ok(result.reasons.includes("special_lane_requires_exact_active_listing_match:world_championship"));
  assert.equal(assertMarketEvidenceAssignmentSafeV1(result), true);
});

test("MEE assignment policy accepts strong mapped reference evidence only internally", () => {
  const result = evaluateMarketEvidenceAssignmentV1({
    card_print_id: "11111111-1111-1111-1111-111111111111",
    gv_id: "GV-PK-SV1-198",
    source: "tcgdex_tcgplayer_reference",
    source_type: "reference_price",
    match_confidence_hint: "tcgdex_external_mapping_active",
    exclusion_flags: [],
  });

  assert.equal(result.accepted, true);
  assert.equal(result.assignment_state, "assignment_accepted");
  assert.equal(result.publishable, false);
  assert.equal(result.app_visible, false);
  assert.equal(result.market_truth, false);
});

test("MEE quality gate keeps evidence non-public and separates blocked rows", () => {
  const blocked = evaluateMarketEvidenceQualityGateV1({
    card_print_id: "11111111-1111-1111-1111-111111111111",
    gv_id: "GV-PK-SV1-198",
    source: "tcgdex_tcgplayer_reference",
    source_type: "reference_price",
    match_confidence_hint: "tcgdex_external_mapping_active",
    normalized_price: 1000,
    model_eligible: false,
    evidence_quality_score: 0.1,
    quality_flags: ["high_ask_bucket_not_model_input"],
    needs_review: true,
  });
  assert.equal(blocked.rollup_eligible_internal, false);
  assert.ok(blocked.reasons.includes("model_ineligible"));
  assert.ok(blocked.reasons.includes("blocking_quality_flag"));
  assert.equal(assertMarketEvidenceQualityGateSafeV1(blocked), true);

  const eligible = evaluateMarketEvidenceQualityGateV1({
    card_print_id: "11111111-1111-1111-1111-111111111111",
    gv_id: "GV-PK-SV1-198",
    source: "tcgdex_tcgplayer_reference",
    source_type: "reference_price",
    match_confidence_hint: "tcgdex_external_mapping_active",
    normalized_price: 12.34,
    model_eligible: true,
    evidence_quality_score: 0.81,
    quality_flags: [],
    needs_review: true,
  });
  assert.equal(eligible.rollup_eligible_internal, true);
  assert.equal(eligible.publishable, false);
  assert.equal(eligible.app_visible, false);
  assert.equal(eligible.market_truth, false);
});
