import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const CANDIDATE_SQL = "docs/sql/market_reference_active_listing_warehouse_schema_v1_migration_candidate.sql";
const MIGRATION_SQL = "supabase/migrations/20260625020000_market_reference_active_listing_warehouse_schema_v1.sql";
const PLAN_DOC = "docs/plans/market_evidence_engine_v1/MEE_10A_ACTIVE_LISTING_WAREHOUSE_SCHEMA_V1.md";
const SOURCE_BACKFILL_PLAN_FINGERPRINT = "7c9daf3aa23a5c366a12cc60add9c079d1a3e106c083f854d4551df4be0c1be0";
const CANDIDATE_EVIDENCE_MANIFEST_HASH = "18a642c2731441f83dfcd2908e375af0ad3fd62211eb6ca6e8088cc7c4e4e168";

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function buildReport(generatedAt = new Date().toISOString()) {
  const candidateSql = read(CANDIDATE_SQL);
  const migrationSql = read(MIGRATION_SQL);
  const planDoc = read(PLAN_DOC);
  const stripped = stripSqlComments(candidateSql);
  const candidateSqlHash = sha256(candidateSql);
  const migrationSqlHash = sha256(migrationSql);
  const packageFiles = [
    { path: CANDIDATE_SQL, sha256: candidateSqlHash },
    { path: MIGRATION_SQL, sha256: migrationSqlHash },
    { path: PLAN_DOC, sha256: sha256(planDoc) },
  ];
  const packageFingerprint = sha256(JSON.stringify({
    package_id: "MARKET-REFERENCE-ACTIVE-LISTING-WAREHOUSE-SCHEMA-V1",
    source_backfill_plan_fingerprint: SOURCE_BACKFILL_PLAN_FINGERPRINT,
    candidate_evidence_manifest_hash: CANDIDATE_EVIDENCE_MANIFEST_HASH,
    package_files: packageFiles,
    boundary: {
      remote_migration_apply: false,
      evidence_backfill: false,
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
      price_rollups: false,
    },
  }));
  const findings = [];

  if (candidateSqlHash !== migrationSqlHash) findings.push("candidate_and_migration_hash_mismatch");
  if (!/(^|\n)\s*commit\s*;\s*$/i.test(stripped)) findings.push("candidate_missing_final_commit");
  if (/(^|\n)\s*rollback\s*;/i.test(stripped)) findings.push("candidate_contains_rollback");
  if (!/source\s+in\s*\(\s*'tcgcsv_reference'\s*,\s*'pokemontcg_io_reference'\s*,\s*'ebay_active'\s*\)/i.test(stripped)) findings.push("ebay_active_source_not_allowed");
  if (!/source\s*=\s*'ebay_active'\s+and\s+source_type\s*=\s*'active_listing'/i.test(stripped)) findings.push("ebay_active_source_type_pair_missing");
  if (/\binsert\s+into\b/i.test(stripped)) findings.push("insert_detected");
  if (/\bupdate\s+public\./i.test(stripped)) findings.push("public_update_detected");
  if (/\bdelete\s+from\b/i.test(stripped)) findings.push("delete_detected");
  if (/\bmerge\s+into\b/i.test(stripped)) findings.push("merge_detected");
  if (/\bpricing_observations\b/i.test(stripped)) findings.push("pricing_observations_reference_detected");
  if (/\bebay_active_prices_latest\b/i.test(stripped)) findings.push("ebay_latest_reference_detected");
  if (/\bcreate\s+(materialized\s+)?view\b/i.test(stripped)) findings.push("public_pricing_view_creation_detected");
  if (/\bto\s+(anon|authenticated|public)\b/i.test(stripped)) findings.push("non_service_role_policy_detected");

  return {
    package_id: "MARKET-REFERENCE-ACTIVE-LISTING-WAREHOUSE-SCHEMA-V1",
    generated_at: generatedAt,
    mode: "local_migration_candidate_only",
    ready: findings.length === 0,
    applied: false,
    source_backfill_plan_fingerprint_sha256: SOURCE_BACKFILL_PLAN_FINGERPRINT,
    candidate_evidence_manifest_hash_sha256: CANDIDATE_EVIDENCE_MANIFEST_HASH,
    package_fingerprint_sha256: packageFingerprint,
    migration_sql_hash_sha256: migrationSqlHash,
    candidate_sql_hash_sha256: candidateSqlHash,
    candidate_sql_path: CANDIDATE_SQL,
    migration_sql_path: MIGRATION_SQL,
    plan_doc_path: PLAN_DOC,
    proposed_changes: {
      table_count: 0,
      index_count: 0,
      new_policy_count: 0,
      altered_constraint_tables: [
        "market_reference_raw_snapshots",
        "market_reference_candidates",
      ],
      allowed_sources_added: ["ebay_active"],
      allowed_source_types_added: ["active_listing"],
      service_role_only_policies_preserved: true,
      candidate_review_gate_preserved: true,
      candidate_direct_publish_block_preserved: true,
    },
    boundary: {
      remote_migration_apply: false,
      evidence_backfill: false,
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      merges: false,
      global_apply: false,
    },
    findings,
    package_files: packageFiles,
  };
}

