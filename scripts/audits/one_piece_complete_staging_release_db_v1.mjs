import fs from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

import pg from "pg";

import {
  buildOnePieceCompleteStagingReleaseV1,
  evaluateOnePieceCompleteStagingCollisionStateV1,
  ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256,
  ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
  ONE_PIECE_COMPLETE_STAGING_PRIOR_PAYLOAD_PROOF_SHA256,
  ONE_PIECE_COMPLETE_STAGING_SCHEMA_PROOF_SHA256,
  ONE_PIECE_COMPLETE_STAGING_SOURCE_SUMMARY_SHA256,
  validateOnePieceCompleteStagingReleaseV1,
} from "../../backend/pricing/one_piece_complete_staging_release_v1.mjs";
import {
  sha256,
  stableJson,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import {
  pgSslConfig,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;

export const COMPLETE_STAGING_PATHS = Object.freeze({
  source_dir: path.join("docs", "audits", "pricing",
    "one_piece_canonical_catalog_readiness_v1",
    "current_complete_source_2026-08-14_v1"),
  plan_dir: path.join("docs", "audits", "pricing",
    "one_piece_complete_staging_release_v1", "frozen_plan_v1"),
  schema_plan: path.join("docs", "audits", "pricing",
    "one_piece_canonical_import_durable_staging_schema_apply_v1",
    "schema_apply_plan_v1", "plan.json"),
});

export function onePieceCompleteStagingClientV1(connectionString, applicationName) {
  return new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 300_000,
    statement_timeout: 300_000,
    application_name: applicationName,
  });
}

export async function loadFrozenOnePieceCompleteStagingReleaseV1(root) {
  const sourceDir = path.join(root, COMPLETE_STAGING_PATHS.source_dir);
  const [compressedManifest, summaryText, schemaProofText, priorProofText,
    frozenPlanText, schemaPlanText] = await Promise.all([
    fs.readFile(path.join(sourceDir, "source_product_manifest.jsonl.gz")),
    fs.readFile(path.join(sourceDir, "summary.json"), "utf8"),
    fs.readFile(path.join(root, "docs", "audits", "pricing",
      "one_piece_canonical_import_durable_staging_schema_apply_v1",
      "production_schema_apply_v1_independent_verify", "summary.json"), "utf8"),
    fs.readFile(path.join(root, "docs", "audits", "pricing",
      "one_piece_canonical_import_durable_payload_apply_v1",
      "production_apply_v1_independent_verify", "summary.json"), "utf8"),
    fs.readFile(path.join(root, COMPLETE_STAGING_PATHS.plan_dir, "plan.json"), "utf8"),
    fs.readFile(path.join(root, COMPLETE_STAGING_PATHS.schema_plan), "utf8"),
  ]);
  const logicalManifest = gunzipSync(compressedManifest).toString("utf8");
  const authorities = {
    manifest_compressed: sha256(compressedManifest),
    manifest_logical: sha256(logicalManifest),
    source_summary: sha256(summaryText),
    schema_proof: sha256(schemaProofText),
    prior_payload_proof: sha256(priorProofText),
  };
  const expectedAuthorities = {
    manifest_compressed: ONE_PIECE_COMPLETE_STAGING_MANIFEST_COMPRESSED_SHA256,
    manifest_logical: ONE_PIECE_COMPLETE_STAGING_MANIFEST_LOGICAL_SHA256,
    source_summary: ONE_PIECE_COMPLETE_STAGING_SOURCE_SUMMARY_SHA256,
    schema_proof: ONE_PIECE_COMPLETE_STAGING_SCHEMA_PROOF_SHA256,
    prior_payload_proof: ONE_PIECE_COMPLETE_STAGING_PRIOR_PAYLOAD_PROOF_SHA256,
  };
  if (stableJson(authorities) !== stableJson(expectedAuthorities)) {
    throw new Error("Frozen One Piece complete staging authorities changed");
  }
  const sourceSummary = JSON.parse(summaryText);
  const manifestRows = logicalManifest.trim().split(/\r?\n/).map(JSON.parse);
  const frozenPlan = JSON.parse(frozenPlanText);
  const release = buildOnePieceCompleteStagingReleaseV1({
    repository: frozenPlan.repository,
    asOfDate: sourceSummary.as_of_date,
    manifestRows,
    manifestLogicalSha256: authorities.manifest_logical,
    manifestCompressedSha256: authorities.manifest_compressed,
    sourceSummarySha256: authorities.source_summary,
    schemaProofSha256: authorities.schema_proof,
    priorPayloadProofSha256: authorities.prior_payload_proof,
    warehouseSourceGroupCount: sourceSummary.source.group_count,
  });
  if (stableJson(release.plan) !== stableJson(frozenPlan)) {
    throw new Error("Rehydrated release does not match the frozen plan");
  }
  const validation = validateOnePieceCompleteStagingReleaseV1(release);
  if (!validation.valid) {
    throw new Error(`Frozen release invalid: ${validation.findings.join(",")}`);
  }
  return {
    release,
    sourceSummary,
    schemaPlan: JSON.parse(schemaPlanText),
    frozenPlanText,
    authorities,
  };
}

