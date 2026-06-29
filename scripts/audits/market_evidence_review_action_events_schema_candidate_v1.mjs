import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-ACTION-EVENTS-SCHEMA-CANDIDATE-V1";
const MIGRATION_VERSION = "20260625090000";
const MIGRATION_FILE = `${MIGRATION_VERSION}_market_evidence_review_action_events_v1.sql`;
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const MIGRATION_DIR = path.join(REPO_ROOT, "supabase", "migrations");

const workflowReport = JSON.parse(
  readFileSync(
    path.join(AUDIT_DIR, "MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1", "report.json"),
    "utf8",
  ),
);

const actions = workflowReport.action_contract.actions;
const reasonCodes = workflowReport.action_contract.reason_codes;

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
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256Text(JSON.stringify(stable(value)));
}

function sqlList(values) {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(",\n      ");
}

const actionNames = actions.map((action) => action.action);
const statusValues = ["pending", "in_review", "resolved", "blocked", "superseded"];
const dispositionValues = [
  "review_pending_high_signal",
  "review_pending_candidate",
  "review_pending_classification_fix",
  "review_pending_reference_only",
  "monitor_only",
  "review_confirmed_internal_candidate",
  "review_split_required",
  "review_blocked",
  "review_defer_more_evidence",
  "review_reclassify",
  "review_blocked_classification",
  "review_reference_crosscheck",
  "review_defer_active_market_evidence",
];
const reviewLaneValues = [
  "high_signal_review",
  "candidate_review",
  "classification_review",
  "reference_only_review",
  "low_signal_monitor",
];
const evidenceLaneValues = [
  "raw_single",
  "slab",
  "reference_metric",
  "mixed_raw_slab",
  "classification_blocked",
  "low_signal",
  "unknown",
];

const migrationSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1 local migration candidate.
-- Purpose: append-only internal Market Evidence Engine review action event tracking.
-- Boundary: local candidate only until explicitly approved for targeted remote schema apply.
-- No evidence backfill, provider calls, source fetches, disposition updates, public pricing views,
-- app-visible pricing, public price rollups, identity writes, vault writes, image/storage writes,
-- deletes, upserts, merges, or global apply.

begin;

create table if not exists public.market_evidence_review_action_events (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null default 'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_V1',
  workflow_version text not null default 'MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1',
  disposition_id uuid not null references public.market_evidence_review_dispositions(id),
  card_print_id uuid not null,
  gv_id text,
  action_name text not null,
  from_status text not null,
  to_status text not null,
  from_disposition text not null,
  to_disposition text not null,
  review_lane text not null,
  evidence_lane text not null,
  reason_code text,
  review_note text,
  action_payload jsonb not null default '{}'::jsonb,
  review_actor text not null,
  expected_disposition_updated_at timestamptz not null,
  publication_gate_candidate boolean not null default false,
  can_publish_price_directly boolean not null default false,
  publishable boolean not null default false,
  app_visible boolean not null default false,
  market_truth boolean not null default false,
  created_at timestamptz not null default now(),
  constraint market_evidence_review_action_events_action_check check (
    action_name in (
      ${sqlList(actionNames)}
    )
  ),
  constraint market_evidence_review_action_events_reason_check check (
    reason_code is null
    or reason_code in (
      ${sqlList(reasonCodes)}
    )
  ),
  constraint market_evidence_review_action_events_from_status_check check (
    from_status in (
      ${sqlList(statusValues)}
    )
  ),
  constraint market_evidence_review_action_events_to_status_check check (
    to_status in (
      ${sqlList(statusValues)}
    )
  ),
  constraint market_evidence_review_action_events_from_disposition_check check (
    from_disposition in (
      ${sqlList(dispositionValues)}
    )
  ),
  constraint market_evidence_review_action_events_to_disposition_check check (
    to_disposition in (
      ${sqlList(dispositionValues)}
    )
  ),
  constraint market_evidence_review_action_events_review_lane_check check (
    review_lane in (
      ${sqlList(reviewLaneValues)}
    )
  ),
  constraint market_evidence_review_action_events_evidence_lane_check check (
    evidence_lane in (
      ${sqlList(evidenceLaneValues)}
    )
  ),
  constraint market_evidence_review_action_events_reason_required_check check (
    action_name in ('start_review', 'confirm_monitor_only')
    or reason_code is not null
  ),
  constraint market_evidence_review_action_events_transition_check check (
    (
      action_name = 'start_review'
      and from_status = 'pending'
      and to_status = 'in_review'
      and review_lane in ('high_signal_review', 'candidate_review', 'classification_review', 'reference_only_review')
      and to_disposition = from_disposition
    )
    or (
      action_name = 'confirm_internal_candidate'
      and from_status in ('pending', 'in_review')
      and to_status = 'resolved'
      and to_disposition = 'review_confirmed_internal_candidate'
      and review_lane in ('high_signal_review', 'candidate_review')
      and evidence_lane in ('raw_single', 'slab')
    )
    or (
      action_name = 'require_split'
      and from_status in ('pending', 'in_review')
      and to_status = 'blocked'
      and to_disposition = 'review_split_required'
      and evidence_lane = 'mixed_raw_slab'
    )
    or (
      action_name = 'block_evidence'
      and from_status in ('pending', 'in_review')
      and to_status = 'blocked'
      and to_disposition = 'review_blocked'
      and review_lane in ('high_signal_review', 'candidate_review', 'reference_only_review', 'low_signal_monitor')
    )
    or (
      action_name = 'block_classification'
      and from_status in ('pending', 'in_review')
      and to_status = 'blocked'
      and to_disposition = 'review_blocked_classification'
      and review_lane = 'classification_review'
      and evidence_lane = 'classification_blocked'
    )
    or (
      action_name = 'request_reclassification'
      and from_status in ('pending', 'in_review')
      and to_status = 'blocked'
      and to_disposition = 'review_reclassify'
      and review_lane = 'classification_review'
    )
    or (
      action_name = 'defer_more_evidence'
      and from_status in ('pending', 'in_review')
      and to_status = 'resolved'
      and to_disposition = 'review_defer_more_evidence'
      and review_lane in ('high_signal_review', 'candidate_review', 'classification_review', 'low_signal_monitor')
    )
    or (
      action_name = 'reference_crosscheck'
      and from_status in ('pending', 'in_review')
      and to_status = 'resolved'
      and to_disposition = 'review_reference_crosscheck'
      and review_lane = 'reference_only_review'
      and evidence_lane = 'reference_metric'
    )
    or (
      action_name = 'defer_active_market_evidence'
      and from_status in ('pending', 'in_review')
      and to_status = 'resolved'
      and to_disposition = 'review_defer_active_market_evidence'
      and review_lane = 'reference_only_review'
      and evidence_lane = 'reference_metric'
    )
    or (
      action_name = 'confirm_monitor_only'
      and from_status in ('pending', 'in_review', 'resolved')
      and to_status = 'resolved'
      and to_disposition = 'monitor_only'
      and review_lane = 'low_signal_monitor'
    )
  ),
  constraint market_evidence_review_action_events_no_public_direct_check check (
    publication_gate_candidate = false
    and can_publish_price_directly = false
    and publishable = false
    and app_visible = false
    and market_truth = false
  )
);

