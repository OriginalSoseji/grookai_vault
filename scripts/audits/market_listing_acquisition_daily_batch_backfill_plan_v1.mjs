import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMarketListingAcquisitionDailyBatchBackfillPlanV1 } from "../../backend/pricing/market_listing_acquisition_daily_batch_backfill_plan_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const FETCH_PREFIX = "mee_11l_market_listing_acquisition_daily_batch_fetch_";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  return {
    fetchPath: argv.find((arg) => arg.startsWith("--fetch="))?.slice("--fetch=".length) ?? null,
    allowDynamicPlan: argv.includes("--allow-dynamic-plan"),
  };
}

function latestFetchPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const candidates = readdirSync(dir)
    .filter((fileName) => fileName.startsWith(FETCH_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[market-listing-daily-backfill-plan] no ${FETCH_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

function readFetch(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath ?? latestFetchPath());
  const data = JSON.parse(readFileSync(resolved, "utf8"));
  data.artifacts = Object.fromEntries(Object.entries(data.artifacts ?? {})
    .map(([key, value]) => [key, path.resolve(REPO_ROOT, value)]));
  return {
    path: resolved,
    data,
  };
}

function approvalPrompt(report) {
  return `Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-APPLY-V1 apply only. Package fingerprint: ${report.package_fingerprint_sha256}. Row manifest hash: ${report.row_manifest_hash_sha256}. Source package fingerprint: ${report.source_package_fingerprint_sha256}. Request results manifest hash: ${report.request_results_manifest_hash_sha256}. Raw snapshot manifest hash: ${report.raw_snapshot_manifest_hash_sha256}. Projected observation manifest hash: ${report.projected_observation_manifest_hash_sha256}. Schema migration hash: ${report.schema_migration_hash_sha256}. Scope: insert ${report.proposed_table_row_counts.market_listing_acquisition_runs} market_listing_acquisition_runs row, ${report.proposed_table_row_counts.market_listing_query_cache} market_listing_query_cache rows, ${report.proposed_table_row_counts.market_listing_raw_snapshots} market_listing_raw_snapshots rows, ${report.proposed_table_row_counts.market_listing_observations} market_listing_observations rows, ${report.proposed_table_row_counts.market_listing_seller_snapshots} market_listing_seller_snapshots rows, and ${report.proposed_table_row_counts.market_listing_price_events} market_listing_price_events rows from local MEE-11M daily batch backfill row artifacts only, preserving slab/raw-single classification metadata in event_payload. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.`;
}

function renderMarkdown(report, fetchArtifactPath) {
  return [
    "# MEE-11M Market Listing Acquisition Daily Batch Backfill Plan",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready for apply approval: \`${report.ready_for_apply_approval}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    `- Source package fingerprint: \`${report.source_package_fingerprint_sha256}\``,
    `- Request results manifest hash: \`${report.request_results_manifest_hash_sha256}\``,
    `- Raw snapshot manifest hash: \`${report.raw_snapshot_manifest_hash_sha256}\``,
    `- Projected observation manifest hash: \`${report.projected_observation_manifest_hash_sha256}\``,
    `- Fetch artifact: \`${fetchArtifactPath}\``,
    "",
    "## Proposed Row Counts",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...Object.entries(report.proposed_table_row_counts).map(([table, count]) => `| \`${table}\` | ${count} |`),
    "",
    "## Summary",
    "",
    "```json",
    JSON.stringify(report.summary, null, 2),
    "```",
    "",
    "## Apply Order",
    "",
    ...report.apply_order.map((table) => `- \`${table}\``),
    "",
    "## Boundary",
    "",
    "- Plan only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No public/app-visible pricing.",
    "- No card candidate writes.",
    "- No rollup writes.",
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

function writeReport(report, fetchArtifactPath, stamp) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11m_market_listing_acquisition_daily_batch_backfill_plan_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11m_market_listing_acquisition_daily_batch_backfill_plan_${stamp}.md`);
  const output = {
    ...report,
    row_files: Object.fromEntries(Object.entries(report.row_files).map(([key, value]) => [key, rel(value)])),
    approval_prompt_for_next_step: approvalPrompt(report),
  };
  writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(output, fetchArtifactPath));
  return {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
  };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fetch = readFetch(args.fetchPath);
    const outputDir = path.join(REPO_ROOT, AUDIT_DIR, `mee_11m_market_listing_acquisition_daily_batch_backfill_plan_${stamp}`);
    const report = await buildMarketListingAcquisitionDailyBatchBackfillPlanV1({
      fetchArtifact: fetch.data,
      outputDir,
      allowDynamicPlan: args.allowDynamicPlan,
    });
    const artifacts = writeReport(report, rel(fetch.path), stamp);
    console.log(JSON.stringify({
      package_id: report.package_id,
      ready_for_apply_approval: report.ready_for_apply_approval,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      row_manifest_hash_sha256: report.row_manifest_hash_sha256,
      proposed_table_row_counts: report.proposed_table_row_counts,
      summary: report.summary,
      findings: report.findings,
      artifacts,
      approval_prompt_for_next_step: approvalPrompt(report),
    }, null, 2));
    if (!report.ready_for_apply_approval) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
