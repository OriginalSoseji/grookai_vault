import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildCanonicalPromotionCandidatesV1,
  buildCatalogSearchAliases,
  buildPokemonLanguageMasterIndexReconciliationV1,
  buildPokemonMasterIndexUpdateCandidatesV1,
  CATALOG_GAP_STATUSES,
  classifyPokemonDatabaseSetScopesV1,
  JAPANESE_CARD_COVERAGE_STATUSES,
  normalizeCatalogSetCode,
  normalizeCatalogText,
  reconcileJapaneseOfficialCardCoverage,
  reconcileCatalogSets,
  summarizeCatalogReconciliation,
} from "../../backend/catalog/universal_catalog_discovery_v1.mjs";
import { deriveEnglishPokemonCanonicalAliasOverlayV1 } from
  "../../backend/catalog/english_pokemon_incremental_promotion_v1.mjs";
import {
  ENGLISH_POKEMON_FOLDED_SUBSET_OWNERS_V1,
  mergeEnglishPokemonFoldedSubsetOwnersV1,
} from "../../backend/catalog/english_pokemon_master_index_ownership_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("catalog normalization preserves Japanese authority text and canonicalizes OP codes", () => {
  assert.equal(normalizeCatalogText("拡張パック「ストームエメラルダ」"), "拡張パック ストームエメラルダ");
  assert.equal(normalizeCatalogSetCode("one_piece", "OP-17"), "op17");
  assert.equal(normalizeCatalogSetCode("mtg", "HOB"), "hob");
});

test("Pokemon sets without active identities use Master Index scope or stay preserved", () => {
  const rows = classifyPokemonDatabaseSetScopesV1({
    databaseSets: [
      { game_code: "pokemon", code: "en1", name: "English Empty", card_count: 0 },
      { game_code: "pokemon", code: "M6", name: "Japanese Empty", card_count: 0 },
      { game_code: "pokemon", code: "unknown", name: "Unresolved Empty", card_count: 0 },
      { game_code: "mtg", code: "lea", name: "Limited Edition Alpha", card_count: 0 },
    ],
    englishMasterSets: [{ key: "en1", source_aliases: {} }],
    japaneseMasterSets: [{ jpn_set_key: "jpn-m6", official_code_evidence: ["M6"] }],
  });
  assert.equal(rows[0].catalog_scope, "pokemon_en");
  assert.equal(rows[1].catalog_scope, "pokemon_ja");
  assert.equal(rows[2].catalog_scope, "pokemon_unspecified");
  assert.equal(rows[3].catalog_scope, undefined);
  assert.equal(rows.length, 4);
});

test("reconciliation distinguishes complete, missing, incomplete, and future sets", () => {
  const sourceSets = [
    { game_code: "mtg", source_id: "scryfall", source_set_id: "1", code: "hob", name: "The Hobbit", release_date: "2026-08-14", expected_card_count: 321, source_url: "https://example.com/hob" },
    { game_code: "one_piece", source_id: "bandai", source_set_id: "2", code: "OP17", name: "The World's Strongest Warriors", release_date: "2026-08-28", expected_card_count: 119, source_url: "https://example.com/op17" },
    { game_code: "pokemon", source_id: "official_jp", source_set_id: "955", code: null, name: "拡張パック「ストームエメラルダ」", release_date: "2026-07-31", expected_card_count: 73, source_url: "https://example.com/storm" },
    { game_code: "mtg", source_id: "scryfall", source_set_id: "4", code: "new", name: "Future Set", release_date: "2026-09-01", expected_card_count: 10, source_url: "https://example.com/future" },
  ];
  const databaseSets = [
    { game_code: "mtg", code: "hob", name: "The Hobbit", card_count: 321 },
    { game_code: "pokemon", code: "jpn-product-93e429bd4ffd351d", name: "拡張パック「ストームエメラルダ」", card_count: 29 },
  ];
  const rows = reconcileCatalogSets({ sourceSets, databaseSets, asOf: "2026-08-26" });
  assert.equal(rows.find((row) => row.source_code === "hob").status, CATALOG_GAP_STATUSES.EXACT_COMPLETE);
  assert.equal(rows.find((row) => row.source_code === "OP17").status, CATALOG_GAP_STATUSES.FUTURE_RELEASE);
  const storm = rows.find((row) => row.source_set_id === "955");
  assert.equal(storm.status, CATALOG_GAP_STATUSES.INCOMPLETE_CARDS);
  assert.equal(storm.missing_card_count, 44);
  assert.equal(rows.find((row) => row.source_code === "new").status, CATALOG_GAP_STATUSES.FUTURE_RELEASE);
  assert.equal(summarizeCatalogReconciliation(rows).actionable_gap_count, 1);
});

