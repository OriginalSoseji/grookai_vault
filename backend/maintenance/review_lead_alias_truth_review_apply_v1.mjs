/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * Adds five verified, visible printing truth reviews and requires two existing
 * verified reviews across seven exact review-lead printings. The command is
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
  TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1,
} from "../pricing/tcgplayer_review_lead_alias_product_identity_authority_v1.mjs";
import { normalizeTcgplayerMappingNumberV1 } from
  "../pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";
import {
  CANON_MAINTENANCE_DRY_RUN_ENV_V1,
  CANON_MAINTENANCE_ENABLE_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_V1,
  CANON_MAINTENANCE_MODE_ENV_V1,
  installCanonMaintenanceBoundaryV1,
} from "./canon_maintenance_boundary_v1.mjs";

const { Client } = pg;
const SCRIPT_VERSION = "REVIEW_LEAD_ALIAS_TRUTH_REVIEW_APPLY_V1";
const PROJECT_REF = "ycdxbpibncqcchqiihfz";
const EXPECTED_PRODUCT_COUNT = 6;
const EXPECTED_COUNT = 7;
const EXPECTED_INSERT_COUNT = 5;
const APPLY_CONFIRMATION = "REVIEW_LEAD_ALIAS_TRUTH_REVIEW_APPLY_V1";
const CONFIRMATION_ENV = "REVIEW_LEAD_ALIAS_TRUTH_REVIEW_CONFIRMATION";
const EXPECTED_FINGERPRINT_ENV = "REVIEW_LEAD_ALIAS_TRUTH_REVIEW_EXPECTED_FINGERPRINT";
const EXPECTED_COMMIT_ENV = "REVIEW_LEAD_ALIAS_TRUTH_REVIEW_EXPECTED_COMMIT_SHA";
const OUTPUT_ROOT_ENV = "REVIEW_LEAD_ALIAS_TRUTH_REVIEW_OUTPUT_ROOT";
const SETS = Object.freeze({
  ex15: Object.freeze({ set_id: "d73bcf8f-d74e-4787-9bc9-fca8295730ad",
    cards_sha256: "1171d1763b10ecb5f741c3376405242897a73f006a2c9930a3bf203ccabada0f",
    printings_sha256: "9eaec0f839bd847a42464d1bd0102a2516b42c7766eef7f0deb443bbab195bac" }),
  smp: Object.freeze({ set_id: "d1cc00ee-68d1-4f62-9a75-a2bd4f45c693",
    cards_sha256: "97b220c301c815d81225eb19b4b4f491a1ccb42a61d071ce76718d9674b0b31f",
    printings_sha256: "9ea19a6f0acb692a0d0d6184e32495513c34f33df0190d560d005b87363b32c5" }),
  sm10: Object.freeze({ set_id: "6958fc04-24e6-45ff-b729-b0119353f734",
    cards_sha256: "66842b05a9dc9dad91f38278de978b41477ca11294009f8909cadfc732c6c4df",
    printings_sha256: "149a43277d050dc05b6b6a628520302f4469dd9a40e6229a11aaf726e7f6ade6" }),
  svp: Object.freeze({ set_id: "082139da-c6d1-4b08-ba00-2b5219bb74d6",
    cards_sha256: "7796642813faf442c2271e775723540a06f6a51405267f2d732182dc34113db1",
    printings_sha256: "47dc9bfa4c3938361ec5c6bea442a07cdff706dc86e16999529fe15195f12cc0" }),
});
const REVIEW_REASON = "Exact printing supported by the reviewed English Master Index; this review covers only the selected review-lead Normal or Holo printing.";

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
const DEFAULT_OUTPUT_ROOT = path.join(REPO_ROOT, "artifacts", "market_pricing_product_v1", "review_lead_alias_truth_review");

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
    sets: SETS,
    reviews: TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1.flatMap((row) =>
      row.printings.map((printing) => ({
        review_id: printing.expected_review_id ?? reviewIdFor(printing.printing_id),
        truth_review_action: printing.truth_review_action,
        source_product_id: row.source_product_id,
        card_print_id: row.target.card_print_id, printing_id: printing.printing_id,
        printing_gv_id: printing.printing_gv_id, finish_key: printing.finish_key,
      }))),
  };
}

function authorityFingerprint() {
  return sha256(jsonBytes(authorityBody()));
}

