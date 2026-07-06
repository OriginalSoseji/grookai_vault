import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-ACTION-WORKFLOW-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const CONTRACT_DIR = path.join(REPO_ROOT, "docs", "contracts");
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

const actions = [
  {
    action: "start_review",
    from_statuses: ["pending"],
    to_status: "in_review",
    to_disposition: "unchanged",
    allowed_review_lanes: ["high_signal_review", "candidate_review", "classification_review", "reference_only_review"],
    requires_reason_code: false,
    handoff_candidate_after_action: false,
  },
  {
    action: "confirm_internal_candidate",
    from_statuses: ["pending", "in_review"],
    to_status: "resolved",
    to_disposition: "review_confirmed_internal_candidate",
    allowed_review_lanes: ["high_signal_review", "candidate_review"],
    allowed_evidence_lanes: ["raw_single", "slab"],
    requires_reason_code: true,
    handoff_candidate_after_action: true,
  },
  {
    action: "require_split",
    from_statuses: ["pending", "in_review"],
    to_status: "blocked",
    to_disposition: "review_split_required",
    allowed_evidence_lanes: ["mixed_raw_slab"],
    requires_reason_code: true,
    handoff_candidate_after_action: false,
  },
  {
    action: "block_evidence",
    from_statuses: ["pending", "in_review"],
    to_status: "blocked",
    to_disposition: "review_blocked",
    allowed_review_lanes: ["high_signal_review", "candidate_review", "reference_only_review", "low_signal_monitor"],
    requires_reason_code: true,
    handoff_candidate_after_action: false,
  },
  {
    action: "block_classification",
    from_statuses: ["pending", "in_review"],
    to_status: "blocked",
    to_disposition: "review_blocked_classification",
    allowed_review_lanes: ["classification_review"],
    allowed_evidence_lanes: ["classification_blocked"],
    requires_reason_code: true,
    handoff_candidate_after_action: false,
  },
  {
    action: "request_reclassification",
    from_statuses: ["pending", "in_review"],
    to_status: "blocked",
    to_disposition: "review_reclassify",
    allowed_review_lanes: ["classification_review"],
    requires_reason_code: true,
    handoff_candidate_after_action: false,
  },
  {
    action: "defer_more_evidence",
    from_statuses: ["pending", "in_review"],
    to_status: "resolved",
    to_disposition: "review_defer_more_evidence",
    allowed_review_lanes: ["high_signal_review", "candidate_review", "classification_review", "low_signal_monitor"],
    requires_reason_code: true,
    handoff_candidate_after_action: false,
  },
  {
    action: "reference_crosscheck",
    from_statuses: ["pending", "in_review"],
    to_status: "resolved",
    to_disposition: "review_reference_crosscheck",
    allowed_review_lanes: ["reference_only_review"],
    allowed_evidence_lanes: ["reference_metric"],
    requires_reason_code: true,
    handoff_candidate_after_action: false,
  },
  {
    action: "defer_active_market_evidence",
    from_statuses: ["pending", "in_review"],
    to_status: "resolved",
    to_disposition: "review_defer_active_market_evidence",
    allowed_review_lanes: ["reference_only_review"],
    allowed_evidence_lanes: ["reference_metric"],
    requires_reason_code: true,
    handoff_candidate_after_action: false,
  },
  {
    action: "confirm_monitor_only",
    from_statuses: ["pending", "in_review", "resolved"],
    to_status: "resolved",
    to_disposition: "monitor_only",
    allowed_review_lanes: ["low_signal_monitor"],
    requires_reason_code: false,
    handoff_candidate_after_action: false,
  },
];

const reasonCodes = [
  "approved_internal_raw_single_signal",
  "approved_internal_slab_signal",
  "mixed_raw_slab_requires_split",
  "classification_noise",
  "wrong_identity",
  "unresolved_match_ambiguity",
  "lot_bulk_sealed_proxy_noise",
  "reference_only_no_market_support",
  "low_signal_sample",
  "insufficient_source_independence",
  "stale_signal",
  "special_lane_ambiguous",
  "manual_hold",
];

const readbackSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1 readback SQL.
-- Read-only validation queries for the internal review action workflow plan.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1_DISPOSITION_STATUS'::text as package_id,
  review_status,
  review_disposition,
  count(*)::int as row_count,
  count(*) filter (where publishable or app_visible or market_truth)::int as public_flag_rows
from public.market_evidence_review_dispositions
group by review_status, review_disposition
order by row_count desc, review_status, review_disposition;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1_DASHBOARD_QUEUES'::text as package_id,
  dashboard_queue,
  count(*)::int as row_count,
  count(*) filter (where publication_gate_handoff_candidate)::int as handoff_candidate_rows,
  count(*) filter (where publishable or app_visible or market_truth)::int as public_flag_rows
from public.v_market_evidence_review_dashboard_queue_v1
group by dashboard_queue
order by row_count desc, dashboard_queue;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1_BOUNDARY'::text as package_id,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references,
  (select count(*)::int from public.market_evidence_review_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as disposition_public_flag_rows,
  (select count(*)::int from public.v_market_evidence_review_dashboard_queue_v1 where publishable or app_visible or market_truth) as dashboard_public_flag_rows;
`;

const actionPolicySql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1 action policy candidate.
-- Plan only. This file intentionally contains no DDL and no DML.
-- A later approved package should implement these rules as a service-role-only RPC plus append-only action log.

with allowed_actions(action_name, from_statuses, to_status, to_disposition, requires_reason_code, handoff_candidate_after_action) as (
  values
${actions
  .map(
    (action) =>
      `    ('${action.action}'::text, array[${action.from_statuses.map((status) => `'${status}'`).join(", ")}]::text[], '${action.to_status}'::text, '${action.to_disposition}'::text, ${action.requires_reason_code}::boolean, ${action.handoff_candidate_after_action}::boolean)`,
  )
  .join(",\n")}
)
select *
from allowed_actions
order by action_name;
`;

const dispositionStatus = supabaseReadOnlyQuery(`
select
  review_status,
  review_disposition,
  count(*)::int as row_count,
  count(*) filter (where publishable or app_visible or market_truth)::int as public_flag_rows
from public.market_evidence_review_dispositions
group by review_status, review_disposition
order by row_count desc, review_status, review_disposition;
`);

const dashboardQueues = supabaseReadOnlyQuery(`
select
  dashboard_queue,
  count(*)::int as row_count,
  count(*) filter (where publication_gate_handoff_candidate)::int as handoff_candidate_rows,
  count(*) filter (where publishable or app_visible or market_truth)::int as public_flag_rows
from public.v_market_evidence_review_dashboard_queue_v1
group by dashboard_queue
order by row_count desc, dashboard_queue;
`);

const blockerSummary = supabaseReadOnlyQuery(`
select
  dashboard_queue,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  count(*)::int as row_count
from public.v_market_evidence_review_dashboard_blocker_queue_v1
group by dashboard_queue, review_lane, evidence_lane, review_status, review_disposition
order by row_count desc, dashboard_queue, review_lane, evidence_lane;
`);

const handoffInputs = supabaseReadOnlyQuery(`
select
  count(*)::int as potentially_confirmable_rows,
  count(*) filter (where review_lane = 'high_signal_review')::int as high_signal_rows,
  count(*) filter (where review_lane = 'candidate_review')::int as candidate_rows,
  count(*) filter (where evidence_lane = 'raw_single')::int as raw_single_rows,
  count(*) filter (where evidence_lane = 'slab')::int as slab_rows,
  count(*) filter (where publishable or app_visible or market_truth)::int as public_flag_rows
from public.v_market_evidence_review_dashboard_queue_v1
where review_status in ('pending', 'in_review')
  and review_lane in ('high_signal_review', 'candidate_review')
  and evidence_lane in ('raw_single', 'slab');
`)[0];

const publicBoundary = supabaseReadOnlyQuery(`
select
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from public.ebay_active_prices_latest) as ebay_active_prices_latest_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references,
  (select count(*)::int from public.market_evidence_review_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as disposition_public_flag_rows,
  (select count(*)::int from public.v_market_evidence_review_dashboard_queue_v1 where publishable or app_visible or market_truth) as dashboard_public_flag_rows;
`)[0];

const findings = [];
if (Number(publicBoundary.pricing_observations_count) !== 0) findings.push("pricing_observations_present");
if (Number(publicBoundary.public_pricing_view_references) !== 0) findings.push("public_pricing_view_references_review_models");
if (Number(publicBoundary.disposition_public_flag_rows) !== 0) findings.push("disposition_public_flags_present");
if (Number(publicBoundary.dashboard_public_flag_rows) !== 0) findings.push("dashboard_public_flags_present");

const contractMd = `# MEE Core Internal Review Action Workflow V1

Status: plan only

## Objective

Define the controlled internal action workflow for changing Market Evidence Engine review dispositions without publishing prices or mutating evidence.

This contract covers review actions only. It does not create market truth, app-visible pricing, public pricing views, or public rollups.

## Current Inputs

- Current disposition table: \`market_evidence_review_dispositions\`
- Dashboard queue view: \`v_market_evidence_review_dashboard_queue_v1\`
- Dashboard status summary view: \`v_market_evidence_review_dashboard_status_summary_v1\`
- Dashboard blocker view: \`v_market_evidence_review_dashboard_blocker_queue_v1\`

## Action Model

Every future review action must include:

- \`disposition_id\`
- \`expected_updated_at\` for optimistic locking
- \`action_name\`
- \`review_actor\`
- \`reason_code\` when required
- optional \`review_note\`
- optional \`action_payload\`

Every future implementation must write an append-only action event before or with the current disposition transition.

## Allowed Actions

${actions
  .map(
    (action) => `### ${action.action}

- From statuses: ${action.from_statuses.join(", ")}
- To status: ${action.to_status}
- To disposition: ${action.to_disposition}
- Allowed review lanes: ${(action.allowed_review_lanes ?? ["lane-specific"]).join(", ")}
- Allowed evidence lanes: ${(action.allowed_evidence_lanes ?? ["lane-specific"]).join(", ")}
- Requires reason code: ${action.requires_reason_code}
- Future publication-gate handoff candidate after action: ${action.handoff_candidate_after_action}
`,
  )
  .join("\n")}

## Reason Codes

${reasonCodes.map((code) => `- \`${code}\``).join("\n")}

