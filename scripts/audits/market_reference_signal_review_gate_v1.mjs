import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMarketReferenceSignalReadModelV1 } from "../../backend/pricing/market_reference_signal_read_model_v1.mjs";
import { buildMarketReferenceSignalReviewGateV1 } from "../../backend/pricing/market_reference_signal_review_gate_v1.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-SIGNAL-REVIEW-GATE-V1";
export const SIGNAL_CURRENCY = "USD";
export const EXPECTED_SIGNAL_COUNT = 993;
export const EXPECTED_PUBLISHABLE_COUNT = 0;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function fetchAll(supabase, table, select, { pageSize = 1000 } = {}) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, to);
    if (error) throw new Error(`[market-reference-signal-review-gate] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function buildMarketReferenceSignalReviewGateReportV1({
  generatedAt = new Date().toISOString(),
  sampleLimit = 20,
} = {}) {
  const supabase = createBackendClient();
  const findings = [];
  const candidates = await fetchAll(
    supabase,
    "market_reference_candidates",
    "id,card_print_id,gv_id,source,needs_review,can_publish_price_directly",
  );
  const normalizedEvidence = await fetchAll(
    supabase,
    "market_reference_normalized_evidence",
    "id,candidate_id,card_print_id,source,normalizer_version,metric_key,normalized_price,normalized_currency,model_disposition,model_eligible,normalized_payload",
  );

  const readModel = buildMarketReferenceSignalReadModelV1({
    candidates,
    normalizedEvidence,
    currency: SIGNAL_CURRENCY,
  });
  const gate = buildMarketReferenceSignalReviewGateV1({ signals: readModel.signals });

  if (readModel.summary.signal_count !== EXPECTED_SIGNAL_COUNT) findings.push("signal_count_mismatch");
  if (readModel.summary.publishable_count !== EXPECTED_PUBLISHABLE_COUNT) findings.push("signal_publishable_leak");
  if (gate.summary.publishable_count !== EXPECTED_PUBLISHABLE_COUNT) findings.push("gate_publishable_leak");
  if (gate.summary.reviewed_signal_count !== EXPECTED_SIGNAL_COUNT) findings.push("reviewed_signal_count_mismatch");
  if (candidates.some((row) => row.can_publish_price_directly === true)) findings.push("candidate_direct_publishable_detected");
  if (candidates.some((row) => row.needs_review !== true)) findings.push("candidate_review_gate_missing");

  const byStatus = (status) => gate.reviewed_signals.filter((row) => row.review_status === status).slice(0, sampleLimit);
  const highVariance = gate.reviewed_signals
    .filter((row) => row.flags.includes("high_variance") || row.flags.includes("extreme_variance"))
    .sort((left, right) => (right.price_ratio ?? 0) - (left.price_ratio ?? 0))
    .slice(0, sampleLimit);

  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "internal_reference_signal_review_gate_no_writes",
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      app_visible_pricing: false,
      stored_rollup_created: false,
    },
    input_counts: {
      candidates: candidates.length,
      normalized_evidence: normalizedEvidence.length,
      signal_candidates: readModel.summary.signal_count,
    },
    signal_summary: readModel.summary,
    review_summary: gate.summary,
    samples: {
      review_ready_multi_source: byStatus("review_ready_multi_source"),
      review_required_context: byStatus("review_required_context"),
      review_required_single_source: byStatus("review_required_single_source"),
      review_required_high_variance: byStatus("review_required_high_variance"),
      blocked_special_lane_review: byStatus("blocked_special_lane_review"),
      high_variance: highVariance,
    },
    findings,
    ready: findings.length === 0,
  };
}

function tableRows(object) {
  return Object.entries(object ?? {}).map(([key, value]) => `| ${key} | ${value} |`);
}

function sampleRows(rows) {
  if (!rows.length) return ["| GV ID | Status | Sources | Evidence | Median | Ratio | Flags |", "| --- | --- | ---: | ---: | ---: | ---: | --- |", "| none |  | 0 | 0 |  |  |  |"];
  return [
    "| GV ID | Status | Sources | Evidence | Median | Ratio | Flags |",
    "| --- | --- | ---: | ---: | ---: | ---: | --- |",
    ...rows.map((row) => `| ${row.gv_id ?? row.card_print_id} | ${row.review_status} | ${row.source_count} | ${row.eligible_evidence_count} | ${row.reference_median} | ${row.price_ratio ?? ""} | ${row.flags.join(", ")} |`),
  ];
}

function renderMarkdown(report) {
  return [
    "# MEE-09C Reference Signal Review Gate V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Boundary",
    "",
    "- Internal review gate only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No price rollups.",
    "- No app-visible pricing.",
    "- No stored rollup created.",
    "",
    "## Inputs",
    "",
    "| Input | Rows |",
    "| --- | ---: |",
    ...tableRows(report.input_counts),
    "",
    "## Review Status Counts",
    "",
    "| Status | Rows |",
    "| --- | ---: |",
    ...tableRows(report.review_summary.status_counts),
    "",
    "## Variance Bands",
    "",
    "| Band | Rows |",
    "| --- | ---: |",
    ...tableRows(report.review_summary.variance_band_counts),
    "",
    "## Flags",
    "",
    "| Flag | Rows |",
    "| --- | ---: |",
    ...tableRows(report.review_summary.flag_counts),
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...tableRows({
      review_ready_count: report.review_summary.review_ready_count,
      review_required_count: report.review_summary.review_required_count,
      blocked_count: report.review_summary.blocked_count,
      publishable_count: report.review_summary.publishable_count,
    }),
    "",
    "## Review Ready Multi Source Samples",
    "",
    ...sampleRows(report.samples.review_ready_multi_source),
    "",
    "## Review Required Context Samples",
    "",
    ...sampleRows(report.samples.review_required_context),
    "",
    "## Review Required Single Source Samples",
    "",
    ...sampleRows(report.samples.review_required_single_source),
    "",
    "## High Variance Samples",
    "",
    ...sampleRows(report.samples.high_variance),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09c_market_reference_signal_review_gate_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return { jsonPath: rel(jsonPath), mdPath: rel(mdPath) };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  buildMarketReferenceSignalReviewGateReportV1()
    .then((report) => {
      const artifacts = writeReport(report);
      console.log(JSON.stringify({ ...report, artifacts }, null, 2));
      if (!report.ready) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
