import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { marketEvidenceQueryRows } from "../lib/market_evidence_db_query_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");

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

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(row[column.key] ?? "")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

const planSql = `-- ${PACKAGE_ID} plan source.
-- Internal action plan for pending raw_single/slab candidate dispositions only.

with quality as (
  select
    disposition_id,
    card_print_id,
    gv_id,
    review_lane,
    evidence_lane,
    count(*)::int as candidate_evidence_rows,
    count(*) filter (where quality_action = 'exclude')::int as exclude_rows,
    count(*) filter (where quality_action = 'reclassify_lane')::int as reclassify_lane_rows,
    count(*) filter (where quality_action = 'manual_policy_review')::int as manual_policy_rows,
    count(*) filter (where quality_action = 'identity_confidence_review')::int as identity_confidence_rows,
    count(*) filter (where quality_rollup_eligible)::int as quality_rollup_eligible_rows,
    min(match_confidence) as min_match_confidence,
    percentile_disc(0.5) within group (order by match_confidence) as median_match_confidence,
    max(match_confidence) as max_match_confidence
  from public.v_market_evidence_candidate_quality_scores_v1
  group by 1,2,3,4,5
), targets as (
  select
    d.id as disposition_id,
    d.card_print_id,
    d.gv_id,
    d.review_lane,
    d.evidence_lane,
    d.review_status,
    d.review_disposition,
    d.updated_at as expected_updated_at,
    q.candidate_evidence_rows,
    q.exclude_rows,
    q.reclassify_lane_rows,
    q.manual_policy_rows,
    q.identity_confidence_rows,
    q.quality_rollup_eligible_rows,
    q.min_match_confidence,
    q.median_match_confidence,
    q.max_match_confidence,
    case
      when q.exclude_rows > 0 then 'block_evidence'
      when q.reclassify_lane_rows > 0 then 'block_evidence'
      when q.manual_policy_rows > 0 then 'block_evidence'
      else 'defer_more_evidence'
    end as action_name,
    case
      when q.exclude_rows > 0 then 'lot_bulk_sealed_proxy_noise'
      when q.reclassify_lane_rows > 0 then 'special_lane_ambiguous'
      when q.manual_policy_rows > 0 then 'manual_hold'
      else 'unresolved_match_ambiguity'
    end as reason_code,
    case
      when q.exclude_rows > 0 then 'hard_exclusion_policy'
      when q.reclassify_lane_rows > 0 then 'raw_slab_lane_policy'
      when q.manual_policy_rows > 0 then 'manual_policy_hold'
      else 'identity_confidence_v2_defer'
    end as quality_gate_policy
  from public.market_evidence_review_dispositions d
  join quality q on q.disposition_id = d.id
  where d.needs_review = true
    and d.review_status = 'pending'
    and d.evidence_lane in ('raw_single', 'slab')
    and d.publication_gate_candidate = false
    and d.can_publish_price_directly = false
    and d.publishable = false
    and d.app_visible = false
    and d.market_truth = false
)
select *
from targets
order by quality_gate_policy, review_lane, evidence_lane, gv_id, disposition_id;
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });

const rows = (await marketEvidenceQueryRows(planSql)).map((row, index) => ({
  package_id: PACKAGE_ID,
  row_index: index + 1,
  ...row,
}));

const manifestText = `${rows.map((row) => JSON.stringify(stable(row))).join("\n")}\n`;
const rowManifestHash = sha256Text(manifestText);

const valueRows = rows
  .map(
    (row) =>
      `(${sqlLiteral(row.disposition_id)}::uuid, ${sqlLiteral(row.expected_updated_at)}::timestamptz, ${sqlLiteral(row.action_name)}::text, ${sqlLiteral(row.reason_code)}::text, ${sqlLiteral(row.quality_gate_policy)}::text)`,
  )
  .join(",\n    ");

const targetsCteSql = rows.length
  ? `targets(disposition_id, expected_updated_at, action_name, reason_code, quality_gate_policy) as (
  values
    ${valueRows}
)`
  : `targets(disposition_id, expected_updated_at, action_name, reason_code, quality_gate_policy) as (
  select
    null::uuid as disposition_id,
    null::timestamptz as expected_updated_at,
    null::text as action_name,
    null::text as reason_code,
    null::text as quality_gate_policy
  where false
)`;

function actionPayload(row) {
  return JSON.stringify({
    package_id: PACKAGE_ID,
    row_manifest_sha256: rowManifestHash,
    row_index: row.row_index,
    quality_gate_policy: row.quality_gate_policy,
    candidate_evidence_rows: row.candidate_evidence_rows,
    exclude_rows: row.exclude_rows,
    reclassify_lane_rows: row.reclassify_lane_rows,
    manual_policy_rows: row.manual_policy_rows,
    identity_confidence_rows: row.identity_confidence_rows,
    quality_rollup_eligible_rows: row.quality_rollup_eligible_rows,
    min_match_confidence: row.min_match_confidence,
    median_match_confidence: row.median_match_confidence,
    max_match_confidence: row.max_match_confidence,
    public_pricing_allowed: false,
    market_truth_allowed: false,
  });
}

const applySql = `-- ${PACKAGE_ID} apply candidate.
-- Scope: apply one internal quality-gate action to all pending raw_single/slab candidate dispositions.
-- No public pricing, no market truth, no provider calls.