test("partial product counts cannot falsely prove a Japanese set complete", () => {
  const [row] = reconcileCatalogSets({
    sourceSets: [{
      game_code: "pokemon",
      source_id: "official_jp",
      source_set_id: "955",
      code: "M6",
      name: "Storm Emeralda",
      expected_card_count: 73,
      count_scope: "official_product_linked",
      source_url: "https://example.com/m6",
    }],
    databaseSets: [{ game_code: "pokemon", code: "M6", name: "Storm Emeralda", card_count: 73 }],
    asOf: "2026-08-26",
  });
  assert.equal(row.status, CATALOG_GAP_STATUSES.PRESENT_UNVERIFIED);
  assert.equal(row.count_scope, "official_product_linked");
});

test("exact set code wins over duplicate display-name candidates", () => {
  const [row] = reconcileCatalogSets({
    sourceSets: [{
      game_code: "pokemon",
      source_id: "tcgdex_english_set_registry",
      source_set_id: "sv03",
      code: "sv03",
      name: "Obsidian Flames",
      expected_card_count: 230,
      count_scope: "full_set",
      source_url: "https://api.tcgdex.net/v2/en/sets/sv03",
    }],
    databaseSets: [
      { game_code: "pokemon", code: "sv03", name: "Obsidian Flames", card_count: 230 },
      { game_code: "pokemon", code: "sv3", name: "Obsidian Flames", card_count: 0 },
    ],
    asOf: "2026-08-26",
  });
  assert.equal(row.database_code, "sv03");
  assert.equal(row.status, CATALOG_GAP_STATUSES.EXACT_COMPLETE);
});

test("equivalent compact set codes choose the unique count-backed canonical row", () => {
  const [row] = reconcileCatalogSets({
    sourceSets: [{
      game_code: "pokemon",
      source_id: "tcgdex_english_set_registry",
      source_set_id: "sm7.5",
      code: "sm7.5",
      name: "Dragon Majesty",
      expected_card_count: 78,
      count_scope: "full_set",
      source_url: "https://api.tcgdex.net/v2/en/sets/sm7.5",
    }],
    databaseSets: [
      { game_code: "pokemon", code: "sm7.5", name: "Dragon Majesty", card_count: 0 },
      { game_code: "pokemon", code: "sm75", name: "Dragon Majesty", card_count: 78 },
    ],
    asOf: "2026-08-26",
  });
  assert.equal(row.database_code, "sm75");
  assert.equal(row.status, CATALOG_GAP_STATUSES.EXACT_COMPLETE);
});

test("governed source-code aliases reconcile against their canonical owner", () => {
  const [row] = reconcileCatalogSets({
    sourceSets: [{
      game_code: "pokemon",
      source_id: "tcgdex_english_set_registry",
      source_set_id: "2011bw",
      code: "2011bw",
      name: "McDonald's Collection 2011",
      expected_card_count: 12,
      count_scope: "full_set",
      source_url: "https://api.tcgdex.net/v2/en/sets/2011bw",
    }],
    databaseSets: [{
      game_code: "pokemon",
      code: "mcd11",
      code_aliases: ["2011bw"],
      name: "McDonald's Collection 2011",
      card_count: 12,
    }],
    asOf: "2026-08-26",
  });
  assert.equal(row.database_code, "mcd11");
  assert.equal(row.status, CATALOG_GAP_STATUSES.EXACT_COMPLETE);
});

