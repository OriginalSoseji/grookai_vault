import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-DASHBOARD-READ-MODEL-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");

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

function supabaseReadOnlyQuery(sql) {
  let output = "";
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      output = execFileSync("supabase", ["db", "query", "--linked", sql], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 40,
      });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 1500);
    }
  }
  if (lastError) throw lastError;
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

const dashboardCase = `case
    when d.evidence_lane = 'mixed_raw_slab' then 'mixed_raw_slab_split_queue'
    when d.evidence_lane = 'classification_blocked' then 'classification_blocked_queue'
    when d.evidence_lane = 'reference_metric' then 'reference_only_queue'
    when d.evidence_lane = 'low_signal' then 'low_signal_monitor'
    when d.evidence_lane = 'unknown' then 'unknown_evidence_review'
    when d.review_lane = 'high_signal_review' then 'high_signal_candidate_queue'
    else 'standard_candidate_review'
  end`;

const handoffCase = `case
    when d.review_status = 'resolved'
     and d.review_disposition = 'review_confirmed_internal_candidate'
     and d.evidence_lane in ('raw_single', 'slab')
     and d.publication_gate_candidate = false
     and d.can_publish_price_directly = false
     and d.publishable = false
     and d.app_visible = false
     and d.market_truth = false
     and coalesce(s.publishable_count, 0) = 0
     and coalesce(s.app_visible_count, 0) = 0
     and coalesce(s.market_truth_count, 0) = 0
    then true
    else false
  end`;

const viewCandidateSql = `-- MEE_CORE_INTERNAL_REVIEW_DASHBOARD_READ_MODEL_V1 local SQL/view candidates.
-- Plan only. Do not apply remotely without a separate targeted approval.
-- Internal-only review dashboard read models. No public pricing views, no app-visible pricing,
-- no price rollups, no pricing_observations writes, no identity/vault/image writes.

create or replace view public.v_market_evidence_review_dashboard_queue_v1
with (security_invoker = true)
as
select
  d.id as disposition_id,
  d.card_print_id,
  d.gv_id,
  d.review_lane,
  d.evidence_lane,
  d.review_status,
  d.review_disposition,
  d.review_actor,
  d.reviewed_at,
  d.needs_review,
  q.evidence_count,
  q.reference_evidence_count,
  q.active_listing_evidence_count,
  q.source_family_count,
  q.rollup_eligible_count,
  q.raw_single_count,
  q.slab_count,
  q.internal_rollup_candidate,
  s.publishable_count,
  s.app_visible_count,
  s.market_truth_count,
  ${dashboardCase} as dashboard_queue,
  ${handoffCase} as publication_gate_handoff_candidate,
  true as internal_only,
  false as publishable,
  false as app_visible,
  false as market_truth
from public.market_evidence_review_dispositions d
left join public.v_market_evidence_card_review_queue_v1 q
  on q.card_print_id = d.card_print_id
 and q.review_lane = d.review_lane
left join public.v_market_evidence_card_signal_summary_v1 s
  on s.card_print_id = d.card_print_id;

create or replace view public.v_market_evidence_review_dashboard_status_summary_v1
with (security_invoker = true)
as
select
  dashboard_queue,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  count(*)::int as card_count,
  count(*) filter (where publication_gate_handoff_candidate)::int as handoff_candidate_count,
  false as publishable,
  false as app_visible,
  false as market_truth
from public.v_market_evidence_review_dashboard_queue_v1
group by dashboard_queue, review_lane, evidence_lane, review_status, review_disposition;

create or replace view public.v_market_evidence_review_dashboard_blocker_queue_v1
with (security_invoker = true)
as
select *
from public.v_market_evidence_review_dashboard_queue_v1
where dashboard_queue in (
  'mixed_raw_slab_split_queue',
  'classification_blocked_queue',
  'reference_only_queue',
  'unknown_evidence_review'
);

revoke all on public.v_market_evidence_review_dashboard_queue_v1 from public, anon, authenticated;
revoke all on public.v_market_evidence_review_dashboard_status_summary_v1 from public, anon, authenticated;
revoke all on public.v_market_evidence_review_dashboard_blocker_queue_v1 from public, anon, authenticated;

grant select on public.v_market_evidence_review_dashboard_queue_v1 to service_role;
grant select on public.v_market_evidence_review_dashboard_status_summary_v1 to service_role;
grant select on public.v_market_evidence_review_dashboard_blocker_queue_v1 to service_role;
`;

