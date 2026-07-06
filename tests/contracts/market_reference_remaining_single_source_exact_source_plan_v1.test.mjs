import assert from "node:assert/strict";
import test from "node:test";

import {
  CURRENT_ROLLUP_VERSION,
  MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_PLAN_VERSION,
  buildRemainingSingleSourceExactSourcePlanV1,
} from "../../backend/pricing/market_reference_remaining_single_source_exact_source_plan_v1.mjs";

const uuid = (index) => `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`;

function target(index, overrides) {
  return {
    card_print_id: uuid(index),
    gv_id: `GV-PK-TEST-${index}`,
    name: "Test Card",
    set_code: "TEST",
    provider_number: String(index),
    number_plain: String(index),
    rarity: "Promo",
    priority_score: 1,
    existing_sources: ["tcgcsv_reference"],
    reasons: ["review_required_single_source"],
    ...overrides,
  };
}

function worklist(firstWaveSample) {
  return {
    rollup_version: CURRENT_ROLLUP_VERSION,
    first_wave_sample: firstWaveSample,
  };
}

test("MEE-09O builds exact plan-only routes for the 18 strict single-source targets", () => {
  const firstWave = [
    target(1, {
      gv_id: "GV-PK-PR-BLW-BW31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP",
      name: "Victory Cup",
      provider_number: "31",
    }),
    target(2, {
      gv_id: "GV-PK-COL-SL6",
      name: "Kyogre",
      set_code: "COL",
      provider_number: "SL6",
    }),
    target(3, {
      gv_id: "GV-PK-PR-BLW-BW04",
      name: "Reshiram",
      set_code: "BWP",
      provider_number: "BW04",
    }),
    ...Array.from({ length: 15 }, (_, index) => target(index + 4, {
      gv_id: `GV-PK-PR-BLW-BW3${index % 3}-BATTLE-ROAD-SPRING-2012-${(index % 3) + 1}${index % 3 === 0 ? "ST" : index % 3 === 1 ? "ND" : "RD"}-PLACE-STAMP`,
      name: "Victory Cup",
      provider_number: String(29 + (index % 3)),
    })),
  ];

  const report = buildRemainingSingleSourceExactSourcePlanV1({
    worklist: worklist(firstWave),
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(report.plan_version, MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_PLAN_VERSION);
  assert.equal(report.ready, true);
  assert.equal(report.summary.target_count, 18);
  assert.equal(report.summary.route_count, 54);
  assert.equal(report.summary.source_counts.ebay_active, 18);
  assert.equal(report.summary.source_counts.ebay_sold_candidate, 18);
  assert.equal(report.summary.source_counts.manual_review_candidate, 18);
  assert.equal(report.boundary.provider_calls, false);
  assert.equal(report.boundary.db_writes, false);
  assert.equal(report.targets.flatMap((item) => item.exact_routes).some((route) => route.can_publish_price_directly), false);
});

test("MEE-09O expands event-stamped and special promo search terms", () => {
  const report = buildRemainingSingleSourceExactSourcePlanV1({
    worklist: worklist([
      target(1, {
        gv_id: "GV-PK-PR-BLW-BW31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP",
        name: "Victory Cup",
        provider_number: "31",
      }),
    ]),
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  const route = report.targets[0].exact_routes.find((item) => item.source === "ebay_active");
  assert.match(route.query_text, /"Victory Cup"/);
  assert.match(route.query_text, /"Battle Road"/);
  assert.match(route.query_text, /"Autumn 2011"/);
  assert.match(route.query_text, /"1st Place"/);
  assert.match(route.query_text, /BW31/);
  assert.equal(route.query_status, "planned_not_fetched");
  assert.equal(report.ready, false);
  assert.deepEqual(report.findings, ["target_count_mismatch"]);
});
