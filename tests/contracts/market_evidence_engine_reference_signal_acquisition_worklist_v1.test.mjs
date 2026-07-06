import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKET_REFERENCE_SIGNAL_ACQUISITION_WORKLIST_VERSION,
  buildMarketReferenceSignalAcquisitionWorklistV1,
} from "../../backend/pricing/market_reference_signal_acquisition_worklist_v1.mjs";

test("MEE-09H builds a safe second-source worklist for single-source rollups", () => {
  const report = buildMarketReferenceSignalAcquisitionWorklistV1({
    rollups: [{
      card_print_id: "00000000-0000-0000-0000-000000000001",
      gv_id: "GV-PK-TEST-001",
      review_status: "review_required_single_source",
      source_count: 1,
      reference_median: 10,
      variance_band: "bounded_variance",
      review_flags: ["single_source_only"],
      source_summary: { sources: ["tcgcsv_reference"] },
    }],
    cardPrints: [{
      id: "00000000-0000-0000-0000-000000000001",
      gv_id: "GV-PK-TEST-001",
      name: "Pikachu",
      set_code: "BS",
      number_plain: "58",
      rarity: "Common",
    }],
  });

  assert.equal(report.worklist_version, MARKET_REFERENCE_SIGNAL_ACQUISITION_WORKLIST_VERSION);
  assert.equal(report.summary.single_source_rollups, 1);
  assert.equal(report.summary.first_wave_review_required_single_source, 1);
  assert.equal(report.first_wave[0].can_publish_price_directly, false);
  assert.ok(report.first_wave[0].proposed_sources.includes("pokemontcg_io_reference"));
});

test("MEE-09H routes special lanes away from auto-publish and toward manual review", () => {
  const report = buildMarketReferenceSignalAcquisitionWorklistV1({
    rollups: [{
      card_print_id: "00000000-0000-0000-0000-000000000002",
      gv_id: "GV-PK-TEST-STAFF",
      review_status: "blocked_special_lane_review",
      source_count: 1,
      reference_median: 200,
      variance_band: "high_variance",
      review_flags: ["special_lane_review_required"],
      source_summary: { sources: ["tcgcsv_reference"] },
    }],
    cardPrints: [{
      id: "00000000-0000-0000-0000-000000000002",
      name: "Staff Card",
      set_code: "PR",
      number_plain: "1",
    }],
  });

  assert.equal(report.special_lane_queue.length, 1);
  assert.ok(report.special_lane_queue[0].proposed_sources.includes("manual_review_candidate"));
  assert.equal(report.special_lane_queue[0].can_publish_price_directly, false);
});
