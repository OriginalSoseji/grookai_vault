import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMarketListingAcquisitionDailyBatchPlanV1 } from "../../backend/pricing/market_listing_acquisition_daily_batch_plan_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const DRY_RUN_PREFIX = "mee_11d_market_listing_acquisition_dry_run_plan_";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  const value = (name, fallback) => {
    const raw = argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`[market-listing-daily-batch] --${name} must be a non-negative integer`);
    return parsed;
  };
  return {
    dryRunPath: argv.find((arg) => arg.startsWith("--dry-run="))?.slice("--dry-run=".length) ?? null,
    batchOrdinal: value("batch-ordinal", 1),
    startIndex: value("start-index", 0),
    callLimit: value("call-limit", null),
  };
}

function latestDryRunPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const candidates = readdirSync(dir)
    .filter((fileName) => fileName.startsWith(DRY_RUN_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[market-listing-daily-batch] no ${DRY_RUN_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

function readDryRunPlan(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath ?? latestDryRunPath());
  return JSON.parse(readFileSync(resolved, "utf8"));
}

function approvalPrompt(report) {
  return `Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-FETCH-V1 acquisition only. Package fingerprint: ${report.package_fingerprint_sha256}. Request manifest hash: ${report.request_manifest_hash_sha256}. Source dry-run fingerprint: ${report.source_package_fingerprint_sha256}. Schema migration hash: ${report.schema_migration_hash_sha256}. Scope: fetch ${report.summary.batch_request_count} prioritized ebay_active Browse API request pages from the local MEE-11K daily batch plan only and write local acquisition artifacts only, including slab listings classified separately from raw singles. No DB writes. No market_listing_* writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.`;
}

function renderMarkdown(report) {
  return [
    "# MEE-11K Market Listing Acquisition Daily Batch Plan",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready for acquisition approval: \`${report.ready_for_acquisition_approval}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Request manifest hash: \`${report.request_manifest_hash_sha256}\``,
    `- Source dry-run fingerprint: \`${report.source_package_fingerprint_sha256}\``,
    `- Batch ordinal: \`${report.summary.batch_ordinal}\``,
    `- Start index: \`${report.summary.start_index}\``,
    `- Next start index: \`${report.summary.next_start_index}\``,
    `- Batch request count: \`${report.summary.batch_request_count}\``,
    `- Remaining request count: \`${report.summary.remaining_request_count}\``,
    `- Estimated max listing envelope: \`${report.summary.estimated_max_listing_envelope}\``,
    "",
    "## Boundary",
    "",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No market listing warehouse writes.",
    "- No public/app-visible pricing.",
    "",
    "## Counts",
    "",
    "```json",
    JSON.stringify({
      priority_counts: report.summary.priority_counts,
      rarity_priority_counts: report.summary.rarity_priority_counts,
      strategy_counts: report.summary.strategy_counts,
    }, null, 2),
    "```",
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

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_11k_market_listing_acquisition_daily_batch_plan_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  const output = {
    ...report,
    approval_prompt_for_next_step: approvalPrompt(report),
  };
  writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(output));
  return {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
  };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const dryRunPlan = readDryRunPlan(args.dryRunPath);
    const report = buildMarketListingAcquisitionDailyBatchPlanV1({
      dryRunPlan,
      batchOrdinal: args.batchOrdinal,
      startIndex: args.startIndex,
      callLimit: args.callLimit,
    });
    const artifacts = writeReport(report);
    console.log(JSON.stringify({
      package_id: report.package_id,
      ready_for_acquisition_approval: report.ready_for_acquisition_approval,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      request_manifest_hash_sha256: report.request_manifest_hash_sha256,
      summary: report.summary,
      findings: report.findings,
      artifacts,
      approval_prompt_for_next_step: approvalPrompt(report),
    }, null, 2));
    if (!report.ready_for_acquisition_approval) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
