/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * Applies one founder-approved Pokemon TCGPlayer mapping outcome. The command
 * is dry-run by default and must be launched through run_canon_maintenance_v1.
 */
import "../env.mjs";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";
import {
  operationsSha256V1,
} from "../operations/operations_control_plane_v1.mjs";
import { assertMasterMappingBatchAuthority } from "../pricing/master_index_mapping_authority_v1.mjs";
import {
  pokemonTcgplayerMappingDatabaseConfigV1,
  validatePokemonTcgplayerMappingAuthorityV1,
} from "../operations/pokemon_tcgplayer_mapping_outcome_v1.mjs";
import {
  commitMappingTransaction,
  mappingTransactionState,
  rollbackMappingTransaction,
} from "../pricing/exact_mapping_execution_guard_v1.mjs";
import {
  CANON_MAINTENANCE_DRY_RUN_ENV_V1,
  CANON_MAINTENANCE_ENABLE_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_V1,
  CANON_MAINTENANCE_MODE_ENV_V1,
  installCanonMaintenanceBoundaryV1,
} from "./canon_maintenance_boundary_v1.mjs";

const { Client } = pg;
const SCRIPT_VERSION = "POKEMON_TCGPLAYER_MAPPING_OUTCOME_APPLY_V1";
const PROJECT_REF = "ycdxbpibncqcchqiihfz";
const CONFIRMATION = "POKEMON_TCGPLAYER_MAPPING_OUTCOME_APPLY_V1";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

if (process.env[CANON_MAINTENANCE_ENABLE_ENV_V1] !== "true") {
  throw new Error(
    "RUNTIME_ENFORCEMENT: canon maintenance is disabled. Set ENABLE_CANON_MAINTENANCE_MODE=true.",
  );
}
if (process.env[CANON_MAINTENANCE_MODE_ENV_V1] !== "EXPLICIT") {
  throw new Error("RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be EXPLICIT");
}
if (process.env[CANON_MAINTENANCE_ENTRYPOINT_ENV_V1] !== CANON_MAINTENANCE_ENTRYPOINT_V1) {
  throw new Error(`RUNTIME_ENFORCEMENT: launch through ${CANON_MAINTENANCE_ENTRYPOINT_V1}`);
}

const DRY_RUN = process.env[CANON_MAINTENANCE_DRY_RUN_ENV_V1] !== "false";
const { assertCanonMaintenanceWriteAllowed } = installCanonMaintenanceBoundaryV1(import.meta.url);
const clean = (value) => String(value ?? "").trim();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, {
  cwd: REPO_ROOT,
  encoding: "utf8",
  windowsHide: true,
}).trim();

function parseMode() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run");
  if (apply && dryRun) throw new Error("MODE_CONFLICT");
  if (apply && DRY_RUN) throw new Error("RUNTIME_ENFORCEMENT: apply requires CANON_MAINTENANCE_DRY_RUN=false");
  return apply && !DRY_RUN ? "apply" : "dry_run";
}

function numberField(extendedData) {
  return clean((Array.isArray(extendedData) ? extendedData : [])
    .find((field) => clean(field?.name).toLowerCase() === "number")?.value);
}

