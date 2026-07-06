import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_ID = "MARKET-REFERENCE-WAREHOUSE-BACKFILL-V1";
export const EXPECTED_MANIFEST_HASH = "3a54b2744071601dc610d63767d54b3e7f90a5ddaa3ae8a6a3ce687cbae52878";
export const EXPECTED_MIGRATION_HASH = "2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f";
export const EXPECTED_ROW_COUNTS = {
  market_reference_acquisition_runs: 5,
  market_reference_raw_snapshots: 10788,
  market_reference_candidates: 11025,
  market_reference_normalized_evidence: 11025,
  market_reference_coverage_reports: 1,
};
export const APPROVAL_TEXT = "Approve real MARKET-REFERENCE-WAREHOUSE-BACKFILL-V1 corrected apply plan only. Manifest hash: 3a54b2744071601dc610d63767d54b3e7f90a5ddaa3ae8a6a3ce687cbae52878. Migration hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f. Scope: prepare DB backfill apply package for 5 acquisition run rows, 10788 deduped raw snapshot rows, 11025 candidate rows, 11025 normalized evidence rows, and 1 coverage report row only. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MANIFEST_PATH = "docs/audits/market_evidence_engine_v1/mee_08a_market_reference_warehouse_backfill_manifest_2026-06-25T18-33-27-749Z.json";
const MIGRATION_PATH = "supabase/migrations/20260625000000_market_reference_warehouse_v1.sql";
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function read(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function parseArgs(argv) {
  const parsed = {
    applyPlan: false,
    approvalText: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply-plan") parsed.applyPlan = true;
    else if (arg === "--approval-text") {
      parsed.approvalText = argv[index + 1] ?? "";
      index += 1;
    }
  }
  return parsed;
}

function sameCounts(actual, expected) {
  return Object.entries(expected).every(([key, value]) => actual?.[key] === value);
}

function buildPackageFingerprint({ manifestHash, migrationHash, rowCounts }) {
  return sha256(JSON.stringify({
    package_id: PACKAGE_ID,
    manifest_hash: manifestHash,
    migration_hash: migrationHash,
    row_counts: rowCounts,
    boundary: {
      warehouse_tables_only: true,
      pricing_observations_writes: false,
      public_price_publication: false,
    },
  }));
}

export function buildMarketReferenceWarehouseBackfillApplyGateReportV1({
  applyPlan = false,
  approvalText = "",
  generatedAt = new Date().toISOString(),
} = {}) {
  const manifestExists = existsSync(path.join(REPO_ROOT, MANIFEST_PATH));
  const migrationExists = existsSync(path.join(REPO_ROOT, MIGRATION_PATH));
  const manifest = manifestExists ? JSON.parse(read(MANIFEST_PATH)) : null;
  const migrationHash = migrationExists ? sha256(read(MIGRATION_PATH)) : null;
  const manifestHash = manifest?.manifest_hash_sha256 ?? null;
  const rowCounts = manifest?.proposed_table_row_counts ?? {};
  const findings = [];

  if (!manifestExists) findings.push("manifest_missing");
  if (!migrationExists) findings.push("migration_missing");
  if (manifestHash !== EXPECTED_MANIFEST_HASH) findings.push("manifest_hash_mismatch");
  if (migrationHash !== EXPECTED_MIGRATION_HASH) findings.push("migration_hash_mismatch");
  if (!sameCounts(rowCounts, EXPECTED_ROW_COUNTS)) findings.push("row_counts_mismatch");
  if (manifest?.ready_for_db_backfill_apply_plan !== true) findings.push("manifest_not_ready");
  if ((manifest?.findings ?? []).length > 0) findings.push("manifest_contains_findings");
  if (manifest?.boundary?.db_writes !== false) findings.push("manifest_db_write_boundary_not_false");
  if (manifest?.boundary?.pricing_observations_writes !== false) findings.push("manifest_pricing_observation_boundary_not_false");
  if (manifest?.boundary?.public_price_publication !== false) findings.push("manifest_public_price_boundary_not_false");
  if (applyPlan && approvalText !== APPROVAL_TEXT) findings.push("approval_text_mismatch");

  const packageFingerprint = buildPackageFingerprint({
    manifestHash,
    migrationHash,
    rowCounts,
  });

  return {
    package_id: PACKAGE_ID,
    mode: applyPlan ? "apply_plan_requested" : "gate_report_only",
    generated_at: generatedAt,
    manifest_path: MANIFEST_PATH,
    migration_path: MIGRATION_PATH,
    manifest_hash_sha256: manifestHash,
    migration_hash_sha256: migrationHash,
    package_fingerprint_sha256: packageFingerprint,
    expected_manifest_hash_sha256: EXPECTED_MANIFEST_HASH,
    expected_migration_hash_sha256: EXPECTED_MIGRATION_HASH,
    proposed_table_row_counts: rowCounts,
    expected_table_row_counts: EXPECTED_ROW_COUNTS,
    approval_required: true,
    approval_text_matched: approvalText === APPROVAL_TEXT,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      apply_plan_only: true,
    },
    apply_order: [
      "market_reference_acquisition_runs",
      "market_reference_raw_snapshots",
      "market_reference_candidates",
      "market_reference_normalized_evidence",
      "market_reference_coverage_reports",
    ],
    findings,
    ready_for_apply_plan: findings.length === 0,
    applied: false,
  };
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_08b_market_reference_warehouse_backfill_apply_gate_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(AUDIT_DIR, `${base}.md`);
  writeFileSync(path.join(REPO_ROOT, jsonPath), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(REPO_ROOT, mdPath), [
    "# MEE-08B Market Reference Warehouse Backfill Apply Gate",
    "",
    `- Package: \`${report.package_id}\``,
    `- Mode: \`${report.mode}\``,
    `- Ready: \`${report.ready_for_apply_plan}\``,
    `- Applied: \`${report.applied}\``,
    `- Manifest hash: \`${report.manifest_hash_sha256}\``,
    `- Migration hash: \`${report.migration_hash_sha256}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    "",
    "## Proposed Row Counts",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...Object.entries(report.proposed_table_row_counts).map(([table, count]) => `| ${table} | ${count} |`),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Boundary",
    "",
    "- Apply plan only.",
    "- No DB writes.",
    "- No provider calls.",
    "- No pricing rollups.",
    "- No public price publication.",
    "",
  ].join("\n"));
  return { jsonPath, mdPath };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const args = parseArgs(process.argv.slice(2));
  const report = buildMarketReferenceWarehouseBackfillApplyGateReportV1(args);
  const artifacts = writeReport(report);
  console.log(JSON.stringify({ ...report, artifacts }, null, 2));
  if (args.applyPlan && !report.ready_for_apply_plan) process.exitCode = 1;
}
