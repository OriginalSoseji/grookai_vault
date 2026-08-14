import assert from "node:assert/strict";
import test from "node:test";

import {
  ONE_PIECE_CANONICAL_CATALOG_CANDIDATE_V1,
  classifyOnePieceSourceProductV1,
  onePieceExtendedDataV1,
  reconcileOnePieceCatalogV1,
} from "../../backend/pricing/one_piece_canonical_catalog_candidate_v1.mjs";

const AS_OF_DATE = "2026-08-13";

function field(name, value) {
  return { name, value, displayName: name };
}

function product(overrides = {}) {
  return {
    product_id: 500001,
    category_id: 68,
    group_id: 23000,
    group_name: "Kingdoms of Intrigue",
    published_on: "2023-11-03T00:00:00Z",
    name: "Monkey.D.Luffy",
    image_url: "https://example.invalid/card.jpg",
    source_active: true,
    presale_info: { isPresale: false, releasedOn: "2023-11-03T00:00:00Z" },
    extended_data: [
      field("Rarity", "SR"),
      field("Number", "OP04-090"),
      field("CardType", "Character"),
      field("Color", "Purple"),
    ],
    source_price_lanes: [
      {
        source_price_row_identity: "500001:normal",
        subtype_name_normalized: "Normal",
        observed_on: "2026-08-13",
        market_price: "1.25",
      },
    ],
    ...overrides,
  };
}

function classify(overrides = {}) {
  return classifyOnePieceSourceProductV1(product(overrides), { asOfDate: AS_OF_DATE });
}

test("extended metadata normalization preserves repeated source values", () => {
  const result = onePieceExtendedDataV1([
    field("Card Type", "Character"),
    field("CardType", "Leader"),
  ]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.fields.cardtype, ["Character", "Leader"]);
});

test("numbered card with structured CardType is an exact single-card candidate", () => {
  const result = classify();
  assert.equal(result.candidate_version, ONE_PIECE_CANONICAL_CATALOG_CANDIDATE_V1);
  assert.equal(result.classification, "exact_single_card_candidate");
  assert.equal(result.single_card_kind, "numbered_card");
  assert.equal(result.card_evidence.number, "OP04-090");
  assert.equal(result.card_evidence.number_format, "booster");
  assert.equal(result.parent_gv_id, "GV-OP-TCGP-500001");
  assert.equal(result.publishable, false);
  assert.equal(result.canonical_write_authorized, false);
});

test("unnumbered structured DON!! card remains a single-card candidate", () => {
  const result = classify({
    product_id: 500002,
    name: "DON!! Card (Alternate Art) (Gold)",
    extended_data: [
      field("Rarity", "DON!!"),
      field("CardType", "DON!!"),
      field("Description", "Your Turn +1000"),
    ],
  });
  assert.equal(result.classification, "exact_single_card_candidate");
  assert.equal(result.single_card_kind, "don_card");
  assert.equal(result.card_evidence.number, null);
  assert.deepEqual(result.product_signals.treatments, ["alternate_art", "gold"]);
});

test("structured DON!! card from a pack remains distinct from the sealed pack", () => {
  const card = classify({
    product_id: 500025,
    name: "DON!! Card (Manga) (Double Pack Set Volume 2)",
    extended_data: [field("Rarity", "DON!!"), field("CardType", "DON!!")],
  });
  const pack = classify({
    product_id: 500026,
    name: "Double Pack Set Volume 2",
    extended_data: [],
  });
  assert.equal(card.classification, "exact_single_card_candidate");
  assert.equal(card.single_card_kind, "don_card");
  assert.equal(pack.classification, "sealed_product_candidate");
});

test("missing Number alone never classifies a row as sealed", () => {
  const result = classify({
    product_id: 500003,
    name: "Unknown promotional object",
    extended_data: [field("Rarity", "PR")],
  });
  assert.equal(result.classification, "ambiguous_quarantine");
  assert.equal(result.promotion_state, "quarantine");
});

