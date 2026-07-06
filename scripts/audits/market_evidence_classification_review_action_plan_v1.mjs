import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1";
const SOURCE_PACKAGE_ID = "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1";
const SOURCE_ROW_MANIFEST_HASH = "a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205";
const ACTION_NAME = "request_reclassification";
const REASON_CODE = "classification_noise";
const REVIEW_ACTOR = "system_classification_review_action_plan";
const REVIEW_NOTE = "MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.";
const EXPECTED_ROWS = 19;

const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const SOURCE_ARTIFACT_DIR = path.join(AUDIT_DIR, SOURCE_PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const SOURCE_ROW_MANIFEST = path.join(SOURCE_ARTIFACT_DIR, "row_manifest.jsonl");
const ROW_MANIFEST = path.join(ARTIFACT_DIR, "row_manifest.jsonl");
const REPORT_JSON = path.join(ARTIFACT_DIR, "report.json");
const REPORT_MD = path.join(AUDIT_DIR, `${PACKAGE_ID}.md`);
const PLAN_MD = path.join(PLAN_DIR, "MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1.md");
const APPLY_SQL_PATH = path.join(SQL_DIR, "mee_core_internal_classification_review_action_plan_v1_apply_candidate.sql");
const ROLLBACK_SQL_PATH = path.join(SQL_DIR, "mee_core_internal_classification_review_action_plan_v1_rollback_candidate.sql");
const READBACK_SQL_PATH = path.join(SQL_DIR, "mee_core_internal_classification_review_action_plan_v1_readback.sql");
const PREFLIGHT_SQL_PATH = path.join(SQL_DIR, "mee_core_internal_classification_review_action_plan_v1_preflight.sql");

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

function parseSupabaseRows(output) {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

function supabaseReadOnlyQuery(sql) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-classification-action-plan-"));
  const tempSql = path.join(tempDir, "query.sql");
  try {
    writeFileSync(tempSql, sql);
    const output = execFileSync("supabase", ["db", "query", "--linked", "-f", tempSql], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 40,
    });
    return parseSupabaseRows(output);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const sourceManifestText = readFileSync(SOURCE_ROW_MANIFEST, "utf8");
const sourceManifestHash = sha256Text(sourceManifestText);
const sourceRows = sourceManifestText.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
const targetIdsSql = sourceRows.map((row) => `${sqlLiteral(row.disposition_id)}::uuid`).join(", ");

const liveRows = supabaseReadOnlyQuery(`
select
  id as disposition_id,
  card_print_id,
  gv_id,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  needs_review,
  updated_at,
  publication_gate_candidate,
  can_publish_price_directly,
  publishable,
  app_visible,
  market_truth
from public.market_evidence_review_dispositions
where id in (${targetIdsSql})
order by gv_id;
`);

const sourceByDispositionId = new Map(sourceRows.map((row) => [row.disposition_id, row]));
const manifestRows = liveRows.map((row, index) => {
  const source = sourceByDispositionId.get(row.disposition_id);
  return {
    package_id: PACKAGE_ID,
    source_package_id: SOURCE_PACKAGE_ID,
    source_row_manifest_sha256: SOURCE_ROW_MANIFEST_HASH,
    row_index: index + 1,
    disposition_id: row.disposition_id,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    expected_updated_at: row.updated_at,
    action_name: ACTION_NAME,
    reason_code: REASON_CODE,
    review_actor: REVIEW_ACTOR,
    review_note: REVIEW_NOTE,
    before: {
      review_lane: row.review_lane,
      evidence_lane: row.evidence_lane,
      review_status: row.review_status,
      review_disposition: row.review_disposition,
      needs_review: row.needs_review,
      publication_gate_candidate: row.publication_gate_candidate,
      can_publish_price_directly: row.can_publish_price_directly,
      publishable: row.publishable,
      app_visible: row.app_visible,
      market_truth: row.market_truth,
    },
    expected_after: {
      review_status: "blocked",
      review_disposition: "review_reclassify",
      needs_review: false,
      publication_gate_candidate: false,
      can_publish_price_directly: false,
      publishable: false,
      app_visible: false,
      market_truth: false,
      action_event_delta: 1,
    },
    source_audit: {
      card: source?.card ?? null,
      evidence: source?.evidence ?? null,
      recommendation: source?.recommendation ?? null,
    },
  };
});

const rowManifestText = `${manifestRows.map((row) => JSON.stringify(row)).join("\n")}\n`;
const rowManifestHash = sha256Text(rowManifestText);

const valuesSql = manifestRows
  .map((row) => `(${sqlLiteral(row.disposition_id)}::uuid, ${sqlLiteral(row.expected_updated_at)}::timestamptz)`)
  .join(",\n    ");

const actionPayload = (row) =>
  JSON.stringify({
    package_id: PACKAGE_ID,
    row_manifest_sha256: rowManifestHash,
    source_package_id: SOURCE_PACKAGE_ID,
    source_row_manifest_sha256: SOURCE_ROW_MANIFEST_HASH,
    row_index: row.row_index,
    target_disposition_id: row.disposition_id,
    action_name: ACTION_NAME,
    plan_only_generated: true,
  });

const applySql = `-- MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1 apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: invoke public.apply_market_evidence_review_action_v1 for classification_review rows only.

begin;

${manifestRows
  .map(
    (row) => `select *
from public.apply_market_evidence_review_action_v1(
  ${sqlLiteral(row.disposition_id)}::uuid,
  ${sqlLiteral(row.expected_updated_at)}::timestamptz,
  ${sqlLiteral(ACTION_NAME)}::text,
  ${sqlLiteral(REVIEW_ACTOR)}::text,
  ${sqlLiteral(REASON_CODE)}::text,
  ${sqlLiteral(REVIEW_NOTE)}::text,
  ${sqlLiteral(actionPayload(row))}::jsonb
);`,
  )
  .join("\n\n")}

commit;
`;

const preflightSql = `-- MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1 preflight SQL.
-- Must return eligible_target_rows = expected_target_rows before apply.

with targets(id, expected_updated_at) as (
  values
    ${valuesSql}
)
select
  'MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1_PREFLIGHT'::text as package_id,
  ${EXPECTED_ROWS}::int as expected_target_rows,
  count(*)::int as eligible_target_rows
from targets
join public.market_evidence_review_dispositions d
  on d.id = targets.id
 and d.updated_at is not distinct from targets.expected_updated_at
where d.review_lane = 'classification_review'
  and d.evidence_lane = 'classification_blocked'
  and d.review_status = 'pending'
  and d.review_disposition = 'review_pending_classification_fix'
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
      and e.action_payload ->> 'package_id' = '${PACKAGE_ID}'
  );
`;

const readbackSql = `-- MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1 readback SQL.
-- Run after approved apply.

with targets(id) as (
  values
    ${manifestRows.map((row) => `(${sqlLiteral(row.disposition_id)}::uuid)`).join(",\n    ")}
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join targets t on t.id = e.disposition_id
  where e.action_name = '${ACTION_NAME}'
    and e.action_payload ->> 'package_id' = '${PACKAGE_ID}'
    and e.action_payload ->> 'row_manifest_sha256' = '${rowManifestHash}'
), target_dispositions as (
  select d.*
  from public.market_evidence_review_dispositions d
  join targets t on t.id = d.id
)
select
  'MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1_READBACK'::text as package_id,
  ${EXPECTED_ROWS}::int as expected_target_rows,
  (select count(*)::int from package_events) as matching_action_event_rows,
  (select count(distinct disposition_id)::int from package_events) as distinct_event_disposition_rows,
  (select count(*)::int from target_dispositions where needs_review = false and review_actor = '${REVIEW_ACTOR}' and review_status = 'blocked' and review_disposition = 'review_reclassify') as updated_target_rows,
  (select count(*)::int from package_events where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as event_public_flag_rows,
  (select count(*)::int from target_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as target_public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references,
  (select count(*)::int from public.market_evidence_review_dispositions d where d.review_lane = 'classification_review' and d.review_status = 'pending' and d.review_disposition = 'review_pending_classification_fix' and d.needs_review = true) as remaining_pending_classification_review_rows;
`;

const rollbackSql = `-- MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1 rollback candidate.
-- Do not execute without explicit approval.
-- Reverts only this package's review action events and target disposition state.

begin;

with targets(id, expected_updated_at) as (
  values
    ${valuesSql}
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join targets t on t.id = e.disposition_id
  where e.action_name = '${ACTION_NAME}'
    and e.action_payload ->> 'package_id' = '${PACKAGE_ID}'
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
  review_disposition = 'review_pending_classification_fix',
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
where d.id = targets.id
  and exists (select 1 from deleted_events de where de.disposition_id = d.id);

commit;
`;

const applySqlHash = sha256Text(applySql);
const preflightSqlHash = sha256Text(preflightSql);
const readbackSqlHash = sha256Text(readbackSql);
const rollbackSqlHash = sha256Text(rollbackSql);

const findings = [];
if (sourceManifestHash !== SOURCE_ROW_MANIFEST_HASH) findings.push("source_row_manifest_hash_mismatch");
if (sourceRows.length !== EXPECTED_ROWS) findings.push("source_row_count_mismatch");
if (liveRows.length !== EXPECTED_ROWS) findings.push("live_target_row_count_mismatch");
if (new Set(liveRows.map((row) => row.disposition_id)).size !== EXPECTED_ROWS) findings.push("duplicate_live_disposition_ids");
for (const row of manifestRows) {
  if (row.before.review_lane !== "classification_review") findings.push(`review_lane_mismatch_${row.disposition_id}`);
  if (row.before.evidence_lane !== "classification_blocked") findings.push(`evidence_lane_mismatch_${row.disposition_id}`);
  if (row.before.review_status !== "pending") findings.push(`review_status_mismatch_${row.disposition_id}`);
  if (row.before.review_disposition !== "review_pending_classification_fix") {
    findings.push(`review_disposition_mismatch_${row.disposition_id}`);
  }
  if (!row.before.needs_review) findings.push(`needs_review_false_${row.disposition_id}`);
  if (
    row.before.publication_gate_candidate ||
    row.before.can_publish_price_directly ||
    row.before.publishable ||
    row.before.app_visible ||
    row.before.market_truth
  ) {
    findings.push(`public_boundary_flag_${row.disposition_id}`);
  }
}

const reportPayload = {
  source_package_id: SOURCE_PACKAGE_ID,
  source_row_manifest_sha256: sourceManifestHash,
  row_manifest_sha256: rowManifestHash,
  row_count: manifestRows.length,
  action_name: ACTION_NAME,
  reason_code: REASON_CODE,
  review_actor: REVIEW_ACTOR,
  target_gv_ids: manifestRows.map((row) => row.gv_id),
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_classification_review_request_reclassification_action",
  package_fingerprint_sha256: sha256Json(reportPayload),
  action_plan: {
    action_name: ACTION_NAME,
    reason_code: REASON_CODE,
    review_actor: REVIEW_ACTOR,
    target_count: manifestRows.length,
    expected_transition: {
      from_status: "pending",
      from_disposition: "review_pending_classification_fix",
      to_status: "blocked",
      to_disposition: "review_reclassify",
    },
    rationale:
      "The rows have active-listing evidence but no safe raw_single/slab classification and no rollup eligibility. They should be sent back to classifier/reprocessing before any high-signal or publication workflow.",
  },
  hashes: {
    source_row_manifest_sha256: sourceManifestHash,
    row_manifest_sha256: rowManifestHash,
    apply_sql_sha256: applySqlHash,
    rollback_sql_sha256: rollbackSqlHash,
    readback_sql_sha256: readbackSqlHash,
    preflight_sql_sha256: preflightSqlHash,
  },
  artifacts: {
    row_manifest: "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1/row_manifest.jsonl",
    report_json: "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1/report.json",
    report_md: "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1.md",
    apply_sql: "docs/sql/mee_core_internal_classification_review_action_plan_v1_apply_candidate.sql",
    rollback_sql: "docs/sql/mee_core_internal_classification_review_action_plan_v1_rollback_candidate.sql",
    readback_sql: "docs/sql/mee_core_internal_classification_review_action_plan_v1_readback.sql",
    preflight_sql: "docs/sql/mee_core_internal_classification_review_action_plan_v1_preflight.sql",
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1.md",
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
    "# MEE Core Internal Classification Review Action Plan V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: plan only",
    "",
    "## Action",
    "",
    `- Action: \`${value.action_plan.action_name}\``,
    `- Reason code: \`${value.action_plan.reason_code}\``,
    `- Review actor: \`${value.action_plan.review_actor}\``,
    `- Target count: \`${value.action_plan.target_count}\``,
    `- Transition: \`${value.action_plan.expected_transition.from_status}/${value.action_plan.expected_transition.from_disposition}\` -> \`${value.action_plan.expected_transition.to_status}/${value.action_plan.expected_transition.to_disposition}\``,
    "",
    "## Rationale",
    "",
    value.action_plan.rationale,
    "",
    "## Hashes",
    "",
    `- Package fingerprint: \`${value.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${value.hashes.row_manifest_sha256}\``,
    `- Apply SQL hash: \`${value.hashes.apply_sql_sha256}\``,
    "",
    "## Findings",
    "",
    value.findings.length === 0 ? "- None" : value.findings.map((finding) => `- ${finding}`).join("\n"),
    "",
  ].join("\n");
}

const planMd = `# MEE Core Internal Classification Review Action Plan V1

Status: plan only

## Purpose

Prepare a controlled review-action apply package for the 19 classification-blocked rows identified by \`MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1\`.

## Proposed Action

Use \`public.apply_market_evidence_review_action_v1\` with:

- action: \`${ACTION_NAME}\`
- reason: \`${REASON_CODE}\`
- actor: \`${REVIEW_ACTOR}\`

This records that the rows need classifier/reprocessing work before they can become rollup eligible. It does not publish pricing, does not create market truth, and does not write pricing observations.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
writeFileSync(ROW_MANIFEST, rowManifestText);
writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD, renderMarkdown(report));
writeFileSync(APPLY_SQL_PATH, applySql);
writeFileSync(ROLLBACK_SQL_PATH, rollbackSql);
writeFileSync(READBACK_SQL_PATH, readbackSql);
writeFileSync(PREFLIGHT_SQL_PATH, preflightSql);
writeFileSync(PLAN_MD, planMd);

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      action_plan: report.action_plan,
      hashes: report.hashes,
      findings: report.findings,
    },
    null,
    2,
  ),
);
