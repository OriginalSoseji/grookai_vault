import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { verifyMtgCanaryPayloadIntegrityV1 } from "./mtg_canonical_catalog_canary_preflight_v1.mjs";
import {
  buildMtgCanaryStageContractV1,
  stableJson,
} from "./mtg_canonical_catalog_canary_stage_v1.mjs";
import {
  buildMtgCatalogIngestionEnvelopeV1,
  classifyMtgCatalogSetStateV1,
  isMtgCatalogBatchEligibleAsOfV1,
  isTransientMtgIngestionErrorV1,
  MTG_CATALOG_INGESTION_APPROVAL_ENV,
  sha256MtgIngestionV1,
} from "./mtg_canonical_catalog_ingestion_envelope_v1.mjs";
import {
  captureMtgClientVisibilityV1,
  captureMtgPromotionCollisionsV1,
  captureMtgPromotionExactReadbackV1,
  captureVisiblePokemonCountV1,
  insertMtgPromotionRowsV1,
} from "./mtg_canonical_catalog_promotion_rollback_proof_v1.mjs";
import { buildMtgCanonicalSetPromotionContractV1 } from "./mtg_canonical_catalog_set_promotion_contract_v1.mjs";
import {
  captureMtgSetPromotionStageV1,
  captureMtgSetPromotionStateV1,
  verifyMtgSetPromotionDeltaV1,
  verifyMtgSetPromotionExactReadbackV1,
} from "./mtg_canonical_catalog_set_promotion_rollback_proof_v1.mjs";
import {
  assertMtgSetPromotionSecurityV1,
  captureMtgSetPromotionCurrentSourceLanesV1,
  captureMtgSetPromotionSecurityV1,
} from "./mtg_canonical_catalog_set_promotion_writer_v1.mjs";
import { reconcileMtgStageRowsV1 } from "./mtg_canonical_catalog_stage_readback_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_INGESTION_ORCHESTRATOR_V1";
const REQUIRED_BRANCH = "agent/mtg-pricing-readiness-v1";
const LOCK_NAME = "grookai:mtg:canonical_catalog_ingestion_v1";
const GOVERNING_FILES = Object.freeze([
  "scripts/audits/mtg_canonical_catalog_ingestion_orchestrator_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_ingestion_envelope_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_canary_preflight_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_canary_stage_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_stage_readback_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_promotion_rollback_proof_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_set_promotion_contract_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_set_promotion_rollback_proof_v1.mjs",
  "scripts/audits/mtg_canonical_catalog_set_promotion_writer_v1.mjs",
]);

function parseArgs(argv) {
  const args = {
    mode: "plan",
    manifest: null,
    payloadDir: null,
    outDir: null,
    maxSets: null,
    retries: 3,
    resume: false,
    asOf: new Date().toISOString().slice(0, 10),
  };
  for (const arg of argv) {
    if (arg === "--plan") args.mode = "plan";
    else if (arg === "--rollback-canary") args.mode = "rollback-canary";
    else if (arg === "--apply") args.mode = "apply";
    else if (arg === "--reconcile-only") args.mode = "reconcile-only";
    else if (arg === "--resume") args.resume = true;
    else if (arg.startsWith("--manifest=")) args.manifest = path.resolve(arg.slice(11));
    else if (arg.startsWith("--payload-dir=")) args.payloadDir = path.resolve(arg.slice(14));
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else if (arg.startsWith("--max-sets=")) args.maxSets = Number(arg.slice(11));
    else if (arg.startsWith("--retries=")) args.retries = Number(arg.slice(10));
    else if (arg.startsWith("--as-of=")) args.asOf = arg.slice(8);
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.manifest) throw new Error("--manifest=<manifest.json> is required");
  if (!args.payloadDir) throw new Error("--payload-dir=<payload directory> is required");
  if (!Number.isInteger(args.retries) || args.retries < 0 || args.retries > 5) {
    throw new Error("--retries must be an integer between 0 and 5");
  }
  if (args.maxSets !== null && (!Number.isInteger(args.maxSets) || args.maxSets < 1)) {
    throw new Error("--max-sets must be a positive integer");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.asOf)) throw new Error("--as-of must be YYYY-MM-DD");
  if (args.resume && args.mode === "plan") throw new Error("--resume is not valid in plan mode");
  return args;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

async function captureRepository() {
  const files = {};
  for (const relativePath of GOVERNING_FILES) {
    files[relativePath] = sha256MtgIngestionV1(
      await fs.readFile(path.join(ROOT, relativePath)),
    );
  }
  return {
    head_commit_sha: git(["rev-parse", "HEAD"]),
    governing_commit_sha: git(["log", "-1", "--format=%H", "--", ...GOVERNING_FILES]),
    branch: git(["branch", "--show-current"]),
    tracked_worktree_clean: git(["status", "--porcelain", "--untracked-files=no"]) === "",
    governing_files_sha256: sha256MtgIngestionV1(stableJson(files)),
    governing_files: files,
  };
}

