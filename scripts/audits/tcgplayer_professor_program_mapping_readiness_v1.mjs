import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { assertPrintingDatabaseTarget } from "../../backend/catalog/master_index_printing_execution_guard_v1.mjs";

export const TCGPLAYER_PROFESSOR_PROGRAM_MAPPING_READINESS_V1 =
  "TCGPLAYER_PROFESSOR_PROGRAM_MAPPING_READINESS_V1";

const PROJECT_REF = "ycdxbpibncqcchqiihfz";
const SOURCE_GROUP_ID = 2332;
const SOURCE_GROUP_NAME = "Professor Program Promos";
const CATALOG_PACKAGE_ID = "TCGPLAYER-PROFESSOR-PROGRAM-CATALOG-REPAIR-V1";
const CATALOG_PACKAGE_FINGERPRINT =
  "1203f252f7856cff512d85ff7d76eb45a9cf18e528166b53b519fb34a7c78820";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CATALOG_APPLY_ARTIFACT =
  "docs/audits/tcgplayer_professor_program_catalog_repair_real_apply_20261105_v1.json";

const READY = Object.freeze([
  [176629, "Prof. Oak's Research (2004-2005)", "98/112", "e402c8fc-563b-49e3-a198-6a5fe5f75cda", "eb9b3f39-760f-4b77-a3b1-c486b4a4e4c3", "normal"],
  [176630, "Professor Birch (2006)", "82/106", "ed61ea12-90af-4250-b089-e2b31fc2fdce", "820ba0fb-cc4a-4460-ada6-66fdeb1185b9", "holo"],
  [176631, "Professor Oak's Visit (2008-2009)", "122/132", "baa63e55-c8aa-4936-8c9a-63de29e75c16", "235db02c-1431-42ba-a973-43cb6d89b38d", "normal"],
  [176632, "Professor Juniper - 98/108 (2013)", "98/108", "c98e4f39-59fc-4ec1-bfc5-c34f28a25f3c", "04cf4fa5-ea7a-434c-a558-7b53e95a4a93", "reverse"],
  [176633, "Professor Juniper - 101/114 (2013)", "101/114", "12cad852-d079-44cc-9438-e806aede97ff", "8b0cf097-ef28-42aa-a3f2-f8665f863726", "reverse"],
  [213516, "Judge (2019)", "108/131", "ea08d28d-8267-4db9-859c-64ffd048792f", "bfe26a71-5c95-4e97-8b12-ef6afa0b2dc6", "reverse"],
  [499366, "Gym Trainer (2022)", "059/072", "8f22c4ef-320d-45cd-8938-4aa84aca740e", "2f02ea00-6f1e-480d-8766-edb2a468d72f", "reverse"],
].map(([sourceProductId, sourceProductName, printedNumber, targetParentId, targetChildId, finishKey]) =>
  Object.freeze({ source_product_id: sourceProductId, source_product_name: sourceProductName,
    printed_number: printedNumber, target_parent_id: targetParentId, target_child_id: targetChildId,
    finish_key: finishKey })));

const BLOCKED = Object.freeze({
  source_product_id: 176638,
  source_product_name: "Professor Sycamore (2015)",
  printed_number: "122/146",
  target_parent_id: "69183c91-e669-4697-b5ab-f3cef1a11a5c",
  required_finish_key: "reverse",
  existing_conflicting_finish_key: "holo",
  reason: "source_finish_child_missing_on_professor_program_parent",
});

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function parseArgs(argv) {
  const out = {};
  for (const token of argv) {
    const match = /^--(out)=(.+)$/.exec(token);
    assert.ok(match && !out[match[1]], `unknown_or_repeated_argument:${token}`);
    out[match[1]] = match[2];
  }
  assert.ok(out.out, "--out is required");
  return { out: path.resolve(out.out) };
}

function productNumber(extendedData) {
  return String((Array.isArray(extendedData) ? extendedData : []).find((field) =>
    String(field?.name ?? "").trim().toLowerCase() === "number")?.value ?? "").trim();
}

