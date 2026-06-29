import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const CANDIDATE_SQL = "docs/sql/market_listing_warehouse_v1_migration_candidate.sql";
const MIGRATION_SQL = "supabase/migrations/20260625050000_market_listing_warehouse_v1.sql";
const CONTRACT_DOC = "docs/plans/market_evidence_engine_v1/MEE_11A_MARKET_LISTING_WAREHOUSE_CONTRACT_V1.md";
const PLAN_DOC = "docs/plans/market_evidence_engine_v1/MEE_11B_MARKET_LISTING_WAREHOUSE_SCHEMA_V1.md";

const REQUIRED_TABLES = [
  "market_listing_acquisition_runs",
  "market_listing_query_cache",
  "market_listing_raw_snapshots",
  "market_listing_observations",
  "market_listing_seller_snapshots",
  "market_listing_card_candidates",
  "market_listing_price_events",
  "market_listing_rollups",
];

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

function includesPattern(text, pattern) {
  return pattern.test(text);
}

function buildReport(generatedAt = new Date().toISOString()) {
  const candidateSql = read(CANDIDATE_SQL);
  const migrationSql = read(MIGRATION_SQL);
  const contractDoc = read(CONTRACT_DOC);
  const planDoc = read(PLAN_DOC);
  const stripped = stripSqlComments(candidateSql);
  const candidateSqlHash = sha256(candidateSql);
  const migrationSqlHash = sha256(migrationSql);
  const packageFiles = [
    { path: CANDIDATE_SQL, sha256: candidateSqlHash },
    { path: MIGRATION_SQL, sha256: migrationSqlHash },
    { path: CONTRACT_DOC, sha256: sha256(contractDoc) },
    { path: PLAN_DOC, sha256: sha256(planDoc) },
  ];
  const packageFingerprint = sha256(JSON.stringify({
    package_id: "MARKET-LISTING-WAREHOUSE-SCHEMA-V1",
    package_files: packageFiles,
    boundary: {
      remote_migration_apply: false,
      provider_calls: false,
      source_fetches: false,
      evidence_backfill: false,
      public_price_publication: false,
      app_visible_pricing: false,
      identity_writes: false,
      vault_writes: false,
      image_writes: false,
    },
  }));
  const findings = [];

  if (candidateSqlHash !== migrationSqlHash) findings.push("candidate_and_migration_hash_mismatch");
  if (!includesPattern(stripped, /(^|\n)\s*commit\s*;\s*$/i)) findings.push("candidate_missing_final_commit");
  if (includesPattern(stripped, /(^|\n)\s*rollback\s*;/i)) findings.push("candidate_contains_rollback");

  for (const tableName of REQUIRED_TABLES) {
    if (!includesPattern(stripped, new RegExp(`create\\s+table\\s+public\\.${tableName}\\b`, "i"))) {
      findings.push(`missing_table_${tableName}`);
    }
    if (!includesPattern(stripped, new RegExp(`alter\\s+table\\s+public\\.${tableName}\\s+enable\\s+row\\s+level\\s+security`, "i"))) {
      findings.push(`missing_rls_${tableName}`);
    }
    if (!includesPattern(stripped, new RegExp(`create\\s+policy\\s+${tableName}_service_role_all`, "i"))) {
      findings.push(`missing_service_role_policy_${tableName}`);
    }
  }

  if (!includesPattern(stripped, /source\s+in\s*\(\s*'ebay_active'\s*\)/i)) findings.push("missing_ebay_active_source_check");
  if (!includesPattern(stripped, /provider_route\s+in\s*\(\s*'ebay_browse_api'\s*\)/i)) findings.push("missing_ebay_browse_api_provider_route_check");
  if (!includesPattern(stripped, /market_listing_card_candidates_needs_review_check\s+check\s*\(\s*needs_review\s*=\s*true\s*\)/i)) findings.push("missing_candidate_review_gate");
  if (!includesPattern(stripped, /market_listing_card_candidates_no_direct_publish_check\s+check\s*\(\s*can_publish_price_directly\s*=\s*false\s*\)/i)) findings.push("missing_candidate_no_direct_publish_gate");
  if (!includesPattern(stripped, /market_listing_rollups_internal_only_check\s+check\s*\([\s\S]*needs_review\s*=\s*true[\s\S]*publishable\s*=\s*false[\s\S]*app_visible\s*=\s*false[\s\S]*market_truth\s*=\s*false[\s\S]*\)/i)) findings.push("missing_rollup_internal_only_gate");

  if (includesPattern(stripped, /\binsert\s+into\b/i)) findings.push("insert_detected");
  if (includesPattern(stripped, /\bupdate\s+public\./i)) findings.push("public_update_detected");
  if (includesPattern(stripped, /\bdelete\s+from\b/i)) findings.push("delete_detected");
  if (includesPattern(stripped, /\bmerge\s+into\b/i)) findings.push("merge_detected");
  if (includesPattern(stripped, /\bpricing_observations\b/i)) findings.push("pricing_observations_reference_detected");
  if (includesPattern(stripped, /\bebay_active_prices_latest\b/i)) findings.push("ebay_latest_reference_detected");
  if (includesPattern(stripped, /\bjusttcg\b/i)) findings.push("justtcg_reference_detected");
  if (includesPattern(stripped, /\bcreate\s+(materialized\s+)?view\b/i)) findings.push("view_creation_detected");
  if (includesPattern(stripped, /\bto\s+(anon|authenticated|public)\b/i)) findings.push("non_service_role_policy_detected");

  return {
    package_id: "MARKET-LISTING-WAREHOUSE-SCHEMA-V1",
    generated_at: generatedAt,
    mode: "local_migration_candidate_only",
    ready: findings.length === 0,
    applied: false,
    package_fingerprint_sha256: packageFingerprint,
    migration_sql_hash_sha256: migrationSqlHash,
    candidate_sql_hash_sha256: candidateSqlHash,
    candidate_sql_path: CANDIDATE_SQL,
    migration_sql_path: MIGRATION_SQL,
    contract_doc_path: CONTRACT_DOC,
    plan_doc_path: PLAN_DOC,
    proposed_changes: {
      table_count: 8,
      index_count: 15,
      service_role_policy_count: 8,
      source: "ebay_active",
      provider_route: "ebay_browse_api",
      tables: REQUIRED_TABLES,
    },
    boundary: {
      remote_migration_apply: false,
      evidence_backfill: false,
      provider_calls: false,
      source_fetches: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
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
  return `Approve real MARKET-LISTING-WAREHOUSE-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY only. Migration hash: ${report.migration_sql_hash_sha256}. Package fingerprint: ${report.package_fingerprint_sha256}. Scope: execute ${report.migration_sql_path} against linked Supabase project ycdxbpibncqcchqiihfz only, creating 8 internal-only market_listing_* warehouse tables, 15 supporting indexes, RLS enablement, and service-role-only policies for ebay_active asking-price evidence. Then mark only migration version 20260625050000 as applied in Supabase migration history. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No db push. No global apply.`;
}

function renderMarkdown(report) {
  return [
    "# MEE-11B Market Listing Warehouse Schema Candidate",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready: \`${report.ready}\``,
    `- Applied: \`${report.applied}\``,
    `- Migration hash: \`${report.migration_sql_hash_sha256}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Migration path: \`${report.migration_sql_path}\``,
    "",
    "## Scope",
    "",
    "- Creates internal-only `market_listing_*` warehouse tables.",
    "- Stores eBay active listing asking-price evidence.",
    "- Keeps candidates and rollups review-only.",
    "- Adds service-role-only RLS policies.",
    "- No remote migration apply in this step.",
    "",
    "## Proposed Tables",
    "",
    ...report.proposed_changes.tables.map((tableName) => `- \`${tableName}\``),
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
const base = `mee_11b_market_listing_warehouse_schema_${report.generated_at.replace(/[:.]/g, "-")}`;
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
