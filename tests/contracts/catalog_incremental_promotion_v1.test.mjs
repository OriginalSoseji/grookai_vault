import assert from "node:assert/strict";
import test from "node:test";

import {
  buildJapaneseIncrementalSetPlanV1,
  buildJapaneseOfficialEvidenceEnrichmentV1,
  validateJapaneseIncrementalSetPlanV1,
} from "../../backend/catalog/catalog_incremental_promotion_v1.mjs";
import fs from "node:fs";

test("Japanese incremental plan requires two exact full-set authorities", () => {
  const input = {
    set: { id: "10000000-0000-0000-0000-000000000001", code: "jpn-M6", name: "Storm" },
    tcgdexSet: {
      id: "M6",
      cardCount: { official: 1, total: 2 },
      cards: [
        { id: "M6-001", localId: "001", name: "ヘラクロス" },
        { id: "M6-002", localId: "002", name: "アメタマ" },
      ],
    },
    tcgdexDetails: [
      { id: "M6-001", localId: "001", name: "ヘラクロス", category: "Pokemon", dexId: [214], rarity: "Common", regulationMark: "J" },
      { id: "M6-002", localId: "002", name: "アメタマ", category: "Pokemon", dexId: [283], rarity: "Common", regulationMark: "J" },
    ],
    bulbapediaCards: [
      { source_external_id: "storm:1", source_url: "https://example.com/storm", card_number_raw: "001/001", english_display_name: "Heracross" },
      { source_external_id: "storm:2", source_url: "https://example.com/storm", card_number_raw: "002/001", english_display_name: "Surskit" },
    ],
    officialDetails: [{ card_id: "50001", card_number_raw: "1", image_url: "https://example.com/1.png", source_url: "https://example.com/50001" }],
    limitlessCards: [{ card_number_raw: "2", image_url: "https://example.com/2.png" }],
    existingNumbers: ["1"],
    speciesRows: [
      { id: "20000000-0000-0000-0000-000000000001", national_dex_number: 214, display_name: "Heracross" },
      { id: "20000000-0000-0000-0000-000000000002", national_dex_number: 283, display_name: "Surskit" },
    ],
  };
  const plan = buildJapaneseIncrementalSetPlanV1(input);
  assert.equal(plan.counts.card_prints, 1);
  assert.equal(plan.payload.rows[0].number, "2");
  assert.equal(plan.payload.rows[0].card_print.name, "Surskit");
  assert.equal(plan.payload.rows[0].card_print.image_url, null);
  assert.equal(plan.payload.rows[0].card_print.image_status, "missing");
  assert.deepEqual(
    plan.payload.rows[0].card_print.external_ids.catalog_incremental_promotion_v1.image_candidate_urls,
    ["https://example.com/2.png"],
  );
  assert.equal(plan.payload.rows[0].evidence.length, 2);
  assert.equal(validateJapaneseIncrementalSetPlanV1(plan).valid, true);

  assert.throws(() => buildJapaneseIncrementalSetPlanV1({
    ...input,
    bulbapediaCards: input.bulbapediaCards.slice(0, 1),
  }), /Independent full-set checklist count/);
});

test("official Japanese evidence enrichment targets an existing identity only", () => {
  const row = buildJapaneseOfficialEvidenceEnrichmentV1({
    cardPrint: { id: "10000000-0000-0000-0000-000000000001", name: "Pikachu" },
    identity: {
      id: "20000000-0000-0000-0000-000000000001",
      card_print_id: "10000000-0000-0000-0000-000000000001",
      identity_domain: "pokemon_jpn",
      set_code_identity: "jpn-MP",
      printed_number: "133",
    },
    officialCard: {
      card_id: "50301",
      printed_name: "ピカチュウ",
      source_url: "https://www.pokemon-card.com/card-search/details.php/card/50301/regu/all",
    },
  });
  assert.equal(row.card_print_id, "10000000-0000-0000-0000-000000000001");
  assert.equal(row.source_key, "official_jp_cards");
  assert.equal(row.evidence_payload.source_external_id, "50301");
});

test("promotion worker decodes production image_res as jsonb", () => {
  const worker = fs.readFileSync(
    new URL("../../scripts/workers/catalog_incremental_promotion_v1.mjs", import.meta.url),
    "utf8",
  );
  assert.match(worker, /data_quality_flags jsonb,image_res jsonb/);
  assert.doesNotMatch(worker, /insert into public\.card_prints \([\s\S]{0,80}number_plain/);
  assert.match(worker, /family_reviews: setPlan\.counts\.family_reviews/);
  assert.match(worker, /card_print_family_review_queue where id=any/);
});

test("Japanese incremental plan refuses unresolved Pokemon species", () => {
  assert.throws(() => buildJapaneseIncrementalSetPlanV1({
    set: { id: "10000000-0000-0000-0000-000000000001", code: "jpn-M6", name: "Storm" },
    tcgdexSet: { id: "M6", cardCount: { official: 1, total: 1 }, cards: [{ id: "M6-001", localId: "001" }] },
    tcgdexDetails: [{ id: "M6-001", localId: "001", name: "不明", category: "Pokemon", dexId: [9999] }],
    bulbapediaCards: [{ source_external_id: "x", source_url: "https://example.com", card_number_raw: "001/001", english_display_name: "Unknown" }],
    speciesRows: [],
  }), /unresolved species/);
});
