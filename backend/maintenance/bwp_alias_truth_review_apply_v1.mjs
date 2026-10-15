/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * Adds verified, visible printing truth reviews for exactly two existing
 * Black and White Promos Holo printings. The command is
 * dry-run by default and must be launched through run_canon_maintenance_v1.
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
  TCGPLAYER_BWP_ALIAS_PRODUCT_IDENTITIES_V1,
} from "../pricing/tcgplayer_bwp_alias_product_identity_authority_v1.mjs";
import {
  CANON_MAINTENANCE_DRY_RUN_ENV_V1,
  CANON_MAINTENANCE_ENABLE_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_V1,
  CANON_MAINTENANCE_MODE_ENV_V1,
  installCanonMaintenanceBoundaryV1,
} from "./canon_maintenance_boundary_v1.mjs";

const { Client } = pg;
const SCRIPT_VERSION = "BWP_ALIAS_TRUTH_REVIEW_APPLY_V1";
const PROJECT_REF = "ycdxbpibncqcchqiihfz";
const EXPECTED_COUNT = 2;
const EXPECTED_SET_ID = "61bceb95-9799-4349-963f-d9e6f8a3c69b";
const APPLY_CONFIRMATION = "BWP_ALIAS_TRUTH_REVIEW_APPLY_V1";
const CONFIRMATION_ENV = "BWP_ALIAS_TRUTH_REVIEW_CONFIRMATION";
const EXPECTED_FINGERPRINT_ENV = "BWP_ALIAS_TRUTH_REVIEW_EXPECTED_FINGERPRINT";
const EXPECTED_COMMIT_ENV = "BWP_ALIAS_TRUTH_REVIEW_EXPECTED_COMMIT_SHA";
const OUTPUT_ROOT_ENV = "BWP_ALIAS_TRUTH_REVIEW_OUTPUT_ROOT";
const CARDS_RELATIVE = "docs/audits/english_master_index_publishable_v1/sets/bwp/cards.json";
const PRINTINGS_RELATIVE = "docs/audits/english_master_index_publishable_v1/sets/bwp/printings.json";
const EXPECTED_CARDS_SHA256 = "03a07ff22058ecb14f1eb43210bcd169c42a98fec83dc1c77b57de530a092a84";
const EXPECTED_PRINTINGS_SHA256 = "43ef9c12b2874d81bbdedeb3f37d650641e532b1fd7fc7e5ff36d87735c5bbb1";
const REVIEW_REASON = "Exact printing supported by the reviewed English Master Index; this review covers only the selected Black and White Promos Holo printing.";

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
const DEFAULT_OUTPUT_ROOT = path.join(REPO_ROOT, "artifacts", "market_pricing_product_v1", "bwp_alias_truth_review");

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

