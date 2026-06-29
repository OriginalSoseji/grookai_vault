import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-REPAIR-APPLY-V1";
export const EXPECTED_PACKAGE_FINGERPRINT = "b0b65f427302042ba29889133a968551110cd277c7b5bfa2a68edd505b8ce79a";
export const EXPECTED_ROW_MANIFEST_HASH = "d49476930339252c71ab15dd71e4a83a1ef207b627a5e4b5767d8afb04d9cb04";
export const EXPECTED_SOURCE_PLAN_FINGERPRINT = "2ebd59a1c8b56e8f613ebd7c5a616a82c655bb0b2eed9899b71d309ba2226c44";
export const EXPECTED_SOURCE_ROW_MANIFEST_HASH = "92b002b5831f77b75c4ede1445a5dd2993bbee7df1a41ae78f83b539b185704a";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const REPAIR_PLAN_PATH = "docs/audits/market_evidence_engine_v1/mee_11p_market_listing_acquisition_daily_batch_backfill_repair_plan_2026-06-26T02-38-29-237Z.json";

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    readbackOnly: argv.includes("--readback-only"),
    planPath: argv.find((arg) => arg.startsWith("--plan="))?.slice("--plan=".length) ?? REPAIR_PLAN_PATH,
  };
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function supabaseRequest(factory, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await factory();
      if (result?.error && /fetch failed|network|terminated|timeout/i.test(result.error.message ?? "")) {
        lastError = result.error;
        if (attempt === attempts) return result;
        await sleep(500 * attempt);
        continue;
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await sleep(500 * attempt);
    }
  }
  throw lastError;
}

async function* readJsonLines(filePath) {
  const rl = readline.createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    yield JSON.parse(line);
  }
}

async function readPlan(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath);
  const data = JSON.parse(await fs.readFile(resolved, "utf8"));
  data.row_files = Object.fromEntries(Object.entries(data.row_files ?? {})
    .map(([key, value]) => [key, path.resolve(REPO_ROOT, value)]));
  if (data.source_plan_artifact) {
    const sourcePlanPath = path.resolve(REPO_ROOT, data.source_plan_artifact);
    const sourcePlan = JSON.parse(await fs.readFile(sourcePlanPath, "utf8"));
    sourcePlan.row_files = Object.fromEntries(Object.entries(sourcePlan.row_files ?? {})
      .map(([key, value]) => [key, path.resolve(REPO_ROOT, value)]));
    data.source_plan = sourcePlan;
    data.source_plan_path = sourcePlanPath;
  }
  return { path: resolved, data };
}

async function collectIds(filePath) {
  const ids = [];
  for await (const row of readJsonLines(filePath)) {
    if (row.id) ids.push(row.id);
  }
  return ids;
}

async function firstRow(filePath) {
  for await (const row of readJsonLines(filePath)) return row;
  return null;
}

async function existingIds(supabase, table, ids) {
  const found = [];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabaseRequest(() => supabase
      .from(table)
      .select("id")
      .in("id", chunk));
    if (error) throw new Error(`[market-listing-repair-apply] collision check failed for ${table}: ${error.message}`);
    found.push(...(data ?? []));
  }
  return found.map((row) => row.id);
}

async function collisionSummary(supabase, plan) {
  const sellerIds = await collectIds(plan.row_files.sellerSnapshotRows);
  const priceEventIds = await collectIds(plan.row_files.priceEventRows);
  const sellerCollisions = await existingIds(supabase, "market_listing_seller_snapshots", sellerIds);
  const priceEventCollisions = await existingIds(supabase, "market_listing_price_events", priceEventIds);
  return {
    checked: true,
    seller_snapshot_collision_count: sellerCollisions.length,
    price_event_collision_count: priceEventCollisions.length,
    seller_snapshot_collision_samples: sellerCollisions.slice(0, 10),
    price_event_collision_samples: priceEventCollisions.slice(0, 10),
  };
}

