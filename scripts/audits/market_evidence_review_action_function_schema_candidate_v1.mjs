import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-SCHEMA-CANDIDATE-V1";
const MIGRATION_VERSION = "20260625100000";
const MIGRATION_FILE = `${MIGRATION_VERSION}_market_evidence_review_action_function_v1.sql`;
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const MIGRATION_DIR = path.join(REPO_ROOT, "supabase", "migrations");

const workflowReport = JSON.parse(
  readFileSync(path.join(AUDIT_DIR, "MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1", "report.json"), "utf8"),
);
const actionEventsReport = JSON.parse(
  readFileSync(path.join(AUDIT_DIR, "MEE-CORE-INTERNAL-REVIEW-ACTION-EVENTS-SCHEMA-CANDIDATE-V1", "report.json"), "utf8"),
);

const actionNames = workflowReport.action_contract.actions.map((action) => action.action);
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

const migrationSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1 local migration candidate.
-- Purpose: service-role-only Market Evidence Engine review action apply function.
-- Boundary: local candidate only until explicitly approved for targeted remote schema apply.
-- The function may write only when later invoked: one action event insert and one matching
-- review disposition update under optimistic locking. This candidate does not invoke it.

begin;

create or replace function public.apply_market_evidence_review_action_v1(
  p_disposition_id uuid,
  p_expected_updated_at timestamptz,
  p_action_name text,
  p_review_actor text,
  p_reason_code text default null,
  p_review_note text default null,
  p_action_payload jsonb default '{}'::jsonb
)
returns table (
  action_event_id uuid,
  disposition_id uuid,
  card_print_id uuid,
  action_name text,
  from_status text,
  to_status text,
  from_disposition text,
  to_disposition text,
  review_actor text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.market_evidence_review_dispositions%rowtype;
  v_to_status text;
  v_to_disposition text;
  v_event_id uuid;
  v_action_payload jsonb := coalesce(p_action_payload, '{}'::jsonb);
begin
  if p_disposition_id is null then
    raise exception 'disposition_id_required' using errcode = '22023';
  end if;

  if p_expected_updated_at is null then
    raise exception 'expected_updated_at_required' using errcode = '22023';
  end if;

  if p_review_actor is null or btrim(p_review_actor) = '' then
    raise exception 'review_actor_required' using errcode = '22023';
  end if;

  if p_action_name not in (
    'start_review',
    'confirm_internal_candidate',
    'require_split',
    'block_evidence',
    'block_classification',
    'request_reclassification',
    'defer_more_evidence',
    'reference_crosscheck',
    'defer_active_market_evidence',
    'confirm_monitor_only'
  ) then
    raise exception 'invalid_review_action: %', p_action_name using errcode = '22023';
  end if;

  if p_reason_code is not null and p_reason_code not in (
    'approved_internal_raw_single_signal',
    'approved_internal_slab_signal',
    'mixed_raw_slab_requires_split',
    'classification_noise',
    'wrong_identity',
    'unresolved_match_ambiguity',
    'lot_bulk_sealed_proxy_noise',
    'reference_only_no_market_support',
    'low_signal_sample',
    'insufficient_source_independence',
    'stale_signal',
    'special_lane_ambiguous',
    'manual_hold'
  ) then
    raise exception 'invalid_review_reason_code: %', p_reason_code using errcode = '22023';
  end if;

  if p_action_name not in ('start_review', 'confirm_monitor_only') and p_reason_code is null then
    raise exception 'reason_code_required_for_action: %', p_action_name using errcode = '22023';
  end if;

  select *
    into v_row
  from public.market_evidence_review_dispositions
  where id = p_disposition_id
  for update;

  if not found then
    raise exception 'review_disposition_not_found: %', p_disposition_id using errcode = 'P0002';
  end if;

  if v_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'review_disposition_optimistic_lock_failed' using errcode = '40001';
  end if;

  if v_row.publication_gate_candidate
    or v_row.can_publish_price_directly
    or v_row.publishable
    or v_row.app_visible
    or v_row.market_truth then
    raise exception 'review_disposition_public_flags_present' using errcode = '23514';
  end if;

  case p_action_name
    when 'start_review' then
      if v_row.review_status <> 'pending'
        or v_row.review_lane not in ('high_signal_review', 'candidate_review', 'classification_review', 'reference_only_review') then
        raise exception 'invalid_transition_start_review' using errcode = '23514';
      end if;
      v_to_status := 'in_review';
      v_to_disposition := v_row.review_disposition;

    when 'confirm_internal_candidate' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane not in ('high_signal_review', 'candidate_review')
        or v_row.evidence_lane not in ('raw_single', 'slab') then
        raise exception 'invalid_transition_confirm_internal_candidate' using errcode = '23514';
      end if;
      v_to_status := 'resolved';
      v_to_disposition := 'review_confirmed_internal_candidate';

    when 'require_split' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.evidence_lane <> 'mixed_raw_slab' then
        raise exception 'invalid_transition_require_split' using errcode = '23514';
      end if;
      v_to_status := 'blocked';
      v_to_disposition := 'review_split_required';

    when 'block_evidence' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane not in ('high_signal_review', 'candidate_review', 'reference_only_review', 'low_signal_monitor') then
        raise exception 'invalid_transition_block_evidence' using errcode = '23514';
      end if;
      v_to_status := 'blocked';
      v_to_disposition := 'review_blocked';

    when 'block_classification' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane <> 'classification_review'
        or v_row.evidence_lane <> 'classification_blocked' then
        raise exception 'invalid_transition_block_classification' using errcode = '23514';
      end if;
      v_to_status := 'blocked';
      v_to_disposition := 'review_blocked_classification';

    when 'request_reclassification' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane <> 'classification_review' then
        raise exception 'invalid_transition_request_reclassification' using errcode = '23514';
      end if;
      v_to_status := 'blocked';
      v_to_disposition := 'review_reclassify';

    when 'defer_more_evidence' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane not in ('high_signal_review', 'candidate_review', 'classification_review', 'low_signal_monitor') then
        raise exception 'invalid_transition_defer_more_evidence' using errcode = '23514';
      end if;
      v_to_status := 'resolved';
      v_to_disposition := 'review_defer_more_evidence';

    when 'reference_crosscheck' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane <> 'reference_only_review'
        or v_row.evidence_lane <> 'reference_metric' then
        raise exception 'invalid_transition_reference_crosscheck' using errcode = '23514';
      end if;
      v_to_status := 'resolved';
      v_to_disposition := 'review_reference_crosscheck';

    when 'defer_active_market_evidence' then
      if v_row.review_status not in ('pending', 'in_review')
        or v_row.review_lane <> 'reference_only_review'
        or v_row.evidence_lane <> 'reference_metric' then
        raise exception 'invalid_transition_defer_active_market_evidence' using errcode = '23514';
      end if;
      v_to_status := 'resolved';
      v_to_disposition := 'review_defer_active_market_evidence';

    when 'confirm_monitor_only' then
      if v_row.review_status not in ('pending', 'in_review', 'resolved')
        or v_row.review_lane <> 'low_signal_monitor' then
        raise exception 'invalid_transition_confirm_monitor_only' using errcode = '23514';
      end if;
      v_to_status := 'resolved';
      v_to_disposition := 'monitor_only';
  end case;

  insert into public.market_evidence_review_action_events (
    disposition_id,
    card_print_id,
    gv_id,
    action_name,
    from_status,
    to_status,
    from_disposition,
    to_disposition,
    review_lane,
    evidence_lane,
    reason_code,
    review_note,
    action_payload,
    review_actor,
    expected_disposition_updated_at,
    publication_gate_candidate,
    can_publish_price_directly,
    publishable,
    app_visible,
    market_truth
  )
  values (
    v_row.id,
    v_row.card_print_id,
    v_row.gv_id,
    p_action_name,
    v_row.review_status,
    v_to_status,
    v_row.review_disposition,
    v_to_disposition,
    v_row.review_lane,
    v_row.evidence_lane,
    p_reason_code,
    p_review_note,
    v_action_payload,
    p_review_actor,
    p_expected_updated_at,
    false,
    false,
    false,
    false,
    false
  )
  returning id into v_event_id;

  update public.market_evidence_review_dispositions
  set
    review_status = v_to_status,
    review_disposition = v_to_disposition,
    review_actor = p_review_actor,
    reviewed_at = now(),
    review_payload = coalesce(review_payload, '{}'::jsonb) || jsonb_build_object(
      'last_action_name', p_action_name,
      'last_reason_code', p_reason_code,
      'last_action_event_id', v_event_id,
      'last_review_note_present', p_review_note is not null
    ),
    needs_review = case when v_to_status in ('resolved', 'blocked') then false else true end,
    publication_gate_candidate = false,
    can_publish_price_directly = false,
    publishable = false,
    app_visible = false,
    market_truth = false,
    updated_at = now()
  where id = v_row.id
    and updated_at is not distinct from p_expected_updated_at;

  if not found then
    raise exception 'review_disposition_update_lost_optimistic_lock' using errcode = '40001';
  end if;

  return query
  select
    v_event_id,
    v_row.id,
    v_row.card_print_id,
    p_action_name,
    v_row.review_status,
    v_to_status,
    v_row.review_disposition,
    v_to_disposition,
    p_review_actor;
end;
$$;

revoke all on function public.apply_market_evidence_review_action_v1(
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.apply_market_evidence_review_action_v1(
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  jsonb
) to service_role;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1'::text as package_id,
  1::int as proposed_function_count,
  true::boolean as service_role_only,
  true::boolean as optimistic_locking,
  true::boolean as inserts_one_action_event_when_invoked,
  true::boolean as updates_one_disposition_when_invoked,
  false::boolean as invoked_by_this_migration,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth;

commit;
`;

const noopDryRunSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1 no-op dry-run SQL.
-- This validates proposed remote objects after apply without invoking the function.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1_NOOP_DRY_RUN'::text as package_id,
  count(*) filter (where p.proname = 'apply_market_evidence_review_action_v1')::int as function_count,
  (select count(*)::int from public.market_evidence_review_action_events) as action_event_rows_before_noop,
  (select count(*)::int from public.market_evidence_review_dispositions where publishable or app_visible or market_truth) as disposition_public_flag_rows,
  false::boolean as function_invoked,
  false::boolean as disposition_updates,
  false::boolean as action_event_inserts
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'apply_market_evidence_review_action_v1';
`;

const rollbackDryRunSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1 rollback-only dry-run proof.
-- This file intentionally rolls back and must not be used as an apply file.

begin;

drop function if exists public.apply_market_evidence_review_action_v1(
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  jsonb
);

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1_ROLLBACK_DRY_RUN'::text as package_id,
  true::boolean as rollback_only,
  false::boolean as persisted_change,
  false::boolean as disposition_updates,
  false::boolean as action_event_inserts,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth;

rollback;
`;

const readbackSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1 readback SQL.
-- Intended for use only after a separately approved targeted remote schema apply.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1_FUNCTION_READBACK'::text as package_id,
  count(*) filter (where p.proname = 'apply_market_evidence_review_action_v1')::int as function_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'apply_market_evidence_review_action_v1';

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1_GRANT_READBACK'::text as package_id,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name = 'apply_market_evidence_review_action_v1'
order by grantee, privilege_type;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1_BOUNDARY_READBACK'::text as package_id,
  (select count(*)::int from public.market_evidence_review_action_events) as action_event_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%apply_market_evidence_review_action%') as public_pricing_view_references;
`;

const migrationHash = sha256Text(migrationSql);
const noopHash = sha256Text(noopDryRunSql);
const rollbackHash = sha256Text(rollbackDryRunSql);
const readbackHash = sha256Text(readbackSql);
const reportPayload = {
  source_workflow_fingerprint: workflowReport.package_fingerprint_sha256,
  source_action_events_migration_hash: actionEventsReport.hashes.migration_sql_sha256,
  migration_file: `supabase/migrations/${MIGRATION_FILE}`,
  action_names: actionNames,
  reason_codes: reasonCodes,
  proposed_function_count: 1,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_internal_review_action_function_schema_candidate",
  package_fingerprint_sha256: sha256Json(reportPayload),
  source_workflow: {
    package_id: workflowReport.package_id,
    fingerprint_sha256: workflowReport.package_fingerprint_sha256,
    contract_hash_sha256: workflowReport.hashes.contract_md_sha256,
  },
  source_action_events_schema: {
    package_id: actionEventsReport.package_id,
    migration_hash_sha256: actionEventsReport.hashes.migration_sql_sha256,
  },
  schema_candidate: {
    migration_file: `supabase/migrations/${MIGRATION_FILE}`,
    function_name: "public.apply_market_evidence_review_action_v1",
    proposed_function_count: 1,
    allowed_actions: actionNames,
    allowed_reason_codes: reasonCodes,
    grants: ["service_role: execute"],
    writes_when_invoked: [
      "insert one market_evidence_review_action_events row",
      "update only the matching market_evidence_review_dispositions row",
    ],
    optimistic_locking: true,
    public_flags_forced_false: true,
  },
  hashes: {
    migration_sql_sha256: migrationHash,
    noop_dry_run_sql_sha256: noopHash,
    rollback_dry_run_sql_sha256: rollbackHash,
    readback_sql_sha256: readbackHash,
  },
  artifacts: {
    migration_candidate: `supabase/migrations/${MIGRATION_FILE}`,
    sql_candidate: "docs/sql/mee_core_internal_review_action_function_v1_migration_candidate.sql",
    noop_dry_run_sql: "docs/sql/mee_core_internal_review_action_function_v1_noop_dry_run.sql",
    rollback_dry_run_sql: "docs/sql/mee_core_internal_review_action_function_v1_rollback_dry_run.sql",
    readback_sql: "docs/sql/mee_core_internal_review_action_function_v1_readback.sql",
    report_json: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}/report.json`,
    report_md: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}.md`,
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1.md",
  },
  findings: [],
  boundary_proof: {
    remote_migration_apply: false,
    db_writes: false,
    provider_calls: false,
    source_fetches: false,
    actual_action_event_inserts: false,
    actual_disposition_updates: false,
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
    "# MEE Core Internal Review Action Function Schema Candidate V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: plan only, local artifacts only",
    "",
    "## Summary",
    "",
    `- Package: \`${value.package_id}\``,
    `- Fingerprint: \`${value.package_fingerprint_sha256}\``,
    `- Migration hash: \`${value.hashes.migration_sql_sha256}\``,
    `- Function: \`${value.schema_candidate.function_name}\``,
    "- Service-role execute only",
    "- Optimistic locking required",
    "- No invocation in this package",
    "",
    "## Function Behavior When Later Invoked",
    "",
    "- validates action name and reason code",
    "- locks one review disposition row",
    "- checks `expected_updated_at`",
    "- validates transition against the internal workflow",
    "- inserts one action event row",
    "- updates only the matching disposition row",
    "- forces all public pricing flags false",
    "",
    "## Boundary",
    "",
    "No remote migration apply, DB writes, provider calls, source fetches, actual action event inserts, actual disposition updates, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, deletes, upserts, merges, or global apply.",
    "",
  ].join("\n");
}

const planMd = `# MEE Core Internal Review Action Function Schema Candidate V1

Status: plan only

## Objective

Create a local migration candidate for the internal service-role-only function that applies one review action safely.

## Proposed Function

\`public.apply_market_evidence_review_action_v1\`

## Safety Controls

- service-role execute only
- optimistic lock via \`expected_updated_at\`
- transition matrix enforced in PL/pgSQL
- one action event insert when invoked
- one matching disposition update when invoked
- public/app-visible/market-truth flags forced false

## Next Step After This Plan

Request targeted remote schema apply only, using the migration hash in the report.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
mkdirSync(MIGRATION_DIR, { recursive: true });

writeFileSync(path.join(MIGRATION_DIR, MIGRATION_FILE), migrationSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_v1_migration_candidate.sql"), migrationSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_v1_noop_dry_run.sql"), noopDryRunSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_v1_rollback_dry_run.sql"), rollbackDryRunSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_v1_readback.sql"), readbackSql);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), renderMarkdown(report));
writeFileSync(path.join(PLAN_DIR, "MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1.md"), planMd);

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
