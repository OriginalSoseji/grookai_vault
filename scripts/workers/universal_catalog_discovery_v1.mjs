import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

import {
  buildCatalogSearchAliases,
  CATALOG_GAP_STATUSES,
  reconcileCatalogSets,
  sha256,
  stableJson,
  summarizeCatalogReconciliation,
  UNIVERSAL_CATALOG_DISCOVERY_VERSION,
} from "../../backend/catalog/universal_catalog_discovery_v1.mjs";
import {
  buildOnePieceOfficialNumberAuthorityV1,
  ONE_PIECE_OFFICIAL_CARD_LIST_ROOT,
  parseOnePieceOfficialCardListHtmlV1,
  parseOnePieceOfficialSeriesOptionsV1,
} from "../../backend/pricing/one_piece_complete_official_catalog_authority_v1.mjs";
import {
  parseOfficialJapaneseCardDetail,
  parseOfficialJapaneseCardSearchPage,
} from "../audits/japanese_master_index_v4/card_source_adapters/official_jp_v1.mjs";

const USER_AGENT = "GrookaiVaultCatalogDiscovery/1.0 catalog-ops@grookai.com";
const DEFAULT_RECENT_DAYS = 180;
const DEFAULT_JP_RECENT_PAGES = 8;
const DEFAULT_MAX_DETAIL_FETCHES = 250;
const DEFAULT_JP_CARD_ID_LOOKBACK = 250;
const GAME_CODES = ["pokemon", "mtg", "one_piece"];

function clean(value) {
  return String(value ?? "").trim();
}

function parseArgs(argv) {
  const options = {
    asOf: new Date().toISOString().slice(0, 10),
    outDir: null,
    recentDays: DEFAULT_RECENT_DAYS,
    japaneseRecentPages: DEFAULT_JP_RECENT_PAGES,
    maxDetailFetches: DEFAULT_MAX_DETAIL_FETCHES,
    japaneseCardIdLookback: DEFAULT_JP_CARD_ID_LOOKBACK,
    databaseUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null,
  };
  for (const token of argv) {
    if (token.startsWith("--as-of=")) options.asOf = token.slice(8);
    else if (token.startsWith("--out-dir=")) options.outDir = token.slice(10);
    else if (token.startsWith("--recent-days=")) options.recentDays = Number(token.slice(14));
    else if (token.startsWith("--japanese-recent-pages=")) {
      options.japaneseRecentPages = Number(token.slice(24));
    } else if (token.startsWith("--max-detail-fetches=")) {
      options.maxDetailFetches = Number(token.slice(21));
    } else if (token.startsWith("--japanese-card-id-lookback=")) {
      options.japaneseCardIdLookback = Number(token.slice(28));
    } else if (token.startsWith("--db-url=")) options.databaseUrl = token.slice(9);
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.asOf)) throw new Error("Invalid --as-of");
  for (const [key, value] of Object.entries({
    recentDays: options.recentDays,
    japaneseRecentPages: options.japaneseRecentPages,
    maxDetailFetches: options.maxDetailFetches,
    japaneseCardIdLookback: options.japaneseCardIdLookback,
  })) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${key}`);
  }
  if (!options.databaseUrl) throw new Error("SUPABASE_DB_URL is required for read-only reconciliation");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  options.outDir ??= path.join(
    "docs", "audits", "universal_catalog_discovery_v1", `${stamp}_read_only`,
  );
  return options;
}

function recentDate(asOf, days) {
  const date = new Date(`${asOf}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function fetchSource(url, { responseType = "text", delayMs = 0 } = {}) {
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT, Accept: "application/json,text/html;q=0.9,*/*;q=0.8" },
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 429 && attempt < 3) {
        const retryAfterSeconds = Number(response.headers.get("retry-after") ?? 0);
        await new Promise((resolve) => setTimeout(
          resolve,
          Math.max(retryAfterSeconds * 1000, attempt * 2_500),
        ));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.text();
      return {
        request_url: url,
        final_url: response.url,
        http_status: response.status,
        fetched_at: new Date().toISOString(),
        body_sha256: sha256(body),
        byte_size: Buffer.byteLength(body),
        body: responseType === "json" ? JSON.parse(body) : body,
      };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`Source fetch failed for ${url}: ${lastError?.message ?? lastError}`);
}

