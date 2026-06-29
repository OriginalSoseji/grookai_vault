import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-QUALITY-FLAG-TAXONOMY-V1";
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
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-quality-taxonomy-"));
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

const readbackSql = `-- ${PACKAGE_ID} readback.
-- Read-only quality flag taxonomy audit for remaining candidate-review rows.

with remaining as (
  select card_print_id, evidence_lane
  from public.market_evidence_review_dispositions
  where needs_review = true
    and review_status = 'pending'
    and evidence_lane in ('raw_single', 'slab')
), candidates as (
  select
    c.*,
    r.evidence_lane,
    coalesce(c.title_features->>'listing_evidence_class', 'unknown') as listing_evidence_class
  from public.market_listing_card_candidates c
  join remaining r on r.card_print_id = c.card_print_id
), classified as (
  select
    *,
    array_length(exclusion_flags, 1) is not null as has_exclusion_flags,
    (
      (evidence_lane = 'raw_single' and listing_evidence_class = 'slab')
      or (evidence_lane = 'slab' and listing_evidence_class = 'raw_single')
    ) as has_lane_mismatch,
    match_confidence < 0.80 as has_low_match_confidence,
    needs_review = true as has_review_required
  from candidates
), lane_summary as (
  select
    evidence_lane,
    count(*)::int as candidate_rows,
    count(*) filter (where has_review_required)::int as review_required_rows,
    count(*) filter (where has_low_match_confidence)::int as low_confidence_rows,
    count(*) filter (where has_lane_mismatch)::int as lane_mismatch_rows,
    count(*) filter (where has_exclusion_flags)::int as exclusion_flagged_rows,
    count(*) filter (where not has_exclusion_flags)::int as no_exclusion_flag_rows,
    min(match_confidence) as min_confidence,
    percentile_disc(0.5) within group (order by match_confidence) as median_confidence,
    max(match_confidence) as max_confidence
  from classified
  group by 1
), class_summary as (
  select
    evidence_lane,
    listing_evidence_class,
    count(*)::int as rows
  from classified
  group by 1,2
), exclusion_summary as (
  select
    evidence_lane,
    coalesce(flag, '__none__') as exclusion_flag,
    count(*)::int as rows
  from classified
  left join lateral unnest(exclusion_flags) as flag on true
  group by 1,2
), condition_summary as (
  select
    classified.evidence_lane,
    coalesce(o.condition_text, '__null__') as condition_text,
    count(*)::int as rows
  from classified
  join public.market_listing_observations o on o.id = classified.observation_id
  group by 1,2
)
select
  '${PACKAGE_ID}'::text as package_id,
  (select jsonb_agg(to_jsonb(lane_summary) order by evidence_lane) from lane_summary) as lane_summary,
  (select jsonb_agg(to_jsonb(class_summary) order by evidence_lane, listing_evidence_class) from class_summary) as class_summary,
  (select jsonb_agg(to_jsonb(exclusion_summary) order by rows desc, evidence_lane, exclusion_flag) from exclusion_summary) as exclusion_summary,
  (select jsonb_agg(to_jsonb(condition_summary) order by rows desc, evidence_lane, condition_text) from condition_summary) as condition_summary;
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(CONTRACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });

const readback = supabaseReadOnlyQuery(readbackSql)[0];
const laneSummary = readback.lane_summary ?? [];
const classSummary = readback.class_summary ?? [];
const exclusionSummary = readback.exclusion_summary ?? [];
const conditionSummary = readback.condition_summary ?? [];

const totalCandidates = laneSummary.reduce((sum, row) => sum + Number(row.candidate_rows), 0);
const totalReviewRequired = laneSummary.reduce((sum, row) => sum + Number(row.review_required_rows), 0);
const totalLowConfidence = laneSummary.reduce((sum, row) => sum + Number(row.low_confidence_rows), 0);
const totalLaneMismatch = laneSummary.reduce((sum, row) => sum + Number(row.lane_mismatch_rows), 0);
const totalExclusionFlagged = laneSummary.reduce((sum, row) => sum + Number(row.exclusion_flagged_rows), 0);

const taxonomy = [
  {
    quality_flag: "low_match_confidence",
    gate_type: "hard_until_identity_confidence_v2",
    current_rows: totalLowConfidence,
    resolution: "raise deterministic match confidence or keep manual review",
  },
  {
    quality_flag: "lane_mismatch_raw_vs_slab",
    gate_type: "hard_until_lane_reclassification",
    current_rows: totalLaneMismatch,
    resolution: "move candidate evidence into raw/slab lane matching listing_evidence_class before scoring",
  },
  {
    quality_flag: "explicit_exclusion_flag",
    gate_type: "hard_or_manual_by_flag",
    current_rows: totalExclusionFlagged,
    resolution: "exclude hard flags such as lot/sealed/menu/accessory; manual-policy foreign-language handling",
  },
  {
    quality_flag: "review_required_without_exclusion",
    gate_type: "manual_or_threshold",
    current_rows: totalReviewRequired - totalExclusionFlagged,
    resolution: "requires identity confidence, source independence, freshness, and outlier gates",
  },
];

const hardExclusionFlags = [
  "lot",
  "sealed",
  "choose_your_card",
  "jumbo",
  "menu_listing",
  "sleeve_accessory",
];

const manualPolicyFlags = ["foreign_language"];

const findings = [];
if (totalCandidates !== 25989) findings.push(`candidate_evidence_row_count_changed_${totalCandidates}`);
if (totalReviewRequired !== totalCandidates) findings.push("not_all_candidate_evidence_rows_marked_review_required");
if (totalLowConfidence !== totalCandidates) findings.push("not_all_candidate_evidence_rows_low_confidence");

const reportBasis = {
  package_id: PACKAGE_ID,
  candidate_evidence_rows: totalCandidates,
  review_required_rows: totalReviewRequired,
  low_confidence_rows: totalLowConfidence,
  lane_mismatch_rows: totalLaneMismatch,
  exclusion_flagged_rows: totalExclusionFlagged,
  lane_summary: laneSummary,
  class_summary: classSummary,
  exclusion_summary: exclusionSummary,
  taxonomy,
  hard_exclusion_flags: hardExclusionFlags,
  manual_policy_flags: manualPolicyFlags,
  findings,
  readback_sql_sha256: sha256Text(readbackSql),
};

const report = {
  ...reportBasis,
  generated_at: new Date().toISOString(),
  mode: "plan_only_quality_flag_taxonomy",
  package_fingerprint_sha256: sha256Json(reportBasis),
  taxonomy_status: findings.length === 0 ? "ready_for_quality_scoring_model" : "review_findings",
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
  { key: "evidence_lane", label: "lane" },
  { key: "candidate_rows", label: "rows" },
  { key: "low_confidence_rows", label: "low confidence" },
  { key: "lane_mismatch_rows", label: "lane mismatch" },
  { key: "exclusion_flagged_rows", label: "exclusion flagged" },
  { key: "median_confidence", label: "median confidence" },
]);

const taxonomyTable = markdownTable(taxonomy, [
  { key: "quality_flag", label: "quality flag" },
  { key: "gate_type", label: "gate" },
  { key: "current_rows", label: "rows" },
  { key: "resolution", label: "resolution" },
]);

const markdown = `# ${PACKAGE_ID}

