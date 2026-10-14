/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * Adds the missing active identity rows for exactly 24 existing 2004 Team
 * Rushdown replica parents. Dry-run is the default. No parent, printing,
 * mapping, price, publication, or customer rows are changed.
 */
import "../env.mjs";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";
import {
  commitMappingTransaction,
  mappingDatabaseConfig,
  mappingTransactionState,
  rollbackMappingTransaction,
} from "../pricing/exact_mapping_execution_guard_v1.mjs";
import {
  TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1,
  TCGPLAYER_WCD_TEAM_RUSHDOWN_PILOT_V1,
  uniqueWcdTeamRushdownPrintedNumberV1,
} from "../pricing/tcgplayer_wcd_team_rushdown_pilot_v1.mjs";
import {
  CANON_MAINTENANCE_DRY_RUN_ENV_V1,
  CANON_MAINTENANCE_ENABLE_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_V1,
  CANON_MAINTENANCE_MODE_ENV_V1,
  installCanonMaintenanceBoundaryV1,
} from "./canon_maintenance_boundary_v1.mjs";

const { Client } = pg;
const SCRIPT_VERSION = "WCD_TEAM_RUSHDOWN_IDENTITY_APPLY_V1";
const PROJECT_REF = "ycdxbpibncqcchqiihfz";
const EXPECTED_COUNT = 24;
const EXPECTED_SET_ID = "fd587aaa-d31e-4ed2-a146-e28d5231d10f";
const APPLY_CONFIRMATION = "WCD_TEAM_RUSHDOWN_IDENTITY_APPLY_V1";
const CONFIRMATION_ENV = "WCD_TEAM_RUSHDOWN_IDENTITY_CONFIRMATION";
const EXPECTED_FINGERPRINT_ENV = "WCD_TEAM_RUSHDOWN_IDENTITY_EXPECTED_FINGERPRINT";
const EXPECTED_COMMIT_ENV = "WCD_TEAM_RUSHDOWN_IDENTITY_EXPECTED_COMMIT_SHA";
const OUTPUT_ROOT_ENV = "WCD_TEAM_RUSHDOWN_IDENTITY_OUTPUT_ROOT";
const EVIDENCE_FILES = Object.freeze({
  "docs/audits/master_index_world_championship_decks_v1/world_championship_decks_09b_cards_source_manifest_v1.jsonl":
    "26691a7e428cafe148158df12311628b5bece10e8318f47ee3331ffba4bc3308",
  "docs/audits/master_index_world_championship_decks_v1/world_championship_decks_09b_source_acquisition_summary_v1.json":
    "d7de53757db0811b5404da0106579b4034369860807be3ba87ed3e05d02e20d3",
  "docs/audits/master_index_world_championship_decks_v1/world_championship_decks_09c_proposed_card_prints_v1.jsonl":
    "7c4eb44bf6c060ef3ce69c6131940513f57616cc265deb56f575cbcbbed0a2d1",
});

if (process.env[CANON_MAINTENANCE_ENABLE_ENV_V1] !== "true") {
  throw new Error("RUNTIME_ENFORCEMENT: canon maintenance is disabled. Set ENABLE_CANON_MAINTENANCE_MODE=true.");
}
if (process.env[CANON_MAINTENANCE_MODE_ENV_V1] !== "EXPLICIT") {
  throw new Error("RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be 'EXPLICIT'.");
}
if (process.env[CANON_MAINTENANCE_ENTRYPOINT_ENV_V1] !== CANON_MAINTENANCE_ENTRYPOINT_V1) {
  throw new Error(`RUNTIME_ENFORCEMENT: canon maintenance scripts must be launched from ${CANON_MAINTENANCE_ENTRYPOINT_V1}.`);
}