function assertRegistry() {
  const rows = TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1;
  const printings = rows.flatMap((row) => row.printings);
  assert.equal(rows.length, EXPECTED_PRODUCT_COUNT, "registry_count_changed");
  assert.equal(printings.length, EXPECTED_COUNT, "registry_printing_count_changed");
  assert.equal(new Set(rows.map((row) => row.source_product_id)).size, EXPECTED_PRODUCT_COUNT, "source_product_collision");
  assert.equal(new Set(rows.map((row) => row.target.card_print_id)).size, EXPECTED_PRODUCT_COUNT, "parent_collision");
  assert.equal(new Set(printings.map((row) => row.printing_id)).size, EXPECTED_COUNT, "printing_collision");
  assert.ok(rows.every((row) => SETS[row.target.set_code]?.set_id === row.target.set_id &&
    [[1411,"EX Dragon Frontiers","ex15"],[1861,"SM Promos","smp"],
      [2420,"SM - Unbroken Bonds","sm10"],[22872,"SV: Scarlet & Violet Promo Cards","svp"]]
      .some(([id,name,code]) => row.source_group_id === id && row.source_group_name === name && row.target.set_code === code)),
  "registry_scope_changed");
  assert.equal(printings.filter((row) => row.truth_review_action === "insert").length,
    EXPECTED_INSERT_COUNT, "registry_insert_count_changed");
  assert.equal(printings.filter((row) => row.truth_review_action === "require_existing").length,
    EXPECTED_COUNT - EXPECTED_INSERT_COUNT, "registry_existing_review_count_changed");
}

async function loadMasterEvidence() {
  const sources = new Map();
  for (const [setCode, expected] of Object.entries(SETS)) {
    const cardsRelative = `docs/audits/english_master_index_publishable_v1/sets/${setCode}/cards.json`;
    const printingsRelative = `docs/audits/english_master_index_publishable_v1/sets/${setCode}/printings.json`;
    const [cardsBytes, printingsBytes] = await Promise.all([
      fs.readFile(path.join(REPO_ROOT, cardsRelative)), fs.readFile(path.join(REPO_ROOT, printingsRelative)),
    ]);
    assert.equal(sha256(cardsBytes), expected.cards_sha256, `master_cards_hash_changed:${setCode}`);
    assert.equal(sha256(printingsBytes), expected.printings_sha256, `master_printings_hash_changed:${setCode}`);
    sources.set(setCode, { cardsRelative, printingsRelative,
      cards: JSON.parse(cardsBytes.toString("utf8")).cards,
      printings: JSON.parse(printingsBytes.toString("utf8")).printings });
  }
  const evidence = new Map();
  for (const authority of TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1) {
    const source = sources.get(authority.target.set_code);
    const cardRows = source.cards.filter((row) => row.set_key === authority.target.set_code &&
      normalizeTcgplayerMappingNumberV1(row.card_number) === normalizeTcgplayerMappingNumberV1(authority.target.number) &&
      row.card_name === authority.target.name && row.status === "master_verified");
    assert.equal(cardRows.length, 1, `master_card_evidence_changed:${authority.source_product_id}`);
    assert.ok(Number(cardRows[0].source_count) >= 2, `master_card_source_count_low:${authority.source_product_id}`);
    for (const printing of authority.printings) {
      const printingRows = source.printings.filter((row) => row.set_key === authority.target.set_code &&
        normalizeTcgplayerMappingNumberV1(row.card_number) === normalizeTcgplayerMappingNumberV1(authority.target.number) &&
        row.card_name === authority.target.name && row.finish_key === printing.finish_key && row.status === "master_verified");
      assert.equal(printingRows.length, 1,
        `master_printing_evidence_changed:${authority.source_product_id}:${printing.finish_key}`);
      assert.ok(Number(printingRows[0].source_count) >= 2,
        `master_printing_source_count_low:${authority.source_product_id}:${printing.finish_key}`);
      evidence.set(printing.printing_id, { card: cardRows[0], printing: printingRows[0],
        cardsRelative: source.cardsRelative, printingsRelative: source.printingsRelative,
        cardsSha256: SETS[authority.target.set_code].cards_sha256,
        printingsSha256: SETS[authority.target.set_code].printings_sha256 });
    }
  }
  return evidence;
}

