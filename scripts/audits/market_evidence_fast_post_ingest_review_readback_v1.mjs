import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { marketEvidenceQueryRows } from "../lib/market_evidence_db_query_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-FAST-POST-INGEST-REVIEW-READBACK-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const REPORT_JSON = path.join(ARTIFACT_DIR, "report.json");
const REPORT_MD = path.join(AUDIT_DIR, `${PACKAGE_ID}.md`);
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`);
const PLAN_MD = path.join(PLAN_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`);
const SQL_PATH = path.join(SQL_DIR, "mee_core_fast_post_ingest_review_readback_v1.sql");

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

const readbackSql = `-- MEE_CORE_FAST_POST_INGEST_REVIEW_READBACK_V1
-- Fast daily review readback. Uses disposition/action tables only.
-- No provider calls, no writes, no public pricing, no heavy evidence summary joins.

with status_rows as (
  select
    review_lane,
    evidence_lane,
    review_status,
    review_disposition,
    needs_review,
    count(*)::int as rows
  from public.market_evidence_review_dispositions
  group by 1,2,3,4,5
), public_boundary as (
  select
    count(*) filter (where publication_gate_candidate)::int as publication_gate_candidate_rows,
    count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where market_truth)::int as market_truth_rows
  from public.market_evidence_review_dispositions
), object_counts as (
  select
    (select count(*)::int from public.market_evidence_observations) as lifecycle_observation_rows,
    (select count(*)::int from public.market_evidence_lifecycle_events) as lifecycle_event_rows,
    (select count(*)::int from public.market_evidence_review_dispositions) as review_disposition_rows,
    (select count(*)::int from public.market_evidence_review_action_events) as review_action_event_rows,
    (select count(*)::int from public.pricing_observations) as pricing_observations_count,
    (
      select count(*)::int
      from pg_views
      where schemaname = 'public'
        and viewname = 'v_card_pricing_ui_v1'
        and definition ilike '%market_evidence%'
    ) as public_pricing_view_market_evidence_references
)
select
  '${PACKAGE_ID}'::text as package_id,
  (select jsonb_agg(to_jsonb(status_rows) order by review_lane, evidence_lane, review_status, review_disposition, needs_review) from status_rows) as current_status,
  (select to_jsonb(public_boundary) from public_boundary) as public_boundary,
  (select to_jsonb(object_counts) from object_counts) as object_counts;
`;

function keyFor(row) {
  return `${row.review_lane}:${row.evidence_lane}:${row.review_status}:${row.review_disposition}:needs_review=${row.needs_review}`;
}

function rowCount(rows, predicate) {
  return rows.filter(predicate).reduce((sum, row) => sum + Number(row.rows), 0);
}

