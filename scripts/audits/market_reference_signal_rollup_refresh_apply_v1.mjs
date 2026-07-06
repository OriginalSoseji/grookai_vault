import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import {
  ROLLUP_VERSION,
  buildMarketReferenceSignalRollupRefreshPlanV1,
} from "./market_reference_signal_rollup_refresh_plan_v1.mjs";
import { buildMarketReferenceSignalReadModelV1 } from "../../backend/pricing/market_reference_signal_read_model_v1.mjs";
import { buildMarketReferenceSignalReviewGateV1 } from "../../backend/pricing/market_reference_signal_review_gate_v1.mjs";
import { buildMarketReferenceSignalRollupRowsV1 } from "../../backend/pricing/market_reference_signal_rollup_rows_v1.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-SIGNAL-ROLLUP-REFRESH-APPLY-V1";
export const APPROVAL_TEXT = "Approve real MARKET-REFERENCE-SIGNAL-ROLLUP-REFRESH-APPLY-V1 apply only. Package fingerprint: cd7b04fba4e2f7d672267a15b20be4846223051b03c0377cfa7ba0425408672f. Row manifest hash: 1f29724993b556969857df8752d4598867f10fd10250e8d24ba8e1b5b1952d8d. Migration hash: eb2f1aa4a01977d455e131ec7f90b3d8250e2501f65cdc6199a9b2072dd82d41. Scope: insert 993 internal-only market_reference_signal_rollups rows with rollup_version MEE_09M_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_POKEMONTCG_SECOND_SOURCE_V1 into linked Supabase project ycdxbpibncqcchqiihfz only. Preserve existing rollup versions. All rows must keep needs_review=true, publishable=false, app_visible=false, and market_truth=false. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.";
export const EXPECTED_PACKAGE_FINGERPRINT = "cd7b04fba4e2f7d672267a15b20be4846223051b03c0377cfa7ba0425408672f";
export const EXPECTED_ROW_MANIFEST_HASH = "1f29724993b556969857df8752d4598867f10fd10250e8d24ba8e1b5b1952d8d";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

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
    throw new Error("[rollup-refresh-apply] --chunk-size must be 1..1000");
  }
  return parsed;
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function fetchAll(supabase, table, select, { pageSize = 1000 } = {}) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select(select).range(from, to);
    if (error) throw new Error(`[rollup-refresh-apply] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function buildRows(supabase) {
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
    currency: "USD",
  });
  const gate = buildMarketReferenceSignalReviewGateV1({ signals: readModel.signals });
  return buildMarketReferenceSignalRollupRowsV1({
    signals: readModel.signals,
    reviewedSignals: gate.reviewed_signals,
    rollupVersion: ROLLUP_VERSION,
  });
}

async function existingRowsForVersion(supabase) {
  const { count, error } = await supabase
    .from("market_reference_signal_rollups")
    .select("id", { count: "exact", head: true })
    .eq("rollup_version", ROLLUP_VERSION);
  if (error) throw new Error(`[rollup-refresh-apply] count failed: ${error.message}`);
  return count ?? 0;
}

async function insertChunked(supabase, rows, chunkSize) {
  let inserted = 0;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from("market_reference_signal_rollups").insert(chunk);
    if (error) throw new Error(`[rollup-refresh-apply] insert failed: ${error.message}`);
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

async function readbackVersion(supabase) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("market_reference_signal_rollups")
      .select("id,rollup_version,review_status,currency,needs_review,publishable,app_visible,market_truth,source_count")
      .eq("rollup_version", ROLLUP_VERSION)
      .range(from, from + 999);
    if (error) throw new Error(`[rollup-refresh-apply] readback failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return {
    row_count: rows.length,
    status_counts: countBy(rows, (row) => row.review_status),
    source_count_counts: countBy(rows, (row) => String(row.source_count ?? 0)),
    unsafe_rows: rows.filter((row) => (
      row.needs_review !== true ||
      row.publishable !== false ||
      row.app_visible !== false ||
      row.market_truth !== false ||
      row.currency !== "USD"
    )).length,
  };
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09n_market_reference_signal_rollup_refresh_apply_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, [
    "# MEE-09N Market Reference Signal Rollup Refresh Apply",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready: \`${report.ready_for_apply}\``,
    `- Applied: \`${report.applied}\``,
    `- Rollup version: \`${report.rollup_version}\``,
    `- Inserted rows: \`${report.inserted_rows}\``,
    `- Readback rows: \`${report.readback?.row_count ?? ""}\``,
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n"));
  return { jsonPath: rel(jsonPath), mdPath: rel(mdPath) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const plan = await buildMarketReferenceSignalRollupRefreshPlanV1({ generatedAt });
  const findings = [...plan.findings];
  if (plan.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
  if (plan.row_manifest_hash_sha256 !== EXPECTED_ROW_MANIFEST_HASH) findings.push("row_manifest_hash_mismatch");
  if (args.apply && args.approvalText !== APPROVAL_TEXT) findings.push("approval_text_mismatch");

  const supabase = createBackendClient();
  let insertedRows = 0;
  let applied = false;
  let readback = null;
  if (args.apply && findings.length === 0) {
    const existingRows = await existingRowsForVersion(supabase);
    if (existingRows !== 0) {
      findings.push("target_rollup_version_already_exists");
    } else {
      const rows = await buildRows(supabase);
      insertedRows = await insertChunked(supabase, rows, args.chunkSize);
      readback = await readbackVersion(supabase);
      applied = true;
      if (insertedRows !== 993) findings.push("inserted_row_count_mismatch");
      if (readback.row_count !== 993) findings.push("readback_row_count_mismatch");
      if (readback.unsafe_rows !== 0) findings.push("readback_unsafe_rows_detected");
    }
  } else if (args.apply) {
    process.exitCode = 1;
  }

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: args.apply ? "apply_requested" : "dry_run_report_only",
    rollup_version: ROLLUP_VERSION,
    package_fingerprint_sha256: plan.package_fingerprint_sha256,
    row_manifest_hash_sha256: plan.row_manifest_hash_sha256,
    proposed_rollup_rows: plan.proposed_rollup_rows,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: args.apply && applied,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      upserts: false,
      merges: false,
      migrations: false,
    },
    approval_text_matched: args.approvalText === APPROVAL_TEXT,
    ready_for_apply: findings.length === 0,
    applied,
    inserted_rows: insertedRows,
    readback,
    findings,
  };
  const artifacts = writeReport(report);
  console.log(JSON.stringify({ ...report, artifacts }, null, 2));
  if (!report.ready_for_apply) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