function sourceMetadata(snapshot) {
  const { body, ...metadata } = snapshot;
  return metadata;
}

async function loadDatabaseSnapshot(databaseUrl) {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    application_name: "universal_catalog_discovery_v1_read_only",
  });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    const sets = await client.query(`
      select
        s.game::text as game_code,
        s.code::text as code,
        s.name::text as name,
        s.release_date::text as release_date,
        count(cp.id)::integer as card_count
      from public.sets s
      left join public.games g on g.code = s.game
      left join public.card_prints cp
        on cp.game_id = g.id
       and lower(cp.set_code) = lower(s.code)
      where s.game = any($1::text[])
      group by s.game, s.code, s.name, s.release_date
      order by s.game, s.code
    `, [GAME_CODES]);
    const japaneseEvidence = await client.query(`
      select distinct evidence_payload->>'source_external_id' as source_external_id
      from public.card_print_identity_source_evidence
      where source_key = 'official_jp_cards'
        and active
        and coalesce(evidence_payload->>'source_external_id', '') ~ '^[0-9]+$'
    `);
    await client.query("commit");
    return {
      sets: sets.rows.map((row) => ({ ...row, card_count: Number(row.card_count) })),
      official_japanese_card_ids: japaneseEvidence.rows.map((row) => row.source_external_id),
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function latestCodesByFamily(codes, count = 3) {
  const result = new Set();
  for (const prefix of ["OP", "ST", "EB", "PRB"]) {
    const matching = codes
      .filter((code) => code.startsWith(prefix))
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
    for (const code of matching.slice(0, count)) result.add(code);
  }
  return result;
}

async function discoverOnePiece(databaseSets, sourceSnapshots) {
  const root = await fetchSource(ONE_PIECE_OFFICIAL_CARD_LIST_ROOT);
  sourceSnapshots.push(sourceMetadata(root));
  const options = parseOnePieceOfficialSeriesOptionsV1(root.body);
  const databaseCodes = new Set(databaseSets
    .filter((row) => row.game_code === "one_piece")
    .map((row) => row.code.toUpperCase().replace(/[^A-Z0-9]/g, "")));
  const allCodes = [...new Set(options.flatMap((option) => option.set_codes))];
  const latestCodes = latestCodesByFamily(allCodes);
  const selectedOptions = options.filter((option) => option.set_codes.some((code) =>
    !databaseCodes.has(code) || latestCodes.has(code)));
  const records = [];
  for (const option of selectedOptions) {
    const snapshot = await fetchSource(option.url, { delayMs: 150 });
    sourceSnapshots.push(sourceMetadata(snapshot));
    records.push(...parseOnePieceOfficialCardListHtmlV1({
      html: snapshot.body,
      series: option,
      finalUrl: snapshot.final_url,
    }));
  }
  const authority = buildOnePieceOfficialNumberAuthorityV1(records);
  if (authority.conflicts.length > 0) {
    throw new Error(`One Piece official authority conflicts: ${authority.conflicts.length}`);
  }
  const countByCode = new Map();
  for (const row of authority.authorities) {
    const code = row.card_number.split("-")[0];
    countByCode.set(code, (countByCode.get(code) ?? 0) + 1);
  }
  return options.flatMap((option) => option.set_codes.map((code) => ({
    game_code: "one_piece",
    source_id: "one_piece_official_english_cardlist",
    source_set_id: option.series_id,
    code,
    name: option.label.replace(/\s*\[[^\]]+\]\s*/g, " ").replace(/\s+/g, " ").trim(),
    aliases: [option.label],
    release_date: null,
    expected_card_count: countByCode.get(code) ?? null,
    source_url: option.url,
  })));
}

function isPaperScryfallSet(set) {
  return set?.object === "set" && !set.digital && clean(set.code) && clean(set.name);
}