async function readLiveState(client, authority) {
  const sourceIds = authority.candidates.map((row) => row.source_product_id);
  const targetIds = authority.candidates.map((row) => row.target.card_print_id);
  const observationIds = [...new Set(authority.candidates.flatMap((row) =>
    row.supporting_gap_observation_ids))];
  const [sourceRun, products, targets, mappings, observations, publicationOverlap] = await Promise.all([
    client.query(`select id::text,sync_mode,status,failed_count,finished_at,artifact_hash
      from public.tcgcsv_source_sync_runs where id=$1::uuid`, [authority.source_sync_run_id]),
    client.query(`select p.product_id,p.category_id,p.group_id,p.name,p.extended_data,
      p.source_active,p.catalog_metadata_status,g.name source_group_name
      from public.tcgcsv_source_products p
      join public.tcgcsv_source_groups g on g.group_id=p.group_id
      where p.product_id=any($1::integer[]) order by p.product_id`, [sourceIds]),
    client.query(`select c.id::text card_print_id,c.gv_id,c.set_id::text,c.set_code,
      c.name,c.number,c.variant_key,to_jsonb(c) parent_snapshot,
      count(distinct i.id) filter(where i.is_active and i.identity_domain='pokemon_eng_standard')::integer
        active_standard_identity_count
      from public.card_prints c
      left join public.card_print_identity i on i.card_print_id=c.id
      where c.id=any($1::uuid[])
      group by c.id order by c.id`, [targetIds]),
    client.query(`select id::text,card_print_id::text,source,external_id,meta,synced_at,active
      from public.external_mappings
      where source='tcgplayer' and (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))
      order by external_id,id`, [sourceIds.map(String), targetIds]),
    client.query(`select id::text,product_id,last_seen_run_id::text,observed_on
      from public.tcgcsv_source_price_daily_observations
      where id=any($1::uuid[]) order by id`, [observationIds]),
    client.query(`select distinct snapshot.source_product_id,snapshot.card_print_id::text
      from public.market_price_current_publication pointer
      join public.market_price_publication_snapshots snapshot
        on snapshot.publication_set_id=pointer.publication_set_id
      where pointer.singleton and
        (snapshot.source_product_id=any($1::integer[]) or snapshot.card_print_id=any($2::uuid[]))
      order by snapshot.source_product_id,snapshot.card_print_id::text`, [sourceIds, targetIds]),
  ]);
  return {
    source_run: sourceRun.rows[0] ?? null,
    products: products.rows,
    targets: targets.rows,
    mappings: mappings.rows,
    observations: observations.rows,
    active_publication_overlap: publicationOverlap.rows,
  };
}

function classifyLiveState(authority, live) {
  const failures = [];
  const run = live.source_run;
  if (!run || run.id !== authority.source_sync_run_id || run.sync_mode !== "current_full_sync" ||
      run.status !== "completed" || Number(run.failed_count) !== 0) {
    failures.push("source_sync_run_not_completed");
  }
  if (live.products.length !== authority.expected_mapping_count) failures.push("source_product_count_changed");
  if (live.targets.length !== authority.expected_mapping_count) failures.push("target_count_changed");
  const products = new Map(live.products.map((row) => [Number(row.product_id), row]));
  const targets = new Map(live.targets.map((row) => [row.card_print_id, row]));
  const observations = new Map(live.observations.map((row) => [row.id, row]));
  const mappingsBySource = new Map();
  for (const mapping of live.mappings) {
    if (!authority.candidates.some((row) => String(row.source_product_id) === mapping.external_id)) continue;
    const rows = mappingsBySource.get(mapping.external_id) ?? [];
    rows.push(mapping);
    mappingsBySource.set(mapping.external_id, rows);
  }
  let missing = 0;
  let alreadyApplied = 0;
  for (const candidate of authority.candidates) {
    const key = String(candidate.source_product_id);
    const product = products.get(candidate.source_product_id);
    const target = targets.get(candidate.target.card_print_id);
    const rowFailures = [];
    if (!product) rowFailures.push("source_product_missing");
    else {
      if (Number(product.category_id) !== 3) rowFailures.push("source_category_changed");
      if (Number(product.group_id) !== candidate.source_group_id) rowFailures.push("source_group_changed");
      if (product.source_group_name !== candidate.source_group_name) rowFailures.push("source_group_name_changed");
      if (product.name !== candidate.source_product_name) rowFailures.push("source_name_changed");
      if (numberField(product.extended_data) !== candidate.printed_number) rowFailures.push("source_number_changed");
      if (product.source_active !== true) rowFailures.push("source_inactive");
      if (product.catalog_metadata_status !== "current") rowFailures.push("source_not_current");
    }
    if (!target) rowFailures.push("target_missing");
    else {
      if (target.gv_id !== candidate.target.gv_id) rowFailures.push("target_gv_id_changed");
      if (target.set_id !== candidate.target.set_id) rowFailures.push("target_set_id_changed");
      if (target.set_code !== candidate.target.set_code) rowFailures.push("target_set_code_changed");
      if (target.name !== candidate.target.canonical_name) rowFailures.push("target_name_changed");
      if (clean(target.number) !== candidate.target.canonical_number) rowFailures.push("target_number_changed");
      if (clean(target.variant_key) !== candidate.target.variant_key) rowFailures.push("target_variant_changed");
      if (Number(target.active_standard_identity_count) !== 1) rowFailures.push("target_identity_not_unique");
    }
    for (const observationId of candidate.supporting_gap_observation_ids) {
      const observation = observations.get(observationId);
      if (!observation) rowFailures.push("supporting_observation_missing");
      else if (Number(observation.product_id) !== candidate.source_product_id ||
          observation.last_seen_run_id !== authority.source_sync_run_id) {
        rowFailures.push("supporting_observation_provenance_changed");
      }
    }
    const sourceMappings = mappingsBySource.get(key) ?? [];
    const exact = sourceMappings.filter((row) => row.active === true &&
      row.card_print_id === candidate.target.card_print_id &&
      row.meta?.authority_fingerprint_sha256 === authority.authority_fingerprint_sha256);
    const foreignTargetMappings = live.mappings.filter((row) => row.active === true &&
      row.card_print_id === candidate.target.card_print_id && row.external_id !== key);
    if (sourceMappings.length === 0 && foreignTargetMappings.length === 0) missing += 1;
    else if (sourceMappings.length === 1 && exact.length === 1 && foreignTargetMappings.length === 0) {
      alreadyApplied += 1;
    } else rowFailures.push("source_or_target_mapping_conflict");
    if (rowFailures.length) failures.push({
      source_product_id: candidate.source_product_id,
      target_card_print_id: candidate.target.card_print_id,
      reasons: [...new Set(rowFailures)].sort(),
    });
  }
  if (missing > 0 && alreadyApplied > 0) failures.push("partial_apply_state");
  if (missing > 0 && live.active_publication_overlap.length > 0) {
    failures.push("active_publication_overlap");
  }
  return { failures, missing, alreadyApplied };
}

