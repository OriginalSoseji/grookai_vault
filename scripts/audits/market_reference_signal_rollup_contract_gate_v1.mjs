import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_ID = "MARKET-REFERENCE-SIGNAL-ROLLUP-CONTRACT-GATE-V1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const DRY_RUN_SQL = "docs/sql/market_reference_signal_rollups_v1_guarded_dry_run.sql";
const CANDIDATE_SQL = "docs/sql/market_reference_signal_rollups_v1_migration_candidate.sql";
const CONTRACT_DOC = "docs/plans/market_evidence_engine_v1/MEE_09D_REFERENCE_SIGNAL_ROLLUP_CONTRACT_V1.md";
const MIGRATIONS_DIR = "supabase/migrations";
const EXPECTED_MIGRATION_NAME = "20260625010000_market_reference_signal_rollups_v1.sql";

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

export function buildMarketReferenceSignalRollupContractGateV1({
  generatedAt = new Date().toISOString(),
} = {}) {
  const dryRunSql = read(DRY_RUN_SQL);
  const candidateSql = read(CANDIDATE_SQL);
  const contractDoc = read(CONTRACT_DOC);
  const dryRunStripped = stripSqlComments(dryRunSql);
  const candidateStripped = stripSqlComments(candidateSql);
  const migrations = existsSync(path.join(ROOT, MIGRATIONS_DIR))
    ? readdirSync(path.join(ROOT, MIGRATIONS_DIR))
    : [];
  const rollupMigrations = migrations.filter((name) => /market_reference_signal_rollups_v1/i.test(name));
  const rollupMigrationDetails = rollupMigrations.map((name) => {
    const migrationPath = `${MIGRATIONS_DIR}/${name}`;
    const contents = read(migrationPath);
    return {
      name,
      path: migrationPath,
      sha256: sha256(contents),
      matches_candidate_sql: contents === candidateSql,
      expected_name: name === EXPECTED_MIGRATION_NAME,
    };
  });
  const expectedMigration = rollupMigrationDetails.find((migration) => migration.name === EXPECTED_MIGRATION_NAME);
  const unexpectedMigrations = rollupMigrationDetails.filter((migration) => migration.name !== EXPECTED_MIGRATION_NAME);
  const packageFiles = [
    { path: DRY_RUN_SQL, sha256: sha256(dryRunSql) },
    { path: CANDIDATE_SQL, sha256: sha256(candidateSql) },
    { path: CONTRACT_DOC, sha256: sha256(contractDoc) },
  ];
  const packageFingerprint = sha256(JSON.stringify(packageFiles));
  const findings = [];

  if (!/\bcreate\s+table\s+public\.market_reference_signal_rollups\b/i.test(candidateStripped)) findings.push("rollup_table_missing");
  if (!/(^|\n)\s*commit\s*;\s*$/i.test(candidateStripped)) findings.push("candidate_missing_final_commit");
  if (!/(^|\n)\s*rollback\s*;\s*$/i.test(dryRunStripped)) findings.push("dry_run_missing_final_rollback");
  if (/\binsert\s+into\s+public\.pricing_observations\b/i.test(candidateStripped)) findings.push("pricing_observations_insert_detected");
  if (/\bupdate\s+public\.pricing_observations\b/i.test(candidateStripped)) findings.push("pricing_observations_update_detected");
  if (/\balter\s+table\s+public\.pricing_observations\b/i.test(candidateStripped)) findings.push("pricing_observations_alter_detected");
  if (/\b(insert|update|alter\s+table)\s+public\.ebay_active_prices_latest\b/i.test(candidateStripped)) findings.push("ebay_latest_price_write_detected");
  if (/\bcreate\s+(materialized\s+)?view\b/i.test(candidateStripped)) findings.push("view_creation_detected");
  if (/\bdelete\s+from\b/i.test(candidateStripped)) findings.push("delete_detected");
  if (!/publishable\s+boolean\s+not\s+null\s+default\s+false/i.test(candidateStripped)) findings.push("publishable_default_false_missing");
  if (!/app_visible\s+boolean\s+not\s+null\s+default\s+false/i.test(candidateStripped)) findings.push("app_visible_default_false_missing");
  if (!/market_truth\s+boolean\s+not\s+null\s+default\s+false/i.test(candidateStripped)) findings.push("market_truth_default_false_missing");
  if (!/check\s*\(\s*publishable\s*=\s*false\s*\)/i.test(candidateStripped)) findings.push("publishable_false_check_missing");
  if (!/check\s*\(\s*app_visible\s*=\s*false\s*\)/i.test(candidateStripped)) findings.push("app_visible_false_check_missing");
  if (!/check\s*\(\s*market_truth\s*=\s*false\s*\)/i.test(candidateStripped)) findings.push("market_truth_false_check_missing");
  if (!/enable\s+row\s+level\s+security/i.test(candidateStripped)) findings.push("rls_enable_missing");
  if (!/to\s+service_role/i.test(candidateStripped)) findings.push("service_role_policy_missing");
  if (unexpectedMigrations.length > 0) findings.push("unexpected_rollup_migration_exists");
  if (expectedMigration && !expectedMigration.matches_candidate_sql) findings.push("expected_rollup_migration_hash_mismatch");

  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "contract_gate_no_writes",
    boundary: {
      db_writes: false,
      migration_created: false,
      migration_applied: false,
      provider_calls: false,
      source_fetches: false,
      pricing_observations_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      app_visible_pricing: false,
    },
    expected_migration_name: EXPECTED_MIGRATION_NAME,
    expected_migration_present: Boolean(expectedMigration),
    expected_migration_hash_sha256: expectedMigration?.sha256 ?? null,
    expected_migration_matches_candidate_sql: expectedMigration?.matches_candidate_sql ?? false,
    dry_run_sql_path: DRY_RUN_SQL,
    candidate_sql_path: CANDIDATE_SQL,
    contract_doc_path: CONTRACT_DOC,
    dry_run_sql_hash_sha256: packageFiles[0].sha256,
    candidate_sql_hash_sha256: packageFiles[1].sha256,
    contract_doc_hash_sha256: packageFiles[2].sha256,
    package_fingerprint_sha256: packageFingerprint,
    rollup_migration_count: rollupMigrations.length,
    rollup_migrations: rollupMigrationDetails,
    findings,
    ready_for_migration_file_candidate: findings.length === 0,
    package_files: packageFiles,
  };
}

