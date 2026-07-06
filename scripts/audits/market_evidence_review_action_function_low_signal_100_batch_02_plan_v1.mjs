import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1";
const REVIEW_ACTOR = "system_low_signal_100_batch_02_plan";
const ACTION_NAME = "confirm_monitor_only";
const BATCH_SIZE = 100;
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)]));
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

function sqlJsonb(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function sqlTimestamptz(value) {
  return value === null || value === undefined ? "null::timestamptz" : `${sqlLiteral(value)}::timestamptz`;
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

const selectedRows = supabaseReadOnlyQuery(`
select
  d.id,
  d.card_print_id,
  d.gv_id,
  d.review_lane,
  d.evidence_lane,
  d.review_status,
  d.review_disposition,
  d.review_actor,
  d.reviewed_at,
  d.needs_review,
  d.publication_gate_candidate,
  d.can_publish_price_directly,
  d.publishable,
  d.app_visible,
  d.market_truth,
  d.review_payload,
  d.updated_at
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
      and e.action_name = '${ACTION_NAME}'
  )
order by d.id
limit ${BATCH_SIZE};
`);

if (selectedRows.length !== BATCH_SIZE) {
  throw new Error(`Expected ${BATCH_SIZE} eligible rows, found ${selectedRows.length}`);
}

const note = "MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.";
const targets = selectedRows.map((row, index) => ({
  package_id: PACKAGE_ID,
  batch_index: index + 1,
  action_name: ACTION_NAME,
  review_actor: REVIEW_ACTOR,
  reason_code: null,
  review_note: note,
  before: row,
  expected_after: {
    review_status: "resolved",
    review_disposition: "monitor_only",
    needs_review: false,
    publication_gate_candidate: false,
    can_publish_price_directly: false,
    publishable: false,
    app_visible: false,
    market_truth: false,
    action_event_delta: 1,
  },
}));

const rowManifest = targets.map((target) => JSON.stringify(stable(target))).join("\n") + "\n";
const rowManifestHash = sha256Text(rowManifest);

function actionPayload(row, index) {
  return {
    package_id: PACKAGE_ID,
    row_manifest_sha256: rowManifestHash,
    batch_index: index + 1,
    target_disposition_id: row.id,
    action_name: ACTION_NAME,
    plan_only_generated: true,
  };
}

const applyCalls = selectedRows.map((row, index) => `select *
from public.apply_market_evidence_review_action_v1(
  ${sqlLiteral(row.id)}::uuid,
  ${sqlTimestamptz(row.updated_at)},
  ${sqlLiteral(ACTION_NAME)}::text,
  ${sqlLiteral(REVIEW_ACTOR)}::text,
  null::text,
  ${sqlLiteral(note)}::text,
  ${sqlJsonb(actionPayload(row, index))}
);`).join("\n\n");

const applySql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_02_PLAN_V1 apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: invoke public.apply_market_evidence_review_action_v1 exactly 100 times for low_signal_monitor rows.

begin;

${applyCalls}

commit;
`;

const valueRows = selectedRows.map((row) => `    (${sqlLiteral(row.id)}::uuid, ${sqlTimestamptz(row.updated_at)}, ${sqlLiteral(row.review_status)}::text, ${sqlLiteral(row.review_disposition)}::text, ${sqlLiteral(row.review_actor)}::text, ${sqlTimestamptz(row.reviewed_at)}, ${sqlJsonb(row.review_payload)}, ${row.needs_review ? "true" : "false"}::boolean)`).join(",\n");
const targetIds = selectedRows.map((row) => `${sqlLiteral(row.id)}::uuid`).join(", ");

const rollbackSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_02_PLAN_V1 rollback candidate.
-- Do not execute without explicit rollback approval.

begin;

delete from public.market_evidence_review_action_events
where disposition_id in (${targetIds})
  and action_name = '${ACTION_NAME}'
  and action_payload ->> 'package_id' = '${PACKAGE_ID}'
  and action_payload ->> 'row_manifest_sha256' = '${rowManifestHash}'
returning id as deleted_action_event_id;

with before_rows(id, updated_at, review_status, review_disposition, review_actor, reviewed_at, review_payload, needs_review) as (
  values
${valueRows}
)
update public.market_evidence_review_dispositions d
set
  review_status = before_rows.review_status,
  review_disposition = before_rows.review_disposition,
  review_actor = before_rows.review_actor,
  reviewed_at = before_rows.reviewed_at,
  review_payload = before_rows.review_payload,
  needs_review = before_rows.needs_review,
  publication_gate_candidate = false,
  can_publish_price_directly = false,
  publishable = false,
  app_visible = false,
  market_truth = false,
  updated_at = before_rows.updated_at
from before_rows
where d.id = before_rows.id
returning d.id, d.review_status, d.review_disposition, d.review_actor, d.reviewed_at, d.needs_review, d.updated_at;

commit;
`;

const preflightValueRows = selectedRows.map((row) => `    (${sqlLiteral(row.id)}::uuid, ${sqlTimestamptz(row.updated_at)})`).join(",\n");
const targetValues = selectedRows.map((row) => `    (${sqlLiteral(row.id)}::uuid)`).join(",\n");

const preflightSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_02_PLAN_V1 preflight SQL.
-- Must return eligible_target_rows = 100 before apply.

with targets(id, expected_updated_at) as (
  values
${preflightValueRows}
)
select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_02_PLAN_V1_PREFLIGHT'::text as package_id,
  count(*)::int as eligible_target_rows
from targets
join public.market_evidence_review_dispositions d
  on d.id = targets.id
 and d.updated_at is not distinct from targets.expected_updated_at
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
      and e.action_name = '${ACTION_NAME}'
  );
`;

const readbackSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_02_PLAN_V1 readback SQL.
-- Run after approved apply.

with target_ids(id) as (
  values
${targetValues}
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join target_ids t on t.id = e.disposition_id
  where e.action_name = '${ACTION_NAME}'
    and e.action_payload ->> 'package_id' = '${PACKAGE_ID}'
    and e.action_payload ->> 'row_manifest_sha256' = '${rowManifestHash}'
), target_dispositions as (
  select d.*
  from public.market_evidence_review_dispositions d
  join target_ids t on t.id = d.id
)
select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_02_PLAN_V1_READBACK'::text as package_id,
  (select count(*)::int from package_events) as matching_action_event_rows,
  (select count(distinct disposition_id)::int from package_events) as distinct_event_disposition_rows,
  (select count(*)::int from target_dispositions where needs_review = false and review_actor = '${REVIEW_ACTOR}' and review_status = 'resolved' and review_disposition = 'monitor_only') as updated_target_rows,
  (select count(*)::int from package_events where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as event_public_flag_rows,
  (select count(*)::int from target_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as target_public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references;
`;

const applyHash = sha256Text(applySql);
const rollbackHash = sha256Text(rollbackSql);
const readbackHash = sha256Text(readbackSql);
const preflightHash = sha256Text(preflightSql);
const reportPayload = {
  batch: {
    size: BATCH_SIZE,
    action_name: ACTION_NAME,
    review_actor: REVIEW_ACTOR,
    lane: "low_signal_monitor",
    target_disposition_ids: selectedRows.map((row) => row.id),
    target_gv_ids: selectedRows.map((row) => row.gv_id),
  },
  hashes: {
    row_manifest_sha256: rowManifestHash,
    apply_sql_sha256: applyHash,
    rollback_sql_sha256: rollbackHash,
    readback_sql_sha256: readbackHash,
    preflight_sql_sha256: preflightHash,
  },
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_low_signal_100_batch_review_action_function_invoke",
  package_fingerprint_sha256: sha256Json(reportPayload),
  ...reportPayload,
  artifacts: {
    row_manifest: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}/row_manifest.jsonl`,
    apply_sql: "docs/sql/mee_core_internal_review_action_function_low_signal_100_batch_02_v1_apply_candidate.sql",
    rollback_sql: "docs/sql/mee_core_internal_review_action_function_low_signal_100_batch_02_v1_rollback_candidate.sql",
    readback_sql: "docs/sql/mee_core_internal_review_action_function_low_signal_100_batch_02_v1_readback.sql",
    preflight_sql: "docs/sql/mee_core_internal_review_action_function_low_signal_100_batch_02_v1_preflight.sql",
    report_json: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}/report.json`,
    report_md: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}.md`,
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_02_PLAN_V1.md",
  },
  findings: [],
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
    "# MEE Core Internal Review Action Function Low Signal 100 Batch 02 Plan V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: plan only, local artifacts only",
    "",
    "## Batch",
    "",
    `- Size: \`${value.batch.size}\``,
    `- Lane: \`${value.batch.lane}\``,
    `- Action: \`${value.batch.action_name}\``,
    `- Actor: \`${value.batch.review_actor}\``,
    "",
    "## Hashes",
    "",
    `- Package fingerprint: \`${value.package_fingerprint_sha256}\``,
    `- Row manifest: \`${value.hashes.row_manifest_sha256}\``,
    `- Apply SQL: \`${value.hashes.apply_sql_sha256}\``,
    `- Rollback SQL: \`${value.hashes.rollback_sql_sha256}\``,
    `- Readback SQL: \`${value.hashes.readback_sql_sha256}\``,
    `- Preflight SQL: \`${value.hashes.preflight_sql_sha256}\``,
    "",
    "## Boundary",
    "",
    "No DB writes, function invocation, action event inserts, disposition updates, provider calls, source fetches, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, executed deletes, upserts, merges, migrations, or global apply.",
    "",
  ].join("\n");
}

