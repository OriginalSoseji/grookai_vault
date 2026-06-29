import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

const CANDIDATE_VERSION = "MEE_11S_REVIEW_ONLY_TARGETED_LISTING_CANDIDATES_V1";
const RAW_ROLLUP_VERSION = "MEE_11S_INTERNAL_RAW_SINGLE_ACTIVE_ASK_REVIEW_V1";
const SLAB_ROLLUP_VERSION = "MEE_11S_INTERNAL_SLAB_ACTIVE_ASK_REVIEW_V1";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function runSql(sql) {
  return execFileSync("supabase", ["db", "query", sql, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function sha256(text) {
  return execFileSync("node", ["-e", `const crypto=require('crypto'); process.stdout.write(crypto.createHash('sha256').update(${JSON.stringify(text)}).digest('hex'))`], {
    encoding: "utf8",
  });
}

function approvalPrompt(report) {
  return `Approve real MARKET-LISTING-REVIEW-GATE-THRESHOLD-PLAN-V1 plan only. Source readback fingerprint: ${report.package_fingerprint_sha256}. Scope: prepare a local review-gate threshold plan for internal market_listing_rollups only, separating raw_single and slab lanes and keeping all outputs review-only and not app-visible. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No provider calls. No source fetches. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.`;
}

function renderMarkdown(report) {
  return [
    "# MEE-11U Market Listing Candidate Rollup Readback",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    "",
    "## Counts",
    "",
    "```json",
    JSON.stringify(report.counts, null, 2),
    "```",
    "",
    "## Candidate Confidence",
    "",
    "```json",
    JSON.stringify(report.candidate_confidence, null, 2),
    "```",
    "",
    "## Rollup Quality",
    "",
    "```json",
    JSON.stringify(report.rollup_quality, null, 2),
    "```",
    "",
    "## Top Rollups",
    "",
    "```json",
    JSON.stringify(report.top_rollups, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Approval Prompt",
    "",
    "```text",
    report.approval_prompt_for_next_step,
    "```",
    "",
  ].join("\n");
}

const sql = `
with candidates as (
  select *
  from public.market_listing_card_candidates
  where match_version = '${CANDIDATE_VERSION}'
),
rollups as (
  select *
  from public.market_listing_rollups
  where rollup_version in ('${RAW_ROLLUP_VERSION}', '${SLAB_ROLLUP_VERSION}')
),
candidate_counts as (
  select jsonb_build_object(
    'total', count(*),
    'needs_review_false', count(*) filter (where needs_review is distinct from true),
    'direct_publish_true', count(*) filter (where can_publish_price_directly is distinct from false),
    'with_exclusion_flags', count(*) filter (where cardinality(exclusion_flags) > 0),
    'raw_single', count(*) filter (where title_features->>'listing_evidence_class' = 'raw_single'),
    'slab', count(*) filter (where title_features->>'listing_evidence_class' = 'slab')
  ) as payload
  from candidates
),
rollup_counts as (
  select jsonb_build_object(
    'total', count(*),
    'needs_review_false', count(*) filter (where needs_review is distinct from true),
    'publishable_true', count(*) filter (where publishable is distinct from false),
    'app_visible_true', count(*) filter (where app_visible is distinct from false),
    'market_truth_true', count(*) filter (where market_truth is distinct from false),
    'raw_single', count(*) filter (where rollup_version = '${RAW_ROLLUP_VERSION}'),
    'slab', count(*) filter (where rollup_version = '${SLAB_ROLLUP_VERSION}')
  ) as payload
  from rollups
),
confidence as (
  select jsonb_agg(to_jsonb(t) order by evidence_class) as payload
  from (
    select
      coalesce(title_features->>'listing_evidence_class', 'unknown') as evidence_class,
      count(*) as candidate_count,
      percentile_cont(0.25) within group (order by match_confidence) as q25_confidence,
      percentile_cont(0.50) within group (order by match_confidence) as median_confidence,
      percentile_cont(0.75) within group (order by match_confidence) as q75_confidence
    from candidates
    group by 1
  ) t
),
quality as (
  select jsonb_agg(to_jsonb(t) order by rollup_version) as payload
  from (
    select
      rollup_version,
      count(*) as rollup_count,
      count(*) filter (where listing_count >= 3) as listing_count_gte_3,
      count(*) filter (where listing_count >= 5) as listing_count_gte_5,
      count(*) filter (where seller_count >= 2) as seller_count_gte_2,
      percentile_cont(0.50) within group (order by listing_count) as median_listing_count,
      percentile_cont(0.50) within group (order by median_active_ask) as median_of_medians,
      max(maximum_active_ask) as max_observed_ask
    from rollups
    group by 1
  ) t
),
top_rollups as (
  select jsonb_agg(to_jsonb(t) order by listing_count desc, gv_id) as payload
  from (
    select
      gv_id,
      rollup_version,
      listing_count,
      seller_count,
      median_active_ask,
      minimum_active_ask,
      maximum_active_ask,
      currency
    from rollups
    order by listing_count desc, gv_id
    limit 30
  ) t
)
select jsonb_build_object(
  'candidate_counts', (select payload from candidate_counts),
  'rollup_counts', (select payload from rollup_counts),
  'candidate_confidence', (select payload from confidence),
  'rollup_quality', (select payload from quality),
  'top_rollups', (select payload from top_rollups)
)::text as report;
`;

const queryResult = JSON.parse(runSql(sql));
const rawReport = queryResult.rows?.[0]?.report;
if (!rawReport) throw new Error("[market-listing-candidate-rollup-readback] failed to parse SQL report");
const parsed = JSON.parse(rawReport);
const findings = [];

if (parsed.candidate_counts?.total !== 108600) findings.push("candidate_count_unexpected");
if (parsed.rollup_counts?.total !== 2275) findings.push("rollup_count_unexpected");
if (parsed.candidate_counts?.needs_review_false > 0) findings.push("candidate_review_gate_failed");
if (parsed.candidate_counts?.direct_publish_true > 0) findings.push("candidate_direct_publish_gate_failed");
if (parsed.rollup_counts?.needs_review_false > 0) findings.push("rollup_review_gate_failed");
if (parsed.rollup_counts?.publishable_true > 0) findings.push("rollup_publishable_gate_failed");
if (parsed.rollup_counts?.app_visible_true > 0) findings.push("rollup_app_visible_gate_failed");
if (parsed.rollup_counts?.market_truth_true > 0) findings.push("rollup_market_truth_gate_failed");

const report = {
  package_id: "MARKET-LISTING-CANDIDATE-ROLLUP-READBACK-V1",
  generated_at: new Date().toISOString(),
  mode: "read_only_candidate_rollup_audit_no_writes",
  package_fingerprint_sha256: sha256(JSON.stringify(parsed)),
  counts: {
    candidates: parsed.candidate_counts,
    rollups: parsed.rollup_counts,
  },
  candidate_confidence: parsed.candidate_confidence,
  rollup_quality: parsed.rollup_quality,
  top_rollups: parsed.top_rollups,
  boundary: {
    provider_calls: false,
    source_fetches: false,
    db_writes: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
  },
  findings,
};
report.approval_prompt_for_next_step = approvalPrompt(report);

mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
const stamp = report.generated_at.replace(/[:.]/g, "-");
const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11u_market_listing_candidate_rollup_readback_${stamp}.json`);
const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11u_market_listing_candidate_rollup_readback_${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  counts: report.counts,
  findings: report.findings,
  artifacts: {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
  },
  approval_prompt_for_next_step: report.approval_prompt_for_next_step,
}, null, 2));