function numberField(extendedData) {
  return text((Array.isArray(extendedData) ? extendedData : [])
    .find((field) => text(field?.name).toLowerCase() === "number")?.value);
}

async function readLiveState(client) {
  const registry = TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1;
  const productIds = registry.map((row) => row.source_product_id);
  const parentIds = registry.map((row) => row.target.card_print_id);
  const printingIds = registry.flatMap((row) => row.printings.map((printing) => printing.printing_id));
  const reviewIds = registry.flatMap((row) => row.printings
    .filter((printing) => printing.truth_review_action === "insert")
    .map((printing) => reviewIdFor(printing.printing_id)));
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
  assert.equal(live.products.length, EXPECTED_PRODUCT_COUNT, "live_product_count_changed");
  assert.equal(live.parents.length, EXPECTED_PRODUCT_COUNT, "live_parent_count_changed");
  assert.equal(live.printings.length, EXPECTED_COUNT, "live_printing_count_changed");
  assert.equal(live.mappings.length, 0, "source_or_target_mapping_now_exists");
  assert.equal(live.review_id_collisions.length, 0, "deterministic_review_id_collision");
  for (const authority of TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1) {
    const product = live.products.find((row) => Number(row.product_id) === authority.source_product_id);
    const parent = live.parents.find((row) => row.id === authority.target.card_print_id);
    assert.ok(product && parent, `live_identity_missing:${authority.source_product_id}`);
    assert.equal(Number(product.category_id), 3); assert.equal(Number(product.group_id), authority.source_group_id);
    assert.equal(product.source_group_name, authority.source_group_name); assert.equal(product.name, authority.source_product_name);
    assert.equal(numberField(product.extended_data), authority.printed_number);
    assert.equal(product.source_active, true); assert.equal(product.catalog_metadata_status, "current");
    assert.equal(parent.set_id, authority.target.set_id); assert.equal(parent.set_code, authority.target.set_code);
    assert.equal(parent.name, authority.target.name); assert.equal(text(parent.number), authority.target.number);
    assert.equal(parent.variant_key ?? "", authority.target.variant_key); assert.equal(parent.gv_id, authority.target.gv_id);
    assert.equal(parent.identity_domain, "pokemon_eng_standard"); assert.equal(Number(parent.active_standard_identity_count), 1);
    for (const expectedPrinting of authority.printings) {
      const printing = live.printings.find((row) => row.id === expectedPrinting.printing_id);
      assert.ok(printing, `live_printing_missing:${authority.source_product_id}:${expectedPrinting.finish_key}`);
      assert.equal(printing.card_print_id, authority.target.card_print_id);
      assert.equal(printing.finish_key, expectedPrinting.finish_key);
      assert.equal(printing.printing_gv_id, expectedPrinting.printing_gv_id); assert.equal(printing.is_provisional, false);
      assert.equal(printing.provenance_source, expectedPrinting.provenance_source);
      assert.equal(printing.provenance_ref, expectedPrinting.provenance_ref); assert.equal(printing.finish_active, true);
      if (expectedPrinting.truth_review_action === "insert") {
        assert.equal(printing.active_review_id, null,
          `active_truth_review_now_exists:${authority.source_product_id}:${expectedPrinting.finish_key}`);
      } else {
        assert.ok(printing.active_review_id,
          `required_truth_review_missing:${authority.source_product_id}:${expectedPrinting.finish_key}`);
        assert.equal(printing.active_review_id, expectedPrinting.expected_review_id,
          `required_truth_review_id_drift:${authority.source_product_id}:${expectedPrinting.finish_key}`);
        assert.equal(printing.active_review_status, "verified",
          `required_truth_review_status_drift:${authority.source_product_id}:${expectedPrinting.finish_key}`);
        assert.equal(printing.active_public_visibility, "visible",
          `required_truth_review_visibility_drift:${authority.source_product_id}:${expectedPrinting.finish_key}`);
      }
    }
  }
}

