import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-LISTING-BROAD-INTAKE-BACKFILL-APPLY-V1";
export const EXPECTED_PLAN_PACKAGE_FINGERPRINT = "d9b5463efbdfc41ad22c2b846911b937203a5273000c20dfc3bbc303c61a812c";
export const EXPECTED_ROW_MANIFEST_HASH = "6ab07f492e4e14091a8294eac94fb4c754cf4d13c825a1553c486ffaf07e6aeb";
export const EXPECTED_SOURCE_PACKAGE_FINGERPRINT = "52388b720c74445b5ce6dfb48e712dbedddb15347a5497c73a68437e050a2f7a";
export const EXPECTED_RAW_SNAPSHOT_MANIFEST_HASH = "eeeee0cdaeb616b54ed1c758196ad85d5f502542f85db9c632e026255cfbe455";
export const EXPECTED_OBSERVATION_MANIFEST_HASH = "60fa0344b78b753b77c7fb3ac7fd3d99eceee428cfba8fd89382bf6aa84ad51f";
export const EXPECTED_SCHEMA_MIGRATION_HASH = "2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const PLAN_PREFIX = "mee_11g_market_listing_broad_intake_backfill_plan_";

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
    readbackOnly: argv.includes("--readback-only"),
    planPath: argv.find((arg) => arg.startsWith("--plan="))?.slice("--plan=".length) ?? null,
  };
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function latestPlanPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const files = await fs.readdir(dir);
  const candidates = files
    .filter((fileName) => fileName.startsWith(PLAN_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[market-listing-backfill-apply] no ${PLAN_PREFIX}*.json artifact found`);
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
  if (!ids.length) return [];
  const found = [];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .in("id", chunk);
    if (error) throw new Error(`[market-listing-backfill-apply] collision check failed for ${table}: ${error.message}`);
    found.push(...(data ?? []));
  }
  return found.map((row) => row.id);
}

async function listingCollisions(supabase, rows) {
  const listingIds = [...new Set(rows.map((row) => row.source_listing_id).filter(Boolean))];
  if (!listingIds.length) return [];
  const found = [];
  for (let index = 0; index < listingIds.length; index += 100) {
    const chunk = listingIds.slice(index, index + 100);
    const { data, error } = await supabase
      .from("market_listing_raw_snapshots")
      .select("id,source,source_listing_id,payload_hash")
      .eq("source", "ebay_active")
      .in("source_listing_id", chunk);
    if (error) throw new Error(`[market-listing-backfill-apply] listing collision check failed: ${error.message}`);
    found.push(...(data ?? []));
  }
  return found;
}

async function collisionSummary(supabase, plan) {
  const idCollisions = {};
  for (const [table, rowsKey] of APPLY_ORDER) {
    const rows = tableRows(plan, rowsKey);
    const ids = rows.map((row) => row.id).filter(Boolean);
    idCollisions[table] = await existingIds(supabase, table, ids);
  }
  const rawListingCollisions = await listingCollisions(supabase, tableRows(plan, "rawSnapshotRows"));
  return {
    checked: true,
    id_collisions: idCollisions,
    id_collision_count: Object.values(idCollisions).reduce((sum, rows) => sum + rows.length, 0),
    raw_listing_collision_count: rawListingCollisions.length,
    raw_listing_collision_samples: rawListingCollisions.slice(0, 10),
  };
}

async function insertRows(supabase, table, rows) {
  if (!rows.length) return 0;
  const { data, error } = await supabase
    .from(table)
    .insert(rows)
    .select("id");
  if (error) throw new Error(`[market-listing-backfill-apply] insert failed for ${table}: ${error.message}`);
  return data?.length ?? 0;
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
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in(column, chunk);
    if (error) throw new Error(`[market-listing-backfill-apply] readback failed for ${table}: ${error.message}`);
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

    let query = supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    query = table === "market_listing_acquisition_runs"
      ? query.eq("id", runId)
      : query.eq("acquisition_run_id", runId);
    const { count, error } = await query;
    if (error) throw new Error(`[market-listing-backfill-apply] readback failed for ${table}: ${error.message}`);
    result[table] = count ?? 0;
  }
  return result;
}

function validatePlan(plan, collision, args) {
  const findings = [];
  if (plan.package_fingerprint_sha256 !== EXPECTED_PLAN_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
  if (plan.row_manifest_hash_sha256 !== EXPECTED_ROW_MANIFEST_HASH) findings.push("row_manifest_hash_mismatch");
  if (plan.source_package_fingerprint_sha256 !== EXPECTED_SOURCE_PACKAGE_FINGERPRINT) findings.push("source_package_fingerprint_mismatch");
  if (plan.raw_snapshot_manifest_hash_sha256 !== EXPECTED_RAW_SNAPSHOT_MANIFEST_HASH) findings.push("raw_snapshot_manifest_hash_mismatch");
  if (plan.projected_observation_manifest_hash_sha256 !== EXPECTED_OBSERVATION_MANIFEST_HASH) findings.push("projected_observation_manifest_hash_mismatch");
  if (plan.schema_migration_hash_sha256 !== EXPECTED_SCHEMA_MIGRATION_HASH) findings.push("schema_migration_hash_mismatch");
  if (plan.ready_for_apply_approval !== true) findings.push("plan_not_ready_for_apply");
  if ((plan.findings ?? []).length > 0) findings.push("plan_contains_findings");
  if (!args.readbackOnly && (collision?.id_collision_count ?? 0) > 0) findings.push("remote_id_collisions_detected");
  if (!args.readbackOnly && (collision?.raw_listing_collision_count ?? 0) > 0) findings.push("remote_raw_listing_collisions_detected");
  if (!args.apply && !args.readbackOnly) findings.push("apply_flag_missing");
  return findings;
}

function expectedReadbackCounts(plan) {
  return Object.fromEntries(
    APPLY_ORDER.map(([table, rowsKey]) => [table, tableRows(plan, rowsKey).length]),
  );
}

function readbackMatchesExpected(readback, expected) {
  return Object.entries(expected).every(([table, count]) => readback?.[table] === count);
}

function renderMarkdown(report) {
  return [
    "# MEE-11H Market Listing Broad Intake Backfill Apply",
    "",
    `- Package: \`${report.package_id}\``,
    `- Applied by this invocation: \`${report.applied}\``,
    `- Remote rows verified: \`${report.remote_rows_verified}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    `- Plan artifact: \`${report.plan_artifact}\``,
    "",
    "## Inserted Rows",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...(Object.keys(report.apply_result?.inserted ?? {}).length
      ? Object.entries(report.apply_result.inserted).map(([table, count]) => `| \`${table}\` | ${count} |`)
      : ["| none in this invocation | 0 |"]),
    "",
    "## Readback Counts",
    "",
    "| Table | Rows for acquisition run |",
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
  const findings = validatePlan(plan.data, collision, args);
  let applyResult = null;
  let readback = null;
  const expectedReadback = expectedReadbackCounts(plan.data);

  if (args.apply && findings.length === 0) {
    const inserted = await applyRows(supabase, plan.data);
    applyResult = { inserted };
    readback = await readbackCounts(supabase, plan.data);
  } else if (args.readbackOnly) {
    readback = await readbackCounts(supabase, plan.data);
  }
  const remoteRowsVerified = readbackMatchesExpected(readback, expectedReadback);

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    applied: Boolean(applyResult),
    remote_rows_verified: remoteRowsVerified,
    mode: args.apply ? "apply" : args.readbackOnly ? "readback_only" : "dry_run",
    plan_artifact: rel(plan.path),
    package_fingerprint_sha256: plan.data.package_fingerprint_sha256,
    row_manifest_hash_sha256: plan.data.row_manifest_hash_sha256,
    source_package_fingerprint_sha256: plan.data.source_package_fingerprint_sha256,
    raw_snapshot_manifest_hash_sha256: plan.data.raw_snapshot_manifest_hash_sha256,
    projected_observation_manifest_hash_sha256: plan.data.projected_observation_manifest_hash_sha256,
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

  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11h_market_listing_broad_intake_backfill_apply_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11h_market_listing_broad_intake_backfill_apply_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    applied: report.applied,
    findings: report.findings,
    apply_result: report.apply_result,
    readback_counts: report.readback_counts,
    artifacts: {
      jsonPath: rel(jsonPath),
      mdPath: rel(mdPath),
    },
  }, null, 2));

  if (!report.applied && !report.remote_rows_verified) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