## Handoff Eligibility

A resolved review may be considered by a future publication gate only when:

- action is \`confirm_internal_candidate\`
- resulting disposition is \`review_confirmed_internal_candidate\`
- resulting status is \`resolved\`
- review lane is \`high_signal_review\` or \`candidate_review\`
- evidence lane is \`raw_single\` or \`slab\`
- raw-single and slab evidence are not mixed
- all public flags remain false
- future publication contract independently checks source independence, recency, outliers, and display rules

This workflow never sets \`publication_gate_candidate\`, \`can_publish_price_directly\`, \`publishable\`, \`app_visible\`, or \`market_truth\` to true.

## Blockers

- mixed raw/slab evidence
- classification-blocked evidence
- reference-only evidence
- unknown evidence lane
- wrong identity
- unresolved match ambiguity
- lot/bulk/sealed/proxy/custom noise
- slab/raw contamination
- stale or insufficiently independent signal

## Required Future Schema

A future implementation should add an append-only service-role-only action table such as \`market_evidence_review_action_events\`.

Required columns:

- \`id\`
- \`disposition_id\`
- \`card_print_id\`
- \`action_name\`
- \`from_status\`
- \`to_status\`
- \`from_disposition\`
- \`to_disposition\`
- \`reason_code\`
- \`review_note\`
- \`action_payload\`
- \`review_actor\`
- \`created_at\`

The current disposition update should be mediated by a service-role-only function with optimistic locking. Direct client updates should not be used.
`;

