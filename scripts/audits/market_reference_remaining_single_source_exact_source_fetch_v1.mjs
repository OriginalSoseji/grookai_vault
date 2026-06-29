import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRemainingSingleSourceExactSourceFetchReportV1 } from "../../backend/pricing/market_reference_remaining_single_source_exact_source_fetch_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const PACKAGE_PREFIX = "mee_09p_remaining_single_source_exact_source_acquisition_plan_";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  return {
    packagePath: argv.find((arg) => arg.startsWith("--package="))?.slice("--package=".length) ?? null,
    activeLimit: Number(argv.find((arg) => arg.startsWith("--active-limit="))?.slice("--active-limit=".length) ?? 3),
  };
}

function latestPackagePath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const candidates = readdirSync(dir)
    .filter((fileName) => fileName.startsWith(PACKAGE_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[remaining-single-source-fetch] no ${PACKAGE_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

function readPackage(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath ?? latestPackagePath());
  return {
    path: resolved,
    data: JSON.parse(readFileSync(resolved, "utf8")),
  };
}

function tableRows(object) {
  const entries = Object.entries(object ?? {});
  if (!entries.length) return ["| none | 0 |"];
  return entries.map(([key, value]) => `| ${key} | ${value} |`);
}

function resultRows(results) {
  return [
    "| GV ID | Source | Status | Candidates | Reason |",
    "| --- | --- | --- | ---: | --- |",
    ...results.map((row) => `| ${row.gv_id} | ${row.source} | ${row.fetch_status} | ${row.candidate_count} | ${(row.reason ?? "").replace(/\|/g, "\\|")} |`),
  ];
}

function approvalPrompt(report) {
  return `Approve real MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-BACKFILL-PLAN-V1 plan only. Candidate evidence manifest hash: ${report.candidate_evidence_manifest_hash_sha256}. Source package fingerprint: ${report.source_package_fingerprint_sha256}. Scope: prepare DB backfill package for ${report.summary.candidate_count} local fetched candidate evidence rows from MEE-09Q only. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.`;
}

function writeReport(report, sourcePackagePath) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09q_remaining_single_source_exact_source_fetch_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  const nextPrompt = approvalPrompt(report);
  const output = {
    ...report,
    source_acquisition_package_artifact: rel(sourcePackagePath),
    approval_prompt_for_next_step: nextPrompt,
  };
  writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
  writeFileSync(mdPath, [
    "# MEE-09Q Remaining Single-Source Exact Source Fetch",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready for review backfill plan: \`${report.ready_for_review_backfill_plan}\``,
    `- Candidate evidence manifest hash: \`${report.candidate_evidence_manifest_hash_sha256}\``,
    `- Source package fingerprint: \`${report.source_package_fingerprint_sha256}\``,
    `- Source package artifact: \`${rel(sourcePackagePath)}\``,
    `- Requests: \`${report.summary.request_count}\``,
    `- Candidate evidence rows: \`${report.summary.candidate_count}\``,
    `- Targets with candidates: \`${report.summary.unique_target_count_with_candidates}\``,
    "",
    "## Boundary",
    "",
    "- Approved provider fetch into local artifacts only.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No eBay latest price writes.",
    "- No public/app-visible pricing.",
    "- No price rollups.",
    "",
    "## Fetch Status Counts",
    "",
    "| Status | Requests |",
    "| --- | ---: |",
    ...tableRows(report.summary.fetch_status_counts),
    "",
    "## Candidate Source Counts",
    "",
    "| Source | Candidates |",
    "| --- | ---: |",
    ...tableRows(report.summary.candidate_source_counts),
    "",
    "## Request Results",
    "",
    ...resultRows(report.request_results),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Approval Prompt",
    "",
    "```text",
    nextPrompt,
    "```",
    "",
  ].join("\n"));
  return { jsonPath: rel(jsonPath), mdPath: rel(mdPath), approvalPrompt: nextPrompt };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const args = parseArgs(process.argv.slice(2));
  const pkg = readPackage(args.packagePath);
  buildRemainingSingleSourceExactSourceFetchReportV1({
    acquisitionPlan: pkg.data,
    activeLimit: args.activeLimit,
  })
    .then((report) => {
      const artifacts = writeReport(report, pkg.path);
      console.log(JSON.stringify({ ...report, artifacts }, null, 2));
      if (!report.ready_for_review_backfill_plan) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
