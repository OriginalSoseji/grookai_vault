import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_ID = "MARKET-REFERENCE-WAREHOUSE-V1";
export const EXPECTED_PACKAGE_FINGERPRINT = "8a10a0213297ee37d44cc038560569b2a22fcde31222771d0b5aab1ee9fea39d";
export const EXPECTED_SQL_HASH = "2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f";
export const APPROVAL_TEXT = "Approve real MARKET-REFERENCE-WAREHOUSE-V1 migration candidate apply only. Fingerprint: 8a10a0213297ee37d44cc038560569b2a22fcde31222771d0b5aab1ee9fea39d. SQL hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f. Scope: create 5 free-reference Market Evidence Engine warehouse tables, supporting indexes, RLS enablement, and service-role-only policies only. No evidence backfill. No provider calls. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.";

const ROOT = process.cwd();
const CANDIDATE_SQL = "docs/sql/market_reference_warehouse_v1_migration_candidate.sql";
const DRY_RUN_SQL = "docs/sql/market_reference_warehouse_v1_guarded_dry_run.sql";
const MIGRATIONS_DIR = "supabase/migrations";
const MIGRATION_FILE_NAME = "20260625000000_market_reference_warehouse_v1.sql";
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function writeJsonAndMarkdown(report) {
  mkdirSync(path.join(ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_07d_market_reference_warehouse_migration_gate_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(AUDIT_DIR, `${base}.md`);

  writeFileSync(path.join(ROOT, jsonPath), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(ROOT, mdPath), [
    "# MEE-07D Market Reference Warehouse Migration Gate",
    "",
    `- Package: \`${report.package_id}\``,
    `- Mode: \`${report.mode}\``,
    `- Ready: \`${report.ready}\``,
    `- Applied: \`${report.applied}\``,
    `- Candidate SQL hash: \`${report.candidate_sql_hash_sha256}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Migration path: \`${report.migration_path}\``,
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Boundary",
    "",
    "- No evidence backfill.",
    "- No provider calls.",
    "- No pricing observations writes.",
    "- No public pricing views.",
    "- No global apply.",
    "",
  ].join("\n"));

  return { jsonPath, mdPath };
}

export function buildMarketReferenceWarehouseMigrationGateReportV1({
  apply = false,
  approvalText = "",
  generatedAt = new Date().toISOString(),
} = {}) {
  const candidateSql = read(CANDIDATE_SQL);
  const dryRunSql = read(DRY_RUN_SQL);
  const candidateStripped = stripSqlComments(candidateSql);
  const migrations = existsSync(path.join(ROOT, MIGRATIONS_DIR))
    ? readdirSync(path.join(ROOT, MIGRATIONS_DIR))
    : [];
  const migrationPath = path.join(MIGRATIONS_DIR, MIGRATION_FILE_NAME).replace(/\\/g, "/");
  const migrationAbsolutePath = path.join(ROOT, migrationPath);
  const migrationExists = existsSync(migrationAbsolutePath);
  const migrationHash = migrationExists ? sha256(readFileSync(migrationAbsolutePath, "utf8")) : null;
  const packageFiles = [
    { path: DRY_RUN_SQL, sha256: sha256(dryRunSql) },
    { path: CANDIDATE_SQL, sha256: sha256(candidateSql) },
    {
      path: "docs/plans/market_evidence_engine_v1/MEE_07A_FREE_REFERENCE_WAREHOUSE_CONTRACT_V1.md",
      sha256: sha256(read("docs/plans/market_evidence_engine_v1/MEE_07A_FREE_REFERENCE_WAREHOUSE_CONTRACT_V1.md")),
    },
    {
      path: "docs/plans/market_evidence_engine_v1/MEE_07B_FREE_REFERENCE_WAREHOUSE_DRY_RUN_SQL_V1.md",
      sha256: sha256(read("docs/plans/market_evidence_engine_v1/MEE_07B_FREE_REFERENCE_WAREHOUSE_DRY_RUN_SQL_V1.md")),
    },
    {
      path: "docs/plans/market_evidence_engine_v1/MEE_07C_FREE_REFERENCE_WAREHOUSE_MIGRATION_CANDIDATE_V1.md",
      sha256: sha256(read("docs/plans/market_evidence_engine_v1/MEE_07C_FREE_REFERENCE_WAREHOUSE_MIGRATION_CANDIDATE_V1.md")),
    },
  ];
  const packageFingerprint = sha256(JSON.stringify(packageFiles));
  const findings = [];

  if (packageFingerprint !== EXPECTED_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
  if (packageFiles[1].sha256 !== EXPECTED_SQL_HASH) findings.push("candidate_sql_hash_mismatch");
  if (!/(^|\n)\s*commit\s*;\s*$/i.test(candidateStripped)) findings.push("candidate_missing_final_commit");
  if (/(^|\n)\s*rollback\s*;/i.test(candidateStripped)) findings.push("candidate_contains_rollback");
  if (/\binsert\s+into\s+public\.pricing_observations\b/i.test(candidateStripped)) findings.push("pricing_observations_insert_detected");
  if (/\bupdate\s+public\.pricing_observations\b/i.test(candidateStripped)) findings.push("pricing_observations_update_detected");
  if (/\balter\s+table\s+public\.pricing_observations\b/i.test(candidateStripped)) findings.push("pricing_observations_alter_detected");
  if (/\b(insert|update|alter\s+table)\s+public\.ebay_active_prices_latest\b/i.test(candidateStripped)) findings.push("ebay_latest_price_write_detected");
  if (/\bcreate\s+(materialized\s+)?view\b/i.test(candidateStripped)) findings.push("public_pricing_view_creation_detected");
  if (/\bdelete\s+from\b/i.test(candidateStripped)) findings.push("delete_detected");
  const existingReferenceMigrations = migrations.filter((name) => /market_reference_warehouse_v1/i.test(name));
  if (existingReferenceMigrations.length > 1) findings.push("multiple_reference_warehouse_migrations_exist");
  if (existingReferenceMigrations.length === 1 && !migrationExists) findings.push("unexpected_reference_warehouse_migration_name");
  if (migrationExists && migrationHash !== packageFiles[1].sha256) findings.push("existing_migration_hash_mismatch");
  if (apply && approvalText !== APPROVAL_TEXT) findings.push("approval_text_mismatch");

  return {
    package_id: PACKAGE_ID,
    mode: apply ? "apply_requested" : "gate_report_only",
    generated_at: generatedAt,
    candidate_sql_path: CANDIDATE_SQL,
    dry_run_sql_path: DRY_RUN_SQL,
    migration_path: migrationPath,
    migration_exists: migrationExists,
    migration_hash_sha256: migrationHash,
    migration_matches_candidate: migrationHash === packageFiles[1].sha256,
    candidate_sql_hash_sha256: packageFiles[1].sha256,
    package_fingerprint_sha256: packageFingerprint,
    expected_candidate_sql_hash_sha256: EXPECTED_SQL_HASH,
    expected_package_fingerprint_sha256: EXPECTED_PACKAGE_FINGERPRINT,
    approval_required: true,
    approval_text_matched: approvalText === APPROVAL_TEXT,
    findings,
    ready: findings.length === 0,
    applied: false,
    package_files: packageFiles,
  };
}

function parseArgs(argv) {
  const args = { apply: false, approvalText: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") args.apply = true;
    if (arg === "--approval-text") {
      args.approvalText = argv[index + 1] ?? "";
      index += 1;
    }
  }
  return args;
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const args = parseArgs(process.argv.slice(2));
  const report = buildMarketReferenceWarehouseMigrationGateReportV1(args);

  if (args.apply && report.ready) {
    const migrationPath = path.join(ROOT, report.migration_path);
    if (report.migration_exists && report.migration_matches_candidate) {
      report.applied = true;
      report.mode = "migration_already_created";
    } else {
      writeFileSync(migrationPath, read(CANDIDATE_SQL));
      report.applied = true;
      report.mode = "migration_created";
    }
  }

  const paths = writeJsonAndMarkdown(report);
  console.log(JSON.stringify({ ...report, artifacts: paths }, null, 2));

  if (args.apply && !report.applied) {
    process.exitCode = 1;
  }
}
