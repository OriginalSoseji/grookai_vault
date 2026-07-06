import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMarketReferenceSignalRollupReadbackV1 } from "../../backend/pricing/market_reference_signal_rollup_readback_v1.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-SIGNAL-ROLLUP-READBACK-V1";
export const EXPECTED_ROW_COUNT = 993;
export const DEFAULT_ROLLUP_VERSION = "MEE_09M_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_POKEMONTCG_SECOND_SOURCE_V1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  return {
    sampleLimit: Number(argv.find((arg) => arg.startsWith("--sample-limit="))?.slice("--sample-limit=".length) ?? 20),
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
    if (error) throw new Error(`[market-reference-signal-rollup-readback] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function buildMarketReferenceSignalRollupReadbackReportV1({
  generatedAt = new Date().toISOString(),
  sampleLimit = 20,
  rollupVersion = DEFAULT_ROLLUP_VERSION,
} = {}) {
  const supabase = createBackendClient();
  const rollups = await fetchAll(
    supabase,
    "market_reference_signal_rollups",
    "id,card_print_id,gv_id,rollup_version,review_status,currency,reference_low,reference_median,reference_high,source_count,eligible_evidence_count,quarantined_evidence_count,currency_excluded_evidence_count,price_ratio,variance_band,review_flags,source_summary,needs_review,publishable,app_visible,market_truth,created_at,updated_at",
    { filter: (query) => query.eq("rollup_version", rollupVersion) },
  );
  const readback = buildMarketReferenceSignalRollupReadbackV1({ rollups, sampleLimit, expectedRollupVersion: rollupVersion });
  const findings = [...readback.findings];
  if (rollups.length !== EXPECTED_ROW_COUNT) findings.push("stored_rollup_row_count_mismatch");

  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "read_only_remote_rollup_review",
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      pricing_rollups_publication: false,
      public_price_publication: false,
      app_visible_pricing: false,
    },
    expected_row_count: EXPECTED_ROW_COUNT,
    rollup_version: rollupVersion,
    ...readback,
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
    ...rows.map((row) => `| ${row.gv_id ?? row.card_print_id} | ${row.review_status} | ${row.source_count} | ${row.eligible_evidence_count} | ${row.reference_median ?? ""} | ${row.price_ratio ?? ""} | ${(row.review_flags ?? []).join(", ")} |`),
  ];
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09g_market_reference_signal_rollup_readback_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, [
    "# MEE-09G Market Reference Signal Rollup Readback",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready: \`${report.ready}\``,
    `- Total rows: \`${report.total_rows}\``,
    `- Expected rows: \`${report.expected_row_count}\``,
    "",
    "## Boundary",
    "",
    "- Read-only remote rollup review.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No public/app-visible pricing.",
    "",
    "## Internal Locks",
    "",
    "| Lock | Rows |",
    "| --- | ---: |",
    ...tableRows(report.internal_lock_counts),
    "",
    "## Status Counts",
    "",
    "| Status | Rows |",
    "| --- | ---: |",
    ...tableRows(report.status_counts),
    "",
    "## Variance Bands",
    "",
    "| Band | Rows |",
    "| --- | ---: |",
    ...tableRows(report.variance_band_counts),
    "",
    "## Flags",
    "",
    "| Flag | Rows |",
    "| --- | ---: |",
    ...tableRows(report.flag_counts),
    "",
    "## High Variance Queue",
    "",
    report.review_queue.high_variance.priority,
    "",
    ...sampleRows(report.review_queue.high_variance.samples),
    "",
    "## Single Source Queue",
    "",
    report.review_queue.single_source.priority,
    "",
    ...sampleRows(report.review_queue.single_source.samples),
    "",
    "## Context Queue",
    "",
    report.review_queue.context_required.priority,
    "",
    ...sampleRows(report.review_queue.context_required.samples),
    "",
    "## Special Lane Queue",
    "",
    report.review_queue.special_lane_blocked.priority,
    "",
    ...sampleRows(report.review_queue.special_lane_blocked.samples),
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
  buildMarketReferenceSignalRollupReadbackReportV1(args)
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
