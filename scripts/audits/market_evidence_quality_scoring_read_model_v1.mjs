import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-QUALITY-SCORING-READ-MODEL-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const CONTRACT_DIR = path.join(REPO_ROOT, "docs", "contracts");
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");

const TAXONOMY_REPORT =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-QUALITY-FLAG-TAXONOMY-V1/report.json";

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

function parseRows(output) {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

function supabaseReadOnlyQuery(sql) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-quality-score-"));
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

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(row[column.key] ?? "")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

const qualityScoreCte = `with remaining as (
  select
    id as disposition_id,
    card_print_id,
    gv_id,
    review_lane,
    evidence_lane,
    review_status,
    review_disposition,
    needs_review as disposition_needs_review,
    publication_gate_candidate,
    can_publish_price_directly as disposition_can_publish_price_directly,
    publishable as disposition_publishable,
    app_visible as disposition_app_visible,
    market_truth as disposition_market_truth
  from public.market_evidence_review_dispositions
  where needs_review = true
    and review_status = 'pending'
    and evidence_lane in ('raw_single', 'slab')
), candidate_rows as (
  select
    r.disposition_id,
    r.card_print_id,
    r.gv_id,
    r.review_lane,
    r.evidence_lane,
    r.review_status,
    r.review_disposition,
    r.disposition_needs_review,
    c.id as candidate_id,
    c.observation_id,
    c.raw_snapshot_id,
    c.source,
    c.source_listing_id,
    c.match_version,
    c.match_status,
    c.match_confidence,
    c.needs_review as candidate_needs_review,
    c.can_publish_price_directly as candidate_can_publish_price_directly,
    coalesce(c.exclusion_flags, '{}'::text[]) as exclusion_flags,
    coalesce(c.title_features->>'listing_evidence_class', 'unknown') as listing_evidence_class,
    c.candidate_hash,
    r.publication_gate_candidate,
    r.disposition_can_publish_price_directly,
    r.disposition_publishable,
    r.disposition_app_visible,
    r.disposition_market_truth,
    c.created_at
  from public.market_listing_card_candidates c
  join remaining r on r.card_print_id = c.card_print_id
), classified as (
  select
    *,
    match_confidence < 0.80 as low_match_confidence,
    (
      (evidence_lane = 'raw_single' and listing_evidence_class = 'slab')
      or (evidence_lane = 'slab' and listing_evidence_class = 'raw_single')
    ) as lane_mismatch_raw_vs_slab,
    exists (
      select 1
      from unnest(exclusion_flags) as flag
      where flag in ('lot', 'sealed', 'choose_your_card', 'jumbo', 'menu_listing', 'sleeve_accessory')
    ) as hard_exclusion_flag,
    exists (
      select 1
      from unnest(exclusion_flags) as flag
      where flag in ('foreign_language')
    ) as manual_policy_flag,
    array_length(exclusion_flags, 1) is not null as has_any_exclusion_flag,
    candidate_needs_review = true as review_required,
    not (
      publication_gate_candidate
      or disposition_can_publish_price_directly
      or disposition_publishable
      or disposition_app_visible
      or disposition_market_truth
      or candidate_can_publish_price_directly
    ) as public_boundary_clear
  from candidate_rows
), scored as (
  select
    *,
    (
      review_required
      and not hard_exclusion_flag
      and not manual_policy_flag
      and not has_any_exclusion_flag
    ) as review_required_without_exclusion,
    case
      when hard_exclusion_flag then 'exclude'
      when lane_mismatch_raw_vs_slab then 'reclassify_lane'
      when manual_policy_flag then 'manual_policy_review'
      when low_match_confidence then 'identity_confidence_review'
      when candidate_needs_review then 'threshold_review_required'
      else 'threshold_eligible_candidate'
    end as quality_action,
    (
      public_boundary_clear
      and not hard_exclusion_flag
      and not lane_mismatch_raw_vs_slab
      and not manual_policy_flag
      and not low_match_confidence
      and not candidate_needs_review
    ) as quality_rollup_eligible
  from classified
)`;

const viewCandidateSql = `-- ${PACKAGE_ID} local view candidate.
-- Internal-only quality scoring read model. Do not remotely apply without explicit schema approval.
-- This view scores evidence quality only. It cannot publish pricing or create market truth.

create or replace view public.v_market_evidence_candidate_quality_scores_v1 as
${qualityScoreCte}
select
  disposition_id,
  card_print_id,
  gv_id,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  candidate_id,
  observation_id,
  raw_snapshot_id,
  source,
  source_listing_id,
  match_version,
  match_status,
  match_confidence,
  candidate_hash,
  listing_evidence_class,
  exclusion_flags,
  low_match_confidence,
  lane_mismatch_raw_vs_slab,
  hard_exclusion_flag,
  manual_policy_flag,
  review_required,
  review_required_without_exclusion,
  public_boundary_clear,
  quality_action,
  quality_rollup_eligible,
  false as can_auto_confirm_internal_candidate,
  false as publishable,
  false as app_visible,
  false as market_truth,
  created_at
from scored;

revoke all on public.v_market_evidence_candidate_quality_scores_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_candidate_quality_scores_v1 to service_role;
`;

const readbackSql = `-- ${PACKAGE_ID} readback.
-- Read-only inline quality scoring equivalent of v_market_evidence_candidate_quality_scores_v1.

${qualityScoreCte},
action_summary as (
  select evidence_lane, quality_action, count(*)::int as rows
  from scored
  group by 1,2
), gate_summary as (
  select
    count(*)::int as candidate_evidence_rows,
    count(*) filter (where low_match_confidence)::int as low_match_confidence_rows,
    count(*) filter (where lane_mismatch_raw_vs_slab)::int as lane_mismatch_rows,
    count(*) filter (where hard_exclusion_flag)::int as hard_exclusion_rows,
    count(*) filter (where manual_policy_flag)::int as manual_policy_rows,
    count(*) filter (where review_required_without_exclusion)::int as review_required_without_exclusion_rows,
    count(*) filter (where quality_rollup_eligible)::int as quality_rollup_eligible_rows
  from scored
), lane_summary as (
  select
    evidence_lane,
    count(*)::int as candidate_evidence_rows,
    count(*) filter (where low_match_confidence)::int as low_match_confidence_rows,
    count(*) filter (where lane_mismatch_raw_vs_slab)::int as lane_mismatch_rows,
    count(*) filter (where hard_exclusion_flag)::int as hard_exclusion_rows,
    count(*) filter (where manual_policy_flag)::int as manual_policy_rows,
    count(*) filter (where quality_rollup_eligible)::int as quality_rollup_eligible_rows
  from scored
  group by 1
), boundary as (
  select
    count(*) filter (where not public_boundary_clear)::int as public_boundary_block_rows,
    count(*) filter (where false)::int as auto_confirm_rows,
    count(*) filter (where false)::int as score_public_flag_rows
  from scored
)
select
  '${PACKAGE_ID}'::text as package_id,
  (select to_jsonb(gate_summary) from gate_summary) as gate_summary,
  (select jsonb_agg(to_jsonb(lane_summary) order by evidence_lane) from lane_summary) as lane_summary,
  (select jsonb_agg(to_jsonb(action_summary) order by evidence_lane, quality_action) from action_summary) as action_summary,
  (select to_jsonb(boundary) from boundary) as boundary;
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
mkdirSync(CONTRACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });

const taxonomyReport = readJson(TAXONOMY_REPORT);
const readback = supabaseReadOnlyQuery(readbackSql)[0];
const gateSummary = readback.gate_summary ?? {};
const laneSummary = readback.lane_summary ?? [];
const actionSummary = readback.action_summary ?? [];
const boundary = readback.boundary ?? {};

const findings = [];
const candidateEvidenceRows = Number(gateSummary.candidate_evidence_rows);
const postActionQueueCleared = candidateEvidenceRows === 0;
if (!postActionQueueCleared && candidateEvidenceRows !== taxonomyReport.candidate_evidence_rows) {
  findings.push(
    `candidate_evidence_row_mismatch_${gateSummary.candidate_evidence_rows}_vs_${taxonomyReport.candidate_evidence_rows}`,
  );
}
if (!postActionQueueCleared && Number(gateSummary.low_match_confidence_rows) !== taxonomyReport.low_confidence_rows) {
  findings.push("low_match_confidence_count_mismatch");
}
if (!postActionQueueCleared && Number(gateSummary.lane_mismatch_rows) !== taxonomyReport.lane_mismatch_rows) {
  findings.push("lane_mismatch_count_mismatch");
}
if (Number(gateSummary.quality_rollup_eligible_rows) !== 0) {
  findings.push("unexpected_quality_rollup_eligible_rows");
}
for (const [key, value] of Object.entries(boundary)) {
  if (Number(value) !== 0) findings.push(`boundary_${key}_present`);
}

const reportBasis = {
  package_id: PACKAGE_ID,
  source_taxonomy_fingerprint: taxonomyReport.package_fingerprint_sha256,
  gate_summary: gateSummary,
  lane_summary: laneSummary,
  action_summary: actionSummary,
  boundary,
  findings,
  view_candidate_sql_sha256: sha256Text(viewCandidateSql),
  readback_sql_sha256: sha256Text(readbackSql),
};

const report = {
  ...reportBasis,
  generated_at: new Date().toISOString(),
  mode: "plan_only_internal_quality_scoring_read_model_candidate",
  package_fingerprint_sha256: sha256Json(reportBasis),
  read_model_status:
    findings.length === 0 && postActionQueueCleared
      ? "clear_no_pending_candidate_evidence"
      : findings.length === 0
        ? "candidate_ready_no_remote_apply"
        : "blocked",
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

const laneTable = markdownTable(laneSummary, [
  { key: "evidence_lane", label: "lane" },
  { key: "candidate_evidence_rows", label: "rows" },
  { key: "low_match_confidence_rows", label: "low confidence" },
  { key: "lane_mismatch_rows", label: "lane mismatch" },
  { key: "hard_exclusion_rows", label: "hard exclusions" },
  { key: "manual_policy_rows", label: "manual policy" },
  { key: "quality_rollup_eligible_rows", label: "quality eligible" },
]);

const actionTable = markdownTable(actionSummary, [
  { key: "evidence_lane", label: "lane" },
  { key: "quality_action", label: "action" },
  { key: "rows", label: "rows" },
]);

const markdown = `# ${PACKAGE_ID}

## Status

- Package fingerprint: \`${report.package_fingerprint_sha256}\`
- Status: \`${report.read_model_status}\`
- Candidate evidence rows: \`${gateSummary.candidate_evidence_rows}\`
- Quality rollup eligible rows: \`${gateSummary.quality_rollup_eligible_rows}\`

## Gate Summary

\`\`\`json
${JSON.stringify(gateSummary, null, 2)}
\`\`\`

## Lane Summary

${laneTable}

## Quality Actions

${actionTable}

## Decision

This package turns the quality taxonomy into a deterministic internal read-model candidate. Current remaining evidence is not quality-rollup eligible because every candidate evidence row is below the current match-confidence floor.

The model separates hard exclusions, raw/slab lane mismatch, manual-policy flags, and low confidence so later automation can fix the right problem instead of treating all review rows the same.
`;

const plan = `# ${PACKAGE_ID}

Next step:

1. Review \`docs/sql/mee_core_quality_scoring_read_model_v1_view_candidate.sql\`.
2. Apply it later as a service-role-only internal view if accepted.
3. Use it as the post-ingest quality gate before review disposition automation.
4. Do not allow \`confirm_internal_candidate\` or publish-gate handoff until quality eligibility is nonzero and threshold policy is explicit.
`;

const checkpoint = `# ${PACKAGE_ID}

Quality scoring is now a separate internal MEE foundation layer.

Current result:

- Candidate evidence rows: \`${gateSummary.candidate_evidence_rows}\`
- Low match confidence rows: \`${gateSummary.low_match_confidence_rows}\`
- Lane mismatch rows: \`${gateSummary.lane_mismatch_rows}\`
- Hard exclusion rows: \`${gateSummary.hard_exclusion_rows}\`
- Manual-policy rows: \`${gateSummary.manual_policy_rows}\`
- Quality rollup eligible rows: \`${gateSummary.quality_rollup_eligible_rows}\`

No remote schema apply or DB writes were performed.
`;

writeFileSync(path.join(SQL_DIR, "mee_core_quality_scoring_read_model_v1_view_candidate.sql"), viewCandidateSql);
writeFileSync(path.join(SQL_DIR, "mee_core_quality_scoring_read_model_v1_readback.sql"), readbackSql);
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
      gate_summary: gateSummary,
      action_summary: actionSummary,
      boundary,
      findings,
    },
    null,
    2,
  ),
);
