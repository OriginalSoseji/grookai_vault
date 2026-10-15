import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const LIMIT_PER_BUCKET = 25;
const OFFSET_PER_BUCKET = 0;
const RAW_VERSION = "MEE_11S_INTERNAL_RAW_SINGLE_ACTIVE_ASK_REVIEW_V1";
const SLAB_VERSION = "MEE_11S_INTERNAL_SLAB_ACTIVE_ASK_REVIEW_V1";
const CANDIDATE_VERSION = "MEE_11S_REVIEW_ONLY_TARGETED_LISTING_CANDIDATES_V1";

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function runSql(sql) {
  const output = execFileSync("supabase", ["db", "query", sql, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const first = output.indexOf("{");
  const last = output.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("Unable to parse Supabase query output");
  return JSON.parse(output.slice(first, last + 1)).rows ?? [];
}

function arg(argv, name, fallback) {
  return argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3).trim() ?? fallback;
}

const argv = process.argv.slice(2);
const limitPerBucket = Number.parseInt(arg(argv, "limit-per-bucket", String(LIMIT_PER_BUCKET)), 10);
const offsetPerBucket = Number.parseInt(arg(argv, "offset-per-bucket", String(OFFSET_PER_BUCKET)), 10);
if (!Number.isInteger(limitPerBucket) || limitPerBucket < 1 || limitPerBucket > 100) throw new Error("--limit-per-bucket must be 1-100");
if (!Number.isInteger(offsetPerBucket) || offsetPerBucket < 0) throw new Error("--offset-per-bucket must be a non-negative integer");

const bucketCase = `case
  when coalesce((select sum((value)::numeric) from jsonb_each_text(coalesce(r.exclusion_counts, '{}'::jsonb))), 0) > 0 then 'review_required_contamination'
  when r.currency is distinct from 'USD' or r.median_active_ask is null then 'blocked_missing_required_signal'
  when r.evidence_class = 'raw_single' and (r.listing_count < 5 or r.seller_count < 2) then 'review_required_more_evidence'
  when r.evidence_class = 'slab' and (r.listing_count < 3 or r.seller_count < 2) then 'review_required_more_evidence'
  when r.median_active_ask > 0 and r.maximum_active_ask > 0
    and r.maximum_active_ask / r.median_active_ask > case when r.evidence_class = 'slab' then 100 else 50 end then 'review_required_outlier_spread'
  when r.trimmed_low_active_ask > 0 and r.trimmed_high_active_ask > 0
    and r.trimmed_high_active_ask / r.trimmed_low_active_ask > case when r.evidence_class = 'slab' then 75 else 20 end then 'review_required_outlier_spread'
  else 'review_ready_internal_candidate'
end`;

const selectedSql = `
with base as (
  select
    r.id::text as rollup_id,
    r.card_print_id::text as card_print_id,
    r.gv_id,
    case when r.rollup_version = '${RAW_VERSION}' then 'raw_single' else 'slab' end as evidence_class,
    r.rollup_version,
    r.listing_count,
    r.seller_count,
    r.median_active_ask,
    r.trimmed_low_active_ask,
    r.trimmed_high_active_ask,
    r.minimum_active_ask,
    r.maximum_active_ask,
    r.currency,
    r.exclusion_counts,
    r.needs_review,
    r.publishable,
    r.app_visible,
    r.market_truth
  from public.market_listing_rollups r
  where r.rollup_version in ('${RAW_VERSION}', '${SLAB_VERSION}')
), classified as (
  select r.*, ${bucketCase} as review_bucket
  from base r
), ranked as (
  select classified.*,
    row_number() over (partition by review_bucket order by listing_count desc, seller_count desc, gv_id, rollup_id) as bucket_rank
  from classified
)
select row_to_json(ranked)::jsonb as row
from ranked
where bucket_rank > ${offsetPerBucket}
  and bucket_rank <= ${offsetPerBucket + limitPerBucket}
order by review_bucket, evidence_class, gv_id, rollup_id;
`;

const selectedRows = runSql(selectedSql).map((row) => row.row);

const cardIds = [...new Set(selectedRows.map((row) => row.card_print_id).filter(Boolean))];
const cardIdSql = cardIds.map((id) => `'${String(id).replaceAll("'", "''")}'::uuid`).join(", ");
const sampleSql = cardIds.length ? `
select jsonb_agg(to_jsonb(sample) order by sample.card_print_id, sample.evidence_class, sample.total_ask_price nulls last, sample.source_listing_id) as samples
from (
  select
    c.card_print_id::text as card_print_id,
    c.source_listing_id,
    o.listing_title,
    o.listing_url,
    o.total_ask_price,
    o.currency,
    o.condition_text,
    o.seller_key,
    c.match_confidence,
    c.exclusion_flags,
    c.title_features->>'listing_evidence_class' as evidence_class
  from public.market_listing_card_candidates c
  join public.market_listing_observations o on o.id = c.observation_id
  where c.card_print_id in (${cardIdSql})
    and c.match_version = '${CANDIDATE_VERSION}'
  order by c.card_print_id, evidence_class, cardinality(c.exclusion_flags), c.match_confidence desc nulls last, o.total_ask_price nulls last
  limit ${cardIds.length * 5}
) sample;
` : null;
const sampleRows = sampleSql ? (runSql(sampleSql)[0]?.samples ?? []) : [];

const report = {
  package_id: "MARKET-LISTING-BOUNDED-REVIEW-EXPORT-V1",
  generated_at: new Date().toISOString(),
  mode: "bounded_local_review_export_no_writes_no_provider_calls",
  selection: {
    limit_per_bucket: limitPerBucket,
    offset_per_bucket: offsetPerBucket,
    bucket_count: 6,
    selected_rollups: selectedRows.length,
    selected_card_ids: cardIds.length,
  },
  bucket_counts: Object.fromEntries(Object.entries(Object.groupBy(selectedRows, (row) => row.review_bucket)).map(([key, rows]) => [key, rows.length])),
  rows: selectedRows,
  samples: sampleRows,
  boundary: {
    provider_calls: false,
    source_fetches: false,
    db_writes: false,
    pricing_observations_writes: false,
    public_pricing: false,
    app_visible_pricing: false,
    market_truth_promotion: false,
  },
};
report.package_fingerprint_sha256 = sha256({
  package_id: report.package_id,
  selection: report.selection,
  bucket_counts: report.bucket_counts,
  row_ids: selectedRows.map((row) => row.rollup_id),
  sample_count: sampleRows.length,
});

mkdirSync(AUDIT_DIR, { recursive: true });
const stamp = report.generated_at.replace(/[:.]/g, "-");
const jsonPath = path.join(AUDIT_DIR, `mee_12_bounded_review_export_${stamp}.json`);
const mdPath = path.join(AUDIT_DIR, `mee_12_bounded_review_export_${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, [
  "# MEE-12 Bounded Review Export V1",
  "",
  `Generated: ${report.generated_at}`,
  `Fingerprint: ${report.package_fingerprint_sha256}`,
  "",
  `This artifact is a deterministic page of ${limitPerBucket} rows per review bucket at offset ${offsetPerBucket}. It performs no provider calls, writes, or pricing publication.`,
  "",
  "## Bucket counts",
  "",
  ...Object.entries(report.bucket_counts).map(([bucket, count]) => `- ${bucket}: ${count}`),
  "",
  `- selected rollups: ${report.selection.selected_rollups}`,
  `- selected card IDs: ${report.selection.selected_card_ids}`,
  `- listing samples: ${report.samples.length}`,
  "",
  "Next step: human inspect this bounded slice before designing any review action or promotion workflow.",
  "",
].join("\n"));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  selection: report.selection,
  bucket_counts: report.bucket_counts,
  sample_count: report.samples.length,
  artifacts: { jsonPath: path.relative(REPO_ROOT, jsonPath).replaceAll("\\", "/"), mdPath: path.relative(REPO_ROOT, mdPath).replaceAll("\\", "/") },
}, null, 2));
