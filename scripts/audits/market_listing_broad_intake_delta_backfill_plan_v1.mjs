import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

const PACKAGE_ID = "MARKET-LISTING-BROAD-INTAKE-DELTA-BACKFILL-PLAN-V1";
const EXPECTED_SOURCE_PLAN_FINGERPRINT = "d9b5463efbdfc41ad22c2b846911b937203a5273000c20dfc3bbc303c61a812c";
const EXPECTED_SOURCE_ROW_MANIFEST_HASH = "6ab07f492e4e14091a8294eac94fb4c754cf4d13c825a1553c486ffaf07e6aeb";
const EXPECTED_SCHEMA_MIGRATION_HASH = "2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const SOURCE_PLAN = "docs/audits/market_evidence_engine_v1/mee_11g_market_listing_broad_intake_backfill_plan_2026-06-25T23-40-27-740Z.json";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function deterministicUuid(input) {
  const hash = sha256(input);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function existingIds(supabase, table, ids) {
  const found = new Set();
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .in("id", chunk);
    if (error) throw new Error(`[market-listing-delta-plan] id read failed for ${table}: ${error.message}`);
    for (const row of data ?? []) found.add(row.id);
  }
  return found;
}

async function existingRawPayloadKeys(supabase, rawRows) {
  const found = new Set();
  const listingIds = [...new Set(rawRows.map((row) => row.source_listing_id).filter(Boolean))];
  for (let index = 0; index < listingIds.length; index += 100) {
    const chunk = listingIds.slice(index, index + 100);
    const { data, error } = await supabase
      .from("market_listing_raw_snapshots")
      .select("source,source_listing_id,payload_hash")
      .eq("source", "ebay_active")
      .in("source_listing_id", chunk);
    if (error) throw new Error(`[market-listing-delta-plan] raw payload read failed: ${error.message}`);
    for (const row of data ?? []) found.add(`${row.source}:${row.source_listing_id}:${row.payload_hash}`);
  }
  return found;
}

async function existingSellerKeys(supabase, sellerRows) {
  const found = new Set();
  const sellers = [...new Set(sellerRows.map((row) => row.seller_key).filter(Boolean))];
  for (let index = 0; index < sellers.length; index += 100) {
    const chunk = sellers.slice(index, index + 100);
    const { data, error } = await supabase
      .from("market_listing_seller_snapshots")
      .select("source,seller_key,observed_at")
      .eq("source", "ebay_active")
      .in("seller_key", chunk);
    if (error) throw new Error(`[market-listing-delta-plan] seller read failed: ${error.message}`);
    for (const row of data ?? []) {
      found.add(`${row.source}:${row.seller_key}:${new Date(row.observed_at).toISOString()}`);
    }
  }
  return found;
}

function sellerUniqueKey(row) {
  return `${row.source}:${row.seller_key}:${new Date(row.observed_at).toISOString()}`;
}

function buildObservationId(rawSnapshotId) {
  return deterministicUuid(`market_listing_observation:${rawSnapshotId}`);
}

function buildPriceEventId(observationId) {
  return deterministicUuid(`market_listing_price_event:first_seen:${observationId}`);
}

function approvalPrompt(report) {
  return `Approve real MARKET-LISTING-BROAD-INTAKE-DELTA-BACKFILL-APPLY-V1 apply only. Package fingerprint: ${report.package_fingerprint_sha256}. Row manifest hash: ${report.row_manifest_hash_sha256}. Source plan fingerprint: ${report.source_plan_fingerprint_sha256}. Source row manifest hash: ${report.source_row_manifest_hash_sha256}. Schema migration hash: ${report.schema_migration_hash_sha256}. Scope: insert ${report.proposed_table_row_counts.market_listing_acquisition_runs} market_listing_acquisition_runs row, ${report.proposed_table_row_counts.market_listing_query_cache} market_listing_query_cache rows, ${report.proposed_table_row_counts.market_listing_raw_snapshots} market_listing_raw_snapshots rows, ${report.proposed_table_row_counts.market_listing_observations} market_listing_observations rows, ${report.proposed_table_row_counts.market_listing_seller_snapshots} market_listing_seller_snapshots rows, and ${report.proposed_table_row_counts.market_listing_price_events} market_listing_price_events rows from the MEE-11G 1,000-row broad intake plan, skipping already-present query cache rows and exact duplicate raw payload rows only. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.`;
}

