import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildCatalogSearchAliases,
  CATALOG_GAP_STATUSES,
  JAPANESE_CARD_COVERAGE_STATUSES,
  normalizeCatalogSetCode,
  normalizeCatalogText,
  reconcileJapaneseOfficialCardCoverage,
  reconcileCatalogSets,
  summarizeCatalogReconciliation,
} from "../../backend/catalog/universal_catalog_discovery_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("catalog normalization preserves Japanese authority text and canonicalizes OP codes", () => {
  assert.equal(normalizeCatalogText("拡張パック「ストームエメラルダ」"), "拡張パック ストームエメラルダ");
  assert.equal(normalizeCatalogSetCode("one_piece", "OP-17"), "op17");
  assert.equal(normalizeCatalogSetCode("mtg", "HOB"), "hob");
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
  assert.match(worker, /counts_only_for_large_database_collections/);
  assert.doesNotMatch(
    worker,
    /writeJson\(path\.join\(options\.outDir, "database_snapshot\.json"\), database\)/,
  );
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
