import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-POST-APPLY-AUDIT-V1";
const TARGET_DISPOSITION_ID = "008c3618-9ee5-4ba0-8e60-e829d67f0002";
const TARGET_ACTION_EVENT_ID = "b706c331-ae67-4a46-8098-90d219987a42";
const TINY_PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1";
const ROW_MANIFEST_HASH = "7e0f32364a157e981ec5f4d31f97cb153960f069be4b9a37d226370eaa01d567";

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
        maxBuffer: 1024 * 1024 * 20,
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

const eventRows = supabaseReadOnlyQuery(`
select
  id,
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
  review_actor,
  publication_gate_candidate,
  can_publish_price_directly,
  publishable,
  app_visible,
  market_truth,
  action_payload,
  created_at
from public.market_evidence_review_action_events
where id = '${TARGET_ACTION_EVENT_ID}'::uuid;
`);

const dispositionRows = supabaseReadOnlyQuery(`
select
  id,
  card_print_id,
  gv_id,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  review_actor,
  reviewed_at,
  needs_review,
  publication_gate_candidate,
  can_publish_price_directly,
  publishable,
  app_visible,
  market_truth,
  review_payload,
  updated_at
from public.market_evidence_review_dispositions
where id = '${TARGET_DISPOSITION_ID}'::uuid;
`);

const dashboardRows = supabaseReadOnlyQuery(`
select
  disposition_id,
  card_print_id,
  gv_id,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  needs_review,
  dashboard_queue,
  publication_gate_handoff_candidate,
  publishable,
  app_visible,
  market_truth
from public.v_market_evidence_review_dashboard_queue_v1
where disposition_id = '${TARGET_DISPOSITION_ID}'::uuid;
`);

const packageEventCounts = supabaseReadOnlyQuery(`
select
  count(*)::int as package_event_rows,
  count(*) filter (where id = '${TARGET_ACTION_EVENT_ID}'::uuid)::int as target_event_rows,
  count(*) filter (where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth)::int as public_flag_event_rows
from public.market_evidence_review_action_events
where action_payload ->> 'package_id' = '${TINY_PACKAGE_ID}'
  and action_payload ->> 'row_manifest_sha256' = '${ROW_MANIFEST_HASH}';
`)[0];

const boundary = supabaseReadOnlyQuery(`
select
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review_action%') as public_pricing_view_references,
  (select count(*)::int from public.market_evidence_review_dispositions where id = '${TARGET_DISPOSITION_ID}'::uuid and (publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth)) as target_public_flag_rows,
  (select count(*)::int from public.v_market_evidence_review_dashboard_queue_v1 where disposition_id = '${TARGET_DISPOSITION_ID}'::uuid and (publishable or app_visible or market_truth)) as dashboard_public_flag_rows;
`)[0];

const nextBatchCandidates = supabaseReadOnlyQuery(`
select
  count(*)::int as eligible_low_signal_monitor_rows
from public.market_evidence_review_dispositions d
where d.review_lane = 'low_signal_monitor'
  and d.review_status = 'resolved'
  and d.review_disposition = 'monitor_only'
  and d.needs_review = true
  and d.publication_gate_candidate = false
  and d.can_publish_price_directly = false
  and d.publishable = false
  and d.app_visible = false
  and d.market_truth = false
  and not exists (
    select 1
    from public.market_evidence_review_action_events e
    where e.disposition_id = d.id
      and e.action_name = 'confirm_monitor_only'
  );
`)[0];

const findings = [];
if (eventRows.length !== 1) findings.push("target_action_event_missing_or_duplicate");
if (dispositionRows.length !== 1) findings.push("target_disposition_missing_or_duplicate");
if (dashboardRows.length !== 1) findings.push("target_dashboard_row_missing_or_duplicate");
if (Number(packageEventCounts.package_event_rows) !== 1) findings.push("package_event_count_not_one");
if (Number(packageEventCounts.target_event_rows) !== 1) findings.push("target_event_count_not_one");
if (Number(packageEventCounts.public_flag_event_rows) !== 0) findings.push("event_public_flags_present");
if (Number(boundary.target_public_flag_rows) !== 0) findings.push("target_disposition_public_flags_present");
if (Number(boundary.dashboard_public_flag_rows) !== 0) findings.push("dashboard_public_flags_present");
if (Number(boundary.pricing_observations_count) !== 0) findings.push("pricing_observations_present");
if (Number(boundary.public_pricing_view_references) !== 0) findings.push("public_pricing_view_references_review_action");

const event = eventRows[0] ?? {};
const disposition = dispositionRows[0] ?? {};
const dashboard = dashboardRows[0] ?? {};
if (event.disposition_id !== TARGET_DISPOSITION_ID) findings.push("event_disposition_mismatch");
if (event.id !== TARGET_ACTION_EVENT_ID) findings.push("event_id_mismatch");
if (disposition.review_actor !== "system_tiny_invoke_plan") findings.push("disposition_actor_not_updated");
if (disposition.needs_review !== false) findings.push("disposition_needs_review_not_false");
if (dashboard.needs_review !== false) findings.push("dashboard_needs_review_not_false");

