import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

const RUN_KEY = "MEE-11L-DAILY-BATCH-58975dc50904";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function runSql(sql) {
  const output = execFileSync("supabase", ["db", "query", sql, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return output;
}

function approvalPrompt(report) {
  return `Approve real MARKET-LISTING-CARD-CANDIDATE-ROLLUP-PLAN-V1 plan only. Source readback fingerprint: ${report.package_fingerprint_sha256}. Scope: prepare review-only card candidate and internal rollup plan from the verified MEE-11L daily batch warehouse rows only, keeping raw_single and slab evidence separated. No DB writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No provider calls. No source fetches. No deletes. No merges. No global apply.`;
}

function renderMarkdown(report) {
  return [
    "# MEE-11R Market Listing Daily Batch Signal Readback",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Run key: \`${RUN_KEY}\``,
    "",
    "## Table Counts",
    "",
    "```json",
    JSON.stringify(report.table_counts, null, 2),
    "```",
    "",
    "## Evidence Classes",
    "",
    "```json",
    JSON.stringify(report.evidence_class_counts, null, 2),
    "```",
    "",
    "## Price Distribution",
    "",
    "```json",
    JSON.stringify(report.price_distribution, null, 2),
    "```",
    "",
    "## Top Targets",
    "",
    "```json",
    JSON.stringify(report.top_target_counts, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Approval Prompt",
    "",
    "```text",
    approvalPrompt(report),
    "```",
    "",
  ].join("\n");
}

function sha256(text) {
  return execFileSync("node", ["-e", `const crypto=require('crypto'); process.stdout.write(crypto.createHash('sha256').update(${JSON.stringify(text)}).digest('hex'))`], {
    encoding: "utf8",
  });
}

const sql = `
with run as (
  select id from public.market_listing_acquisition_runs where run_key = '${RUN_KEY}'
),
base_events as (
  select
    pe.*,
    pe.event_payload->>'listing_evidence_class' as evidence_class,
    pe.event_payload->'target'->>'card_print_id' as card_print_id,
    pe.event_payload->'target'->>'gv_id' as gv_id,
    pe.event_payload->>'strategy' as strategy
  from public.market_listing_price_events pe
  join public.market_listing_observations o on o.id = pe.observation_id
  join run on run.id = o.acquisition_run_id
),
table_counts as (
  select 'market_listing_acquisition_runs' as metric, count(*)::text as value from public.market_listing_acquisition_runs ar join run on run.id = ar.id
  union all select 'market_listing_query_cache', count(*)::text from public.market_listing_query_cache qc join run on run.id = qc.acquisition_run_id
  union all select 'market_listing_raw_snapshots', count(*)::text from public.market_listing_raw_snapshots rs join run on run.id = rs.acquisition_run_id
  union all select 'market_listing_observations', count(*)::text from public.market_listing_observations o join run on run.id = o.acquisition_run_id
  union all select 'market_listing_seller_snapshots', count(*)::text from public.market_listing_seller_snapshots ss join run on run.id = ss.acquisition_run_id
  union all select 'market_listing_price_events', count(*)::text from base_events
),
evidence_counts as (
  select coalesce(evidence_class, 'unknown') as evidence_class, count(*) as listing_count
  from base_events
  group by 1
),
price_dist as (
  select
    coalesce(evidence_class, 'unknown') as evidence_class,
    count(*) as listing_count,
    count(distinct source_listing_id) as unique_listing_count,
    percentile_cont(0.25) within group (order by current_total_ask_price) as q25,
    percentile_cont(0.50) within group (order by current_total_ask_price) as median,
    percentile_cont(0.75) within group (order by current_total_ask_price) as q75,
    percentile_cont(0.90) within group (order by current_total_ask_price) as p90,
    percentile_cont(0.95) within group (order by current_total_ask_price) as p95,
    min(current_total_ask_price) as min_price,
    max(current_total_ask_price) as max_price
  from base_events
  where current_total_ask_price is not null and currency = 'USD'
  group by 1
),
target_counts as (
  select
    gv_id,
    card_print_id,
    evidence_class,
    count(*) as listing_count,
    percentile_cont(0.50) within group (order by current_total_ask_price) as median
  from base_events
  where current_total_ask_price is not null
    and currency = 'USD'
    and evidence_class in ('raw_single', 'slab')
  group by 1,2,3
  order by listing_count desc
  limit 25
)
select jsonb_build_object(
  'table_counts', (select jsonb_object_agg(metric, value::int) from table_counts),
  'evidence_class_counts', (select jsonb_object_agg(evidence_class, listing_count) from evidence_counts),
  'price_distribution', (select jsonb_agg(to_jsonb(price_dist) order by evidence_class) from price_dist),
  'top_target_counts', (select jsonb_agg(to_jsonb(target_counts)) from target_counts)
)::text as report;
`;

const output = runSql(sql);
const queryResult = JSON.parse(output);
const rawReport = queryResult.rows?.[0]?.report;
if (!rawReport) throw new Error("[market-listing-signal-readback] failed to parse SQL report");
const parsed = JSON.parse(rawReport);
const findings = [];

if (parsed.table_counts?.market_listing_price_events !== 129665) findings.push("price_event_count_unexpected");
if (parsed.table_counts?.market_listing_observations !== 129665) findings.push("observation_count_unexpected");
if ((parsed.evidence_class_counts?.slab ?? 0) <= 0) findings.push("slab_class_missing");
if ((parsed.evidence_class_counts?.raw_single ?? 0) <= 0) findings.push("raw_single_class_missing");

const report = {
  package_id: "MARKET-LISTING-DAILY-BATCH-SIGNAL-READBACK-V1",
  generated_at: new Date().toISOString(),
  mode: "read_only_signal_audit_no_writes",
  package_fingerprint_sha256: sha256(JSON.stringify(parsed)),
  source_run_key: RUN_KEY,
  table_counts: parsed.table_counts,
  evidence_class_counts: parsed.evidence_class_counts,
  price_distribution: parsed.price_distribution,
  top_target_counts: parsed.top_target_counts,
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
const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11r_market_listing_daily_batch_signal_readback_${stamp}.json`);
const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11r_market_listing_daily_batch_signal_readback_${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  table_counts: report.table_counts,
  evidence_class_counts: report.evidence_class_counts,
  findings: report.findings,
  artifacts: {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
  },
  approval_prompt_for_next_step: report.approval_prompt_for_next_step,
}, null, 2));