## Status

- Package fingerprint: \`${report.package_fingerprint_sha256}\`
- Status: \`${report.taxonomy_status}\`
- Candidate evidence rows: \`${totalCandidates}\`

## Lane Summary

${laneTable}

## Taxonomy

${taxonomyTable}

## Exclusion Flags

Hard exclusion flags:

${hardExclusionFlags.map((flag) => `- \`${flag}\``).join("\n")}

Manual-policy flags:

${manualPolicyFlags.map((flag) => `- \`${flag}\``).join("\n")}

## Decision

Quality flags are not one thing. They mean at least four different gates:

1. Low deterministic match confidence.
2. Raw/slab lane mismatch.
3. Explicit listing exclusion flags.
4. Review-required rows that need source, freshness, identity, and outlier gates.

No candidate confirmation can be automated until these gates are separately scored.
`;

const plan = `# ${PACKAGE_ID}

Next step:

1. Build a quality scoring read model that emits one row per candidate evidence item.
2. Treat \`low_match_confidence\` and \`lane_mismatch_raw_vs_slab\` separately.
3. Exclude hard flags from rollup eligibility.
4. Keep \`foreign_language\` as manual policy until language/region handling exists.
5. Recompute card-level threshold scores from quality-scored evidence.
`;

const checkpoint = `# ${PACKAGE_ID}

The candidate review blocker is now understood as quality taxonomy work.

Current evidence rows:

- Candidate evidence rows: \`${totalCandidates}\`
- Low confidence rows: \`${totalLowConfidence}\`
- Lane mismatch rows: \`${totalLaneMismatch}\`
- Explicit exclusion flagged rows: \`${totalExclusionFlagged}\`

No public pricing or candidate confirmation was performed.
`;

writeFileSync(path.join(SQL_DIR, "mee_core_quality_flag_taxonomy_v1_readback.sql"), readbackSql);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(ARTIFACT_DIR, "condition_summary.json"), `${JSON.stringify(conditionSummary, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), markdown);
writeFileSync(path.join(CONTRACT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), markdown);
writeFileSync(path.join(PLAN_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), plan);
writeFileSync(path.join(CHECKPOINT_DIR, `${PACKAGE_ID.replaceAll("-", "_")}.md`), checkpoint);

console.log(
  JSON.stringify(
    {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      taxonomy_status: report.taxonomy_status,
      candidate_evidence_rows: totalCandidates,
      low_confidence_rows: totalLowConfidence,
      lane_mismatch_rows: totalLaneMismatch,
      exclusion_flagged_rows: totalExclusionFlagged,
      findings,
    },
    null,
    2,
  ),
);
