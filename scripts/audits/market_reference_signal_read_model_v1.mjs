import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMarketReferenceSignalReadModelV1 } from "../../backend/pricing/market_reference_signal_read_model_v1.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-SIGNAL-READ-MODEL-V1";
export const EXPECTED_SIGNAL_COUNT = 993;
export const EXPECTED_PUBLISHABLE_COUNT = 0;
export const SIGNAL_CURRENCY = "USD";

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
    if (error) throw new Error(`[market-reference-signal-read-model] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function buildMarketReferenceSignalReadModelReportV1({
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

  if (readModel.summary.signal_count !== EXPECTED_SIGNAL_COUNT) findings.push("signal_count_mismatch");
  if (readModel.summary.publishable_count !== EXPECTED_PUBLISHABLE_COUNT) findings.push("publishable_signal_detected");
  if (readModel.signals.some((row) => row.reference_median === null)) findings.push("signal_without_reference_median");
  if (readModel.signals.some((row) => row.currency !== "USD")) findings.push("non_usd_or_missing_signal_currency");
  if (candidates.some((row) => row.can_publish_price_directly === true)) findings.push("candidate_direct_publishable_detected");
  if (candidates.some((row) => row.needs_review !== true)) findings.push("candidate_review_gate_missing");

  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "internal_reference_signal_read_model_no_writes",
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      app_visible_pricing: false,
    },
    input_counts: {
      candidates: candidates.length,
      normalized_evidence: normalizedEvidence.length,
    },
    summary: readModel.summary,
    samples: {
      multi_source: readModel.signals.filter((row) => row.source_count >= 2).slice(0, sampleLimit),
      single_source: readModel.signals.filter((row) => row.source_count === 1).slice(0, sampleLimit),
    },
    findings,
    ready: findings.length === 0,
  };
}

function tableRows(object) {
  return Object.entries(object).map(([key, value]) => `| ${key} | ${value} |`);
}

function renderSignalSample(rows) {
  if (rows.length === 0) return ["| GV ID | Sources | Evidence | Median | Range | Band |", "| --- | --- | ---: | ---: | --- | --- |", "| none |  | 0 |  |  |  |"];
  return [
    "| GV ID | Sources | Evidence | Median | Range | Band |",
    "| --- | --- | ---: | ---: | --- | --- |",
    ...rows.map((row) => [
      row.gv_id ?? row.card_print_id,
      row.sources.join(", "),
      row.eligible_evidence_count,
      row.reference_median,
      `${row.reference_low} - ${row.reference_high}`,
      row.signal_band,
    ].join(" | ")).map((line) => `| ${line} |`),
  ];
}

function renderMarkdown(report) {
  return [
    "# MEE-09B Market Reference Signal Read Model V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Boundary",
    "",
    "- Internal read model only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No price rollups.",
    "- No app-visible pricing.",
    "",
    "## Input Counts",
    "",
    "| Input | Rows |",
    "| --- | ---: |",
    ...tableRows(report.input_counts),
    "",
    "## Signal Summary",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...tableRows({
      signal_count: report.summary.signal_count,
      publishable_count: report.summary.publishable_count,
      multi_source_signal_count: report.summary.multi_source_signal_count,
      single_source_signal_count: report.summary.single_source_signal_count,
      currency_excluded_evidence_count: report.summary.currency_excluded_evidence_count,
    }),
    "",
    "## Signal Bands",
    "",
    "| Band | Rows |",
    "| --- | ---: |",
    ...tableRows(report.summary.signal_band_counts),
    "",
    "## Multi Source Samples",
    "",
    ...renderSignalSample(report.samples.multi_source),
    "",
    "## Single Source Samples",
    "",
    ...renderSignalSample(report.samples.single_source),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09b_market_reference_signal_read_model_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return { jsonPath: rel(jsonPath), mdPath: rel(mdPath) };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  buildMarketReferenceSignalReadModelReportV1()
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