function connectionConfig() {
  const publicUrl = new URL(process.env.SUPABASE_URL);
  assert.equal(publicUrl.hostname.split(".")[0], PROJECT_REF, "production_project_ref_mismatch");
  assert.ok(process.env.SUPABASE_DB_URL, "SUPABASE_DB_URL_required");
  const databaseUrl = assertPrintingDatabaseTarget(process.env.SUPABASE_DB_URL);
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim();
  return {
    connectionString: databaseUrl.href,
    ssl: databaseUrl.hostname === "localhost" || databaseUrl.hostname === "127.0.0.1"
      ? false
      : ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false },
    application_name: "tcgplayer_professor_program_mapping_readiness_v1_read_only",
    statement_timeout: 120_000,
    query_timeout: 125_000,
  };
}

async function readProduction() {
  const client = new pg.Client(connectionConfig());
  await client.connect();
  const productIds = [...READY.map((row) => row.source_product_id), BLOCKED.source_product_id];
  const parentIds = [...READY.map((row) => row.target_parent_id), BLOCKED.target_parent_id];
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const server = (await client.query(`select current_database() database,current_user username,
      current_setting('transaction_read_only') read_only`)).rows[0];
    assert.deepEqual(server, { database: "postgres", username: "postgres", read_only: "on" });
    const maturity = (await client.query(`select
      (select count(*)::integer from public.card_prints) card_prints,
      (select count(*)::integer from public.card_printings) card_printings,
      (select count(*)::integer from public.external_mappings where source='tcgplayer' and active) active_tcgplayer_mappings`)).rows[0];
    const sourceRun = (await client.query(`select id::text,run_key,sync_mode,status,observed_on,
      product_count,price_row_count,failed_count,artifact_hash,git_commit_sha,started_at,finished_at
      from public.tcgcsv_source_sync_runs where sync_mode='current_full_sync'
      order by finished_at desc nulls last,created_at desc limit 1`)).rows[0] ?? null;
    const group = (await client.query(`select group_id,category_id,name,abbreviation,source_active,
      catalog_metadata_status,last_seen_at,last_seen_run_id::text from public.tcgcsv_source_groups
      where group_id=$1`, [SOURCE_GROUP_ID])).rows[0] ?? null;
    const products = (await client.query(`select product_id,category_id,group_id,name,source_url,
      source_modified_on,extended_data,payload_hash,last_seen_at,last_seen_run_id::text,
      source_active,catalog_metadata_status from public.tcgcsv_source_products
      where product_id=any($1::integer[]) order by product_id`, [productIds])).rows;
    const parents = (await client.query(`select c.id::text,c.set_id::text,c.set_code,c.name,c.number,
      c.variant_key,c.gv_id,c.identity_domain,c.printed_identity_modifier,
      count(distinct i.id) filter(where i.is_active and i.identity_domain='pokemon_eng_standard')::integer active_standard_identity_count
      from public.card_prints c left join public.card_print_identity i on i.card_print_id=c.id
      where c.id=any($1::uuid[]) group by c.id order by c.id`, [parentIds])).rows;
    const children = (await client.query(`select p.id::text,p.card_print_id::text,p.finish_key,p.printing_gv_id,
      p.is_provisional,p.provenance_source,p.provenance_ref,coalesce(f.is_active,false) finish_active,
      review.review_status active_truth_review,review.public_visibility,
      coalesce(f.is_active,false) and coalesce(review.public_visibility,'') not in
        ('hidden_pending_review','hidden_unsupported') public_visible
      from public.card_printings p left join public.finish_keys f on f.key=p.finish_key
      left join lateral (select r.review_status,r.public_visibility from public.card_printing_truth_reviews r
        where r.card_printing_id=p.id and r.active=true order by r.created_at desc nulls last,r.id desc limit 1) review on true
      where p.card_print_id=any($1::uuid[]) order by p.card_print_id,p.finish_key,p.id`, [parentIds])).rows;
    const mappings = (await client.query(`select id::text,card_print_id::text,source,external_id,meta,
      synced_at,active from public.external_mappings where source='tcgplayer' and
      (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))
      order by external_id,active desc,id`, [productIds.map(String), parentIds])).rows;
    const observations = (await client.query(`select product_id,subtype_name,
      count(*)::integer observation_count,min(observed_on) first_observed_on,max(observed_on) last_observed_on,
      max(last_observed_at) last_observed_at
      from public.tcgcsv_source_price_daily_observations
      where product_id=any($1::integer[])
      group by product_id,subtype_name order by product_id,subtype_name`, [productIds])).rows;
    const latestObservations = (await client.query(`select distinct on(product_id,subtype_name)
      id::text,product_id,subtype_name,observed_on,low_price,mid_price,high_price,market_price,
      direct_low_price,currency,payload_hash,last_observed_at,last_seen_run_id::text
      from public.tcgcsv_source_price_daily_observations where product_id=any($1::integer[])
      order by product_id,subtype_name,observed_on desc,last_observed_at desc,id desc`, [productIds])).rows;
    const publicationOverlap = (await client.query(`select distinct snapshot.source_product_id,
      snapshot.card_print_id::text,snapshot.source_subtype_name,snapshot.source_observed_on,
      snapshot.market_price,snapshot.publication_set_id::text
      from public.market_price_current_publication pointer
      join public.market_price_publication_snapshots snapshot
        on snapshot.publication_set_id=pointer.publication_set_id
      where pointer.singleton and
        (snapshot.source_product_id=any($1::integer[]) or snapshot.card_print_id=any($2::uuid[]))
      order by snapshot.source_product_id,snapshot.card_print_id::text,snapshot.source_subtype_name`,
    [productIds, parentIds])).rows;
    await client.query("commit");
    return { server, maturity, source_run: sourceRun, source_group: group, products, parents,
      children, mappings, observation_summary: observations,
      latest_observations: latestObservations, active_publication_overlap: publicationOverlap };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function classifyRow(expected, live) {
  const product = live.products.find((row) => Number(row.product_id) === expected.source_product_id);
  const parent = live.parents.find((row) => row.id === expected.target_parent_id);
  const child = live.children.find((row) => row.id === expected.target_child_id);
  const mappings = live.mappings.filter((row) => row.external_id === String(expected.source_product_id) ||
    row.card_print_id === expected.target_parent_id);
  const observations = live.observation_summary.filter((row) => Number(row.product_id) === expected.source_product_id);
  const latestObservations = live.latest_observations.filter((row) => Number(row.product_id) === expected.source_product_id);
  const publication = live.active_publication_overlap.filter((row) => Number(row.source_product_id) === expected.source_product_id ||
    row.card_print_id === expected.target_parent_id);
  const failures = [];
  if (!product) failures.push("source_product_missing");
  else {
    if (Number(product.category_id) !== 3 || Number(product.group_id) !== SOURCE_GROUP_ID) failures.push("source_scope_changed");
    if (product.name !== expected.source_product_name) failures.push("source_name_changed");
    if (productNumber(product.extended_data) !== expected.printed_number) failures.push("source_number_changed");
    if (product.source_active !== true || product.catalog_metadata_status !== "current") failures.push("source_product_not_current");
  }
  if (!parent) failures.push("target_parent_missing");
  else {
    if (parent.variant_key !== "professor_program_stamp" ||
        parent.printed_identity_modifier !== "professor_program_stamp") failures.push("target_modifier_changed");
    if (parent.identity_domain !== "pokemon_eng_standard" || Number(parent.active_standard_identity_count) !== 1) {
      failures.push("target_active_identity_count_changed");
    }
  }
  if (!child) failures.push("target_child_missing");
  else if (child.card_print_id !== expected.target_parent_id || child.finish_key !== expected.finish_key ||
      child.is_provisional !== false) failures.push("target_child_changed");
  if (child && child.printing_gv_id !== `${parent?.gv_id}-${expected.finish_key === "normal" ? "STD" : expected.finish_key === "holo" ? "HOLO" : "RH"}`) {
    failures.push("target_child_printing_gv_id_missing_or_changed");
  }
  if (child && child.finish_active !== true) failures.push("target_child_finish_inactive");
  if (child && (child.active_truth_review !== "verified" || child.public_visibility !== "visible" ||
      child.public_visible !== true)) failures.push("target_child_truth_review_not_visible_verified");
  if (mappings.some((row) => row.active)) failures.push("active_mapping_already_exists");
  if (mappings.length > 0) failures.push("mapping_history_exists");
  if (publication.length > 0) failures.push("active_publication_overlap");
  if (observations.length === 0) failures.push("source_observations_missing");
  return { ...expected, status: failures.length === 0 ? "ready_for_authority_package" : "blocked",
    failures, product, parent, child, existing_mappings: mappings,
    observation_summary: observations, latest_observations: latestObservations,
    active_publication_overlap: publication };
}

function classifyBlocked(live) {
  const product = live.products.find((row) => Number(row.product_id) === BLOCKED.source_product_id);
  const parent = live.parents.find((row) => row.id === BLOCKED.target_parent_id);
  const children = live.children.filter((row) => row.card_print_id === BLOCKED.target_parent_id);
  const mappings = live.mappings.filter((row) => row.external_id === String(BLOCKED.source_product_id) ||
    row.card_print_id === BLOCKED.target_parent_id);
  const conflictStillPresent = Boolean(product && parent &&
    !children.some((row) => row.finish_key === BLOCKED.required_finish_key && !row.is_provisional) &&
    children.some((row) => row.finish_key === BLOCKED.existing_conflicting_finish_key && !row.is_provisional));
  return { ...BLOCKED, status: conflictStillPresent && mappings.length === 0
    ? "held_finish_conflict_confirmed" : "blocked_state_changed", product, parent, children,
    existing_mappings: mappings };
}

export async function buildProfessorProgramMappingReadinessV1(options) {
  const catalogBytes = await fs.readFile(path.join(ROOT, CATALOG_APPLY_ARTIFACT));
  const catalog = JSON.parse(catalogBytes.toString("utf8"));
  assert.equal(catalog.package_id, CATALOG_PACKAGE_ID);
  assert.equal(catalog.package_fingerprint_sha256, CATALOG_PACKAGE_FINGERPRINT);
  assert.equal(catalog.execution?.status, "applied_and_verified");
  const live = await readProduction();
  assert.equal(live.source_group?.name, SOURCE_GROUP_NAME, "source_group_name_changed");
  assert.equal(live.source_group?.source_active, true, "source_group_inactive");
  assert.equal(live.products.length, READY.length + 1, "source_product_count_changed");
  assert.equal(live.parents.length, READY.length + 1, "target_parent_count_changed");
  const rows = READY.map((row) => classifyRow(row, live));
  const blocked = classifyBlocked(live);
  const stableScope = {
    version: TCGPLAYER_PROFESSOR_PROGRAM_MAPPING_READINESS_V1,
    catalog_package_id: CATALOG_PACKAGE_ID,
    catalog_package_fingerprint_sha256: CATALOG_PACKAGE_FINGERPRINT,
    catalog_apply_artifact_sha256: sha256(catalogBytes),
    ready_scope: READY,
    blocked_scope: BLOCKED,
    source_sync_run_id: live.source_run?.id ?? null,
    rows: rows.map((row) => ({ source_product_id: row.source_product_id,
      target_parent_id: row.target_parent_id, target_child_id: row.target_child_id,
      finish_key: row.finish_key, status: row.status, failures: row.failures })),
    blocked: { source_product_id: blocked.source_product_id, target_parent_id: blocked.target_parent_id,
      status: blocked.status, reason: blocked.reason },
  };
  const output = {
    generated_at: new Date().toISOString(),
    ...stableScope,
    fingerprint_sha256: sha256(JSON.stringify(stableScope)),
    production_project_ref: PROJECT_REF,
    database_transaction: "repeatable_read_read_only",
    database_writes: 0,
    mapping_writes: 0,
    pricing_writes: 0,
    publication_writes: 0,
    execution_authorized: false,
    counts: {
      proposed: rows.length,
      ready: rows.filter((row) => row.status === "ready_for_authority_package").length,
      blocked: rows.filter((row) => row.status !== "ready_for_authority_package").length,
      held: blocked.status === "held_finish_conflict_confirmed" ? 1 : 0,
      active_mapping_collisions: live.mappings.filter((row) => row.active).length,
      active_publication_overlap: live.active_publication_overlap.length,
    },
    production: live,
    rows,
    held_row: blocked,
    next_boundary: "Build the exact seven-row reviewed-product authority and guarded dry-run package; durable mapping apply requires separate founder approval.",
  };
  await fs.mkdir(path.dirname(options.out), { recursive: true });
  await fs.writeFile(options.out, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx" });
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildProfessorProgramMappingReadinessV1(parseArgs(process.argv.slice(2)))
    .then((output) => console.log(JSON.stringify({ version: output.version,
      fingerprint_sha256: output.fingerprint_sha256, counts: output.counts,
      source_sync_run_id: output.source_sync_run_id, database_writes: output.database_writes }, null, 2)))
    .catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
}
