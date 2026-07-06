import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import { buildMarketReferenceSignalReadModelV1 } from "../../backend/pricing/market_reference_signal_read_model_v1.mjs";
import { buildMarketReferenceSignalReviewGateV1 } from "../../backend/pricing/market_reference_signal_review_gate_v1.mjs";
import { buildMarketReferenceSignalRollupRowsV1 } from "../../backend/pricing/market_reference_signal_rollup_rows_v1.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-SIGNAL-ROLLUP-REFRESH-PLAN-V1";
export const ROLLUP_VERSION = "MEE_09M_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_POKEMONTCG_SECOND_SOURCE_V1";
export const EXPECTED_ROLLUP_ROW_COUNT = 993;
export const EXPECTED_INPUT_CANDIDATES = 21745;
export const EXPECTED_INPUT_NORMALIZED = 21745;
export const EXPECTED_MIGRATION_HASH = "eb2f1aa4a01977d455e131ec7f90b3d8250e2501f65cdc6199a9b2072dd82d41";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const MIGRATION_PATH = "supabase/migrations/20260625010000_market_reference_signal_rollups_v1.sql";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === "") continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

async function fetchAll(supabase, table, select, { pageSize = 1000 } = {}) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select(select).range(from, to);
    if (error) throw new Error(`[rollup-refresh-plan] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function existingRowsForVersion(supabase, rollupVersion) {
  const { count, error } = await supabase
    .from("market_reference_signal_rollups")
    .select("id", { count: "exact", head: true })
    .eq("rollup_version", rollupVersion);
  if (error) throw new Error(`[rollup-refresh-plan] count failed: ${error.message}`);
  return count ?? 0;
}

function rowManifest(rows) {
  return rows.map((row) => ({
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    rollup_version: row.rollup_version,
    review_status: row.review_status,
    currency: row.currency,
    reference_low: row.reference_low,
    reference_median: row.reference_median,
    reference_high: row.reference_high,
    source_count: row.source_count,
    eligible_evidence_count: row.eligible_evidence_count,
    quarantined_evidence_count: row.quarantined_evidence_count,
    currency_excluded_evidence_count: row.currency_excluded_evidence_count,
    price_ratio: row.price_ratio,
    variance_band: row.variance_band,
    review_flags: row.review_flags,
    publishable: row.publishable,
    app_visible: row.app_visible,
    market_truth: row.market_truth,
  }));
}

function buildApprovalPrompt(report) {
  return `Approve real MARKET-REFERENCE-SIGNAL-ROLLUP-REFRESH-APPLY-V1 apply only. Package fingerprint: ${report.package_fingerprint_sha256}. Row manifest hash: ${report.row_manifest_hash_sha256}. Migration hash: ${report.migration_hash_sha256}. Scope: insert ${report.proposed_rollup_rows} internal-only market_reference_signal_rollups rows with rollup_version ${report.rollup_version} into linked Supabase project ycdxbpibncqcchqiihfz only. Preserve existing rollup versions. All rows must keep needs_review=true, publishable=false, app_visible=false, and market_truth=false. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.`;
}

export async function buildMarketReferenceSignalRollupRefreshPlanV1({
  generatedAt = new Date().toISOString(),
  sampleLimit = 20,
} = {}) {
  const supabase = createBackendClient();
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
  const existingRowsForRollupVersion = await existingRowsForVersion(supabase, ROLLUP_VERSION);
  const migrationHash = sha256(readFileSync(path.join(REPO_ROOT, MIGRATION_PATH), "utf8"));
  const readModel = buildMarketReferenceSignalReadModelV1({
    candidates,
    normalizedEvidence,
    currency: "USD",
  });
  const gate = buildMarketReferenceSignalReviewGateV1({ signals: readModel.signals });
  const rows = buildMarketReferenceSignalRollupRowsV1({
    signals: readModel.signals,
    reviewedSignals: gate.reviewed_signals,
    rollupVersion: ROLLUP_VERSION,
  });
  const manifest = rowManifest(rows);
  const rowManifestHash = sha256(manifest);
  const packageFingerprint = sha256({
    package_id: PACKAGE_ID,
    rollup_version: ROLLUP_VERSION,
    migration_hash: migrationHash,
    row_manifest_hash: rowManifestHash,
    proposed_rollup_rows: rows.length,
    input_counts: {
      candidates: candidates.length,
      normalized_evidence: normalizedEvidence.length,
    },
  });
  const findings = [];
  if (migrationHash !== EXPECTED_MIGRATION_HASH) findings.push("migration_hash_mismatch");
  if (candidates.length !== EXPECTED_INPUT_CANDIDATES) findings.push("candidate_input_count_mismatch");
  if (normalizedEvidence.length !== EXPECTED_INPUT_NORMALIZED) findings.push("normalized_input_count_mismatch");
  if (existingRowsForRollupVersion !== 0) findings.push("target_rollup_version_already_exists");
  if (rows.length !== EXPECTED_ROLLUP_ROW_COUNT) findings.push("rollup_row_count_mismatch");
  if (rows.some((row) => row.rollup_version !== ROLLUP_VERSION)) findings.push("wrong_rollup_version_detected");
  if (rows.some((row) => row.needs_review !== true)) findings.push("needs_review_false_detected");
  if (rows.some((row) => row.publishable !== false)) findings.push("publishable_leak_detected");
  if (rows.some((row) => row.app_visible !== false)) findings.push("app_visible_leak_detected");
  if (rows.some((row) => row.market_truth !== false)) findings.push("market_truth_leak_detected");
  if (rows.some((row) => row.currency !== "USD")) findings.push("non_usd_rollup_detected");

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "versioned_rollup_refresh_plan_no_writes",
    rollup_version: ROLLUP_VERSION,
    migration_path: MIGRATION_PATH,
    migration_hash_sha256: migrationHash,
    row_manifest_hash_sha256: rowManifestHash,
    package_fingerprint_sha256: packageFingerprint,
    existing_rows_for_rollup_version: existingRowsForRollupVersion,
    proposed_rollup_rows: rows.length,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
      deletes: false,
      upserts: false,
      merges: false,
      migrations: false,
    },
    input_counts: {
      candidates: candidates.length,
      normalized_evidence: normalizedEvidence.length,
      signal_candidates: readModel.summary.signal_count,
      reviewed_signals: gate.summary.reviewed_signal_count,
      multi_source_signal_count: readModel.summary.multi_source_signal_count,
      single_source_signal_count: readModel.summary.single_source_signal_count,
    },
    rollup_summary: {
      row_count: rows.length,
      publishable_count: rows.filter((row) => row.publishable === true).length,
      app_visible_count: rows.filter((row) => row.app_visible === true).length,
      market_truth_count: rows.filter((row) => row.market_truth === true).length,
      status_counts: countBy(rows, (row) => row.review_status),
      variance_band_counts: countBy(rows, (row) => row.variance_band),
      flag_counts: countBy(rows.flatMap((row) => row.review_flags), (flag) => flag),
      source_count_counts: countBy(rows, (row) => String(row.source_count ?? 0)),
    },
    samples: rows.slice(0, sampleLimit).map((row) => ({
      gv_id: row.gv_id,
      card_print_id: row.card_print_id,
      review_status: row.review_status,
      source_count: row.source_count,
      eligible_evidence_count: row.eligible_evidence_count,
      reference_median: row.reference_median,
      variance_band: row.variance_band,
      review_flags: row.review_flags,
    })),
    findings,
    ready_for_apply_approval: findings.length === 0,
  };
  report.approval_prompt = buildApprovalPrompt(report);
  return report;
}

function tableRows(object) {
  return Object.entries(object ?? {}).map(([key, value]) => `| ${key} | ${value} |`);
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09m_market_reference_signal_rollup_refresh_plan_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, [
    "# MEE-09M Market Reference Signal Rollup Refresh Plan",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready: \`${report.ready_for_apply_approval}\``,
    `- Rollup version: \`${report.rollup_version}\``,
    `- Proposed rows: \`${report.proposed_rollup_rows}\``,
    `- Existing rows for version: \`${report.existing_rows_for_rollup_version}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    "",
    "## Status Counts",
    "",
    "| Status | Rows |",
    "| --- | ---: |",
    ...tableRows(report.rollup_summary.status_counts),
    "",
    "## Source Counts",
    "",
    "| Source Count | Rows |",
    "| --- | ---: |",
    ...tableRows(report.rollup_summary.source_count_counts),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Approval Prompt",
    "",
    "```text",
    report.approval_prompt,
    "```",
    "",
  ].join("\n"));
  return { jsonPath: rel(jsonPath), mdPath: rel(mdPath) };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  buildMarketReferenceSignalRollupRefreshPlanV1()
    .then((report) => {
      const artifacts = writeReport(report);
      console.log(JSON.stringify({
        package_id: report.package_id,
        ready: report.ready_for_apply_approval,
        rollup_version: report.rollup_version,
        package_fingerprint_sha256: report.package_fingerprint_sha256,
        row_manifest_hash_sha256: report.row_manifest_hash_sha256,
        proposed_rollup_rows: report.proposed_rollup_rows,
        existing_rows_for_rollup_version: report.existing_rows_for_rollup_version,
        input_counts: report.input_counts,
        rollup_summary: report.rollup_summary,
        findings: report.findings,
        artifacts,
      }, null, 2));
      if (!report.ready_for_apply_approval) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