async function scryfallEnglishPaperCount(code, sourceSnapshots) {
  const url = new URL("https://api.scryfall.com/cards/search");
  url.searchParams.set("q", `set:${code} game:paper lang:en`);
  url.searchParams.set("unique", "prints");
  url.searchParams.set("include_extras", "true");
  const snapshot = await fetchSource(url.toString(), { responseType: "json", delayMs: 300 });
  sourceSnapshots.push(sourceMetadata(snapshot));
  return Number(snapshot.body.total_cards);
}

async function discoverMtg(databaseSets, sourceSnapshots, options) {
  const snapshot = await fetchSource("https://api.scryfall.com/sets", { responseType: "json" });
  sourceSnapshots.push(sourceMetadata(snapshot));
  const sets = (snapshot.body.data ?? []).filter(isPaperScryfallSet);
  const databaseCodes = new Set(databaseSets
    .filter((row) => row.game_code === "mtg").map((row) => row.code.toLowerCase()));
  const recentThreshold = recentDate(options.asOf, options.recentDays);
  const result = [];
  for (const set of sets) {
    const released = clean(set.released_at) || null;
    const missingFromDatabase = !databaseCodes.has(set.code.toLowerCase());
    const needsExactCount = missingFromDatabase || (released && released >= recentThreshold &&
      released <= options.asOf);
    let expected = null;
    if (needsExactCount) {
      try {
        expected = await scryfallEnglishPaperCount(set.code, sourceSnapshots);
      } catch (error) {
        if (!String(error.message).includes("HTTP 404")) throw error;
        expected = 0;
      }
    }
    result.push({
      game_code: "mtg",
      source_id: "scryfall_sets_and_prints",
      source_set_id: set.id,
      code: set.code,
      name: set.name,
      aliases: set.name === "The Hobbit" ? ["Hobbit"] : [],
      release_date: released,
      expected_card_count: expected,
      source_url: set.scryfall_uri ?? `https://scryfall.com/sets/${set.code}`,
    });
  }
  return result;
}

function officialJapaneseProductUrl(productType, page) {
  const url = new URL("https://www.pokemon-card.com/products/resultAPI.php");
  url.searchParams.set("productType", productType);
  url.searchParams.set("dateLowerY", "1996");
  url.searchParams.set("dateLowerM", "1");
  url.searchParams.set("dateLowerD", "1");
  url.searchParams.set("dateUpperY", "2099");
  url.searchParams.set("dateUpperM", "12");
  url.searchParams.set("dateUpperD", "31");
  url.searchParams.set("page", String(page));
  return url.toString();
}

function productCardListId(product) {
  return clean(product?.link_cardList).match(/[?&]pg=([^&]+)/i)?.[1] ?? null;
}

