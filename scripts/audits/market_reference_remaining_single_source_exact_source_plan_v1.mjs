import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRemainingSingleSourceExactSourcePlanV1 } from "../../backend/pricing/market_reference_remaining_single_source_exact_source_plan_v1.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-PLAN-V1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const WORKLIST_PREFIX = "mee_09h_market_reference_signal_acquisition_worklist_";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  return {
    worklistPath: argv.find((arg) => arg.startsWith("--worklist="))?.slice("--worklist=".length) ?? null,
  };
}

function latestWorklistPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const candidates = readdirSync(dir)
    .filter((fileName) => fileName.startsWith(WORKLIST_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[remaining-single-source-exact-plan] no ${WORKLIST_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

function readWorklist(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath ?? latestWorklistPath());
  if (!existsSync(resolved)) throw new Error(`[remaining-single-source-exact-plan] worklist not found: ${resolved}`);
  return {
    path: resolved,
    data: JSON.parse(readFileSync(resolved, "utf8")),
  };
}

function stablePlanPayload(report) {
  return {
    package_id: report.package_id,
    plan_version: report.plan_version,
    mode: report.mode,
    rollup_version: report.rollup_version,
    boundary: report.boundary,
    summary: report.summary,
    targets: report.targets,
    findings: report.findings,
    ready: report.ready,
  };
}

export function buildRemainingSingleSourceExactSourcePlanReportV1({
  worklistPath = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const worklist = readWorklist(worklistPath);
  const report = buildRemainingSingleSourceExactSourcePlanV1({
    worklist: worklist.data,
    generatedAt,
  });
  const planHash = sha256(JSON.stringify(stablePlanPayload(report)));
  return {
    ...report,
    source_worklist_artifact: rel(worklist.path),
    plan_hash: planHash,
  };
}

function tableRows(object) {
  const entries = Object.entries(object ?? {});
  if (!entries.length) return ["| none | 0 |"];
  return entries.map(([key, value]) => `| ${key} | ${value} |`);
}

function routeRows(report) {
  const rows = report.targets.flatMap((target) => target.exact_routes.map((route) => ({
    gv_id: target.gv_id,
    family: target.family,
    source: route.source,
    query: route.query_text,
  })));
  return [
    "| GV ID | Family | Source | Query |",
    "| --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.gv_id} | ${row.family} | ${row.source} | ${row.query.replace(/\|/g, "\\|")} |`),
  ];
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09o_remaining_single_source_exact_source_plan_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, [
    "# MEE-09O Remaining Single-Source Exact Source Plan",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready: \`${report.ready}\``,
    `- Plan hash: \`${report.plan_hash}\``,
    `- Source worklist: \`${report.source_worklist_artifact}\``,
    `- Target count: \`${report.summary.target_count}\``,
    `- Route count: \`${report.summary.route_count}\``,
    "",
    "## Boundary",
    "",
    "- Plan-only exact-source routes.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No public/app-visible pricing.",
    "",
    "## Families",
    "",
    "| Family | Rows |",
    "| --- | ---: |",
    ...tableRows(report.summary.family_counts),
    "",
    "## Route Sources",
    "",
    "| Source | Rows |",
    "| --- | ---: |",
    ...tableRows(report.summary.source_counts),
    "",
    "## Exact Routes",
    "",
    ...routeRows(report),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n"));
  return { jsonPath: rel(jsonPath), mdPath: rel(mdPath) };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const args = parseArgs(process.argv.slice(2));
  try {
    const report = buildRemainingSingleSourceExactSourcePlanReportV1(args);
    const artifacts = writeReport(report);
    console.log(JSON.stringify({ ...report, artifacts }, null, 2));
    if (!report.ready) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
