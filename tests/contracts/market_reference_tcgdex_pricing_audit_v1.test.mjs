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

function buildWithCardmarket({ variants, cardmarket }) {
  const scopedRawImports = structuredClone(rawImports);
  const card = scopedRawImports[0].payload.card;
  if (variants !== undefined) card.variants = variants;
  card.pricing.tcgplayer = null;
  card.pricing.cardmarket = {
    unit: "EUR",
    updated: "2026-06-08T02:00:00.000Z",
    ...cardmarket,
  };
  return buildTcgdexReferencePricingAuditV1({
    rawImports: scopedRawImports,
    tcgdexMappings,
    cardPrintsById,
    generatedAt: "2026-06-28T03:00:00.000Z",
  });
}

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
  assert.equal(result.boundary.card_print_writes, false);
  assert.equal(result.boundary.card_printing_writes, false);
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
  assert.equal(result.proofs.finish_resolution_is_evidence_only, true);
  assert.equal(result.proofs.no_card_printing_write_authority, true);
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

test("TCGdex Cardmarket unsuffixed metrics map to holo for explicitly holo-only cards", () => {
  const result = buildWithCardmarket({
    variants: { holo: true, normal: false },
    cardmarket: { avg: 1.11, low: 0.35 },
  });

  assert.equal(result.row_manifests.candidate_rows.length, 2);
  for (const row of result.row_manifests.candidate_rows) {
    assert.equal(row.source, TCGDEX_CARDMARKET_SOURCE);
    assert.equal(row.finish_hint, "holo");
    assert.equal(row.raw_payload.finish, "holo");
    assert.equal(row.raw_payload.raw_metric, row.raw_payload.metric);
    assert.deepEqual(row.raw_payload.tcgdex_variants, { holo: true, normal: false });
    assert.equal(row.raw_payload.finish_resolution_rule, 'unsuffixed_holo_only_source_variants');
    assert.match(row.raw_title, /tcgdex cardmarket holo/);
  }
  for (const row of result.row_manifests.normalized_evidence_rows) {
    assert.equal(row.normalized_payload.finish_hint, "holo");
    assert.deepEqual(row.normalized_payload.tcgdex_variants, { holo: true, normal: false });
    assert.equal(row.normalized_payload.finish_resolution_rule, 'unsuffixed_holo_only_source_variants');
  }
});

test("TCGdex Cardmarket preserves explicit finish suffixes on holo-only cards", () => {
  const result = buildWithCardmarket({
    variants: { holo: true, normal: false },
    cardmarket: {
      avg: 2,
      "avg-normal": 1,
      "avg-holo": 3,
    },
  });

  const finishByPrice = Object.fromEntries(
    result.row_manifests.candidate_rows.map((row) => [row.raw_price, row.finish_hint]),
  );
  assert.deepEqual(finishByPrice, {
    1: "normal",
    2: "holo",
    3: "holo",
  });
  const explicitHolo = result.row_manifests.candidate_rows.find((row) => row.raw_price === 3);
  assert.equal(explicitHolo.raw_payload.raw_metric, 'avg-holo');
  assert.equal(explicitHolo.raw_payload.finish_resolution_rule, 'explicit_metric_finish_suffix');
});

test("TCGdex Cardmarket keeps unsuffixed metrics normal without explicit holo-only truth", () => {
  const cases = [
    undefined,
    { holo: true, normal: true },
    { holo: true },
    { normal: false },
    { holo: false, normal: false },
  ];

  for (const variants of cases) {
    const result = buildWithCardmarket({ variants, cardmarket: { avg: 1.11 } });
    assert.equal(result.row_manifests.candidate_rows[0].finish_hint, "normal");
    assert.equal(result.row_manifests.candidate_rows[0].raw_payload.finish, "normal");
    assert.equal(
      result.row_manifests.candidate_rows[0].raw_payload.finish_resolution_rule,
      'unsuffixed_legacy_normal_review_only',
    );
  }
});