function assertRepository(repository, mode) {
  if (repository.branch !== REQUIRED_BRANCH) {
    throw new Error(`Unexpected branch: ${repository.branch}`);
  }
  if (mode !== "plan" && !repository.tracked_worktree_clean) {
    throw new Error("Tracked worktree must be clean before database validation or execution");
  }
  if (!/^[0-9a-f]{40}$/.test(repository.governing_commit_sha)) {
    throw new Error("Governing commit could not be resolved");
  }
}

function countPayloadRows(payload) {
  return Object.values(payload.rows).reduce((sum, rows) => sum + rows.length, 0);
}

async function loadPayloadInventory(manifest, payloadDir) {
  const inventory = [];
  const payloadPaths = new Map();
  for (const batch of manifest.batches) {
    const file = path.join(payloadDir, path.basename(batch.payload_file));
    let body;
    try {
      body = await fs.readFile(file, "utf8");
    } catch (error) {
      throw new Error(`Missing payload for ${batch.code}: ${file}`, { cause: error });
    }
    const bodyHash = sha256MtgIngestionV1(body);
    const payload = JSON.parse(body);
    const integrity = verifyMtgCanaryPayloadIntegrityV1(payload);
    if (!integrity.ok) {
      throw new Error(`Payload integrity failed for ${batch.code}: ${integrity.issues.join(", ")}`);
    }
    inventory.push({
      ordinal: Number(batch.ordinal),
      source_set_id: batch.source_set_id,
      code: payload.selected_set.code,
      payload_file_sha256: bodyHash,
      writer_payload_fingerprint: payload.writer_payload_fingerprint,
      total_staging_rows: countPayloadRows(payload),
    });
    payloadPaths.set(batch.source_set_id, file);
  }
  return { inventory, payloadPaths };
}

function createClient() {
  return new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 300_000,
    statement_timeout: 300_000,
    application_name: VERSION,
  });
}

async function acquireExecutionLock() {
  const client = createClient();
  await client.connect();
  const result = await client.query(
    "select pg_try_advisory_lock(hashtext($1)) as acquired",
    [LOCK_NAME],
  );
  if (result.rows[0].acquired !== true) {
    await client.end();
    throw new Error("Another MTG catalog ingestion executor holds the advisory lock");
  }
  return client;
}

async function releaseExecutionLock(client) {
  if (!client) return;
  await client.query("select pg_advisory_unlock(hashtext($1))", [LOCK_NAME]).catch(() => {});
  await client.end().catch(() => {});
}

