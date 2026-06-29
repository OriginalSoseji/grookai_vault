import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRemainingSingleSourceExactSourceAcquisitionPlanV1 } from "../../backend/pricing/market_reference_remaining_single_source_exact_source_acquisition_plan_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const EXACT_PLAN_PREFIX = "mee_09o_remaining_single_source_exact_source_plan_";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  return {
    exactPlanPath: argv.find((arg) => arg.startsWith("--exact-plan="))?.slice("--exact-plan=".length) ?? null,
  };
}

function latestExactPlanPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const candidates = readdirSync(dir)
    .filter((fileName) => fileName.startsWith(EXACT_PLAN_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[remaining-single-source-exact-acquisition] no ${EXACT_PLAN_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

function readExactPlan(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath ?? latestExactPlanPath());
  const data = JSON.parse(readFileSync(resolved, "utf8"));
  return {
    path: resolved,
    data: {
      ...data,
      artifact_path: rel(resolved),
    },
  };
}

function tableRows(object) {
  const entries = Object.entries(object ?? {});
  if (!entries.length) return ["| none | 0 |"];
  return entries.map(([key, value]) => `| ${key} | ${value} |`);
}

function requestRows(requests) {
  return [
    "| # | GV ID | Source | Status | Query |",
    "| ---: | --- | --- | --- | --- |",
    ...requests.map((request) => `| ${request.ordinal} | ${request.gv_id} | ${request.source} | ${request.acquisition_status} | ${request.query_text.replace(/\|/g, "\\|")} |`),
  ];
}

function approvalPrompt(report) {
  return `Approve real MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-FETCH-V1 acquisition only. Package fingerprint: ${report.package_fingerprint_sha256}. Request manifest hash: ${report.acquisition_request_manifest_hash_sha256}. Exact plan hash: ${report.exact_plan_hash_sha256}. Scope: fetch evidence candidates for ${report.summary.acquisition_request_count} queued acquisition requests across ${report.summary.target_count} strict single-source targets from MEE-09P only, writing local acquisition artifacts only. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.`;
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09p_remaining_single_source_exact_source_acquisition_plan_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  const nextPrompt = approvalPrompt(report);
  const output = {
    ...report,
    approval_prompt_for_next_step: nextPrompt,
  };
  writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
  writeFileSync(mdPath, [
    "# MEE-09P Remaining Single-Source Exact Source Acquisition Plan",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready for fetch approval: \`${report.ready_for_fetch_approval}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Request manifest hash: \`${report.acquisition_request_manifest_hash_sha256}\``,
    `- Exact plan hash: \`${report.exact_plan_hash_sha256}\``,
    `- Exact plan artifact: \`${report.exact_plan_artifact}\``,
    `- Requests: \`${report.summary.acquisition_request_count}\``,
    "",
    "## Boundary",
    "",
    "- Plan-only acquisition package.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No public/app-visible pricing.",
    "- No price rollups.",
    "",
    "## Source Counts",
    "",
    "| Source | Requests |",
    "| --- | ---: |",
    ...tableRows(report.summary.source_counts),
    "",
    "## Requests",
    "",
    ...requestRows(report.acquisition_requests),
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
  try {
    const exactPlan = readExactPlan(args.exactPlanPath);
    const report = buildRemainingSingleSourceExactSourceAcquisitionPlanV1({
      exactPlan: exactPlan.data,
    });
    const artifacts = writeReport(report);
    console.log(JSON.stringify({ ...report, artifacts }, null, 2));
    if (!report.ready_for_fetch_approval) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