const DRY_RUN = process.env[CANON_MAINTENANCE_DRY_RUN_ENV_V1] !== "false";
const { assertCanonMaintenanceWriteAllowed } = installCanonMaintenanceBoundaryV1(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_OUTPUT_ROOT = path.join(REPO_ROOT, "artifacts", "market_pricing_product_v1", "wcd_team_rushdown_identity");
const text = (value) => String(value ?? "").trim();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const git = (args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", windowsHide: true }).trim();

function parseMode() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run");
  if (apply && dryRun) throw new Error("MODE_CONFLICT: use either --dry-run or --apply.");
  if (apply && DRY_RUN) throw new Error("RUNTIME_ENFORCEMENT: apply flag requires CANON_MAINTENANCE_DRY_RUN=false.");
  return apply && !DRY_RUN ? "apply" : "dry_run";
}

function identityIdFor(cardPrintId) {
  const chars = sha256(`${SCRIPT_VERSION}:${cardPrintId}`).slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = "8";
  const hex = chars.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function authorityBody() {
  return {
    version: SCRIPT_VERSION,
    product_authority_version: TCGPLAYER_WCD_TEAM_RUSHDOWN_PILOT_V1,
    project_ref: PROJECT_REF,
    set_id: EXPECTED_SET_ID,
    set_code: "wcd2004-team-rushdown",
    evidence_files: EVIDENCE_FILES,
    identities: TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1.map((row) => ({
      identity_id: identityIdFor(row.target.card_print_id),
      source_product_id: row.source_product_id,
      card_print_id: row.target.card_print_id,
      gv_id: row.target.gv_id,
      canonical_number: row.target.number,
      variant_key: row.target.variant_key,
    })),
  };
}
const authorityFingerprint = () => sha256(jsonBytes(authorityBody()));

function assertRegistry() {
  const rows = TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1;
  assert.equal(rows.length, EXPECTED_COUNT, "registry_count_changed");
  assert.equal(new Set(rows.map((row) => row.source_product_id)).size, EXPECTED_COUNT, "source_product_collision");
  assert.equal(new Set(rows.map((row) => row.target.card_print_id)).size, EXPECTED_COUNT, "parent_collision");
  assert.equal(new Set(rows.map((row) => identityIdFor(row.target.card_print_id))).size, EXPECTED_COUNT, "identity_id_collision");
  assert.ok(rows.every((row) => row.source_group_id === 2282 &&
    row.source_group_name === "World Championship Decks" &&
    row.source_product_name.endsWith(" - 2004 (Kevin Nguyen)") &&
    row.target.set_id === EXPECTED_SET_ID && row.target.set_code === "wcd2004-team-rushdown" &&
    row.target.variant_key === "world_championship_deck_replica" &&
    row.printing.finish_key === "normal"), "registry_scope_changed");
}

async function loadEvidence() {
  for (const [relative, expected] of Object.entries(EVIDENCE_FILES)) {
    assert.equal(sha256(await fs.readFile(path.join(REPO_ROOT, relative))), expected, `evidence_hash_changed:${relative}`);
  }
  const lines = (await fs.readFile(path.join(REPO_ROOT,
    "docs/audits/master_index_world_championship_decks_v1/world_championship_decks_09b_cards_source_manifest_v1.jsonl"), "utf8"))
    .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const team = lines.filter((row) => row.deck_year === 2004 && row.deck_name === "Team Rushdown" && row.player_name === "Kevin Nguyen");
  assert.equal(team.length, EXPECTED_COUNT, "reviewed_deck_manifest_count_changed");
  return team;
}

async function readLiveState(client) {
  const productIds = TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1.map((row) => row.source_product_id);
  const parentIds = TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1.map((row) => row.target.card_print_id);
  const printingIds = TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1.map((row) => row.printing.printing_id);
  const identityIds = parentIds.map(identityIdFor);
  const products = (await client.query(`select p.product_id,p.category_id,p.group_id,p.name,p.extended_data,p.source_active,
      p.catalog_metadata_status,g.name source_group_name,
      array_agg(distinct o.subtype_name order by o.subtype_name) filter(where o.subtype_name is not null) source_subtypes
    from public.tcgcsv_source_products p join public.tcgcsv_source_groups g on g.group_id=p.group_id
    left join public.tcgcsv_source_price_daily_observations o on o.product_id=p.product_id
    where p.product_id=any($1::integer[]) group by p.product_id,g.name order by p.product_id`, [productIds])).rows;
  const parents = (await client.query(`select c.id::text,c.set_id::text,c.set_code,c.name,c.number,c.variant_key,c.gv_id,
      c.identity_domain,c.print_identity_key,c.printed_identity_modifier,c.number_plain,c.printed_total,c.printed_set_abbrev,
      public.card_print_identity_backfill_projection_v1(s.source,c.set_code,s.code,c.number,c.number_plain,
        c.name,c.variant_key,c.printed_total,c.printed_set_abbrev) projection,
      count(distinct i.id) filter(where i.is_active)::integer active_identity_count,
      count(distinct m.id) filter(where m.active and m.source='tcgplayer')::integer active_tcgplayer_mapping_count
    from public.card_prints c join public.sets s on s.id=c.set_id
    left join public.card_print_identity i on i.card_print_id=c.id
    left join public.external_mappings m on m.card_print_id=c.id
    where c.id=any($1::uuid[]) group by c.id,s.source,s.code order by c.id`, [parentIds])).rows;
  const printings = (await client.query(`select p.id::text,p.card_print_id::text,p.finish_key,p.printing_gv_id,p.is_provisional,
      p.provenance_source,p.provenance_ref,coalesce(f.is_active,false) finish_active,
      r.review_status,r.public_visibility
    from public.card_printings p left join public.finish_keys f on f.key=p.finish_key
    left join lateral (select tr.review_status,tr.public_visibility from public.card_printing_truth_reviews tr
      where tr.card_printing_id=p.id and tr.active order by tr.created_at desc nulls last,tr.id desc limit 1) r on true
    where p.id=any($1::uuid[]) order by p.id`, [printingIds])).rows;
  const sourceMappings = (await client.query(`select id::text,external_id,card_print_id::text,active from public.external_mappings
    where source='tcgplayer' and active and external_id=any($1::text[]) order by external_id`, [productIds.map(String)])).rows;
  const identityIdCollisions = (await client.query(`select id::text,card_print_id::text,is_active from public.card_print_identity
    where id=any($1::uuid[]) order by id`, [identityIds])).rows;
  const hashes = parents.map((row) => row.projection?.identity_key_hash).filter(Boolean);
  const identityHashCollisions = hashes.length ? (await client.query(`select id::text,card_print_id::text,identity_key_hash,is_active
    from public.card_print_identity where is_active and identity_domain='pokemon_eng_standard'
      and identity_key_version='pokemon_eng_standard:v1' and identity_key_hash=any($1::text[])
    order by identity_key_hash,id`, [hashes])).rows : [];
  return { products, parents, printings, source_mappings: sourceMappings,
    identity_id_collisions: identityIdCollisions, identity_hash_collisions: identityHashCollisions };
}

function assertLivePreconditions(live) {
  assert.equal(live.products.length, EXPECTED_COUNT, "live_product_count_changed");
  assert.equal(live.parents.length, EXPECTED_COUNT, "live_parent_count_changed");
  assert.equal(live.printings.length, EXPECTED_COUNT, "live_printing_count_changed");
  assert.equal(live.source_mappings.length, 0, "source_mapping_now_exists");
  assert.equal(live.identity_id_collisions.length, 0, "deterministic_identity_id_collision");
  assert.equal(live.identity_hash_collisions.length, 0, "active_identity_hash_collision");
  for (const authority of TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1) {
    const product = live.products.find((row) => Number(row.product_id) === authority.source_product_id);
    const parent = live.parents.find((row) => row.id === authority.target.card_print_id);
    const printing = live.printings.find((row) => row.id === authority.printing.printing_id);
    assert.ok(product && parent && printing, `live_identity_missing:${authority.source_product_id}`);
    assert.equal(Number(product.category_id), 3); assert.equal(Number(product.group_id), 2282);
    assert.equal(product.source_group_name, authority.source_group_name); assert.equal(product.name, authority.source_product_name);
    assert.equal(uniqueWcdTeamRushdownPrintedNumberV1(product.extended_data), authority.printed_number);
    assert.deepEqual(product.source_subtypes, ["Normal"]); assert.equal(product.source_active, true);
    assert.equal(product.catalog_metadata_status, "current");
    assert.equal(parent.set_id, authority.target.set_id); assert.equal(parent.set_code, authority.target.set_code);
    assert.equal(parent.name, authority.target.name); assert.equal(text(parent.number), authority.target.number);
    assert.equal(parent.variant_key, authority.target.variant_key); assert.equal(parent.gv_id, authority.target.gv_id);
    assert.equal(parent.identity_domain, "pokemon_eng_standard"); assert.equal(Number(parent.active_identity_count), 0);
    assert.equal(Number(parent.active_tcgplayer_mapping_count), 0);
    assert.equal(parent.projection?.status, "ready"); assert.equal(parent.projection?.identity_domain, "pokemon_eng_standard");
    assert.equal(parent.projection?.identity_key_version, "pokemon_eng_standard:v1");
    assert.equal(parent.projection?.set_code_identity, "wcd2004-team-rushdown");
    assert.equal(parent.projection?.printed_number, authority.target.number);
    assert.match(parent.projection?.identity_key_hash ?? "", /^[a-f0-9]{64}$/);
    assert.equal(parent.projection?.identity_payload?.variant_key_current, "world_championship_deck_replica");
    assert.equal(printing.card_print_id, authority.target.card_print_id); assert.equal(printing.finish_key, "normal");
    assert.equal(printing.printing_gv_id, authority.printing.printing_gv_id); assert.equal(printing.is_provisional, false);
    assert.equal(printing.provenance_source, authority.printing.provenance_source);
    assert.equal(printing.provenance_ref, authority.printing.provenance_ref); assert.equal(printing.finish_active, true);
    assert.equal(printing.review_status, "verified"); assert.equal(printing.public_visibility, "visible");
  }
}

function buildPayload(live) {
  return TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1.map((authority) => {
    const projection = live.parents.find((row) => row.id === authority.target.card_print_id).projection;
    return { id: identityIdFor(authority.target.card_print_id), card_print_id: authority.target.card_print_id,
      identity_domain: projection.identity_domain, set_code_identity: projection.set_code_identity,
      printed_number: projection.printed_number, normalized_printed_name: projection.normalized_printed_name,
      source_name_raw: projection.source_name_raw, identity_payload: projection.identity_payload,
      identity_key_version: projection.identity_key_version, identity_key_hash: projection.identity_key_hash,
      is_active: true };
  }).sort((a, b) => a.card_print_id.localeCompare(b.card_print_id));
}

async function insertIdentities(client, payload) {
  assertCanonMaintenanceWriteAllowed();
  return (await client.query(`insert into public.card_print_identity (
      id,card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,
      source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active)
    select item.id,item.card_print_id,item.identity_domain,item.set_code_identity,item.printed_number,
      item.normalized_printed_name,item.source_name_raw,item.identity_payload,item.identity_key_version,
      item.identity_key_hash,item.is_active
    from jsonb_to_recordset($1::jsonb) as item(id uuid,card_print_id uuid,identity_domain text,
      set_code_identity text,printed_number text,normalized_printed_name text,source_name_raw text,
      identity_payload jsonb,identity_key_version text,identity_key_hash text,is_active boolean)
    order by item.card_print_id
    returning id::text,card_print_id::text,identity_domain,set_code_identity,printed_number,
      normalized_printed_name,source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active`,
  [JSON.stringify(payload)])).rows;
}

async function readIdentities(client, ids) {
  return (await client.query(`select id::text,card_print_id::text,identity_domain,set_code_identity,printed_number,
      normalized_printed_name,source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active
    from public.card_print_identity where id=any($1::uuid[]) order by card_print_id`, [ids])).rows;
}

function assertReadback(rows, payload) {
  assert.equal(rows.length, EXPECTED_COUNT, `identity_readback_count:${rows.length}`);
  for (const expected of payload) {
    const row = rows.find((candidate) => candidate.id === expected.id);
    assert.ok(row, `identity_missing:${expected.id}`);
    assert.deepEqual(row, expected, `identity_readback_mismatch:${expected.id}`);
  }
}

async function freshReadback(databaseConfig, ids) {
  const client = new Client(databaseConfig); await client.connect();
  try {
    if (databaseConfig.ssl && client.connection.stream.authorized !== true) throw new Error("IDENTITY_READBACK_TLS_NOT_AUTHORIZED");
    await client.query("begin transaction isolation level repeatable read read only");
    const rows = await readIdentities(client, ids); await client.query("commit"); return rows;
  } finally { await client.end().catch(() => {}); }
}

async function writeArtifacts(outDir, files) {
  await fs.mkdir(outDir, { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    await fs.writeFile(path.join(outDir, name), typeof value === "string" ? value : jsonBytes(value), { flag: "wx" });
  }
}

async function main() {
  const mode = parseMode(); assertRegistry(); const evidence = await loadEvidence();
  const fingerprint = authorityFingerprint(); const commitSha = git(["rev-parse", "HEAD"]);
  const trackedClean = git(["status", "--porcelain", "--untracked-files=no"]) === "";
  const publicUrl = new URL(process.env.SUPABASE_URL ?? "");
  assert.equal(publicUrl.hostname, `${PROJECT_REF}.supabase.co`, "production_project_ref_mismatch");
  if (mode === "apply") {
    assert.equal(process.env[CONFIRMATION_ENV], APPLY_CONFIRMATION, `${CONFIRMATION_ENV}_MISMATCH`);
    assert.equal(text(process.env[EXPECTED_FINGERPRINT_ENV]).toLowerCase(), fingerprint, `${EXPECTED_FINGERPRINT_ENV}_MISMATCH`);
    assert.match(text(process.env[EXPECTED_COMMIT_ENV]), /^[a-f0-9]{40}$/, `${EXPECTED_COMMIT_ENV}_REQUIRED`);
    assert.equal(commitSha, text(process.env[EXPECTED_COMMIT_ENV]), "PRODUCING_COMMIT_MISMATCH");
    assert.equal(trackedClean, true, "TRACKED_WORKTREE_NOT_CLEAN");
  }
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  assert.ok(connectionString, "database_connection_string_required");
  const databaseConfig = mappingDatabaseConfig(connectionString, { mode });
  const outDir = path.join(path.resolve(process.env[OUTPUT_ROOT_ENV] || DEFAULT_OUTPUT_ROOT), `${stamp()}_${mode}`);
  const maintenanceRunId = randomUUID(); const client = new Client(databaseConfig);
  let live; let payload = []; let inserted = []; let precommitReadback = []; let postTransactionReadback = [];
  const transaction = mappingTransactionState();
  try {
    await client.connect();
    if (databaseConfig.ssl && client.connection.stream.authorized !== true) throw new Error("IDENTITY_TLS_NOT_AUTHORIZED");
    await client.query(mode === "apply" ? "begin isolation level serializable" : "begin transaction isolation level repeatable read read only");
    await client.query("set local statement_timeout = '120s'");
    if (mode === "apply") await client.query("select pg_advisory_xact_lock(hashtext('wcd_team_rushdown_identity_apply_v1'))");
    live = await readLiveState(client); assertLivePreconditions(live); payload = buildPayload(live);
    if (mode === "apply") {
      inserted = await insertIdentities(client, payload); assert.equal(inserted.length, EXPECTED_COUNT, "identity_insert_count");
      precommitReadback = await readIdentities(client, payload.map((row) => row.id));
      assertReadback(precommitReadback, payload); assert.equal(authorityFingerprint(), fingerprint, "authority_changed_before_commit");
      await commitMappingTransaction(client, transaction);
    } else await rollbackMappingTransaction(client, transaction);
  } catch (error) {
    if (!transaction.rollback_attempted) await rollbackMappingTransaction(client, transaction).catch(() => {});
    await writeArtifacts(outDir, { "authority.json": authorityBody(), "live_precondition_readback.json": live ?? {},
      "identity_payload.json": payload, "inserted_identities.json": inserted, "precommit_readback.json": precommitReadback,
      "summary.json": { script_version: SCRIPT_VERSION,
        status: transaction.commit_uncertain || transaction.rollback_uncertain || transaction.committed ? "reconciliation_required" : "failed",
        mode,maintenance_run_id:maintenanceRunId,commit_sha:commitSha,authority_fingerprint:fingerprint,...transaction,
        automatic_retry_allowed:false,error:error instanceof Error?error.message:String(error) } });
    throw error;
  } finally { await client.end().catch(() => {}); }
  try {
    postTransactionReadback = await freshReadback(databaseConfig, payload.map((row) => row.id));
    if (mode === "apply") assertReadback(postTransactionReadback, payload);
    else assert.equal(postTransactionReadback.length, 0, "dry_run_durable_write_detected");
  } catch (error) {
    await writeArtifacts(outDir, { "authority.json": authorityBody(), "reviewed_deck_manifest.json": evidence,
      "live_precondition_readback.json": live, "identity_payload.json": payload, "inserted_identities.json": inserted,
      "precommit_readback.json": precommitReadback, "post_transaction_readback.json": postTransactionReadback,
      "summary.json": { script_version: SCRIPT_VERSION, status:"reconciliation_required", mode,
        maintenance_run_id:maintenanceRunId,commit_sha:commitSha,authority_fingerprint:fingerprint,...transaction,
        automatic_retry_allowed:false,error:error instanceof Error?error.message:String(error) } });
    throw error;
  }
  const summary={script_version:SCRIPT_VERSION,status:"passed",mode,maintenance_run_id:maintenanceRunId,
    commit_sha:commitSha,tracked_worktree_clean:trackedClean,authority_fingerprint:fingerprint,
    planned_identity_count:EXPECTED_COUNT,inserted_count:inserted.length,
    precommit_readback_count:precommitReadback.length,post_transaction_readback_count:postTransactionReadback.length,
    ...transaction,database_writes:mode==="apply"?inserted.length:0,mapping_writes:0,price_writes:0,
    publication_writes:0,customer_state_writes:0};
  await writeArtifacts(outDir,{"authority.json":authorityBody(),"reviewed_deck_manifest.json":evidence,
    "live_precondition_readback.json":live,"identity_payload.json":payload,"inserted_identities.json":inserted,
    "precommit_readback.json":precommitReadback,"post_transaction_readback.json":postTransactionReadback,"summary.json":summary});
  process.stdout.write(`${JSON.stringify({...summary,artifact_root:path.relative(REPO_ROOT,outDir).replace(/\\/g,"/")},null,2)}\n`);
}

main().catch((error)=>{console.error(`[wcd-team-rushdown-identity] ${error.stack||error.message}`);process.exitCode=1;});