test("Master Index subset ownership resolves before canonical promotion", () => {
  const masterCards = [
    { set_key: "sm115", card_number: "SV1", card_name: "Scyther", status: "master_verified", source_count: 3 },
    { set_key: "sm115", card_number: "SV2", card_name: "Rowlet", status: "master_verified", source_count: 3 },
  ];
  const overlay = deriveEnglishPokemonCanonicalAliasOverlayV1({
    databaseSets: [{
      game_code: "pokemon",
      catalog_scope: "pokemon_en",
      code: "sm115",
      name: "Hidden Fates",
      card_count: 2,
    }],
    databaseCards: [
      { set_code: "sm115", number: "SV1", name: "Scyther" },
      { set_code: "sm115", number: "SV2", name: "Rowlet" },
    ],
    masterCards,
    masterSetRemaps: [{
      source_set_key: "sma",
      canonical_set_key: "sm115",
      authority: "english_master_index_folded_subset_owner_v1",
    }],
  });
  assert.equal(overlay.resolutions[0].canonical_code, "sm115");
  assert.deepEqual(overlay.sets[0].code_aliases, ["sma"]);
  const [reconciled] = reconcileCatalogSets({
    sourceSets: [{
      game_code: "pokemon",
      catalog_scope: "pokemon_en",
      source_id: "tcgdex_english_set_registry",
      source_set_id: "sma",
      code: "sma",
      name: "Hidden Fates Shiny Vault",
      expected_card_count: 2,
      count_scope: "full_set",
      source_url: "https://api.tcgdex.net/v2/en/sets/sma",
    }],
    databaseSets: overlay.sets,
    asOf: "2026-08-26",
  });
  const master = buildPokemonLanguageMasterIndexReconciliationV1({
    reconciliation: [reconciled],
    englishMasterCards: masterCards,
    englishAliasResolutions: overlay.resolutions,
  });
  assert.equal(reconciled.database_code, "sm115");
  assert.equal(master.rows[0].master_index_status, "alias_or_subset_owner_resolved");
  assert.equal(master.rows[0].promotion_decision, "no_write_existing_canonical_owner");
  assert.deepEqual(buildCanonicalPromotionCandidatesV1({
    actionableGaps: [reconciled],
    pokemonMasterIndexReconciliation: master,
  }), []);
});

test("Master Index owner contract preserves both folded English subset shells", () => {
  const owners = mergeEnglishPokemonFoldedSubsetOwnersV1();
  assert.deepEqual(owners.map((row) => [
    row.source_set_key,
    row.canonical_set_key,
  ]), [
    ["rc", "bw11"],
    ["sma", "sm115"],
  ]);
  assert.equal(ENGLISH_POKEMON_FOLDED_SUBSET_OWNERS_V1.length, 2);
});

test("new Pokemon sources stage in the Master Index before canonical writes", () => {
  const [gap] = reconcileCatalogSets({
    sourceSets: [{
      game_code: "pokemon",
      catalog_scope: "pokemon_en",
      source_id: "tcgdex_english_set_registry",
      source_set_id: "new1",
      code: "new1",
      name: "New Set",
      expected_card_count: 2,
      count_scope: "full_set",
      source_url: "https://example.com/new1",
    }],
    databaseSets: [],
    asOf: "2026-08-26",
  });
  const master = buildPokemonLanguageMasterIndexReconciliationV1({
    reconciliation: [gap],
    englishMasterCards: [],
  });
  assert.equal(master.rows[0].master_index_status, "candidate_update_required");
  assert.equal(master.rows[0].promotion_decision, "blocked_master_index_incomplete");
  assert.deepEqual(
    buildPokemonMasterIndexUpdateCandidatesV1(master).map((row) => row.source_code),
    ["new1"],
  );
  assert.deepEqual(buildCanonicalPromotionCandidatesV1({
    actionableGaps: [gap],
    pokemonMasterIndexReconciliation: master,
  }), []);
});