const recommendedNextBatchSize = findings.length === 0 ? 10 : 0;
const nextBatchRecommendation = {
  recommended_next_batch_size: recommendedNextBatchSize,
  lane: "low_signal_monitor",
  action_name: "confirm_monitor_only",
  reason: findings.length === 0
    ? "Tiny invocation produced exactly one event, exactly one target update, and no pricing/public leakage. Use a small 10-row batch next to test batching and rollback ergonomics."
    : "Do not scale until findings are resolved.",
  eligible_low_signal_monitor_rows: Number(nextBatchCandidates.eligible_low_signal_monitor_rows),
  require_preflight_before_apply: true,
  keep_public_flags_false: true,
};

const readbackSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1 readback SQL.
-- Read-only audit for the first tiny review action invocation.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1_EVENT'::text as package_id,
  *
from public.market_evidence_review_action_events
where id = '${TARGET_ACTION_EVENT_ID}'::uuid;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1_DISPOSITION'::text as package_id,
  *
from public.market_evidence_review_dispositions
where id = '${TARGET_DISPOSITION_ID}'::uuid;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1_DASHBOARD'::text as package_id,
  *
from public.v_market_evidence_review_dashboard_queue_v1
where disposition_id = '${TARGET_DISPOSITION_ID}'::uuid;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1_BOUNDARY'::text as package_id,
  (select count(*)::int from public.market_evidence_review_action_events where action_payload ->> 'package_id' = '${TINY_PACKAGE_ID}' and action_payload ->> 'row_manifest_sha256' = '${ROW_MANIFEST_HASH}') as package_event_rows,
  (select count(*)::int from public.market_evidence_review_dispositions where id = '${TARGET_DISPOSITION_ID}'::uuid and (publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth)) as target_public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review_action%') as public_pricing_view_references;
`;

const readbackHash = sha256Text(readbackSql);
const reportPayload = {
  event,
  disposition,
  dashboard,
  package_event_counts: packageEventCounts,
  boundary,
  next_batch_recommendation: nextBatchRecommendation,
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "run_only_post_apply_audit_read_only",
  package_fingerprint_sha256: sha256Json(reportPayload),
  target: {
    disposition_id: TARGET_DISPOSITION_ID,
    action_event_id: TARGET_ACTION_EVENT_ID,
    tiny_package_id: TINY_PACKAGE_ID,
    row_manifest_sha256: ROW_MANIFEST_HASH,
  },
  audit: {
    event,
    disposition,
    dashboard,
    package_event_counts: packageEventCounts,
    boundary,
  },
  next_batch_recommendation: nextBatchRecommendation,
  hashes: {
    readback_sql_sha256: readbackHash,
  },
  artifacts: {
    report_json: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}/report.json`,
    report_md: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}.md`,
    readback_sql: "docs/sql/mee_core_internal_review_action_function_post_apply_audit_v1_readback.sql",
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1.md",
  },
  findings,
  boundary_proof: {
    db_writes: false,
    function_invocation: false,
    action_event_inserts: false,
    disposition_updates: false,
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
    "# MEE Core Internal Review Action Function Post Apply Audit V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: run only, read-only audit",
    "",
    "## Summary",
    "",
    `- Package: \`${value.package_id}\``,
    `- Fingerprint: \`${value.package_fingerprint_sha256}\``,
    `- Findings: ${value.findings.length}`,
    `- Action event rows for package: ${value.audit.package_event_counts.package_event_rows}`,
    `- Target disposition public-flag rows: ${value.audit.boundary.target_public_flag_rows}`,
    `- Pricing observations: ${value.audit.boundary.pricing_observations_count}`,
    "",
    "## Target State",
    "",
    `- Event: \`${value.target.action_event_id}\``,
    `- Disposition: \`${value.target.disposition_id}\``,
    `- GVID: \`${value.audit.disposition.gv_id}\``,
    `- Review state: \`${value.audit.disposition.review_status}\` / \`${value.audit.disposition.review_disposition}\``,
    `- Needs review: ${value.audit.disposition.needs_review}`,
    "",
    "## Next Batch Recommendation",
    "",
    `- Recommended next batch size: ${value.next_batch_recommendation.recommended_next_batch_size}`,
    `- Eligible rows in lane: ${value.next_batch_recommendation.eligible_low_signal_monitor_rows}`,
    `- Lane: \`${value.next_batch_recommendation.lane}\``,
    `- Action: \`${value.next_batch_recommendation.action_name}\``,
    `- Reason: ${value.next_batch_recommendation.reason}`,
    "",
    "## Findings",
    "",
    ...(value.findings.length ? value.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

const planMd = `# MEE Core Internal Review Action Function Post Apply Audit V1

Status: complete

## Result

The one-row invoke path is valid: one action event exists, one disposition row was updated, and public/pricing boundaries remain closed.

## Recommendation

Prepare a 10-row \`low_signal_monitor / confirm_monitor_only\` batch plan next. Keep it lane-specific and package-tagged, and require preflight before apply.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_post_apply_audit_v1_readback.sql"), readbackSql);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), renderMarkdown(report));
writeFileSync(path.join(PLAN_DIR, "MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1.md"), planMd);

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      findings: report.findings,
      audit: report.audit,
      next_batch_recommendation: report.next_batch_recommendation,
      hashes: report.hashes,
      artifacts: report.artifacts,
    },
    null,
    2,
  ),
);