test("alternate arts sharing a printed number remain distinct parents", () => {
  const base = product({
    product_id: 500004,
    name: "Roronoa Zoro",
    source_price_lanes: [],
  });
  const alternate = product({
    product_id: 500005,
    name: "Roronoa Zoro (Alternate Art)",
    source_price_lanes: [],
  });
  const reconciliation = reconcileOnePieceCatalogV1([base, alternate], {
    asOfDate: AS_OF_DATE,
  });
  assert.equal(reconciliation.counts.exact_single_card_candidates, 2);
  assert.notEqual(reconciliation.rows[0].parent_gv_id, reconciliation.rows[1].parent_gv_id);
  assert.notEqual(
    reconciliation.rows[0].identity_key_hash,
    reconciliation.rows[1].identity_key_hash,
  );
  assert.equal(reconciliation.source_price_lane_collisions.length, 0);
});

test("manga and tournament treatments are preserved as parent facts", () => {
  const manga = classify({ product_id: 500006, name: "Nami (Manga)" });
  const winner = classify({
    product_id: 500007,
    name: "Nami (Winner Pack 2026 Vol. 3)",
  });
  assert.deepEqual(manga.product_signals.treatments, ["manga"]);
  assert.deepEqual(winner.product_signals.treatments, ["winner"]);
});

test("P-number promo is an exact numbered card candidate", () => {
  const result = classify({
    product_id: 500008,
    group_name: "One Piece Promotion Cards",
    name: "Monkey.D.Luffy (Promotion Pack)",
    extended_data: [
      field("Rarity", "PR"),
      field("Number", "P-001"),
      field("CardType", "Character"),
    ],
  });
  assert.equal(result.classification, "exact_single_card_candidate");
  assert.equal(result.card_evidence.number_format, "promo");
});

test("future and explicit presale cards remain warehoused but promotion-held", () => {
  const result = classify({
    product_id: 500009,
    group_name: "The World's Strongest Warriors",
    published_on: "2026-08-28T00:00:00Z",
    presale_info: { isPresale: true, releasedOn: "2026-08-28T00:00:00Z" },
  });
  assert.equal(result.classification, "exact_single_card_candidate");
  assert.equal(result.release.explicit_presale, true);
  assert.equal(result.release.future_release, true);
  assert.equal(result.promotion_state, "future_or_presale_hold");
  assert.equal(result.publishable, false);
});

test("starter-deck singles and the sealed deck product are separate classes", () => {
  const single = classify({
    product_id: 500010,
    group_name: "Starter Deck 1: Straw Hat Crew",
    name: "Monkey.D.Luffy",
    extended_data: [
      field("Rarity", "L"),
      field("Number", "ST01-001"),
      field("CardType", "Leader"),
    ],
  });
  const sealed = classify({
    product_id: 500011,
    group_name: "Starter Deck 1: Straw Hat Crew",
    name: "Starter Deck 1: Straw Hat Crew",
    extended_data: [],
  });
  assert.equal(single.classification, "exact_single_card_candidate");
  assert.equal(sealed.classification, "sealed_product_candidate");
  assert.equal(sealed.promotion_state, "separate_sealed_catalog");
  assert.equal(sealed.parent_gv_id, null);
});

test("sealed booster and display products never become card candidates", () => {
  for (const [id, name] of [
    [500012, "Kingdoms of Intrigue Booster Box"],
    [500013, "Starter Deck 1 Display"],
    [500014, "Tournament Pack 2026 Vol. 3"],
  ]) {
    const result = classify({ product_id: id, name, extended_data: [] });
    assert.equal(result.classification, "sealed_product_candidate");
    assert.equal(result.canonical_write_authorized, false);
  }
});

test("accessories remain quarantined outside card and sealed identities", () => {
  const result = classify({
    product_id: 500015,
    name: "One Piece Card Game Playmat and Storage Box",
    extended_data: [],
  });
  assert.equal(result.classification, "ambiguous_quarantine");
  assert.ok(result.classification_reasons.includes("non_card_accessory_signal"));
});

test("packaging and structured card evidence conflict is quarantined", () => {
  const result = classify({
    product_id: 500016,
    name: "Booster Pack Character",
  });
  assert.equal(result.classification, "ambiguous_quarantine");
  assert.ok(result.classification_reasons.includes("packaging_and_card_evidence_conflict"));
});

