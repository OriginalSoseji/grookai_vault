import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

import {
  buildJapaneseIncrementalSetPlanV1,
  buildJapaneseOfficialEvidenceEnrichmentV1,
  CATALOG_INCREMENTAL_PROMOTION_VERSION,
  validateJapaneseIncrementalSetPlanV1,
} from "../../backend/catalog/catalog_incremental_promotion_v1.mjs";
import { sha256 } from "../../backend/catalog/universal_catalog_discovery_v1.mjs";
import { parseBulbapediaJapaneseCardList } from
  "../audits/japanese_master_index_v4/card_source_adapters/bulbapedia_jp_v1.mjs";
import { parseLimitlessJapaneseCardChecklist } from
  "../audits/japanese_master_index_v4/card_source_adapters/limitless_jp_v1.mjs";
import {
  parseOfficialJapaneseCardDetail,
  parseOfficialJapaneseCardSearchPage,
} from "../audits/japanese_master_index_v4/card_source_adapters/official_jp_v1.mjs";
import {
  parseTcgdexJapaneseCardPayload,
  parseTcgdexJapaneseSetPayload,
} from "../audits/japanese_master_index_v4/card_source_adapters/tcgdex_ja_v1.mjs";

const { Client } = pg;
const USER_AGENT = "GrookaiVaultCatalogPromotion/1.0 catalog-ops@grookai.com";
const DEFAULT_SET_CODE = "M6";
const DEFAULT_DB_SET_CODE = "jpn-product-93e429bd4ffd351d";
const DEFAULT_PRODUCT_ID = "955";

function clean(value) {
  return String(value ?? "").trim();
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const options = {
    mode: "plan",
    asOf: new Date().toISOString().slice(0, 10),
    databaseUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null,
    pokemonSetCode: DEFAULT_SET_CODE,
    pokemonDbSetCode: DEFAULT_DB_SET_CODE,
    pokemonProductId: DEFAULT_PRODUCT_ID,
    officialCardIds: ["50301"],
    expectedHeadSha: null,
    concurrency: 4,
    outDir: path.join("docs", "audits", "catalog_incremental_promotion_v1", stamp),
  };
  for (const token of argv) {
    if (token.startsWith("--mode=")) options.mode = token.slice(7);
    else if (token.startsWith("--as-of=")) options.asOf = token.slice(8);
    else if (token.startsWith("--db-url=")) options.databaseUrl = token.slice(9);
    else if (token.startsWith("--pokemon-set-code=")) options.pokemonSetCode = token.slice(19);
    else if (token.startsWith("--pokemon-db-set-code=")) options.pokemonDbSetCode = token.slice(22);
    else if (token.startsWith("--pokemon-product-id=")) options.pokemonProductId = token.slice(21);
    else if (token.startsWith("--official-card-ids=")) {
      options.officialCardIds = token.slice(20).split(",").map(clean).filter(Boolean);
    } else if (token.startsWith("--expected-head-sha=")) options.expectedHeadSha = token.slice(20);
    else if (token.startsWith("--concurrency=")) options.concurrency = Number(token.slice(14));
    else if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!new Set(["plan", "dry-run", "apply"]).has(options.mode)) {
    throw new Error("--mode must be plan, dry-run, or apply");
  }
  if (!options.databaseUrl) throw new Error("SUPABASE_DB_URL is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.asOf)) throw new Error("Invalid --as-of");
  if (!Number.isSafeInteger(options.concurrency) || options.concurrency < 1 ||
      options.concurrency > 8) throw new Error("Invalid --concurrency");
  if (options.mode === "apply" && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha ?? "")) {
    throw new Error("Apply requires --expected-head-sha");
  }
  return options;
}

function clientOptions(connectionString, applicationName) {
  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
    application_name: applicationName,
    connectionTimeoutMillis: 20_000,
    statement_timeout: 300_000,
    query_timeout: 300_000,
  };
}