function nextPrompt(report) {
  return `Approve real MARKET-REFERENCE-ACTIVE-LISTING-WAREHOUSE-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY only. Migration hash: ${report.migration_sql_hash_sha256}. Package fingerprint: ${report.package_fingerprint_sha256}. Source backfill plan fingerprint: ${report.source_backfill_plan_fingerprint_sha256}. Scope: execute ${report.migration_sql_path} against linked Supabase project ycdxbpibncqcchqiihfz only, extending internal market_reference_* warehouse constraints for reviewed ebay_active active-listing evidence. Then mark only migration version 20260625020000 as applied in Supabase migration history. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No db push. No global apply.`;
}

function renderMarkdown(report) {
  return [
    "# MEE-10A Active Listing Warehouse Schema Candidate",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready: \`${report.ready}\``,
    `- Applied: \`${report.applied}\``,
    `- Migration hash: \`${report.migration_sql_hash_sha256}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Source backfill plan fingerprint: \`${report.source_backfill_plan_fingerprint_sha256}\``,
    `- Migration path: \`${report.migration_sql_path}\``,
    "",
    "## Scope",
    "",
    "- Constraint-only extension for internal warehouse evidence.",
    "- Allows `ebay_active` / `active_listing` candidates.",
    "- Preserves review gate and no-direct-publish constraints.",
    "- Preserves existing service-role-only RLS policies.",
    "- No remote migration apply in this step.",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Approval Prompt",
    "",
    "```text",
    nextPrompt(report),
    "```",
    "",
  ].join("\n");
}

const report = buildReport();
mkdirSync(path.join(ROOT, AUDIT_DIR), { recursive: true });
const base = `mee_10a_active_listing_warehouse_schema_${report.generated_at.replace(/[:.]/g, "-")}`;
const jsonPath = path.join(ROOT, AUDIT_DIR, `${base}.json`);
const mdPath = path.join(ROOT, AUDIT_DIR, `${base}.md`);
const output = {
  ...report,
  approval_required_for_next_step: true,
  approval_prompt_for_next_step: nextPrompt(report),
};
writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(output));

console.log(JSON.stringify({
  package_id: output.package_id,
  ready: output.ready,
  applied: output.applied,
  migration_sql_hash_sha256: output.migration_sql_hash_sha256,
  package_fingerprint_sha256: output.package_fingerprint_sha256,
  findings: output.findings,
  artifacts: {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
  },
  approval_prompt_for_next_step: output.approval_prompt_for_next_step,
}, null, 2));

if (!output.ready) process.exitCode = 1;
