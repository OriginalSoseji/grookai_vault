import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MARKET_REFERENCE_SIGNAL_ROLLUP_VERSION,
  buildMarketReferenceSignalRollupRowsV1,
} from "../../backend/pricing/market_reference_signal_rollup_rows_v1.mjs";
import { buildMarketReferenceSignalReadModelV1 } from "../../backend/pricing/market_reference_signal_read_model_v1.mjs";
import { buildMarketReferenceSignalReviewGateV1 } from "../../backend/pricing/market_reference_signal_review_gate_v1.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-SIGNAL-ROLLUP-BACKFILL-V1";
export const SIGNAL_CURRENCY = "USD";
export const EXPECTED_ROLLUP_ROW_COUNT = 993;
export const EXPECTED_PUBLISHABLE_COUNT = 0;
export const EXPECTED_APP_VISIBLE_COUNT = 0;
export const EXPECTED_MARKET_TRUTH_COUNT = 0;
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

function parseArgs(argv) {
  const parsed = {
    apply: false,
    approvalText: "",
    chunkSize: 500,
    sampleLimit: Number(argv.find((arg) => arg.startsWith("--sample-limit="))?.slice("--sample-limit=".length) ?? 12),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") parsed.apply = true;
    else if (arg === "--approval-text") {
      parsed.approvalText = argv[index + 1] ?? "";
      index += 1;
    } else if (arg.startsWith("--chunk-size=")) {
      parsed.chunkSize = Number(arg.slice("--chunk-size=".length));
    }
  }
  if (!Number.isInteger(parsed.chunkSize) || parsed.chunkSize < 1 || parsed.chunkSize > 1000) {
    throw new Error("[market-reference-signal-rollup-backfill] --chunk-size must be 1..1000");
  }
  return parsed;
}

