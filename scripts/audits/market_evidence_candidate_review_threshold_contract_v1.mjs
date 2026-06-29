import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-CANDIDATE-REVIEW-THRESHOLD-CONTRACT-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const CONTRACT_DIR = path.join(REPO_ROOT, "docs", "contracts");
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");
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

function parseRows(output) {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

function supabaseReadOnlyQuery(sql) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-candidate-threshold-"));
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

const auditSql = `-- MEE_CORE_CANDIDATE_REVIEW_THRESHOLD_CONTRACT_V1 readback.
-- Read-only candidate review threshold audit.

with candidate_rows as (
  select
    review_lane,
    evidence_lane,
    (evidence_summary->>'evidence_count')::int as evidence_count,
    (evidence_summary->>'rollup_eligible_count')::int as rollup_eligible_count,
    (evidence_summary->>'quality_flag_count')::int as quality_flag_count,
    (evidence_summary->>'exclusion_flag_count')::int as exclusion_flag_count,
    (source_mix->>'source_family_count')::int as source_family_count,
    publication_gate_candidate,
    can_publish_price_directly,
    publishable,
    app_visible,
    market_truth
  from public.market_evidence_review_dispositions
  where needs_review = true
    and review_status = 'pending'
    and evidence_lane in ('raw_single', 'slab')
), lane_summary as (
  select
    review_lane,
    evidence_lane,
    count(*)::int as rows,
    min(evidence_count)::int as min_evidence,
    percentile_disc(0.5) within group (order by evidence_count)::int as median_evidence,
    max(evidence_count)::int as max_evidence,
    min(rollup_eligible_count)::int as min_rollup_eligible,
    percentile_disc(0.5) within group (order by rollup_eligible_count)::int as median_rollup_eligible,
    max(rollup_eligible_count)::int as max_rollup_eligible,
    count(*) filter (where source_family_count >= 2)::int as multi_source_family_rows,
    count(*) filter (where quality_flag_count = 0)::int as zero_quality_flag_rows,
    count(*) filter (where exclusion_flag_count = 0)::int as zero_exclusion_flag_rows
  from candidate_rows
  group by 1,2
), threshold_buckets as (
  select
    evidence_lane,
    source_family_count,
    rollup_eligible_count,
    count(*)::int as rows
  from candidate_rows
  group by 1,2,3
), public_boundary as (
  select
    count(*) filter (where publication_gate_candidate)::int as publication_gate_candidate_rows,
    count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where market_truth)::int as market_truth_rows
  from candidate_rows
)
select
  '${PACKAGE_ID}'::text as package_id,
  (select jsonb_agg(to_jsonb(lane_summary) order by review_lane, evidence_lane) from lane_summary) as lane_summary,
  (select jsonb_agg(to_jsonb(threshold_buckets) order by evidence_lane, source_family_count, rollup_eligible_count) from threshold_buckets) as threshold_buckets,
  (select to_jsonb(public_boundary) from public_boundary) as public_boundary;
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(CONTRACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });

const readback = supabaseReadOnlyQuery(auditSql)[0];
const laneSummary = readback.lane_summary ?? [];
const thresholdBuckets = readback.threshold_buckets ?? [];
const publicBoundary = readback.public_boundary ?? {};

const totalCandidateRows = laneSummary.reduce((sum, row) => sum + Number(row.rows), 0);
const multiSourceRows = laneSummary.reduce((sum, row) => sum + Number(row.multi_source_family_rows), 0);
const zeroQualityRows = laneSummary.reduce((sum, row) => sum + Number(row.zero_quality_flag_rows), 0);
const zeroExclusionRows = laneSummary.reduce((sum, row) => sum + Number(row.zero_exclusion_flag_rows), 0);

const proposedThresholds = [
  {
    lane: "raw_single",
    minimum_rollup_eligible_count: 5,
    minimum_source_family_count: 2,
    allowed_action_without_manual_review: "none",
    future_candidate_action: "confirm_internal_candidate_after_threshold_contract",
    notes:
      "Raw singles can become internal candidates only after independent source, freshness, outlier, condition, and identity checks exist.",
  },
  {
    lane: "slab",
    minimum_rollup_eligible_count: 5,
    minimum_source_family_count: 2,
    allowed_action_without_manual_review: "none",
    future_candidate_action: "confirm_internal_candidate_after_threshold_contract",
    notes:
      "Slabs must stay separate from raw singles and require grade/company parsing before any publish-gate handoff.",
  },
  {
    lane: "high_signal_raw_single",
    minimum_rollup_eligible_count: 3,
    minimum_source_family_count: 2,
    allowed_action_without_manual_review: "none",
    future_candidate_action: "priority_manual_review",
    notes:
      "High-signal rows get priority, not automatic confirmation.",
  },
];

const requiredMissingBeforeAutomation = [
  "independent-source rule that distinguishes sellers/listings from provider families",
  "freshness window for active listings",
  "outlier trim or robust spread gate",
  "condition/grade normalization split for raw and slab lanes",
  "identity-confidence readback to ensure listing title maps to one GV ID",
  "minimum evidence quality threshold that excludes quality-flagged rows",
  "publish-gate handoff contract that remains separate from review action confirmation",
];

const findings = [];
for (const [key, value] of Object.entries(publicBoundary)) {
  if (Number(value) !== 0) findings.push(`public_boundary_${key}_present`);
}
if (totalCandidateRows !== 270) findings.push(`expected_270_candidate_rows_but_found_${totalCandidateRows}`);

const reportBasis = {
  package_id: PACKAGE_ID,
  total_candidate_rows: totalCandidateRows,
  multi_source_family_rows: multiSourceRows,
  zero_quality_flag_rows: zeroQualityRows,
  zero_exclusion_flag_rows: zeroExclusionRows,
  lane_summary: laneSummary,
  threshold_buckets: thresholdBuckets,
  proposed_thresholds: proposedThresholds,
  required_missing_before_automation: requiredMissingBeforeAutomation,
  public_boundary: publicBoundary,
  findings,
  readback_sql_sha256: sha256Text(auditSql),
};

const report = {
  ...reportBasis,
  generated_at: new Date().toISOString(),
  mode: "plan_only_candidate_review_threshold_contract",
  package_fingerprint_sha256: sha256Json(reportBasis),
  contract_status: "manual_or_threshold_required_no_auto_confirm",
  boundary_proof: {
    db_writes: false,
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
    migrations: false,
    global_apply: false,
  },
};

const laneTable = markdownTable(laneSummary, [
  { key: "review_lane", label: "review_lane" },
  { key: "evidence_lane", label: "evidence" },
  { key: "rows", label: "rows" },
  { key: "median_evidence", label: "median evidence" },
  { key: "median_rollup_eligible", label: "median rollup" },
  { key: "multi_source_family_rows", label: "multi-source rows" },
  { key: "zero_quality_flag_rows", label: "zero-quality-flag rows" },
]);

const markdown = `# ${PACKAGE_ID}

## Status

- Package fingerprint: \`${report.package_fingerprint_sha256}\`
- Status: \`${report.contract_status}\`
- Candidate rows: \`${totalCandidateRows}\`

## Lane Summary

${laneTable}

## Decision

The \`${totalCandidateRows}\` remaining raw/slab candidate rows are not safe for automatic confirmation yet.

They remain manual or future threshold-gated because current review rows do not prove enough about independent source quality, condition/grade separation, outliers, freshness, and identity confidence.

## Required Before Automation

${requiredMissingBeforeAutomation.map((item) => `- ${item}`).join("\n")}

## Proposed Threshold Shape

\`\`\`json
${JSON.stringify(proposedThresholds, null, 2)}
\`\`\`

## Boundary

No \`confirm_internal_candidate\` action is allowed by this contract.

No public pricing may be written by this contract.
`;

const plan = `# ${PACKAGE_ID}

Next step:

1. Do not apply review actions to these \`${totalCandidateRows}\` candidate rows yet.
2. Build a threshold scoring read model for raw and slab lanes separately.
3. Add identity-confidence, freshness, outlier, and condition/grade gates.
4. Only after that, generate a small dry-run candidate confirmation package.
`;

const checkpoint = `# ${PACKAGE_ID}

The MEE review queue has been reduced to true raw/slab candidate-review rows.

Current rows:

- Total candidate rows: \`${totalCandidateRows}\`
- Multi-source-family rows: \`${multiSourceRows}\`
- Zero quality-flag rows: \`${zeroQualityRows}\`
- Zero exclusion-flag rows: \`${zeroExclusionRows}\`

No automatic candidate confirmation is allowed yet.
`;

writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), markdown);
writeFileSync(path.join(CONTRACT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), markdown);
writeFileSync(path.join(PLAN_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), plan);
writeFileSync(path.join(CHECKPOINT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), checkpoint);
writeFileSync(path.join(SQL_DIR, "mee_core_candidate_review_threshold_contract_v1_readback.sql"), auditSql);

console.log(
  JSON.stringify(
    {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      contract_status: report.contract_status,
      total_candidate_rows: totalCandidateRows,
      multi_source_family_rows: multiSourceRows,
      zero_quality_flag_rows: zeroQualityRows,
      findings,
    },
    null,
    2,
  ),
);
