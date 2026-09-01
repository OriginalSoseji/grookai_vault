import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildEnglishPokemonIncrementalSetPlanV1,
  deriveEnglishPokemonCanonicalAliasOverlayV1,
  validateEnglishPokemonIncrementalSetPlanV1,
} from "../../backend/catalog/english_pokemon_incremental_promotion_v1.mjs";

const SET = {
  id: "10000000-0000-0000-0000-000000000001",
  code: "wp",
  name: "W Promotional",
  printed_set_abbrev: "WP",
};
const SOURCE_SET = {
  id: "wp",
  name: "W Promotional",
  cardCount: { official: 2, total: 2 },
};
const SPECIES = [
  { id: "20000000-0000-0000-0000-000000000001", national_dex_number: 25, display_name: "Pikachu" },
  { id: "20000000-0000-0000-0000-000000000002", national_dex_number: 24, display_name: "Arbok" },
];

function masterCard(number, name) {
  return {
    key: `w promotional|${number}|${name}`,
    status: "master_verified",
    set_key: "wp",
    set_name: "W Promotional",
    card_number: number,
    card_name: name,
    rarity_values: [],
    source_count: 2,
    sources: ["bulbapedia_w_promotional_cards", "cardmarket_w_promos"],
    source_authorities: ["bulbapedia.bulbagarden.net", "cardmarket.com"],
    source_kinds: ["human_readable_checklist", "marketplace_checklist"],
    evidence_urls: ["https://bulbapedia.example/cards", "https://cardmarket.example/cards"],
  };
}

test("full Master Index admission builds evidence-backed English parent rows", () => {
  const plan = buildEnglishPokemonIncrementalSetPlanV1({
    set: SET,
    sourceSet: SOURCE_SET,
    masterCards: [masterCard("WPR JU 60", "Pikachu"), masterCard("WPR TR 19", "Dark Arbok")],
    speciesRows: SPECIES,
  });
  assert.equal(plan.counts.card_prints, 2);
  assert.equal(plan.counts.evidence, 4);
  assert.equal(plan.payload.rows[0].card_print.image_url, null);
  assert.equal(plan.payload.rows[1].family_review.normalized_family_candidate, SPECIES[1].id);
  assert.match(plan.payload.rows[0].card_print.gv_id, /^GV-PK-WP-/);
  assert.equal(validateEnglishPokemonIncrementalSetPlanV1(plan).valid, true);
});

test("existing exact coordinates are idempotent and name collisions stop", () => {
  const cards = [masterCard("WPR JU 60", "Pikachu"), masterCard("WPR TR 19", "Dark Arbok")];
  const plan = buildEnglishPokemonIncrementalSetPlanV1({
    set: SET,
    sourceSet: SOURCE_SET,
    masterCards: cards,
    existingCards: [
      { number: "WPR JU 60", number_plain: "60", name: "Pikachu" },
      { number: "WPR TR 19", name: "Dark Arbok" },
    ],
    speciesRows: SPECIES,
  });
  assert.equal(plan.counts.card_prints, 0);
  assert.throws(() => buildEnglishPokemonIncrementalSetPlanV1({
    set: SET,
    sourceSet: SOURCE_SET,
    masterCards: cards,
    existingCards: [{ number: "WPR JU 60", name: "Wrong Card" }],
    speciesRows: SPECIES,
  }), /absent from admitted Master Index|coordinate collision/);
  assert.throws(() => buildEnglishPokemonIncrementalSetPlanV1({
    set: SET,
    sourceSet: SOURCE_SET,
    masterCards: cards,
    existingCards: [{ number: "999", name: "Rogue Card" }],
    speciesRows: SPECIES,
  }), /absent from admitted Master Index/);
});

test("Trainer details resolve a non-species family", () => {
  const trainer = masterCard("1", "Professor's Research");
  const plan = buildEnglishPokemonIncrementalSetPlanV1({
    set: SET,
    sourceSet: { ...SOURCE_SET, cardCount: { total: 1 } },
    masterCards: [trainer],
    speciesRows: SPECIES,
    tcgdexDetails: [{
      localId: "1",
      name: "Professor's Research",
      category: "Trainer",
      trainerType: "Supporter",
    }],
  });
  assert.equal(plan.payload.rows[0].identity.identity_payload.card_domain, "trainer");
  assert.equal(plan.payload.rows[0].identity.identity_payload.card_type, "supporter");
});