async function captureStagingSecurity(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'batch_rls_enabled', (
        select relrowsecurity from pg_class
        where oid = 'public.mtg_canonical_import_batches'::regclass
      ),
      'row_rls_enabled', (
        select relrowsecurity from pg_class
        where oid = 'public.mtg_canonical_import_rows'::regclass
      ),
      'anon_batch_select', has_table_privilege(
        'anon', 'public.mtg_canonical_import_batches', 'select'
      ),
      'authenticated_batch_select', has_table_privilege(
        'authenticated', 'public.mtg_canonical_import_batches', 'select'
      ),
      'anon_row_select', has_table_privilege(
        'anon', 'public.mtg_canonical_import_rows', 'select'
      ),
      'authenticated_row_select', has_table_privilege(
        'authenticated', 'public.mtg_canonical_import_rows', 'select'
      ),
      'service_batch_select', has_table_privilege(
        'service_role', 'public.mtg_canonical_import_batches', 'select'
      ),
      'service_batch_insert', has_table_privilege(
        'service_role', 'public.mtg_canonical_import_batches', 'insert'
      ),
      'service_row_select', has_table_privilege(
        'service_role', 'public.mtg_canonical_import_rows', 'select'
      ),
      'service_row_insert', has_table_privilege(
        'service_role', 'public.mtg_canonical_import_rows', 'insert'
      )
    ) as value
  `);
  return result.rows[0].value;
}

function assertStagingSecurity(security) {
  const expected = {
    batch_rls_enabled: true,
    row_rls_enabled: true,
    anon_batch_select: false,
    authenticated_batch_select: false,
    anon_row_select: false,
    authenticated_row_select: false,
    service_batch_select: true,
    service_batch_insert: true,
    service_row_select: true,
    service_row_insert: true,
  };
  if (stableJson(security) !== stableJson(expected)) {
    throw new Error(`Staging security mismatch: ${stableJson(security)}`);
  }
}

async function insertStaging(client, payload, contract) {
  await client.query(
    `insert into public.mtg_canonical_import_batches (
       id, payload_fingerprint_sha256, plan_version, source_bulk_sha256,
       foundation_migration_sha256, producing_commit_sha, producing_branch,
       selected_set_code, selected_set_name, status, row_counts,
       execution_boundaries
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'staged', $10::jsonb, $11::jsonb)`,
    [
      contract.batch_id,
      payload.writer_payload_fingerprint,
      payload.plan_version,
      payload.source_bulk_sha256,
      payload.foundation_migration_sha256,
      payload.repository.commit_sha,
      payload.repository.branch,
      payload.selected_set.code,
      payload.selected_set.name,
      JSON.stringify(payload.counts),
      JSON.stringify(payload.boundaries),
    ],
  );
  await client.query(
    `insert into public.mtg_canonical_import_rows (
       id, batch_id, entity_type, row_key, row_ordinal, payload, payload_sha256
     )
     select id, batch_id, entity_type, row_key, row_ordinal, payload, payload_sha256
     from jsonb_to_recordset($1::jsonb) as row(
       id uuid, batch_id uuid, entity_type text, row_key text,
       row_ordinal integer, payload jsonb, payload_sha256 text
     )`,
    [JSON.stringify(contract.rows)],
  );
}

function emptyReconciliation() {
  return { findings: [], row_count: 0, actual_hash_sha256: null };
}

async function inspectSet(client, plan) {
  const state = await captureMtgSetPromotionStateV1(client, plan);
  const stage = await captureMtgSetPromotionStageV1(client, plan);
  const stageReconciliation =
    stage.batch.length === 0 && stage.rows.length === 0
      ? emptyReconciliation()
      : reconcileMtgStageRowsV1(stage.rows, plan.staging_contract);
  const anyCanonical = [
    "selected_set_count",
    "selected_card_count",
    "selected_identity_count",
    "selected_printing_count",
    "selected_parent_mapping_count",
    "selected_printing_mapping_count",
  ].some((key) => Number(state[key]) !== 0);
  const exact = anyCanonical
    ? await captureMtgPromotionExactReadbackV1(client, plan.rows)
    : null;
  const classification = classifyMtgCatalogSetStateV1({
    plan,
    state,
    stageReconciliation,
    exact,
  });
  return { state, stage, stageReconciliation, exact, classification };
}

function expectNumber(actual, expected, label) {
  if (Number(actual) !== Number(expected)) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function assertSourceEvidence(client, payload, plan) {
  const source = await captureMtgSetPromotionCurrentSourceLanesV1(client, payload);
  expectNumber(
    source.planned_count,
    plan.row_counts.external_printing_mappings,
    "planned source lanes",
  );
  expectNumber(
    source.source_row_count,
    plan.row_counts.external_printing_mappings,
    "current source lanes",
  );
  expectNumber(
    source.positive_market_price_count,
    payload.counts.positive_market_lanes,
    "positive source lanes",
  );
  return source;
}

async function assertHiddenClients(client, setCode, expectedPokemon) {
  const visibility = {};
  for (const role of ["anon", "authenticated"]) {
    visibility[role] = await captureMtgClientVisibilityV1(client, role, setCode);
    for (const key of [
      "game_count",
      "set_count",
      "card_count",
      "identity_count",
      "printing_count",
      "legacy_search_count",
      "print_search_count",
    ]) {
      expectNumber(visibility[role][key], 0, `${role} ${key}`);
    }
  }
  expectNumber(
    visibility.authenticated.pokemon_card_count,
    expectedPokemon,
    "authenticated Pokemon visibility",
  );
  return visibility;
}

async function captureImagePointerCounts(client, plan) {
  const result = await client.query(
    `select jsonb_build_object(
       'parent_image_url', count(*) filter (where image_url is not null),
       'parent_image_source', count(*) filter (where image_source is not null),
       'parent_image_source_ref', count(*) filter (where image_source_ref is not null),
       'printing_image_url', (
         select count(*) from public.card_printings printing
         where printing.card_print_id = any($1::uuid[]) and printing.image_url is not null
       )
     ) as value
     from public.card_prints where id = any($1::uuid[])`,
    [plan.rows.card_prints.map((row) => row.id)],
  );
  return result.rows[0].value;
}

function assertNoImagePointers(counts) {
  for (const [key, count] of Object.entries(counts)) expectNumber(count, 0, key);
}

async function verifyCompleteSet(client, payload, plan, expectedPokemon) {
  const inspection = await inspectSet(client, plan);
  if (inspection.classification !== "complete_exact") {
    throw new Error(`Set ${payload.selected_set.code} is ${inspection.classification}`);
  }
  verifyMtgSetPromotionExactReadbackV1(plan, inspection.exact);
  const promotionSecurity = await captureMtgSetPromotionSecurityV1(client);
  assertMtgSetPromotionSecurityV1(promotionSecurity);
  const stagingSecurity = await captureStagingSecurity(client);
  assertStagingSecurity(stagingSecurity);
  const source = await assertSourceEvidence(client, payload, plan);
  const visibility = await assertHiddenClients(
    client,
    payload.selected_set.code,
    expectedPokemon,
  );
  const imagePointers = await captureImagePointerCounts(client, plan);
  assertNoImagePointers(imagePointers);
  return {
    inspection,
    promotion_security: promotionSecurity,
    staging_security: stagingSecurity,
    source,
    visibility,
    image_pointers: imagePointers,
  };
}

async function verifyCompleteSetOnNewReadOnlyConnection(payload, plan, expectedPokemon) {
  const client = createClient();
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const proof = await verifyCompleteSet(client, payload, plan, expectedPokemon);
    const readOnly = await client.query(
      "select current_setting('transaction_read_only')::boolean as value",
    );
    if (readOnly.rows[0].value !== true) throw new Error("Independent readback was not read-only");
    await client.query("rollback");
    return { ...proof, transaction_read_only: true, separate_connection: true };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function runRollbackSet(payload, plan, expectedPokemon) {
  const client = createClient();
  await client.connect();
  let open = false;
  try {
    const before = await inspectSet(client, plan);
    if (!["absent", "staged_exact"].includes(before.classification)) {
      throw new Error(`Rollback canary requires absent or staged set, got ${before.classification}`);
    }
    await client.query("begin");
    open = true;
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '300s'");
    if (before.classification === "absent") {
      await insertStaging(client, payload, plan.staging_contract);
    }
    const staged = await inspectSet(client, plan);
    if (staged.classification !== "staged_exact") {
      throw new Error(`Staging did not become exact: ${staged.classification}`);
    }
    assertStagingSecurity(await captureStagingSecurity(client));
    assertMtgSetPromotionSecurityV1(await captureMtgSetPromotionSecurityV1(client));
    await assertSourceEvidence(client, payload, plan);
    await assertHiddenClients(client, payload.selected_set.code, expectedPokemon);
    const collisions = await captureMtgPromotionCollisionsV1(client, plan.rows);
    if (Object.values(collisions).some((count) => Number(count) !== 0)) {
      throw new Error("Canonical collision detected inside rollback canary");
    }
    const inserted = await insertMtgPromotionRowsV1(client, plan.rows);
    for (const [name, count] of Object.entries(plan.row_counts)) {
      expectNumber(inserted[name], count, `${name} inserted rows`);
    }
    const promoted = await inspectSet(client, plan);
    if (promoted.classification !== "complete_exact") {
      throw new Error(`Promotion did not become exact: ${promoted.classification}`);
    }
    verifyMtgSetPromotionDeltaV1(plan, staged.state, promoted.state);
    verifyMtgSetPromotionExactReadbackV1(plan, promoted.exact);
    assertNoImagePointers(await captureImagePointerCounts(client, plan));
    await assertHiddenClients(client, payload.selected_set.code, expectedPokemon);
    await client.query("rollback");
    open = false;
    const after = await inspectSet(client, plan);
    if (stableJson(after.state) !== stableJson(before.state)) {
      throw new Error("Rollback canary did not restore exact state");
    }
    if (after.classification !== before.classification) {
      throw new Error("Rollback canary changed set classification");
    }
    return {
      status: "full_cycle_rollback_proven",
      before_classification: before.classification,
      staged_rows: plan.staging_contract.staged_row_count,
      inserted,
      after_classification: after.classification,
    };
  } catch (error) {
    if (open) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function stageSetDurably(client, payload, plan) {
  await client.query("begin");
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '300s'");
    const before = await inspectSet(client, plan);
    if (before.classification !== "absent") {
      throw new Error(`Durable stage requires absent set, got ${before.classification}`);
    }
    await insertStaging(client, payload, plan.staging_contract);
    const inside = await inspectSet(client, plan);
    if (inside.classification !== "staged_exact") {
      throw new Error(`Durable stage did not reconcile: ${inside.classification}`);
    }
    assertStagingSecurity(await captureStagingSecurity(client));
    expectNumber(inside.state.selected_card_count, 0, "canonical cards during stage");
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
  const durable = await inspectSet(client, plan);
  if (durable.classification !== "staged_exact") {
    throw new Error(`Durable staging readback failed: ${durable.classification}`);
  }
  return durable;
}

async function promoteSetDurably(client, payload, plan, expectedPokemon) {
  await client.query("begin");
  let before;
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '300s'");
    before = await inspectSet(client, plan);
    if (before.classification !== "staged_exact") {
      throw new Error(`Durable promotion requires exact stage, got ${before.classification}`);
    }
    assertStagingSecurity(await captureStagingSecurity(client));
    assertMtgSetPromotionSecurityV1(await captureMtgSetPromotionSecurityV1(client));
    await assertSourceEvidence(client, payload, plan);
    await assertHiddenClients(client, payload.selected_set.code, expectedPokemon);
    const collisions = await captureMtgPromotionCollisionsV1(client, plan.rows);
    if (Object.values(collisions).some((count) => Number(count) !== 0)) {
      throw new Error("Canonical collision detected before promotion");
    }
    const inserted = await insertMtgPromotionRowsV1(client, plan.rows);
    for (const [name, count] of Object.entries(plan.row_counts)) {
      expectNumber(inserted[name], count, `${name} inserted rows`);
    }
    const inside = await inspectSet(client, plan);
    if (inside.classification !== "complete_exact") {
      throw new Error(`Promotion did not reconcile: ${inside.classification}`);
    }
    verifyMtgSetPromotionDeltaV1(plan, before.state, inside.state);
    verifyMtgSetPromotionExactReadbackV1(plan, inside.exact);
    assertNoImagePointers(await captureImagePointerCounts(client, plan));
    await assertHiddenClients(client, payload.selected_set.code, expectedPokemon);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
  return { committed: true };
}

async function processApplySet(payload, plan, expectedPokemon) {
  const client = createClient();
  await client.connect();
  try {
    const initial = await inspectSet(client, plan);
    if (initial.classification === "partial_or_drifted") {
      throw new Error(`Partial or drifted state for ${payload.selected_set.code}`);
    }
    if (initial.classification === "complete_exact") {
      const independentReadback = await verifyCompleteSetOnNewReadOnlyConnection(
        payload,
        plan,
        expectedPokemon,
      );
      return {
        status: "already_complete_exact",
        database_writes: false,
        independent_readback: {
          transaction_read_only: independentReadback.transaction_read_only,
          separate_connection: independentReadback.separate_connection,
        },
      };
    }
    await assertSourceEvidence(client, payload, plan);
    assertMtgSetPromotionSecurityV1(await captureMtgSetPromotionSecurityV1(client));
    assertStagingSecurity(await captureStagingSecurity(client));
    await assertHiddenClients(client, payload.selected_set.code, expectedPokemon);
    let staged = false;
    if (initial.classification === "absent") {
      await stageSetDurably(client, payload, plan);
      staged = true;
    }
    await promoteSetDurably(client, payload, plan, expectedPokemon);
    const independentReadback = await verifyCompleteSetOnNewReadOnlyConnection(
      payload,
      plan,
      expectedPokemon,
    );
    return {
      status: "staged_promoted_and_independently_read_back",
      database_writes: true,
      staging_written: staged,
      canonical_written: true,
      independent_readback: {
        transaction_read_only: independentReadback.transaction_read_only,
        separate_connection: independentReadback.separate_connection,
      },
    };
  } finally {
    await client.end();
  }
}

async function captureGlobalState() {
  const client = createClient();
  await client.connect();
  try {
    await client.query("begin transaction read only");
    const result = await client.query(`
      select jsonb_build_object(
        'release_status', (
          select release_status from public.catalog_game_release_controls where game_code = 'mtg'
        ),
        'mtg_set_count', (select count(*) from public.sets where game = 'mtg'),
        'mtg_card_count', (
          select count(*) from public.card_prints
          where game_id = '4d544700-0000-4000-8000-000000000001'::uuid
        ),
        'mtg_identity_count', (
          select count(*) from public.card_print_identity identity_row
          join public.card_prints card on card.id = identity_row.card_print_id
          where card.game_id = '4d544700-0000-4000-8000-000000000001'::uuid
        ),
        'mtg_printing_count', (
          select count(*) from public.card_printings printing
          join public.card_prints card on card.id = printing.card_print_id
          where card.game_id = '4d544700-0000-4000-8000-000000000001'::uuid
        ),
        'mtg_parent_mapping_count', (
          select count(*) from public.external_mappings mapping
          join public.card_prints card on card.id = mapping.card_print_id
          where card.game_id = '4d544700-0000-4000-8000-000000000001'::uuid
            and mapping.source = 'scryfall'
        ),
        'mtg_printing_mapping_count', (
          select count(*) from public.external_printing_mappings mapping
          join public.card_printings printing on printing.id = mapping.card_printing_id
          join public.card_prints card on card.id = printing.card_print_id
          where card.game_id = '4d544700-0000-4000-8000-000000000001'::uuid
            and mapping.source = 'tcgplayer_market'
        ),
        'dsk_card_count', (
          select count(*) from public.card_prints
          where game_id = '4d544700-0000-4000-8000-000000000001'::uuid and set_code = 'dsk'
        ),
        'dsk_printing_count', (
          select count(*) from public.card_printings printing
          join public.card_prints card on card.id = printing.card_print_id
          where card.game_id = '4d544700-0000-4000-8000-000000000001'::uuid
            and card.set_code = 'dsk'
        ),
        'staging_batch_count', (select count(*) from public.mtg_canonical_import_batches),
        'staging_row_count', (select count(*) from public.mtg_canonical_import_rows),
        'pokemon_card_count', (
          select count(*) from public.card_prints card
          join public.games game on game.id = card.game_id where game.code = 'pokemon'
        )
      ) as value
    `);
    const authenticatedPokemon = await captureVisiblePokemonCountV1(client, "authenticated");
    const visibility = await assertHiddenClients(client, "__catalog_ingestion__", authenticatedPokemon);
    const security = await captureMtgSetPromotionSecurityV1(client);
    assertMtgSetPromotionSecurityV1(security);
    const stagingSecurity = await captureStagingSecurity(client);
    assertStagingSecurity(stagingSecurity);
    await client.query("rollback");
    return {
      ...result.rows[0].value,
      authenticated_pokemon_count: authenticatedPokemon,
      client_visibility: visibility,
      promotion_security: security,
      staging_security: stagingSecurity,
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function assertGlobalInvariant(current, baseline, appliedCounts) {
  if (current.release_status !== "hidden") throw new Error("MTG release is not hidden");
  expectNumber(current.dsk_card_count, baseline.dsk_card_count, "DSK card count");
  expectNumber(current.dsk_printing_count, baseline.dsk_printing_count, "DSK printing count");
  expectNumber(current.pokemon_card_count, baseline.pokemon_card_count, "Pokemon service count");
  expectNumber(
    current.authenticated_pokemon_count,
    baseline.authenticated_pokemon_count,
    "Pokemon authenticated count",
  );
  const expected = {
    mtg_set_count: Number(baseline.mtg_set_count) + appliedCounts.sets,
    mtg_card_count: Number(baseline.mtg_card_count) + appliedCounts.card_prints,
    mtg_identity_count:
      Number(baseline.mtg_identity_count) + appliedCounts.card_print_identity,
    mtg_printing_count: Number(baseline.mtg_printing_count) + appliedCounts.card_printings,
    mtg_parent_mapping_count:
      Number(baseline.mtg_parent_mapping_count) + appliedCounts.external_mappings,
    mtg_printing_mapping_count:
      Number(baseline.mtg_printing_mapping_count) + appliedCounts.external_printing_mappings,
  };
  for (const [key, value] of Object.entries(expected)) expectNumber(current[key], value, key);
}

function zeroCounts() {
  return {
    sets: 0,
    card_prints: 0,
    card_print_identity: 0,
    card_printings: 0,
    external_mappings: 0,
    external_printing_mappings: 0,
  };
}

function addPlanCounts(target, plan) {
  for (const key of Object.keys(target)) target[key] += Number(plan.row_counts[key]);
}

async function atomicWriteJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, body, "utf8");
  await fs.rename(temporary, file);
  return body;
}

async function appendProgress(outDir, event) {
  await fs.appendFile(
    path.join(outDir, "progress.jsonl"),
    `${JSON.stringify({ recorded_at: new Date().toISOString(), ...event })}\n`,
    "utf8",
  );
}

async function loadPayload(file, batch) {
  const body = await fs.readFile(file, "utf8");
  if (sha256MtgIngestionV1(body) !== batch.payload_file_sha256) {
    throw new Error(`Payload changed for ${batch.code}`);
  }
  const payload = JSON.parse(body);
  if (
    payload.writer_payload_fingerprint !== batch.writer_payload_fingerprint ||
    payload.selected_set.source_set_id !== batch.source_set_id ||
    payload.selected_set.code !== batch.code
  ) {
    throw new Error(`Payload identity changed for ${batch.code}`);
  }
  return payload;
}

async function withRetries(operation, retryLimit, onRetry) {
  let attempt = 0;
  while (true) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (!isTransientMtgIngestionErrorV1(error) || attempt >= retryLimit) throw error;
      attempt += 1;
      await onRetry(attempt, error);
      await new Promise((resolve) => setTimeout(resolve, Math.min(30_000, 1_000 * 2 ** attempt)));
    }
  }
}

function report(result) {
  return `# MTG Full Catalog Ingestion Envelope

