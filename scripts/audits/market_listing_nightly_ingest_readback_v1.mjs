import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const CONTRACT_PATH = "docs/contracts/MARKET_LISTING_NIGHTLY_INGEST_V1.json";

const PACKAGE_ID = "MARKET-LISTING-NIGHTLY-INGEST-READBACK-V1";
const BASE_STRICT_RAW_ROLLUP_VERSION = "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1";
const BASE_STRICT_SLAB_ROLLUP_VERSION = "MEE_12B_INTERNAL_SLAB_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1";

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

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function runSql(sql) {
  const targetArgs = process.env.SUPABASE_DB_URL
    ? ["--db-url", process.env.SUPABASE_DB_URL]
    : ["--linked"];
  return execFileSync("supabase", ["db", "query", "--output", "json", sql, ...targetArgs], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
}

function parseSupabaseRows(output) {
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : parsed.rows ?? [];
}

function parseArgs(argv) {
  return {
    runKey: argv.find((arg) => arg.startsWith("--run-key="))?.slice("--run-key=".length) ?? null,
  };
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeRollupVersionSuffix(raw) {
  if (!raw) return "";
  const suffix = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!suffix) throw new Error("[market-listing-nightly-readback] run key normalized to empty rollup suffix");
  return suffix.slice(0, 80);
}

function strictRollupVersionsForRun(runKey) {
  const suffix = normalizeRollupVersionSuffix(runKey);
  return {
    raw: suffix ? `${BASE_STRICT_RAW_ROLLUP_VERSION}__${suffix}` : BASE_STRICT_RAW_ROLLUP_VERSION,
    slab: suffix ? `${BASE_STRICT_SLAB_ROLLUP_VERSION}__${suffix}` : BASE_STRICT_SLAB_ROLLUP_VERSION,
  };
}

function renderMarkdown(report) {
  return [
    "# Market Listing Nightly Ingest Readback V1",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Contract hash: \`${report.contract_hash_sha256}\``,
    `- Run key: \`${report.run_key ?? "not scoped"}\``,
    "",
    "## Morning Summary",
    "",
    `- Acquisition runs: ${report.morning_summary.acquisition_run_count}`,
    `- Consumed calls: ${report.morning_summary.consumed_call_count}`,
    `- Provider errors: ${report.morning_summary.provider_error_count}`,
    `- Listing observations: ${report.morning_summary.listing_observation_count}`,
    `- Price events: ${report.morning_summary.price_event_count}`,
    `- Raw singles: ${report.morning_summary.raw_single_event_count}`,
    `- Slabs: ${report.morning_summary.slab_event_count}`,
    `- Excluded/ambiguous: ${report.morning_summary.excluded_or_ambiguous_event_count}`,
    `- Candidate rows: ${report.morning_summary.candidate_row_count}`,
    `- Strict-filtered rollups: ${report.morning_summary.strict_filtered_rollup_count}`,
    `- Strict-filtered review-ready: ${report.morning_summary.strict_filtered_review_ready_count}`,
    `- Strict-filtered needs more evidence: ${report.morning_summary.strict_filtered_needs_more_evidence_count}`,
    "",
    "## Warehouse Counts",
    "",
    "```json",
    JSON.stringify(report.warehouse_counts, null, 2),
    "```",
    "",
    "## Strict Filtered Rollups",
    "",
    "```json",
    JSON.stringify(report.strict_filtered_rollups, null, 2),
    "```",
    "",
    "## Public Surface",
    "",
    "```json",
    JSON.stringify(report.public_pricing_surface, null, 2),
    "```",
    "",
    "## Boundary Proof",
    "",
    "```json",
    JSON.stringify(report.boundary_proof, null, 2),
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

const args = parseArgs(process.argv.slice(2));
const contractText = readFileSync(path.join(REPO_ROOT, CONTRACT_PATH), "utf8");
const contractHash = sha256(contractText);
const strictRollupVersions = strictRollupVersionsForRun(args.runKey);

const runFilter = args.runKey
  ? `where run_key = ${sqlString(args.runKey)}`
  : "";
const runJoinFilter = args.runKey
  ? `join scoped_run sr on sr.id = o.acquisition_run_id`
  : "";
const rawJoinFilter = args.runKey
  ? `join scoped_run sr on sr.id = rs.acquisition_run_id`
  : "";
const sellerJoinFilter = args.runKey
  ? `join scoped_run sr on sr.id = ss.acquisition_run_id`
  : "";
const queryJoinFilter = args.runKey
  ? `join scoped_run sr on sr.id = qc.acquisition_run_id`
  : "";

const sql = `
with scoped_run as (
  select *
  from public.market_listing_acquisition_runs
  ${runFilter}
),
run_counts as (
  select jsonb_build_object(
    'acquisition_run_count', count(*),
    'consumed_call_count', coalesce(sum(consumed_call_count), 0),
    'provider_error_count', coalesce(sum(error_count), 0),
    'observed_listing_count', coalesce(sum(observed_listing_count), 0),
    'by_status', coalesce(jsonb_object_agg(status, status_count), '{}'::jsonb)
  ) as payload
  from (
    select
      status,
      count(*) as status_count,
      sum(consumed_call_count) as consumed_call_count,
      sum(error_count) as error_count,
      sum(observed_listing_count) as observed_listing_count
    from scoped_run
    group by status
  ) s
),
event_base as (
  select
    pe.*,
    pe.event_payload->>'listing_evidence_class' as evidence_class
  from public.market_listing_price_events pe
  join public.market_listing_observations o on o.id = pe.observation_id
  ${runJoinFilter}
),
warehouse_counts as (
  select jsonb_build_object(
    'market_listing_acquisition_runs', (select count(*) from scoped_run),
    'market_listing_query_cache', (select count(*) from public.market_listing_query_cache qc ${queryJoinFilter}),
    'market_listing_raw_snapshots', (select count(*) from public.market_listing_raw_snapshots rs ${rawJoinFilter}),
    'market_listing_observations', (select count(*) from public.market_listing_observations o ${runJoinFilter}),
    'market_listing_seller_snapshots', (select count(*) from public.market_listing_seller_snapshots ss ${sellerJoinFilter}),
    'market_listing_price_events', (select count(*) from event_base),
    'market_listing_card_candidates_total', (select count(*) from public.market_listing_card_candidates),
    'market_listing_rollups_total', (select count(*) from public.market_listing_rollups)
  ) as payload
),
event_counts as (
  select jsonb_build_object(
    'total', count(*),
    'raw_single', count(*) filter (where evidence_class = 'raw_single'),
    'slab', count(*) filter (where evidence_class = 'slab'),
    'excluded_or_ambiguous', count(*) filter (where evidence_class = 'excluded_or_ambiguous'),
    'without_evidence_class', count(*) filter (where evidence_class is null)
  ) as payload
  from event_base
),
candidate_state as (
  select jsonb_build_object(
    'total', count(*),
    'with_gv_id', count(*) filter (where gv_id is not null and btrim(gv_id) <> ''),
    'needs_review_false', count(*) filter (where needs_review is distinct from true),
    'direct_publish_true', count(*) filter (where can_publish_price_directly is distinct from false),
    'by_match_version', coalesce((
      select jsonb_object_agg(match_version, version_count)
      from (
        select match_version, count(*) as version_count
        from public.market_listing_card_candidates
        group by match_version
      ) v
    ), '{}'::jsonb)
  ) as payload
  from public.market_listing_card_candidates
),
strict_rollups as (
  select *
  from public.market_listing_rollups
  where rollup_version in (${sqlString(strictRollupVersions.raw)}, ${sqlString(strictRollupVersions.slab)})
),
strict_rollup_state as (
  select jsonb_build_object(
    'total', count(*),
    'raw_single', count(*) filter (where rollup_version = ${sqlString(strictRollupVersions.raw)}),
    'slab', count(*) filter (where rollup_version = ${sqlString(strictRollupVersions.slab)}),
    'with_gv_id', count(*) filter (where gv_id is not null and btrim(gv_id) <> ''),
    'strict_title_filtered_true', count(*) filter (where rollup_payload->>'strict_title_filtered' = 'true'),
    'review_ready', count(*) filter (where rollup_payload->>'review_bucket' = 'strict_filtered_review_ready_internal_candidate'),
    'needs_more_evidence', count(*) filter (where rollup_payload->>'review_bucket' = 'strict_filtered_needs_more_evidence'),
    'needs_review_false', count(*) filter (where needs_review is distinct from true),
    'publishable_true', count(*) filter (where publishable is distinct from false),
    'app_visible_true', count(*) filter (where app_visible is distinct from false),
    'market_truth_true', count(*) filter (where market_truth is distinct from false),
    'by_version', coalesce((
      select jsonb_object_agg(rollup_version, version_count)
      from (
        select rollup_version, count(*) as version_count
        from strict_rollups
        group by rollup_version
      ) v
    ), '{}'::jsonb),
    'top_review_ready', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.listing_count desc, t.gv_id)
      from (
        select gv_id, rollup_version, listing_count, seller_count, median_active_ask, minimum_active_ask, maximum_active_ask
        from strict_rollups
        where rollup_payload->>'review_bucket' = 'strict_filtered_review_ready_internal_candidate'
        order by listing_count desc, gv_id
        limit 25
      ) t
    ), '[]'::jsonb)
  ) as payload
  from strict_rollups
),
legacy_rollup_state as (
  select jsonb_build_object(
    'total', count(*),
    'app_visible_true', count(*) filter (where app_visible is distinct from false),
    'publishable_true', count(*) filter (where publishable is distinct from false),
    'market_truth_true', count(*) filter (where market_truth is distinct from false),
    'needs_review_false', count(*) filter (where needs_review is distinct from true)
  ) as payload
  from public.market_listing_rollups
),
pricing_surface as (
  select jsonb_build_object(
    'pricing_observations', (select jsonb_build_object('total', count(*), 'distinct_card_print_ids', count(distinct card_print_id)) from public.pricing_observations),
    'ebay_active_prices_latest', (select jsonb_build_object('total', count(*), 'distinct_card_print_ids', count(distinct card_print_id)) from public.ebay_active_prices_latest),
    'v_card_pricing_ui_v1', (
      select case
        when to_regclass('public.v_card_pricing_ui_v1') is null then jsonb_build_object('exists', false)
        else jsonb_build_object(
          'exists', true,
          'references_justtcg', pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%justtcg%',
          'references_market_listing', pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%market_listing%',
          'references_market_reference', pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%market_reference%',
          'definition_md5', md5(pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true))
        )
      end
    )
  ) as payload
)
select jsonb_build_object(
  'run_counts', (select payload from run_counts),
  'warehouse_counts', (select payload from warehouse_counts),
  'event_counts', (select payload from event_counts),
  'candidate_state', (select payload from candidate_state),
  'strict_rollup_state', (select payload from strict_rollup_state),
  'legacy_rollup_state', (select payload from legacy_rollup_state),
  'public_pricing_surface', (select payload from pricing_surface)
)::text as report;
`;

const queryResultRows = parseSupabaseRows(runSql(sql));
const rawReport = queryResultRows?.[0]?.report;
if (!rawReport) throw new Error("[market-listing-nightly-readback] failed to parse SQL report");
const parsed = JSON.parse(rawReport);

const findings = [];
const strict = parsed.strict_rollup_state;
const candidates = parsed.candidate_state;
const allRollups = parsed.legacy_rollup_state;
const surface = parsed.public_pricing_surface;

if (strict.total <= 0) findings.push("strict_filtered_rollups_missing");
if (strict.strict_title_filtered_true !== strict.total) findings.push("strict_filtered_payload_count_mismatch");
if (strict.needs_review_false > 0) findings.push("strict_rollups_needs_review_boundary_leak");
if (strict.publishable_true > 0) findings.push("strict_rollups_publishable_boundary_leak");
if (strict.app_visible_true > 0) findings.push("strict_rollups_app_visible_boundary_leak");
if (strict.market_truth_true > 0) findings.push("strict_rollups_market_truth_boundary_leak");
if (candidates.needs_review_false > 0) findings.push("candidate_needs_review_boundary_leak");
if (candidates.direct_publish_true > 0) findings.push("candidate_direct_publish_boundary_leak");
if (allRollups.publishable_true > 0) findings.push("any_market_listing_rollup_publishable_leak");
if (allRollups.app_visible_true > 0) findings.push("any_market_listing_rollup_app_visible_leak");
if (allRollups.market_truth_true > 0) findings.push("any_market_listing_rollup_market_truth_leak");
if (surface.v_card_pricing_ui_v1?.references_justtcg) findings.push("public_pricing_view_references_justtcg");
if (surface.v_card_pricing_ui_v1?.references_market_listing) findings.push("public_pricing_view_references_market_listing");
if (surface.v_card_pricing_ui_v1?.references_market_reference) findings.push("public_pricing_view_references_market_reference");

const reportPayloadForHash = {
  contract_hash_sha256: contractHash,
  run_key: args.runKey,
  strict_rollup_versions: strictRollupVersions,
  parsed,
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "read_only_nightly_ingest_morning_report_no_writes",
  run_key: args.runKey,
  strict_rollup_versions: strictRollupVersions,
  contract_path: CONTRACT_PATH,
  contract_hash_sha256: contractHash,
  package_fingerprint_sha256: sha256(reportPayloadForHash),
  morning_summary: {
    acquisition_run_count: parsed.run_counts.acquisition_run_count,
    consumed_call_count: parsed.run_counts.consumed_call_count,
    provider_error_count: parsed.run_counts.provider_error_count,
    observed_listing_count: parsed.run_counts.observed_listing_count,
    listing_observation_count: parsed.warehouse_counts.market_listing_observations,
    price_event_count: parsed.warehouse_counts.market_listing_price_events,
    raw_single_event_count: parsed.event_counts.raw_single,
    slab_event_count: parsed.event_counts.slab,
    excluded_or_ambiguous_event_count: parsed.event_counts.excluded_or_ambiguous,
    candidate_row_count: parsed.candidate_state.total,
    strict_filtered_rollup_count: parsed.strict_rollup_state.total,
    strict_filtered_review_ready_count: parsed.strict_rollup_state.review_ready,
    strict_filtered_needs_more_evidence_count: parsed.strict_rollup_state.needs_more_evidence,
  },
  warehouse_counts: parsed.warehouse_counts,
  run_counts: parsed.run_counts,
  event_counts: parsed.event_counts,
  candidate_state: parsed.candidate_state,
  strict_filtered_rollups: parsed.strict_rollup_state,
  all_market_listing_rollups_boundary_state: parsed.legacy_rollup_state,
  public_pricing_surface: parsed.public_pricing_surface,
  boundary_proof: {
    provider_calls: false,
    source_fetches: false,
    db_writes: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_view_writes: false,
    strict_rollups_publishable: strict.publishable_true,
    strict_rollups_app_visible: strict.app_visible_true,
    strict_rollups_market_truth: strict.market_truth_true,
    candidates_direct_publish: candidates.direct_publish_true,
    public_view_references_market_listing: surface.v_card_pricing_ui_v1?.references_market_listing ?? false,
    public_view_references_market_reference: surface.v_card_pricing_ui_v1?.references_market_reference ?? false,
    public_view_references_justtcg: surface.v_card_pricing_ui_v1?.references_justtcg ?? false,
  },
  findings,
  recommended_next_step:
    findings.length === 0
      ? "Nightly readback boundary is clean. Build the one-approval nightly run wrapper next."
      : "Resolve readback findings before building or running the nightly wrapper.",
};

mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
const stamp = report.generated_at.replace(/[:.]/g, "-");
const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_12c_market_listing_nightly_ingest_readback_${stamp}.json`);
const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_12c_market_listing_nightly_ingest_readback_${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  morning_summary: report.morning_summary,
  findings: report.findings,
  artifacts: {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
  },
  recommended_next_step: report.recommended_next_step,
}, null, 2));
