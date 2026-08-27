import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { Client } from "pg";

import {
  buildCanonicalPromotionCandidatesV1,
  buildCatalogSearchAliases,
  buildPokemonLanguageMasterIndexReconciliationV1,
  buildPokemonMasterIndexUpdateCandidatesV1,
  catalogSetScope,
  CATALOG_GAP_STATUSES,
  classifyPokemonDatabaseSetScopesV1,
  JAPANESE_CARD_COVERAGE_STATUSES,
  normalizeCatalogText,
  reconcileJapaneseOfficialCardCoverage,
  reconcileCatalogSets,
  sha256,
  stableJson,
  summarizeCatalogReconciliation,
  UNIVERSAL_CATALOG_DISCOVERY_VERSION,
} from "../../backend/catalog/universal_catalog_discovery_v1.mjs";
import { classifyOnePieceSourceProductV1 } from
  "../../backend/pricing/one_piece_canonical_catalog_candidate_v1.mjs";
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
import { parseLimitlessJapaneseCardChecklist } from
  "../audits/japanese_master_index_v4/card_source_adapters/limitless_jp_v1.mjs";
import { parseBulbapediaJapaneseCardList } from
  "../audits/japanese_master_index_v4/card_source_adapters/bulbapedia_jp_v1.mjs";
import { parseTcgdexJapaneseSetPayload } from
  "../audits/japanese_master_index_v4/card_source_adapters/tcgdex_ja_v1.mjs";
import { readVerifiedArtifact } from
  "../audits/japanese_master_index_v4/artifact_rows_v1.mjs";
import { contentFingerprint } from
  "../audits/japanese_master_index_v4/deterministic_artifact_v1.mjs";
import { deriveEnglishPokemonCanonicalAliasOverlayV1 } from
  "../../backend/catalog/english_pokemon_incremental_promotion_v1.mjs";
import { mergeEnglishPokemonFoldedSubsetOwnersV1 } from
  "../../backend/catalog/english_pokemon_master_index_ownership_v1.mjs";
import { mergeJapaneseMasterIndexIncrementalOverlayV1 } from
  "../../backend/catalog/japanese_pokemon_master_index_incremental_v1.mjs";
import {
  buildPokemonLanguageCandidateIndexReconciliationV1,
  POKEMON_LANGUAGE_MASTER_INDEX_VERSION,
  pokemonLanguageFingerprint,
} from "../../backend/catalog/pokemon_language_master_index_v1.mjs";

const USER_AGENT = "GrookaiVaultCatalogDiscovery/1.0 catalog-ops@grookai.com";
const DEFAULT_RECENT_DAYS = 180;
const DEFAULT_JP_RECENT_PAGES = 8;
const DEFAULT_MAX_DETAIL_FETCHES = 250;
const DEFAULT_JP_CARD_ID_LOOKBACK = 250;
const GAME_CODES = ["pokemon", "mtg", "one_piece"];
const ENGLISH_MASTER_INDEX_DIR = path.join(
  "docs", "audits", "verified_master_set_index_v1", "english_master_index_v1",
);
const JAPANESE_MASTER_INDEX_DIR = path.join(
  "docs", "audits", "japanese_master_index_v4", "final",
);
const JAPANESE_INCREMENTAL_OVERLAY_PATH = path.join(
  "docs",
  "audits",
  "pokemon_language_master_index_v1",
  "ja",
  "japanese_incremental_admitted_v1.json",
);
const POKEMON_LANGUAGE_CANDIDATE_DIR = path.join(
  "docs",
  "audits",
  "pokemon_language_master_index_v1",
  "candidates",
);

async function loadPokemonLanguageCandidateRegistry(candidateDir) {
  const registryPath = path.join(candidateDir, "language_registry_v1.json");
  try {
    const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
    if (registry.version !== POKEMON_LANGUAGE_MASTER_INDEX_VERSION ||
        registry.canonical_authority !== false) {
      throw new Error("Pokemon language candidate registry authority mismatch.");
    }
    return registry;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return {
      version: POKEMON_LANGUAGE_MASTER_INDEX_VERSION,
      policy: "all_source_rows_enter_language_index_before_canonical_reconciliation",
      canonical_authority: false,
      languages: [],
    };
  }
}

async function loadPokemonLanguageCandidateSnapshot(candidateDir, language) {
  const languageDir = path.join(candidateDir, language);
  try {
    const manifest = JSON.parse(await fs.readFile(
      path.join(languageDir, "manifest.json"),
      "utf8",
    ));
    const [setsBytes, cardsBytes] = await Promise.all([
      fs.readFile(path.join(languageDir, "sets.json.gz")),
      fs.readFile(path.join(languageDir, "cards.json.gz")),
    ]);
    const sets = JSON.parse(zlib.gunzipSync(setsBytes).toString("utf8"));
    const cards = JSON.parse(zlib.gunzipSync(cardsBytes).toString("utf8"));
    if (manifest.version !== POKEMON_LANGUAGE_MASTER_INDEX_VERSION ||
        manifest.language !== language || manifest.canonical_authority !== false ||
        pokemonLanguageFingerprint(sets) !== manifest.sets_fingerprint_sha256 ||
        pokemonLanguageFingerprint(cards) !== manifest.cards_fingerprint_sha256) {
      throw new Error(`Pokemon language candidate snapshot mismatch for ${language}.`);
    }
    return { manifest, sets, cards };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return null;
  }
}