function normalizeJapaneseReleaseDate(value) {
  const match = clean(value).match(/^(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

async function fetchOfficialJapaneseProductCards(productId, sourceSnapshots) {
  const cards = [];
  let page = 1;
  let first = null;
  do {
    const url = `https://www.pokemon-card.com/card-search/resultAPI.php?mode=statuslist&pg=${encodeURIComponent(productId)}&page=${page}`;
    const snapshot = await fetchSource(url, { responseType: "json", delayMs: 150 });
    sourceSnapshots.push(sourceMetadata(snapshot));
    const parsed = parseOfficialJapaneseCardSearchPage(snapshot.body, productId, page);
    first ??= parsed;
    cards.push(...parsed.cards);
    page += 1;
  } while (page <= Number(first.max_page ?? 1));
  if (cards.length !== Number(first.hit_count)) {
    throw new Error(`Japanese product ${productId} count mismatch: ${cards.length}/${first.hit_count}`);
  }
  return { ...first, cards };
}

async function discoverJapaneseProducts(sourceSnapshots, options) {
  const threshold = recentDate(options.asOf, options.recentDays);
  const sourceSets = [];
  for (const productType of ["expansion", "construction", "others"]) {
    const snapshot = await fetchSource(officialJapaneseProductUrl(productType, 1), {
      responseType: "json",
      delayMs: 150,
    });
    sourceSnapshots.push(sourceMetadata(snapshot));
    for (const product of snapshot.body.products ?? []) {
      const productId = productCardListId(product);
      const released = normalizeJapaneseReleaseDate(product.releaseDate);
      if (!productId || (released && released < threshold)) continue;
      const cardList = await fetchOfficialJapaneseProductCards(productId, sourceSnapshots);
      sourceSets.push({
        game_code: "pokemon",
        source_id: "pokemon_card_official_jp_products",
        source_set_id: productId,
        code: null,
        name: clean(product.productTitle),
        aliases: [],
        release_date: released,
        expected_card_count: Number(cardList.hit_count),
        source_url: new URL(product.link_detailPage || product.link_cardList,
          "https://www.pokemon-card.com").toString(),
      });
    }
  }
  return sourceSets;
}

async function discoverRecentJapaneseCards(existingIds, sourceSnapshots, options) {
  const cards = new Map();
  for (let page = 1; page <= options.japaneseRecentPages; page += 1) {
    const url = `https://www.pokemon-card.com/card-search/resultAPI.php?mode=statuslist&page=${page}`;
    const snapshot = await fetchSource(url, { responseType: "json", delayMs: 150 });
    sourceSnapshots.push(sourceMetadata(snapshot));
    const parsed = parseOfficialJapaneseCardSearchPage(snapshot.body, "all", page);
    for (const card of parsed.cards) cards.set(card.card_id, card);
  }
  const existing = new Set(existingIds);
  const highestObservedId = Math.max(...[...cards.keys()].map(Number));
  const detailCandidateIds = [];
  for (
    let cardId = highestObservedId;
    cardId >= highestObservedId - options.japaneseCardIdLookback;
    cardId -= 1
  ) {
    const id = String(cardId);
    if (!existing.has(id)) detailCandidateIds.push(id);
  }
  for (const card of cards.values()) {
    if (!existing.has(card.card_id) && !detailCandidateIds.includes(card.card_id)) {
      detailCandidateIds.push(card.card_id);
    }
  }
  const detailed = [];
  for (const cardId of detailCandidateIds.slice(0, options.maxDetailFetches)) {
    const sourceUrl = `https://www.pokemon-card.com/card-search/details.php/card/${cardId}/regu/all`;
    const snapshot = await fetchSource(sourceUrl, { delayMs: 100 });
    sourceSnapshots.push(sourceMetadata(snapshot));
    try {
      const detail = parseOfficialJapaneseCardDetail(snapshot.body, cardId);
      detailed.push({
        ...(cards.get(cardId) ?? { card_id: cardId }),
        ...detail,
        source_url: sourceUrl,
        status: "missing_official_japanese_card_evidence",
      });
    } catch (error) {
      if (!String(error.message).includes("detail has no printed name")) throw error;
    }
  }
  const missing = [...cards.values()].filter((card) => !existing.has(card.card_id));
  const detectedMissingIds = new Set([
    ...missing.map((card) => card.card_id),
    ...detailed.map((card) => card.card_id),
  ]);
  return {
    scanned_card_count: cards.size,
    existing_card_count: cards.size - missing.length,
    missing_card_count: detectedMissingIds.size,
    detail_request_count: Math.min(detailCandidateIds.length, options.maxDetailFetches),
    detail_fetch_count: detailed.length,
    detail_fetch_truncated: detailCandidateIds.length > options.maxDetailFetches,
    card_id_window: {
      highest_observed_id: highestObservedId,
      lowest_probed_id: highestObservedId - options.japaneseCardIdLookback,
    },
    cards: detailed,
  };
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${stableJson(value)}\n`, "utf8");
}

async function writeReport(filePath, summary, gaps, recentJapaneseCards) {
  const lines = [
    "# Universal Catalog Discovery V1",
    "",
    `- Source sets checked: \`${summary.source_set_count}\``,
    `- Actionable set gaps: \`${summary.actionable_gap_count}\``,
    `- Recent Japanese cards scanned: \`${recentJapaneseCards.scanned_card_count}\``,
    `- Missing recent Japanese cards: \`${recentJapaneseCards.missing_card_count}\``,
    "- Database mode: `read-only transaction`",
    "",
    "## Actionable Set Gaps",
    "",
    "| Game | Status | Source set | Expected | Database | Missing |",
    "|---|---|---|---:|---:|---:|",
    ...gaps.map((row) =>
      `| ${row.game_code} | ${row.status} | ${row.source_code ?? row.source_name} | ${row.expected_card_count ?? "-"} | ${row.database_card_count ?? "-"} | ${row.missing_card_count ?? "-"} |`),
    "",
    "## Missing Recent Japanese Cards",
    "",
    "| Card ID | Name | Number | Product |",
    "|---:|---|---|---|",
    ...recentJapaneseCards.cards.map((card) =>
      `| ${card.card_id} | ${card.printed_name ?? "-"} | ${card.card_number_raw ?? "-"} | ${card.source_product_name ?? "-"} |`),
    "",
  ];
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await fs.mkdir(options.outDir, { recursive: true });
  const runPlan = {
    version: UNIVERSAL_CATALOG_DISCOVERY_VERSION,
    started_at: new Date().toISOString(),
    as_of: options.asOf,
    recent_days: options.recentDays,
    japanese_recent_pages: options.japaneseRecentPages,
    japanese_card_id_lookback: options.japaneseCardIdLookback,
    boundaries: {
      database_transaction: "read_only",
      database_writes: false,
      storage_writes: false,
      pricing_writes: false,
      publication_writes: false,
      source_authorities: ["Bandai One Piece", "Scryfall", "Pokemon Card Japan"],
    },
  };
  await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);

  const database = await loadDatabaseSnapshot(options.databaseUrl);
  const sourceSnapshots = [];
  const [onePieceSets, mtgSets, japaneseSets] = await Promise.all([
    discoverOnePiece(database.sets, sourceSnapshots),
    discoverMtg(database.sets, sourceSnapshots, options),
    discoverJapaneseProducts(sourceSnapshots, options),
  ]);
  const recentJapaneseCards = await discoverRecentJapaneseCards(
    database.official_japanese_card_ids, sourceSnapshots, options,
  );
  const sourceSets = [...onePieceSets, ...mtgSets, ...japaneseSets];
  const reconciliation = reconcileCatalogSets({
    sourceSets,
    databaseSets: database.sets,
    asOf: options.asOf,
  });
  const summary = {
    ...summarizeCatalogReconciliation(reconciliation),
    recent_japanese_cards: {
      scanned: recentJapaneseCards.scanned_card_count,
      missing: recentJapaneseCards.missing_card_count,
      detail_fetch_count: recentJapaneseCards.detail_fetch_count,
    },
    source_request_count: sourceSnapshots.length,
    completed_at: new Date().toISOString(),
  };
  const gaps = reconciliation.filter((row) => [
    CATALOG_GAP_STATUSES.MISSING_SET,
    CATALOG_GAP_STATUSES.INCOMPLETE_CARDS,
  ].includes(row.status));
  const aliases = buildCatalogSearchAliases(reconciliation);
  sourceSnapshots.sort((left, right) =>
    left.request_url.localeCompare(right.request_url) ||
    left.fetched_at.localeCompare(right.fetched_at));

  await Promise.all([
    writeJson(path.join(options.outDir, "database_snapshot.json"), database),
    writeJson(path.join(options.outDir, "source_snapshots.json"), sourceSnapshots),
    writeJson(path.join(options.outDir, "source_sets.json"), sourceSets),
    writeJson(path.join(options.outDir, "catalog_reconciliation.json"), reconciliation),
    writeJson(path.join(options.outDir, "actionable_gaps.json"), gaps),
    writeJson(path.join(options.outDir, "recent_japanese_card_gaps.json"), recentJapaneseCards),
    writeJson(path.join(options.outDir, "search_alias_candidates.json"), aliases),
    writeJson(path.join(options.outDir, "summary.json"), summary),
  ]);
  await writeReport(
    path.join(options.outDir, "UNIVERSAL_CATALOG_DISCOVERY_REPORT.md"),
    summary, gaps, recentJapaneseCards,
  );

  const artifactNames = (await fs.readdir(options.outDir)).filter((name) =>
    name !== "artifact_hashes.json").sort();
  const hashes = {};
  for (const name of artifactNames) {
    hashes[name] = sha256(await fs.readFile(path.join(options.outDir, name)));
  }
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), hashes);
  process.stdout.write(`${JSON.stringify({ output_directory: options.outDir, summary }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});
