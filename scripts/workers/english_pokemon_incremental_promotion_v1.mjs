import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import pg from "pg";

import {
  buildEnglishPokemonIncrementalSetPlanV1,
  ENGLISH_POKEMON_INCREMENTAL_PROMOTION_VERSION,
  normalizeEnglishPokemonCardNameV1,
  normalizeEnglishPokemonCardNumberV1,
  validateEnglishPokemonIncrementalSetPlanV1,
} from "../../backend/catalog/english_pokemon_incremental_promotion_v1.mjs";
import {
  sha256,
  stableJson,
} from "../../backend/catalog/universal_catalog_discovery_v1.mjs";

const { Client } = pg;
const DEFAULT_MASTER_DIR = path.join(
  "docs", "audits", "verified_master_set_index_v1", "english_master_index_v1",
);
const USER_AGENT = "GrookaiVaultEnglishCatalogPromotion/1.0 catalog-ops@grookai.com";

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
    sourceSetCode: null,
    databaseSetCode: null,
    expectedHeadSha: null,
    sourceSetFile: null,
    masterDir: DEFAULT_MASTER_DIR,
    outDir: path.join("docs", "audits", "english_pokemon_incremental_promotion_v1", stamp),
  };
  for (const token of argv) {
    if (token.startsWith("--mode=")) options.mode = token.slice(7);
    else if (token.startsWith("--as-of=")) options.asOf = token.slice(8);
    else if (token.startsWith("--db-url=")) options.databaseUrl = token.slice(9);
    else if (token.startsWith("--source-set-code=")) options.sourceSetCode = token.slice(18);
    else if (token.startsWith("--database-set-code=")) options.databaseSetCode = token.slice(20);
    else if (token.startsWith("--expected-head-sha=")) options.expectedHeadSha = token.slice(20);
    else if (token.startsWith("--source-set-file=")) options.sourceSetFile = path.resolve(token.slice(18));
    else if (token.startsWith("--master-dir=")) options.masterDir = path.resolve(token.slice(13));
    else if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!new Set(["plan", "dry-run", "apply"]).has(options.mode)) {
    throw new Error("--mode must be plan, dry-run, or apply");
  }
  if (!options.databaseUrl) throw new Error("SUPABASE_DB_URL is required");
  if (!options.sourceSetCode || !options.databaseSetCode) {
    throw new Error("--source-set-code and --database-set-code are required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.asOf)) throw new Error("Invalid --as-of");
  if (options.mode === "apply" && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha ?? "")) {
    throw new Error("Apply requires --expected-head-sha");
  }
  if (options.mode === "apply" &&
      path.resolve(options.masterDir) !== path.resolve(DEFAULT_MASTER_DIR)) {
    throw new Error("Apply requires the checked-in default English Master Index");
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

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function readMasterIndex(options) {
  const cardsFile = path.join(options.masterDir, "english_master_index_cards_v1.json");
  const setsFile = path.join(options.masterDir, "english_master_index_sets_v1.json");
  const [cardsBytes, setsBytes] = await Promise.all([
    fs.readFile(cardsFile),
    fs.readFile(setsFile),
  ]);
  const cards = JSON.parse(cardsBytes).cards ?? [];
  const sets = JSON.parse(setsBytes).sets ?? [];
  const sourceSet = sets.find((row) => row.key === options.sourceSetCode);
  if (!sourceSet) throw new Error("Source set is absent from the English Master Index");
  return {
    sourceSet,
    cards: cards.filter((row) => row.set_key === options.sourceSetCode),
    hashes: {
      cards_sha256: sha256(cardsBytes),
      sets_sha256: sha256(setsBytes),
    },
  };
}

async function fetchTcgdexSet(setCode, sourceSetFile = null) {
  const url = `https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(setCode)}`;
  if (sourceSetFile) {
    const body = await fs.readFile(sourceSetFile, "utf8");
    return {
      set: JSON.parse(body),
      snapshot: {
        request_url: url,
        final_url: url,
        http_status: 200,
        fetched_at: new Date().toISOString(),
        byte_size: Buffer.byteLength(body),
        body_sha256: sha256(body),
        attempt_count: 0,
        transport: "frozen_local_https_snapshot",
        source_file: sourceSetFile,
      },
    };
  }
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return {
        set: JSON.parse(body),
        snapshot: {
          request_url: url,
          final_url: response.url,
          http_status: response.status,
          fetched_at: new Date().toISOString(),
          byte_size: Buffer.byteLength(body),
          body_sha256: sha256(body),
          attempt_count: attempt,
        },
      };
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }
  throw new Error(`TCGdex set fetch failed: ${lastError?.message ?? lastError}`);
}

function cardCoordinate(number, name) {
  return `${normalizeEnglishPokemonCardNumberV1(number)}|${normalizeEnglishPokemonCardNameV1(name)}`;
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return output;
}

async function fetchTcgdexCardDetail(cardId) {
  const url = `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(cardId)}`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return {
        detail: JSON.parse(body),
        snapshot: {
          request_url: url,
          final_url: response.url,
          http_status: response.status,
          fetched_at: new Date().toISOString(),
          byte_size: Buffer.byteLength(body),
          body_sha256: sha256(body),
          attempt_count: attempt,
        },
      };
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }
  throw new Error(`TCGdex card detail fetch failed for ${cardId}: ${lastError?.message ?? lastError}`);
}