begin;

${rows.length
  ? rows
    .map(
      (row) => `select *
from public.apply_market_evidence_review_action_v1(
  ${sqlLiteral(row.disposition_id)}::uuid,
  ${sqlLiteral(row.expected_updated_at)}::timestamptz,
  ${sqlLiteral(row.action_name)}::text,
  'system_quality_gate_remaining_candidate_actions'::text,
  ${sqlLiteral(row.reason_code)}::text,
  ${sqlLiteral(`MEE quality gate: ${row.quality_gate_policy}.`)}::text,
  ${sqlLiteral(actionPayload(row))}::jsonb
);`,
    )
    .join("\n\n")
  : `select
  '${PACKAGE_ID}_NOOP_APPLY'::text as package_id,
  0::int as expected_target_rows,
  true::boolean as noop;`}

commit;
`;

const preflightSql = `-- ${PACKAGE_ID} preflight.

with ${targetsCteSql}
select
  '${PACKAGE_ID}_PREFLIGHT'::text as package_id,
  ${rows.length}::int as expected_target_rows,
  count(*)::int as eligible_target_rows,
  count(*) filter (where d.publication_gate_candidate or d.can_publish_price_directly or d.publishable or d.app_visible or d.market_truth)::int as public_boundary_rows,
  count(*) filter (where t.action_name = 'confirm_internal_candidate')::int as forbidden_confirm_rows
from targets t
join public.market_evidence_review_dispositions d
  on d.id = t.disposition_id
 and d.updated_at is not distinct from t.expected_updated_at
where d.needs_review = true
  and d.review_status = 'pending'
  and d.evidence_lane in ('raw_single', 'slab')
  and d.review_lane in ('candidate_review', 'high_signal_review')
  and not exists (
    select 1
    from public.market_evidence_review_action_events e
    where e.disposition_id = d.id
      and e.action_payload ->> 'package_id' = '${PACKAGE_ID}'
      and e.action_payload ->> 'row_manifest_sha256' = '${rowManifestHash}'
  );
`;

const readbackSql = `-- ${PACKAGE_ID} readback.