async function loadVerifiedJapaneseMasterIndexDataset(descriptorName, expectedKey) {
  const descriptorPath = path.join(JAPANESE_MASTER_INDEX_DIR, descriptorName);
  const { artifact: descriptorArtifact } = await readVerifiedArtifact(descriptorPath);
  const descriptor = descriptorArtifact.content?.dataset;
  if (descriptor?.dataset_key !== expectedKey) {
    throw new Error(`Japanese Master Index descriptor mismatch: ${expectedKey}`);
  }
  const rows = [];
  for (let index = 0; index < descriptor.shard_paths.length; index += 1) {
    const { artifact: shard } = await readVerifiedArtifact(descriptor.shard_paths[index]);
    if (shard.content?.dataset_key !== expectedKey ||
        shard.content?.shard_index !== index + 1 ||
        shard.content?.shard_count !== descriptor.shard_count ||
        shard.content?.row_count !== shard.content?.rows?.length) {
      throw new Error(`Japanese Master Index shard mismatch: ${expectedKey}`);
    }
    rows.push(...shard.content.rows);
  }
  if (rows.length !== descriptor.row_count ||
      contentFingerprint(rows) !== descriptor.content_fingerprint_sha256) {
    throw new Error(`Japanese Master Index dataset fingerprint mismatch: ${expectedKey}`);
  }
  return { rows, fingerprint: descriptor.content_fingerprint_sha256 };
}

