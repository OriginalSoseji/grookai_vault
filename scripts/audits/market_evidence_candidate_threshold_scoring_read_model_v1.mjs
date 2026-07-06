import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-CANDIDATE-THRESHOLD-SCORING-READ-MODEL-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");
const CONTRACT_DIR = path.join(REPO_ROOT, "docs", "contracts");

const THRESHOLD_CONTRACT_REPORT =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-CANDIDATE-REVIEW-THRESHOLD-CONTRACT-V1/report.json";

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

function parseRows(output) {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

function supabaseReadOnlyQuery(sql) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-candidate-score-"));
  const tempSql = path.join(tempDir, "query.sql");
  try {
    writeFileSync(tempSql, sql);
    const output = execFileSync("supabase", ["db", "query", "--linked", "-f", tempSql], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
    });
    return parseRows(output);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function read(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(row[column.key] ?? "")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

const thresholdContract = readJson(THRESHOLD_CONTRACT_REPORT);

const viewCandidateSql = `-- ${PACKAGE_ID} local view candidate.
-- Internal-only scoring read model. Do not remotely apply without explicit schema approval.
-- This view is intentionally not app-visible and does not write/publicize pricing.

create or replace view public.v_market_evidence_candidate_threshold_scores_v1 as
with candidate_rows as (
  select
    d.id as disposition_id,
    d.card_print_id,
    d.gv_id,
    d.review_lane,
    d.evidence_lane,
    d.review_status,
    d.review_disposition,
    d.needs_review,
    (d.evidence_summary->>'evidence_count')::int as evidence_count,
    (d.evidence_summary->>'rollup_eligible_count')::int as rollup_eligible_count,
    (d.evidence_summary->>'quality_flag_count')::int as quality_flag_count,
    (d.evidence_summary->>'exclusion_flag_count')::int as exclusion_flag_count,
    (d.evidence_summary->>'raw_single_count')::int as raw_single_count,
    (d.evidence_summary->>'slab_count')::int as slab_count,
    (d.source_mix->>'source_family_count')::int as source_family_count,
    (d.source_mix->>'active_listing_evidence_count')::int as active_listing_evidence_count,
    d.publication_gate_candidate,
    d.can_publish_price_directly,
    d.publishable,
    d.app_visible,
    d.market_truth,
    d.updated_at
  from public.market_evidence_review_dispositions d
  where d.needs_review = true
    and d.review_status = 'pending'
    and d.evidence_lane in ('raw_single', 'slab')
), scored as (
  select
    *,
    case
      when evidence_lane = 'raw_single' and review_lane = 'high_signal_review' then rollup_eligible_count >= 3
      else rollup_eligible_count >= 5
    end as passes_rollup_floor,
    source_family_count >= 2 as passes_source_family_floor,
    quality_flag_count = 0 as passes_quality_floor,
    exclusion_flag_count = 0 as passes_exclusion_floor,
    not (publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as passes_public_boundary,
    case
      when evidence_lane = 'slab' then 'slab'
      when review_lane = 'high_signal_review' then 'high_signal_raw_single'
      else 'raw_single'
    end as threshold_lane
  from candidate_rows
)
select
  disposition_id,
  card_print_id,
  gv_id,
  review_lane,
  evidence_lane,
  threshold_lane,
  evidence_count,
  rollup_eligible_count,
  quality_flag_count,
  exclusion_flag_count,
  raw_single_count,
  slab_count,
  source_family_count,
  active_listing_evidence_count,
  passes_rollup_floor,
  passes_source_family_floor,
  passes_quality_floor,
  passes_exclusion_floor,
  passes_public_boundary,
  (
    (case when passes_rollup_floor then 1 else 0 end) +
    (case when passes_source_family_floor then 1 else 0 end) +
    (case when passes_quality_floor then 1 else 0 end) +
    (case when passes_exclusion_floor then 1 else 0 end) +
    (case when passes_public_boundary then 1 else 0 end)
  )::int as threshold_score,
  case
    when not passes_public_boundary then 'blocked_public_boundary'
    when not passes_quality_floor then 'blocked_quality_flags'
    when not passes_source_family_floor then 'needs_independent_source'
    when not passes_rollup_floor then 'needs_more_eligible_evidence'
    when not passes_exclusion_floor then 'manual_review_exclusion_flags'
    else 'threshold_ready_manual_review'
  end as threshold_bucket,
  false as can_auto_confirm_internal_candidate,
  false as publishable,
  false as app_visible,
  false as market_truth,
  updated_at
from scored;

revoke all on public.v_market_evidence_candidate_threshold_scores_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_candidate_threshold_scores_v1 to service_role;
`;

const scoringReadbackSql = `-- ${PACKAGE_ID} readback.
-- Read-only inline scoring equivalent of v_market_evidence_candidate_threshold_scores_v1.

with candidate_rows as (
  select
    d.id as disposition_id,
    d.card_print_id,
    d.gv_id,
    d.review_lane,
    d.evidence_lane,
    d.review_status,
    d.review_disposition,
    d.needs_review,
    (d.evidence_summary->>'evidence_count')::int as evidence_count,
    (d.evidence_summary->>'rollup_eligible_count')::int as rollup_eligible_count,
    (d.evidence_summary->>'quality_flag_count')::int as quality_flag_count,
    (d.evidence_summary->>'exclusion_flag_count')::int as exclusion_flag_count,
    (d.evidence_summary->>'raw_single_count')::int as raw_single_count,
    (d.evidence_summary->>'slab_count')::int as slab_count,
    (d.source_mix->>'source_family_count')::int as source_family_count,
    (d.source_mix->>'active_listing_evidence_count')::int as active_listing_evidence_count,
    d.publication_gate_candidate,
    d.can_publish_price_directly,
    d.publishable,
    d.app_visible,
    d.market_truth
  from public.market_evidence_review_dispositions d
  where d.needs_review = true
    and d.review_status = 'pending'
    and d.evidence_lane in ('raw_single', 'slab')
), scored as (
  select
    *,
    case
      when evidence_lane = 'raw_single' and review_lane = 'high_signal_review' then rollup_eligible_count >= 3
      else rollup_eligible_count >= 5
    end as passes_rollup_floor,
    source_family_count >= 2 as passes_source_family_floor,
    quality_flag_count = 0 as passes_quality_floor,
    exclusion_flag_count = 0 as passes_exclusion_floor,
    not (publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as passes_public_boundary,
    case
      when evidence_lane = 'slab' then 'slab'
      when review_lane = 'high_signal_review' then 'high_signal_raw_single'
      else 'raw_single'
    end as threshold_lane
  from candidate_rows
), final_scores as (
  select
    *,
    (
      (case when passes_rollup_floor then 1 else 0 end) +
      (case when passes_source_family_floor then 1 else 0 end) +
      (case when passes_quality_floor then 1 else 0 end) +
      (case when passes_exclusion_floor then 1 else 0 end) +
      (case when passes_public_boundary then 1 else 0 end)
    )::int as threshold_score,
    case
      when not passes_public_boundary then 'blocked_public_boundary'
      when not passes_quality_floor then 'blocked_quality_flags'
      when not passes_source_family_floor then 'needs_independent_source'
      when not passes_rollup_floor then 'needs_more_eligible_evidence'
      when not passes_exclusion_floor then 'manual_review_exclusion_flags'
      else 'threshold_ready_manual_review'
    end as threshold_bucket,
    false as can_auto_confirm_internal_candidate,
    false as score_publishable,
    false as score_app_visible,
    false as score_market_truth
  from scored
), bucket_summary as (
  select threshold_lane, threshold_bucket, count(*)::int as rows
  from final_scores
  group by 1,2
), score_summary as (
  select threshold_lane, threshold_score, count(*)::int as rows
  from final_scores
  group by 1,2
), boundary as (
  select
    count(*) filter (where can_auto_confirm_internal_candidate)::int as auto_confirm_rows,
    count(*) filter (where score_publishable or score_app_visible or score_market_truth)::int as score_public_flag_rows,
    count(*) filter (where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth)::int as source_public_flag_rows
  from final_scores
)
select
  '${PACKAGE_ID}'::text as package_id,
  (select count(*)::int from final_scores) as candidate_rows,
  (select jsonb_agg(to_jsonb(bucket_summary) order by threshold_lane, threshold_bucket) from bucket_summary) as bucket_summary,
  (select jsonb_agg(to_jsonb(score_summary) order by threshold_lane, threshold_score) from score_summary) as score_summary,
  (select to_jsonb(boundary) from boundary) as boundary;
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });
mkdirSync(CONTRACT_DIR, { recursive: true });

const readback = supabaseReadOnlyQuery(scoringReadbackSql)[0];
const bucketSummary = readback.bucket_summary ?? [];
const scoreSummary = readback.score_summary ?? [];
const boundary = readback.boundary ?? {};

const findings = [];
if (Number(readback.candidate_rows) !== thresholdContract.total_candidate_rows) {
  findings.push(`candidate_row_mismatch_${readback.candidate_rows}_vs_${thresholdContract.total_candidate_rows}`);
}
for (const [key, value] of Object.entries(boundary)) {
  if (Number(value) !== 0) findings.push(`boundary_${key}_present`);
}
if (!bucketSummary.some((row) => row.threshold_bucket === "blocked_quality_flags")) {
  findings.push("expected_quality_flag_block_bucket_missing");
}

const reportBasis = {
  package_id: PACKAGE_ID,
  source_threshold_contract_fingerprint: thresholdContract.package_fingerprint_sha256,
  candidate_rows: Number(readback.candidate_rows),
  bucket_summary: bucketSummary,
  score_summary: scoreSummary,
  boundary,
  findings,
  view_candidate_sql_sha256: sha256Text(viewCandidateSql),
  readback_sql_sha256: sha256Text(scoringReadbackSql),
};

const report = {
  ...reportBasis,
  generated_at: new Date().toISOString(),
  mode: "plan_only_internal_scoring_read_model_candidate",
  package_fingerprint_sha256: sha256Json(reportBasis),
  read_model_status: findings.length === 0 ? "candidate_ready_no_remote_apply" : "blocked",
  boundary_proof: {
    db_writes: false,
    remote_migration_apply: false,
    provider_calls: false,
    source_fetches: false,
    confirm_internal_candidate_actions: false,
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

const bucketTable = markdownTable(bucketSummary, [
  { key: "threshold_lane", label: "threshold_lane" },
  { key: "threshold_bucket", label: "bucket" },
  { key: "rows", label: "rows" },
]);

const scoreTable = markdownTable(scoreSummary, [
  { key: "threshold_lane", label: "threshold_lane" },
  { key: "threshold_score", label: "score" },
  { key: "rows", label: "rows" },
]);

const markdown = `# ${PACKAGE_ID}

## Status

- Package fingerprint: \`${report.package_fingerprint_sha256}\`
- Status: \`${report.read_model_status}\`
- Candidate rows scored: \`${report.candidate_rows}\`

## Bucket Summary

${bucketTable}

## Score Summary

${scoreTable}

## Boundary

This read model candidate cannot confirm candidates, publish prices, or create market truth.

\`\`\`json
${JSON.stringify(boundary, null, 2)}
\`\`\`
`;

const plan = `# ${PACKAGE_ID}

Next step:

1. Review \`docs/sql/mee_core_candidate_threshold_scoring_read_model_v1_view_candidate.sql\`.
2. If accepted, apply it later as an internal-only service-role view.
3. Keep \`can_auto_confirm_internal_candidate = false\` until the missing threshold gates are implemented.
4. Use this read model for nightly reporting only.
`;

const checkpoint = `# ${PACKAGE_ID}

The remaining candidate-review rows now have a deterministic internal scoring model candidate.

Current status:

- Candidate rows scored: \`${report.candidate_rows}\`
- Auto-confirm rows: \`${boundary.auto_confirm_rows}\`
- Public score flag rows: \`${boundary.score_public_flag_rows}\`
- Source public flag rows: \`${boundary.source_public_flag_rows}\`

No remote schema apply was performed.
`;

writeFileSync(path.join(SQL_DIR, "mee_core_candidate_threshold_scoring_read_model_v1_view_candidate.sql"), viewCandidateSql);
writeFileSync(path.join(SQL_DIR, "mee_core_candidate_threshold_scoring_read_model_v1_readback.sql"), scoringReadbackSql);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), markdown);
writeFileSync(path.join(CONTRACT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), markdown);
writeFileSync(path.join(PLAN_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), plan);
writeFileSync(path.join(CHECKPOINT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), checkpoint);

console.log(
  JSON.stringify(
    {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      read_model_status: report.read_model_status,
      candidate_rows: report.candidate_rows,
      bucket_summary: bucketSummary,
      boundary,
      findings,
    },
    null,
    2,
  ),
);