function mappingPayload(authority, masterAuthorityProof) {
  const exactByProduct = new Map(authority.exact_mapping_candidates.map((row) =>
    [Number(row.source_product_id), row]));
  return authority.candidates.map((candidate) => ({
    card_print_id: candidate.target.card_print_id,
    external_id: String(candidate.source_product_id),
    meta: {
      schema_version: "POKEMON_TCGPLAYER_MAPPING_OUTCOME_META_V1",
      mapping_method: "founder_approved_review_candidate",
      confidence: "founder_reviewed",
      authority_fingerprint_sha256: authority.authority_fingerprint_sha256,
      review_work_item_id: authority.review_work_item_id,
      review_work_item_version: authority.review_work_item_version,
      review_plan_fingerprint: authority.review_plan_fingerprint,
      mapping_candidate_fingerprint: exactByProduct.get(candidate.source_product_id)?.candidate_fingerprint,
      master_authority_fingerprint: masterAuthorityProof.fingerprint,
      master_authority_binding: masterAuthorityProof.bindings.find((binding) =>
        binding.candidate_fingerprint ===
          exactByProduct.get(candidate.source_product_id)?.candidate_fingerprint),
      source_pricing_run_id: authority.source_pricing_run_id,
      source_sync_run_id: authority.source_sync_run_id,
      source_group_id: candidate.source_group_id,
      source_group_name: candidate.source_group_name,
      canonical_gv_id: candidate.target.gv_id,
      supporting_gap_observation_ids: candidate.supporting_gap_observation_ids,
      producing_commit_sha: authority.source_commit_sha,
    },
  }));
}

async function insertMappings(client, authority, masterAuthorityProof) {
  assertCanonMaintenanceWriteAllowed();
  return (await client.query(`insert into public.external_mappings
      (card_print_id,source,external_id,meta,active,synced_at)
    select item.card_print_id,'tcgplayer',item.external_id,item.meta,true,now()
    from jsonb_to_recordset($1::jsonb) as item(card_print_id uuid,external_id text,meta jsonb)
    order by item.external_id::integer
    returning id::text,card_print_id::text,source,external_id,meta,active,synced_at`,
  [JSON.stringify(mappingPayload(authority, masterAuthorityProof))])).rows;
}

async function readExactMappings(client, authority) {
  const sourceIds = authority.candidates.map((row) => String(row.source_product_id));
  return (await client.query(`select id::text,card_print_id::text,source,external_id,meta,active,synced_at
    from public.external_mappings where source='tcgplayer' and external_id=any($1::text[])
    order by external_id::integer`, [sourceIds])).rows;
}