function reviewIdFor(printingId) {
  const chars = sha256(`${SCRIPT_VERSION}:${printingId}`).slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = "8";
  const hex = chars.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function authorityBody() {
  return {
    version: SCRIPT_VERSION,
    project_ref: PROJECT_REF,
    set_id: EXPECTED_SET_ID,
    set_code: "bwp",
    cards_sha256: EXPECTED_CARDS_SHA256,
    printings_sha256: EXPECTED_PRINTINGS_SHA256,
    reviews: TCGPLAYER_BWP_ALIAS_PRODUCT_IDENTITIES_V1.map((row) => ({
      review_id: reviewIdFor(row.printing.printing_id),
      source_product_id: row.source_product_id,
      card_print_id: row.target.card_print_id,
      printing_id: row.printing.printing_id,
      printing_gv_id: row.printing.printing_gv_id,
      finish_key: row.printing.finish_key,
    })),
  };
}

function authorityFingerprint() {
  return sha256(jsonBytes(authorityBody()));
}

function assertRegistry() {
  const rows = TCGPLAYER_BWP_ALIAS_PRODUCT_IDENTITIES_V1;
  assert.equal(rows.length, EXPECTED_COUNT, "registry_count_changed");
  assert.equal(new Set(rows.map((row) => row.source_product_id)).size, EXPECTED_COUNT, "source_product_collision");
  assert.equal(new Set(rows.map((row) => row.target.card_print_id)).size, EXPECTED_COUNT, "parent_collision");
  assert.equal(new Set(rows.map((row) => row.printing.printing_id)).size, EXPECTED_COUNT, "printing_collision");
  assert.ok(rows.every((row) => row.source_group_id === 1407 &&
    row.source_group_name === "Black and White Promos" &&
    row.target.set_id === EXPECTED_SET_ID && row.target.set_code === "bwp" &&
    row.printing.finish_key === "holo"), "registry_scope_changed");
}

async function loadMasterEvidence() {
  const cardsPath = path.join(REPO_ROOT, CARDS_RELATIVE);
  const printingsPath = path.join(REPO_ROOT, PRINTINGS_RELATIVE);
  const [cardsBytes, printingsBytes] = await Promise.all([fs.readFile(cardsPath), fs.readFile(printingsPath)]);
  assert.equal(sha256(cardsBytes), EXPECTED_CARDS_SHA256, "master_cards_hash_changed");
  assert.equal(sha256(printingsBytes), EXPECTED_PRINTINGS_SHA256, "master_printings_hash_changed");
  const cards = JSON.parse(cardsBytes.toString("utf8")).cards;
  const printings = JSON.parse(printingsBytes.toString("utf8")).printings;
  const evidence = new Map();
  for (const authority of TCGPLAYER_BWP_ALIAS_PRODUCT_IDENTITIES_V1) {
    const cardRows = cards.filter((row) => row.set_key === "bwp" &&
      text(row.card_number).toUpperCase() === authority.target.number.toUpperCase() &&
      row.card_name === authority.target.name && row.status === "master_verified");
    const printingRows = printings.filter((row) => row.set_key === "bwp" &&
      text(row.card_number).toUpperCase() === authority.target.number.toUpperCase() &&
      row.card_name === authority.target.name && row.finish_key === "holo" &&
      row.status === "master_verified");
    assert.equal(cardRows.length, 1, `master_card_evidence_changed:${authority.source_product_id}`);
    assert.equal(printingRows.length, 1, `master_printing_evidence_changed:${authority.source_product_id}`);
    assert.ok(Number(cardRows[0].source_count) >= 2, `master_card_source_count_low:${authority.source_product_id}`);
    assert.ok(Number(printingRows[0].source_count) >= 2, `master_printing_source_count_low:${authority.source_product_id}`);
    evidence.set(authority.printing.printing_id, { card: cardRows[0], printing: printingRows[0] });
  }
  return evidence;
}

function numberField(extendedData) {
  return text((Array.isArray(extendedData) ? extendedData : [])
    .find((field) => text(field?.name).toLowerCase() === "number")?.value);
}

async function readLiveState(client) {
  const registry = TCGPLAYER_BWP_ALIAS_PRODUCT_IDENTITIES_V1;
  const productIds = registry.map((row) => row.source_product_id);
  const parentIds = registry.map((row) => row.target.card_print_id);
  const printingIds = registry.map((row) => row.printing.printing_id);
  const reviewIds = registry.map((row) => reviewIdFor(row.printing.printing_id));
  const products = await client.query(`select p.product_id,p.category_id,p.group_id,p.name,p.extended_data,p.source_active,
      p.catalog_metadata_status,g.name source_group_name
      from public.tcgcsv_source_products p join public.tcgcsv_source_groups g on g.group_id=p.group_id
      where p.product_id=any($1::integer[]) order by p.product_id`, [productIds]);
  const parents = await client.query(`select c.id::text,c.set_id::text,c.set_code,c.name,c.number,c.variant_key,c.gv_id,c.identity_domain,
      count(distinct i.id) filter(where i.is_active and i.identity_domain='pokemon_eng_standard')::integer active_standard_identity_count
      from public.card_prints c left join public.card_print_identity i on i.card_print_id=c.id
      where c.id=any($1::uuid[]) group by c.id order by c.id`, [parentIds]);
  const printings = await client.query(`select p.id::text,p.card_print_id::text,p.finish_key,p.printing_gv_id,p.is_provisional,
      p.provenance_source,p.provenance_ref,coalesce(f.is_active,false) finish_active,
      r.id::text active_review_id,r.review_status active_review_status,r.public_visibility active_public_visibility
      from public.card_printings p left join public.finish_keys f on f.key=p.finish_key
      left join lateral (select tr.id,tr.review_status,tr.public_visibility from public.card_printing_truth_reviews tr
        where tr.card_printing_id=p.id and tr.active=true order by tr.created_at desc nulls last,tr.id desc limit 1) r on true
      where p.id=any($1::uuid[]) order by p.id`, [printingIds]);
  const mappings = await client.query(`select id::text,source,external_id,card_print_id::text,active from public.external_mappings
      where source='tcgplayer' and active and (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))
      order by external_id`, [productIds.map(String), parentIds]);
  const reviewIdCollisions = await client.query(`select id::text,card_printing_id::text,active from public.card_printing_truth_reviews
      where id=any($1::uuid[]) order by id`, [reviewIds]);
  return { products: products.rows, parents: parents.rows, printings: printings.rows,
    mappings: mappings.rows, review_id_collisions: reviewIdCollisions.rows };
}

function assertLivePreconditions(live) {
  assert.equal(live.products.length, EXPECTED_COUNT, "live_product_count_changed");
  assert.equal(live.parents.length, EXPECTED_COUNT, "live_parent_count_changed");
  assert.equal(live.printings.length, EXPECTED_COUNT, "live_printing_count_changed");
  assert.equal(live.mappings.length, 0, "source_or_target_mapping_now_exists");
  assert.equal(live.review_id_collisions.length, 0, "deterministic_review_id_collision");
  for (const authority of TCGPLAYER_BWP_ALIAS_PRODUCT_IDENTITIES_V1) {
    const product = live.products.find((row) => Number(row.product_id) === authority.source_product_id);
    const parent = live.parents.find((row) => row.id === authority.target.card_print_id);
    const printing = live.printings.find((row) => row.id === authority.printing.printing_id);
    assert.ok(product && parent && printing, `live_identity_missing:${authority.source_product_id}`);
    assert.equal(Number(product.category_id), 3); assert.equal(Number(product.group_id), authority.source_group_id);
    assert.equal(product.source_group_name, authority.source_group_name); assert.equal(product.name, authority.source_product_name);
    assert.equal(numberField(product.extended_data), authority.printed_number);
    assert.equal(product.source_active, true); assert.equal(product.catalog_metadata_status, "current");
    assert.equal(parent.set_id, authority.target.set_id); assert.equal(parent.set_code, authority.target.set_code);
    assert.equal(parent.name, authority.target.name); assert.equal(text(parent.number), authority.target.number);
    assert.equal(parent.variant_key ?? "", authority.target.variant_key); assert.equal(parent.gv_id, authority.target.gv_id);
    assert.equal(parent.identity_domain, "pokemon_eng_standard"); assert.equal(Number(parent.active_standard_identity_count), 1);
    assert.equal(printing.card_print_id, authority.target.card_print_id); assert.equal(printing.finish_key, "holo");
    assert.equal(printing.printing_gv_id, authority.printing.printing_gv_id); assert.equal(printing.is_provisional, false);
    assert.equal(printing.provenance_source, authority.printing.provenance_source);
    assert.equal(printing.provenance_ref, authority.printing.provenance_ref); assert.equal(printing.finish_active, true);
    assert.equal(printing.active_review_id, null, `active_truth_review_now_exists:${authority.source_product_id}`);
  }
}

function buildReviewPayload(evidence, reviewedAt, fingerprint) {
  return TCGPLAYER_BWP_ALIAS_PRODUCT_IDENTITIES_V1.map((authority) => {
    const source = evidence.get(authority.printing.printing_id);
    const checked = [...new Set([...(source.card.evidence_urls ?? []), ...(source.printing.evidence_urls ?? [])])].sort();
    const finishSources = [...new Set(source.printing.evidence_urls ?? [])].sort();
    return {
      id: reviewIdFor(authority.printing.printing_id), card_printing_id: authority.printing.printing_id,
      reason: REVIEW_REASON, evidence_sources_checked: checked, evidence_sources_for_finish: finishSources,
      evidence: { version: SCRIPT_VERSION, authority_fingerprint: fingerprint,
        source_product_id: authority.source_product_id, card_print_id: authority.target.card_print_id,
        printing_id: authority.printing.printing_id, printing_gv_id: authority.printing.printing_gv_id,
        finish_key: "holo", cards_sha256: EXPECTED_CARDS_SHA256, printings_sha256: EXPECTED_PRINTINGS_SHA256,
        master_card: source.card, master_printing: source.printing },
      reviewed_at: reviewedAt,
    };
  });
}

async function insertReviews(client, payload) {
  assertCanonMaintenanceWriteAllowed();
  return (await client.query(`insert into public.card_printing_truth_reviews (
      id,card_printing_id,review_status,public_visibility,active,reason,confidence,
      evidence_sources_checked,evidence_sources_for_finish,expected_finish_keys,evidence,
      source_report_path,reviewed_by,reviewed_at)
    select item.id,item.card_printing_id,'verified','visible',true,item.reason,'high',
      item.evidence_sources_checked,item.evidence_sources_for_finish,array['holo']::text[],item.evidence,
      $2::text,$3::text,item.reviewed_at
    from jsonb_to_recordset($1::jsonb) as item(
      id uuid,card_printing_id uuid,reason text,evidence_sources_checked text[],
      evidence_sources_for_finish text[],evidence jsonb,reviewed_at timestamptz)
    order by item.card_printing_id
    returning id::text,card_printing_id::text,review_status,public_visibility,active,reason,confidence,
      evidence_sources_checked,evidence_sources_for_finish,expected_finish_keys,evidence,
      source_report_path,reviewed_by,reviewed_at`, [JSON.stringify(payload),
      `${CARDS_RELATIVE}|${PRINTINGS_RELATIVE}`, SCRIPT_VERSION])).rows;
}

async function readReviews(client, ids) {
  return (await client.query(`select id::text,card_printing_id::text,review_status,public_visibility,active,
      reason,confidence,evidence_sources_checked,evidence_sources_for_finish,expected_finish_keys,evidence,
      source_report_path,reviewed_by,reviewed_at
    from public.card_printing_truth_reviews where id=any($1::uuid[]) order by card_printing_id`, [ids])).rows;
}

function assertReviewReadback(rows, payload, fingerprint) {
  assert.equal(rows.length, EXPECTED_COUNT, `truth_review_readback_count:${rows.length}`);
  for (const expected of payload) {
    const row = rows.find((candidate) => candidate.id === expected.id);
    assert.ok(row, `truth_review_missing:${expected.id}`);
    assert.equal(row.card_printing_id, expected.card_printing_id); assert.equal(row.review_status, "verified");
    assert.equal(row.public_visibility, "visible"); assert.equal(row.active, true); assert.equal(row.reason, REVIEW_REASON);
    assert.equal(row.confidence, "high"); assert.deepEqual(row.expected_finish_keys, ["holo"]);
    assert.equal(row.reviewed_by, SCRIPT_VERSION);
    assert.equal(row.source_report_path, `${CARDS_RELATIVE}|${PRINTINGS_RELATIVE}`);
    assert.equal(row.evidence?.authority_fingerprint, fingerprint);
    assert.equal(row.evidence?.printing_id, expected.card_printing_id);
  }
}

async function freshReviewReadback(databaseConfig, ids) {
  const client = new Client(databaseConfig);
  await client.connect();
  try {
    if (databaseConfig.ssl && client.connection.stream.authorized !== true) throw new Error("TRUTH_REVIEW_TLS_NOT_AUTHORIZED");
    await client.query("begin transaction isolation level repeatable read read only");
    const rows = await readReviews(client, ids);
    await client.query("commit");
    return rows;
  } finally { await client.end().catch(() => {}); }
}

async function writeArtifacts(outDir, files) {
  await fs.mkdir(outDir, { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    await fs.writeFile(path.join(outDir, name), typeof value === "string" ? value : jsonBytes(value), { flag: "wx" });
  }
}

async function main() {
  const mode = parseMode();
  assertRegistry();
  const evidence = await loadMasterEvidence();
  const fingerprint = authorityFingerprint();
  const commitSha = git(["rev-parse", "HEAD"]);
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
  const outRoot = path.resolve(process.env[OUTPUT_ROOT_ENV] || DEFAULT_OUTPUT_ROOT);
  const outDir = path.join(outRoot, `${stamp()}_${mode}`);
  const maintenanceRunId = randomUUID();
  const reviewedAt = new Date().toISOString();
  const payload = buildReviewPayload(evidence, reviewedAt, fingerprint);
  const client = new Client(databaseConfig);
  let live;
  let inserted = [];
  let precommitReadback = [];
  let postTransactionReadback = [];
  const transaction = mappingTransactionState();
  try {
    await client.connect();
    if (databaseConfig.ssl && client.connection.stream.authorized !== true) throw new Error("TRUTH_REVIEW_TLS_NOT_AUTHORIZED");
    await client.query(mode === "apply" ? "begin isolation level serializable" : "begin transaction isolation level repeatable read read only");
    await client.query("set local statement_timeout = '120s'");
    if (mode === "apply") await client.query("select pg_advisory_xact_lock(hashtext('bwp_alias_truth_review_apply_v1'))");
    live = await readLiveState(client);
    assertLivePreconditions(live);
    if (mode === "apply") {
      inserted = await insertReviews(client, payload);
      assert.equal(inserted.length, EXPECTED_COUNT, `truth_review_insert_count:${inserted.length}`);
      precommitReadback = await readReviews(client, payload.map((row) => row.id));
      assertReviewReadback(precommitReadback, payload, fingerprint);
      assert.equal(authorityFingerprint(), fingerprint, "authority_changed_before_commit");
      await commitMappingTransaction(client, transaction);
    } else {
      await rollbackMappingTransaction(client, transaction);
    }
  } catch (error) {
    if (!transaction.rollback_attempted) {
      await rollbackMappingTransaction(client, transaction).catch(() => {});
    }
    await writeArtifacts(outDir, {
      "authority.json": authorityBody(), "live_precondition_readback.json": live ?? {},
      "inserted_truth_reviews.json": inserted, "precommit_readback.json": precommitReadback,
      "summary.json": { script_version: SCRIPT_VERSION,
        status: transaction.commit_uncertain || transaction.rollback_uncertain || transaction.committed
          ? "reconciliation_required" : "failed",
        mode, maintenance_run_id: maintenanceRunId, commit_sha: commitSha, authority_fingerprint: fingerprint,
        ...transaction, automatic_retry_allowed: false,
        error: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  } finally { await client.end().catch(() => {}); }

  try {
    postTransactionReadback = await freshReviewReadback(databaseConfig, payload.map((row) => row.id));
    if (mode === "apply") assertReviewReadback(postTransactionReadback, payload, fingerprint);
    else assert.equal(postTransactionReadback.length, 0, "dry_run_durable_write_detected");
  } catch (error) {
    await writeArtifacts(outDir, {
      "authority.json": authorityBody(), "review_payload.json": payload,
      "live_precondition_readback.json": live, "inserted_truth_reviews.json": inserted,
      "precommit_readback.json": precommitReadback, "post_transaction_readback.json": postTransactionReadback,
      "summary.json": { script_version: SCRIPT_VERSION,
        status: transaction.commit_uncertain || transaction.rollback_uncertain || transaction.committed
          ? "reconciliation_required" : "failed",
        mode, maintenance_run_id: maintenanceRunId, commit_sha: commitSha, authority_fingerprint: fingerprint,
        planned_review_count: EXPECTED_COUNT, inserted_count: inserted.length,
        precommit_readback_count: precommitReadback.length, post_transaction_readback_count: postTransactionReadback.length,
        ...transaction, automatic_retry_allowed: false,
        database_writes: mode === "apply" ? inserted.length : 0,
        mapping_writes: 0, publication_writes: 0, customer_state_writes: 0,
        error: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
  const summary = {
    script_version: SCRIPT_VERSION, status: "passed", mode, maintenance_run_id: maintenanceRunId,
    commit_sha: commitSha, tracked_worktree_clean: trackedClean, authority_fingerprint: fingerprint,
    planned_review_count: EXPECTED_COUNT, inserted_count: inserted.length,
    precommit_readback_count: precommitReadback.length, post_transaction_readback_count: postTransactionReadback.length,
    ...transaction, database_writes: mode === "apply" ? inserted.length : 0,
    mapping_writes: 0, publication_writes: 0, customer_state_writes: 0,
  };
  await writeArtifacts(outDir, {
    "authority.json": authorityBody(), "review_payload.json": payload,
    "live_precondition_readback.json": live, "inserted_truth_reviews.json": inserted,
    "precommit_readback.json": precommitReadback, "post_transaction_readback.json": postTransactionReadback,
    "summary.json": summary,
  });
  process.stdout.write(`${JSON.stringify({ ...summary, artifact_root: path.relative(REPO_ROOT, outDir).replace(/\\/g, "/") }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`[bwp-alias-truth-review] ${error.stack || error.message}`);
  process.exitCode = 1;
});
