import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import { buildMarketReferenceWarehouseBackfillRowsV1 } from "../../backend/pricing/market_reference_warehouse_backfill_manifest_v1.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-WAREHOUSE-BACKFILL-APPLY-V1";
export const EXPECTED_MANIFEST_HASH = "3a54b2744071601dc610d63767d54b3e7f90a5ddaa3ae8a6a3ce687cbae52878";
export const EXPECTED_MIGRATION_HASH = "2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f";
export const APPROVAL_TEXT = "Approve real MARKET-REFERENCE-WAREHOUSE-BACKFILL-REPAIR-AND-CORRECTED-APPLY-V1 apply only. Corrected manifest hash: 3a54b2744071601dc610d63767d54b3e7f90a5ddaa3ae8a6a3ce687cbae52878. Migration hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f. Package fingerprint: 79943f75cbd89d06d53655c259557dbff8f1f39de177fc939ec6bba041afe7c7. Scope: delete only the partial failed backfill rows currently present in market_reference_* warehouse tables, then insert 5 acquisition run rows, 10788 deduped raw snapshot rows, 11025 candidate rows, 11025 normalized evidence rows, and 1 coverage report row into market_reference_* warehouse tables only. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes outside market_reference_* repair cleanup. No upserts. No merges. No global apply.";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

const INPUTS = {
  manifest: "docs/audits/market_evidence_engine_v1/mee_08a_market_reference_warehouse_backfill_manifest_2026-06-25T18-33-27-749Z.json",
  migration: "supabase/migrations/20260625000000_market_reference_warehouse_v1.sql",
  batch: "docs/audits/market_evidence_engine_v1/mee_04c_raw_evidence_acquisition_batch_2026-06-25T17-33-07-661Z.json",
  tcgcsvAcquisition: "docs/audits/market_evidence_engine_v1/mee_06b_tcgcsv_reference_evidence_2026-06-25T17-45-49-629Z.json",
  pokemonTcgAcquisition: "docs/audits/market_evidence_engine_v1/mee_06a_pokemontcg_io_reference_evidence_2026-06-25T17-34-20-477Z.json",
  tcgcsvNormalized: "docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-45-57-604Z.json",
  pokemonTcgNormalized: "docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-36-37-485Z.json",
  coverageReport: "docs/audits/market_evidence_engine_v1/mee_06d_free_reference_coverage_gap_2026-06-25T17-46-08-509Z.json",
};

const EXPECTED_ROW_COUNTS = {
  market_reference_acquisition_runs: 5,
  market_reference_raw_snapshots: 10788,
  market_reference_candidates: 11025,
  market_reference_normalized_evidence: 11025,
  market_reference_coverage_reports: 1,
};

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

function read(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  const parsed = {
    apply: false,
    approvalText: "",
    chunkSize: 500,
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
    throw new Error("[market-reference-backfill-apply] --chunk-size must be 1..1000");
  }
  return parsed;
}

function loadRows() {
  const batch = readJson(INPUTS.batch);
  const tcgcsvAcquisition = readJson(INPUTS.tcgcsvAcquisition);
  const pokemonTcgAcquisition = readJson(INPUTS.pokemonTcgAcquisition);
  const tcgcsvNormalized = readJson(INPUTS.tcgcsvNormalized);
  const pokemonTcgNormalized = readJson(INPUTS.pokemonTcgNormalized);
  const coverageReport = readJson(INPUTS.coverageReport);

  return buildMarketReferenceWarehouseBackfillRowsV1({
    batch,
    acquisitions: [tcgcsvAcquisition, pokemonTcgAcquisition],
    normalizedArtifacts: [tcgcsvNormalized, pokemonTcgNormalized],
    coverageReport,
    artifactPaths: {
      batch: INPUTS.batch,
      acquisitions: [INPUTS.tcgcsvAcquisition, INPUTS.pokemonTcgAcquisition],
      normalized: [INPUTS.tcgcsvNormalized, INPUTS.pokemonTcgNormalized],
      coverageReport: INPUTS.coverageReport,
      tcgcsvAcquisition: INPUTS.tcgcsvAcquisition,
      pokemonTcgAcquisition: INPUTS.pokemonTcgAcquisition,
    },
  });
}

function allBackfillPayloadInputsAvailable() {
  return [
    INPUTS.batch,
    INPUTS.tcgcsvAcquisition,
    INPUTS.pokemonTcgAcquisition,
    INPUTS.tcgcsvNormalized,
    INPUTS.pokemonTcgNormalized,
    INPUTS.coverageReport,
  ].every((relativePath) => existsSync(path.join(REPO_ROOT, relativePath)));
}