test("malformed metadata is quarantined and never authorizes a write", () => {
  const result = classify({ product_id: 500017, extended_data: { Number: "OP01-001" } });
  assert.equal(result.classification, "ambiguous_quarantine");
  assert.ok(result.classification_reasons.includes("malformed_extended_data"));
  assert.equal(result.canonical_write_authorized, false);
  assert.equal(result.sealed_write_authorized, false);
});

test("explicit language is preserved while conflicting language is quarantined", () => {
  const nonEnglish = classify({
    product_id: 500027,
    name: "Monkey.D.Luffy (Japanese Version)",
  });
  const conflicting = classify({
    product_id: 500028,
    name: "Monkey.D.Luffy (English and Japanese Version)",
  });
  assert.equal(nonEnglish.classification, "exact_single_card_candidate");
  assert.equal(nonEnglish.language.normalized, "ja");
  assert.equal(nonEnglish.identity_domain, "one_piece_tcgplayer_print");
  assert.equal(conflicting.classification, "ambiguous_quarantine");
  assert.ok(conflicting.classification_reasons.includes("conflicting_language_claims"));
});

test("Number without supported CardType cannot invent a printing", () => {
  const result = classify({
    product_id: 500018,
    extended_data: [field("Number", "OP01-001"), field("Rarity", "L")],
  });
  assert.equal(result.classification, "ambiguous_quarantine");
  assert.ok(result.classification_reasons.includes("number_without_supported_cardtype"));
});

test("nonstandard explicit card numbers are preserved rather than rewritten", () => {
  const result = classify({
    product_id: 500019,
    extended_data: [
      field("Number", "1/1000"),
      field("Rarity", "L"),
      field("CardType", "Leader"),
    ],
  });
  assert.equal(result.classification, "exact_single_card_candidate");
  assert.equal(result.card_evidence.number, "1/1000");
  assert.equal(result.card_evidence.number_format, "explicit_nonstandard");
});

test("source price lanes remain evidence and never become publication authority", () => {
  const result = classify();
  assert.deepEqual(result.source_price_lanes, [
    {
      source_price_row_identity: "500001:normal",
      subtype_name_normalized: "normal",
      observed_on: "2026-08-13",
      positive_market_signal: true,
    },
  ]);
  assert.equal(result.publishable, false);
});

test("reconciliation preserves every source row exactly once", () => {
  const rows = [
    product({ product_id: 500020 }),
    product({ product_id: 500021, name: "Starter Deck 1 Display", extended_data: [] }),
    product({ product_id: 500022, name: "Unknown", extended_data: [] }),
  ];
  const result = reconcileOnePieceCatalogV1(rows, { asOfDate: AS_OF_DATE });
  assert.equal(result.counts.source_products, 3);
  assert.equal(result.preserved_source_product_count, 3);
  assert.equal(result.counts.exact_single_card_candidates, 1);
  assert.equal(result.counts.sealed_product_candidates, 1);
  assert.equal(result.counts.ambiguous_quarantined, 1);
  assert.equal(result.publishable, false);
  assert.equal(result.database_writes_authorized, false);
});

test("duplicate source product IDs and price-lane owners are collision findings", () => {
  const first = product({ product_id: 500023 });
  const duplicate = product({ product_id: 500023, name: "Duplicate source row" });
  const secondOwner = product({
    product_id: 500024,
    name: "Alternate owner",
    source_price_lanes: [
      {
        source_price_row_identity: "500001:normal",
        subtype_name_normalized: "normal",
        observed_on: "2026-08-13",
        market_price: "1.00",
      },
    ],
  });
  const result = reconcileOnePieceCatalogV1([first, duplicate, secondOwner], {
    asOfDate: AS_OF_DATE,
  });
  assert.deepEqual(result.duplicate_source_product_ids, [500023]);
  assert.equal(result.source_price_lane_collisions.length, 1);
});

test("classification and identity hashes are deterministic", () => {
  const first = classify();
  const second = classify();
  assert.deepEqual(first, second);
  assert.equal(first.identity_key_hash, second.identity_key_hash);
});
