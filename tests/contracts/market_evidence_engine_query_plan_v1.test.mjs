import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildMarketEvidenceQueryPlanV1 } from "../../backend/pricing/market_evidence_query_plan_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const sampleTargets = [
  {
    card_print_id: "11111111-1111-1111-1111-111111111111",
    gv_id: "GV-PK-BS-4",
    name: "Charizard",
    set_code: "base1",
    number_plain: "4",
    rarity: "Rare Holo",
    priority_score: 110,
    reasons: ["no accepted mapped eBay observations"],
  },
];

test("MEE-04B builds a local multi-source query plan without evidence claims", () => {
  const plan = buildMarketEvidenceQueryPlanV1({
    targets: sampleTargets,
    limit: 1,
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(plan.mode, "local_query_plan_only");
  assert.equal(plan.boundary.provider_calls, false);
  assert.equal(plan.boundary.db_writes, false);
  assert.equal(plan.boundary.source_urls_are_templates_only, true);
  assert.equal(plan.summary.target_count, 1);
  assert.equal(plan.summary.source_count, 6);
  assert.equal(plan.summary.planned_query_count, 6);

  const sources = plan.targets[0].source_queries.map((query) => query.source).sort();
  assert.deepEqual(sources, [
    "ebay_active",
    "ebay_sold_candidate",
    "justtcg_reference",
    "manual_review_candidate",
    "pricecharting_reference",
    "tcgplayer_reference_candidate",
  ]);

  for (const query of plan.targets[0].source_queries) {
    assert.equal(query.can_publish_price_directly, false);
    assert.equal(query.query_status, "planned_not_fetched");
    assert.ok(query.query_text.includes("Charizard") || query.query_text.includes("GV-PK-BS-4"));
  }
});

test("MEE-04B rejects unknown sources and malformed targets", () => {
  assert.throws(
    () => buildMarketEvidenceQueryPlanV1({
      targets: sampleTargets,
      sources: ["unknown_source"],
      limit: 1,
    }),
    /unknown source/,
  );

  assert.throws(
    () => buildMarketEvidenceQueryPlanV1({
      targets: [{ ...sampleTargets[0], gv_id: "" }],
      limit: 1,
    }),
    /target.gv_id is required/,
  );
});

test("MEE-04B script and plan stay local-only with no provider calls or writes", () => {
  const moduleSource = source("backend/pricing/market_evidence_query_plan_v1.mjs");
  const scriptSource = source("scripts/audits/market_evidence_engine_query_plan_v1.mjs");
  const planDoc = source("docs/plans/market_evidence_engine_v1/MEE_04B_MULTI_SOURCE_QUERY_PLAN_V1.md");
  const pkg = source("package.json");

  assert.match(planDoc, /No provider calls, scraper jobs, database writes, pricing rollups, or migrations/);
  assert.match(planDoc, /search URL templates/);
  assert.match(planDoc, /Proceed to `MEE-04C`/);
  assert.match(pkg, /"mee:query-plan"/);

  const combined = `${moduleSource}\n${scriptSource}`;
  assert.doesNotMatch(combined, /createBackendClient|searchActiveListings|fetchItemDetails|fetch\s*\(/);
  assert.doesNotMatch(combined, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
