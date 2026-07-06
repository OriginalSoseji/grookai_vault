import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { buildMarketListingAcquisitionDailyBatchFetchV1 } from "../../backend/pricing/market_listing_acquisition_daily_batch_fetch_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const BATCH_PREFIX = "mee_11k_market_listing_acquisition_daily_batch_plan_";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  return {
    batchPlanPath: argv.find((arg) => arg.startsWith("--batch-plan="))?.slice("--batch-plan=".length) ?? null,
    progressEvery: Number.parseInt(argv.find((arg) => arg.startsWith("--progress-every="))?.slice("--progress-every=".length) ?? "50", 10),
    allowDynamicPlan: argv.includes("--allow-dynamic-plan"),
  };
}

function latestBatchPlanPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const candidates = readdirSync(dir)
    .filter((fileName) => fileName.startsWith(BATCH_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[market-listing-daily-batch-fetch] no ${BATCH_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

function readBatchPlan(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath ?? latestBatchPlanPath());
  return JSON.parse(readFileSync(resolved, "utf8"));
}

function redactSecretText(value) {
  return String(value ?? "")
    .replace(/Authorization:\s*Basic\s+[A-Za-z0-9+/=._-]+/gi, "Authorization: Basic <redacted>")
    .replace(/access_token["']?\s*:\s*["'][^"']+["']/gi, 'access_token":"<redacted>"');
}

function ensureBrowseToken() {
  if (process.env.EBAY_BROWSE_ACCESS_TOKEN?.trim()) return;
  const clientId = process.env.EBAY_CLIENT_ID?.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return;
  const baseUrl = (process.env.EBAY_OAUTH_BASE_URL || "https://api.ebay.com").replace(/\/+$/, "");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const curlBin = process.platform === "win32" ? "curl.exe" : "curl";
  const curlArgs = [
    "-sS",
    "-L",
    "-X",
    "POST",
    `${baseUrl}/identity/v1/oauth2/token`,
    "-H",
    `Authorization: Basic ${basic}`,
    "-H",
    "Content-Type: application/x-www-form-urlencoded",
    "--data",
    "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  ];
  if (process.platform === "win32") curlArgs.splice(2, 0, "--ssl-no-revoke");
  let output;
  try {
    output = execFileSync(curlBin, curlArgs, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const status = error?.status ?? error?.code ?? "unknown";
    const stderr = redactSecretText(error?.stderr?.toString?.() ?? error?.message ?? "");
    throw new Error(`[market-listing-daily-batch-fetch] eBay OAuth token request failed: ${status}${stderr ? ` ${stderr}` : ""}`);
  }
  const payload = JSON.parse(output);
  if (payload.access_token) process.env.EBAY_BROWSE_ACCESS_TOKEN = payload.access_token;
}

function approvalPrompt(report) {
  return `Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1 plan only. Package fingerprint: ${report.package_fingerprint_sha256}. Request results manifest hash: ${report.request_results_manifest_hash_sha256}. Raw snapshot manifest hash: ${report.raw_snapshot_manifest_hash_sha256}. Projected observation manifest hash: ${report.projected_observation_manifest_hash_sha256}. Scope: prepare DB backfill apply package from local MEE-11L daily batch fetch artifacts only, targeting market_listing_* warehouse tables only and preserving slab/raw-single classification metadata. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.`;
}

function renderMarkdown(report) {
  return [
    "# MEE-11L Market Listing Acquisition Daily Batch Fetch",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready for local DB backfill plan: \`${report.ready_for_local_db_backfill_plan}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Request results manifest hash: \`${report.request_results_manifest_hash_sha256}\``,
    `- Raw snapshot manifest hash: \`${report.raw_snapshot_manifest_hash_sha256}\``,
    `- Projected observation manifest hash: \`${report.projected_observation_manifest_hash_sha256}\``,
    `- Attempted requests: \`${report.summary.attempted_request_count}\``,
    `- Fetched items: \`${report.summary.fetched_item_count}\``,
    `- Projected observations: \`${report.summary.projected_observation_count}\``,
    `- Unique listings: \`${report.summary.unique_listing_count}\``,
    `- Raw singles: \`${report.summary.raw_single_observation_count}\``,
    `- Slabs: \`${report.summary.slab_observation_count}\``,
    "",
    "## Boundary",
    "",
    "- Provider calls happened only for the approved daily batch.",
    "- Local artifacts only.",
    "- No database writes.",
    "- No market listing warehouse writes.",
    "- No public/app-visible pricing.",
    "",
    "## Counts",
    "",
    "```json",
    JSON.stringify({
      fetch_status_counts: report.summary.fetch_status_counts,
      evidence_class_counts: report.summary.evidence_class_counts,
      exclusion_flag_counts: report.summary.exclusion_flag_counts,
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

function writeReport(report, stamp, artifactDir) {
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11l_market_listing_acquisition_daily_batch_fetch_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11l_market_listing_acquisition_daily_batch_fetch_${stamp}.md`);
  const output = {
    ...report,
    artifacts: Object.fromEntries(Object.entries(report.artifacts).map(([key, value]) => [key, rel(value)])),
    artifact_dir: rel(artifactDir),
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
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const artifactDir = path.join(REPO_ROOT, AUDIT_DIR, `mee_11l_market_listing_acquisition_daily_batch_fetch_${stamp}`);
    mkdirSync(artifactDir, { recursive: true });
    ensureBrowseToken();
    const batchPlan = readBatchPlan(args.batchPlanPath);
    const report = await buildMarketListingAcquisitionDailyBatchFetchV1({
      batchPlan,
      artifactDir,
      progressEvery: Number.isFinite(args.progressEvery) ? args.progressEvery : 50,
      logger: (line) => console.error(line),
      allowDynamicPlan: args.allowDynamicPlan,
    });
    const artifacts = writeReport(report, stamp, artifactDir);
    console.log(JSON.stringify({
      package_id: report.package_id,
      ready_for_local_db_backfill_plan: report.ready_for_local_db_backfill_plan,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      request_results_manifest_hash_sha256: report.request_results_manifest_hash_sha256,
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