export async function captureOnePieceCompleteStagingCollisionStateV1(
  client,
  release,
) {
  const batchIds = release.batches.map((entry) => entry.batch.id);
  const fingerprints = release.batches.map(
    (entry) => entry.batch.payload_fingerprint_sha256,
  );
  const rowIds = release.batches.flatMap(
    (entry) => entry.staging_rows.map((row) => row.id),
  );
  const sourceProductIds = release.batches.flatMap(
    (entry) => entry.staging_rows.map((row) => row.source_product_id),
  );
  const result = await client.query(`select
    (select count(*)::integer from public.one_piece_canonical_import_batches
      where id=any($1::uuid[])) as batch_ids,
    (select count(*)::integer from public.one_piece_canonical_import_batches
      where payload_fingerprint_sha256=any($2::text[])) as batch_payload_fingerprints,
    (select count(*)::integer from public.one_piece_canonical_import_rows
      where id=any($3::uuid[])) as staging_row_ids,
    (select count(*)::integer from public.one_piece_canonical_import_rows
      where source_product_id=any($4::bigint[])) as historical_source_product_overlaps,
    (select count(*)::integer from public.one_piece_canonical_import_batches)
      as existing_batch_rows,
    (select count(*)::integer from public.one_piece_canonical_import_rows)
      as existing_staging_rows`, [batchIds, fingerprints, rowIds, sourceProductIds]);
  const state = Object.fromEntries(Object.entries(result.rows[0]).map(
    ([key, value]) => [key, Number(value)],
  ));
  return {
    ...state,
    evaluation: evaluateOnePieceCompleteStagingCollisionStateV1(state),
  };
}

export async function captureOnePieceCompleteSourceInventoryV1(client, release) {
  const expectedRows = release.batches.flatMap((entry) => entry.staging_rows);
  const expectedProductIds = expectedRows.map((row) => row.source_product_id);
  const aggregate = (await client.query(`select
    (select count(*)::integer from public.tcgcsv_source_groups
      where category_id=68) as group_count,
    (select count(*)::integer from public.tcgcsv_source_groups
      where category_id=68 and source_active) as active_group_count,
    (select count(*)::integer from public.tcgcsv_source_products
      where category_id=68) as product_count,
    (select count(*)::integer from public.tcgcsv_source_products
      where category_id=68 and source_active) as active_product_count,
    (select count(*)::integer from public.tcgcsv_source_products
      where category_id=68 and product_id=any($1::bigint[])) as selected_product_count`,
  [expectedProductIds])).rows[0];
  const products = (await client.query(`select product_id::integer,group_id::integer,
    payload_hash from public.tcgcsv_source_products
    where category_id=68 and product_id=any($1::bigint[]) order by product_id`,
  [expectedProductIds])).rows;
  const groups = (await client.query(`select g.group_id::integer,g.name,g.source_active,
    count(p.product_id)::integer as product_count
    from public.tcgcsv_source_groups g left join public.tcgcsv_source_products p
      on p.category_id=g.category_id and p.group_id=g.group_id
    where g.category_id=68 group by g.group_id,g.name,g.source_active
    order by g.group_id`)).rows.map((row) => ({
    ...row,
    product_count: Number(row.product_count),
  }));
  return {
    ...Object.fromEntries(Object.entries(aggregate).map(
      ([key, value]) => [key, Number(value)],
    )),
    products,
    groups,
    empty_groups: groups.filter((row) => row.product_count === 0),
  };
}

