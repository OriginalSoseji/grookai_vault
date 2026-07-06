import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-POST-APPLY-AUDIT-V1";
const SOURCE_PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1";
const SOURCE_PACKAGE_FINGERPRINT = "fa48e0f26db2d375b7d26cd557ed225fcf1bfc6d6702bed7a34dc4dd1e235b2a";
const ROW_MANIFEST_HASH = "bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d";
const EXPECTED_ACTION = "confirm_monitor_only";
const EXPECTED_ACTOR = "system_low_signal_100_batch_plan";
const EXPECTED_BATCH_SIZE = 100;

const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const SOURCE_ARTIFACT_DIR = path.join(AUDIT_DIR, SOURCE_PACKAGE_ID);
const SOURCE_ROW_MANIFEST = path.join(SOURCE_ARTIFACT_DIR, "row_manifest.jsonl");

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

function supabaseReadOnlyQuery(sql) {
  let output = "";
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      output = execFileSync("supabase", ["db", "query", "--linked", sql], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 60,
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

const rowManifestText = readFileSync(SOURCE_ROW_MANIFEST, "utf8");
const rowManifestHash = sha256Text(rowManifestText);
const manifestRows = rowManifestText.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
const targetIds = manifestRows.map((row) => row.before.id);
const targetValuesSql = targetIds.map((id) => `(${sqlLiteral(id)}::uuid)`).join(",\n    ");
const targetIdsSql = targetIds.map((id) => `${sqlLiteral(id)}::uuid`).join(", ");

const eventRows = supabaseReadOnlyQuery(`
with target_ids(id) as (
  values
    ${targetValuesSql}
)
select
  e.id,
  e.disposition_id,
  e.card_print_id,
  e.gv_id,
  e.action_name,
  e.from_status,
  e.to_status,
  e.from_disposition,
  e.to_disposition,
  e.review_lane,
  e.evidence_lane,
  e.reason_code,
  e.review_actor,
  e.publication_gate_candidate,
  e.can_publish_price_directly,
  e.publishable,
  e.app_visible,
  e.market_truth,
  e.action_payload,
  e.created_at
from public.market_evidence_review_action_events e
join target_ids t on t.id = e.disposition_id
where e.action_name = '${EXPECTED_ACTION}'
  and e.action_payload ->> 'package_id' = '${SOURCE_PACKAGE_ID}'
  and e.action_payload ->> 'row_manifest_sha256' = '${ROW_MANIFEST_HASH}'
order by (e.action_payload ->> 'batch_index')::int, e.id;
`);

const counts = supabaseReadOnlyQuery(`
with target_ids(id) as (
  values
    ${targetValuesSql}
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join target_ids t on t.id = e.disposition_id
  where e.action_name = '${EXPECTED_ACTION}'
    and e.action_payload ->> 'package_id' = '${SOURCE_PACKAGE_ID}'
    and e.action_payload ->> 'row_manifest_sha256' = '${ROW_MANIFEST_HASH}'
), target_dispositions as (
  select d.*
  from public.market_evidence_review_dispositions d
  join target_ids t on t.id = d.id
), target_dashboard as (
  select q.*
  from public.v_market_evidence_review_dashboard_queue_v1 q
  join target_ids t on t.id = q.disposition_id
)
select
  (select count(*)::int from package_events) as package_event_rows,
  (select count(distinct disposition_id)::int from package_events) as distinct_event_disposition_rows,
  (select count(*)::int from package_events where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as public_flag_event_rows,
  (select count(*)::int from target_dispositions) as target_disposition_rows,
  (select count(*)::int from target_dispositions where needs_review = false and review_actor = '${EXPECTED_ACTOR}' and review_status = 'resolved' and review_disposition = 'monitor_only') as updated_target_rows,
  (select count(*)::int from target_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as public_flag_disposition_rows,
  (select count(*)::int from target_dashboard) as dashboard_rows,
  (select count(*)::int from target_dashboard where needs_review = false) as dashboard_updated_rows,
  (select count(*)::int from target_dashboard where publishable or app_visible or market_truth or publication_gate_handoff_candidate) as public_flag_dashboard_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references;
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
      and e.action_name = '${EXPECTED_ACTION}'
  );
`)[0];

const findings = [];
if (rowManifestHash !== ROW_MANIFEST_HASH) findings.push("source_row_manifest_hash_mismatch");
if (manifestRows.length !== EXPECTED_BATCH_SIZE) findings.push("source_manifest_row_count_mismatch");
if (new Set(targetIds).size !== EXPECTED_BATCH_SIZE) findings.push("source_manifest_duplicate_disposition_ids");
if (eventRows.length !== EXPECTED_BATCH_SIZE) findings.push("package_event_count_not_one_hundred");
if (Number(counts.package_event_rows) !== EXPECTED_BATCH_SIZE) findings.push("package_event_rows_not_one_hundred");
if (Number(counts.distinct_event_disposition_rows) !== EXPECTED_BATCH_SIZE) findings.push("distinct_event_disposition_rows_not_one_hundred");
if (Number(counts.target_disposition_rows) !== EXPECTED_BATCH_SIZE) findings.push("target_disposition_rows_not_one_hundred");
if (Number(counts.updated_target_rows) !== EXPECTED_BATCH_SIZE) findings.push("updated_target_rows_not_one_hundred");
if (Number(counts.dashboard_rows) !== EXPECTED_BATCH_SIZE) findings.push("dashboard_rows_not_one_hundred");
if (Number(counts.dashboard_updated_rows) !== EXPECTED_BATCH_SIZE) findings.push("dashboard_updated_rows_not_one_hundred");
if (Number(counts.public_flag_event_rows) !== 0) findings.push("event_public_flags_present");
if (Number(counts.public_flag_disposition_rows) !== 0) findings.push("disposition_public_flags_present");
if (Number(counts.public_flag_dashboard_rows) !== 0) findings.push("dashboard_public_flags_present");
if (Number(counts.pricing_observations_count) !== 0) findings.push("pricing_observations_present");
if (Number(counts.public_pricing_view_references) !== 0) findings.push("public_pricing_view_references_review_tables");

for (const event of eventRows) {
  if (event.action_name !== EXPECTED_ACTION) findings.push(`event_action_mismatch_${event.disposition_id}`);
  if (event.review_actor !== EXPECTED_ACTOR) findings.push(`event_actor_mismatch_${event.disposition_id}`);
  if (event.from_status !== "resolved" || event.to_status !== "resolved") findings.push(`event_status_transition_mismatch_${event.disposition_id}`);
  if (event.from_disposition !== "monitor_only" || event.to_disposition !== "monitor_only") findings.push(`event_disposition_transition_mismatch_${event.disposition_id}`);
  if (event.action_payload?.package_id !== SOURCE_PACKAGE_ID) findings.push(`event_payload_package_mismatch_${event.disposition_id}`);
  if (event.action_payload?.row_manifest_sha256 !== ROW_MANIFEST_HASH) findings.push(`event_payload_manifest_mismatch_${event.disposition_id}`);
  if (event.publication_gate_candidate || event.can_publish_price_directly || event.publishable || event.app_visible || event.market_truth) {
    findings.push(`event_public_flag_${event.disposition_id}`);
  }
}

const nextBatchRecommendation = {
  recommended_next_batch_size: findings.length === 0 ? Math.min(100, Number(nextBatchCandidates.eligible_low_signal_monitor_rows)) : 0,
  lane: "low_signal_monitor",
  action_name: EXPECTED_ACTION,
  reason: findings.length === 0
    ? "The 100-row batch produced exactly one hundred package events, exactly one hundred target updates, and no pricing/public leakage. Continue with another controlled batch for the remaining eligible low-signal rows."
    : "Do not scale until findings are resolved.",
  eligible_low_signal_monitor_rows: Number(nextBatchCandidates.eligible_low_signal_monitor_rows),
  require_preflight_before_apply: true,
  keep_public_flags_false: true,
};

const readbackSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_POST_APPLY_AUDIT_V1 readback SQL.
-- Read-only audit for the 100-row low_signal_monitor review action batch.

with target_ids(id) as (
  values
    ${targetValuesSql}
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join target_ids t on t.id = e.disposition_id
  where e.action_name = '${EXPECTED_ACTION}'
    and e.action_payload ->> 'package_id' = '${SOURCE_PACKAGE_ID}'
    and e.action_payload ->> 'row_manifest_sha256' = '${ROW_MANIFEST_HASH}'
), target_dispositions as (
  select d.*
  from public.market_evidence_review_dispositions d
  join target_ids t on t.id = d.id
), target_dashboard as (
  select q.*
  from public.v_market_evidence_review_dashboard_queue_v1 q
  join target_ids t on t.id = q.disposition_id
)
select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_POST_APPLY_AUDIT_V1'::text as package_id,
  (select count(*)::int from package_events) as matching_action_event_rows,
  (select count(distinct disposition_id)::int from package_events) as distinct_event_disposition_rows,
  (select count(*)::int from target_dispositions where needs_review = false and review_actor = '${EXPECTED_ACTOR}' and review_status = 'resolved' and review_disposition = 'monitor_only') as updated_target_rows,
  (select count(*)::int from target_dashboard where needs_review = false) as dashboard_updated_rows,
  (select count(*)::int from package_events where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as event_public_flag_rows,
  (select count(*)::int from target_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as disposition_public_flag_rows,
  (select count(*)::int from target_dashboard where publication_gate_handoff_candidate or publishable or app_visible or market_truth) as dashboard_public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references;
`;

const readbackHash = sha256Text(readbackSql);
const reportPayload = {
  source: {
    package_id: SOURCE_PACKAGE_ID,
    package_fingerprint_sha256: SOURCE_PACKAGE_FINGERPRINT,
    row_manifest_sha256: ROW_MANIFEST_HASH,
  },
  counts,
  event_ids: eventRows.map((row) => row.id),
  target_disposition_ids: targetIds,
  target_gv_ids: manifestRows.map((row) => row.before.gv_id),
  next_batch_recommendation: nextBatchRecommendation,
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "run_only_low_signal_100_batch_post_apply_audit_read_only",
  package_fingerprint_sha256: sha256Json(reportPayload),
  source: reportPayload.source,
  audit: {
    package_event_counts: {
      package_event_rows: counts.package_event_rows,
      distinct_event_disposition_rows: counts.distinct_event_disposition_rows,
      public_flag_event_rows: counts.public_flag_event_rows,
    },
    disposition_counts: {
      target_disposition_rows: counts.target_disposition_rows,
      updated_target_rows: counts.updated_target_rows,
      public_flag_disposition_rows: counts.public_flag_disposition_rows,
    },
    dashboard_counts: {
      dashboard_rows: counts.dashboard_rows,
      dashboard_updated_rows: counts.dashboard_updated_rows,
      public_flag_dashboard_rows: counts.public_flag_dashboard_rows,
    },
    boundary: {
      pricing_observations_count: counts.pricing_observations_count,
      public_pricing_view_references: counts.public_pricing_view_references,
    },
    event_ids: reportPayload.event_ids,
    target_disposition_ids: targetIds,
    target_gv_ids: reportPayload.target_gv_ids,
  },
  next_batch_recommendation: nextBatchRecommendation,
  hashes: {
    source_row_manifest_sha256: rowManifestHash,
    readback_sql_sha256: readbackHash,
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
    "# MEE Core Internal Review Action Function Low Signal 100 Batch Post Apply Audit V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: run only, read-only audit",
    "",
    "## Source",
    "",
    `- Source package: \`${value.source.package_id}\``,
    `- Source package fingerprint: \`${value.source.package_fingerprint_sha256}\``,
    `- Source row manifest hash: \`${value.source.row_manifest_sha256}\``,
    "",
    "## Readback",
    "",
    `- Matching action event rows: \`${value.audit.package_event_counts.package_event_rows}\``,
    `- Distinct event disposition rows: \`${value.audit.package_event_counts.distinct_event_disposition_rows}\``,
    `- Updated target disposition rows: \`${value.audit.disposition_counts.updated_target_rows}\``,
    `- Dashboard updated rows: \`${value.audit.dashboard_counts.dashboard_updated_rows}\``,
    `- Event public flag rows: \`${value.audit.package_event_counts.public_flag_event_rows}\``,
    `- Disposition public flag rows: \`${value.audit.disposition_counts.public_flag_disposition_rows}\``,
    `- Dashboard public flag rows: \`${value.audit.dashboard_counts.public_flag_dashboard_rows}\``,
    `- Pricing observation rows: \`${value.audit.boundary.pricing_observations_count}\``,
    `- Public pricing view references: \`${value.audit.boundary.public_pricing_view_references}\``,
    "",
    "## Next Batch Recommendation",
    "",
    `- Recommended next batch size: \`${value.next_batch_recommendation.recommended_next_batch_size}\``,
    `- Eligible low-signal monitor rows remaining: \`${value.next_batch_recommendation.eligible_low_signal_monitor_rows}\``,
    `- Reason: ${value.next_batch_recommendation.reason}`,
    "",
    "## Findings",
    "",
    value.findings.length === 0 ? "- None" : value.findings.map((finding) => `- ${finding}`).join("\n"),
    "",
  ].join("\n");
}

const planMd = `# MEE Core Internal Review Action Function Low Signal 100 Batch Post Apply Audit V1

Status: completed

## Purpose

Audit the 100-row \`low_signal_monitor\` / \`confirm_monitor_only\` batch after apply.

## Result

The batch is clean if the report has no findings, exactly one hundred package action events, exactly one hundred target disposition updates, and zero public/pricing boundary rows.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), renderMarkdown(report));
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_low_signal_100_batch_post_apply_audit_v1_readback.sql"), readbackSql);
writeFileSync(path.join(PLAN_DIR, "MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_POST_APPLY_AUDIT_V1.md"), planMd);

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  source: report.source,
  counts: report.audit,
  next_batch_recommendation: report.next_batch_recommendation,
  hashes: report.hashes,
  findings: report.findings,
}, null, 2));
