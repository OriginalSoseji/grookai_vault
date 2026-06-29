import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { acquireTcgcsvReferenceEvidenceV1 } from "../../backend/pricing/market_evidence_tcgcsv_reference_acquisition_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const sampleBatch = {
  items: [
    {
      card_print_id: "11111111-1111-1111-1111-111111111111",
      gv_id: "GV-PK-RR-103",
      name: "Alakazam E4 LV.X",
      set_code: "pl2",
      set_name: "Rising Rivals",
      number_plain: "103",
      source: "tcgcsv_reference",
    },
    {
      card_print_id: "22222222-2222-2222-2222-222222222222",
      gv_id: "GV-PK-BS-4",
      name: "Charizard",
      set_code: "base1",
      set_name: "Base Set",
      number_plain: "4",
      source: "pokemontcg_io_reference",
    },
  ],
};

const groups = [
  { groupId: 1367, name: "Rising Rivals" },
  { groupId: 9999, name: "Other Set" },
];

const groupPayloadsByGroupId = {
  1367: {
    products: [
      {
        productId: 83504,
        name: "Alakazam E4 Lv.X",
        url: "https://www.tcgplayer.com/product/83504/pokemon-rising-rivals-alakazam-e4-lvx",
        modifiedOn: "2026-06-24T00:00:00.000Z",
        extendedData: [
          { name: "Number", displayName: "Card Number", value: "103/111" },
          { name: "Rarity", displayName: "Rarity", value: "Ultra Rare" },
        ],
      },
    ],
    prices: [
      {
        productId: 83504,
        lowPrice: 150,
        midPrice: 200,
        highPrice: 400,
        marketPrice: 175.25,
        directLowPrice: null,
        subTypeName: "Holofoil",
      },
      {
        productId: 99999,
        lowPrice: 1,
        midPrice: 2,
        highPrice: 3,
        marketPrice: 2,
        directLowPrice: null,
        subTypeName: "Normal",
      },
    ],
  },
};