- Status: **${result.status.toUpperCase()}**
- Mode: \`${result.mode}\`
- Envelope: \`${result.envelope.envelope_sha256}\`
- Frozen manifest: \`${result.envelope.manifest_sha256}\`
- Authorized remaining sets: \`${result.envelope.authorized_remaining_sets}\`
- Selected sets for this execution: \`${result.selected_set_count}\`
- Completed sets: \`${result.completed_set_count}\`
- Failed sets: \`${result.failed_set_count}\`
- MTG release status: \`${result.final_global_state?.release_status ?? "not_queried"}\`
- Client-visible MTG rows: \`0\`
- Database writes: \`${result.boundaries.database_writes}\`
- Findings: \`${result.findings.length}\`

The envelope authorizes automatic resume and bounded transient retries without
per-set approval. Structural drift stops the executor before the next set.
`;
}

async function writeFinalArtifacts(outDir, result) {
  const summaryBody = await atomicWriteJson(path.join(outDir, "summary.json"), result);
  const reportBody = report(result);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await atomicWriteJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: {
      "run_plan.json": sha256MtgIngestionV1(await fs.readFile(path.join(outDir, "run_plan.json"))),
      "progress.jsonl": sha256MtgIngestionV1(
        await fs.readFile(path.join(outDir, "progress.jsonl")).catch(() => Buffer.from("")),
      ),
      "summary.json": sha256MtgIngestionV1(summaryBody),
      "REPORT.md": sha256MtgIngestionV1(reportBody),
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestBody = await fs.readFile(args.manifest, "utf8");
  const manifest = JSON.parse(manifestBody);
  const repository = await captureRepository();
  assertRepository(repository, args.mode);
  const { inventory, payloadPaths } = await loadPayloadInventory(manifest, args.payloadDir);
  const envelope = buildMtgCatalogIngestionEnvelopeV1({
    manifest,
    manifestSha256: sha256MtgIngestionV1(manifestBody),
    payloadInventory: inventory,
    repository,
  });
  const selected = envelope.execution_order.slice(
    0,
    args.maxSets === null ? envelope.execution_order.length : args.maxSets,
  );
  const outDir =
    args.outDir ??
    path.join(ROOT, "docs", "audits", "pricing", "mtg_canonical_catalog_ingestion_v1");
  await fs.mkdir(outDir, { recursive: true });

  let runPlan;
  const runPlanFile = path.join(outDir, "run_plan.json");
  if (args.resume) {
    runPlan = JSON.parse(await fs.readFile(runPlanFile, "utf8"));
    if (
      runPlan.envelope_sha256 !== envelope.envelope_sha256 ||
      runPlan.mode !== args.mode ||
      runPlan.approval_sha256 !== envelope.approval_sha256 ||
      runPlan.payload_inventory_sha256 !== envelope.payload_inventory_sha256 ||
      runPlan.as_of !== args.asOf ||
      runPlan.repository.governing_commit_sha !== repository.governing_commit_sha ||
      stableJson(runPlan.selected_set_ids) !== stableJson(selected.map((batch) => batch.source_set_id))
    ) {
      throw new Error("Resume plan does not match the frozen envelope, code, or selection");
    }
  } else {
    const baseline = args.mode === "plan" ? null : await captureGlobalState();
    runPlan = {
      version: VERSION,
      created_at: new Date().toISOString(),
      mode: args.mode,
      repository,
      envelope_sha256: envelope.envelope_sha256,
      approval_sha256: envelope.approval_sha256,
      manifest_sha256: envelope.manifest_sha256,
      payload_inventory_sha256: envelope.payload_inventory_sha256,
      selected_set_ids: selected.map((batch) => batch.source_set_id),
      selected_sets: selected.map((batch) => ({
        execution_ordinal: batch.execution_ordinal,
        code: batch.code,
        name: batch.name,
        source_set_id: batch.source_set_id,
        set_type: batch.set_type,
        safety_phase: batch.safety_phase,
        safety_ramp_reason: batch.safety_ramp_reason,
        payload_file_sha256: batch.payload_file_sha256,
        writer_payload_fingerprint: batch.writer_payload_fingerprint,
        total_staging_rows: batch.total_staging_rows,
      })),
      retry_limit: args.retries,
      as_of: args.asOf,
      baseline,
      boundaries: envelope.boundaries,
    };
    await atomicWriteJson(runPlanFile, runPlan);
    await fs.writeFile(path.join(outDir, "progress.jsonl"), "", "utf8");
  }

  if (args.mode === "plan") {
    const result = {
      version: VERSION,
      recorded_at: new Date().toISOString(),
      mode: args.mode,
      status: "full_catalog_ingestion_envelope_frozen_no_database_access",
      repository,
      envelope,
      selected_set_count: selected.length,
      completed_set_count: 0,
      failed_set_count: 0,
      final_global_state: null,
      findings: [],
      boundaries: { ...envelope.boundaries, database_writes: false },
    };
    await writeFinalArtifacts(outDir, result);
    process.stdout.write(
      `${JSON.stringify({ out_dir: outDir, status: result.status, envelope: envelope.envelope_sha256, approval: envelope.required_approval_message }, null, 2)}\n`,
    );
    return;
  }

  if (args.mode === "apply" && process.env[MTG_CATALOG_INGESTION_APPROVAL_ENV] !== envelope.required_approval_message) {
    throw new Error(`Exact catalog envelope approval missing from ${MTG_CATALOG_INGESTION_APPROVAL_ENV}`);
  }

  const lockClient = await acquireExecutionLock();
  const stateFile = path.join(outDir, "state.json");
  let durableState = args.resume
    ? JSON.parse(await fs.readFile(stateFile, "utf8"))
    : {
        version: VERSION,
        completed: [],
        deferred: [],
        retries: [],
        findings: [],
        status: "running",
      };
  durableState.deferred ??= [];
  const completedById = new Map(durableState.completed.map((row) => [row.source_set_id, row]));
  const appliedCounts = zeroCounts();
  for (const completed of durableState.completed) {
    if (completed.counts_toward_run_delta === true) addPlanCounts(appliedCounts, completed.plan);
  }
  let stopRequested = false;
  process.once("SIGINT", () => {
    stopRequested = true;
  });
  process.once("SIGTERM", () => {
    stopRequested = true;
  });

  try {
    for (const [index, batch] of selected.entries()) {
      if (stopRequested) throw new Error("Graceful stop requested before next set");
      if (completedById.has(batch.source_set_id)) continue;
      if (!isMtgCatalogBatchEligibleAsOfV1(batch, runPlan.as_of)) {
        if (!durableState.deferred.some((row) => row.source_set_id === batch.source_set_id)) {
          const deferred = {
            source_set_id: batch.source_set_id,
            code: batch.code,
            released_at: batch.released_at,
            reason: "future_release_date",
          };
          durableState.deferred.push(deferred);
          await appendProgress(outDir, { event: "set_deferred", ...deferred });
          await atomicWriteJson(stateFile, durableState);
        }
        continue;
      }
      const payload = await loadPayload(payloadPaths.get(batch.source_set_id), batch);
      const plan = buildMtgCanonicalSetPromotionContractV1(payload);
      await appendProgress(outDir, {
        event: "set_started",
        execution_ordinal: index,
        source_set_id: batch.source_set_id,
        code: batch.code,
        plan_sha256: plan.promotion_plan_sha256,
      });
      const outcome = await withRetries(
        async () => {
          if (args.mode === "rollback-canary") {
            return runRollbackSet(
              payload,
              plan,
              runPlan.baseline.authenticated_pokemon_count,
            );
          }
          if (args.mode === "reconcile-only") {
            const proof = await verifyCompleteSetOnNewReadOnlyConnection(
              payload,
              plan,
              runPlan.baseline.authenticated_pokemon_count,
            );
            return { status: "complete_exact_reconciled", database_writes: false, proof };
          }
          return processApplySet(
            payload,
            plan,
            runPlan.baseline.authenticated_pokemon_count,
          );
        },
        args.retries,
        async (attempt, error) => {
          const retry = {
            source_set_id: batch.source_set_id,
            code: batch.code,
            attempt,
            error_code: error?.code ?? null,
            error_message: String(error?.message ?? error),
          };
          durableState.retries.push(retry);
          await appendProgress(outDir, { event: "transient_retry", ...retry });
          await atomicWriteJson(stateFile, durableState);
        },
      );
      const countsTowardDelta =
        args.mode === "apply" && outcome.status === "staged_promoted_and_independently_read_back";
      const completed = {
        source_set_id: batch.source_set_id,
        code: batch.code,
        completed_at: new Date().toISOString(),
        outcome,
        counts_toward_run_delta: countsTowardDelta,
        plan: { row_counts: plan.row_counts, promotion_plan_sha256: plan.promotion_plan_sha256 },
      };
      durableState.completed.push(completed);
      completedById.set(batch.source_set_id, completed);
      if (countsTowardDelta) addPlanCounts(appliedCounts, completed.plan);
      await appendProgress(outDir, { event: "set_completed", ...completed });
      await atomicWriteJson(stateFile, durableState);

      const completedCount = durableState.completed.length;
      if ([1, 25, selected.length].includes(completedCount)) {
        const global = await captureGlobalState();
        if (args.mode === "apply") assertGlobalInvariant(global, runPlan.baseline, appliedCounts);
        await appendProgress(outDir, {
          event: "automatic_safety_gate_passed",
          completed_set_count: completedCount,
          phase: batch.safety_phase,
          global_state: global,
        });
      }
    }
    durableState.status =
      args.mode === "apply"
        ? durableState.deferred.length > 0
          ? "selected_catalog_ingestion_completed_with_future_sets_deferred"
          : "selected_catalog_ingestion_completed"
        : args.mode === "rollback-canary"
          ? "selected_full_cycle_rollbacks_proven"
          : "selected_catalog_reconciled";
    await atomicWriteJson(stateFile, durableState);
  } catch (error) {
    const failure = {
      recorded_at: new Date().toISOString(),
      status: "stopped_before_next_set",
      error_code: error?.code ?? null,
      error_message: String(error?.message ?? error),
      transient: isTransientMtgIngestionErrorV1(error),
      completed_set_count: durableState.completed.length,
    };
    durableState.status = "stopped_before_next_set";
    durableState.findings.push(failure);
    await atomicWriteJson(stateFile, durableState);
    await atomicWriteJson(path.join(outDir, "failure.json"), failure);
    await appendProgress(outDir, { event: "execution_stopped", ...failure });
    throw error;
  } finally {
    await releaseExecutionLock(lockClient);
  }

  const finalGlobalState = await captureGlobalState();
  if (args.mode === "apply") {
    assertGlobalInvariant(finalGlobalState, runPlan.baseline, appliedCounts);
  }
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    mode: args.mode,
    status: durableState.status,
    repository,
    envelope: { ...envelope, execution_order: undefined },
    selected_set_count: selected.length,
    completed_set_count: durableState.completed.length,
    deferred_set_count: durableState.deferred.length,
    failed_set_count: durableState.findings.length,
    applied_counts: appliedCounts,
    retries: durableState.retries,
    deferred: durableState.deferred,
    final_global_state: finalGlobalState,
    findings: durableState.findings,
    boundaries: {
      ...envelope.boundaries,
      database_writes: args.mode === "apply" && appliedCounts.sets > 0,
      all_writes_within_frozen_envelope: true,
    },
  };
  await writeFinalArtifacts(outDir, result);
  process.stdout.write(
    `${JSON.stringify({ out_dir: outDir, status: result.status, completed: result.completed_set_count, failed: result.failed_set_count, applied_counts: appliedCounts }, null, 2)}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