async function fetchSource(url, responseType = "text") {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 429 && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2_500));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.text();
      return {
        body: responseType === "json" ? JSON.parse(body) : body,
        metadata: {
          request_url: url,
          final_url: response.url,
          fetched_at: new Date().toISOString(),
          http_status: response.status,
          body_sha256: sha256(body),
          byte_size: Buffer.byteLength(body),
        },
      };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`Source fetch failed for ${url}: ${lastError?.message ?? lastError}`);
}

async function mapPool(values, concurrency, task) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(values[index], index);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

async function officialProductCards(productId, sourceSnapshots) {
  const cards = [];
  let page = 1;
  let maxPage = 1;
  do {
    const url = `https://www.pokemon-card.com/card-search/resultAPI.php?mode=statuslist&pg=${encodeURIComponent(productId)}&page=${page}`;
    const snapshot = await fetchSource(url, "json");
    sourceSnapshots.push(snapshot.metadata);
    const parsed = parseOfficialJapaneseCardSearchPage(snapshot.body, productId, page);
    maxPage = Number(parsed.max_page ?? 1);
    cards.push(...parsed.cards);
    page += 1;
  } while (page <= maxPage);
  return cards;
}

async function fetchOfficialDetails(cards, concurrency, sourceSnapshots) {
  return mapPool(cards, concurrency, async (card) => {
    const url = `https://www.pokemon-card.com/card-search/details.php/card/${card.card_id}/regu/all`;
    const snapshot = await fetchSource(url);
    sourceSnapshots.push(snapshot.metadata);
    return {
      ...parseOfficialJapaneseCardDetail(snapshot.body, card.card_id),
      source_url: url,
    };
  });
}

async function loadJapaneseDatabase(client, options) {
  const setResult = await client.query(`
    select id::text, code, name, release_date::text
    from public.sets
    where game = 'pokemon' and lower(code) = lower($1)
  `, [options.pokemonDbSetCode]);
  if (setResult.rows.length !== 1) throw new Error("Target Japanese set is not uniquely canonical");
  const set = setResult.rows[0];
  const existing = await client.query(`
    select id::text, number_plain
    from public.card_prints
    where set_id = $1::uuid
    order by number_plain, id
  `, [set.id]);
  const species = await client.query(`
    select id::text, national_dex_number, display_name
    from public.pokemon_species
    where active
    order by national_dex_number, id
  `);
  const officialEvidence = await client.query(`
    select evidence_payload->>'source_external_id' as source_external_id
    from public.card_print_identity_source_evidence
    where source_key = 'official_jp_cards' and active
  `);
  return {
    set,
    existingNumbers: existing.rows.map((row) => row.number_plain),
    speciesRows: species.rows,
    officialEvidenceIds: new Set(officialEvidence.rows.map((row) => row.source_external_id)),
  };
}

async function loadOfficialEnrichmentTarget(client, officialCard) {
  const normalizedSetCode = clean(officialCard.source_set_code).toLowerCase().replace(/[^a-z0-9]/g, "");
  const number = String(Number(officialCard.card_number_raw));
  const result = await client.query(`
    select
      cp.id::text,
      cp.name,
      identity.id::text as identity_id,
      identity.card_print_id::text,
      identity.identity_domain,
      identity.set_code_identity,
      identity.printed_number
    from public.card_prints cp
    join public.card_print_identity identity
      on identity.card_print_id = cp.id and identity.is_active
    where identity.identity_domain = 'pokemon_jpn'
      and regexp_replace(
        regexp_replace(lower(cp.set_code), '^jpn[-_]*', ''),
        '[^a-z0-9]',
        '',
        'g'
      ) = $1
      and (cp.number_plain = $2 or cp.number = $2)
  `, [normalizedSetCode, number]);
  if (result.rows.length !== 1) {
    throw new Error(`Official card ${officialCard.card_id} lacks one exact canonical target`);
  }
  const row = result.rows[0];
  return {
    cardPrint: { id: row.id, name: row.name },
    identity: {
      id: row.identity_id,
      card_print_id: row.card_print_id,
      identity_domain: row.identity_domain,
      set_code_identity: row.set_code_identity,
      printed_number: row.printed_number,
    },
  };
}

