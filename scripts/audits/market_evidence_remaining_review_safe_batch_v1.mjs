import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");

const POLICY_REPORT = "docs/audits/market_evidence_engine_v1/MEE-CORE-REMAINING-REVIEW-LANE-POLICY-V1/report.json";

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

function read(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function parseRows(output) {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

function supabaseReadOnlyQuery(sql) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-remaining-safe-batch-"));
  const tempSql = path.join(tempDir, "query.sql");
  try {
    writeFileSync(tempSql, sql);
    const output = execFileSync("supabase", ["db", "query", "--linked", "-f", tempSql], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 50,
    });
    return parseRows(output);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const policy = readJson(POLICY_REPORT);

const sourceSql = `
select
  id::text as disposition_id,
  card_print_id::text as card_print_id,
  gv_id,
  updated_at::text as expected_updated_at,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  case
    when review_lane in ('candidate_review', 'high_signal_review') and evidence_lane = 'reference_metric'
      then 'defer_more_evidence'
    when review_lane = 'reference_only_review' and evidence_lane = 'reference_metric'
      then 'defer_active_market_evidence'
    when evidence_lane = 'unknown'
      then 'block_evidence'
  end as action_name,
  case
    when review_lane in ('candidate_review', 'high_signal_review') and evidence_lane = 'reference_metric'
      then 'reference_only_no_market_support'
    when review_lane = 'reference_only_review' and evidence_lane = 'reference_metric'
      then 'reference_only_no_market_support'
    when evidence_lane = 'unknown'
      then 'unresolved_match_ambiguity'
  end as reason_code
from public.market_evidence_review_dispositions
where needs_review = true
  and review_status = 'pending'
  and publication_gate_candidate = false
  and can_publish_price_directly = false
  and publishable = false
  and app_visible = false
  and market_truth = false
  and (
    (review_lane in ('candidate_review', 'high_signal_review') and evidence_lane = 'reference_metric')
    or (review_lane = 'reference_only_review' and evidence_lane = 'reference_metric')
    or evidence_lane = 'unknown'
  )
order by review_lane, evidence_lane, gv_id, id;
`;

const sourceRows = supabaseReadOnlyQuery(sourceSql);
const planRows = sourceRows.map((row, index) => ({
  package_id: PACKAGE_ID,
  row_index: index + 1,
  ...row,
  public_pricing_allowed: false,
}));

const expectedTotal = policy.automation.safe_now_after_this_policy.total_rows;
const findings = [];
if (planRows.length !== expectedTotal) {
  findings.push(`expected_${expectedTotal}_rows_but_found_${planRows.length}`);
}
if (planRows.some((row) => !row.action_name || !row.reason_code)) {
  findings.push("missing_action_or_reason_code");
}
if (planRows.some((row) => ["raw_single", "slab", "mixed_raw_slab"].includes(row.evidence_lane))) {
  findings.push("market_candidate_lane_included");
}

const rowManifestText = `${planRows.map((row) => JSON.stringify(row)).join("\n")}\n`;
const rowManifestHash = sha256Text(rowManifestText);
const actionCounts = planRows.reduce((acc, row) => {
  acc[row.action_name] = (acc[row.action_name] ?? 0) + 1;
  return acc;
}, {});

const valuesSql = planRows
  .map(
    (row) =>
      `(${sqlLiteral(row.disposition_id)}::uuid, ${sqlLiteral(row.expected_updated_at)}::timestamptz, ${sqlLiteral(row.action_name)}::text, ${sqlLiteral(row.reason_code)}::text, ${row.row_index}::int)`,
  )
  .join(",\n    ");

function payload(row) {
  return JSON.stringify({
    package_id: PACKAGE_ID,
    row_manifest_sha256: rowManifestHash,
    row_index: row.row_index,
    source_policy_package_id: policy.package_id,
    source_policy_fingerprint: policy.package_fingerprint_sha256,
    no_public_price_claim: true,
  });
}

const applySql = `-- ${PACKAGE_ID} apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: one safe internal remaining-review cleanup batch only.

begin;

${planRows
  .map(
    (row) => `select *
from public.apply_market_evidence_review_action_v1(
  ${sqlLiteral(row.disposition_id)}::uuid,
  ${sqlLiteral(row.expected_updated_at)}::timestamptz,
  ${sqlLiteral(row.action_name)}::text,
  'system_remaining_review_safe_batch'::text,
  ${sqlLiteral(row.reason_code)}::text,
  'MEE remaining review lane policy safe internal cleanup.'::text,
  ${sqlLiteral(payload(row))}::jsonb
);`,
  )
  .join("\n\n")}

commit;
`;

const preflightSql = `-- ${PACKAGE_ID} preflight.
-- Must return eligible_target_rows = expected_target_rows before apply.

with targets(id, expected_updated_at, action_name, reason_code, row_index) as (
  values
    ${valuesSql}
)
select
  '${PACKAGE_ID}_PREFLIGHT'::text as package_id,
  ${planRows.length}::int as expected_target_rows,
  count(*)::int as eligible_target_rows,
  count(*) filter (where d.publication_gate_candidate or d.can_publish_price_directly or d.publishable or d.app_visible or d.market_truth)::int as public_boundary_rows,
  count(*) filter (where t.action_name = 'confirm_internal_candidate')::int as forbidden_confirm_candidate_rows
from targets t
join public.market_evidence_review_dispositions d
  on d.id = t.id
 and d.updated_at is not distinct from t.expected_updated_at
where d.needs_review = true
  and d.review_status = 'pending'
  and (
    (d.review_lane in ('candidate_review', 'high_signal_review') and d.evidence_lane = 'reference_metric' and t.action_name = 'defer_more_evidence')
    or (d.review_lane = 'reference_only_review' and d.evidence_lane = 'reference_metric' and t.action_name = 'defer_active_market_evidence')
    or (d.evidence_lane = 'unknown' and t.action_name = 'block_evidence')
  )
  and not exists (
    select 1
    from public.market_evidence_review_action_events e
    where e.disposition_id = d.id
      and e.action_payload ->> 'package_id' = '${PACKAGE_ID}'
      and e.action_payload ->> 'row_manifest_sha256' = '${rowManifestHash}'
  );
`;

const readbackSql = `-- ${PACKAGE_ID} readback.
-- Run after explicit apply approval.

with targets(id, action_name) as (
  values
    ${planRows.map((row) => `(${sqlLiteral(row.disposition_id)}::uuid, ${sqlLiteral(row.action_name)}::text)`).join(",\n    ")}
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join targets t on t.id = e.disposition_id and t.action_name = e.action_name
  where e.action_payload ->> 'package_id' = '${PACKAGE_ID}'
    and e.action_payload ->> 'row_manifest_sha256' = '${rowManifestHash}'
), target_dispositions as (
  select d.*, t.action_name as expected_action_name
  from public.market_evidence_review_dispositions d
  join targets t on t.id = d.id
)
select
  '${PACKAGE_ID}_READBACK'::text as package_id,
  ${planRows.length}::int as expected_target_rows,
  (select count(*)::int from package_events) as matching_action_event_rows,
  (select count(distinct disposition_id)::int from package_events) as distinct_event_disposition_rows,
  (select count(*)::int from target_dispositions where needs_review = false and review_status in ('resolved', 'blocked')) as updated_target_rows,
  (select count(*)::int from package_events where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as event_public_flag_rows,
  (select count(*)::int from target_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as target_public_flag_rows,
  (select count(*)::int from package_events where action_name = 'confirm_internal_candidate') as forbidden_confirm_candidate_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence%') as public_pricing_view_market_evidence_references;
`;

const rollbackSql = `-- ${PACKAGE_ID} rollback candidate.
-- Do not execute without explicit rollback approval.

begin;

with targets(id, expected_updated_at, action_name, reason_code, row_index) as (
  values
    ${valuesSql}
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join targets t on t.id = e.disposition_id and t.action_name = e.action_name
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
    when d.review_lane = 'reference_only_review' then 'review_pending_reference_only'
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
where d.id = targets.id
  and exists (select 1 from deleted_events de where de.disposition_id = d.id);

commit;
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });

const files = {
  apply: path.join(SQL_DIR, "mee_core_remaining_review_safe_batch_v1_apply_candidate.sql"),
  preflight: path.join(SQL_DIR, "mee_core_remaining_review_safe_batch_v1_preflight.sql"),
  readback: path.join(SQL_DIR, "mee_core_remaining_review_safe_batch_v1_readback.sql"),
  rollback: path.join(SQL_DIR, "mee_core_remaining_review_safe_batch_v1_rollback_candidate.sql"),
};

writeFileSync(path.join(ARTIFACT_DIR, "row_manifest.jsonl"), rowManifestText);
writeFileSync(files.apply, applySql);
writeFileSync(files.preflight, preflightSql);
writeFileSync(files.readback, readbackSql);
writeFileSync(files.rollback, rollbackSql);

const hashes = {
  row_manifest_sha256: rowManifestHash,
  apply_sql_sha256: sha256Text(applySql),
  preflight_sql_sha256: sha256Text(preflightSql),
  readback_sql_sha256: sha256Text(readbackSql),
  rollback_sql_sha256: sha256Text(rollbackSql),
};

const reportBasis = {
  package_id: PACKAGE_ID,
  source_policy_fingerprint: policy.package_fingerprint_sha256,
  target_rows: planRows.length,
  action_counts: actionCounts,
  hashes,
  findings,
};

const report = {
  ...reportBasis,
  generated_at: new Date().toISOString(),
  mode: "plan_only_safe_internal_remaining_review_batch",
  package_fingerprint_sha256: sha256Json(reportBasis),
  batch_status: findings.length === 0 ? "ready_for_single_safe_internal_apply" : "blocked",
  boundary_proof: {
    db_writes: false,
    function_invocation: false,
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
- Status: \`${report.batch_status}\`
- Target rows: \`${report.target_rows}\`

## Action Counts

\`\`\`json
${JSON.stringify(actionCounts, null, 2)}
\`\`\`

## Hashes

\`\`\`json
${JSON.stringify(hashes, null, 2)}
\`\`\`

## Scope

This package is one safe internal cleanup batch only.

It excludes raw/single and slab candidate confirmation.

It does not publish prices and does not create market truth.
`;

const plan = `# ${PACKAGE_ID}

Next step after explicit approval:

1. Run \`docs/sql/mee_core_remaining_review_safe_batch_v1_preflight.sql\`.
2. If it returns \`${planRows.length}\` eligible rows and zero boundary rows, run \`docs/sql/mee_core_remaining_review_safe_batch_v1_apply_candidate.sql\`.
3. Run \`docs/sql/mee_core_remaining_review_safe_batch_v1_readback.sql\`.
4. Run fast post-ingest review readback again.
`;

writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), markdown);
writeFileSync(path.join(PLAN_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), plan);
writeFileSync(path.join(CHECKPOINT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), markdown);

console.log(
  JSON.stringify(
    {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      batch_status: report.batch_status,
      target_rows: report.target_rows,
      action_counts: actionCounts,
      hashes,
      findings,
    },
    null,
    2,
  ),
);