function buildReviewPayload(evidence, reviewedAt, fingerprint) {
  return TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1.flatMap((authority) =>
    authority.printings.filter((printing) => printing.truth_review_action === "insert").map((printing) => {
      const source = evidence.get(printing.printing_id);
      const checked = [...new Set([...(source.card.evidence_urls ?? []), ...(source.printing.evidence_urls ?? [])])].sort();
      const finishSources = [...new Set(source.printing.evidence_urls ?? [])].sort();
      return {
      id: reviewIdFor(printing.printing_id), card_printing_id: printing.printing_id,
      reason: REVIEW_REASON, evidence_sources_checked: checked, evidence_sources_for_finish: finishSources,
      finish_key: printing.finish_key,
      source_report_path: `${source.cardsRelative}|${source.printingsRelative}`,
      evidence: { version: SCRIPT_VERSION, authority_fingerprint: fingerprint,
        source_product_id: authority.source_product_id, card_print_id: authority.target.card_print_id,
        printing_id: printing.printing_id, printing_gv_id: printing.printing_gv_id,
        finish_key: printing.finish_key, cards_sha256: source.cardsSha256, printings_sha256: source.printingsSha256,
        master_card: source.card, master_printing: source.printing },
      reviewed_at: reviewedAt,
    };
  }));
}

async function insertReviews(client, payload) {
  assertCanonMaintenanceWriteAllowed();
  return (await client.query(`insert into public.card_printing_truth_reviews (
      id,card_printing_id,review_status,public_visibility,active,reason,confidence,
      evidence_sources_checked,evidence_sources_for_finish,expected_finish_keys,evidence,
      source_report_path,reviewed_by,reviewed_at)
    select item.id,item.card_printing_id,'verified','visible',true,item.reason,'high',
      item.evidence_sources_checked,item.evidence_sources_for_finish,array[item.finish_key]::text[],item.evidence,
      item.source_report_path,$2::text,item.reviewed_at
    from jsonb_to_recordset($1::jsonb) as item(
      id uuid,card_printing_id uuid,reason text,evidence_sources_checked text[],
      evidence_sources_for_finish text[],finish_key text,source_report_path text,evidence jsonb,reviewed_at timestamptz)
    order by item.card_printing_id
    returning id::text,card_printing_id::text,review_status,public_visibility,active,reason,confidence,
      evidence_sources_checked,evidence_sources_for_finish,expected_finish_keys,evidence,
      source_report_path,reviewed_by,reviewed_at`, [JSON.stringify(payload),
      SCRIPT_VERSION])).rows;
}

async function readReviews(client, ids) {
  return (await client.query(`select id::text,card_printing_id::text,review_status,public_visibility,active,
      reason,confidence,evidence_sources_checked,evidence_sources_for_finish,expected_finish_keys,evidence,
      source_report_path,reviewed_by,reviewed_at
    from public.card_printing_truth_reviews where id=any($1::uuid[]) order by card_printing_id`, [ids])).rows;
}

function assertReviewReadback(rows, payload, fingerprint) {
  assert.equal(rows.length, EXPECTED_INSERT_COUNT, `truth_review_readback_count:${rows.length}`);
  for (const expected of payload) {
    const row = rows.find((candidate) => candidate.id === expected.id);
    assert.ok(row, `truth_review_missing:${expected.id}`);
    assert.equal(row.card_printing_id, expected.card_printing_id); assert.equal(row.review_status, "verified");
    assert.equal(row.public_visibility, "visible"); assert.equal(row.active, true); assert.equal(row.reason, REVIEW_REASON);
    assert.equal(row.confidence, "high"); assert.deepEqual(row.expected_finish_keys, [expected.finish_key]);
    assert.equal(row.reviewed_by, SCRIPT_VERSION);
    assert.equal(row.source_report_path, expected.source_report_path);
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
    if (mode === "apply") await client.query("select pg_advisory_xact_lock(hashtext('review_lead_alias_truth_review_apply_v1'))");
    live = await readLiveState(client);
    assertLivePreconditions(live);
    if (mode === "apply") {
      inserted = await insertReviews(client, payload);
      assert.equal(inserted.length, EXPECTED_INSERT_COUNT, `truth_review_insert_count:${inserted.length}`);
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
        governed_printing_count: EXPECTED_COUNT, planned_review_count: EXPECTED_INSERT_COUNT,
        inserted_count: inserted.length,
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
    governed_printing_count: EXPECTED_COUNT, planned_review_count: EXPECTED_INSERT_COUNT,
    inserted_count: inserted.length,
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
  console.error(`[review-lead-alias-truth-review] ${error.stack || error.message}`);
  process.exitCode = 1;
});