test("Energy identity remains resolvable from an exact printed name without live detail", () => {
  const energy = masterCard("1", "Lightning Energy");
  const plan = buildEnglishPokemonIncrementalSetPlanV1({
    set: SET,
    sourceSet: { ...SOURCE_SET, cardCount: { total: 1 } },
    masterCards: [energy],
    speciesRows: SPECIES,
    tcgdexDetails: [],
  });
  assert.equal(plan.payload.rows[0].identity.identity_payload.card_domain, "energy");
  assert.equal(plan.payload.rows[0].identity.identity_payload.card_type, "lightning");
  assert.equal(plan.payload.rows[0].family_review.family_link_promotion_allowed, false);
});

test("partial or single-source Master Index evidence never admits a payload", () => {
  assert.throws(() => buildEnglishPokemonIncrementalSetPlanV1({
    set: SET,
    sourceSet: SOURCE_SET,
    masterCards: [masterCard("WPR JU 60", "Pikachu")],
    speciesRows: SPECIES,
  }), /full-set admission failed/);
  const weak = masterCard("WPR JU 60", "Pikachu");
  weak.source_count = 1;
  weak.sources = weak.sources.slice(0, 1);
  weak.evidence_urls = weak.evidence_urls.slice(0, 1);
  assert.throws(() => buildEnglishPokemonIncrementalSetPlanV1({
    set: SET,
    sourceSet: { ...SOURCE_SET, cardCount: { total: 1 } },
    masterCards: [weak],
    speciesRows: SPECIES,
  }), /lacks two sources/);
});

test("empty source aliases resolve to one exact canonical owner without moving cards", () => {
  const overlay = deriveEnglishPokemonCanonicalAliasOverlayV1({
    databaseSets: [
      { game_code: "pokemon", code: "2011bw", name: "Alias", card_count: 0 },
      { game_code: "pokemon", code: "mcd11", name: "Canonical", card_count: 2 },
    ],
    databaseCards: [
      { set_code: "mcd11", number: "1", name: "Snivy" },
      { set_code: "mcd11", number: "2", name: "Tepig" },
    ],
    masterCards: [
      { ...masterCard("1", "Snivy"), set_key: "2011bw" },
      { ...masterCard("2", "Tepig"), set_key: "2011bw" },
    ],
  });
  assert.equal(overlay.sets.length, 1);
  assert.deepEqual(overlay.sets[0].code_aliases, ["2011bw"]);
  assert.equal(overlay.resolutions[0].canonical_code, "mcd11");
});

test("persisted folded subset ownership survives canonicalized Master Index cards", () => {
  const overlay = deriveEnglishPokemonCanonicalAliasOverlayV1({
    databaseSets: [{
      game_code: "pokemon",
      catalog_scope: "pokemon_en",
      code: "sm115",
      name: "Hidden Fates",
      card_count: 163,
    }],
    databaseCards: [{
      set_code: "sm115",
      number: "SV1",
      name: "Scyther",
    }],
    masterCards: [{
      set_key: "sm115",
      card_number: "SV1",
      card_name: "Scyther",
      status: "master_verified",
    }],
    masterSetRemaps: [{
      source_set_key: "sma",
      canonical_set_key: "sm115",
      authority: "english_master_index_folded_subset_owner_v1",
    }],
  });

  assert.deepEqual(overlay.resolutions, [{
    source_code: "sma",
    canonical_code: "sm115",
    evidence_card_count: null,
    evidence_row_count: null,
    authority: "english_master_index_folded_subset_owner_v1",
  }]);
  assert.deepEqual(overlay.sets[0].code_aliases, ["sma"]);
});

test("worker source enforces rollback and forbidden-write boundaries", () => {
  const worker = fs.readFileSync(
    new URL("../../scripts/workers/english_pokemon_incremental_promotion_v1.mjs", import.meta.url),
    "utf8",
  );
  assert.match(worker, /Apply requires --expected-head-sha/);
  assert.match(worker, /Apply requires --expected-payload-fingerprint/);
  assert.match(worker, /Apply with a scoped Master Index package requires --expected-master-package-fingerprint/);
  assert.match(worker, /Apply with a frozen source set requires --expected-source-snapshot-fingerprint/);
  assert.match(worker, /Apply may skip card detail fetch only with a frozen source set/);
  assert.match(worker, /ENGLISH_POKEMON_INCREMENTAL_APPLY_APPROVAL/);
  assert.match(worker, /Exact approval missing/);
  assert.match(worker, /fetchMissingTcgdexDetails/);
  assert.match(worker, /--source-set-file=/);
  assert.match(worker, /frozen_local_https_snapshot/);
  assert.match(worker, /await client\.query\("rollback"\)/);
  assert.match(worker, /rollback_absence_readback/);
  assert.doesNotMatch(worker, /insert into public\.card_printings/);
  assert.doesNotMatch(worker, /insert into public\.external_mappings/);
  assert.doesNotMatch(worker, /insert into public\.vault_items/);
});