async function fetchMissingTcgdexDetails({ sourceSet, masterCards, existingCards }) {
  const existingCoordinates = new Set(existingCards.map((card) =>
    cardCoordinate(card.number ?? card.number_plain, card.name)));
  const missingCoordinates = new Set(masterCards
    .filter((card) => !existingCoordinates.has(cardCoordinate(card.card_number, card.card_name)))
    .map((card) => cardCoordinate(card.card_number, card.card_name)));
  const briefs = (sourceSet?.cards ?? []).filter((card) =>
    missingCoordinates.has(cardCoordinate(card.localId, card.name)));
  const results = await mapLimit(briefs, 8, (card) => fetchTcgdexCardDetail(card.id));
  return {
    details: results.map((result) => result.detail),
    snapshots: results.map((result) => result.snapshot),
  };
}

async function loadDatabase(client, options) {
  const setResult = await client.query(`
    select id::text, code, name, printed_set_abbrev
    from public.sets
    where game = 'pokemon' and lower(code) = lower($1)
  `, [options.databaseSetCode]);
  if (setResult.rows.length !== 1) throw new Error("Target English set is not uniquely canonical");
  const set = setResult.rows[0];
  const [cards, species] = await Promise.all([
    client.query(`
      select id::text, name, number, number_plain, gv_id
      from public.card_prints
      where set_id = $1::uuid
      order by number_plain, number, id
    `, [set.id]),
    client.query(`
      select id::text, national_dex_number, display_name
      from public.pokemon_species
      where active
      order by national_dex_number, id
    `),
  ]);
  return { set, existingCards: cards.rows, speciesRows: species.rows };
}