async function loadJapaneseMasterIndex() {
  const [sets, cards] = await Promise.all([
    loadVerifiedJapaneseMasterIndexDataset(
      "jpn_master_admissible_sets_v1.json",
      "master_admissible_set_rows_v1",
    ),
    loadVerifiedJapaneseMasterIndexDataset(
      "jpn_master_admissible_cards_v1.json",
      "master_admissible_card_rows_v1",
    ),
  ]);
  let overlay = null;
  try {
    overlay = JSON.parse(await fs.readFile(JAPANESE_INCREMENTAL_OVERLAY_PATH, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const merged = mergeJapaneseMasterIndexIncrementalOverlayV1({
    baseSets: sets.rows,
    baseCards: cards.rows,
    overlay,
  });
  return {
    sets: merged.sets,
    cards: merged.cards,
    setFingerprint: sets.fingerprint,
    cardFingerprint: cards.fingerprint,
    incrementalOverlayFingerprint: overlay
      ? contentFingerprint({ sets: overlay.sets, cards: overlay.cards })
      : null,
  };
}

function clean(value) {
  return String(value ?? "").trim();
}

function compactSetCode(value) {
  return clean(value).toLocaleLowerCase("und").replace(/[^a-z0-9]+/g, "");
}

async function mapPool(values, concurrency, task) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function parseArgs(argv) {
  const options = {
    asOf: new Date().toISOString().slice(0, 10),
    outDir: null,
    recentDays: DEFAULT_RECENT_DAYS,
    japaneseRecentPages: DEFAULT_JP_RECENT_PAGES,
    maxDetailFetches: DEFAULT_MAX_DETAIL_FETCHES,
    japaneseCardIdLookback: DEFAULT_JP_CARD_ID_LOOKBACK,
    pokemonLanguageCandidateDir: POKEMON_LANGUAGE_CANDIDATE_DIR,
    sourceOnly: false,
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
    } else if (token.startsWith("--pokemon-language-candidate-dir=")) {
      options.pokemonLanguageCandidateDir = token.slice(33);
    } else if (token === "--source-only") options.sourceOnly = true;
    else if (token.startsWith("--db-url=")) options.databaseUrl = token.slice(9);
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
  if (!options.sourceOnly && !options.databaseUrl) {
    throw new Error("SUPABASE_DB_URL is required for read-only reconciliation");
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  options.outDir ??= path.join(
    "docs", "audits", "universal_catalog_discovery_v1", `${stamp}_read_only`,
  );
  return options;
}

function emptyDatabaseSnapshot() {
  return {
    sets: [],
    official_japanese_card_ids: [],
    japanese_canonical_cards: [],
    english_canonical_cards: [],
    one_piece_warehouse_products: [],
  };
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
  const cause = String(lastError?.message ?? lastError);
  const unavailable = /fetch failed|timed? ?out|timeout|HTTP (?:429|5\d\d)/i.test(cause);
  throw new Error(
    `[${unavailable ? "SOURCE_UNAVAILABLE" : "SOURCE_INTEGRITY_FAILURE"}] ` +
    `Source fetch failed for ${url}: ${cause}`,
  );
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
    options: "-c default_transaction_read_only=on",
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
        count(distinct cp.id)::integer as card_count,
        array_remove(array_agg(distinct identity.identity_domain), null)::text[]
          as identity_domains
      from public.sets s
      left join public.card_prints cp
        on cp.set_id = s.id
      left join public.card_print_identity identity
        on identity.card_print_id = cp.id
       and identity.is_active
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
    const japaneseCanonicalCards = await client.query(`
      select
        cp.id::text,
        cp.gv_id::text,
        cp.name::text,
        cp.number::text,
        cp.number_plain::text,
        cp.set_code::text,
        cp.printed_set_abbrev::text
      from public.card_prints cp
      join public.card_print_identity identity
        on identity.card_print_id = cp.id
       and identity.is_active
       and identity.identity_domain = 'pokemon_jpn'
      order by cp.set_code, cp.number_plain, cp.id
    `);
    const englishCanonicalCards = await client.query(`
      select distinct
        s.code::text as set_code,
        cp.name::text,
        cp.number::text,
        cp.number_plain::text
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      join public.card_print_identity identity
        on identity.card_print_id = cp.id
       and identity.is_active
       and identity.identity_domain = 'pokemon_eng_standard'
      order by s.code, cp.number_plain, cp.number, cp.name
    `);
    const onePieceWarehouse = await client.query(`
      select
        source_group.group_id,
        source_group.name as group_name,
        source_group.abbreviation,
        source_group.published_on,
        product.product_id,
        product.category_id,
        product.name,
        product.presale_info,
        product.extended_data,
        product.source_active
      from public.tcgcsv_source_groups source_group
      join public.tcgcsv_source_products product
        on product.category_id = source_group.category_id
       and product.group_id = source_group.group_id
      where source_group.category_id = 68
        and source_group.source_active
        and product.source_active
      order by source_group.group_id, product.product_id
    `);
    await client.query("commit");
    return {
      sets: sets.rows.map((row) => {
        const base = { ...row, card_count: Number(row.card_count) };
        return { ...base, catalog_scope: catalogSetScope(base) };
      }),
      official_japanese_card_ids: japaneseEvidence.rows.map((row) => row.source_external_id),
      japanese_canonical_cards: japaneseCanonicalCards.rows,
      english_canonical_cards: englishCanonicalCards.rows,
      one_piece_warehouse_products: onePieceWarehouse.rows,
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

async function discoverOnePiece(databaseSets, warehouseProducts, sourceSnapshots, options) {
  const root = await fetchSource(ONE_PIECE_OFFICIAL_CARD_LIST_ROOT);
  sourceSnapshots.push(sourceMetadata(root));
  const sourceOptions = parseOnePieceOfficialSeriesOptionsV1(root.body);
  const databaseCodes = new Set(databaseSets
    .filter((row) => row.game_code === "one_piece")
    .map((row) => row.code.toUpperCase().replace(/[^A-Z0-9]/g, "")));
  const allCodes = [...new Set(sourceOptions.flatMap((option) => option.set_codes))];
  const latestCodes = latestCodesByFamily(allCodes);
  const selectedOptions = sourceOptions.filter((option) => option.set_codes.some((code) =>
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
  const warehouseByCode = new Map();
  for (const product of warehouseProducts ?? []) {
    const code = clean(product.abbreviation).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code || !/^(?:OP|ST|EB|PRB)\d{2}$/.test(code)) continue;
    const classified = classifyOnePieceSourceProductV1(product, { asOfDate: options.asOf });
    const entry = warehouseByCode.get(code) ?? {
      numbered: 0,
      own_numbered: 0,
      cross_set_numbered: 0,
      don: 0,
      sealed: 0,
      quarantined: 0,
      group_ids: new Set(),
      published_on: clean(product.published_on).slice(0, 10) || null,
    };
    entry.group_ids.add(Number(product.group_id));
    if (classified.classification === "exact_single_card_candidate") {
      if (classified.single_card_kind === "numbered_card") {
        entry.numbered += 1;
        const printedSetCode = clean(classified.card_evidence?.number)
          .toUpperCase().match(/^((?:OP|ST|EB|PRB)\d{2})-/)?.[1] ?? null;
        if (printedSetCode === code) entry.own_numbered += 1;
        else entry.cross_set_numbered += 1;
      }
      else if (classified.single_card_kind === "don_card") entry.don += 1;
    } else if (classified.classification === "sealed_product_candidate") entry.sealed += 1;
    else entry.quarantined += 1;
    warehouseByCode.set(code, entry);
  }
  return sourceOptions.flatMap((option) => option.set_codes.map((code) => ({
    ...(() => {
      const warehouse = warehouseByCode.get(code);
      return {
        release_date: warehouse?.published_on ?? null,
        expected_card_count: warehouse?.own_numbered ?? countByCode.get(code) ?? null,
        count_scope: warehouse ? "canonical_parent_rows_owned_by_set" : "official_base_card_numbers",
        count_evidence: [
          {
            authority: "bandai_official_card_list",
            scope: "official_base_card_numbers",
            count: countByCode.get(code) ?? null,
          },
          ...(warehouse ? [{
            authority: "tcgcsv_tcgplayer_product_warehouse",
            scope: "canonical_parent_rows_owned_by_set",
            owned_numbered_count: warehouse.own_numbered,
            all_numbered_products_in_group: warehouse.numbered,
            cross_set_numbered_count: warehouse.cross_set_numbered,
            don_count: warehouse.don,
            sealed_count: warehouse.sealed,
            quarantined_count: warehouse.quarantined,
            source_group_ids: [...warehouse.group_ids].sort((left, right) => left - right),
          }] : []),
        ],
      };
    })(),
    game_code: "one_piece",
    source_id: "one_piece_official_english_cardlist",
    source_set_id: option.series_id,
    code,
    name: option.label.replace(/\s*\[[^\]]+\]\s*/g, " ").replace(/\s+/g, " ").trim(),
    aliases: [option.label],
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

async function discoverPokemonEnglish(
  databaseSets,
  sourceSnapshots,
  options,
  englishMasterIndex,
) {
  const registryUrl = "https://api.tcgdex.net/v2/en/sets";
  const registrySnapshot = await fetchSource(registryUrl, { responseType: "json" });
  sourceSnapshots.push(sourceMetadata(registrySnapshot));
  const registry = Array.isArray(registrySnapshot.body) ? registrySnapshot.body : [];
  const databaseEnglish = databaseSets.filter((row) =>
    row.game_code === "pokemon" && catalogSetScope(row) === "pokemon en");
  const databaseByCode = new Map();
  for (const row of databaseEnglish) {
    for (const code of [row.code, ...(row.code_aliases ?? [])]) {
      databaseByCode.set(compactSetCode(code), row);
    }
  }
  const databaseByName = new Map(databaseEnglish.map((row) => [normalizeCatalogText(row.name), row]));
  const matchedDatabaseSet = (set) => databaseByCode.get(compactSetCode(set.id)) ??
    databaseByName.get(normalizeCatalogText(set.name)) ?? null;
  const latestIds = new Set(registry.slice(-30).map((set) => clean(set.id)));
  const detailCandidates = registry.filter((set) =>
    !matchedDatabaseSet(set) || latestIds.has(clean(set.id)));
  if (detailCandidates.length > options.maxDetailFetches) {
    throw new Error(
      `English Pokemon detail fetch exceeds safety cap: ${detailCandidates.length}/` +
      `${options.maxDetailFetches}`,
    );
  }
  const details = await mapPool(detailCandidates, 6, async (set) => {
    const url = `https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(set.id)}`;
    const snapshot = await fetchSource(url, { responseType: "json", delayMs: 80 });
    sourceSnapshots.push(sourceMetadata(snapshot));
    return [clean(set.id), snapshot.body];
  });
  const detailsById = new Map(details);
  return registry.filter((set) =>
    detailsById.get(clean(set.id))?.serie?.id !== "tcgp").map((set) => {
    const database = matchedDatabaseSet(set);
    const detail = detailsById.get(clean(set.id));
    const expected = Number(detail?.cardCount?.total ?? set?.cardCount?.total);
    const validCount = Number.isSafeInteger(expected) && expected >= 0 ? expected : null;
    const masterCards = englishMasterIndex.cardsBySet.get(clean(set.id)) ?? [];
    const masterIndexComplete = validCount !== null && masterCards.length === validCount &&
      masterCards.every((card) => card.status === "master_verified" &&
        Number(card.source_count) >= 2);
    return {
      game_code: "pokemon",
      catalog_scope: "pokemon_en",
      source_id: "tcgdex_english_set_registry",
      source_set_id: clean(set.id),
      code: clean(set.id),
      name: clean(set.name),
      aliases: [clean(set.name)],
      release_date: clean(detail?.releaseDate ?? database?.release_date) || null,
      expected_card_count: validCount,
      count_scope: "full_set",
      count_evidence: [{
        authority: "tcgdex_english_structured_api",
        scope: "full_set",
        count: validCount,
        source_url: detail
          ? `https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(set.id)}`
          : registryUrl,
      }, ...(masterIndexComplete ? [{
        authority: "english_master_index_completion_v1",
        scope: "full_set",
        count: masterCards.length,
        source_count_floor: Math.min(...masterCards.map((card) => Number(card.source_count))),
        artifact_sha256: englishMasterIndex.cardsSha256,
      }] : [])],
      source_url: `https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(set.id)}`,
    };
  });
}

async function loadEnglishMasterIndex() {
  const cardsFile = path.join(ENGLISH_MASTER_INDEX_DIR, "english_master_index_cards_v1.json");
  const setsFile = path.join(ENGLISH_MASTER_INDEX_DIR, "english_master_index_sets_v1.json");
  const aliasesFile = path.join(
    ENGLISH_MASTER_INDEX_DIR,
    "english_master_index_set_alias_normalization_v1.json",
  );
  const [bytes, setsBytes, aliasesBytes] = await Promise.all([
    fs.readFile(cardsFile),
    fs.readFile(setsFile),
    fs.readFile(aliasesFile),
  ]);
  const cards = JSON.parse(bytes).cards ?? [];
  const sets = JSON.parse(setsBytes).sets ?? [];
  const setOwnerRemaps = mergeEnglishPokemonFoldedSubsetOwnersV1(
    JSON.parse(aliasesBytes).folded_subset_owners ?? [],
  );
  const cardsBySet = new Map();
  for (const card of cards) {
    const rows = cardsBySet.get(clean(card.set_key)) ?? [];
    rows.push(card);
    cardsBySet.set(clean(card.set_key), rows);
  }
  return {
    sets,
    cards,
    cardsBySet,
    setOwnerRemaps,
    cardsSha256: sha256(bytes),
    aliasesSha256: sha256(aliasesBytes),
  };
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

async function discoverJapaneseProducts(sourceSnapshots, options, japaneseCandidateSnapshot) {
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
      let sourceSetCode = null;
      if (cardList.cards[0]?.card_id) {
        const detailUrl = `https://www.pokemon-card.com/card-search/details.php/card/${cardList.cards[0].card_id}/regu/all`;
        const detailSnapshot = await fetchSource(detailUrl, { delayMs: 100 });
        sourceSnapshots.push(sourceMetadata(detailSnapshot));
        sourceSetCode = parseOfficialJapaneseCardDetail(
          detailSnapshot.body,
          cardList.cards[0].card_id,
        ).source_set_code;
      }
      let checklist = null;
      let fullChecklist = null;
      let tcgdexSet = null;
      if (sourceSetCode) {
        const tcgdexUrl = `https://api.tcgdex.net/v2/ja/sets/${encodeURIComponent(sourceSetCode)}`;
        const candidateSet = japaneseCandidateSnapshot?.sets.find((row) =>
          clean(row.source_set_id).toLocaleLowerCase("und") ===
            clean(sourceSetCode).toLocaleLowerCase("und") &&
          row.source_presence === "observed"
        );
        const candidateCards = japaneseCandidateSnapshot?.cards.filter((row) =>
          clean(row.source_set_id).toLocaleLowerCase("und") ===
            clean(sourceSetCode).toLocaleLowerCase("und") &&
          row.source_presence === "observed"
        ) ?? [];
        const candidatePayload = candidateSet && candidateCards.length > 0
          ? {
              id: candidateSet.source_set_id,
              name: candidateSet.source_set_name,
              cardCount: {
                official: candidateSet.source_official_card_count,
                total: candidateSet.source_total_card_count,
              },
              cards: candidateCards.map((card) => ({
                id: card.source_card_id,
                localId: card.printed_number,
                name: card.printed_name,
                image: card.source_image_reference,
              })),
            }
          : null;
        if (options.sourceOnly && candidatePayload) {
          tcgdexSet = parseTcgdexJapaneseSetPayload(
            JSON.stringify(candidatePayload),
            sourceSetCode,
          );
        } else try {
          const tcgdexSnapshot = await fetchSource(tcgdexUrl, {
            responseType: "json",
            delayMs: 200,
          });
          sourceSnapshots.push(sourceMetadata(tcgdexSnapshot));
          tcgdexSet = parseTcgdexJapaneseSetPayload(
            JSON.stringify(tcgdexSnapshot.body),
            sourceSetCode,
          );
        } catch (error) {
          if (candidatePayload) {
            tcgdexSet = parseTcgdexJapaneseSetPayload(
              JSON.stringify(candidatePayload),
              sourceSetCode,
            );
          } else if (!/HTTP 404|fetch failed|timeout/i.test(String(error.message))) {
            throw error;
          }
        }
        const checklistUrl = `https://limitlesstcg.com/cards/jp/${encodeURIComponent(sourceSetCode)}?show=all`;
        try {
          const checklistSnapshot = await fetchSource(checklistUrl, { delayMs: 200 });
          sourceSnapshots.push(sourceMetadata(checklistSnapshot));
          checklist = parseLimitlessJapaneseCardChecklist(
            checklistSnapshot.body,
            sourceSetCode,
          );
          const articleName = clean(checklist.set.name)
            .replace(/[^\p{L}\p{N}]+/gu, "_")
            .replace(/^_+|_+$/g, "");
          if (articleName) {
            const articleUrl = `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(articleName)}_(TCG)`;
            try {
              const articleSnapshot = await fetchSource(articleUrl, { delayMs: 250 });
              sourceSnapshots.push(sourceMetadata(articleSnapshot));
              fullChecklist = parseBulbapediaJapaneseCardList(articleSnapshot.body, {
                source_container_id: `${articleName}_(TCG)`,
                source_container_url: articleUrl,
                source_expected_card_count: checklist.set.card_count,
                source_native_name: checklist.set.name,
                source_native_japanese_name: clean(product.productTitle),
                source_native_code: sourceSetCode,
                source_release_date: released,
              });
            } catch (error) {
              if (!/HTTP 404|yielded no proven Japanese card-list rows/i.test(String(error.message))) {
                throw error;
              }
            }
          }
        } catch (error) {
          if (!/HTTP 404|yielded zero card rows|set mismatch/i.test(String(error.message))) {
            throw error;
          }
        }
      }
      const baseChecklistCount = checklist?.cards?.length ?? null;
      const tcgdexFullCount = tcgdexSet?.cards?.length ?? null;
      const bulbapediaFullCount = fullChecklist?.cards?.length ?? null;
      if (tcgdexFullCount !== null && bulbapediaFullCount !== null &&
          tcgdexFullCount !== bulbapediaFullCount) {
        throw new Error(
          `Japanese set ${sourceSetCode} full-checklist disagreement: ` +
          `TCGdex=${tcgdexFullCount}, Bulbapedia=${bulbapediaFullCount}`,
        );
      }
      const fullChecklistCount = tcgdexFullCount ?? bulbapediaFullCount;
      sourceSets.push({
        game_code: "pokemon",
        catalog_scope: "pokemon_ja",
        source_id: "pokemon_card_official_jp_products",
        source_set_id: productId,
        code: sourceSetCode,
        name: clean(product.productTitle),
        aliases: [sourceSetCode, checklist?.set?.name].filter(Boolean),
        release_date: released,
        expected_card_count:
          fullChecklistCount ?? baseChecklistCount ?? Number(cardList.hit_count),
        count_scope: fullChecklistCount !== null
          ? "full_set"
          : baseChecklistCount !== null
            ? "numbered_base_set"
            : "official_product_linked",
        count_evidence: [
          {
            authority: "pokemon_card_official_jp_product",
            scope: "official_product_linked",
            count: Number(cardList.hit_count),
          },
          ...(baseChecklistCount !== null ? [{
            authority: "limitless_jp_structured_checklist",
            scope: "numbered_base_set",
            count: baseChecklistCount,
            source_url: `https://limitlesstcg.com/cards/jp/${encodeURIComponent(sourceSetCode)}?show=all`,
          }] : []),
          ...(tcgdexFullCount !== null ? [{
            authority: "tcgdex_japanese_structured_api",
            scope: "full_set",
            count: tcgdexFullCount,
            source_url: `https://api.tcgdex.net/v2/ja/sets/${encodeURIComponent(sourceSetCode)}`,
          }] : []),
          ...(bulbapediaFullCount !== null ? [{
            authority: "bulbapedia_modern_japanese_set_list",
            scope: "full_set",
            count: bulbapediaFullCount,
            source_url: fullChecklist.cards[0]?.source_url ?? null,
          }] : []),
        ],
        tcgdex_cards: (tcgdexSet?.cards ?? []).map((card) => ({
          source_external_id: clean(card.id),
          card_number_raw: clean(card.localId),
          printed_name_ja: clean(card.name),
          image_url: clean(card.image) || null,
          source_url: card.id
            ? `https://api.tcgdex.net/v2/ja/cards/${encodeURIComponent(card.id)}`
            : null,
        })),
        independent_full_checklist_cards: (fullChecklist?.cards ?? []).map((card) => ({
          source_external_id: clean(card.source_external_id),
          card_number_raw: clean(card.card_number_raw) || null,
          english_display_name: clean(card.english_display_name) || null,
          type_line: clean(card.type_line) || null,
          rarity: clean(card.rarity) || null,
          source_url: clean(card.source_url) || null,
        })),
        official_product_cards: cardList.cards.map((card) => ({
          source_external_id: clean(card.card_id),
          printed_name_ja: clean(card.card_name) || null,
          image_url: clean(card.image_url) || null,
        })),
        numbered_base_cards: (checklist?.cards ?? []).map((card) => ({
          card_number_raw: card.card_number_raw,
          image_url: card.image_url ?? null,
          source_external_id: card.source_external_id ?? null,
          source_url: card.source_url ?? null,
        })),
        source_url: new URL(product.link_detailPage || product.link_cardList,
          "https://www.pokemon-card.com").toString(),
      });
    }
  }
  return sourceSets;
}

async function discoverRecentJapaneseCards(database, sourceSnapshots, options) {
  const cards = new Map();
  for (let page = 1; page <= options.japaneseRecentPages; page += 1) {
    const url = `https://www.pokemon-card.com/card-search/resultAPI.php?mode=statuslist&page=${page}`;
    const snapshot = await fetchSource(url, { responseType: "json", delayMs: 150 });
    sourceSnapshots.push(sourceMetadata(snapshot));
    const parsed = parseOfficialJapaneseCardSearchPage(snapshot.body, "all", page);
    for (const card of parsed.cards) cards.set(card.card_id, card);
  }
  const existing = new Set(database.official_japanese_card_ids);
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
      const detailCard = {
        ...(cards.get(cardId) ?? { card_id: cardId }),
        ...detail,
        source_url: sourceUrl,
      };
      detailed.push({
        ...detailCard,
        ...reconcileJapaneseOfficialCardCoverage({
          card: detailCard,
          officialEvidenceIds: database.official_japanese_card_ids,
          canonicalCards: database.japanese_canonical_cards,
        }),
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
    missing_card_count: detailed.filter((card) =>
      card.status === JAPANESE_CARD_COVERAGE_STATUSES.CANONICAL_CARD_MISSING).length,
    official_evidence_gap_count: detailed.filter((card) =>
      card.status ===
        JAPANESE_CARD_COVERAGE_STATUSES.CANONICAL_PRESENT_OFFICIAL_EVIDENCE_MISSING).length,
    detected_card_count: detectedMissingIds.size,
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
    `- Database mode: \`${summary.database_mode}\``,
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
    pokemon_language_candidate_dir: options.pokemonLanguageCandidateDir,
    source_only: options.sourceOnly,
    boundaries: {
      database_transaction: options.sourceOnly ? "none" : "read_only",
      database_writes: false,
      storage_writes: false,
      pricing_writes: false,
      publication_writes: false,
      source_authorities: [
        "Bandai One Piece",
        "Scryfall",
        "TCGdex English Pokemon",
        "Pokemon Card Japan",
      ],
    },
  };
  await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);

  const [
    database,
    englishMasterIndex,
    japaneseMasterIndex,
    pokemonLanguageCandidateRegistry,
    japaneseCandidateSnapshot,
  ] = await Promise.all([
    options.sourceOnly
      ? Promise.resolve(emptyDatabaseSnapshot())
      : loadDatabaseSnapshot(options.databaseUrl),
    loadEnglishMasterIndex(),
    loadJapaneseMasterIndex(),
    loadPokemonLanguageCandidateRegistry(options.pokemonLanguageCandidateDir),
    loadPokemonLanguageCandidateSnapshot(options.pokemonLanguageCandidateDir, "ja"),
  ]);
  const classifiedDatabaseSets = classifyPokemonDatabaseSetScopesV1({
    databaseSets: database.sets,
    englishMasterSets: englishMasterIndex.sets,
    japaneseMasterSets: japaneseMasterIndex.sets,
  });
  const japaneseDatabaseSets = classifiedDatabaseSets.filter((row) =>
    row.game_code === "pokemon" && catalogSetScope(row) === "pokemon ja");
  const englishDatabaseSets = classifiedDatabaseSets.filter((row) =>
    row.game_code === "pokemon" && catalogSetScope(row) === "pokemon en");
  const unresolvedPokemonSets = classifiedDatabaseSets.filter((row) =>
    row.game_code === "pokemon" && catalogSetScope(row) === "pokemon unspecified");
  const englishAliasOverlay = deriveEnglishPokemonCanonicalAliasOverlayV1({
    databaseSets: englishDatabaseSets,
    databaseCards: database.english_canonical_cards,
    masterCards: englishMasterIndex.cards,
    masterSetRemaps: englishMasterIndex.setOwnerRemaps,
  });
  database.sets = [
    ...database.sets.filter((row) => row.game_code !== "pokemon"),
    ...unresolvedPokemonSets,
    ...japaneseDatabaseSets,
    ...englishAliasOverlay.sets,
  ];
  database.english_alias_resolutions = englishAliasOverlay.resolutions;
  const sourceSnapshots = [];
  const [onePieceSets, mtgSets, pokemonEnglishSets, japaneseSets] = await Promise.all([
    options.sourceOnly ? Promise.resolve([]) : discoverOnePiece(
      database.sets,
      database.one_piece_warehouse_products,
      sourceSnapshots,
      options,
    ),
    options.sourceOnly
      ? Promise.resolve([])
      : discoverMtg(database.sets, sourceSnapshots, options),
    options.sourceOnly ? Promise.resolve([]) : discoverPokemonEnglish(
      database.sets,
      sourceSnapshots,
      options,
      englishMasterIndex,
    ),
    discoverJapaneseProducts(sourceSnapshots, options, japaneseCandidateSnapshot),
  ]);
  const recentJapaneseCards = options.sourceOnly
    ? {
        scanned_card_count: 0,
        existing_card_count: 0,
        missing_card_count: 0,
        official_evidence_gap_count: 0,
        detected_card_count: 0,
        detail_request_count: 0,
        detail_fetch_count: 0,
        detail_fetch_truncated: false,
        card_id_window: null,
        cards: [],
        source_only_skip: true,
      }
    : await discoverRecentJapaneseCards(database, sourceSnapshots, options);
  const sourceSets = [...onePieceSets, ...mtgSets, ...pokemonEnglishSets, ...japaneseSets];
  const reconciliation = reconcileCatalogSets({
    sourceSets,
    databaseSets: database.sets,
    asOf: options.asOf,
  });
  const summary = {
    ...summarizeCatalogReconciliation(reconciliation),
    database_mode: options.sourceOnly ? "none" : "read-only transaction",
    recent_japanese_cards: {
      scanned: recentJapaneseCards.scanned_card_count,
      missing: recentJapaneseCards.missing_card_count,
      official_evidence_gaps: recentJapaneseCards.official_evidence_gap_count,
      detail_fetch_count: recentJapaneseCards.detail_fetch_count,
    },
    source_request_count: sourceSnapshots.length,
    completed_at: new Date().toISOString(),
  };
  const gaps = reconciliation.filter((row) => [
    CATALOG_GAP_STATUSES.MISSING_SET,
    CATALOG_GAP_STATUSES.INCOMPLETE_CARDS,
  ].includes(row.status));
  const pokemonMasterIndexReconciliation =
    buildPokemonLanguageMasterIndexReconciliationV1({
      reconciliation,
      englishMasterCards: englishMasterIndex.cards,
      englishAliasResolutions: database.english_alias_resolutions,
      japaneseMasterSets: japaneseMasterIndex.sets,
      japaneseMasterCards: japaneseMasterIndex.cards,
    });
  const canonicalPromotionCandidates = buildCanonicalPromotionCandidatesV1({
    actionableGaps: gaps,
    pokemonMasterIndexReconciliation,
  });
  const pokemonMasterIndexUpdateCandidates =
    buildPokemonMasterIndexUpdateCandidatesV1(pokemonMasterIndexReconciliation);
  const pokemonLanguageCandidateIndexReconciliation =
    buildPokemonLanguageCandidateIndexReconciliationV1({
      registry: pokemonLanguageCandidateRegistry,
      canonicalCardCountsByLanguage: options.sourceOnly
        ? {}
        : {
            en: database.english_canonical_cards.length,
            ja: database.japanese_canonical_cards.length,
          },
    });
  summary.pokemon_master_index = pokemonMasterIndexReconciliation.summary;
  summary.pokemon_master_index.update_candidate_count =
    pokemonMasterIndexUpdateCandidates.length;
  summary.canonical_promotion_candidate_count = canonicalPromotionCandidates.length;
  summary.pokemon_language_candidate_index =
    pokemonLanguageCandidateIndexReconciliation.summary;
  const aliases = buildCatalogSearchAliases(reconciliation);
  sourceSnapshots.sort((left, right) =>
    left.request_url.localeCompare(right.request_url) ||
    left.fetched_at.localeCompare(right.fetched_at));

  await Promise.all([
    writeJson(path.join(options.outDir, "database_snapshot.json"), {
      sets: database.sets,
      official_japanese_card_ids: database.official_japanese_card_ids,
      japanese_canonical_card_count: database.japanese_canonical_cards.length,
      english_canonical_card_count: database.english_canonical_cards.length,
      english_alias_resolutions: database.english_alias_resolutions,
      english_master_index_alias_fingerprint_sha256:
        englishMasterIndex.aliasesSha256,
      japanese_master_index: {
        set_count: japaneseMasterIndex.sets.length,
        card_count: japaneseMasterIndex.cards.length,
        base_set_fingerprint_sha256: japaneseMasterIndex.setFingerprint,
        base_card_fingerprint_sha256: japaneseMasterIndex.cardFingerprint,
        set_fingerprint_sha256: japaneseMasterIndex.setFingerprint,
        card_fingerprint_sha256: japaneseMasterIndex.cardFingerprint,
        incremental_overlay_fingerprint_sha256:
          japaneseMasterIndex.incrementalOverlayFingerprint,
        effective_set_fingerprint_sha256: contentFingerprint(japaneseMasterIndex.sets),
        effective_card_fingerprint_sha256: contentFingerprint(japaneseMasterIndex.cards),
      },
      one_piece_warehouse_product_count: database.one_piece_warehouse_products.length,
      artifact_policy: "counts_only_for_large_database_collections",
    }),
    writeJson(path.join(options.outDir, "source_snapshots.json"), sourceSnapshots),
    writeJson(path.join(options.outDir, "source_sets.json"), sourceSets),
    writeJson(path.join(options.outDir, "catalog_reconciliation.json"), reconciliation),
    writeJson(path.join(options.outDir, "actionable_gaps.json"), gaps),
    writeJson(
      path.join(options.outDir, "pokemon_master_index_reconciliation.json"),
      pokemonMasterIndexReconciliation,
    ),
    writeJson(
      path.join(options.outDir, "canonical_promotion_candidates.json"),
      canonicalPromotionCandidates,
    ),
    writeJson(
      path.join(options.outDir, "pokemon_master_index_update_candidates.json"),
      pokemonMasterIndexUpdateCandidates,
    ),
    writeJson(
      path.join(options.outDir, "pokemon_language_candidate_index_reconciliation.json"),
      pokemonLanguageCandidateIndexReconciliation,
    ),
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
