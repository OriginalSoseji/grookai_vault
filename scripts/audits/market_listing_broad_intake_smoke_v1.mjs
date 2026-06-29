import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMarketListingBroadIntakeSmokeReportV1,
} from "../../backend/pricing/market_listing_broad_intake_smoke_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  const value = (name, fallback) => {
    const raw = argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`[market-listing-broad-smoke] --${name} must be positive`);
    return parsed;
  };
  return {
    requestLimit: value("request-limit", 5),
    resultLimit: value("result-limit", 5),
    retryErrorsFrom: argv.find((arg) => arg.startsWith("--retry-errors-from="))?.slice("--retry-errors-from=".length) ?? null,
  };
}

function retryRequestsFromArtifact(filePath) {
  if (!filePath) return null;
  const artifact = JSON.parse(readFileSync(path.resolve(REPO_ROOT, filePath), "utf8"));
  return (artifact.request_results ?? [])
    .filter((result) => result.fetch_status === "fetched_error")
    .map((result, index) => ({
      ordinal: index + 1,
      query_key: result.query_key,
      source: "ebay_active",
      provider_route: "ebay_browse_api",
      card_print_id: null,
      gv_id: `BROAD-POKEMON-RETRY-${String(index + 1).padStart(3, "0")}`,
      strategy: result.strategy ?? "broad_pokemon_single_card_intake",
      query_text: result.query_text,
      offset: result.offset ?? 0,
      needs_review: true,
      can_publish_price_directly: false,
      market_truth: false,
      app_visible: false,
    }));
}

function renderMarkdown(report) {
  const sample = report.projected_observations.slice(0, 30);
  return [
    "# MEE-11F Market Listing Broad Intake Smoke",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready for broad backfill plan: \`${report.ready_for_broad_backfill_plan}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Raw snapshot manifest hash: \`${report.raw_snapshot_manifest_hash_sha256}\``,
    `- Projected observation manifest hash: \`${report.projected_observation_manifest_hash_sha256}\``,
    `- Queries: \`${report.summary.query_count}\``,
    `- Fetched items: \`${report.summary.fetched_item_count}\``,
    `- Unique listings: \`${report.summary.unique_listing_count}\``,
    `- Clean observations: \`${report.summary.clean_observation_count}\``,
    `- Slab observations: \`${report.summary.slab_observation_count ?? 0}\``,
    "",
    "## Boundary",
    "",
    "- Provider calls happened only for this capped smoke batch.",
    "- Local artifacts only.",
    "- No database writes.",
    "- No market listing warehouse writes.",
    "- No public/app-visible pricing.",
    "",
    "## Request Results",
    "",
    "| Query | Offset | Status | HTTP | Provider total | Items |",
    "| --- | ---: | --- | ---: | ---: | ---: |",
    ...report.request_results.map((result) => `| ${result.query_text.replace(/\|/g, "\\|")} | ${result.offset ?? 0} | ${result.fetch_status} | ${result.response_status ?? ""} | ${result.provider_total ?? 0} | ${result.fetched_item_count ?? 0} |`),
    "",
    "## Sample Observations",
    "",
    "| Title | Total | Currency | Class | Flags |",
    "| --- | ---: | --- | --- | --- |",
    ...sample.map((observation) => `| ${(observation.listing_title ?? "").replace(/\|/g, "\\|")} | ${observation.total_ask_price ?? ""} | ${observation.currency ?? ""} | ${observation.listing_evidence_class ?? ""} | ${observation.ingestion_exclusion_flags.join(", ") || "clean"} |`),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_11f_market_listing_broad_intake_smoke_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
  };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const retryRequests = retryRequestsFromArtifact(args.retryErrorsFrom);
    const report = await buildMarketListingBroadIntakeSmokeReportV1({
      requestsOverride: retryRequests,
      requestLimit: retryRequests ? retryRequests.length : args.requestLimit,
      resultLimit: args.resultLimit,
    });
    const artifacts = writeReport(report);
    console.log(JSON.stringify({
      package_id: report.package_id,
      ready_for_broad_backfill_plan: report.ready_for_broad_backfill_plan,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      raw_snapshot_manifest_hash_sha256: report.raw_snapshot_manifest_hash_sha256,
      projected_observation_manifest_hash_sha256: report.projected_observation_manifest_hash_sha256,
      summary: report.summary,
      findings: report.findings,
      artifacts,
    }, null, 2));
    if (!report.ready_for_broad_backfill_plan) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