export async function computeIdentityHashes(client, plan) {
  for (const row of plan.payload.rows) {
    const input = row.identity_hash_input;
    const result = await client.query(`
      select public.card_print_identity_hash_v1(
        $1,$2,$3,$4,$5,$6,$7::jsonb
      ) as identity_key_hash
    `, [
      input.identity_domain,
      input.identity_key_version,
      input.set_code_identity,
      input.printed_number,
      input.normalized_printed_name,
      input.source_name_raw,
      JSON.stringify(input.identity_payload),
    ]);
    row.identity.identity_key_hash = result.rows[0].identity_key_hash;
  }
}

export async function collisionPreflight(client, plan, enrichmentRows = []) {
  const rows = plan.payload.rows;
  const evidence = [...rows.flatMap((row) => row.evidence), ...enrichmentRows];
  const checks = {
    card_prints: Number((await client.query(`
      select count(*)::int as count from public.card_prints
      where id = any($1::uuid[]) or gv_id = any($2::text[])
    `, [rows.map((row) => row.card_print.id), rows.map((row) => row.card_print.gv_id)])).rows[0].count),
    natural_coordinates: Number((await client.query(`
      select count(*)::int as count from public.card_prints
      where set_id = $1::uuid and number_plain = any($2::text[])
    `, [plan.payload.set.id, rows.map((row) => row.number)])).rows[0].count),
    identities: Number((await client.query(`
      select count(*)::int as count from public.card_print_identity
      where id = any($1::uuid[]) or (is_active and identity_key_hash = any($2::text[]))
    `, [rows.map((row) => row.identity.id), rows.map((row) => row.identity.identity_key_hash)])).rows[0].count),
    evidence: Number((await client.query(`
      select count(*)::int as count from public.card_print_identity_source_evidence
      where id = any($1::uuid[])
    `, [evidence.map((row) => row.id)])).rows[0].count),
    family_reviews: Number((await client.query(`
      select count(*)::int as count from public.card_print_family_review_queue
      where id = any($1::uuid[])
    `, [rows.map((row) => row.family_review.id)])).rows[0].count),
  };
  if (Object.values(checks).some((count) => count !== 0)) {
    throw new Error(`Collision preflight failed: ${JSON.stringify(checks)}`);
  }
  return checks;
}

