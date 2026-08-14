import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  classifyCrossTcgSealedProductV1,
  CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1,
  SEALED_CLASSIFICATIONS_V1,
} from "../../backend/pricing/cross_tcg_sealed_product_identity_v1.mjs";

function product(name, extendedData = [], overrides = {}) {
  return {
    product_id: 100,
    category_id: 3,
    category_display_name: "Pokemon",
    group_id: 200,
    group_name: "Example Set",
    name,
    extended_data: extendedData,
    ...overrides,
  };
}

function field(name, value) {
  return { name, value };
}

function classify(name, extendedData = [], overrides = {}) {
  return classifyCrossTcgSealedProductV1(product(name, extendedData, overrides));
}

test("policy exposes only the governed four classification outcomes", () => {
  assert.equal(
    CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1,
    "CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1",
  );
  assert.deepEqual(SEALED_CLASSIFICATIONS_V1, [
    "sealed_candidate",
    "nonsealed_card",
    "ambiguous_review",
    "excluded_non_tcg_product",
  ]);
});

test("booster pack is a sealed pack candidate", () => {
  const result = classify("Twilight Masquerade Booster Pack", [
    field("Description", "Each sealed booster pack contains 10 cards."),
  ]);
  assert.equal(result.classification, "sealed_candidate");
  assert.equal(result.candidate_identity.package_form, "pack");
  assert.ok(result.confidence >= 0.97);
});

test("sleeved booster pack is distinct from a loose pack", () => {
  const result = classify("Theros Beyond Death - Sleeved Collector Booster Pack");
  assert.equal(result.classification, "sealed_candidate");
  assert.equal(result.candidate_identity.package_form, "sleeved_pack");
});

test("booster box is distinct from display and case", () => {
  const result = classify("Abyss Eye Booster Box");
  assert.equal(result.classification, "sealed_candidate");
  assert.equal(result.candidate_identity.package_form, "booster_box");
});

test("booster display is a display candidate", () => {
  const result = classify("Mystery Booster Commander Edition - Booster Display");
  assert.equal(result.classification, "sealed_candidate");
  assert.equal(result.candidate_identity.package_form, "display");
});

test("booster display case is a case candidate", () => {
  const result = classify("Mystery Booster Commander Edition - Booster Display Case");
  assert.equal(result.classification, "sealed_candidate");
  assert.equal(result.candidate_identity.package_form, "case");
});

test("starter deck is a deck candidate and deck display stays separate", () => {
  const deck = classify("One Piece Starter Deck ST-01");
  const display = classify("One Piece Starter Deck Display ST-01");
  assert.equal(deck.candidate_identity.package_form, "deck");
  assert.equal(display.candidate_identity.package_form, "deck_display");
});

test("kits, tins, collections, bundles, and promo packs are typed", () => {
  const cases = [
    ["Prerelease Kit", "kit"],
    ["Crown Zenith Mini Tin", "tin"],
    ["Charizard ex Premium Collection", "collection"],
    ["One Piece Sealed Promotional Bundle", "bundle"],
    ["Winner Pack 2026 Vol. 3", "promo_pack"],
  ];
  for (const [name, expected] of cases) {
    const result = classify(name);
    assert.equal(result.classification, "sealed_candidate", name);
    assert.equal(result.candidate_identity.package_form, expected, name);
  }
});

test("numbered card wins over promotional pack text", () => {
  const result = classify("Shakuyaku (Regional Participation Pack 2026 Vol.2)", [
    field("Number", "OP14-107"),
    field("CardType", "Character"),
    field("Rarity", "UC"),
  ]);
  assert.equal(result.classification, "nonsealed_card");
  assert.equal(result.candidate_identity.package_form, null);
});

test("MTG Case card is not classified as a shipping case", () => {
  const result = classify("Case of the Lost Witness", [
    field("Number", "62"),
    field("Rarity", "U"),
    field("SubType", "Enchantment - Case"),
  ], { category_id: 1, category_display_name: "Magic: The Gathering" });
  assert.equal(result.classification, "nonsealed_card");
});

test("display commander thick-stock card is not a deck display", () => {
  const result = classify("Miku, Song of the People (Display Commander) - Thick Stock", [
    field("Rarity", "M"),
    field("SubType", "Legendary Creature - Dryad"),
  ], { category_id: 1, category_display_name: "Magic: The Gathering" });
  assert.equal(result.classification, "nonsealed_card");
});

test("One Piece DON card without a number remains an individual card", () => {
  const result = classify("DON!! Card (Alternate Art) (Gold)", [
    field("Rarity", "DON!!"),
    field("CardType", "DON!!"),
  ], { category_id: 68, category_display_name: "One Piece Card Game" });
  assert.equal(result.classification, "nonsealed_card");
  assert.ok(result.evidence.some((entry) => entry.code === "protected_one_piece_don_card"));
});

