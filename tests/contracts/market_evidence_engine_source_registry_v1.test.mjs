import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MARKET_EVIDENCE_OBJECT_CONTRACT_V1,
  MARKET_EVIDENCE_SOURCE_REGISTRY_V1,
  assertMarketEvidenceRegistrySafeV1,
  createMarketEvidenceCandidateV1,
  getMarketEvidenceSourceV1,
} from "../../backend/pricing/market_evidence_source_registry_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE source registry includes the initial multi-source lanes without direct price publication", () => {
  assert.equal(assertMarketEvidenceRegistrySafeV1(), true);
  assert.deepEqual(
    MARKET_EVIDENCE_SOURCE_REGISTRY_V1.map((entry) => entry.source).sort(),
    [
      "ebay_active",
      "ebay_sold_candidate",
      "justtcg_reference",
      "manual_review_candidate",
      "pricecharting_reference",
      "tcgplayer_reference_candidate",
    ],
  );

  for (const entry of MARKET_EVIDENCE_SOURCE_REGISTRY_V1) {
    assert.equal(entry.can_publish_price_directly, false, entry.source);
  }

  assert.equal(getMarketEvidenceSourceV1("ebay_active")?.source_type, "active_listing");
  assert.equal(getMarketEvidenceSourceV1("justtcg_reference")?.pricing_lane, "reference");
});

test("MEE evidence object contract normalizes candidate evidence but keeps it non-publishable", () => {
  const candidate = createMarketEvidenceCandidateV1({
    card_print_id: "11111111-1111-1111-1111-111111111111",
    gv_id: "GV-PK-BS-4",
    source: "ebay_active",
    source_url: "https://example.invalid/listing/1",
    raw_title: "Pokemon Base Set Charizard 4/102 Holo",
    raw_price: "199.99",
    currency: "USD",
    condition_hint: "LP",
    finish_hint: "Holo",
    observed_at: "2026-06-25T00:00:00Z",
    match_confidence_hint: "high",
    exclusion_flags: [],
    needs_review: true,
  });

  assert.equal(candidate.raw_price, 199.99);
  assert.equal(candidate.can_publish_price_directly, false);
  assert.equal(candidate.contract_version, "MARKET_EVIDENCE_OBJECT_CONTRACT_V1");
  assert.deepEqual(candidate.exclusion_flags, ["manual_review_required"]);
});

test("MEE evidence object contract rejects unknown sources and unsafe flags", () => {
  assert.throws(
    () => createMarketEvidenceCandidateV1({
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-BS-4",
      source: "random_scraper",
      raw_price: 1,
    }),
    /unknown source/,
  );

  assert.throws(
    () => createMarketEvidenceCandidateV1({
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-BS-4",
      source: "ebay_active",
      source_type: "reference_price",
      raw_price: 1,
    }),
    /does not match registry/,
  );

  assert.throws(
    () => createMarketEvidenceCandidateV1({
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-BS-4",
      source: "ebay_active",
      raw_price: 1,
      exclusion_flags: ["publish_now"],
    }),
    /unknown exclusion flag/,
  );
});

test("MEE-04A remains contract-only with no provider calls, DB writes, or migrations", () => {
  const script = source("backend/pricing/market_evidence_source_registry_v1.mjs");
  const plan = source("docs/plans/market_evidence_engine_v1/MEE_04A_SOURCE_REGISTRY_AND_EVIDENCE_CONTRACT_V1.md");
  const migrations = source("tests/contracts/market_evidence_engine_warehouse_plan_v1.test.mjs");

  assert.match(plan, /No provider calls, scraper jobs, database writes, pricing rollups, or migrations/);
  assert.match(plan, /can_publish_price_directly = false/);
  assert.match(plan, /Proceed to `MEE-04B`/);

  for (const field of MARKET_EVIDENCE_OBJECT_CONTRACT_V1.required_fields) {
    assert.match(plan, new RegExp(field));
  }

  assert.doesNotMatch(script, /createBackendClient|searchActiveListings|fetchItemDetails|fetch\s*\(/);
  assert.doesNotMatch(script, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
  assert.match(migrations, /MEE-02 has not added a warehouse migration yet/);
});
