import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

const PACKAGE_ID = "MARKET-LISTING-BROAD-INTAKE-DELTA-BACKFILL-APPLY-V1";
const EXPECTED_PACKAGE_FINGERPRINT = "18ab94acf87c0988f945871443edb3143e71295845e2f70631d29b2e915e55bd";
const EXPECTED_ROW_MANIFEST_HASH = "ad6d8e67e2fd01d7f2d283bb28b81d17ccd85e38ea4ccffdade22496473618b2";
const EXPECTED_SOURCE_PLAN_FINGERPRINT = "d9b5463efbdfc41ad22c2b846911b937203a5273000c20dfc3bbc303c61a812c";
const EXPECTED_SOURCE_ROW_MANIFEST_HASH = "6ab07f492e4e14091a8294eac94fb4c754cf4d13c825a1553c486ffaf07e6aeb";
const EXPECTED_SCHEMA_MIGRATION_HASH = "2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const PLAN_PREFIX = "mee_11i_market_listing_broad_intake_delta_backfill_plan_";

const APPLY_ORDER = [
  ["market_listing_acquisition_runs", "acquisitionRunRows"],
  ["market_listing_query_cache", "queryCacheRows"],
  ["market_listing_raw_snapshots", "rawSnapshotRows"],
  ["market_listing_observations", "observationRows"],
  ["market_listing_seller_snapshots", "sellerSnapshotRows"],
  ["market_listing_price_events", "priceEventRows"],
];

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    planPath: argv.find((arg) => arg.startsWith("--plan="))?.slice("--plan=".length) ?? null,
  };
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function latestPlanPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const files = await fs.readdir(dir);
  const latest = files
    .filter((fileName) => fileName.startsWith(PLAN_PREFIX) && fileName.endsWith(".json"))
    .sort()
    .at(-1);
  if (!latest) throw new Error(`[market-listing-delta-apply] no ${PLAN_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

async function readPlan(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath ?? await latestPlanPath());
  return {
    path: resolved,
    data: JSON.parse(await fs.readFile(resolved, "utf8")),
  };
}

function tableRows(plan, rowsKey) {
  return plan.rows?.[rowsKey] ?? [];
}

async function existingIds(supabase, table, ids) {
  const found = [];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    if (!chunk.length) continue;
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .in("id", chunk);
    if (error) throw new Error(`[market-listing-delta-apply] collision check failed for ${table}: ${error.message}`);
    found.push(...(data ?? []).map((row) => row.id));
  }
  return found;
}

async function existingRunKeys(supabase, rows) {
  const keys = rows.map((row) => row.run_key).filter(Boolean);
  if (!keys.length) return [];
  const { data, error } = await supabase
    .from("market_listing_acquisition_runs")
    .select("run_key")
    .in("run_key", keys);
  if (error) throw new Error(`[market-listing-delta-apply] run key collision check failed: ${error.message}`);
  return (data ?? []).map((row) => row.run_key);
}

async function rawPayloadCollisions(supabase, rows) {
  const listingIds = [...new Set(rows.map((row) => row.source_listing_id).filter(Boolean))];
  const existing = [];
  for (let index = 0; index < listingIds.length; index += 100) {
    const chunk = listingIds.slice(index, index + 100);
    if (!chunk.length) continue;
    const { data, error } = await supabase
      .from("market_listing_raw_snapshots")
      .select("source,source_listing_id,payload_hash")
      .eq("source", "ebay_active")
      .in("source_listing_id", chunk);
    if (error) throw new Error(`[market-listing-delta-apply] raw payload collision check failed: ${error.message}`);
    existing.push(...(data ?? []));
  }
  const existingKeys = new Set(existing.map((row) => `${row.source}:${row.source_listing_id}:${row.payload_hash}`));
  return rows
    .filter((row) => existingKeys.has(`${row.source}:${row.source_listing_id}:${row.payload_hash}`))
    .map((row) => ({
      source: row.source,
      source_listing_id: row.source_listing_id,
      payload_hash: row.payload_hash,
    }));
}

function sellerUniqueKey(row) {
  return `${row.source}:${row.seller_key}:${new Date(row.observed_at).toISOString()}`;
}

async function sellerCollisions(supabase, rows) {
  const sellers = [...new Set(rows.map((row) => row.seller_key).filter(Boolean))];
  const existing = [];
  for (let index = 0; index < sellers.length; index += 100) {
    const chunk = sellers.slice(index, index + 100);
    if (!chunk.length) continue;
    const { data, error } = await supabase
      .from("market_listing_seller_snapshots")
      .select("source,seller_key,observed_at")
      .eq("source", "ebay_active")
      .in("seller_key", chunk);
    if (error) throw new Error(`[market-listing-delta-apply] seller collision check failed: ${error.message}`);
    existing.push(...(data ?? []));
  }
  const existingKeys = new Set(existing.map(sellerUniqueKey));
  return rows.filter((row) => existingKeys.has(sellerUniqueKey(row))).map(sellerUniqueKey);
}

async function collisionSummary(supabase, plan) {
  const idCollisions = {};
  for (const [table, rowsKey] of APPLY_ORDER) {
    const rows = tableRows(plan, rowsKey);
    idCollisions[table] = await existingIds(supabase, table, rows.map((row) => row.id).filter(Boolean));
  }
  const runKeyCollisions = await existingRunKeys(supabase, tableRows(plan, "acquisitionRunRows"));
  const rawCollisions = await rawPayloadCollisions(supabase, tableRows(plan, "rawSnapshotRows"));
  const sellerUniqueCollisions = await sellerCollisions(supabase, tableRows(plan, "sellerSnapshotRows"));
  return {
    checked: true,
    id_collisions: idCollisions,
    id_collision_count: Object.values(idCollisions).reduce((sum, rows) => sum + rows.length, 0),
    run_key_collision_count: runKeyCollisions.length,
    run_key_collisions: runKeyCollisions,
    raw_payload_collision_count: rawCollisions.length,
    raw_payload_collision_samples: rawCollisions.slice(0, 10),
    seller_unique_collision_count: sellerUniqueCollisions.length,
    seller_unique_collision_samples: sellerUniqueCollisions.slice(0, 10),
  };
}

async function insertRows(supabase, table, rows) {
  let inserted = 0;
  for (let index = 0; index < rows.length; index += 100) {
    const chunk = rows.slice(index, index + 100);
    if (!chunk.length) continue;
    const { data, error } = await supabase
      .from(table)
      .insert(chunk)
      .select("id");
    if (error) throw new Error(`[market-listing-delta-apply] insert failed for ${table}: ${error.message}`);
    inserted += data?.length ?? 0;
  }
  return inserted;
}

async function applyRows(supabase, plan) {
  const inserted = {};
  for (const [table, rowsKey] of APPLY_ORDER) {
    inserted[table] = await insertRows(supabase, table, tableRows(plan, rowsKey));
  }
  return inserted;
}

async function countByIn(supabase, table, column, values) {
  let total = 0;
  for (let index = 0; index < values.length; index += 100) {
    const chunk = values.slice(index, index + 100);
    if (!chunk.length) continue;
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in(column, chunk);
    if (error) throw new Error(`[market-listing-delta-apply] readback failed for ${table}: ${error.message}`);
    total += count ?? 0;
  }
  return total;
}

async function readbackCounts(supabase, plan) {
  const runId = plan.rows.acquisitionRunRows[0].id;
  const observationIds = tableRows(plan, "observationRows").map((row) => row.id);
  const result = {};
  for (const [table] of APPLY_ORDER) {
    if (table === "market_listing_price_events") {
      result[table] = await countByIn(supabase, table, "observation_id", observationIds);
      continue;
    }
    if (table === "market_listing_query_cache") {
      result[table] = tableRows(plan, "queryCacheRows").length === 0 ? 0 : await countByIn(supabase, table, "id", tableRows(plan, "queryCacheRows").map((row) => row.id));
      continue;
    }
    let query = supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    query = table === "market_listing_acquisition_runs"
      ? query.eq("id", runId)
      : query.eq("acquisition_run_id", runId);
    const { count, error } = await query;
    if (error) throw new Error(`[market-listing-delta-apply] readback failed for ${table}: ${error.message}`);
    result[table] = count ?? 0;
  }
  return result;
}

function expectedReadbackCounts(plan) {
  return Object.fromEntries(APPLY_ORDER.map(([table, rowsKey]) => [table, tableRows(plan, rowsKey).length]));
}

function readbackMatchesExpected(readback, expected) {
  return Object.entries(expected).every(([table, count]) => readback?.[table] === count);
}

function validatePlan(plan, collision, apply) {
  const findings = [];
  if (plan.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
  if (plan.row_manifest_hash_sha256 !== EXPECTED_ROW_MANIFEST_HASH) findings.push("row_manifest_hash_mismatch");
  if (plan.source_plan_fingerprint_sha256 !== EXPECTED_SOURCE_PLAN_FINGERPRINT) findings.push("source_plan_fingerprint_mismatch");
  if (plan.source_row_manifest_hash_sha256 !== EXPECTED_SOURCE_ROW_MANIFEST_HASH) findings.push("source_row_manifest_hash_mismatch");
  if (plan.schema_migration_hash_sha256 !== EXPECTED_SCHEMA_MIGRATION_HASH) findings.push("schema_migration_hash_mismatch");
  if (plan.ready_for_apply_approval !== true) findings.push("plan_not_ready_for_apply");
  if ((plan.findings ?? []).length > 0) findings.push("plan_contains_findings");
  if ((collision?.id_collision_count ?? 0) > 0) findings.push("remote_id_collisions_detected");
  if ((collision?.run_key_collision_count ?? 0) > 0) findings.push("remote_run_key_collisions_detected");
  if ((collision?.raw_payload_collision_count ?? 0) > 0) findings.push("remote_raw_payload_collisions_detected");
  if ((collision?.seller_unique_collision_count ?? 0) > 0) findings.push("remote_seller_unique_collisions_detected");
  if (!apply) findings.push("apply_flag_missing");
  return findings;
}

function renderMarkdown(report) {
  return [
    "# MEE-11J Market Listing Broad Intake Delta Backfill Apply",
    "",
    `- Package: \`${report.package_id}\``,
    `- Applied: \`${report.applied}\``,
    `- Remote rows verified: \`${report.remote_rows_verified}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    `- Plan artifact: \`${report.plan_artifact}\``,
    "",
    "## Inserted Rows",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...Object.entries(report.apply_result?.inserted ?? {}).map(([table, count]) => `| \`${table}\` | ${count} |`),
    "",
    "## Readback Counts",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...Object.entries(report.readback_counts ?? {}).map(([table, count]) => `| \`${table}\` | ${count} |`),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const plan = await readPlan(args.planPath);
  const supabase = createBackendClient();
  const collision = await collisionSummary(supabase, plan.data);
  const findings = validatePlan(plan.data, collision, args.apply);
  let applyResult = null;
  let readback = null;
  const expectedReadback = expectedReadbackCounts(plan.data);

  if (args.apply && findings.length === 0) {
    const inserted = await applyRows(supabase, plan.data);
    applyResult = { inserted };
    readback = await readbackCounts(supabase, plan.data);
  }

  const remoteRowsVerified = readbackMatchesExpected(readback, expectedReadback);
  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    applied: Boolean(applyResult),
    remote_rows_verified: remoteRowsVerified,
    plan_artifact: rel(plan.path),
    package_fingerprint_sha256: plan.data.package_fingerprint_sha256,
    row_manifest_hash_sha256: plan.data.row_manifest_hash_sha256,
    source_plan_fingerprint_sha256: plan.data.source_plan_fingerprint_sha256,
    source_row_manifest_hash_sha256: plan.data.source_row_manifest_hash_sha256,
    schema_migration_hash_sha256: plan.data.schema_migration_hash_sha256,
    proposed_table_row_counts: plan.data.proposed_table_row_counts,
    expected_readback_counts: expectedReadback,
    remote_collision_summary: collision,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: Boolean(applyResult),
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
    apply_result: applyResult,
    readback_counts: readback,
  };

  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11j_market_listing_broad_intake_delta_backfill_apply_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11j_market_listing_broad_intake_delta_backfill_apply_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    applied: report.applied,
    remote_rows_verified: report.remote_rows_verified,
    findings: report.findings,
    apply_result: report.apply_result,
    readback_counts: report.readback_counts,
    artifacts: {
      jsonPath: rel(jsonPath),
      mdPath: rel(mdPath),
    },
  }, null, 2));

  if (!report.applied || !report.remote_rows_verified) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