const readbackSql = `-- MEE_CORE_INTERNAL_REVIEW_DASHBOARD_READ_MODEL_V1 readback SQL.
-- Intended for use after a separately approved targeted remote schema apply.

select
  'MEE_CORE_INTERNAL_REVIEW_DASHBOARD_READ_MODEL_V1_VIEW_READBACK'::text as package_id,
  count(*) filter (where table_name = 'v_market_evidence_review_dashboard_queue_v1')::int as queue_view_count,
  count(*) filter (where table_name = 'v_market_evidence_review_dashboard_status_summary_v1')::int as status_summary_view_count,
  count(*) filter (where table_name = 'v_market_evidence_review_dashboard_blocker_queue_v1')::int as blocker_queue_view_count
from information_schema.views
where table_schema = 'public'
  and table_name in (
    'v_market_evidence_review_dashboard_queue_v1',
    'v_market_evidence_review_dashboard_status_summary_v1',
    'v_market_evidence_review_dashboard_blocker_queue_v1'
  );

select
  'MEE_CORE_INTERNAL_REVIEW_DASHBOARD_READ_MODEL_V1_QUEUE_READBACK'::text as package_id,
  dashboard_queue,
  count(*)::int as card_count,
  count(*) filter (where publication_gate_handoff_candidate)::int as handoff_candidate_count,
  count(*) filter (where publishable)::int as publishable_count,
  count(*) filter (where app_visible)::int as app_visible_count,
  count(*) filter (where market_truth)::int as market_truth_count
from public.v_market_evidence_review_dashboard_queue_v1
group by dashboard_queue
order by card_count desc, dashboard_queue;
`;

const dispositionSummary = supabaseReadOnlyQuery(`
select
  count(*)::int as disposition_rows,
  count(*) filter (where publication_gate_candidate)::int as publication_gate_candidate_rows,
  count(*) filter (where can_publish_price_directly)::int as direct_publish_rows,
  count(*) filter (where publishable)::int as publishable_rows,
  count(*) filter (where app_visible)::int as app_visible_rows,
  count(*) filter (where market_truth)::int as market_truth_rows
from public.market_evidence_review_dispositions;
`)[0];

const joinSummary = supabaseReadOnlyQuery(`
select
  count(*)::int as disposition_rows,
  count(q.card_print_id)::int as joined_review_queue_rows,
  count(s.card_print_id)::int as joined_signal_summary_rows,
  count(*) filter (where q.card_print_id is null)::int as missing_review_queue_rows,
  count(*) filter (where s.card_print_id is null)::int as missing_signal_summary_rows
from public.market_evidence_review_dispositions d
left join public.v_market_evidence_card_review_queue_v1 q
  on q.card_print_id = d.card_print_id
 and q.review_lane = d.review_lane
left join public.v_market_evidence_card_signal_summary_v1 s
  on s.card_print_id = d.card_print_id;
`)[0];

const dashboardQueues = supabaseReadOnlyQuery(`
select
  dashboard_queue,
  count(*)::int as card_count,
  count(*) filter (where publication_gate_handoff_candidate)::int as handoff_candidate_count
from (
  select
    d.*,
    q.card_print_id as queue_card_print_id,
    s.publishable_count,
    s.app_visible_count,
    s.market_truth_count,
    ${dashboardCase} as dashboard_queue,
    ${handoffCase} as publication_gate_handoff_candidate
  from public.market_evidence_review_dispositions d
  left join public.v_market_evidence_card_review_queue_v1 q
    on q.card_print_id = d.card_print_id
   and q.review_lane = d.review_lane
  left join public.v_market_evidence_card_signal_summary_v1 s
    on s.card_print_id = d.card_print_id
) x
group by dashboard_queue
order by card_count desc, dashboard_queue;
`);

const statusSummary = supabaseReadOnlyQuery(`
select
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  count(*)::int as card_count
from public.market_evidence_review_dispositions
group by review_lane, evidence_lane, review_status, review_disposition
order by card_count desc, review_lane, evidence_lane;
`);

const sampleRows = supabaseReadOnlyQuery(`
select
  d.card_print_id,
  d.gv_id,
  d.review_lane,
  d.evidence_lane,
  d.review_status,
  d.review_disposition,
  ${dashboardCase} as dashboard_queue
from public.market_evidence_review_dispositions d
order by d.review_lane, d.evidence_lane, d.card_print_id
limit 25;
`);

const publicBoundary = supabaseReadOnlyQuery(`
select
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review_dashboard%') as public_pricing_view_references;
`)[0];