async function fetchAll(supabase, table, select, { pageSize = 1000 } = {}) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select(select).range(from, to);
    if (error) throw new Error(`[market-reference-signal-rollup-backfill] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function existingRollupCount(supabase) {
  const { count, error } = await supabase
    .from("market_reference_signal_rollups")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(`[market-reference-signal-rollup-backfill] count failed: ${error.message}`);
  return count ?? 0;
}

async function insertChunked(supabase, table, rows, { chunkSize }) {
  let inserted = 0;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`[market-reference-signal-rollup-backfill] insert failed for ${table}: ${error.message}`);
    inserted += chunk.length;
  }
  return inserted;
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

export async function buildMarketReferenceSignalRollupBackfillReportV1({
  apply = false,
  approvalText = "",
  chunkSize = 500,
  generatedAt = new Date().toISOString(),
  sampleLimit = 12,
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
  const existingRows = await existingRollupCount(supabase);
  const migrationHash = sha256(readFileSync(path.join(REPO_ROOT, MIGRATION_PATH), "utf8"));

  const readModel = buildMarketReferenceSignalReadModelV1({
    candidates,
    normalizedEvidence,
    currency: SIGNAL_CURRENCY,
  });
  const gate = buildMarketReferenceSignalReviewGateV1({ signals: readModel.signals });
  const rows = buildMarketReferenceSignalRollupRowsV1({
    signals: readModel.signals,
    reviewedSignals: gate.reviewed_signals,
  });

  const rowManifest = rows.map((row) => ({
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    rollup_version: row.rollup_version,
    review_status: row.review_status,
    reference_low: row.reference_low,
    reference_median: row.reference_median,
    reference_high: row.reference_high,
    source_count: row.source_count,
    eligible_evidence_count: row.eligible_evidence_count,
    review_flags: row.review_flags,
    publishable: row.publishable,
    app_visible: row.app_visible,
    market_truth: row.market_truth,
  }));
  const rowManifestHash = sha256(rowManifest);
  const packageFingerprint = sha256({
    package_id: PACKAGE_ID,
    migration_hash: migrationHash,
    rollup_version: MARKET_REFERENCE_SIGNAL_ROLLUP_VERSION,
    row_manifest_hash: rowManifestHash,
    row_count: rows.length,
  });

  const findings = [];
  if (migrationHash !== EXPECTED_MIGRATION_HASH) findings.push("migration_hash_mismatch");
  if (existingRows !== 0) findings.push("existing_rollup_rows_present");
  if (rows.length !== EXPECTED_ROLLUP_ROW_COUNT) findings.push("rollup_row_count_mismatch");
  if (rows.filter((row) => row.publishable === true).length !== EXPECTED_PUBLISHABLE_COUNT) findings.push("publishable_rollup_leak");
  if (rows.filter((row) => row.app_visible === true).length !== EXPECTED_APP_VISIBLE_COUNT) findings.push("app_visible_rollup_leak");
  if (rows.filter((row) => row.market_truth === true).length !== EXPECTED_MARKET_TRUTH_COUNT) findings.push("market_truth_rollup_leak");
  if (rows.some((row) => row.needs_review !== true)) findings.push("needs_review_false_detected");
  if (rows.some((row) => row.currency !== "USD")) findings.push("non_usd_rollup_detected");

  const approvalPrompt = `Approve real MARKET-REFERENCE-SIGNAL-ROLLUP-BACKFILL-APPLY-V1 apply only. Package fingerprint: ${packageFingerprint}. Row manifest hash: ${rowManifestHash}. Migration hash: ${migrationHash}. Scope: insert ${rows.length} internal-only market_reference_signal_rollups rows with rollup_version ${MARKET_REFERENCE_SIGNAL_ROLLUP_VERSION} into linked Supabase project ycdxbpibncqcchqiihfz only. All rows must keep needs_review=true, publishable=false, app_visible=false, and market_truth=false. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.`;
  if (apply && approvalText !== approvalPrompt) findings.push("approval_text_mismatch");

  let applied = false;
  let insertedRows = 0;
  let finalRollupRows = null;
  if (apply && findings.length === 0) {
    insertedRows = await insertChunked(supabase, "market_reference_signal_rollups", rows, { chunkSize });
    finalRollupRows = await existingRollupCount(supabase);
    applied = true;
    if (finalRollupRows !== rows.length) findings.push("final_rollup_row_count_mismatch");
  }

  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: apply ? "apply_requested" : "dry_run_report_only",
    rollup_version: MARKET_REFERENCE_SIGNAL_ROLLUP_VERSION,
    migration_path: MIGRATION_PATH,
    migration_hash_sha256: migrationHash,
    row_manifest_hash_sha256: rowManifestHash,
    package_fingerprint_sha256: packageFingerprint,
    existing_rollup_rows: existingRows,
    proposed_rollup_rows: rows.length,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: apply && applied,
      pricing_observations_writes: false,
      pricing_rollups_publication: false,
      public_price_publication: false,
      app_visible_pricing: false,
    },
    input_counts: {
      candidates: candidates.length,
      normalized_evidence: normalizedEvidence.length,
      signal_candidates: readModel.summary.signal_count,
      reviewed_signals: gate.summary.reviewed_signal_count,
    },
    rollup_summary: {
      row_count: rows.length,
      publishable_count: rows.filter((row) => row.publishable === true).length,
      app_visible_count: rows.filter((row) => row.app_visible === true).length,
      market_truth_count: rows.filter((row) => row.market_truth === true).length,
      status_counts: countBy(rows, (row) => row.review_status),
      variance_band_counts: countBy(rows, (row) => row.variance_band),
      flag_counts: countBy(rows.flatMap((row) => row.review_flags), (flag) => flag),
    },
    samples: rows.slice(0, sampleLimit).map((row) => ({
      gv_id: row.gv_id,
      card_print_id: row.card_print_id,
      review_status: row.review_status,
      source_count: row.source_count,
      eligible_evidence_count: row.eligible_evidence_count,
      reference_median: row.reference_median,
      review_flags: row.review_flags,
    })),
    approval_prompt: approvalPrompt,
    approval_text_matched: approvalText === approvalPrompt,
    applied,
    inserted_rows: insertedRows,
    final_rollup_rows: finalRollupRows,
    findings,
    ready_for_apply_approval: !apply && findings.length === 0,
    ready_for_apply: findings.length === 0,
  };
}

function tableRows(object) {
  return Object.entries(object ?? {}).map(([key, value]) => `| ${key} | ${value} |`);
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09f_market_reference_signal_rollup_backfill_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, [
    "# MEE-09F Market Reference Signal Rollup Backfill Package",
    "",
    `- Package: \`${report.package_id}\``,
    `- Mode: \`${report.mode}\``,
    `- Ready for apply approval: \`${report.ready_for_apply_approval}\``,
    `- Applied: \`${report.applied}\``,
    `- Rollup version: \`${report.rollup_version}\``,
    `- Proposed rows: \`${report.proposed_rollup_rows}\``,
    `- Existing rows: \`${report.existing_rollup_rows}\``,
    `- Inserted rows: \`${report.inserted_rows}\``,
    `- Final rows: \`${report.final_rollup_rows ?? ""}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    "",
    "## Boundary",
    "",
    "- Dry-run report only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No public/app-visible pricing.",
    "",
    "## Status Counts",
    "",
    "| Status | Rows |",
    "| --- | ---: |",
    ...tableRows(report.rollup_summary.status_counts),
    "",
    "## Flags",
    "",
    "| Flag | Rows |",
    "| --- | ---: |",
    ...tableRows(report.rollup_summary.flag_counts),
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
  const args = parseArgs(process.argv.slice(2));
  buildMarketReferenceSignalRollupBackfillReportV1(args)
    .then((report) => {
      const artifacts = writeReport(report);
      console.log(JSON.stringify({ ...report, artifacts }, null, 2));
      if (!report.ready_for_apply) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