test("Japanese source counts cannot bypass the checked-in Japanese Master Index", () => {
  const gap = {
    game_code: "pokemon",
    catalog_scope: "pokemon ja",
    source_id: "pokemon_card_official_jp_products",
    source_set_id: "955",
    source_code: "M6",
    source_name: "Storm Emeralda",
    expected_card_count: 2,
    status: CATALOG_GAP_STATUSES.INCOMPLETE_CARDS,
    database_code: "jpn-m6",
    count_evidence: [{
      authority: "tcgdex_japanese_structured_api",
      scope: "full_set",
      count: 2,
    }],
  };
  const withoutIndex = buildPokemonLanguageMasterIndexReconciliationV1({
    reconciliation: [gap],
  });
  assert.equal(withoutIndex.rows[0].promotion_decision,
    "blocked_master_index_incomplete");

  const withIndex = buildPokemonLanguageMasterIndexReconciliationV1({
    reconciliation: [gap],
    japaneseMasterSets: [{
      jpn_set_key: "jpn-m6",
      official_code_evidence: ["M6"],
      expected_card_count_evidence: [2],
      master_admissible: true,
    }],
    japaneseMasterCards: [
      { jpn_set_key: "jpn-m6", printed_number: "1", admission_status: "master_admissible" },
      { jpn_set_key: "jpn-m6", printed_number: "2", admission_status: "master_admissible" },
    ],
  });
  assert.equal(withIndex.rows[0].master_index_status, "master_verified");
  assert.equal(withIndex.rows[0].promotion_decision, "canonical_delta_eligible");
});

test("multiple populated equivalent canonical rows remain ambiguous", () => {
  const [row] = reconcileCatalogSets({
    sourceSets: [{
      game_code: "pokemon",
      source_id: "tcgdex_english_set_registry",
      source_set_id: "x.1",
      code: "x.1",
      name: "Example",
      expected_card_count: 30,
      source_url: "https://example.com/x.1",
    }],
    databaseSets: [
      { game_code: "pokemon", code: "x.1", name: "Example", card_count: 10 },
      { game_code: "pokemon", code: "x1", name: "Example", card_count: 20 },
    ],
    asOf: "2026-08-26",
  });
  assert.equal(row.status, CATALOG_GAP_STATUSES.AMBIGUOUS_SOURCE_IDENTITY);
});

test("One Piece completeness accepts set-owned canonical parent counts", () => {
  const [row] = reconcileCatalogSets({
    sourceSets: [{
      game_code: "one_piece",
      source_id: "one_piece_official_english_cardlist",
      source_set_id: "569202",
      code: "EB02",
      name: "Anime 25th Collection",
      expected_card_count: 97,
      count_scope: "canonical_parent_rows_owned_by_set",
      source_url: "https://en.onepiece-cardgame.com/cardlist/?series=569202",
    }],
    databaseSets: [{
      game_code: "one_piece",
      code: "EB02",
      name: "Anime 25th Collection",
      card_count: 97,
    }],
    asOf: "2026-08-26",
  });
  assert.equal(row.status, CATALOG_GAP_STATUSES.EXACT_COMPLETE);
});

test("recent Japanese cards distinguish canonical coverage from official evidence", () => {
  const card = {
    card_id: "50301",
    printed_name: "ピカチュウ",
    source_set_code: "M-P",
    card_number_raw: "133",
  };
  const canonicalCards = [{
    id: "card-print-id",
    gv_id: "GV-PK-JPN-MP-133",
    name: "Pikachu",
    number: "133",
    number_plain: "133",
    set_code: "jpn-MP",
  }];
  const present = reconcileJapaneseOfficialCardCoverage({ card, canonicalCards });
  assert.equal(
    present.status,
    JAPANESE_CARD_COVERAGE_STATUSES.CANONICAL_PRESENT_OFFICIAL_EVIDENCE_MISSING,
  );
  assert.equal(present.canonical_matches[0].gv_id, "GV-PK-JPN-MP-133");
  const evidenced = reconcileJapaneseOfficialCardCoverage({
    card,
    canonicalCards,
    officialEvidenceIds: ["50301"],
  });
  assert.equal(evidenced.status, JAPANESE_CARD_COVERAGE_STATUSES.OFFICIAL_EVIDENCE_PRESENT);
});

