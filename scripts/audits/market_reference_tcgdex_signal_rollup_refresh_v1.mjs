import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import { buildMarketReferenceSignalReadModelV1 } from "../../backend/pricing/market_reference_signal_read_model_v1.mjs";
import { buildMarketReferenceSignalReviewGateV1 } from "../../backend/pricing/market_reference_signal_review_gate_v1.mjs";
import { buildMarketReferenceSignalRollupRowsV1 } from "../../backend/pricing/market_reference_signal_rollup_rows_v1.mjs";

export const PACKAGE_ID = "MEE-TCGDEX-REFERENCE-SIGNAL-ROLLUP-REFRESH-V1";
export const ROLLUP_VERSION = "MEE_13A_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_TCGDEX_REFERENCE_PRICING_V1";
export const EXPECTED_TCGDEX_CANDIDATES = 310744;
export const EXPECTED_TCGDEX_NORMALIZED = 310744;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const TCGDEX_SOURCES = ["tcgdex_tcgplayer_reference", "tcgdex_cardmarket_reference"];

function parseArgs(argv) {
  const parsed = {
    apply: false,
    chunkSize: 250,
  };
  for (const arg of argv) {
    if (arg === "--apply") parsed.apply = true;
    else if (arg.startsWith("--chunk-size=")) parsed.chunkSize = Number(arg.slice("--chunk-size=".length));
  }
  if (!Number.isInteger(parsed.chunkSize) || parsed.chunkSize < 50 || parsed.chunkSize > 500) {
    throw new Error("[tcgdex-signal-rollup-refresh] --chunk-size must be 50..500");
  }
  return parsed;
}

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

