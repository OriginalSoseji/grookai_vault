import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT,
  EXPECTED_MEE_09Q_CANDIDATE_EVIDENCE_MANIFEST_HASH,
  buildRemainingSingleSourceExactSourceBackfillPlanV1,
  sha256V1,
} from "../../backend/pricing/market_reference_remaining_single_source_exact_source_backfill_plan_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const FETCH_PREFIX = "mee_09q_remaining_single_source_exact_source_fetch_";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  return {
    fetchArtifactPath: argv.find((arg) => arg.startsWith("--fetch-artifact="))?.slice("--fetch-artifact=".length) ?? null,
  };
}

function latestFetchArtifactPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const candidates = readdirSync(dir)
    .filter((fileName) => fileName.startsWith(FETCH_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[remaining-single-source-backfill-plan] no ${FETCH_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

function readFetchArtifact(relativeOrAbsolutePath) {
  const resolved = path.resolve(REPO_ROOT, relativeOrAbsolutePath ?? latestFetchArtifactPath());
  return {
    path: resolved,
    data: JSON.parse(readFileSync(resolved, "utf8")),
  };
}

function planWithoutRows(plan) {
  const { rows, ...withoutRows } = plan;
  return {
    ...withoutRows,
    row_hashes: {
      proposed_candidate_rows_hash: sha256V1(rows.candidateRows),
      proposed_normalized_rows_hash: sha256V1(rows.normalizedRows),
    },
    row_samples: {
      proposed_candidates: rows.candidateRows.slice(0, 15),
      proposed_normalized_evidence: rows.normalizedRows.slice(0, 15),
    },
  };
}

function schemaPrompt(report) {
  return `Approve real MARKET-REFERENCE-ACTIVE-LISTING-WAREHOUSE-SCHEMA-V1 migration candidate only. Source backfill plan fingerprint: ${report.package_fingerprint_sha256}. Candidate evidence manifest hash: ${report.candidate_evidence_manifest_hash_sha256}. Scope: prepare local migration candidate to extend internal-only market_reference_* warehouse support for reviewed active-listing evidence sources such as ebay_active, including source/type constraints and service-role-only policies only. No remote migration apply. No evidence backfill. No provider calls. No source fetches. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.`;
}

function tableRows(object) {
  const entries = Object.entries(object ?? {});
  if (!entries.length) return ["| none | 0 |"];
  return entries.map(([key, value]) => `| ${key} | ${value} |`);
}

function renderMarkdown(report) {
  const nextPrompt = schemaPrompt(report);
  return [
    "# MEE-09R Remaining Single-Source Exact Source Backfill Plan",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready for apply package: \`${report.ready_for_apply_package}\``,
    `- Ready for schema extension plan: \`${report.ready_for_schema_extension_plan}\``,
    `- Candidate evidence manifest hash: \`${report.candidate_evidence_manifest_hash_sha256}\``,
    `- Source package fingerprint: \`${report.source_package_fingerprint_sha256}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Proposed candidate rows: \`${report.proposed_table_row_counts.market_reference_candidates_proposed}\``,
    `- Proposed normalized rows: \`${report.proposed_table_row_counts.market_reference_normalized_evidence_proposed}\``,
    "",
    "## Boundary",
    "",
    "- Plan only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No DB writes.",
    "- No pricing observations writes.",
    "- No eBay latest price writes.",
    "- No public/app-visible pricing.",
    "- No price rollups.",
    "",
    "## Why Apply Is Blocked",
    "",
    "The current `market_reference_*` warehouse schema only allows free reference sources (`tcgcsv_reference`, `pokemontcg_io_reference`) and requires `source_type = reference`. The MEE-09Q rows are `ebay_active` active-listing evidence. They should stay reviewed/internal, but they need a schema extension before they can be stored honestly.",
    "",
    "## Candidate Source Counts",
    "",
    "| Source | Rows |",
    "| --- | ---: |",
    ...tableRows(report.counts.candidate_source_counts),
    "",
    "## Candidate Source Type Counts",
    "",
    "| Source type | Rows |",
    "| --- | ---: |",
    ...tableRows(report.counts.candidate_source_type_counts),
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
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const fetchArtifact = readFetchArtifact(args.fetchArtifactPath);
  const plan = buildRemainingSingleSourceExactSourceBackfillPlanV1({
    fetchArtifact: fetchArtifact.data,
    candidateEvidenceManifestHash: fetchArtifact.data.candidate_evidence_manifest_hash_sha256 ?? EXPECTED_MEE_09Q_CANDIDATE_EVIDENCE_MANIFEST_HASH,
    sourcePackageFingerprint: fetchArtifact.data.source_package_fingerprint_sha256 ?? EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT,
    generatedAt,
  });
  const report = {
    ...planWithoutRows(plan),
    input_artifacts: {
      fetch_artifact: rel(fetchArtifact.path),
    },
    approval_required_for_next_step: true,
    approval_prompt_for_next_step: schemaPrompt(plan),
    applied: false,
  };

  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_09r_remaining_single_source_exact_source_backfill_plan_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_09r_remaining_single_source_exact_source_backfill_plan_${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    ready_for_apply_package: report.ready_for_apply_package,
    ready_for_schema_extension_plan: report.ready_for_schema_extension_plan,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    proposed_table_row_counts: report.proposed_table_row_counts,
    schema_blockers: report.schema_blockers,
    findings: report.findings,
    artifacts: { jsonPath: rel(jsonPath), mdPath: rel(mdPath) },
    approval_prompt_for_next_step: report.approval_prompt_for_next_step,
  }, null, 2));
}

main();
