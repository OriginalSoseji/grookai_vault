import assert from "node:assert/strict";
import test from "node:test";

import {
  buildJapaneseOfficialIncrementalSetPlanV1,
  isCompatibleJapanesePrintedSetCodeV1,
  validateJapaneseOfficialIncrementalSetPlanV1,
} from "../../backend/catalog/japanese_official_incremental_promotion_v1.mjs";

test("legacy product placeholders remain compatible with exact printed set codes", () => {
  assert.equal(isCompatibleJapanesePrintedSetCodeV1({
    existingPrintedSetCode: "PRODUCT-4B7EF0A0F96E6EF5",
    sourcePrintedSetCode: "MEE",
    canonicalSetCode: "jpn-product-4b7ef0a0f96e6ef5",
  }), true);
  assert.equal(isCompatibleJapanesePrintedSetCodeV1({
    existingPrintedSetCode: "MEZ",
    sourcePrintedSetCode: "MEE",
    canonicalSetCode: "jpn-product-4b7ef0a0f96e6ef5",
  }), false);
});

function fixture() {
  return {
    set: {
      id: "11111111-1111-1111-1111-111111111111",
      code: "jpn-product-example",
      name: "スターターセットex",
    },
    sourceSet: {
      source_set_id: "958",
      code: "MEM",
      source_url: "https://www.pokemon-card.com/example",
      expected_card_count: 3,
      count_scope: "numbered_base_set",
      numbered_base_cards: [
        { card_number_raw: "001", image_url: "https://limitless.example/1.png" },
        { card_number_raw: "002", image_url: "https://limitless.example/2.png" },
        { card_number_raw: "003", image_url: "https://limitless.example/3.png" },
      ],
    },
    existingCards: [
      { id: "existing", number: "2", number_plain: "2", name: "既存" },
    ],
    officialCards: [
      {
        card_id: "50452",
        card_number_raw: "001",
        card_number_denominator: 3,
        printed_name: "シェイミ",
        source_set_code: "MEM",
        source_url: "https://www.pokemon-card.com/card/50452",
        image_url: "https://www.pokemon-card.com/image/50452.jpg",
        hp: 80,
        category: "たね",
        illustrator: "Artist One",
      },
      {
        card_id: "50463",
        card_number_raw: "003",
        card_number_denominator: 3,
        printed_name: "ポケパッド",
        source_set_code: "MEM",
        source_url: "https://www.pokemon-card.com/card/50463",
        image_url: "https://www.pokemon-card.com/image/50463.jpg",
        hp: null,
        category: null,
        illustrator: "Artist Two",
      },
    ],
  };
}

test("official Japanese promotion closes a numbered set without inventing translations", () => {
  const plan = buildJapaneseOfficialIncrementalSetPlanV1(fixture());
  assert.equal(plan.counts.card_prints, 2);
  assert.equal(plan.payload.source_counts.resulting_canonical, 3);
  assert.deepEqual(plan.payload.rows.map((row) => row.card_print.name), [
    "シェイミ",
    "ポケパッド",
  ]);
  assert.equal(plan.payload.rows[0].identity.identity_payload.card_domain, "pokemon");
  assert.equal(plan.payload.rows[1].identity.identity_payload.card_domain, "trainer");
  assert.equal(
    plan.payload.rows[0].family_review.family_status,
    "unresolved_japanese_species",
  );
  assert.equal(plan.payload.rows[0].family_review.family_link_promotion_allowed, false);
  assert.equal(plan.payload.rows[0].card_print.image_url, null);
  assert.equal(plan.counts.image_candidates, 4);
  assert.deepEqual(validateJapaneseOfficialIncrementalSetPlanV1(plan), {
    valid: true,
    findings: [],
  });
});

test("missing printed denominators fall back to the admitted checklist total", () => {
  const input = fixture();
  for (const card of input.officialCards) card.card_number_denominator = null;
  const plan = buildJapaneseOfficialIncrementalSetPlanV1(input);
  assert.deepEqual(plan.payload.rows.map((row) => row.card_print.printed_total), [3, 3]);
});

test("printed denominators inconsistent with the checklist fail closed", () => {
  const input = fixture();
  for (const card of input.officialCards) card.card_number_denominator = 2;
  assert.throws(
    () => buildJapaneseOfficialIncrementalSetPlanV1(input),
    /printed denominator conflicts with numbered checklist/,
  );
});

test("official Japanese promotion fails closed when any checklist coordinate is missing", () => {
  const input = fixture();
  input.officialCards.pop();
  assert.throws(
    () => buildJapaneseOfficialIncrementalSetPlanV1(input),
    /Official missing-card closure failed/,
  );
});

test("official Japanese promotion rejects cross-set evidence", () => {
  const input = fixture();
  input.officialCards[0].source_set_code = "MEZ";
  assert.throws(
    () => buildJapaneseOfficialIncrementalSetPlanV1(input),
    /belongs to another set/,
  );
});

test("official Japanese promotion rejects partial or duplicate checklist authority", () => {
  const partial = fixture();
  partial.sourceSet.numbered_base_cards.pop();
  assert.throws(
    () => buildJapaneseOfficialIncrementalSetPlanV1(partial),
    /numbered-base checklist contract failed/,
  );

  const duplicate = fixture();
  duplicate.sourceSet.numbered_base_cards[2].card_number_raw = "002";
  assert.throws(
    () => buildJapaneseOfficialIncrementalSetPlanV1(duplicate),
    /repeats card number 2/,
  );
});