const planMd = `# MEE Core Internal Review Action Function Low Signal 100 Batch 02 Plan V1

Status: plan only

## Objective

Prepare a controlled 100-row invocation package for \`public.apply_market_evidence_review_action_v1\`.

## Selected Action

\`confirm_monitor_only\` against one hundred eligible \`low_signal_monitor\` dispositions.

## Safety

- The apply SQL is not executed by this plan.
- Every function call includes a captured \`expected_updated_at\` optimistic-lock value.
- Every action payload is package-tagged for exact readback and rollback targeting.
- The rollback candidate targets only package-tagged events and captured disposition rows.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });

writeFileSync(path.join(ARTIFACT_DIR, "row_manifest.jsonl"), rowManifest);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), renderMarkdown(report));
writeFileSync(path.join(PLAN_DIR, "MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_02_PLAN_V1.md"), planMd);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_low_signal_100_batch_02_v1_apply_candidate.sql"), applySql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_low_signal_100_batch_02_v1_rollback_candidate.sql"), rollbackSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_low_signal_100_batch_02_v1_readback.sql"), readbackSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_low_signal_100_batch_02_v1_preflight.sql"), preflightSql);

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  batch: report.batch,
  hashes: report.hashes,
  findings: report.findings,
  artifacts: report.artifacts,
}, null, 2));