function rowCounts(rows) {
  return {
    market_reference_acquisition_runs: rows.acquisitionRuns.length,
    market_reference_raw_snapshots: rows.rawSnapshots.length,
    market_reference_candidates: rows.candidateRows.length,
    market_reference_normalized_evidence: rows.normalizedRows.length,
    market_reference_coverage_reports: rows.coverageRows.length,
  };
}

function sameCounts(actual, expected) {
  return Object.entries(expected).every(([key, value]) => actual?.[key] === value);
}

function stripClientKeys(row, keys) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));
}

function rawSnapshotKey(row) {
  return sha256({
    source: row.source,
    source_object_type: row.source_object_type,
    source_object_id: row.source_object_id,
    payload_hash: row.payload_hash,
  });
}

async function insertChunked(supabase, table, rows, { chunkSize, select = "id" }) {
  const inserted = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { data, error } = await supabase.from(table).insert(chunk).select(select);
    if (error) throw new Error(`[market-reference-backfill-apply] insert failed for ${table}: ${error.message}`);
    inserted.push(...(data ?? []));
  }
  return inserted;
}

async function existingWarehouseCounts(supabase) {
  const tables = Object.keys(EXPECTED_ROW_COUNTS);
  const pairs = await Promise.all(tables.map(async (table) => {
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
    if (error) throw new Error(`[market-reference-backfill-apply] count failed for ${table}: ${error.message}`);
    return [table, count ?? 0];
  }));
  return Object.fromEntries(pairs);
}

async function applyBackfill({ rows, chunkSize }) {
  const supabase = createBackendClient();
  const existingCounts = await existingWarehouseCounts(supabase);
  const nonEmpty = Object.entries(existingCounts).filter(([, count]) => count > 0);
  if (nonEmpty.length > 0) {
    throw new Error(`[market-reference-backfill-apply] warehouse tables are not empty: ${JSON.stringify(Object.fromEntries(nonEmpty))}`);
  }

  const acquisitionRows = rows.acquisitionRuns.map((row) => ({
    run_key: row.run_key,
    contract_version: row.contract_version,
    source_phase: row.source_phase,
    source_list: row.source_list,
    batch_artifact_path: row.batch_artifact_path,
    batch_artifact_hash: row.batch_artifact_hash,
    input_artifact_paths: row.input_artifact_paths,
    options: row.options,
    summary: row.summary,
    started_at: row.started_at,
    finished_at: row.finished_at,
  }));
  await insertChunked(supabase, "market_reference_acquisition_runs", acquisitionRows, {
    chunkSize,
    select: "id,run_key",
  });

  const rawInputRows = rows.rawSnapshots.map((row) => stripClientKeys(row, ["raw_snapshot_key", "candidate_hash"]));
  const rawInserted = await insertChunked(supabase, "market_reference_raw_snapshots", rawInputRows, {
    chunkSize,
    select: "id,source,source_object_type,source_object_id,payload_hash",
  });
  const rawIdByKey = new Map(rawInserted.map((row) => [rawSnapshotKey(row), row.id]));

  const candidateInputRows = rows.candidateRows.map((row) => ({
    ...stripClientKeys(row, ["raw_snapshot_key"]),
    raw_snapshot_id: rawIdByKey.get(row.raw_snapshot_key) ?? null,
  }));
  const candidateInserted = await insertChunked(supabase, "market_reference_candidates", candidateInputRows, {
    chunkSize,
    select: "id,source,candidate_hash",
  });
  const candidateIdByKey = new Map(candidateInserted.map((row) => [`${row.source}:${row.candidate_hash}`, row.id]));

  const normalizedInputRows = rows.normalizedRows.map((row) => ({
    candidate_id: candidateIdByKey.get(`${row.source}:${row.candidate_hash}`),
    card_print_id: row.card_print_id,
    source: row.source,
    normalizer_version: row.normalizer_version,
    metric_key: row.metric_key,
    metric_family: row.metric_family,
    normalized_price: row.normalized_price,
    normalized_currency: row.normalized_currency,
    model_disposition: row.model_disposition,
    model_eligible: row.model_eligible,
    evidence_quality_score: row.evidence_quality_score,
    weight_hint: row.weight_hint,
    quality_flags: row.quality_flags,
    group_reference_median: row.group_reference_median,
    normalized_payload: row.normalized_payload,
  }));
  if (normalizedInputRows.some((row) => !row.candidate_id)) {
    throw new Error("[market-reference-backfill-apply] normalized rows missing candidate_id mapping");
  }
  await insertChunked(supabase, "market_reference_normalized_evidence", normalizedInputRows, {
    chunkSize,
    select: "id",
  });

  await insertChunked(supabase, "market_reference_coverage_reports", rows.coverageRows, {
    chunkSize,
    select: "id",
  });

  return existingWarehouseCounts(supabase);
}