async function computeIdentityHashes(client, plan) {
  for (const row of plan.payload.rows) {
    const input = row.identity_hash_input;
    const result = await client.query(`
      select public.card_print_identity_hash_v1($1,$2,$3,$4,$5,$6,$7::jsonb)
        as identity_key_hash
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

async function collisionPreflight(client, plan) {
  const rows = plan.payload.rows;
  const evidence = rows.flatMap((row) => row.evidence);
  if (rows.length === 0) return {
    card_prints: 0, natural_coordinates: 0, identities: 0, evidence: 0, family_reviews: 0,
  };
  const checks = {
    card_prints: Number((await client.query(`
      select count(*)::int as count from public.card_prints
      where id = any($1::uuid[]) or gv_id = any($2::text[])
    `, [rows.map((row) => row.card_print.id), rows.map((row) => row.card_print.gv_id)])).rows[0].count),
    natural_coordinates: Number((await client.query(`
      select count(*)::int as count from public.card_prints
      where set_id = $1::uuid and (
        upper(regexp_replace(coalesce(number, number_plain, ''), '[^A-Z0-9]', '', 'g')) = any($2::text[])
      )
    `, [plan.payload.set.id, rows.map((row) =>
      clean(row.number).toUpperCase().replace(/[^A-Z0-9]+/g, ""))])).rows[0].count),
    identities: Number((await client.query(`
      select count(*)::int as count from public.card_print_identity
      where id = any($1::uuid[]) or (is_active and identity_key_hash = any($2::text[]))
    `, [rows.map((row) => row.identity.id), rows.map((row) => row.identity.identity_key_hash)])).rows[0].count),
    evidence: Number((await client.query(`
      select count(*)::int as count from public.card_print_identity_source_evidence
      where id = any($1::uuid[]) or evidence_key_hash = any($2::text[])
    `, [evidence.map((row) => row.id), evidence.map((row) => row.evidence_key_hash)])).rows[0].count),
    family_reviews: Number((await client.query(`
      select count(*)::int as count from public.card_print_family_review_queue
      where id = any($1::uuid[]) or review_key_hash = any($2::text[])
    `, [rows.map((row) => row.family_review.id),
      rows.map((row) => row.family_review.review_key_hash)])).rows[0].count),
  };
  if (Object.values(checks).some((count) => count !== 0)) {
    throw new Error(`Collision preflight failed: ${JSON.stringify(checks)}`);
  }
  return checks;
}

async function insertRows(client, plan) {
  const rows = plan.payload.rows;
  if (rows.length === 0) return;
  await client.query(`insert into public.card_prints (
    id,set_id,name,number,variant_key,rarity,artist,image_url,image_alt_url,
    image_source,image_status,image_note,external_ids,variants,print_identity_key,
    ai_metadata,data_quality_flags,image_res,gv_id,set_code,printed_set_abbrev,
    printed_total,regulation_mark,identity_domain,printed_identity_modifier,
    set_identity_model,representative_image_url
  ) select x.id,x.set_id,x.name,x.number,x.variant_key,x.rarity,x.artist,
    x.image_url,x.image_alt_url,x.image_source,x.image_status,x.image_note,
    x.external_ids,x.variants,x.print_identity_key,x.ai_metadata,x.data_quality_flags,
    x.image_res,x.gv_id,x.set_code,x.printed_set_abbrev,x.printed_total,
    x.regulation_mark,x.identity_domain,x.printed_identity_modifier,
    x.set_identity_model,x.representative_image_url
  from jsonb_to_recordset($1::jsonb) as x(
    id uuid,set_id uuid,name text,number text,variant_key text,rarity text,
    artist text,image_url text,image_alt_url text,image_source text,image_status text,
    image_note text,external_ids jsonb,variants jsonb,print_identity_key text,
    ai_metadata jsonb,data_quality_flags jsonb,image_res jsonb,gv_id text,set_code text,
    printed_set_abbrev text,printed_total integer,regulation_mark text,
    identity_domain text,printed_identity_modifier text,set_identity_model text,
    representative_image_url text
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
    identity_payload jsonb,identity_key_version text,identity_key_hash text,is_active boolean
  )`, [JSON.stringify(rows.map((row) => row.identity))]);
  await client.query(`insert into public.card_print_identity_source_evidence (
    id,card_print_identity_id,card_print_id,acquisition_key,source_key,
    evidence_key_hash,evidence_subject,evidence_payload,active
  ) select x.id,x.card_print_identity_id,x.card_print_id,x.acquisition_key,
    x.source_key,x.evidence_key_hash,x.evidence_subject,x.evidence_payload,x.active
  from jsonb_to_recordset($1::jsonb) as x(
    id uuid,card_print_identity_id uuid,card_print_id uuid,acquisition_key text,
    source_key text,evidence_key_hash text,evidence_subject jsonb,
    evidence_payload jsonb,active boolean
  )`, [JSON.stringify(rows.flatMap((row) => row.evidence))]);
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

async function readback(client, plan) {
  const ids = plan.payload.rows.map((row) => row.card_print.id);
  if (ids.length === 0) return {
    card_prints: 0, identities: 0, evidence: 0, family_reviews: 0,
    child_printings: 0, mappings: 0, vault_items: 0, image_pointer_rows: 0,
  };
  const result = await client.query(`
    select
      (select count(*)::int from public.card_prints where id=any($1::uuid[])) as card_prints,
      (select count(*)::int from public.card_print_identity where card_print_id=any($1::uuid[])) as identities,
      (select count(*)::int from public.card_print_identity_source_evidence where card_print_id=any($1::uuid[])) as evidence,
      (select count(*)::int from public.card_print_family_review_queue where card_print_id=any($1::uuid[])) as family_reviews,
      (select count(*)::int from public.card_printings where card_print_id=any($1::uuid[])) as child_printings,
      (select count(*)::int from public.external_mappings where card_print_id=any($1::uuid[])) as mappings,
      (select count(*)::int from public.vault_items where card_id=any($1::uuid[])) as vault_items,
      (select count(*)::int from public.card_prints where id=any($1::uuid[])
        and (image_url is not null or representative_image_url is not null or image_path is not null))
        as image_pointer_rows
  `, [ids]);
  return Object.fromEntries(Object.entries(result.rows[0]).map(([key, value]) => [key, Number(value)]));
}

function assertReadback(plan, readback) {
  const expected = plan.counts;
  if (readback.card_prints !== expected.card_prints ||
      readback.identities !== expected.identities ||
      readback.evidence !== expected.evidence ||
      readback.family_reviews !== expected.family_reviews) {
    throw new Error(`Readback mismatch: ${JSON.stringify(readback)}`);
  }
  for (const key of ["child_printings", "mappings", "vault_items", "image_pointer_rows"]) {
    if (readback[key] !== 0) throw new Error(`Boundary violation: ${key}=${readback[key]}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const head = git("rev-parse", "HEAD");
  const branch = git("branch", "--show-current");
  const trackedStatus = git("status", "--short", "--untracked-files=no");
  if (options.mode === "apply") {
    if (head !== options.expectedHeadSha) throw new Error("Expected HEAD does not match");
    if (trackedStatus) throw new Error("Apply requires a clean tracked working tree");
  }
  const runPlan = {
    version: "ENGLISH_POKEMON_INCREMENTAL_PROMOTION_RUN_V1",
    started_at: new Date().toISOString(),
    mode: options.mode,
    as_of: options.asOf,
    commit_sha: head,
    branch,
    source_set_code: options.sourceSetCode,
    database_set_code: options.databaseSetCode,
    boundaries: {
      insert_only: true,
      child_printing_writes: false,
      storage_writes: false,
      image_pointer_writes: false,
      pricing_writes: false,
      publication_writes: false,
      vault_writes: false,
      updates: false,
      deletes: false,
    },
  };
  await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);
  const [master, tcgdex] = await Promise.all([
    readMasterIndex(options),
    fetchTcgdexSet(options.sourceSetCode, options.sourceSetFile),
  ]);
  const client = new Client(clientOptions(
    options.databaseUrl,
    `english_pokemon_incremental_promotion_v1_${options.mode}`,
  ));
  await client.connect();
  let transactionOpen = false;
  let report;
  try {
    const database = await loadDatabase(client, options);
    const tcgdexDetails = await fetchMissingTcgdexDetails({
      sourceSet: tcgdex.set,
      masterCards: master.cards,
      existingCards: database.existingCards,
    });
    const plan = buildEnglishPokemonIncrementalSetPlanV1({
      set: database.set,
      sourceSet: tcgdex.set,
      masterCards: master.cards,
      existingCards: database.existingCards,
      speciesRows: database.speciesRows,
      tcgdexDetails: tcgdexDetails.details,
    });
    await computeIdentityHashes(client, plan);
    plan.payload_fingerprint_sha256 = sha256(stableJson(plan.payload));
    const validation = validateEnglishPokemonIncrementalSetPlanV1(plan);
    if (!validation.valid) throw new Error(`Plan validation failed: ${validation.findings.join(",")}`);
    await writeJson(path.join(options.outDir, "preflight_plan.json"), plan);
    const collisions = await collisionPreflight(client, plan);
    let insertedReadback = null;
    let absenceReadback = null;
    if (options.mode !== "plan") {
      await client.query("begin");
      transactionOpen = true;
      await insertRows(client, plan);
      insertedReadback = await readback(client, plan);
      assertReadback(plan, insertedReadback);
      if (options.mode === "dry-run") {
        await client.query("rollback");
        transactionOpen = false;
        absenceReadback = await readback(client, plan);
        if (Object.values(absenceReadback).some((count) => count !== 0)) {
          throw new Error(`Rollback absence failed: ${JSON.stringify(absenceReadback)}`);
        }
      } else {
        await client.query("commit");
        transactionOpen = false;
        const durableReadback = await readback(client, plan);
        assertReadback(plan, durableReadback);
        insertedReadback = durableReadback;
      }
    }
    report = {
      ...runPlan,
      completed_at: new Date().toISOString(),
      pass: true,
      master_index_hashes: master.hashes,
      source_snapshot: tcgdex.snapshot,
      detail_source_snapshots: tcgdexDetails.snapshots,
      payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
      counts: plan.counts,
      collision_preflight: collisions,
      inserted_readback: insertedReadback,
      rollback_absence_readback: absenceReadback,
      validation,
      rows: plan.payload.rows.map((row) => ({
        card_print_id: row.card_print.id,
        gv_id: row.card_print.gv_id,
        name: row.card_print.name,
        number: row.card_print.number,
        evidence_count: row.evidence.length,
      })),
      image_candidate_count: plan.counts.image_candidates,
    };
    await writeJson(path.join(options.outDir, "payload.json"), plan);
    await writeJson(path.join(options.outDir, "image_candidate_manifest.json"), {
      version: ENGLISH_POKEMON_INCREMENTAL_PROMOTION_VERSION,
      policy: "candidate_only_requires_separate_self_hosting_promotion",
      candidates: plan.payload.image_candidates,
    });
  } catch (error) {
    if (transactionOpen) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
  const reportBytes = await writeJson(path.join(options.outDir, "report.json"), report);
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    "report.json": sha256(reportBytes),
    "payload.json": sha256(await fs.readFile(path.join(options.outDir, "payload.json"))),
    "run_plan.json": sha256(await fs.readFile(path.join(options.outDir, "run_plan.json"))),
  });
  process.stdout.write(`${JSON.stringify({ output_directory: options.outDir, report }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});