test("Japanese official coordinates reconcile through printed set abbreviations", () => {
  const result = reconcileJapaneseOfficialCardCoverage({
    card: {
      card_id: "50412",
      printed_name: "サンダース",
      source_set_code: "MEE",
      card_number_raw: "001",
    },
    canonicalCards: [{
      id: "card-print-id",
      gv_id: "GV-PK-JPN-MEE-1",
      name: "サンダース",
      number: "1",
      number_plain: "1",
      set_code: "jpn-product-4b7ef0a0f96e6ef5",
      printed_set_abbrev: "MEE",
    }],
  });
  assert.equal(
    result.status,
    JAPANESE_CARD_COVERAGE_STATUSES.CANONICAL_PRESENT_OFFICIAL_EVIDENCE_MISSING,
  );
});

test("Pokemon set matching is language scoped even when source codes differ only by case", () => {
  const rows = reconcileCatalogSets({
    sourceSets: [
      {
        game_code: "pokemon",
        catalog_scope: "pokemon_en",
        source_id: "tcgdex_english_set_registry",
        source_set_id: "mee",
        code: "mee",
        name: "Mega Evolution Energy",
        expected_card_count: 8,
        count_scope: "full_set",
        source_url: "https://example.com/en-mee",
      },
      {
        game_code: "pokemon",
        catalog_scope: "pokemon_ja",
        source_id: "pokemon_card_official_jp_products",
        source_set_id: "958",
        code: "MEE",
        name: "スターターセットex イーブイex",
        expected_card_count: 20,
        count_scope: "numbered_base_set",
        source_url: "https://example.com/ja-mee",
      },
    ],
    databaseSets: [
      {
        game_code: "pokemon",
        catalog_scope: "pokemon_en",
        code: "mee",
        name: "Mega Evolution Energy",
        card_count: 8,
      },
      {
        game_code: "pokemon",
        catalog_scope: "pokemon_ja",
        code: "jpn-product-4b7ef0a0f96e6ef5",
        name: "スターターセットex イーブイex",
        card_count: 11,
      },
    ],
    asOf: "2026-08-26",
  });
  const english = rows.find((row) => row.catalog_scope === "pokemon en");
  const japanese = rows.find((row) => row.catalog_scope === "pokemon ja");
  assert.equal(english.database_code, "mee");
  assert.equal(english.status, CATALOG_GAP_STATUSES.EXACT_COMPLETE);
  assert.equal(japanese.database_code, "jpn-product-4b7ef0a0f96e6ef5");
  assert.equal(japanese.status, CATALOG_GAP_STATUSES.INCOMPLETE_CARDS);
  assert.equal(japanese.missing_card_count, 9);
});

test("duplicate official codes and zero-eligible source sets never become insertion candidates", () => {
  const rows = reconcileCatalogSets({
    sourceSets: [
      { game_code: "one_piece", source_id: "bandai", source_set_id: "a", code: "EB04", name: "First EB04", expected_card_count: 61, source_url: "https://example.com/a" },
      { game_code: "one_piece", source_id: "bandai", source_set_id: "b", code: "EB04", name: "Second EB04", expected_card_count: 61, source_url: "https://example.com/b" },
      { game_code: "mtg", source_id: "scryfall", source_set_id: "c", code: "fbb", name: "Foreign Black Border", expected_card_count: 0, source_url: "https://example.com/c" },
    ],
    databaseSets: [],
    asOf: "2026-08-26",
  });
  assert.equal(rows[0].status, CATALOG_GAP_STATUSES.SOURCE_NO_ELIGIBLE_CARDS);
  assert.ok(rows.filter((row) => row.status === CATALOG_GAP_STATUSES.AMBIGUOUS_SOURCE_IDENTITY).length === 2);
  assert.equal(summarizeCatalogReconciliation(rows).actionable_gap_count, 0);
});

