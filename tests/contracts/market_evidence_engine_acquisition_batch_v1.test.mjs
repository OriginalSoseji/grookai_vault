import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildMarketEvidenceAcquisitionBatchV1 } from "../../backend/pricing/market_evidence_acquisition_batch_v1.mjs";
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
  {
    card_print_id: "22222222-2222-2222-2222-222222222222",
    gv_id: "GV-PK-BS-58",
    name: "Pikachu",
    set_code: "base1",
    number_plain: "58",
    rarity: "Common",
    priority_score: 90,
    reasons: ["no reference price evidence"],
  },
];

function sampleQueryPlan() {
  return buildMarketEvidenceQueryPlanV1({
    targets: sampleTargets,
    limit: 2,
    generatedAt: "2026-06-25T00:00:00.000Z",
  });
}

test("MEE-04C builds a dry-run acquisition batch without creating evidence or prices", () => {
  const batch = buildMarketEvidenceAcquisitionBatchV1({
    queryPlan: sampleQueryPlan(),
    sources: ["pricecharting_reference", "tcgplayer_reference_candidate"],
    limit: 3,
    generatedAt: "2026-06-25T01:00:00.000Z",
  });

  assert.equal(batch.mode, "dry_run_acquisition_batch_only");
  assert.equal(batch.boundary.provider_calls, false);
  assert.equal(batch.boundary.source_fetches, false);
  assert.equal(batch.boundary.db_writes, false);
  assert.equal(batch.boundary.pricing_rollups, false);
  assert.equal(batch.boundary.public_price_publication, false);
  assert.equal(batch.boundary.raw_evidence_objects_created, false);
  assert.equal(batch.summary.queued_item_count, 3);
  assert.equal(batch.summary.target_count, 2);
  assert.deepEqual(batch.summary.source_counts, {
    pricecharting_reference: 2,
    tcgplayer_reference_candidate: 1,
  });

  for (const item of batch.items) {
    assert.equal(item.acquisition_status, "queued_not_fetched");
    assert.equal(item.evidence_status, "not_created");
    assert.equal(item.storage_target, "local_artifact_only");
    assert.equal(item.can_publish_price_directly, false);
    assert.equal(item.needs_review, true);
    assert.equal(item.candidate_contract, "MARKET_EVIDENCE_OBJECT_CONTRACT_V1");
  }
});

test("MEE-04C defaults away from eBay lanes until an access method is approved", () => {
  const batch = buildMarketEvidenceAcquisitionBatchV1({
    queryPlan: sampleQueryPlan(),
    limit: 8,
    generatedAt: "2026-06-25T01:00:00.000Z",
  });

  const sources = new Set(batch.items.map((item) => item.source));
  assert.equal(sources.has("ebay_active"), false);
  assert.equal(sources.has("ebay_sold_candidate"), false);
  assert.equal(sources.has("pricecharting_reference"), true);
  assert.equal(sources.has("manual_review_candidate"), true);
});

test("MEE-04C rejects malformed inputs", () => {
  assert.throws(
    () => buildMarketEvidenceAcquisitionBatchV1({
      queryPlan: sampleQueryPlan(),
      sources: ["unknown_source"],
      limit: 1,
    }),
    /unknown source/,
  );

  assert.throws(
    () => buildMarketEvidenceAcquisitionBatchV1({
      queryPlan: { contract: "OTHER", targets: [] },
      limit: 1,
    }),
    /contract mismatch/,
  );
});

test("MEE-04C script and plan stay dry-run only with no provider calls or writes", () => {
  const moduleSource = source("backend/pricing/market_evidence_acquisition_batch_v1.mjs");
  const scriptSource = source("scripts/audits/market_evidence_engine_acquisition_batch_v1.mjs");
  const planDoc = source("docs/plans/market_evidence_engine_v1/MEE_04C_RAW_EVIDENCE_ACQUISITION_BATCH_V1.md");
  const pkg = source("package.json");

  assert.match(planDoc, /No provider calls, source fetches, database writes, pricing rollups/);
  assert.match(planDoc, /can_publish_price_directly = false/);
  assert.match(pkg, /"mee:acquisition-batch"/);

  const combined = `${moduleSource}\n${scriptSource}`;
  assert.doesNotMatch(combined, /createBackendClient|searchActiveListings|fetchItemDetails|fetch\s*\(/);
  assert.doesNotMatch(combined, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
