import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMarketListingAcquisitionSmokeFetchReportV1 } from "../../backend/pricing/market_listing_acquisition_smoke_fetch_v1.mjs";

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
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`[market-listing-smoke-fetch] --${name} must be positive`);
    return parsed;
  };
  return {
    dryRunPath: argv.find((arg) => arg.startsWith("--dry-run="))?.slice("--dry-run=".length) ?? null,
    requestLimit: value("request-limit", 5),
    resultLimit: value("result-limit", 5),
  };
}

function latestDryRunPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const candidates = readdirSync(dir)
    .filter((fileName) => fileName.startsWith(DRY_RUN_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[market-listing-smoke-fetch] no ${DRY_RUN_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

function readDryRunPlan(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath ?? latestDryRunPath());
  return JSON.parse(readFileSync(resolved, "utf8"));
}

function approvalPrompt(report) {
  return `Approve real MARKET-LISTING-SMOKE-FETCH-DB-BACKFILL-PLAN-V1 plan only. Package fingerprint: ${report.package_fingerprint_sha256}. Raw snapshot manifest hash: ${report.raw_snapshot_manifest_hash_sha256}. Projected observation manifest hash: ${report.projected_observation_manifest_hash_sha256}. Scope: prepare DB backfill apply package from the local MEE-11E smoke fetch artifacts only, targeting market_listing_* warehouse tables only. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.`;
}

function responseRows(results) {
  return results.map((result) => `| ${result.gv_id} | ${result.strategy} | ${result.fetch_status} | ${result.response_status ?? ""} | ${result.provider_total ?? 0} | ${result.fetched_item_count ?? 0} |`);
}

function renderMarkdown(report) {
  return [
    "# MEE-11E Market Listing Acquisition Smoke Fetch",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready for DB backfill plan: \`${report.ready_for_local_db_backfill_plan}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Raw snapshot manifest hash: \`${report.raw_snapshot_manifest_hash_sha256}\``,
    `- Projected observation manifest hash: \`${report.projected_observation_manifest_hash_sha256}\``,
    `- Attempted requests: \`${report.summary.attempted_request_count}\``,
    `- Result limit: \`${report.summary.result_limit}\``,
    `- Fetched items: \`${report.summary.fetched_item_count}\``,
    `- Unique listings: \`${report.summary.unique_listing_count}\``,
    `- Unique targets with results: \`${report.summary.unique_target_count_with_results}\``,
    "",
    "## Boundary",
    "",
    "- Provider calls happened only for the capped smoke batch.",
    "- Local artifacts only.",
    "- No database writes.",
    "- No market listing warehouse writes.",
    "- No public/app-visible pricing.",
    "",
    "## Request Results",
    "",
    "| GV ID | Strategy | Status | HTTP | Provider total | Items |",
    "| --- | --- | --- | ---: | ---: | ---: |",
    ...responseRows(report.request_results),
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
  const base = `mee_11e_market_listing_acquisition_smoke_fetch_${new Date().toISOString().replace(/[:.]/g, "-")}`;
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
    const report = await buildMarketListingAcquisitionSmokeFetchReportV1({
      dryRunPlan,
      requestLimit: args.requestLimit,
      resultLimit: args.resultLimit,
    });
    const artifacts = writeReport(report);
    console.log(JSON.stringify({
      package_id: report.package_id,
      ready_for_local_db_backfill_plan: report.ready_for_local_db_backfill_plan,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      raw_snapshot_manifest_hash_sha256: report.raw_snapshot_manifest_hash_sha256,
      projected_observation_manifest_hash_sha256: report.projected_observation_manifest_hash_sha256,
      summary: report.summary,
      findings: report.findings,
      artifacts,
      approval_prompt_for_next_step: approvalPrompt(report),
    }, null, 2));
    if (!report.ready_for_local_db_backfill_plan) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