create index if not exists market_evidence_review_action_events_disposition_idx
  on public.market_evidence_review_action_events (disposition_id, created_at desc);

create index if not exists market_evidence_review_action_events_card_idx
  on public.market_evidence_review_action_events (card_print_id, created_at desc);

create index if not exists market_evidence_review_action_events_action_idx
  on public.market_evidence_review_action_events (action_name, created_at desc);

create index if not exists market_evidence_review_action_events_actor_idx
  on public.market_evidence_review_action_events (review_actor, created_at desc);

alter table public.market_evidence_review_action_events enable row level security;

drop policy if exists market_evidence_review_action_events_service_role_select
  on public.market_evidence_review_action_events;
drop policy if exists market_evidence_review_action_events_service_role_insert
  on public.market_evidence_review_action_events;

create policy market_evidence_review_action_events_service_role_select
  on public.market_evidence_review_action_events
  for select
  to service_role
  using (true);

create policy market_evidence_review_action_events_service_role_insert
  on public.market_evidence_review_action_events
  for insert
  to service_role
  with check (true);

revoke all on public.market_evidence_review_action_events from public, anon, authenticated;
grant select, insert on public.market_evidence_review_action_events to service_role;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1'::text as package_id,
  1::int as proposed_table_count,
  4::int as proposed_index_count,
  2::int as proposed_service_role_policy_count,
  true::boolean as append_only_from_service_api,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth,
  true::boolean as internal_only,
  true::boolean as service_role_only;

commit;
`;

const rollbackDryRunSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1 rollback-only dry-run proof.
-- This file intentionally rolls back and must not be used as an apply file.

begin;

drop table if exists public.market_evidence_review_action_events;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1_ROLLBACK_DRY_RUN'::text as package_id,
  true::boolean as rollback_only,
  false::boolean as persisted_change,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth;

rollback;
`;

const readbackSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1 readback SQL.
-- Intended for use only after a separately approved targeted remote schema apply.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1_TABLE_READBACK'::text as package_id,
  count(*) filter (where table_name = 'market_evidence_review_action_events')::int as table_count
from information_schema.tables
where table_schema = 'public'
  and table_name = 'market_evidence_review_action_events';

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1_COLUMN_READBACK'::text as package_id,
  count(*)::int as column_count