test("MEE-06B extracts TCGCSV product price buckets as review-gated evidence", () => {
  const result = acquireTcgcsvReferenceEvidenceV1({
    batch: sampleBatch,
    groups,
    groupPayloadsByGroupId,
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(result.mode, "public_snapshot_reference_raw_evidence_only");
  assert.equal(result.boundary.db_writes, false);
  assert.equal(result.boundary.pricing_rollups, false);
  assert.equal(result.boundary.public_price_publication, false);
  assert.equal(result.summary.tcgcsv_targets, 1);
  assert.equal(result.summary.candidate_evidence_count, 4);
  assert.deepEqual(result.summary.status_counts, { candidate_evidence_created: 1 });

  for (const candidate of result.candidate_evidence) {
    assert.equal(candidate.source, "tcgcsv_reference");
    assert.equal(candidate.source_type, "reference_price");
    assert.equal(candidate.currency, "USD");
    assert.equal(candidate.can_publish_price_directly, false);
    assert.equal(candidate.needs_review, true);
    assert.equal(candidate.match_confidence_hint, "high");
    assert.equal(candidate.raw_payload.lane, "tcgcsv_reference_v1");
    assert.equal(candidate.raw_payload.group_id, 1367);
    assert.equal(candidate.raw_payload.product_id, 83504);
    assert.ok(candidate.raw_price > 0);
  }
  assert.ok(result.candidate_evidence.some((candidate) => candidate.condition_hint === "tcgcsv:marketPrice"));
});

test("MEE-06B records group/product misses without inventing evidence", () => {
  const result = acquireTcgcsvReferenceEvidenceV1({
    batch: {
      items: [
        {
          card_print_id: "33333333-3333-3333-3333-333333333333",
          gv_id: "GV-PK-NOSET-1",
          name: "Missingmon",
          set_code: "noset",
          set_name: "No Such Set",
          number_plain: "1",
          source: "tcgcsv_reference",
        },
        {
          card_print_id: "44444444-4444-4444-4444-444444444444",
          gv_id: "GV-PK-RR-999",
          name: "Missingmon 2",
          set_code: "pl2",
          set_name: "Rising Rivals",
          number_plain: "999",
          source: "tcgcsv_reference",
        },
      ],
    },
    groups,
    groupPayloadsByGroupId,
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(result.summary.candidate_evidence_count, 0);
  assert.deepEqual(result.summary.status_counts, {
    no_tcgcsv_group_match: 1,
    no_tcgcsv_product_price_match: 1,
  });
});

test("MEE-06B distinguishes matched products with no price rows", () => {
  const result = acquireTcgcsvReferenceEvidenceV1({
    batch: {
      items: [
        {
          card_print_id: "88888888-8888-8888-8888-888888888888",
          gv_id: "GV-PK-PR-BLW-BW15",
          name: "Pidove",
          set_code: "bwp",
          set_name: "BW Black Star Promos",
          number_plain: "15",
          source: "tcgcsv_reference",
        },
      ],
    },
    groups: [{ groupId: 1407, name: "Black and White Promos" }],
    groupPayloadsByGroupId: {
      1407: {
        products: [
          {
            productId: 88057,
            name: "Pidove - BW15",
            extendedData: [
              { name: "Number", displayName: "Card Number", value: "BW15" },
              { name: "Rarity", displayName: "Rarity", value: "Rare" },
            ],
          },
        ],
        prices: [],
      },
    },
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(result.summary.candidate_evidence_count, 0);
  assert.deepEqual(result.summary.status_counts, { no_tcgcsv_price_rows_for_product: 1 });
  assert.equal(result.reviewed_targets[0].matched_product_count, 1);
  assert.equal(result.reviewed_targets[0].matched_products[0].product_number, "BW15");
});

test("MEE-06B matches governed promo and shiny subset number prefixes", () => {
  const result = acquireTcgcsvReferenceEvidenceV1({
    batch: {
      items: [
        {
          card_print_id: "55555555-5555-5555-5555-555555555555",
          gv_id: "GV-PK-PR-BLW-BW01",
          name: "Snivy",
          set_code: "bwp",
          set_name: "BW Black Star Promos",
          number_plain: "01",
          source: "tcgcsv_reference",
        },
        {
          card_print_id: "66666666-6666-6666-6666-666666666666",
          gv_id: "GV-PK-COL-SL1",
          name: "Deoxys",
          set_code: "col1",
          set_name: "Call of Legends",
          number_plain: "1",
          source: "tcgcsv_reference",
        },
        {
          card_print_id: "77777777-7777-7777-7777-777777777777",
          gv_id: "GV-PK-COL-1",
          name: "Deoxys",
          set_code: "col1",
          set_name: "Call of Legends",
          number_plain: "1",
          source: "tcgcsv_reference",
        },
      ],
    },
    groups: [
      { groupId: 1407, name: "Black and White Promos" },
      { groupId: 1415, name: "Call of Legends" },
    ],
    groupPayloadsByGroupId: {
      1407: {
        products: [
          {
            productId: 89377,
            name: "Snivy - BW01",
            url: "https://www.tcgplayer.com/product/89377/pokemon-black-and-white-promos-snivy-bw01",
            extendedData: [
              { name: "Number", displayName: "Card Number", value: "BW01" },
              { name: "Rarity", displayName: "Rarity", value: "Promo" },
            ],
          },
        ],
        prices: [
          { productId: 89377, lowPrice: 1, midPrice: 2, highPrice: 3, marketPrice: 2.5, directLowPrice: null, subTypeName: "Holofoil" },
        ],
      },
      1415: {
        products: [
          {
            productId: 84758,
            name: "Deoxys (Shiny)",
            url: "https://www.tcgplayer.com/product/84758/pokemon-call-of-legends-deoxys-shiny",
            extendedData: [
              { name: "Number", displayName: "Card Number", value: "SL1" },
              { name: "Rarity", displayName: "Rarity", value: "Shiny Holo Rare" },
            ],
          },
        ],
        prices: [
          { productId: 84758, lowPrice: 20, midPrice: 25, highPrice: 100, marketPrice: 24, directLowPrice: null, subTypeName: "Holofoil" },
        ],
      },
    },
    generatedAt: "2026-06-25T00:00:00.000Z",
  });

  assert.equal(result.summary.candidate_evidence_count, 8);
  assert.equal(result.reviewed_targets.find((target) => target.gv_id === "GV-PK-PR-BLW-BW01").status, "candidate_evidence_created");
  assert.equal(result.reviewed_targets.find((target) => target.gv_id === "GV-PK-COL-SL1").status, "candidate_evidence_created");
  assert.equal(result.reviewed_targets.find((target) => target.gv_id === "GV-PK-COL-1").status, "no_tcgcsv_product_price_match");
});

test("MEE-06B script keeps DB writes and public prices out of the TCGCSV lane", () => {
  const moduleSource = source("backend/pricing/market_evidence_tcgcsv_reference_acquisition_v1.mjs");
  const scriptSource = source("scripts/audits/market_evidence_engine_tcgcsv_reference_acquisition_v1.mjs");
  const pkg = source("package.json");

  assert.match(pkg, /"mee:tcgcsv"/);
  assert.match(scriptSource, /read_only_db_set_catalog_lookup/);
  assert.match(scriptSource, /curl\.exe/);

  const combined = `${moduleSource}\n${scriptSource}`;
  assert.doesNotMatch(combined, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/);
});