function validatePlan(plan, collision, args) {
  const findings = [];
  if (plan.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
  if (plan.row_manifest_hash_sha256 !== EXPECTED_ROW_MANIFEST_HASH) findings.push("row_manifest_hash_mismatch");
  if (plan.source_plan_fingerprint_sha256 !== EXPECTED_SOURCE_PLAN_FINGERPRINT) findings.push("source_plan_fingerprint_mismatch");
  if (plan.source_row_manifest_hash_sha256 !== EXPECTED_SOURCE_ROW_MANIFEST_HASH) findings.push("source_row_manifest_hash_mismatch");
  if (plan.ready_for_apply_approval !== true) findings.push("plan_not_ready_for_apply");
  if ((plan.findings ?? []).length > 0) findings.push("plan_contains_findings");
  if (!args.readbackOnly && (collision?.seller_snapshot_collision_count ?? 0) > 0) findings.push("seller_snapshot_collisions_detected");
  if (!args.readbackOnly && (collision?.price_event_collision_count ?? 0) > 0) findings.push("price_event_collisions_detected");
  if (!args.apply && !args.readbackOnly) findings.push("apply_flag_missing");
  return findings;
}

async function insertJsonlRows(supabase, table, filePath, chunkSize, progressEvery = 10_000) {
  let inserted = 0;
  let chunk = [];
  async function flush() {
    if (!chunk.length) return;
    const { data, error } = await supabaseRequest(() => supabase
      .from(table)
      .insert(chunk)
      .select("id"));
    if (error) throw new Error(`[market-listing-repair-apply] insert failed for ${table}: ${error.message}`);
    inserted += data?.length ?? chunk.length;
    if (inserted % progressEvery < chunk.length) {
      console.error(`[market-listing-repair-apply] inserted ${inserted} into ${table}`);
    }
    chunk = [];
  }

  for await (const row of readJsonLines(filePath)) {
    chunk.push(row);
    if (chunk.length >= chunkSize) await flush();
  }
  await flush();
  return inserted;
}

async function applyRows(supabase, plan) {
  return {
    market_listing_seller_snapshots: await insertJsonlRows(
      supabase,
      "market_listing_seller_snapshots",
      plan.row_files.sellerSnapshotRows,
      500,
    ),
    market_listing_price_events: await insertJsonlRows(
      supabase,
      "market_listing_price_events",
      plan.row_files.priceEventRows,
      500,
    ),
  };
}

async function countByIn(supabase, table, column, values) {
  let total = 0;
  for (let index = 0; index < values.length; index += 100) {
    const chunk = values.slice(index, index + 100);
    const { count, error } = await supabaseRequest(() => supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in(column, chunk));
    if (error) throw new Error(`[market-listing-repair-apply] readback failed for ${table}: ${error.message}`);
    total += count ?? 0;
  }
  return total;
}

async function countByRun(supabase, table, runId) {
  const query = table === "market_listing_acquisition_runs"
    ? supabase.from(table).select("id", { count: "exact", head: true }).eq("id", runId)
    : supabase.from(table).select("id", { count: "exact", head: true }).eq("acquisition_run_id", runId);
  const { count, error } = await supabaseRequest(() => query);
  if (error) throw new Error(`[market-listing-repair-apply] readback failed for ${table}: ${error.message}`);
  return count ?? 0;
}

async function readbackCounts(supabase, plan) {
  const sourcePlan = plan.source_plan;
  const acquisitionRun = await firstRow(sourcePlan.row_files.acquisitionRunRows);
  const runId = acquisitionRun?.id;
  const observationIds = await collectIds(sourcePlan.row_files.observationRows);
  return {
    market_listing_acquisition_runs: await countByRun(supabase, "market_listing_acquisition_runs", runId),
    market_listing_query_cache: await countByRun(supabase, "market_listing_query_cache", runId),
    market_listing_raw_snapshots: await countByRun(supabase, "market_listing_raw_snapshots", runId),
    market_listing_observations: await countByRun(supabase, "market_listing_observations", runId),
    market_listing_seller_snapshots: await countByRun(supabase, "market_listing_seller_snapshots", runId),
    market_listing_price_events: await countByIn(supabase, "market_listing_price_events", "observation_id", observationIds),
  };
}

function expectedReadbackCounts(plan) {
  return {
    market_listing_acquisition_runs: plan.source_plan.proposed_table_row_counts.market_listing_acquisition_runs,
    market_listing_query_cache: plan.source_plan.proposed_table_row_counts.market_listing_query_cache,
    market_listing_raw_snapshots: plan.source_plan.proposed_table_row_counts.market_listing_raw_snapshots,
    market_listing_observations: plan.source_plan.proposed_table_row_counts.market_listing_observations,
    market_listing_seller_snapshots: plan.source_plan.proposed_table_row_counts.market_listing_seller_snapshots,
    market_listing_price_events: plan.source_plan.proposed_table_row_counts.market_listing_price_events,
  };
}

function readbackMatchesExpected(readback, expected) {
  return Object.entries(expected).every(([table, count]) => readback?.[table] === count);
}

function renderMarkdown(report) {
  return [
    "# MEE-11Q Market Listing Daily Batch Backfill Repair Apply",
    "",
    `- Applied by this invocation: \`${report.applied}\``,
    `- Remote rows verified: \`${report.remote_rows_verified}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
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
  const collision = args.readbackOnly ? { checked: false } : await collisionSummary(supabase, plan.data);
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

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    applied: Boolean(applyResult),
    remote_rows_verified: readbackMatchesExpected(readback, expectedReadback),
    mode: args.apply ? "apply" : args.readbackOnly ? "readback_only" : "dry_run",
    plan_artifact: rel(plan.path),
    package_fingerprint_sha256: plan.data.package_fingerprint_sha256,
    row_manifest_hash_sha256: plan.data.row_manifest_hash_sha256,
    source_plan_fingerprint_sha256: plan.data.source_plan_fingerprint_sha256,
    source_row_manifest_hash_sha256: plan.data.source_row_manifest_hash_sha256,
    proposed_table_row_counts: plan.data.proposed_table_row_counts,
    expected_readback_counts: expectedReadback,
    remote_collision_summary: collision,
    repair_stats: plan.data.repair_stats,
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

  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11q_market_listing_acquisition_daily_batch_backfill_repair_apply_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11q_market_listing_acquisition_daily_batch_backfill_repair_apply_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    applied: report.applied,
    remote_rows_verified: report.remote_rows_verified,
    findings: report.findings,
    apply_result: report.apply_result,
    readback_counts: report.readback_counts,
    remote_collision_summary: report.remote_collision_summary,
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