from information_schema.columns
where table_schema = 'public'
  and table_name = 'market_evidence_review_action_events';

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1_GRANT_READBACK'::text as package_id,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'market_evidence_review_action_events'
order by grantee, privilege_type;
`;

const migrationHash = sha256Text(migrationSql);
const rollbackHash = sha256Text(rollbackDryRunSql);
const readbackHash = sha256Text(readbackSql);
const reportPayload = {
  source_workflow_package_id: workflowReport.package_id,
  source_workflow_fingerprint: workflowReport.package_fingerprint_sha256,
  migration_file: `supabase/migrations/${MIGRATION_FILE}`,
  action_names: actionNames,
  reason_codes: reasonCodes,
  proposed_table_count: 1,
  proposed_index_count: 4,
  proposed_policy_count: 2,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_internal_review_action_events_schema_candidate",
  package_fingerprint_sha256: sha256Json(reportPayload),
  source_workflow: {
    package_id: workflowReport.package_id,
    fingerprint_sha256: workflowReport.package_fingerprint_sha256,
    contract_hash_sha256: workflowReport.hashes.contract_md_sha256,
  },
  schema_candidate: {
    migration_file: `supabase/migrations/${MIGRATION_FILE}`,
    table_name: "public.market_evidence_review_action_events",
    proposed_table_count: 1,
    proposed_index_count: 4,
    proposed_service_role_policy_count: 2,
    allowed_actions: actionNames,
    allowed_reason_codes: reasonCodes,
    grants: ["service_role: select", "service_role: insert"],
    no_update_grant: true,
    no_delete_grant: true,
  },
  hashes: {
    migration_sql_sha256: migrationHash,
    rollback_dry_run_sql_sha256: rollbackHash,
    readback_sql_sha256: readbackHash,
  },
  artifacts: {
    migration_candidate: `supabase/migrations/${MIGRATION_FILE}`,
    sql_candidate: "docs/sql/mee_core_internal_review_action_events_v1_migration_candidate.sql",
    rollback_dry_run_sql: "docs/sql/mee_core_internal_review_action_events_v1_rollback_dry_run.sql",
    readback_sql: "docs/sql/mee_core_internal_review_action_events_v1_readback.sql",
    report_json: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}/report.json`,
    report_md: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}.md`,
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1.md",
  },
  findings: [],
  boundary_proof: {
    remote_migration_apply: false,
    db_writes: false,
    provider_calls: false,
    source_fetches: false,
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
  },
};

function renderMarkdown(value) {
  return [
    "# MEE Core Internal Review Action Events Schema Candidate V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: plan only, local artifacts only",
    "",
    "## Summary",
    "",
    `- Package: \`${value.package_id}\``,
    `- Fingerprint: \`${value.package_fingerprint_sha256}\``,
    `- Source workflow: \`${value.source_workflow.package_id}\``,
    `- Migration hash: \`${value.hashes.migration_sql_sha256}\``,
    `- Proposed table: \`${value.schema_candidate.table_name}\``,
    `- Proposed indexes: ${value.schema_candidate.proposed_index_count}`,
    `- Proposed policies: ${value.schema_candidate.proposed_service_role_policy_count}`,
    "",
    "## Allowed Actions",
    "",
    ...value.schema_candidate.allowed_actions.map((action) => `- \`${action}\``),
    "",
    "## Boundary",
    "",
    "No remote migration apply, DB writes, provider calls, source fetches, disposition updates, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, deletes, upserts, merges, or global apply.",
    "",
  ].join("\n");
}

const planMd = `# MEE Core Internal Review Action Events Schema Candidate V1

Status: plan only

## Objective

Create a local migration candidate for append-only internal review action event tracking.

## Proposed Objects

- Table: \`market_evidence_review_action_events\`
- Indexes: 4
- Policies: service-role select and insert only

## Why This Exists

The current review disposition row represents current state. The action events table records the auditable history of how a reviewer or system moved that row through the internal workflow.

## Next Step After This Plan

Request targeted remote schema apply only, using the migration hash in the report.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
mkdirSync(MIGRATION_DIR, { recursive: true });

writeFileSync(path.join(MIGRATION_DIR, MIGRATION_FILE), migrationSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_events_v1_migration_candidate.sql"), migrationSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_events_v1_rollback_dry_run.sql"), rollbackDryRunSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_events_v1_readback.sql"), readbackSql);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), renderMarkdown(report));
writeFileSync(path.join(PLAN_DIR, "MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1.md"), planMd);

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      findings: report.findings,
      schema_candidate: report.schema_candidate,
      hashes: report.hashes,
      artifacts: report.artifacts,
    },
    null,
    2,
  ),
);