const findings = [];
if (Number(dispositionSummary.publishable_rows) !== 0) findings.push("publishable_flags_present");
if (Number(dispositionSummary.app_visible_rows) !== 0) findings.push("app_visible_flags_present");
if (Number(dispositionSummary.market_truth_rows) !== 0) findings.push("market_truth_flags_present");
if (Number(joinSummary.missing_review_queue_rows) !== 0) findings.push("missing_review_queue_join");
if (Number(joinSummary.missing_signal_summary_rows) !== 0) findings.push("missing_signal_summary_join");
if (Number(publicBoundary.pricing_observations_count) !== 0) findings.push("pricing_observations_present");
if (Number(publicBoundary.public_pricing_view_references) !== 0) findings.push("public_pricing_view_references_dashboard");

const sqlHash = sha256Text(viewCandidateSql);
const readbackHash = sha256Text(readbackSql);
const reportPayload = {
  disposition_summary: dispositionSummary,
  join_summary: joinSummary,
  dashboard_queues: dashboardQueues,
  status_summary: statusSummary,
  public_boundary: publicBoundary,
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_internal_review_dashboard_read_model",
  package_fingerprint_sha256: sha256Json(reportPayload),
  audit: {
    disposition_summary: dispositionSummary,
    join_summary: joinSummary,
    dashboard_queues: dashboardQueues,
    status_summary: statusSummary,
    sample_rows: sampleRows,
    public_boundary: publicBoundary,
  },
  hashes: {
    sql_candidate_sha256: sqlHash,
    readback_sql_sha256: readbackHash,
  },
  artifacts: {
    report_json: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}/report.json`,
    report_md: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}.md`,
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_DASHBOARD_READ_MODEL_V1.md",
    sql_candidate: "docs/sql/mee_core_internal_review_dashboard_read_model_v1_view_candidates.sql",
    readback_sql: "docs/sql/mee_core_internal_review_dashboard_read_model_v1_readback.sql",
  },
  findings,
  boundary_proof: {
    remote_migration_apply: false,
    db_writes: false,
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

function renderMarkdown(value) {
  return [
    "# MEE Core Internal Review Dashboard Read Model V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: plan only, local artifacts only",
    "",
    "## Summary",
    "",
    `- Package: \`${value.package_id}\``,
    `- Fingerprint: \`${value.package_fingerprint_sha256}\``,
    `- Disposition rows: ${value.audit.disposition_summary.disposition_rows}`,
    `- Joined review queue rows: ${value.audit.join_summary.joined_review_queue_rows}`,
    `- Missing review queue joins: ${value.audit.join_summary.missing_review_queue_rows}`,
    `- Missing signal summary joins: ${value.audit.join_summary.missing_signal_summary_rows}`,
    `- Findings: ${value.findings.length}`,
    "",
    "## Dashboard Queues",
    "",
    ...value.audit.dashboard_queues.map(
      (row) => `- ${row.dashboard_queue}: ${row.card_count} cards, ${row.handoff_candidate_count} handoff candidates`,
    ),
    "",
    "## Public Boundary",
    "",
    "```json",
    JSON.stringify(value.audit.public_boundary, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(value.findings.length ? value.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });

writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_dashboard_read_model_v1_view_candidates.sql"), viewCandidateSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_dashboard_read_model_v1_readback.sql"), readbackSql);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), renderMarkdown(report));
writeFileSync(
  path.join(PLAN_DIR, "MEE_CORE_INTERNAL_REVIEW_DASHBOARD_READ_MODEL_V1.md"),
  [
    "# MEE Core Internal Review Dashboard Read Model V1",
    "",
    "Status: plan only",
    "",
    "## Objective",
    "",
    "Create local internal-only review dashboard read-model SQL candidates over seeded MEE review dispositions.",
    "",
    "## Proposed Views",
    "",
    "- `v_market_evidence_review_dashboard_queue_v1`",
    "- `v_market_evidence_review_dashboard_status_summary_v1`",
    "- `v_market_evidence_review_dashboard_blocker_queue_v1`",
    "",
    "## Boundary",
    "",
    "No remote migration apply, DB writes, provider calls, source fetches, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, deletes, upserts, merges, migrations, or global apply.",
    "",
  ].join("\n"),
);

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      findings: report.findings,
      audit: report.audit,
      hashes: report.hashes,
      artifacts: report.artifacts,
    },
    null,
    2,
  ),
);
