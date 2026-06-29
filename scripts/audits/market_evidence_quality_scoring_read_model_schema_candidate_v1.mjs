import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-QUALITY-SCORING-READ-MODEL-SCHEMA-CANDIDATE-V1";
const MIGRATION_VERSION = "20260625110000";
const MIGRATION_FILE = `${MIGRATION_VERSION}_market_evidence_quality_scoring_read_model_v1.sql`;
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, "MEE_CORE_QUALITY_SCORING_READ_MODEL_SCHEMA_CANDIDATE_V1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const CONTRACT_DIR = path.join(REPO_ROOT, "docs", "contracts");
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");
const MIGRATION_DIR = path.join(REPO_ROOT, "supabase", "migrations");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function sha256Json(value) {
  return sha256Text(JSON.stringify(stable(value)));
}

function read(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function boundaryProof() {
  return {
    remote_migration_apply: false,
    db_writes: false,
    provider_calls: false,
    source_fetches: false,
    evidence_backfill: false,
    function_invocation: false,
    action_event_inserts: false,
    disposition_updates: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    vault_writes: false,
    image_storage_writes: false,
    deletes: false,
    upserts: false,
    merges: false,
    global_apply: false,
  };
}

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
mkdirSync(CONTRACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });
mkdirSync(MIGRATION_DIR, { recursive: true });

const sourceView = read("docs/sql/mee_core_quality_scoring_read_model_v1_view_candidate.sql")
  .replace(
    "create or replace view public.v_market_evidence_candidate_quality_scores_v1 as",
    "create or replace view public.v_market_evidence_candidate_quality_scores_v1\nwith (security_invoker = true)\nas",
  )
  .trim();

const migrationSql = `-- ${PACKAGE_ID} local migration candidate.
-- Purpose: internal-only quality scoring read model for candidate evidence review gates.
-- Boundary: local candidate only until explicitly approved for targeted remote schema apply.
-- No evidence backfill, provider calls, source fetches, public pricing, app-visible pricing,
-- pricing_observations writes, ebay_active_prices_latest writes, identity/vault/image writes,
-- deletes, merges, db push, or global apply.

begin;

${sourceView}

select
  '${PACKAGE_ID}'::text as package_id,
  'public.v_market_evidence_candidate_quality_scores_v1'::text as proposed_view,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth,
  true::boolean as internal_only,
  true::boolean as service_role_only;

commit;
`;

const rollbackDryRunSql = `-- ${PACKAGE_ID} rollback-only dry run.
-- This proves rollback shape only. Do not execute as an actual rollback without explicit rollback approval.

begin;

drop view if exists public.v_market_evidence_candidate_quality_scores_v1;

select
  '${PACKAGE_ID}_ROLLBACK_DRY_RUN'::text as package_id,
  'public.v_market_evidence_candidate_quality_scores_v1'::text as rollback_target,
  true::boolean as rollback_only,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as market_truth;

rollback;
`;

const readbackSql = `-- ${PACKAGE_ID} readback.
-- Run only after a separately approved targeted remote schema apply.

select
  '${PACKAGE_ID}_READBACK'::text as package_id,
  to_regclass('public.v_market_evidence_candidate_quality_scores_v1') is not null as view_exists,
  (
    select count(*)::int
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'v_market_evidence_candidate_quality_scores_v1'
      and grantee in ('PUBLIC', 'anon', 'authenticated')
  ) as public_or_client_grant_rows,
  (
    select count(*)::int
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'v_market_evidence_candidate_quality_scores_v1'
      and grantee = 'service_role'
      and privilege_type = 'SELECT'
  ) as service_role_select_grant_rows,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth;
`;

const migrationHash = sha256Text(migrationSql);
const rollbackHash = sha256Text(rollbackDryRunSql);
const readbackHash = sha256Text(readbackSql);
const reportBasis = {
  package_id: PACKAGE_ID,
  migration_version: MIGRATION_VERSION,
  proposed_objects: ["public.v_market_evidence_candidate_quality_scores_v1"],
  migration_hash_sha256: migrationHash,
  rollback_dry_run_sql_hash_sha256: rollbackHash,
  readback_sql_hash_sha256: readbackHash,
  findings: [],
};

const report = {
  ...reportBasis,
  generated_at: new Date().toISOString(),
  mode: "plan_only_local_schema_candidate",
  package_fingerprint_sha256: sha256Json(reportBasis),
  boundary_proof: boundaryProof(),
  approval_prompt: `Approve real MEE-CORE-QUALITY-SCORING-READ-MODEL-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY only. Migration hash: ${migrationHash}. Scope: execute supabase/migrations/${MIGRATION_FILE} against linked Supabase project ycdxbpibncqcchqiihfz only, creating internal-only service-role view public.v_market_evidence_candidate_quality_scores_v1. Then mark only migration version ${MIGRATION_VERSION} as applied in Supabase migration history. No evidence backfill. No provider calls. No source fetches. No function invocation. No action event inserts. No disposition updates. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image/storage writes. No deletes. No upserts. No merges. No db push. No global apply.`,
};

const markdown = `# ${PACKAGE_ID}

## Status

- Package fingerprint: \`${report.package_fingerprint_sha256}\`
- Migration hash: \`${migrationHash}\`
- Rollback dry-run hash: \`${rollbackHash}\`
- Readback hash: \`${readbackHash}\`
- Proposed object: \`public.v_market_evidence_candidate_quality_scores_v1\`

## Purpose

Install the quality scoring read model as an internal service-role-only view. This is the read layer that separates:

- low match confidence
- raw/slab lane mismatch
- hard exclusion flags
- manual-policy flags
- quality rollup eligibility

## Boundary

This package does not publish prices, write evidence, invoke actions, or run acquisition.

## Approval Prompt

\`\`\`text
${report.approval_prompt}
\`\`\`
`;

writeFileSync(path.join(SQL_DIR, "mee_core_quality_scoring_read_model_v1_migration_candidate.sql"), migrationSql);
writeFileSync(path.join(SQL_DIR, "mee_core_quality_scoring_read_model_v1_rollback_dry_run.sql"), rollbackDryRunSql);
writeFileSync(path.join(SQL_DIR, "mee_core_quality_scoring_read_model_v1_schema_readback.sql"), readbackSql);
writeFileSync(path.join(MIGRATION_DIR, MIGRATION_FILE), migrationSql);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, "MEE_CORE_QUALITY_SCORING_READ_MODEL_SCHEMA_CANDIDATE_V1.md"), markdown);
writeFileSync(path.join(CONTRACT_DIR, "MEE_CORE_QUALITY_SCORING_READ_MODEL_SCHEMA_CANDIDATE_V1.md"), markdown);
writeFileSync(path.join(PLAN_DIR, "MEE_CORE_QUALITY_SCORING_READ_MODEL_SCHEMA_CANDIDATE_V1.md"), markdown);
writeFileSync(path.join(CHECKPOINT_DIR, "MEE_CORE_QUALITY_SCORING_READ_MODEL_SCHEMA_CANDIDATE_V1.md"), markdown);

console.log(
  JSON.stringify(
    {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      migration_hash_sha256: migrationHash,
      rollback_dry_run_sql_hash_sha256: rollbackHash,
      readback_sql_hash_sha256: readbackHash,
      proposed_objects: report.proposed_objects,
      findings: report.findings,
      approval_prompt: report.approval_prompt,
    },
    null,
    2,
  ),
);
