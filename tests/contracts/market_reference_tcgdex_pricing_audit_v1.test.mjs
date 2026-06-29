import assert from "node:assert/strict";
import test from "node:test";

import {
  PACKAGE_ID,
  TCGDEX_CARDMARKET_SOURCE,
  TCGDEX_TCGPLAYER_SOURCE,
  buildTcgdexReferencePricingAuditV1,
} from "../../backend/pricing/market_reference_tcgdex_pricing_audit_v1.mjs";

const cardPrintId = "11111111-1111-4111-8111-111111111111";

const rawImports = [
  {
    id: "raw-1",
    ingested_at: "2026-06-28T00:00:00.000Z",
    payload: {
      _kind: "card",
      _external_id: "swsh11-199",
      fetched_at: "2026-06-28T00:00:00.000Z",
      card: {
        id: "swsh11-199",
        name: "Aerodactyl VSTAR",
        localId: "199",
        updated: "2026-06-08T00:00:00.000Z",
        set: { name: "Lost Origin" },
        pricing: {
          tcgplayer: {
            unit: "USD",
            updated: "2026-06-08T01:00:00.000Z",
            holofoil: {
              lowPrice: 9.25,
              midPrice: 13.05,
              highPrice: 27.25,
              marketPrice: 12.11,
              productId: 284154,
              directLowPrice: null,
            },
          },
          cardmarket: {
            unit: "EUR",
            updated: "2026-06-08T02:00:00.000Z",
            avg: 1.11,
            low: 0.35,
            avg1: 0.84,
            avg7: 1.11,
            avg30: 1.13,
            trend: 1.01,
            idProduct: 670815,
            "trend-holo": 0,
          },
        },
      },
    },
  },
];

const tcgdexMappings = new Map([
  [
    "swsh11-199",
    [
      {
        id: 1,
        card_print_id: cardPrintId,
        source: "tcgdex",
        external_id: "swsh11-199",
        active: true,
      },
    ],
  ],
]);

const cardPrintsById = new Map([
  [
    cardPrintId,
    {
      id: cardPrintId,
      gv_id: "GV-PK-LOR-199",
      name: "Aerodactyl VSTAR",
      number: "199",
      set_code: "swsh11",
    },
  ],
]);

test("TCGdex pricing audit projects review-only reference evidence", () => {
  const result = buildTcgdexReferencePricingAuditV1({
    rawImports,
    tcgdexMappings,
    cardPrintsById,
    generatedAt: "2026-06-28T03:00:00.000Z",
  });

  assert.equal(result.package_id, PACKAGE_ID);
  assert.equal(result.boundary.provider_calls, false);
  assert.equal(result.boundary.source_fetches, false);
  assert.equal(result.boundary.db_writes, false);
  assert.equal(result.summary.projected_market_reference_candidate_rows, 10);
  assert.equal(result.summary.projected_market_reference_normalized_evidence_rows, 10);
  assert.equal(result.summary.projected_unique_card_prints, 1);
  assert.equal(result.summary.projected_duplicate_candidate_hashes, 0);
  assert.equal(result.counts.candidates_by_source[TCGDEX_TCGPLAYER_SOURCE], 4);
  assert.equal(result.counts.candidates_by_source[TCGDEX_CARDMARKET_SOURCE], 6);
  assert.equal(result.proofs.no_candidate_can_publish_directly, true);
  assert.equal(result.proofs.all_candidates_need_review, true);
  assert.equal(result.proofs.all_candidates_have_card_print_id, true);
  assert.equal(result.proofs.all_candidates_have_gv_id, true);
  assert.equal(result.proofs.no_public_boundary_leak, true);
});

test("TCGdex pricing audit quarantines high ask buckets", () => {
  const result = buildTcgdexReferencePricingAuditV1({
    rawImports,
    tcgdexMappings,
    cardPrintsById,
  });

  const highPrice = result.row_manifests.normalized_evidence_rows.find((row) => row.metric_key === "highprice");
  assert.equal(highPrice.model_disposition, "quarantined_metric");
  assert.equal(highPrice.model_eligible, false);
  assert.equal(highPrice.weight_hint, 0);
  assert.ok(highPrice.quality_flags.includes("high_ask_bucket_not_model_input"));

  const market = result.row_manifests.normalized_evidence_rows.find((row) => row.metric_key === "marketprice");
  assert.equal(market.model_disposition, "reference_model_candidate");
  assert.equal(market.model_eligible, true);
  assert.ok(market.weight_hint > 0);
});
