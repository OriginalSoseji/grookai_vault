import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function runSql(sql) {
  return execFileSync("supabase", ["db", "query", sql, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 96 * 1024 * 1024,
  });
}

function sha256(text) {
  return execFileSync(
    "node",
    [
      "-e",
      `const crypto=require('crypto'); process.stdout.write(crypto.createHash('sha256').update(${JSON.stringify(text)}).digest('hex'))`,
    ],
    { encoding: "utf8" },
  );
}

function renderMarkdown(report) {
  return [
    "# Market Evidence Cleanup Baseline V1",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Mode: \`${report.mode}\``,
    "",
    "## Executive Summary",
    "",
    `- Reference candidates: ${report.summary.reference_candidate_count}`,
    `- Reference signal rollups: ${report.summary.reference_signal_rollup_count}`,
    `- Listing observations: ${report.summary.listing_observation_count}`,
    `- Listing candidates: ${report.summary.listing_candidate_count}`,
    `- Listing rollups: ${report.summary.listing_rollup_count}`,
    `- Listing candidates assigned to GVID: ${report.summary.listing_candidate_with_gv_id_count}`,
    `- Listing rollups assigned to GVID: ${report.summary.listing_rollup_with_gv_id_count}`,
    `- App-visible listing rollups: ${report.summary.app_visible_listing_rollup_count}`,
    `- App-visible reference rollups: ${report.summary.app_visible_reference_signal_rollup_count}`,
    `- Public pricing view references JustTCG: ${report.public_pricing_surface.v_card_pricing_ui_v1.references_justtcg}`,
    "",
    "## Reference Warehouse",
    "",
    "```json",
    JSON.stringify(report.reference_warehouse, null, 2),
    "```",
    "",
    "## Listing Warehouse",
    "",
    "```json",
    JSON.stringify(report.listing_warehouse, null, 2),
    "```",
    "",
    "## Assignment State",
    "",
    "```json",
    JSON.stringify(report.assignment_state, null, 2),
    "```",
    "",
    "## Trust Boundary",
    "",
    "```json",
    JSON.stringify(report.trust_boundary, null, 2),
    "```",
    "",
    "## Public Pricing Surface",
    "",
    "```json",
    JSON.stringify(report.public_pricing_surface, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Recommended Next Step",
    "",
    report.recommended_next_step,
    "",
  ].join("\n");
}

const sql = `
with reference_table_counts as (
  select 'market_reference_acquisition_runs' as metric, count(*)::bigint as value from public.market_reference_acquisition_runs
  union all select 'market_reference_raw_snapshots', count(*)::bigint from public.market_reference_raw_snapshots
  union all select 'market_reference_candidates', count(*)::bigint from public.market_reference_candidates
  union all select 'market_reference_normalized_evidence', count(*)::bigint from public.market_reference_normalized_evidence
  union all select 'market_reference_coverage_reports', count(*)::bigint from public.market_reference_coverage_reports
  union all select 'market_reference_signal_rollups', count(*)::bigint from public.market_reference_signal_rollups
),
reference_candidate_counts as (
  select jsonb_build_object(
    'total', count(*),
    'with_card_print_id', count(*) filter (where card_print_id is not null),
    'with_gv_id', count(*) filter (where gv_id is not null and btrim(gv_id) <> ''),
    'needs_review_false', count(*) filter (where needs_review is distinct from true),
    'direct_publish_true', count(*) filter (where can_publish_price_directly is distinct from false)
  ) as payload
  from public.market_reference_candidates
),
reference_candidates_by_source as (
  select coalesce(jsonb_object_agg(source, source_count), '{}'::jsonb) as payload
  from (
    select source, count(*) as source_count
    from public.market_reference_candidates
    group by source
  ) s
),
reference_normalized_state as (
  select jsonb_build_object(
    'total', count(*),
    'model_eligible_true', count(*) filter (where model_eligible is true),
    'model_eligible_false', count(*) filter (where model_eligible is distinct from true),
    'by_disposition', coalesce((
      select jsonb_object_agg(model_disposition, disposition_count)
      from (
        select model_disposition, count(*) as disposition_count
        from public.market_reference_normalized_evidence
        group by model_disposition
      ) d
    ), '{}'::jsonb)
  ) as payload
  from public.market_reference_normalized_evidence
),
reference_signal_state as (
  select jsonb_build_object(
    'total', count(*),
    'with_card_print_id', count(*) filter (where card_print_id is not null),
    'with_gv_id', count(*) filter (where gv_id is not null and btrim(gv_id) <> ''),
    'needs_review_false', count(*) filter (where needs_review is distinct from true),
    'publishable_true', count(*) filter (where publishable is distinct from false),
    'app_visible_true', count(*) filter (where app_visible is distinct from false),
    'market_truth_true', count(*) filter (where market_truth is distinct from false),
    'by_review_status', coalesce((
      select jsonb_object_agg(review_status, status_count)
      from (
        select review_status, count(*) as status_count
        from public.market_reference_signal_rollups
        group by review_status
      ) rs
    ), '{}'::jsonb),
    'by_rollup_version', coalesce((
      select jsonb_object_agg(rollup_version, version_count)
      from (
        select rollup_version, count(*) as version_count
        from public.market_reference_signal_rollups
        group by rollup_version
      ) rv
    ), '{}'::jsonb)
  ) as payload
  from public.market_reference_signal_rollups
),
listing_table_counts as (
  select 'market_listing_acquisition_runs' as metric, count(*)::bigint as value from public.market_listing_acquisition_runs
  union all select 'market_listing_query_cache', count(*)::bigint from public.market_listing_query_cache
  union all select 'market_listing_raw_snapshots', count(*)::bigint from public.market_listing_raw_snapshots
  union all select 'market_listing_observations', count(*)::bigint from public.market_listing_observations
  union all select 'market_listing_seller_snapshots', count(*)::bigint from public.market_listing_seller_snapshots
  union all select 'market_listing_price_events', count(*)::bigint from public.market_listing_price_events
  union all select 'market_listing_card_candidates', count(*)::bigint from public.market_listing_card_candidates
  union all select 'market_listing_rollups', count(*)::bigint from public.market_listing_rollups
),
listing_run_state as (
  select jsonb_build_object(
    'total_runs', count(*),
    'by_status', coalesce((
      select jsonb_object_agg(status, status_count)
      from (
        select status, count(*) as status_count
        from public.market_listing_acquisition_runs
        group by status
      ) s
    ), '{}'::jsonb),
    'total_consumed_call_count', coalesce(sum(consumed_call_count), 0),
    'total_observed_listing_count', coalesce(sum(observed_listing_count), 0),
    'total_error_count', coalesce(sum(error_count), 0)
  ) as payload
  from public.market_listing_acquisition_runs
),
listing_event_state as (
  select jsonb_build_object(
    'total', count(*),
    'with_target_payload', count(*) filter (where event_payload ? 'target'),
    'with_target_card_print_id', count(*) filter (where event_payload->'target'->>'card_print_id' is not null),
    'with_target_gv_id', count(*) filter (where event_payload->'target'->>'gv_id' is not null),
    'raw_single', count(*) filter (where event_payload->>'listing_evidence_class' = 'raw_single'),
    'slab', count(*) filter (where event_payload->>'listing_evidence_class' = 'slab'),
    'excluded_or_ambiguous', count(*) filter (where event_payload->>'listing_evidence_class' = 'excluded_or_ambiguous'),
    'without_evidence_class', count(*) filter (where event_payload->>'listing_evidence_class' is null)
  ) as payload
  from public.market_listing_price_events
),
listing_candidate_state as (
  select jsonb_build_object(
    'total', count(*),
    'with_card_print_id', count(*) filter (where card_print_id is not null),
    'with_gv_id', count(*) filter (where gv_id is not null and btrim(gv_id) <> ''),
    'needs_review_false', count(*) filter (where needs_review is distinct from true),
    'direct_publish_true', count(*) filter (where can_publish_price_directly is distinct from false),
    'raw_single', count(*) filter (where title_features->>'listing_evidence_class' = 'raw_single'),
    'slab', count(*) filter (where title_features->>'listing_evidence_class' = 'slab'),
    'with_exclusion_flags', count(*) filter (where cardinality(exclusion_flags) > 0),
    'by_match_version', coalesce((
      select jsonb_object_agg(match_version, version_count)
      from (
        select match_version, count(*) as version_count
        from public.market_listing_card_candidates
        group by match_version
      ) mv
    ), '{}'::jsonb)
  ) as payload
  from public.market_listing_card_candidates
),
listing_rollup_state as (
  select jsonb_build_object(
    'total', count(*),
    'with_card_print_id', count(*) filter (where card_print_id is not null),
    'with_gv_id', count(*) filter (where gv_id is not null and btrim(gv_id) <> ''),
    'needs_review_false', count(*) filter (where needs_review is distinct from true),
    'publishable_true', count(*) filter (where publishable is distinct from false),
    'app_visible_true', count(*) filter (where app_visible is distinct from false),
    'market_truth_true', count(*) filter (where market_truth is distinct from false),
    'raw_single', count(*) filter (where rollup_version like '%RAW_SINGLE%'),
    'slab', count(*) filter (where rollup_version like '%SLAB%'),
    'by_rollup_version', coalesce((
      select jsonb_object_agg(rollup_version, version_count)
      from (
        select rollup_version, count(*) as version_count
        from public.market_listing_rollups
        group by rollup_version
      ) rv
    ), '{}'::jsonb)
  ) as payload
  from public.market_listing_rollups
),
pricing_observation_state as (
  select jsonb_build_object(
    'total', count(*),
    'distinct_card_print_ids', count(distinct card_print_id)
  ) as payload
  from public.pricing_observations
),
ebay_latest_state as (
  select jsonb_build_object(
    'total', count(*),
    'distinct_card_print_ids', count(distinct card_print_id)
  ) as payload
  from public.ebay_active_prices_latest
),
public_view_state as (
  select jsonb_build_object(
    'exists', pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) is not null,
    'references_justtcg', pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%justtcg%',
    'references_market_listing', pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%market_listing%',
    'references_market_reference', pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%market_reference%',
    'definition_md5', md5(pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true))
  ) as payload
),
reference_tables_json as (
  select jsonb_object_agg(metric, value) as payload from reference_table_counts
),
listing_tables_json as (
  select jsonb_object_agg(metric, value) as payload from listing_table_counts
)
select jsonb_build_object(
  'reference_warehouse', jsonb_build_object(
    'table_counts', (select payload from reference_tables_json),
    'candidate_counts', (select payload from reference_candidate_counts) || jsonb_build_object('by_source', (select payload from reference_candidates_by_source)),
    'normalized_evidence', (select payload from reference_normalized_state),
    'signal_rollups', (select payload from reference_signal_state)
  ),
  'listing_warehouse', jsonb_build_object(
    'table_counts', (select payload from listing_tables_json),
    'runs', (select payload from listing_run_state),
    'price_events', (select payload from listing_event_state),
    'card_candidates', (select payload from listing_candidate_state),
    'rollups', (select payload from listing_rollup_state)
  ),
  'public_pricing_surface', jsonb_build_object(
    'pricing_observations', (select payload from pricing_observation_state),
    'ebay_active_prices_latest', (select payload from ebay_latest_state),
    'v_card_pricing_ui_v1', (select payload from public_view_state)
  )
)::text as report;
`;

const queryResult = JSON.parse(runSql(sql));
const rawReport = queryResult.rows?.[0]?.report;
if (!rawReport) throw new Error("[market-evidence-cleanup-baseline] failed to parse SQL report");

const parsed = JSON.parse(rawReport);
const referenceCandidates = parsed.reference_warehouse.candidate_counts;
const referenceSignals = parsed.reference_warehouse.signal_rollups;
const listingTables = parsed.listing_warehouse.table_counts;
const listingEvents = parsed.listing_warehouse.price_events;
const listingCandidates = parsed.listing_warehouse.card_candidates;
const listingRollups = parsed.listing_warehouse.rollups;
const publicView = parsed.public_pricing_surface.v_card_pricing_ui_v1;

const findings = [];
if (referenceCandidates.needs_review_false > 0) findings.push("reference_candidates_have_review_gate_leak");
if (referenceCandidates.direct_publish_true > 0) findings.push("reference_candidates_have_direct_publish_leak");
if (referenceSignals.needs_review_false > 0) findings.push("reference_signal_rollups_have_review_gate_leak");
if (referenceSignals.publishable_true > 0) findings.push("reference_signal_rollups_have_publishable_leak");
if (referenceSignals.app_visible_true > 0) findings.push("reference_signal_rollups_have_app_visible_leak");
if (referenceSignals.market_truth_true > 0) findings.push("reference_signal_rollups_have_market_truth_leak");
if (listingCandidates.needs_review_false > 0) findings.push("listing_candidates_have_review_gate_leak");
if (listingCandidates.direct_publish_true > 0) findings.push("listing_candidates_have_direct_publish_leak");
if (listingRollups.needs_review_false > 0) findings.push("listing_rollups_have_review_gate_leak");
if (listingRollups.publishable_true > 0) findings.push("listing_rollups_have_publishable_leak");
if (listingRollups.app_visible_true > 0) findings.push("listing_rollups_have_app_visible_leak");
if (listingRollups.market_truth_true > 0) findings.push("listing_rollups_have_market_truth_leak");
if (publicView.references_justtcg) findings.push("public_pricing_view_still_references_justtcg");
if (publicView.references_market_listing) findings.push("public_pricing_view_references_internal_market_listing");
if (publicView.references_market_reference) findings.push("public_pricing_view_references_internal_market_reference");

const reportPayloadForHash = {
  reference_warehouse: parsed.reference_warehouse,
  listing_warehouse: parsed.listing_warehouse,
  public_pricing_surface: parsed.public_pricing_surface,
  findings,
};

const report = {
  package_id: "MARKET-EVIDENCE-CLEANUP-BASELINE-V1",
  generated_at: new Date().toISOString(),
  mode: "read_only_cleanup_baseline_no_writes_no_provider_calls",
  package_fingerprint_sha256: sha256(JSON.stringify(reportPayloadForHash)),
  summary: {
    reference_candidate_count: referenceCandidates.total,
    reference_signal_rollup_count: referenceSignals.total,
    listing_observation_count: listingTables.market_listing_observations,
    listing_price_event_count: listingTables.market_listing_price_events,
    listing_candidate_count: listingCandidates.total,
    listing_rollup_count: listingRollups.total,
    listing_candidate_with_gv_id_count: listingCandidates.with_gv_id,
    listing_rollup_with_gv_id_count: listingRollups.with_gv_id,
    listing_targeted_price_event_count: listingEvents.with_target_gv_id,
    app_visible_listing_rollup_count: listingRollups.app_visible_true,
    app_visible_reference_signal_rollup_count: referenceSignals.app_visible_true,
  },
  reference_warehouse: parsed.reference_warehouse,
  listing_warehouse: parsed.listing_warehouse,
  assignment_state: {
    stored_listing_evidence_rows: listingTables.market_listing_price_events,
    targeted_listing_evidence_rows: listingEvents.with_target_gv_id,
    review_only_listing_candidate_rows_with_gv_id: listingCandidates.with_gv_id,
    internal_listing_rollup_rows_with_gv_id: listingRollups.with_gv_id,
    review_only_reference_candidate_rows_with_gv_id: referenceCandidates.with_gv_id,
    internal_reference_signal_rows_with_gv_id: referenceSignals.with_gv_id,
    note: "GVID/card_print_id assignment is present for candidates and rollups, but all market evidence remains review-only and non-public.",
  },
  trust_boundary: {
    provider_calls: false,
    source_fetches: false,
    db_writes: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_view_writes: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    vault_writes: false,
    image_writes: false,
    deletes: false,
  },
  public_pricing_surface: parsed.public_pricing_surface,
  findings,
  recommended_next_step:
    findings.length === 0
      ? "Proceed to a read-only review-gate threshold plan for internal market_listing_rollups. Keep raw_single and slab lanes separated and keep all outputs review-only."
      : "Resolve the listed boundary findings before any additional acquisition or rollup promotion work.",
};

mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
const stamp = report.generated_at.replace(/[:.]/g, "-");
const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_cleanup_baseline_v1_${stamp}.json`);
const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_cleanup_baseline_v1_${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      summary: report.summary,
      findings: report.findings,
      artifacts: {
        jsonPath: rel(jsonPath),
        mdPath: rel(mdPath),
      },
      recommended_next_step: report.recommended_next_step,
    },
    null,
    2,
  ),
);