export async function insertRows(client, plan, enrichmentRows = []) {
  const rows = plan.payload.rows;
  if (rows.length > 0) {
    await client.query(`insert into public.card_prints (
      id,set_id,name,number,variant_key,rarity,artist,image_url,
      image_alt_url,image_source,image_status,image_note,external_ids,variants,
      print_identity_key,ai_metadata,data_quality_flags,image_res,gv_id,set_code,
      printed_set_abbrev,printed_total,regulation_mark,identity_domain,
      printed_identity_modifier,set_identity_model,representative_image_url
    ) select x.id,x.set_id,x.name,x.number,x.variant_key,x.rarity,
      x.artist,x.image_url,x.image_alt_url,x.image_source,x.image_status,x.image_note,
      x.external_ids,x.variants,x.print_identity_key,x.ai_metadata,x.data_quality_flags,
      x.image_res,x.gv_id,x.set_code,x.printed_set_abbrev,x.printed_total,
      x.regulation_mark,x.identity_domain,x.printed_identity_modifier,
      x.set_identity_model,x.representative_image_url
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid,set_id uuid,name text,number text,variant_key text,
      rarity text,artist text,image_url text,image_alt_url text,image_source text,
      image_status text,image_note text,external_ids jsonb,variants jsonb,
      print_identity_key text,ai_metadata jsonb,data_quality_flags jsonb,image_res jsonb,
      gv_id text,set_code text,printed_set_abbrev text,printed_total integer,
      regulation_mark text,identity_domain text,printed_identity_modifier text,
      set_identity_model text,representative_image_url text
    )`, [JSON.stringify(rows.map((row) => row.card_print))]);
    await client.query(`insert into public.card_print_identity (
      id,card_print_id,identity_domain,set_code_identity,printed_number,
      normalized_printed_name,source_name_raw,identity_payload,identity_key_version,
      identity_key_hash,is_active
    ) select x.id,x.card_print_id,x.identity_domain,x.set_code_identity,
      x.printed_number,x.normalized_printed_name,x.source_name_raw,x.identity_payload,
      x.identity_key_version,x.identity_key_hash,x.is_active
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid,card_print_id uuid,identity_domain text,set_code_identity text,
      printed_number text,normalized_printed_name text,source_name_raw text,
      identity_payload jsonb,identity_key_version text,identity_key_hash text,
      is_active boolean
    )`, [JSON.stringify(rows.map((row) => row.identity))]);
  }
  const evidence = [...rows.flatMap((row) => row.evidence), ...enrichmentRows];
  if (evidence.length > 0) {
    await client.query(`insert into public.card_print_identity_source_evidence (
      id,card_print_identity_id,card_print_id,acquisition_key,source_key,
      evidence_key_hash,evidence_subject,evidence_payload,active
    ) select x.id,x.card_print_identity_id,x.card_print_id,x.acquisition_key,
      x.source_key,x.evidence_key_hash,x.evidence_subject,x.evidence_payload,x.active
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid,card_print_identity_id uuid,card_print_id uuid,acquisition_key text,
      source_key text,evidence_key_hash text,evidence_subject jsonb,
      evidence_payload jsonb,active boolean
    )`, [JSON.stringify(evidence)]);
  }
  if (rows.length > 0) {
    await client.query(`insert into public.card_print_family_review_queue (
      id,card_print_identity_id,card_print_id,acquisition_key,family_status,
      family_candidate_source,normalized_family_candidate,review_status,
      family_link_promotion_allowed,review_key_hash,evidence_subject,active
    ) select x.id,x.card_print_identity_id,x.card_print_id,x.acquisition_key,
      x.family_status,x.family_candidate_source,x.normalized_family_candidate,
      x.review_status,x.family_link_promotion_allowed,x.review_key_hash,
      x.evidence_subject,x.active
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid,card_print_identity_id uuid,card_print_id uuid,acquisition_key text,
      family_status text,family_candidate_source text,normalized_family_candidate text,
      review_status text,family_link_promotion_allowed boolean,review_key_hash text,
      evidence_subject jsonb,active boolean
    )`, [JSON.stringify(rows.map((row) => row.family_review))]);
  }
}