export function evaluateOnePieceCompleteSourceInventoryV1(release, snapshot) {
  const findings = [];
  const expected = release.plan.aggregate_counts;
  const expectedRows = release.batches.flatMap((entry) => entry.staging_rows);
  if (snapshot.group_count !== expected.warehouse_source_groups) {
    findings.push("warehouse_group_count_mismatch");
  }
  if (snapshot.active_group_count !== expected.warehouse_source_groups) {
    findings.push("active_group_count_mismatch");
  }
  if (snapshot.product_count !== expected.source_products ||
      snapshot.active_product_count !== expected.source_products ||
      snapshot.selected_product_count !== expected.source_products) {
    findings.push("source_product_coverage_mismatch");
  }
  if (snapshot.empty_groups?.length !==
      expected.warehouse_source_groups - expected.materialized_source_groups) {
    findings.push("empty_source_group_count_mismatch");
  }
  const actualProducts = new Map((snapshot.products ?? []).map(
    (row) => [Number(row.product_id), row],
  ));
  for (const row of expectedRows) {
    const actual = actualProducts.get(row.source_product_id);
    if (!actual) {
      findings.push(`source_product_missing:${row.source_product_id}`);
      continue;
    }
    if (Number(actual.group_id) !== row.source_group_id ||
        actual.payload_hash !== row.payload.source_payload_hash) {
      findings.push(`source_product_drift:${row.source_product_id}`);
    }
  }
  const expectedGroups = new Map(release.batches.map((entry) => [
    entry.batch.source_group_id,
    entry.batch.source_group_name,
  ]));
  for (const row of snapshot.groups ?? []) {
    if (row.product_count === 0) continue;
    if (expectedGroups.get(Number(row.group_id)) !== row.name) {
      findings.push(`source_group_drift:${row.group_id}`);
    }
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

function expectedDatabaseBatch(batch) {
  return {
    id: batch.id,
    payload_fingerprint_sha256: batch.payload_fingerprint_sha256,
    source_manifest_logical_sha256: batch.source_manifest_logical_sha256,
    migration_candidate_sha256: batch.migration_candidate_sha256,
    plan_version: batch.plan_version,
    schema_version: batch.schema_version,
    producing_commit_sha: batch.producing_commit_sha,
    producing_branch: batch.producing_branch,
    source_category_id: Number(batch.source_category_id),
    source_group_id: Number(batch.source_group_id),
    source_group_name: batch.source_group_name,
    source_group_released_on: batch.source_group_released_on,
    staging_mode: batch.staging_mode,
    authorized_durable_batch_rows: Number(batch.authorized_durable_batch_rows),
    authorized_durable_staging_rows: Number(batch.authorized_durable_staging_rows),
    row_counts: batch.row_counts,
    execution_boundaries: batch.execution_boundaries,
  };
}

function expectedDatabaseRow(row) {
  return {
    id: row.id,
    batch_id: row.batch_id,
    source_product_id: Number(row.source_product_id),
    source_group_id: Number(row.source_group_id),
    record_class: row.record_class,
    single_card_kind: row.single_card_kind ?? null,
    language_key: row.language_key,
    promotion_state: row.promotion_state,
    row_ordinal: Number(row.row_ordinal),
    payload: row.payload,
    payload_sha256: row.payload_sha256,
  };
}

export async function captureOnePieceCompleteStagingReadbackV1(
  client,
  release,
  selectedBatchIds = null,
) {
  const batchIds = selectedBatchIds ?? release.batches.map((entry) => entry.batch.id);
  const totals = (await client.query(`select
    (select count(*)::integer from public.one_piece_canonical_import_batches)
      as total_batch_count,
    (select count(*)::integer from public.one_piece_canonical_import_rows)
      as total_row_count`)).rows[0];
  const batches = (await client.query(`select id::text,
    payload_fingerprint_sha256,source_manifest_logical_sha256,
    migration_candidate_sha256,plan_version,schema_version,
    producing_commit_sha,producing_branch,source_category_id::integer,
    source_group_id::integer,source_group_name,source_group_released_on::text,
    staging_mode,authorized_durable_batch_rows,authorized_durable_staging_rows,
    row_counts,execution_boundaries
    from public.one_piece_canonical_import_batches where id=any($1::uuid[])
    order by source_group_id,id`, [batchIds])).rows.map((row) => ({
    ...row,
    source_category_id: Number(row.source_category_id),
    source_group_id: Number(row.source_group_id),
    authorized_durable_batch_rows: Number(row.authorized_durable_batch_rows),
    authorized_durable_staging_rows: Number(row.authorized_durable_staging_rows),
  }));
  const rows = (await client.query(`select r.id::text,r.batch_id::text,
    r.source_product_id::integer,r.source_group_id::integer,r.record_class,
    r.single_card_kind,r.language_key,r.promotion_state,r.row_ordinal,
    r.payload,r.payload_sha256 from public.one_piece_canonical_import_rows r
    join public.one_piece_canonical_import_batches b on b.id=r.batch_id
    where r.batch_id=any($1::uuid[])
    order by b.source_group_id,r.row_ordinal,r.id`, [batchIds])).rows.map((row) => ({
    ...row,
    source_product_id: Number(row.source_product_id),
    source_group_id: Number(row.source_group_id),
    row_ordinal: Number(row.row_ordinal),
  }));
  return {
    total_batch_count: Number(totals.total_batch_count),
    total_row_count: Number(totals.total_row_count),
    selected_batch_count: batches.length,
    selected_row_count: rows.length,
    batches,
    rows,
  };
}

export function evaluateOnePieceCompleteStagingReadbackV1(
  release,
  readback,
  selectedBatchIds = null,
) {
  const selected = selectedBatchIds
    ? release.batches.filter((entry) => selectedBatchIds.includes(entry.batch.id))
    : release.batches;
  const expectedBatches = selected.map((entry) => expectedDatabaseBatch(entry.batch));
  const expectedRows = selected.flatMap(
    (entry) => entry.staging_rows.map(expectedDatabaseRow),
  );
  const findings = [];
  if (stableJson(readback.batches) !== stableJson(expectedBatches)) {
    findings.push("batch_readback_mismatch");
  }
  if (stableJson(readback.rows) !== stableJson(expectedRows)) {
    findings.push("staging_row_readback_mismatch");
  }
  if (readback.selected_batch_count !== expectedBatches.length) {
    findings.push("selected_batch_count_mismatch");
  }
  if (readback.selected_row_count !== expectedRows.length) {
    findings.push("selected_row_count_mismatch");
  }
  return { valid: findings.length === 0, findings };
}

export function summarizeOnePieceCompleteStagingReadbackV1(readback) {
  return {
    total_batch_count: readback.total_batch_count,
    total_row_count: readback.total_row_count,
    selected_batch_count: readback.selected_batch_count,
    selected_row_count: readback.selected_row_count,
    selected_batches_sha256: sha256(stableJson(readback.batches)),
    selected_rows_sha256: sha256(stableJson(readback.rows)),
    source_product_ids_sha256: sha256(stableJson(
      readback.rows.map((row) => row.source_product_id),
    )),
    per_batch: readback.batches.map((batch) => ({
      id: batch.id,
      source_group_id: batch.source_group_id,
      source_group_name: batch.source_group_name,
      payload_fingerprint_sha256: batch.payload_fingerprint_sha256,
      row_count: batch.authorized_durable_staging_rows,
    })),
  };
}

export async function insertOnePieceCompleteStagingReleaseV1(
  client,
  release,
  selectedBatchIds = null,
  chunkSize = 250,
) {
  const selected = selectedBatchIds
    ? release.batches.filter((entry) => selectedBatchIds.includes(entry.batch.id))
    : release.batches;
  const batchPayload = selected.map((entry) => entry.batch);
  await client.query(`insert into public.one_piece_canonical_import_batches (
    id,payload_fingerprint_sha256,source_manifest_logical_sha256,
    migration_candidate_sha256,plan_version,schema_version,
    producing_commit_sha,producing_branch,source_category_id,source_group_id,
    source_group_name,source_group_released_on,staging_mode,
    authorized_durable_batch_rows,authorized_durable_staging_rows,
    row_counts,execution_boundaries)
    select id,payload_fingerprint_sha256,source_manifest_logical_sha256,
      migration_candidate_sha256,plan_version,schema_version,
      producing_commit_sha,producing_branch,source_category_id,source_group_id,
      source_group_name,source_group_released_on,staging_mode,
      authorized_durable_batch_rows,authorized_durable_staging_rows,
      row_counts,execution_boundaries
    from jsonb_to_recordset($1::jsonb) as r(id uuid,
      payload_fingerprint_sha256 text,source_manifest_logical_sha256 text,
      migration_candidate_sha256 text,plan_version text,schema_version text,
      producing_commit_sha text,producing_branch text,source_category_id bigint,
      source_group_id bigint,source_group_name text,source_group_released_on date,
      staging_mode text,authorized_durable_batch_rows integer,
      authorized_durable_staging_rows integer,row_counts jsonb,
      execution_boundaries jsonb)`, [JSON.stringify(batchPayload)]);
  const rows = selected.flatMap((entry) => entry.staging_rows);
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    await client.query(`insert into public.one_piece_canonical_import_rows (
      id,batch_id,source_product_id,source_group_id,record_class,single_card_kind,
      language_key,promotion_state,row_ordinal,payload,payload_sha256)
      select id,batch_id,source_product_id,source_group_id,record_class,
        single_card_kind,language_key,promotion_state,row_ordinal,payload,payload_sha256
      from jsonb_to_recordset($1::jsonb) as r(id uuid,batch_id uuid,
        source_product_id bigint,source_group_id bigint,record_class text,
        single_card_kind text,language_key text,promotion_state text,
        row_ordinal integer,payload jsonb,payload_sha256 text)`,
    [JSON.stringify(chunk)]);
  }
  return { batch_rows: selected.length, staging_rows: rows.length };
}

export async function captureOnePieceStagingAttributableWritesV1(client) {
  const rows = (await client.query(`select relation.relname as table_name,
    coalesce(stat.n_tup_ins,0)::bigint as inserted,
    coalesce(stat.n_tup_upd,0)::bigint as updated,
    coalesce(stat.n_tup_del,0)::bigint as deleted,
    coalesce(stat.n_tup_hot_upd,0)::bigint as hot_updated
    from unnest(array['one_piece_canonical_import_batches',
      'one_piece_canonical_import_rows']) expected(table_name)
    join pg_namespace n on n.nspname='public'
    join pg_class relation on relation.relnamespace=n.oid
      and relation.relname=expected.table_name
    left join pg_stat_xact_user_tables stat on stat.relid=relation.oid
    order by relation.relname`)).rows;
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(
    ([key, value]) => key === "table_name" ? [key, value] : [key, Number(value)],
  )));
}

export async function captureOnePieceReleaseVisibilityV1(client) {
  const release = (await client.query(`select release_status
    from public.catalog_game_release_controls where game_code='one_piece'`))
    .rows[0] ?? null;
  const visibility = {};
  for (const role of ["anon", "authenticated", "service_role"]) {
    await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
    visibility[`${role}_visible`] = (await client.query(
      "select public.catalog_game_visible_to_request_v1('one_piece') as visible",
    )).rows[0]?.visible === true;
  }
  return { release_status: release?.release_status ?? null, ...visibility };
}

export function evaluateOnePieceReleaseVisibilityV1(visibility) {
  const findings = [];
  if (visibility?.release_status !== "hidden") findings.push("release_not_hidden");
  for (const role of ["anon", "authenticated", "service_role"]) {
    if (visibility?.[`${role}_visible`] !== false) {
      findings.push(`one_piece_visible:${role}`);
    }
  }
  return { valid: findings.length === 0, findings };
}