with ${targetsCteSql}, package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join targets t on t.disposition_id = e.disposition_id
  where e.action_payload ->> 'package_id' = '${PACKAGE_ID}'
    and e.action_payload ->> 'row_manifest_sha256' = '${rowManifestHash}'
), target_dispositions as (
  select d.*, t.action_name, t.reason_code, t.quality_gate_policy
  from public.market_evidence_review_dispositions d
  join targets t on t.disposition_id = d.id
)
select
  '${PACKAGE_ID}_READBACK'::text as package_id,
  ${rows.length}::int as expected_target_rows,
  (select count(*)::int from package_events) as matching_action_event_rows,
  (select count(distinct disposition_id)::int from package_events) as distinct_event_disposition_rows,
  (select count(*)::int from target_dispositions where needs_review = false and review_status in ('blocked', 'resolved')) as updated_target_rows,
  (select count(*)::int from package_events where action_name = 'confirm_internal_candidate') as forbidden_confirm_event_rows,
  (select count(*)::int from package_events where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as event_public_flag_rows,
  (select count(*)::int from target_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as target_public_flag_rows,
  (select count(*)::int from public.market_evidence_review_dispositions where needs_review = true and review_status = 'pending' and evidence_lane in ('raw_single','slab')) as remaining_pending_candidate_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence%') as public_pricing_view_market_evidence_references;
`;

const rollbackSql = `-- ${PACKAGE_ID} rollback candidate.
-- Do not execute without explicit rollback approval.

begin;

with ${targetsCteSql}, package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join targets t on t.disposition_id = e.disposition_id
  where e.action_payload ->> 'package_id' = '${PACKAGE_ID}'
    and e.action_payload ->> 'row_manifest_sha256' = '${rowManifestHash}'
), deleted_events as (
  delete from public.market_evidence_review_action_events e
  using package_events pe
  where e.id = pe.id
  returning e.disposition_id
)
update public.market_evidence_review_dispositions d
set
  review_status = 'pending',
  review_disposition = case
    when d.review_lane = 'high_signal_review' then 'review_pending_high_signal'
    else 'review_pending_candidate'
  end,
  review_actor = 'system_seed_plan',
  reviewed_at = null,
  needs_review = true,
  publication_gate_candidate = false,
  can_publish_price_directly = false,
  publishable = false,
  app_visible = false,
  market_truth = false,
  updated_at = targets.expected_updated_at
from targets
where d.id = targets.disposition_id
  and exists (select 1 from deleted_events de where de.disposition_id = d.id);

commit;
`;

const actionSummary = Object.values(
  rows.reduce((acc, row) => {
    const key = `${row.quality_gate_policy}:${row.action_name}:${row.reason_code}`;
    acc[key] ??= {
      quality_gate_policy: row.quality_gate_policy,
      action_name: row.action_name,
      reason_code: row.reason_code,
      rows: 0,
    };
    acc[key].rows += 1;
    return acc;
  }, {}),
).sort((left, right) => left.quality_gate_policy.localeCompare(right.quality_gate_policy));

const evidenceSummary = rows.reduce(
  (acc, row) => {
    acc.candidate_evidence_rows += Number(row.candidate_evidence_rows);
    acc.exclude_rows += Number(row.exclude_rows);
    acc.reclassify_lane_rows += Number(row.reclassify_lane_rows);
    acc.manual_policy_rows += Number(row.manual_policy_rows);
    acc.identity_confidence_rows += Number(row.identity_confidence_rows);
    acc.quality_rollup_eligible_rows += Number(row.quality_rollup_eligible_rows);
    return acc;
  },
  {
    candidate_evidence_rows: 0,
    exclude_rows: 0,
    reclassify_lane_rows: 0,
    manual_policy_rows: 0,
    identity_confidence_rows: 0,
    quality_rollup_eligible_rows: 0,
  },
);

const reportBasis = {
  package_id: PACKAGE_ID,
  target_disposition_rows: rows.length,
  row_manifest_sha256: rowManifestHash,
  action_summary: actionSummary,
  evidence_summary: evidenceSummary,
  apply_sql_sha256: sha256Text(applySql),
  preflight_sql_sha256: sha256Text(preflightSql),
  readback_sql_sha256: sha256Text(readbackSql),
  rollback_sql_sha256: sha256Text(rollbackSql),
  findings: [],
};

const report = {
  ...reportBasis,
  generated_at: new Date().toISOString(),
  mode: "apply_package_quality_gate_remaining_candidate_actions",
  package_status: rows.length === 0 ? "noop_no_pending_candidate_rows" : "ready_for_apply",
  package_fingerprint_sha256: sha256Json(reportBasis),
  boundary_proof: {
    provider_calls: false,
    source_fetches: false,
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
    migrations: false,
    global_apply: false,
  },
};

const markdown = `# ${PACKAGE_ID}

## Status

- Package fingerprint: \`${report.package_fingerprint_sha256}\`
- Target disposition rows: \`${rows.length}\`
- Row manifest hash: \`${rowManifestHash}\`

## Action Summary

${markdownTable(actionSummary, [
  { key: "quality_gate_policy", label: "policy" },
  { key: "action_name", label: "action" },
  { key: "reason_code", label: "reason" },
  { key: "rows", label: "rows" },
])}

## Evidence Summary

\`\`\`json
${JSON.stringify(evidenceSummary, null, 2)}
\`\`\`

## Decision

This package handles identity confidence, raw/slab lane mismatch, and manual policy gates as internal review actions. It does not confirm candidates, publish prices, or create market truth.
`;

writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(ARTIFACT_DIR, "row_manifest.jsonl"), manifestText);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), markdown);
writeFileSync(path.join(PLAN_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), markdown);
writeFileSync(path.join(CHECKPOINT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), markdown);
writeFileSync(path.join(SQL_DIR, "mee_core_quality_gate_remaining_candidate_actions_v1_apply_candidate.sql"), applySql);
writeFileSync(path.join(SQL_DIR, "mee_core_quality_gate_remaining_candidate_actions_v1_preflight.sql"), preflightSql);
writeFileSync(path.join(SQL_DIR, "mee_core_quality_gate_remaining_candidate_actions_v1_readback.sql"), readbackSql);
writeFileSync(path.join(SQL_DIR, "mee_core_quality_gate_remaining_candidate_actions_v1_rollback_candidate.sql"), rollbackSql);

console.log(
  JSON.stringify(
    {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      target_disposition_rows: rows.length,
      row_manifest_sha256: rowManifestHash,
      action_summary: actionSummary,
      evidence_summary: evidenceSummary,
      apply_sql_sha256: report.apply_sql_sha256,
      preflight_sql_sha256: report.preflight_sql_sha256,
      readback_sql_sha256: report.readback_sql_sha256,
      findings: report.findings,
    },
    null,
    2,
  ),
);