function deriveSummary(currentStatus) {
  const remainingSafeInternalActions = rowCount(
    currentStatus,
    (row) =>
      row.needs_review === true &&
      row.evidence_lane === "mixed_raw_slab" &&
      ["pending", "in_review"].includes(row.review_status) &&
      ["candidate_review", "high_signal_review"].includes(row.review_lane),
  );
  const reviewerCandidateRows = rowCount(
    currentStatus,
    (row) =>
      row.needs_review === true &&
      row.review_status === "pending" &&
      ["candidate_review", "high_signal_review"].includes(row.review_lane) &&
      ["raw_single", "slab"].includes(row.evidence_lane),
  );
  const referencePolicyHoldRows = rowCount(
    currentStatus,
    (row) =>
      row.needs_review === true &&
      row.review_status === "pending" &&
      row.evidence_lane === "reference_metric",
  );
  const unknownEvidenceRows = rowCount(
    currentStatus,
    (row) =>
      row.needs_review === true &&
      row.review_status === "pending" &&
      row.evidence_lane === "unknown",
  );
  const splitRequiredRows = rowCount(
    currentStatus,
    (row) => row.review_status === "blocked" && row.review_disposition === "review_split_required",
  );
  const classificationBlockedRows = rowCount(
    currentStatus,
    (row) => row.review_status === "blocked" && row.review_disposition === "review_reclassify",
  );
  const monitorResolvedRows = rowCount(
    currentStatus,
    (row) => row.review_status === "resolved" && row.review_disposition === "monitor_only",
  );

  return {
    remaining_safe_internal_action_rows: remainingSafeInternalActions,
    reviewer_candidate_rows: reviewerCandidateRows,
    reference_policy_hold_rows: referencePolicyHoldRows,
    unknown_evidence_rows: unknownEvidenceRows,
    split_required_rows: splitRequiredRows,
    classification_blocked_rows: classificationBlockedRows,
    monitor_resolved_rows: monitorResolvedRows,
    next_recommendation:
      remainingSafeInternalActions === 0
        ? "No safe internal review batch remains. Next work is policy/manual review handling for candidate, reference, and unknown evidence lanes."
        : "A safe internal require_split batch remains and should be packaged before manual review work.",
  };
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(row[column.key] ?? "")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
writeFileSync(SQL_PATH, readbackSql);

const readback = (await marketEvidenceQueryRows(readbackSql))[0];
const currentStatus = readback.current_status ?? [];
const summary = deriveSummary(currentStatus);
const publicBoundary = readback.public_boundary ?? {};
const objectCounts = readback.object_counts ?? {};
const findings = [];

for (const [key, value] of Object.entries(publicBoundary)) {
  if (Number(value) !== 0) findings.push(`public_boundary_${key}_present`);
}
if (Number(objectCounts.pricing_observations_count) !== 0) findings.push("pricing_observations_present");
if (Number(objectCounts.public_pricing_view_market_evidence_references) !== 0) {
  findings.push("public_pricing_view_references_market_evidence");
}

const reportBasis = {
  package_id: PACKAGE_ID,
  current_status: currentStatus,
  public_boundary: publicBoundary,
  object_counts: objectCounts,
  summary,
  findings,
  sql_sha256: sha256Text(readbackSql),
};

const report = {
  ...reportBasis,
  generated_at: new Date().toISOString(),
  mode: "read_only_fast_post_ingest_review_readback",
  package_fingerprint_sha256: sha256Json(reportBasis),
  boundary_proof: {
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

const statusTable = markdownTable(currentStatus, [
  { key: "review_lane", label: "review_lane" },
  { key: "evidence_lane", label: "evidence_lane" },
  { key: "review_status", label: "status" },
  { key: "review_disposition", label: "disposition" },
  { key: "needs_review", label: "needs_review" },
  { key: "rows", label: "rows" },
]);

const reportMd = `# ${PACKAGE_ID}

## Result

- Package fingerprint: \`${report.package_fingerprint_sha256}\`
- SQL hash: \`${report.sql_sha256}\`
- Findings: \`${findings.length}\`

## Summary

- Remaining safe internal action rows: \`${summary.remaining_safe_internal_action_rows}\`
- Reviewer candidate rows: \`${summary.reviewer_candidate_rows}\`
- Reference policy hold rows: \`${summary.reference_policy_hold_rows}\`
- Unknown evidence rows: \`${summary.unknown_evidence_rows}\`
- Split required rows: \`${summary.split_required_rows}\`
- Classification blocked rows: \`${summary.classification_blocked_rows}\`
- Monitor resolved rows: \`${summary.monitor_resolved_rows}\`

## Public Boundary

\`\`\`json
${JSON.stringify(publicBoundary, null, 2)}
\`\`\`

## Current Status

${statusTable}

## Next Recommendation

${summary.next_recommendation}
`;

const checkpointMd = `# ${PACKAGE_ID}

The default post-ingest review check should use this fast readback before any heavy row-manifest audit.

Why: the older detailed orchestrator can time out because it joins dashboard and signal summary views. This readback answers the daily operational question from \`market_evidence_review_dispositions\` first.

The readback is internal-only and does not publish prices.

Current result:

- Remaining safe internal action rows: \`${summary.remaining_safe_internal_action_rows}\`
- Reviewer candidate rows: \`${summary.reviewer_candidate_rows}\`
- Reference policy hold rows: \`${summary.reference_policy_hold_rows}\`
- Unknown evidence rows: \`${summary.unknown_evidence_rows}\`
- Public/app-visible/market-truth rows: \`0\`
`;

const planMd = `# ${PACKAGE_ID}

Use this as the daily first-pass MEE review command.

1. Run \`node scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs\`.
2. If \`remaining_safe_internal_action_rows > 0\`, package one safe internal action batch.
3. If \`remaining_safe_internal_action_rows = 0\`, do not regenerate micro apply packages. Move to manual/policy lanes.
4. Do not use the heavy post-ingest orchestrator unless a detailed per-row manifest is required.
5. Stop immediately if public boundary counts are nonzero.
`;

writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD, reportMd);
writeFileSync(CHECKPOINT_MD, checkpointMd);
writeFileSync(PLAN_MD, planMd);

console.log(
  JSON.stringify(
    {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      summary,
      public_boundary: publicBoundary,
      findings,
    },
    null,
    2,
  ),
);