export function buildMarketReferenceWarehouseBackfillApplyReportV1({
  apply = false,
  approvalText = "",
  generatedAt = new Date().toISOString(),
} = {}) {
  const manifest = existsSync(path.join(REPO_ROOT, INPUTS.manifest)) ? readJson(INPUTS.manifest) : null;
  const migrationHash = existsSync(path.join(REPO_ROOT, INPUTS.migration)) ? sha256(read(INPUTS.migration)) : null;
  const payloadInputsAvailable = allBackfillPayloadInputsAvailable();
  const rows = payloadInputsAvailable ? loadRows() : null;
  const counts = rows ? rowCounts(rows) : (manifest?.proposed_table_row_counts ?? EXPECTED_ROW_COUNTS);
  const findings = [];

  if (manifest?.manifest_hash_sha256 !== EXPECTED_MANIFEST_HASH) findings.push("manifest_hash_mismatch");
  if (migrationHash !== EXPECTED_MIGRATION_HASH) findings.push("migration_hash_mismatch");
  if (!sameCounts(counts, EXPECTED_ROW_COUNTS)) findings.push("row_counts_mismatch");
  if (manifest?.ready_for_db_backfill_apply_plan !== true) findings.push("manifest_not_ready");
  if ((manifest?.findings ?? []).length > 0) findings.push("manifest_contains_findings");
  if (rows?.candidateRows.some((row) => row.can_publish_price_directly === true)) findings.push("direct_publish_candidate_detected");
  if (rows?.normalizedRows.some((row) => row.normalized_payload?.can_publish_price_directly === true)) findings.push("direct_publish_normalized_detected");
  if (apply && !payloadInputsAvailable) findings.push("payload_inputs_missing_for_apply");
  if (apply && approvalText !== APPROVAL_TEXT) findings.push("approval_text_mismatch");

  const packageFingerprint = sha256({
    package_id: PACKAGE_ID,
    manifest_hash: manifest?.manifest_hash_sha256 ?? null,
    migration_hash: migrationHash,
    row_counts: counts,
    apply_order: [
      "market_reference_acquisition_runs",
      "market_reference_raw_snapshots",
      "market_reference_candidates",
      "market_reference_normalized_evidence",
      "market_reference_coverage_reports",
    ],
  });

  return {
    package_id: PACKAGE_ID,
    mode: apply ? "apply_requested" : "dry_run_report_only",
    generated_at: generatedAt,
    approval_required: true,
    approval_text_matched: approvalText === APPROVAL_TEXT,
    manifest_hash_sha256: manifest?.manifest_hash_sha256 ?? null,
    migration_hash_sha256: migrationHash,
    package_fingerprint_sha256: packageFingerprint,
    proposed_table_row_counts: counts,
    expected_table_row_counts: EXPECTED_ROW_COUNTS,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: apply && findings.length === 0,
      pricing_observations_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
    },
    findings,
    ready_for_apply: findings.length === 0,
    applied: false,
  };
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_08c_market_reference_warehouse_backfill_apply_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(AUDIT_DIR, `${base}.md`);
  writeFileSync(path.join(REPO_ROOT, jsonPath), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(REPO_ROOT, mdPath), [
    "# MEE-08C Market Reference Warehouse Backfill Apply Package",
    "",
    `- Package: \`${report.package_id}\``,
    `- Mode: \`${report.mode}\``,
    `- Ready: \`${report.ready_for_apply}\``,
    `- Applied: \`${report.applied}\``,
    `- Manifest hash: \`${report.manifest_hash_sha256}\``,
    `- Migration hash: \`${report.migration_hash_sha256}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    "",
    "## Row Counts",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...Object.entries(report.proposed_table_row_counts).map(([table, count]) => `| ${table} | ${count} |`),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n"));
  return { jsonPath: rel(path.join(REPO_ROOT, jsonPath)), mdPath: rel(path.join(REPO_ROOT, mdPath)) };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const args = parseArgs(process.argv.slice(2));
  const report = buildMarketReferenceWarehouseBackfillApplyReportV1(args);
  if (args.apply && report.ready_for_apply) {
    try {
      const rows = loadRows();
      const finalCounts = await applyBackfill({ rows, chunkSize: args.chunkSize });
      report.applied = true;
      report.final_table_counts = finalCounts;
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
  console.log(JSON.stringify({ ...report, artifacts }, null, 2));
}
