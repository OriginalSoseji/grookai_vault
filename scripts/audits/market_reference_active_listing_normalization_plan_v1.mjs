import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import { buildMarketReferenceActiveListingNormalizationPlanV1 } from "../../backend/pricing/market_reference_active_listing_normalization_plan_v1.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-ACTIVE-LISTING-NORMALIZATION-PLAN-V1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function fetchActiveListingCandidates() {
  const supabase = createBackendClient();
  const { data, error } = await supabase
    .from("market_reference_candidates")
    .select("id,card_print_id,gv_id,source,source_type,source_url,raw_title,raw_price,currency,condition_hint,finish_hint,observed_at,match_confidence_hint,exclusion_flags,needs_review,can_publish_price_directly,raw_payload")
    .eq("source", "ebay_active")
    .order("gv_id", { ascending: true });
  if (error) throw new Error(`[active-listing-normalization-plan] read failed: ${error.message}`);
  return data ?? [];
}

export async function buildMarketReferenceActiveListingNormalizationPlanReportV1({
  generatedAt = new Date().toISOString(),
  sampleLimit = 25,
} = {}) {
  const candidates = await fetchActiveListingCandidates();
  const plan = buildMarketReferenceActiveListingNormalizationPlanV1({ candidates });
  const findings = [...plan.findings];

  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    ...plan,
    samples: {
      review_required: plan.normalized_evidence.filter((row) => row.model_disposition === "review_required_active_listing").slice(0, sampleLimit),
      quarantined: plan.normalized_evidence.filter((row) => row.model_disposition.startsWith("quarantined_")).slice(0, sampleLimit),
      blocked: plan.normalized_evidence.filter((row) => row.model_disposition === "blocked_candidate").slice(0, sampleLimit),
    },
    findings,
    ready: findings.length === 0,
  };
}

function tableRows(object) {
  return Object.entries(object ?? {}).map(([key, value]) => `| ${key} | ${value} |`);
}

function evidenceRows(rows) {
  if (!rows.length) return ["| GV ID | Price | Disposition | Flags |", "| --- | ---: | --- | --- |", "| none |  |  |  |"];
  return [
    "| GV ID | Price | Disposition | Flags |",
    "| --- | ---: | --- | --- |",
    ...rows.map((row) => `| ${row.gv_id} | ${row.normalized_price ?? ""} ${row.normalized_currency ?? ""} | ${row.model_disposition} | ${row.quality_flags.join(", ")} |`),
  ];
}

function renderMarkdown(report) {
  return [
    "# MEE-10F Active Listing Normalization Plan",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Boundary",
    "",
    "- Plan only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No eBay latest price writes.",
    "- No price rollups.",
    "- No public/app-visible pricing.",
    "- No market truth.",
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...tableRows(report.summary),
    "",
    "## Dispositions",
    "",
    "| Disposition | Rows |",
    "| --- | ---: |",
    ...tableRows(report.counts.disposition_counts),
    "",
    "## Quality Flags",
    "",
    "| Flag | Rows |",
    "| --- | ---: |",
    ...tableRows(report.counts.quality_flag_counts),
    "",
    "## Schema Status",
    "",
    "| Check | Value |",
    "| --- | --- |",
    ...Object.entries(report.schema_status).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## Review Required Samples",
    "",
    ...evidenceRows(report.samples.review_required),
    "",
    "## Quarantined Samples",
    "",
    ...evidenceRows(report.samples.quarantined),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_10f_active_listing_normalization_plan_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return { jsonPath: rel(jsonPath), mdPath: rel(mdPath) };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  buildMarketReferenceActiveListingNormalizationPlanReportV1()
    .then((report) => {
      const artifacts = writeReport(report);
      console.log(JSON.stringify({
        package_id: report.package_id,
        ready: report.ready,
        summary: report.summary,
        counts: report.counts,
        schema_status: report.schema_status,
        findings: report.findings,
        artifacts,
      }, null, 2));
      if (!report.ready) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
