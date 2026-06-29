import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_ID = "MARKET-REFERENCE-TCGDEX-PRICING-SOURCE-CONSTRAINTS-V1";

const ROOT = process.cwd();
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const CANDIDATE_SQL = "docs/sql/market_reference_tcgdex_pricing_source_constraints_v1_migration_candidate.sql";
const MIGRATION_SQL = "supabase/migrations/20260625130000_market_reference_tcgdex_pricing_source_constraints_v1.sql";
const SOURCE_AUDIT_FINGERPRINT = "da6b070aef331e3b3e193e841038232b58031f2ef31fe38790119cd2bf8ba899";
const BACKFILL_PLAN_FINGERPRINT = "60ed28faf7ed421344fe4637e421d0b1e7029a563fc8ee1d46caede95e0aa4c9";

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

export function buildTcgdexPricingSourceConstraintsReportV1(generatedAt = new Date().toISOString()) {
  const candidateSql = read(CANDIDATE_SQL);
  const migrationSql = read(MIGRATION_SQL);
  const stripped = stripSqlComments(candidateSql);
  const candidateSqlHash = sha256(candidateSql);
  const migrationSqlHash = sha256(migrationSql);
  const packageFiles = [
    { path: CANDIDATE_SQL, sha256: candidateSqlHash },
    { path: MIGRATION_SQL, sha256: migrationSqlHash },
  ];
  const findings = [];

  if (candidateSqlHash !== migrationSqlHash) findings.push("candidate_and_migration_hash_mismatch");
  if (!/(^|\n)\s*begin\s*;\s*/i.test(stripped)) findings.push("candidate_missing_begin");
  if (!/(^|\n)\s*commit\s*;\s*$/i.test(stripped)) findings.push("candidate_missing_final_commit");
  if (/(^|\n)\s*rollback\s*;/i.test(stripped)) findings.push("candidate_contains_rollback");
  if (!/tcgdex_tcgplayer_reference/i.test(stripped)) findings.push("tcgdex_tcgplayer_reference_missing");
  if (!/tcgdex_cardmarket_reference/i.test(stripped)) findings.push("tcgdex_cardmarket_reference_missing");
  if (!/source_type\s*=\s*'reference'/i.test(stripped)) findings.push("reference_source_type_gate_missing");
  if (!/source\s*=\s*'ebay_active'\s+and\s+source_type\s*=\s*'active_listing'/i.test(stripped)) findings.push("ebay_active_source_type_pair_missing");
  if (!/model_disposition\s+in\s*\([^)]*reference_model_candidate/i.test(stripped)) findings.push("reference_disposition_gate_missing");
  if (!/source\s*<>\s*'ebay_active'\s+or\s+model_eligible\s*=\s*false/i.test(stripped)) findings.push("active_listing_review_only_gate_missing");
  if (/\binsert\s+into\b/i.test(stripped)) findings.push("insert_detected");
  if (/\bupdate\s+public\./i.test(stripped)) findings.push("public_update_detected");
  if (/\bdelete\s+from\b/i.test(stripped)) findings.push("delete_detected");
  if (/\bmerge\s+into\b/i.test(stripped)) findings.push("merge_detected");
  if (/\bpricing_observations\b/i.test(stripped)) findings.push("pricing_observations_reference_detected");
  if (/\bebay_active_prices_latest\b/i.test(stripped)) findings.push("ebay_latest_reference_detected");
  if (/\bcreate\s+(materialized\s+)?view\b/i.test(stripped)) findings.push("view_creation_detected");
  if (/\bto\s+(anon|authenticated|public)\b/i.test(stripped)) findings.push("non_service_role_policy_detected");

  const packageFingerprint = sha256(JSON.stringify({
    package_id: PACKAGE_ID,
    source_audit_fingerprint: SOURCE_AUDIT_FINGERPRINT,
    backfill_plan_fingerprint: BACKFILL_PLAN_FINGERPRINT,
    package_files: packageFiles,
    proposed_changes: {
      altered_constraint_tables: [
        "market_reference_candidates",
        "market_reference_normalized_evidence",
      ],
      allowed_sources_added: [
        "tcgdex_tcgplayer_reference",
        "tcgdex_cardmarket_reference",
      ],
    },
    boundary: {
      evidence_backfill: false,
      provider_calls: false,
      source_fetches: false,
      public_pricing: false,
      app_visible_pricing: false,
      public_price_rollups: false,
    },
  }));

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "local_migration_candidate_only",
    ready: findings.length === 0,
    applied: false,
    source_audit_fingerprint_sha256: SOURCE_AUDIT_FINGERPRINT,
    backfill_plan_fingerprint_sha256: BACKFILL_PLAN_FINGERPRINT,
    package_fingerprint_sha256: packageFingerprint,
    migration_sql_hash_sha256: migrationSqlHash,
    candidate_sql_hash_sha256: candidateSqlHash,
    candidate_sql_path: CANDIDATE_SQL,
    migration_sql_path: MIGRATION_SQL,
    proposed_changes: {
      table_count: 0,
      index_count: 0,
      new_policy_count: 0,
      altered_constraint_tables: [
        "market_reference_candidates",
        "market_reference_normalized_evidence",
      ],
      allowed_sources_added: [
        "tcgdex_tcgplayer_reference",
        "tcgdex_cardmarket_reference",
      ],
      service_role_only_policies_preserved: true,
      candidate_review_gate_preserved: true,
      candidate_direct_publish_block_preserved: true,
      active_listing_model_eligible_block_preserved: true,
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
      card_print_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      upserts: false,
      merges: false,
      global_apply: false,
    },
    findings,
    package_files: packageFiles,
  };
  report.approval_prompt_for_next_step = nextPrompt(report);
  return report;
}

function nextPrompt(report) {
  return `Approve real MARKET-REFERENCE-TCGDEX-PRICING-SOURCE-CONSTRAINTS-V1 TARGETED-REMOTE-SCHEMA-APPLY only. Migration hash: ${report.migration_sql_hash_sha256}. Package fingerprint: ${report.package_fingerprint_sha256}. Source audit fingerprint: ${report.source_audit_fingerprint_sha256}. Backfill plan fingerprint: ${report.backfill_plan_fingerprint_sha256}. Scope: execute ${report.migration_sql_path} against linked Supabase project ycdxbpibncqcchqiihfz only, extending internal market_reference_candidates and market_reference_normalized_evidence constraints to allow TCGdex TCGPlayer/Cardmarket reference evidence sources. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No deletes. No upserts. No merges. No db push. No global apply.`;
}

function renderMarkdown(report) {
  return [
    "# MEE TCGdex Pricing Source Constraints V1",
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
    "- Constraint-only extension for internal reference evidence.",
    "- Allows `tcgdex_tcgplayer_reference` and `tcgdex_cardmarket_reference`.",
    "- Preserves review-only candidates and no direct public publishing.",
    "- Does not insert TCGdex evidence.",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Approval Prompt",
    "",
    "```text",
    report.approval_prompt_for_next_step,
    "```",
    "",
  ].join("\n");
}

function main() {
  const report = buildTcgdexPricingSourceConstraintsReportV1();
  mkdirSync(path.join(ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_tcgdex_reference_pricing_source_constraints_${report.generated_at.replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    ready: report.ready,
    applied: report.applied,
    migration_sql_hash_sha256: report.migration_sql_hash_sha256,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    findings: report.findings,
    artifacts: {
      jsonPath: rel(jsonPath),
      mdPath: rel(mdPath),
    },
    approval_prompt_for_next_step: report.approval_prompt_for_next_step,
  }, null, 2));

  if (!report.ready) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