async function fetchAll(supabase, table, select, configure = (query) => query, { pageSize = 1000 } = {}) {
  const rows = [];
  for (let from = 0;; from += pageSize) {
    let data = null;
    let error = null;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await configure(supabase.from(table).select(select).range(from, from + pageSize - 1));
      data = response.data;
      error = response.error;
      if (!error) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
    if (error) throw new Error(`[tcgdex-signal-rollup-refresh] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function countRows(supabase, table, configure = (query) => query) {
  const { count, error } = await configure(supabase.from(table).select("id", { count: "exact", head: true }));
  if (error) throw new Error(`[tcgdex-signal-rollup-refresh] count failed for ${table}: ${error.message}`);
  return count ?? 0;
}

async function loadInputs(supabase) {
  const [candidates, normalizedEvidence, existingRowsForVersion] = await Promise.all([
    fetchAll(
      supabase,
      "market_reference_candidates",
      "id,card_print_id,gv_id,source,needs_review,can_publish_price_directly",
      (query) => query.order("id", { ascending: true }),
    ),
    fetchAll(
      supabase,
      "market_reference_normalized_evidence",
      "id,candidate_id,card_print_id,source,normalizer_version,metric_key,normalized_price,normalized_currency,model_disposition,model_eligible,normalized_payload",
      (query) => query.order("candidate_id", { ascending: true }).order("id", { ascending: true }),
    ),
    countRows(
      supabase,
      "market_reference_signal_rollups",
      (query) => query.eq("rollup_version", ROLLUP_VERSION),
    ),
  ]);
  return { candidates, normalizedEvidence, existingRowsForVersion };
}

function buildRows({ candidates, normalizedEvidence }) {
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
  return { readModel, gate, rows };
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

function validate({ inputs, readModel, gate, rows }) {
  const findings = [];
  const tcgdexCandidateCount = inputs.candidates.filter((row) => TCGDEX_SOURCES.includes(row.source)).length;
  const tcgdexNormalizedCount = inputs.normalizedEvidence.filter((row) => TCGDEX_SOURCES.includes(row.source)).length;
  if (tcgdexCandidateCount !== EXPECTED_TCGDEX_CANDIDATES) findings.push("tcgdex_candidate_count_mismatch");
  if (tcgdexNormalizedCount !== EXPECTED_TCGDEX_NORMALIZED) findings.push("tcgdex_normalized_count_mismatch");
  if (inputs.existingRowsForVersion !== 0) findings.push("target_rollup_version_already_exists");
  if (readModel.summary.publishable_count !== 0) findings.push("read_model_publishable_leak");
  if (gate.summary.publishable_count !== 0) findings.push("review_gate_publishable_leak");
  if (rows.length !== readModel.summary.signal_count) findings.push("rollup_signal_count_mismatch");
  if (rows.length === 0) findings.push("no_rollup_rows_projected");
  if (rows.some((row) => row.rollup_version !== ROLLUP_VERSION)) findings.push("wrong_rollup_version_detected");
  if (rows.some((row) => row.needs_review !== true)) findings.push("needs_review_false_detected");
  if (rows.some((row) => row.publishable !== false)) findings.push("publishable_leak_detected");
  if (rows.some((row) => row.app_visible !== false)) findings.push("app_visible_leak_detected");
  if (rows.some((row) => row.market_truth !== false)) findings.push("market_truth_leak_detected");
  if (rows.some((row) => row.currency !== "USD")) findings.push("non_usd_rollup_detected");
  if (inputs.candidates.some((row) => row.needs_review !== true)) findings.push("candidate_review_gate_missing");
  if (inputs.candidates.some((row) => row.can_publish_price_directly !== false)) findings.push("candidate_direct_publishable_detected");
  return findings;
}

async function insertChunked(supabase, rows, chunkSize) {
  let inserted = 0;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    let error = null;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await supabase.from("market_reference_signal_rollups").insert(chunk);
      error = response.error;
      if (!error) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
    if (error) throw new Error(`[tcgdex-signal-rollup-refresh] insert failed at offset ${index}: ${error.message}`);
    inserted += chunk.length;
    if ((index / chunkSize) % 10 === 0) {
      console.log(`[tcgdex-signal-rollup-refresh] inserted ${Math.min(inserted, rows.length)}/${rows.length}`);
    }
  }
  return inserted;
}

async function readbackVersion(supabase) {
  const rows = await fetchAll(
    supabase,
    "market_reference_signal_rollups",
    "id,rollup_version,review_status,currency,needs_review,publishable,app_visible,market_truth,source_count",
    (query) => query.eq("rollup_version", ROLLUP_VERSION),
  );
  return {
    row_count: rows.length,
    unsafe_rows: rows.filter((row) => (
      row.needs_review !== true ||
      row.publishable !== false ||
      row.app_visible !== false ||
      row.market_truth !== false ||
      row.currency !== "USD"
    )).length,
    status_counts: countBy(rows, (row) => row.review_status),
    source_count_counts: countBy(rows, (row) => String(row.source_count ?? 0)),
  };
}

function buildReport({ generatedAt, args, inputs, readModel, gate, rows, findings, applied = false, insertedRows = 0, readback = null }) {
  const manifest = rowManifest(rows);
  const rowManifestHash = sha256(manifest);
  const packageFingerprint = sha256({
    package_id: PACKAGE_ID,
    rollup_version: ROLLUP_VERSION,
    row_manifest_hash: rowManifestHash,
    input_counts: {
      candidates: inputs.candidates.length,
      normalized_evidence: inputs.normalizedEvidence.length,
      tcgdex_candidates: inputs.candidates.filter((row) => TCGDEX_SOURCES.includes(row.source)).length,
      tcgdex_normalized: inputs.normalizedEvidence.filter((row) => TCGDEX_SOURCES.includes(row.source)).length,
    },
    proposed_rollup_rows: rows.length,
  });
  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: args.apply ? "apply_requested" : "dry_run_report_only",
    rollup_version: ROLLUP_VERSION,
    ready_for_apply: findings.length === 0,
    applied,
    package_fingerprint_sha256: packageFingerprint,
    row_manifest_hash_sha256: rowManifestHash,
    proposed_rollup_rows: rows.length,
    existing_rows_for_rollup_version: inputs.existingRowsForVersion,
    input_counts: {
      candidates: inputs.candidates.length,
      normalized_evidence: inputs.normalizedEvidence.length,
      tcgdex_candidates: inputs.candidates.filter((row) => TCGDEX_SOURCES.includes(row.source)).length,
      tcgdex_normalized: inputs.normalizedEvidence.filter((row) => TCGDEX_SOURCES.includes(row.source)).length,
      signal_candidates: readModel.summary.signal_count,
      reviewed_signals: gate.summary.reviewed_signal_count,
      multi_source_signal_count: readModel.summary.multi_source_signal_count,
      single_source_signal_count: readModel.summary.single_source_signal_count,
      currency_excluded_evidence_count: readModel.summary.currency_excluded_evidence_count,
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
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: applied,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_price_publication: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      identity_table_writes: false,
      card_print_writes: false,
      card_printing_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      upserts: false,
      merges: false,
      migrations: false,
      global_apply: false,
    },
    inserted_rows: insertedRows,
    readback,
    findings,
    samples: rows.slice(0, 20).map((row) => ({
      gv_id: row.gv_id,
      card_print_id: row.card_print_id,
      review_status: row.review_status,
      source_count: row.source_count,
      eligible_evidence_count: row.eligible_evidence_count,
      reference_median: row.reference_median,
      variance_band: row.variance_band,
      review_flags: row.review_flags,
      source_summary: row.source_summary,
    })),
  };
}

function renderMarkdown(report) {
  return [
    "# MEE TCGdex Reference Signal Rollup Refresh V1",
    "",
    `- Package: \`${report.package_id}\``,
    `- Mode: \`${report.mode}\``,
    `- Ready: \`${report.ready_for_apply}\``,
    `- Applied: \`${report.applied}\``,
    `- Rollup version: \`${report.rollup_version}\``,
    `- Proposed rows: ${report.proposed_rollup_rows}`,
    `- Inserted rows: ${report.inserted_rows}`,
    "",
    "## Input Counts",
    "",
    `- Candidates: ${report.input_counts.candidates}`,
    `- Normalized evidence: ${report.input_counts.normalized_evidence}`,
    `- TCGdex candidates: ${report.input_counts.tcgdex_candidates}`,
    `- TCGdex normalized: ${report.input_counts.tcgdex_normalized}`,
    `- Signal candidates: ${report.input_counts.signal_candidates}`,
    `- Currency-excluded evidence: ${report.input_counts.currency_excluded_evidence_count}`,
    "",
    "## Rollup Summary",
    "",
    "```json",
    JSON.stringify(report.rollup_summary, null, 2),
    "```",
    "",
    "## Readback",
    "",
    "```json",
    JSON.stringify(report.readback, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_tcgdex_reference_signal_rollup_refresh_${report.generated_at.replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return { json: rel(jsonPath), markdown: rel(mdPath) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const supabase = createBackendClient();
  const inputs = await loadInputs(supabase);
  const { readModel, gate, rows } = buildRows(inputs);
  const findings = validate({ inputs, readModel, gate, rows });
  let report = buildReport({ generatedAt, args, inputs, readModel, gate, rows, findings });

  if (args.apply && report.ready_for_apply) {
    try {
      const insertedRows = await insertChunked(supabase, rows, args.chunkSize);
      const readback = await readbackVersion(supabase);
      const readbackFindings = [];
      if (insertedRows !== rows.length) readbackFindings.push("inserted_row_count_mismatch");
      if (readback.row_count !== rows.length) readbackFindings.push("readback_row_count_mismatch");
      if (readback.unsafe_rows !== 0) readbackFindings.push("readback_unsafe_rows_detected");
      report = buildReport({
        generatedAt,
        args,
        inputs,
        readModel,
        gate,
        rows,
        findings: [...findings, ...readbackFindings],
        applied: readbackFindings.length === 0,
        insertedRows,
        readback,
      });
      if (readbackFindings.length > 0) process.exitCode = 1;
    } catch (error) {
      report.findings.push(`apply_failed:${error.message}`);
      report.ready_for_apply = false;
      report.applied = false;
      process.exitCode = 1;
    }
  } else if (args.apply) {
    process.exitCode = 1;
  }

  const artifacts = writeReport(report);
  console.log(JSON.stringify({
    package_id: report.package_id,
    mode: report.mode,
    ready_for_apply: report.ready_for_apply,
    applied: report.applied,
    rollup_version: report.rollup_version,
    proposed_rollup_rows: report.proposed_rollup_rows,
    input_counts: report.input_counts,
    rollup_summary: report.rollup_summary,
    readback: report.readback,
    findings: report.findings,
    artifacts,
  }, null, 2));
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