const planMd = `# MEE Core Internal Review Action Workflow V1

Status: plan only

## Summary

The review dashboard now shows internal queues, but operators still need a controlled way to move each row through review. This package defines that workflow without applying schema, writing rows, or publishing prices.

## Proposed Implementation Phases

1. Add append-only internal action event schema.
2. Add service-role-only action function with optimistic locking.
3. Add read model for action history and current disposition.
4. Build internal review UI on top of dashboard queues.
5. Only after review actions exist, design a separate publication-gate contract.

## Current Audit

- Findings: ${findings.length}
- Potentially confirmable raw/single or slab rows: ${handoffInputs.potentially_confirmable_rows}
- Dashboard queue rows: ${dashboardQueues.reduce((sum, row) => sum + Number(row.row_count), 0)}
- Blocker rows: ${blockerSummary.reduce((sum, row) => sum + Number(row.row_count), 0)}

## Boundary

No remote migration apply, DB writes, provider calls, source fetches, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, deletes, upserts, merges, migrations, or global apply.
`;

const sqlHash = sha256Text(actionPolicySql);
const readbackHash = sha256Text(readbackSql);
const contractHash = sha256Text(contractMd);
const reportPayload = {
  disposition_status: dispositionStatus,
  dashboard_queues: dashboardQueues,
  blocker_summary: blockerSummary,
  handoff_inputs: handoffInputs,
  public_boundary: publicBoundary,
  actions,
  reason_codes: reasonCodes,
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_internal_review_action_workflow",
  package_fingerprint_sha256: sha256Json(reportPayload),
  audit: {
    disposition_status: dispositionStatus,
    dashboard_queues: dashboardQueues,
    blocker_summary: blockerSummary,
    handoff_inputs: handoffInputs,
    public_boundary: publicBoundary,
  },
  action_contract: {
    actions,
    reason_codes: reasonCodes,
    handoff_rules: {
      allowed_actions: ["confirm_internal_candidate"],
      allowed_review_lanes: ["high_signal_review", "candidate_review"],
      allowed_evidence_lanes: ["raw_single", "slab"],
      public_flags_must_remain_false: true,
      publication_gate_candidate_is_not_set_by_this_workflow: true,
    },
  },
  hashes: {
    contract_md_sha256: contractHash,
    action_policy_sql_sha256: sqlHash,
    readback_sql_sha256: readbackHash,
  },
  artifacts: {
    contract_md: "docs/contracts/MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1.md",
    report_json: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}/report.json`,
    report_md: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}.md`,
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1.md",
    action_policy_sql: "docs/sql/mee_core_internal_review_action_workflow_v1_action_policy_candidates.sql",
    readback_sql: "docs/sql/mee_core_internal_review_action_workflow_v1_readback.sql",
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
    "# MEE Core Internal Review Action Workflow V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: plan only, local artifacts only",
    "",
    "## Summary",
    "",
    `- Package: \`${value.package_id}\``,
    `- Fingerprint: \`${value.package_fingerprint_sha256}\``,
    `- Findings: ${value.findings.length}`,
    `- Potentially confirmable rows: ${value.audit.handoff_inputs.potentially_confirmable_rows}`,
    `- Raw-single confirmable rows: ${value.audit.handoff_inputs.raw_single_rows}`,
    `- Slab confirmable rows: ${value.audit.handoff_inputs.slab_rows}`,
    "",
    "## Dashboard Queues",
    "",
    ...value.audit.dashboard_queues.map(
      (row) => `- ${row.dashboard_queue}: ${row.row_count} rows, ${row.handoff_candidate_rows} handoff candidates, ${row.public_flag_rows} public-flag rows`,
    ),
    "",
    "## Boundary",
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
mkdirSync(CONTRACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });

writeFileSync(path.join(CONTRACT_DIR, "MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1.md"), contractMd);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_workflow_v1_action_policy_candidates.sql"), actionPolicySql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_workflow_v1_readback.sql"), readbackSql);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), renderMarkdown(report));
writeFileSync(path.join(PLAN_DIR, "MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1.md"), planMd);

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
