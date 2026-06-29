import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-WAREHOUSE-READBACK-SMOKE-V1";
export const EXPECTED_ROW_COUNTS = {
  market_reference_acquisition_runs: 5,
  market_reference_raw_snapshots: 10788,
  market_reference_candidates: 11025,
  market_reference_normalized_evidence: 11025,
  market_reference_coverage_reports: 1,
};
export const EXPECTED_CANDIDATE_SOURCE_COUNTS = {
  pokemontcg_io_reference: 3618,
  tcgcsv_reference: 7407,
};
export const EXPECTED_NORMALIZED_DISPOSITION_COUNTS = {
  "quarantined_metric:false": 2047,
  "quarantined_price_outlier:false": 148,
  "reference_model_candidate:true": 8830,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function sameCounts(actual, expected) {
  return Object.entries(expected).every(([key, value]) => actual?.[key] === value);
}

async function exactCount(supabase, table) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`[market-reference-readback] count failed for ${table}: ${error.message}`);
  return count ?? 0;
}

async function fetchAll(supabase, table, select, { pageSize = 1000 } = {}) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, to);
    if (error) throw new Error(`[market-reference-readback] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function buildMarketReferenceWarehouseReadbackSmokeV1({
  generatedAt = new Date().toISOString(),
  sampleLimit = 12,
} = {}) {
  const supabase = createBackendClient();
  const findings = [];

  const rowCounts = Object.fromEntries(await Promise.all(
    Object.keys(EXPECTED_ROW_COUNTS).map(async (table) => [table, await exactCount(supabase, table)]),
  ));

  const candidates = await fetchAll(
    supabase,
    "market_reference_candidates",
    "id,card_print_id,gv_id,source,raw_price,currency,needs_review,can_publish_price_directly,raw_snapshot_id,created_at",
  );
  const normalized = await fetchAll(
    supabase,
    "market_reference_normalized_evidence",
    "id,candidate_id,card_print_id,source,model_disposition,model_eligible,normalized_price,normalized_currency,normalized_payload",
  );
  const coverageReports = await fetchAll(
    supabase,
    "market_reference_coverage_reports",
    "report_key,target_count,covered_target_count,uncovered_target_count,source_summary,counts,generated_at",
  );

  const candidateSourceCounts = countBy(candidates, (row) => row.source);
  const normalizedDispositionCounts = countBy(
    normalized,
    (row) => `${row.model_disposition}:${row.model_eligible === true}`,
  );

  const candidatesWithoutReviewGate = candidates.filter((row) => row.needs_review !== true).length;
  const candidatesDirectPublishable = candidates.filter((row) => row.can_publish_price_directly === true).length;
  const candidatesMissingRawSnapshot = candidates.filter((row) => !row.raw_snapshot_id).length;
  const normalizedDirectPublishable = normalized.filter((row) => (
    row.normalized_payload?.can_publish_price_directly === true
  )).length;
  const normalizedMissingCandidate = normalized.filter((row) => !row.candidate_id).length;
  const distinctCandidateCards = new Set(candidates.map((row) => row.card_print_id)).size;
  const distinctNormalizedCards = new Set(normalized.map((row) => row.card_print_id)).size;
  const modelEligibleRows = normalized.filter((row) => row.model_eligible === true);
  const modelEligibleCards = new Set(modelEligibleRows.map((row) => row.card_print_id)).size;

  if (!sameCounts(rowCounts, EXPECTED_ROW_COUNTS)) findings.push("row_counts_mismatch");
  if (!sameCounts(candidateSourceCounts, EXPECTED_CANDIDATE_SOURCE_COUNTS)) findings.push("candidate_source_counts_mismatch");
  if (!sameCounts(normalizedDispositionCounts, EXPECTED_NORMALIZED_DISPOSITION_COUNTS)) findings.push("normalized_disposition_counts_mismatch");
  if (candidatesWithoutReviewGate > 0) findings.push("candidate_rows_without_review_gate");
  if (candidatesDirectPublishable > 0) findings.push("candidate_rows_direct_publishable");
  if (candidatesMissingRawSnapshot > 0) findings.push("candidate_rows_missing_raw_snapshot_link");
  if (normalizedDirectPublishable > 0) findings.push("normalized_rows_direct_publishable");
  if (normalizedMissingCandidate > 0) findings.push("normalized_rows_missing_candidate_link");
  if (coverageReports.length !== 1) findings.push("coverage_report_count_mismatch");
  if (coverageReports[0]?.target_count !== 1000) findings.push("coverage_target_count_mismatch");
  if (coverageReports[0]?.covered_target_count !== 993) findings.push("coverage_covered_count_mismatch");
  if (coverageReports[0]?.uncovered_target_count !== 7) findings.push("coverage_uncovered_count_mismatch");

  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "remote_readback_smoke_no_writes",
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
    },
    expected_row_counts: EXPECTED_ROW_COUNTS,
    row_counts: rowCounts,
    candidate_source_counts: candidateSourceCounts,
    normalized_disposition_counts: normalizedDispositionCounts,
    review_gate_counts: {
      candidates_without_review_gate: candidatesWithoutReviewGate,
      candidates_direct_publishable: candidatesDirectPublishable,
      candidates_missing_raw_snapshot_link: candidatesMissingRawSnapshot,
      normalized_direct_publishable: normalizedDirectPublishable,
      normalized_missing_candidate_link: normalizedMissingCandidate,
    },
    coverage: {
      report_count: coverageReports.length,
      target_count: coverageReports[0]?.target_count ?? null,
      covered_target_count: coverageReports[0]?.covered_target_count ?? null,
      uncovered_target_count: coverageReports[0]?.uncovered_target_count ?? null,
    },
    distinct_card_counts: {
      candidate_cards: distinctCandidateCards,
      normalized_cards: distinctNormalizedCards,
      model_eligible_cards: modelEligibleCards,
    },
    samples: {
      candidates: candidates.slice(0, sampleLimit).map((row) => ({
        gv_id: row.gv_id,
        source: row.source,
        raw_price: row.raw_price,
        currency: row.currency,
        needs_review: row.needs_review,
        can_publish_price_directly: row.can_publish_price_directly,
      })),
      model_eligible: modelEligibleRows.slice(0, sampleLimit).map((row) => ({
        card_print_id: row.card_print_id,
        source: row.source,
        normalized_price: row.normalized_price,
        normalized_currency: row.normalized_currency,
        model_disposition: row.model_disposition,
      })),
    },
    findings,
    ready: findings.length === 0,
  };
}

function tableRows(object) {
  return Object.entries(object).map(([key, value]) => `| ${key} | ${value} |`);
}

function renderMarkdown(report) {
  return [
    "# MEE-09A Market Reference Warehouse Readback Smoke V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Boundary",
    "",
    "- Remote readback only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No price rollups.",
    "- No public price publication.",
    "",
    "## Row Counts",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...tableRows(report.row_counts),
    "",
    "## Candidate Sources",
    "",
    "| Source | Rows |",
    "| --- | ---: |",
    ...tableRows(report.candidate_source_counts),
    "",
    "## Normalized Dispositions",
    "",
    "| Disposition | Rows |",
    "| --- | ---: |",
    ...tableRows(report.normalized_disposition_counts),
    "",
    "## Review Gate",
    "",
    "| Check | Rows |",
    "| --- | ---: |",
    ...tableRows(report.review_gate_counts),
    "",
    "## Coverage",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...tableRows(report.coverage),
    "",
    "## Distinct Cards",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...tableRows(report.distinct_card_counts),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09a_market_reference_warehouse_readback_smoke_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return { jsonPath: rel(jsonPath), mdPath: rel(mdPath) };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  buildMarketReferenceWarehouseReadbackSmokeV1()
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