test("search alias candidates are evidence-linked and do not create catalog facts", () => {
  const aliases = buildCatalogSearchAliases([{
    game_code: "mtg",
    source_id: "scryfall_sets_and_prints",
    source_code: "hob",
    source_name: "The Hobbit",
    source_url: "https://scryfall.com/sets/hob",
    database_code: "hob",
    database_name: "The Hobbit",
  }]);
  assert.deepEqual(aliases[0], {
    game_code: "mtg",
    alias: "hob",
    set_codes: ["hob"],
    authority: "source_reconciled_set_identity",
    source_id: "scryfall_sets_and_prints",
    source_url: "https://scryfall.com/sets/hob",
  });
  assert.ok(aliases.some((row) => row.alias === "the hobbit"));
});

test("discovery worker is structurally read-only and uses official adapters", () => {
  const worker = source("scripts/workers/universal_catalog_discovery_v1.mjs");
  assert.match(worker, /begin transaction read only/i);
  assert.doesNotMatch(worker, /\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b|\btruncate\b/i);
  assert.match(worker, /parseOnePieceOfficialSeriesOptionsV1/);
  assert.match(worker, /api\.scryfall\.com\/sets/);
  assert.match(worker, /api\.tcgdex\.net\/v2\/en\/sets/);
  assert.match(worker, /tcgdex_english_set_registry/);
  assert.match(worker, /serie\?\.id !== "tcgp"/);
  assert.match(worker, /pokemon-card\.com\/card-search\/resultAPI\.php/);
  assert.match(worker, /recent_japanese_card_gaps\.json/);
  assert.match(worker, /pokemon_master_index_reconciliation\.json/);
  assert.match(worker, /pokemon_master_index_update_candidates\.json/);
  assert.match(worker, /canonical_promotion_candidates\.json/);
  assert.match(worker, /english_master_index_set_alias_normalization_v1\.json/);
  assert.match(worker, /setOwnerRemaps/);
  assert.match(worker, /cp\.set_id = s\.id/);
  assert.match(worker, /counts_only_for_large_database_collections/);
  assert.doesNotMatch(
    worker,
    /writeJson\(path\.join\(options\.outDir, "database_snapshot\.json"\), database\)/,
  );
  const workflow = source(".github/workflows/universal-catalog-discovery.yml");
  assert.match(
    workflow,
    /node --check scripts\/audits\/verified_master_set_index_v1_build_english_master_index\.mjs/,
  );
  assert.match(workflow, /Pokemon Master Index.*Language evidence update queue/s);
});

test("English Master Index rebuild permanently folds Shiny Vault into Hidden Fates", () => {
  const builder = source(
    "scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs",
  );
  const ownership = source(
    "backend/catalog/english_pokemon_master_index_ownership_v1.mjs",
  );
  assert.match(ownership, /canonical_set_key: "sm115"/);
  assert.match(ownership, /canonical_set_key: "bw11"/);
  assert.match(builder, /sma_shiny_vault_subset_to_sm115/);
  assert.match(builder, /rc_radiant_collection_subset_to_bw11/);
  assert.match(builder, /\^SV\\d\+\$/);
});

test("cross-TCG search uses game-scoped aliases and Unicode-safe set tokens", () => {
  const sets = source("apps/web/src/lib/publicSets.shared.ts");
  const search = source("apps/web/src/lib/explore/getExploreRows.ts");
  assert.match(sets, /GAME_SCOPED_SET_ALIAS_MAP/);
  assert.match(sets, /hobbit:\s*\["hob", "hoc", "thob"\]/);
  assert.match(sets, /op17:\s*\["op17"\]/);
  assert.match(sets, /ストームエメラルダ/);
  assert.match(sets, /"wcs 2026": \["jpn-MP"\]/);
  assert.match(sets, /\[\^\\p\{L\}\\p\{N\}\\s\.-\]\+\/gu/);
  assert.match(search, /resolveGameScopedSetSearchIntent\(searchText, gameScope\)/);
  assert.match(search, /if \(inferredSetCodes\.length === 0 && searchText\)/);
  assert.match(search, /const boundedSetCodes = inferredSetCodes\.length > 0/);
  assert.match(search, /Promise\.all\(boundedSetCodes\.map/);
});