export async function readback(client, plan, enrichmentRows = []) {
  const ids = plan.payload.rows.map((row) => row.card_print.id);
  const familyReviewIds = plan.payload.rows.map((row) => row.family_review.id);
  const evidenceIds = [
    ...plan.payload.rows.flatMap((row) => row.evidence.map((evidence) => evidence.id)),
    ...enrichmentRows.map((row) => row.id),
  ];
  const cards = Number((await client.query(
    "select count(*)::int as count from public.card_prints where id=any($1::uuid[])",
    [ids],
  )).rows[0].count);
  const identities = Number((await client.query(
    "select count(*)::int as count from public.card_print_identity where card_print_id=any($1::uuid[])",
    [ids],
  )).rows[0].count);
  const evidence = Number((await client.query(
    "select count(*)::int as count from public.card_print_identity_source_evidence where id=any($1::uuid[])",
    [evidenceIds],
  )).rows[0].count);
  const familyReviews = Number((await client.query(
    "select count(*)::int as count from public.card_print_family_review_queue where id=any($1::uuid[])",
    [familyReviewIds],
  )).rows[0].count);
  return { cards, identities, evidence, family_reviews: familyReviews };
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean: git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (options.mode === "apply" && (repository.commit_sha !== options.expectedHeadSha ||
      !repository.tracked_worktree_clean)) {
    throw new Error("Apply requires the exact clean frozen commit");
  }
  const runPlan = {
    version: CATALOG_INCREMENTAL_PROMOTION_VERSION,
    mode: options.mode,
    as_of: options.asOf,
    repository,
    targets: {
      pokemon_set_code: options.pokemonSetCode,
      pokemon_database_set_code: options.pokemonDbSetCode,
      pokemon_product_id: options.pokemonProductId,
      official_card_ids: options.officialCardIds,
    },
    boundaries: {
      insert_only: true,
      updates: 0,
      deletes: 0,
      child_printings: 0,
      storage: 0,
      pricing: 0,
      publication: 0,
      vault: 0,
    },
  };
  await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);

  const client = new Client(clientOptions(
    options.databaseUrl,
    `catalog-incremental-promotion-v1-${options.mode}`,
  ));
  await client.connect();
  const sourceSnapshots = [];
  let transactionOpen = false;
  try {
    await client.query(options.mode === "plan"
      ? "begin transaction isolation level repeatable read read only"
      : "begin transaction isolation level serializable");
    transactionOpen = true;
    const database = await loadJapaneseDatabase(client, options);
    const tcgdexSetUrl = `https://api.tcgdex.net/v2/ja/sets/${encodeURIComponent(options.pokemonSetCode)}`;
    const tcgdexSetSnapshot = await fetchSource(tcgdexSetUrl, "json");
    sourceSnapshots.push(tcgdexSetSnapshot.metadata);
    const tcgdexSet = parseTcgdexJapaneseSetPayload(
      JSON.stringify(tcgdexSetSnapshot.body),
      options.pokemonSetCode,
    );
    const existingNumbers = new Set(database.existingNumbers.map((value) => String(Number(value))));
    const missingBriefs = tcgdexSet.cards.filter((card) =>
      !existingNumbers.has(String(Number(card.localId))));
    const tcgdexDetails = await mapPool(missingBriefs, options.concurrency, async (card) => {
      const url = `https://api.tcgdex.net/v2/ja/cards/${encodeURIComponent(card.id)}`;
      const snapshot = await fetchSource(url, "json");
      sourceSnapshots.push(snapshot.metadata);
      return parseTcgdexJapaneseCardPayload(JSON.stringify(snapshot.body), card.id);
    });
    const limitlessUrl = `https://limitlesstcg.com/cards/jp/${encodeURIComponent(options.pokemonSetCode)}?show=all`;
    const limitlessSnapshot = await fetchSource(limitlessUrl);
    sourceSnapshots.push(limitlessSnapshot.metadata);
    const limitless = parseLimitlessJapaneseCardChecklist(
      limitlessSnapshot.body,
      options.pokemonSetCode,
    );
    const articleName = clean(limitless.set.name).replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "");
    const bulbapediaUrl = `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(articleName)}_(TCG)`;
    const bulbapediaSnapshot = await fetchSource(bulbapediaUrl);
    sourceSnapshots.push(bulbapediaSnapshot.metadata);
    const bulbapedia = parseBulbapediaJapaneseCardList(bulbapediaSnapshot.body, {
      source_container_id: `${articleName}_(TCG)`,
      source_container_url: bulbapediaUrl,
      source_expected_card_count: tcgdexSet.cardCount.official,
      source_native_name: limitless.set.name,
      source_native_japanese_name: tcgdexSet.name,
      source_native_code: options.pokemonSetCode,
    });
    const officialBriefs = await officialProductCards(options.pokemonProductId, sourceSnapshots);
    const officialDetails = await fetchOfficialDetails(
      officialBriefs,
      options.concurrency,
      sourceSnapshots,
    );
    const setPlan = buildJapaneseIncrementalSetPlanV1({
      set: database.set,
      tcgdexSet,
      tcgdexDetails,
      bulbapediaCards: bulbapedia.cards,
      officialDetails,
      limitlessCards: limitless.cards,
      existingNumbers: database.existingNumbers,
      speciesRows: database.speciesRows,
    });
    const validation = validateJapaneseIncrementalSetPlanV1(setPlan);
    if (!validation.valid) throw new Error(validation.findings.join(","));
    await computeIdentityHashes(client, setPlan);

    const enrichmentRows = [];
    for (const cardId of options.officialCardIds) {
      if (database.officialEvidenceIds.has(cardId)) continue;
      const url = `https://www.pokemon-card.com/card-search/details.php/card/${cardId}/regu/all`;
      const snapshot = await fetchSource(url);
      sourceSnapshots.push(snapshot.metadata);
      const officialCard = {
        ...parseOfficialJapaneseCardDetail(snapshot.body, cardId),
        source_url: url,
      };
      const target = await loadOfficialEnrichmentTarget(client, officialCard);
      enrichmentRows.push(buildJapaneseOfficialEvidenceEnrichmentV1({
        ...target,
        officialCard,
      }));
    }
    const collisions = await collisionPreflight(client, setPlan, enrichmentRows);
    const expectedReadback = {
      cards: setPlan.counts.card_prints,
      identities: setPlan.counts.identities,
      evidence: setPlan.counts.evidence + enrichmentRows.length,
      family_reviews: setPlan.counts.family_reviews,
    };
    let transactionResult = { action: "plan_only", expected: expectedReadback };
    if (options.mode !== "plan") {
      await insertRows(client, setPlan, enrichmentRows);
      const beforeFinalization = await readback(client, setPlan, enrichmentRows);
      if (JSON.stringify(beforeFinalization) !== JSON.stringify(expectedReadback)) {
        throw new Error(`Transaction readback mismatch: ${JSON.stringify(beforeFinalization)}`);
      }
      if (options.mode === "dry-run") {
        await client.query("rollback");
        transactionOpen = false;
        const afterRollback = await readback(client, setPlan, enrichmentRows);
        if (Object.values(afterRollback).some((count) => count !== 0)) {
          throw new Error(`Rollback absence proof failed: ${JSON.stringify(afterRollback)}`);
        }
        transactionResult = {
          action: "rolled_back",
          inserted_readback: beforeFinalization,
          post_rollback_readback: afterRollback,
        };
      } else {
        await client.query("commit");
        transactionOpen = false;
        const durableReadback = await readback(client, setPlan, enrichmentRows);
        if (JSON.stringify(durableReadback) !== JSON.stringify(expectedReadback)) {
          throw new Error(`Durable readback mismatch: ${JSON.stringify(durableReadback)}`);
        }
        transactionResult = { action: "committed", durable_readback: durableReadback };
      }
    } else {
      await client.query("rollback");
      transactionOpen = false;
    }
    sourceSnapshots.sort((left, right) => left.request_url.localeCompare(right.request_url));
    const planArtifact = {
      ...setPlan,
      payload: {
        ...setPlan.payload,
        rows: setPlan.payload.rows.map(({ identity_hash_input: ignored, ...row }) => row),
      },
      official_evidence_enrichments: enrichmentRows,
      collision_preflight: collisions,
      transaction_result: transactionResult,
    };
    const summary = {
      version: CATALOG_INCREMENTAL_PROMOTION_VERSION,
      mode: options.mode,
      status: options.mode === "apply" ? "applied" : options.mode === "dry-run" ? "rollback_proven" : "planned",
      target: setPlan.target,
      existing_card_count: database.existingNumbers.length,
      planned_card_count: setPlan.counts.card_prints,
      planned_evidence_count: setPlan.counts.evidence,
      official_evidence_enrichment_count: enrichmentRows.length,
      resulting_card_count: database.existingNumbers.length + setPlan.counts.card_prints,
      source_request_count: sourceSnapshots.length,
      source_counts: setPlan.payload.source_counts,
      payload_fingerprint_sha256: setPlan.payload_fingerprint_sha256,
      transaction_result: transactionResult,
      boundaries: runPlan.boundaries,
    };
    const artifacts = {};
    artifacts["promotion_plan.json"] = await writeJson(
      path.join(options.outDir, "promotion_plan.json"),
      planArtifact,
    );
    artifacts["source_snapshots.json"] = await writeJson(
      path.join(options.outDir, "source_snapshots.json"),
      sourceSnapshots,
    );
    artifacts["summary.json"] = await writeJson(
      path.join(options.outDir, "summary.json"),
      summary,
    );
    await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
      algorithm: "sha256",
      artifacts: Object.entries(artifacts).map(([artifactPath, body]) => ({
        path: artifactPath,
        bytes: body.length,
        sha256: sha256(body),
      })),
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    if (transactionOpen) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