test("special DON card pack without card fields remains a promo pack candidate", () => {
  const result = classify("Special DON!! Card Pack DP-11", [], {
    category_id: 68,
    category_display_name: "One Piece Card Game",
  });
  assert.equal(result.classification, "sealed_candidate");
  assert.equal(result.candidate_identity.package_form, "promo_pack");
});

test("an unnumbered card with multiple card fields remains a card", () => {
  const result = classify("Monkey.D.Luffy (Sealed Battle 2024 Vol. 2)", [
    field("Rarity", "L"),
    field("CardType", "Leader"),
    field("Power", "5000"),
  ], { category_id: 68, category_display_name: "One Piece Card Game" });
  assert.equal(result.classification, "nonsealed_card");
});

test("lack of a card number is never positive sealed evidence", () => {
  const result = classify("Unknown Product Without Metadata");
  assert.equal(result.classification, "ambiguous_review");
  assert.equal(result.candidate_identity.package_form, null);
  assert.equal(result.evidence.length, 0);
});

test("ambiguous pack word does not establish a manufacturer pack", () => {
  const result = classify("Mystery Pack");
  assert.equal(result.classification, "ambiguous_review");
  assert.equal(result.candidate_identity.package_form, null);
  assert.ok(result.evidence.some((entry) => entry.code === "generic_package_word"));
});

test("Pack Rat card does not become a pack", () => {
  const result = classify("Pack Rat", [
    field("Number", "73"),
    field("Rarity", "R"),
    field("SubType", "Creature - Rat"),
  ]);
  assert.equal(result.classification, "nonsealed_card");
});

test("partial word matches in Victini and Xurkitree are ignored", () => {
  for (const name of ["Victini", "Xurkitree"]) {
    const result = classify(name, [field("Number", "001"), field("CardType", "Pokemon")]);
    assert.equal(result.classification, "nonsealed_card");
    assert.equal(result.evidence.some((entry) => entry.code === "generic_package_word"), false);
  }
});

test("deck box accessory is not a sealed deck", () => {
  const result = classify("Ultra Pro Pikachu Deck Box");
  assert.equal(result.classification, "excluded_non_tcg_product");
  assert.equal(result.candidate_identity.package_form, null);
});

test("accessory-only merchandise bundle is excluded", () => {
  const result = classify("Secret Lair Fan Merch Bundle", [
    field("Description", "Contents: 1x playmat, 1x deck box, 1x deck protector sleeves."),
  ]);
  assert.equal(result.classification, "excluded_non_tcg_product");
});

test("custom and repack products require review", () => {
  for (const name of ["Custom Bundle of Cards", "Mystery Repack"]){
    const result = classify(name);
    assert.equal(result.classification, "ambiguous_review");
    assert.equal(result.requires_human_review, true);
  }
});

test("explicit quantities are retained only from source content text", () => {
  const result = classify("Storm Emeralda Booster Box", [
    field("Description", "Each sealed box contains 30 booster packs containing 5 random cards each."),
  ]);
  assert.deepEqual(
    result.candidate_identity.quantity_contents.map(({ quantity, unit }) => ({ quantity, unit })),
    [
      { quantity: 30, unit: "booster_pack" },
      { quantity: 5, unit: "card" },
    ],
  );
});

test("Japanese source category supplies explicit language and region evidence", () => {
  const result = classify("Abyss Eye Booster Box", [], {
    category_id: 85,
    category_display_name: "Pokemon Japan",
  });
  assert.deepEqual(result.candidate_identity.language_region, {
    language: "Japanese",
    region: "Japan",
    evidence: [
      {
        code: "source_category_language_region",
        field: "category",
        value: "Pokemon Japan",
        strength: "strong",
      },
    ],
  });
});

test("presale state and source mapping are evidence, not publication authority", () => {
  const result = classify("Future Set Booster Box", [], {
    product_id: 710000,
    category_id: 1,
    group_id: 900,
    source_url: "https://example.invalid/product/710000",
    presale_info: { isPresale: true, releasedOn: "2026-10-01T00:00:00" },
  });
  assert.equal(result.candidate_identity.release_presale_state.state, "presale");
  assert.equal(result.candidate_identity.exact_source_mapping.source_product_id, 710000);
  assert.equal(result.candidate_only, true);
  assert.equal(result.canonical_authority, false);
  assert.equal(result.publication_authority, false);
  assert.equal(result.card_print_write_authority, false);
});

test("read-only planner source contains an explicit transaction proof and no mutation authority", () => {
  const script = fs.readFileSync(
    new URL("../../scripts/audits/cross_tcg_sealed_catalog_readiness_v1.mjs", import.meta.url),
    "utf8",
  );
  assert.match(script, /begin transaction read only/i);
  assert.match(script, /current_setting\('transaction_read_only'\)/i);
  assert.doesNotMatch(
    script,
    /client\.query\(\s*(?:`|")\s*(insert|update|delete|truncate|alter|drop|create table|grant|revoke)\b/i,
  );
});