function assertReadback(authority, rows, masterAuthorityProof) {
  const exactByProduct = new Map(authority.exact_mapping_candidates.map((candidate) =>
    [Number(candidate.source_product_id), candidate]));
  assert.equal(rows.length, authority.expected_mapping_count, "durable_mapping_count_changed");
  for (const candidate of authority.candidates) {
    const row = rows.find((item) => item.external_id === String(candidate.source_product_id));
    assert.ok(row, `mapping_missing:${candidate.source_product_id}`);
    assert.equal(row.card_print_id, candidate.target.card_print_id, `mapping_target_changed:${candidate.source_product_id}`);
    assert.equal(row.source, "tcgplayer");
    assert.equal(row.active, true);
    assert.equal(row.meta?.authority_fingerprint_sha256, authority.authority_fingerprint_sha256);
    assert.equal(row.meta?.review_plan_fingerprint, authority.review_plan_fingerprint);
    const exact = exactByProduct.get(candidate.source_product_id);
    const binding = masterAuthorityProof.bindings.find((item) =>
      item.candidate_fingerprint === exact?.candidate_fingerprint);
    assert.equal(row.meta?.mapping_candidate_fingerprint, exact?.candidate_fingerprint);
    assert.equal(row.meta?.master_authority_fingerprint, masterAuthorityProof.fingerprint);
    assert.deepEqual(row.meta?.master_authority_binding, binding);
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function freshReadback(databaseConfig, authority) {
  const client = new Client(databaseConfig);
  await client.connect();
  try {
    if (databaseConfig.ssl && client.connection.stream.authorized !== true) {
      throw new Error("POKEMON_MAPPING_TLS_NOT_AUTHORIZED");
    }
    await client.query("begin transaction isolation level repeatable read read only");
    const rows = await readExactMappings(client, authority);
    await client.query("commit");
    return rows;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const mode = parseMode();
  const planPath = path.resolve(clean(process.env.POKEMON_TCGPLAYER_MAPPING_PLAN_PATH));
  const outDir = path.resolve(clean(process.env.POKEMON_TCGPLAYER_MAPPING_OUTPUT_ROOT));
  assert.ok(planPath && outDir, "Pokemon mapping plan and output paths are required");
  const planBytes = await fs.readFile(planPath);
  const planFileSha256 = sha256(planBytes);
  const authority = validatePokemonTcgplayerMappingAuthorityV1(JSON.parse(planBytes));
  const masterAuthorityProof = assertMasterMappingBatchAuthority(
    authority.exact_mapping_candidates,
    authority.master_mapping_authority,
  );
  const expectedFingerprint = clean(process.env.POKEMON_TCGPLAYER_MAPPING_EXPECTED_FINGERPRINT);
  assert.equal(authority.authority_fingerprint_sha256, expectedFingerprint, "authority_fingerprint_mismatch");
  const headSha = git("rev-parse", "HEAD");
  assert.equal(authority.source_commit_sha, headSha, "authority_source_commit_mismatch");
  assert.equal(git("status", "--porcelain", "--untracked-files=no"), "", "tracked_worktree_not_clean");
  if (mode === "apply") {
    assert.equal(process.env.POKEMON_TCGPLAYER_MAPPING_CONFIRMATION, CONFIRMATION, "apply_confirmation_mismatch");
    assert.equal(process.env.POKEMON_TCGPLAYER_MAPPING_EXPECTED_COMMIT_SHA, headSha, "expected_commit_mismatch");
  }
  const publicUrl = new URL(process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "");
  assert.equal(publicUrl.hostname, `${PROJECT_REF}.supabase.co`, "production_project_ref_mismatch");
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  assert.ok(connectionString, "database_connection_string_required");
  const databaseConfig = pokemonTcgplayerMappingDatabaseConfigV1(connectionString, { mode });
  const client = new Client(databaseConfig);
  const transaction = mappingTransactionState();
  let live = null;
  let classification = null;
  let inserted = [];
  let precommitReadback = [];
  let durableReadback = [];
  try {
    await client.connect();
    if (databaseConfig.ssl && client.connection.stream.authorized !== true) {
      throw new Error("POKEMON_MAPPING_TLS_NOT_AUTHORIZED");
    }
    await client.query(mode === "apply" ? "begin isolation level serializable" :
      "begin transaction isolation level repeatable read read only");
    await client.query("set local statement_timeout='120s'");
    if (mode === "apply") {
      await client.query("select pg_advisory_xact_lock(hashtext('tcgplayer_market_exact_mapping_apply_v1'))");
    }
    live = await readLiveState(client, authority);
    classification = classifyLiveState(authority, live);
    if (classification.failures.length) {
      throw new Error(`LIVE_PRECONDITION_FAILED:${JSON.stringify(classification.failures)}`);
    }
    assertMasterMappingBatchAuthority(
      authority.exact_mapping_candidates,
      authority.master_mapping_authority,
      { liveTargets: live.targets },
    );
    if (mode === "apply" && classification.missing === authority.expected_mapping_count) {
      inserted = await insertMappings(client, authority, masterAuthorityProof);
      assert.equal(inserted.length, authority.expected_mapping_count, "mapping_insert_count_changed");
      precommitReadback = await readExactMappings(client, authority);
      assertReadback(authority, precommitReadback, masterAuthorityProof);
      const precommitPlanBytes = await fs.readFile(planPath);
      assert.equal(sha256(precommitPlanBytes), planFileSha256, "authority_file_changed_before_commit");
      validatePokemonTcgplayerMappingAuthorityV1(JSON.parse(precommitPlanBytes), {
        sourceCommitSha: headSha,
      });
      const precommitLive = await readLiveState(client, authority);
      const precommitClassification = classifyLiveState(authority, precommitLive);
      assert.equal(precommitClassification.failures.length, 0, "live_state_changed_before_commit");
      assertMasterMappingBatchAuthority(
        authority.exact_mapping_candidates,
        authority.master_mapping_authority,
        { liveTargets: precommitLive.targets },
      );
      await commitMappingTransaction(client, transaction);
    } else if (mode === "apply") {
      assert.equal(classification.alreadyApplied, authority.expected_mapping_count, "idempotent_state_incomplete");
      await rollbackMappingTransaction(client, transaction);
    } else {
      await rollbackMappingTransaction(client, transaction);
    }
  } catch (error) {
    if (!transaction.rollback_attempted) await rollbackMappingTransaction(client, transaction).catch(() => {});
    const summary = {
      script_version: SCRIPT_VERSION,
      status: transaction.committed || transaction.commit_uncertain ? "reconciliation_required" : "failed",
      mode,
      authority_fingerprint_sha256: authority.authority_fingerprint_sha256,
      master_authority_fingerprint: masterAuthorityProof.fingerprint,
      expected_mapping_count: authority.expected_mapping_count,
      conflict_count: classification?.failures?.length ?? 1,
      ...transaction,
      error: error instanceof Error ? error.message : String(error),
    };
    await writeJson(path.join(outDir, "live_state.json"), live ?? {});
    await writeJson(path.join(outDir, "summary.json"), summary);
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
  durableReadback = await freshReadback(databaseConfig, authority);
  if (mode === "apply") assertReadback(authority, durableReadback, masterAuthorityProof);
  else assert.equal(durableReadback.length, classification.alreadyApplied,
    "dry_run_durable_mapping_state_changed");
  const liveStateFingerprint = operationsSha256V1({
    source_run: live.source_run,
    products: live.products,
    targets: live.targets,
    mappings: live.mappings,
    observations: live.observations,
    active_publication_overlap: live.active_publication_overlap,
  });
  const summary = {
    script_version: SCRIPT_VERSION,
    status: "passed",
    mode,
    authority_fingerprint_sha256: authority.authority_fingerprint_sha256,
    master_authority_fingerprint: masterAuthorityProof.fingerprint,
    expected_mapping_count: authority.expected_mapping_count,
    missing_mapping_count: classification.missing,
    already_applied_count: classification.alreadyApplied,
    inserted_mapping_count: inserted.length,
    durable_mapping_count: mode === "apply" ? durableReadback.length : classification.alreadyApplied,
    conflict_count: 0,
    live_state_fingerprint_sha256: liveStateFingerprint,
    reconciled: true,
    database_writes: mode === "apply" ? inserted.length : 0,
    mapping_writes: mode === "apply" ? inserted.length : 0,
    price_writes: 0,
    publication_writes: 0,
    customer_state_writes: 0,
    ...transaction,
  };
  await writeJson(path.join(outDir, "authority.json"), authority);
  await writeJson(path.join(outDir, "live_state.json"), live);
  await writeJson(path.join(outDir, "inserted_mappings.json"), inserted);
  await writeJson(path.join(outDir, "precommit_readback.json"), precommitReadback);
  await writeJson(path.join(outDir, "durable_readback.json"), durableReadback);
  await writeJson(path.join(outDir, "summary.json"), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});