function writeReport(report) {
  mkdirSync(path.join(ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_09d_market_reference_signal_rollup_contract_gate_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, [
    "# MEE-09D Market Reference Signal Rollup Contract Gate",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready: \`${report.ready_for_migration_file_candidate}\``,
    `- Candidate SQL hash: \`${report.candidate_sql_hash_sha256}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Rollup migration count: \`${report.rollup_migration_count}\``,
    `- Expected migration present: \`${report.expected_migration_present}\``,
    `- Expected migration matches candidate SQL: \`${report.expected_migration_matches_candidate_sql}\``,
    "",
    "## Boundary",
    "",
    "- No database writes.",
    "- No migration created.",
    "- No migration applied.",
    "- No provider calls.",
    "- No source fetches.",
    "- No pricing observations writes.",
    "- No public/app-visible pricing.",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Future Approval Prompt",
    "",
    "```text",
    `Approve real MARKET-REFERENCE-SIGNAL-ROLLUPS-V1 migration candidate apply only. Fingerprint: ${report.package_fingerprint_sha256}. SQL hash: ${report.candidate_sql_hash_sha256}. Scope: create one local Supabase migration file for internal-only market_reference_signal_rollups schema candidate, including table, indexes, RLS enablement, and service-role-only policy only. No remote migration apply. No rollup backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.`,
    "```",
    "",
  ].join("\n"));
  return { jsonPath: rel(jsonPath), mdPath: rel(mdPath) };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const report = buildMarketReferenceSignalRollupContractGateV1();
  const artifacts = writeReport(report);
  console.log(JSON.stringify({ ...report, artifacts }, null, 2));
  if (!report.ready_for_migration_file_candidate) process.exitCode = 1;
}
