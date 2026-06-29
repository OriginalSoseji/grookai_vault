import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMarketReferenceSignalAcquisitionWorklistV1 } from "../../backend/pricing/market_reference_signal_acquisition_worklist_v1.mjs";
import { buildMarketEvidenceQueryPlanV1 } from "../../backend/pricing/market_evidence_query_plan_v1.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-SIGNAL-ACQUISITION-WORKLIST-V1";
export const DEFAULT_ROLLUP_VERSION = "MEE_09M_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_POKEMONTCG_SECOND_SOURCE_V1";
export const EXPECTED_SINGLE_SOURCE_ROLLUPS = 244;
export const EXPECTED_FIRST_WAVE_ROWS = 18;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  return {
    firstWaveLimit: Number(argv.find((arg) => arg.startsWith("--first-wave-limit="))?.slice("--first-wave-limit=".length) ?? EXPECTED_FIRST_WAVE_ROWS),
    queryPlanLimit: Number(argv.find((arg) => arg.startsWith("--query-plan-limit="))?.slice("--query-plan-limit=".length) ?? 50),
    rollupVersion: argv.find((arg) => arg.startsWith("--rollup-version="))?.slice("--rollup-version=".length) ?? DEFAULT_ROLLUP_VERSION,
  };
}

async function fetchAll(supabase, table, select, { pageSize = 1000, filter } = {}) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    let query = supabase.from(table).select(select).range(from, to);
    if (filter) query = filter(query);
    const { data, error } = await query;
    if (error) throw new Error(`[market-reference-signal-acquisition-worklist] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function fetchCardPrintsByIds(supabase, ids) {
  const rows = [];
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  for (let index = 0; index < uniqueIds.length; index += 100) {
    const chunk = uniqueIds.slice(index, index + 100);
    let data = null;
    let error = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await supabase
        .from("card_prints")
      .select("id,gv_id,name,set_code,printed_set_abbrev,number,number_plain,rarity")
        .in("id", chunk);
      data = result.data;
      error = result.error;
      if (!error) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
    if (error) throw new Error(`[market-reference-signal-acquisition-worklist] card_prints read failed: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

function representativeQueryPlan(firstWave, queryPlanLimit) {
  const targets = firstWave
    .filter((row) => row.name && row.gv_id && row.card_print_id)
    .slice(0, queryPlanLimit);
  if (!targets.length) return null;
  return buildMarketEvidenceQueryPlanV1({
    targets,
    sources: ["tcgcsv_reference", "pokemontcg_io_reference", "tcgplayer_reference_candidate", "ebay_active", "ebay_sold_candidate"],
    limit: targets.length,
  });
}

export async function buildMarketReferenceSignalAcquisitionWorklistReportV1({
  generatedAt = new Date().toISOString(),
  firstWaveLimit = EXPECTED_FIRST_WAVE_ROWS,
  queryPlanLimit = 50,
  rollupVersion = DEFAULT_ROLLUP_VERSION,
} = {}) {
  const supabase = createBackendClient();
  const rollups = await fetchAll(
    supabase,
    "market_reference_signal_rollups",
    "id,card_print_id,gv_id,rollup_version,review_status,currency,reference_low,reference_median,reference_high,source_count,eligible_evidence_count,price_ratio,variance_band,review_flags,source_summary,needs_review,publishable,app_visible,market_truth",
    { filter: (query) => query.eq("rollup_version", rollupVersion) },
  );
  const cardPrints = await fetchCardPrintsByIds(supabase, rollups.map((row) => row.card_print_id));
  const worklist = buildMarketReferenceSignalAcquisitionWorklistV1({ rollups, cardPrints, firstWaveLimit });
  const queryPlan = representativeQueryPlan(worklist.first_wave, queryPlanLimit);

  const findings = [];
  if (worklist.summary.single_source_rollups !== EXPECTED_SINGLE_SOURCE_ROLLUPS) findings.push("single_source_rollup_count_mismatch");
  if (worklist.summary.first_wave_review_required_single_source !== EXPECTED_FIRST_WAVE_ROWS) findings.push("first_wave_count_mismatch");
  if (worklist.all_single_source.some((row) => row.can_publish_price_directly !== false)) findings.push("direct_publish_candidate_detected");
  if (worklist.first_wave.some((row) => !row.name || !row.gv_id || !row.card_print_id)) findings.push("first_wave_missing_identity");

  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "read_only_acquisition_worklist",
    rollup_version: rollupVersion,
    boundary: worklist.boundary,
    summary: worklist.summary,
    first_wave_sample: worklist.first_wave.slice(0, 25),
    high_variance_sample: worklist.high_variance_queue.slice(0, 25),
    special_lane_sample: worklist.special_lane_queue.slice(0, 25),
    representative_query_plan: queryPlan,
    findings,
    ready: findings.length === 0,
  };
}

function tableRows(object) {
  return Object.entries(object ?? {}).map(([key, value]) => `| ${key} | ${value} |`);
}

function itemRows(rows) {
  if (!rows.length) return ["| GV ID | Name | Set | No. | Median | Sources | Proposed | Reasons |", "| --- | --- | --- | --- | ---: | --- | --- | --- |", "| none |  |  |  |  |  |  |  |"];
  return [
    "| GV ID | Name | Set | No. | Median | Sources | Proposed | Reasons |",
    "| --- | --- | --- | --- | ---: | --- | --- | --- |",
    ...rows.map((row) => `| ${row.gv_id} | ${row.name ?? ""} | ${row.set_code ?? ""} | ${row.provider_number ?? row.number_plain ?? ""} | ${row.reference_median ?? ""} | ${row.existing_sources.join(", ")} | ${row.proposed_sources.join(", ")} | ${row.reasons.join(", ")} |`),
  ];
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09h_market_reference_signal_acquisition_worklist_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, [
    "# MEE-09H Market Reference Signal Acquisition Worklist",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready: \`${report.ready}\``,
    `- Single-source rollups: \`${report.summary.single_source_rollups}\``,
    `- First-wave rows: \`${report.summary.first_wave_review_required_single_source}\``,
    "",
    "## Boundary",
    "",
    "- Read-only worklist only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No public/app-visible pricing.",
    "",
    "## Existing Sources",
    "",
    "| Source | Rows |",
    "| --- | ---: |",
    ...tableRows(report.summary.existing_source_counts),
    "",
    "## Proposed Source Coverage",
    "",
    "| Source | Rows |",
    "| --- | ---: |",
    ...tableRows(report.summary.proposed_source_counts),
    "",
    "## Review Status Counts",
    "",
    "| Status | Rows |",
    "| --- | ---: |",
    ...tableRows(report.summary.review_status_counts),
    "",
    "## First Wave Sample",
    "",
    ...itemRows(report.first_wave_sample),
    "",
    "## High Variance Sample",
    "",
    ...itemRows(report.high_variance_sample),
    "",
    "## Special Lane Sample",
    "",
    ...itemRows(report.special_lane_sample),
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
  buildMarketReferenceSignalAcquisitionWorklistReportV1(args)
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