function renderMarkdown(report) {
  return [
    "# MEE-11I Market Listing Broad Intake Delta Backfill Plan",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready for apply approval: \`${report.ready_for_apply_approval}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    `- Source plan: \`${report.source_plan_artifact}\``,
    "",
    "## Collision Handling",
    "",
    `- Existing query cache rows reused: \`${report.collision_summary.existing_query_cache_rows}\``,
    `- Exact duplicate raw payload rows skipped: \`${report.collision_summary.existing_raw_payload_rows}\``,
    `- Existing seller snapshots skipped: \`${report.collision_summary.existing_seller_rows}\``,
    "",
    "## Proposed Row Counts",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...Object.entries(report.proposed_table_row_counts).map(([table, count]) => `| \`${table}\` | ${count} |`),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Approval Prompt",
    "",
    "```text",
    approvalPrompt(report),
    "```",
    "",
  ].join("\n");
}

async function main() {
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const sourcePath = path.join(REPO_ROOT, SOURCE_PLAN);
  const sourcePlan = JSON.parse(await fs.readFile(sourcePath, "utf8"));
  const supabase = createBackendClient();
  const findings = [];

  if (sourcePlan.package_fingerprint_sha256 !== EXPECTED_SOURCE_PLAN_FINGERPRINT) findings.push("source_plan_fingerprint_mismatch");
  if (sourcePlan.row_manifest_hash_sha256 !== EXPECTED_SOURCE_ROW_MANIFEST_HASH) findings.push("source_row_manifest_hash_mismatch");
  if (sourcePlan.schema_migration_hash_sha256 !== EXPECTED_SCHEMA_MIGRATION_HASH) findings.push("schema_migration_hash_mismatch");
  if (sourcePlan.ready_for_apply_approval !== true) findings.push("source_plan_not_ready");

  const rows = sourcePlan.rows;
  const existingQueryIds = await existingIds(supabase, "market_listing_query_cache", rows.queryCacheRows.map((row) => row.id));
  const existingRawKeys = await existingRawPayloadKeys(supabase, rows.rawSnapshotRows);
  const existingSellerUniqueKeys = await existingSellerKeys(supabase, rows.sellerSnapshotRows);

  const queryCacheRows = rows.queryCacheRows.filter((row) => !existingQueryIds.has(row.id));
  const rawSnapshotRows = rows.rawSnapshotRows.filter((row) => !existingRawKeys.has(`${row.source}:${row.source_listing_id}:${row.payload_hash}`));
  const rawSnapshotIds = new Set(rawSnapshotRows.map((row) => row.id));
  const sourceObservationByRawId = new Map(rows.observationRows.map((row) => [row.raw_snapshot_id, row]));
  const observationRows = rawSnapshotRows.map((rawRow) => {
    const sourceObservation = sourceObservationByRawId.get(rawRow.id);
    return {
      ...sourceObservation,
      id: buildObservationId(rawRow.id),
      raw_snapshot_id: rawRow.id,
    };
  });
  const observationIdBySourceId = new Map(
    observationRows.map((row) => [sourceObservationByRawId.get(row.raw_snapshot_id)?.id, row.id]),
  );
  const observationIds = new Set(observationRows.map((row) => row.id));
  const priceEventRows = rows.priceEventRows
    .filter((row) => observationIdBySourceId.has(row.observation_id))
    .map((row) => {
      const observationId = observationIdBySourceId.get(row.observation_id);
      return {
        ...row,
        id: buildPriceEventId(observationId),
        observation_id: observationId,
      };
    });
  const sellerSnapshotRows = rows.sellerSnapshotRows
    .filter((row) => rawSnapshotIds.has(row.raw_snapshot_id))
    .filter((row) => !existingSellerUniqueKeys.has(sellerUniqueKey(row)));

  if (observationRows.some((row) => !row?.id || !row.raw_snapshot_id)) findings.push("invalid_delta_observation_row");
  if (priceEventRows.some((row) => !observationIds.has(row.observation_id))) findings.push("invalid_delta_price_event_row");

  const rowManifestHash = sha256({
    acquisitionRunRows: rows.acquisitionRunRows,
    queryCacheRows,
    rawSnapshotRows: rawSnapshotRows.map((row) => ({
      id: row.id,
      source_listing_id: row.source_listing_id,
      payload_hash: row.payload_hash,
      query_cache_id: row.query_cache_id,
    })),
    observationRows: observationRows.map((row) => ({
      id: row.id,
      source_listing_id: row.source_listing_id,
      listing_title: row.listing_title,
      total_ask_price: row.total_ask_price,
      currency: row.currency,
      raw_snapshot_id: row.raw_snapshot_id,
    })),
    sellerSnapshotRows,
    priceEventRows,
  });
  const packageFingerprint = sha256({
    package_id: PACKAGE_ID,
    source_plan_fingerprint: sourcePlan.package_fingerprint_sha256,
    source_row_manifest_hash: sourcePlan.row_manifest_hash_sha256,
    row_manifest_hash: rowManifestHash,
    collision_policy: {
      reuse_existing_query_cache: true,
      skip_exact_duplicate_raw_payloads: true,
      skip_existing_seller_snapshots: true,
      regenerate_observation_ids_from_raw_snapshot_id: true,
      regenerate_price_event_ids_from_observation_id: true,
    },
  });

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "delta_db_backfill_plan_only_no_writes",
    source_plan_artifact: rel(sourcePath),
    source_plan_fingerprint_sha256: sourcePlan.package_fingerprint_sha256,
    source_row_manifest_hash_sha256: sourcePlan.row_manifest_hash_sha256,
    schema_migration_hash_sha256: sourcePlan.schema_migration_hash_sha256,
    package_fingerprint_sha256: packageFingerprint,
    row_manifest_hash_sha256: rowManifestHash,
    collision_summary: {
      existing_query_cache_rows: rows.queryCacheRows.length - queryCacheRows.length,
      existing_raw_payload_rows: rows.rawSnapshotRows.length - rawSnapshotRows.length,
      existing_seller_rows: rows.sellerSnapshotRows.length - sellerSnapshotRows.length,
    },
    proposed_table_row_counts: {
      market_listing_acquisition_runs: rows.acquisitionRunRows.length,
      market_listing_query_cache: queryCacheRows.length,
      market_listing_raw_snapshots: rawSnapshotRows.length,
      market_listing_observations: observationRows.length,
      market_listing_seller_snapshots: sellerSnapshotRows.length,
      market_listing_price_events: priceEventRows.length,
      market_listing_card_candidates: 0,
      market_listing_rollups: 0,
    },
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      card_candidate_writes: false,
      rollup_writes: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      upserts: false,
      merges: false,
      migrations: false,
      global_apply: false,
    },
    findings,
    ready_for_apply_approval: findings.length === 0,
    rows: {
      acquisitionRunRows: rows.acquisitionRunRows,
      queryCacheRows,
      rawSnapshotRows,
      observationRows,
      sellerSnapshotRows,
      priceEventRows,
      cardCandidateRows: [],
      rollupRows: [],
    },
  };
  report.approval_prompt_for_next_step = approvalPrompt(report);

  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11i_market_listing_broad_intake_delta_backfill_plan_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11i_market_listing_broad_intake_delta_backfill_plan_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    ready_for_apply_approval: report.ready_for_apply_approval,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    row_manifest_hash_sha256: report.row_manifest_hash_sha256,
    collision_summary: report.collision_summary,
    proposed_table_row_counts: report.proposed_table_row_counts,
    findings: report.findings,
    artifacts: {
      jsonPath: rel(jsonPath),
      mdPath: rel(mdPath),
    },
    approval_prompt_for_next_step: report.approval_prompt_for_next_step,
  }, null, 2));

  if (!report.ready_for_apply_approval) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
