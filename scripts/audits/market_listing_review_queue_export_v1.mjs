import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

const PACKAGE_ID = "MARKET-LISTING-REVIEW-QUEUE-EXPORT-V1";
const SOURCE_THRESHOLD_PLAN_FINGERPRINT = "89a82df27e6450dee4aa9560f5ead60df7f7d8ca2444dec0fa246fe2f4c8bb91";
const RAW_ROLLUP_VERSION = "MEE_11S_INTERNAL_RAW_SINGLE_ACTIVE_ASK_REVIEW_V1";
const SLAB_ROLLUP_VERSION = "MEE_11S_INTERNAL_SLAB_ACTIVE_ASK_REVIEW_V1";
const CANDIDATE_VERSION = "MEE_11S_REVIEW_ONLY_TARGETED_LISTING_CANDIDATES_V1";

const THRESHOLDS = {
  raw_single: {
    minimum_listing_count: 5,
    minimum_seller_count: 2,
    maximum_max_to_median_ratio: 50,
    maximum_trimmed_band_ratio: 20,
  },
  slab: {
    minimum_listing_count: 3,
    minimum_seller_count: 2,
    maximum_max_to_median_ratio: 100,
    maximum_trimmed_band_ratio: 75,
  },
};

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
  return execFileSync("supabase", ["db", "query", sql, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value) {
  const number = asNumber(value);
  return number === null ? null : Math.round(number * 100) / 100;
}

function sumObjectValues(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return Object.values(value).reduce((sum, nested) => sum + (Number(nested) || 0), 0);
}

function classify(row) {
  const evidenceClass = row.evidence_class;
  const thresholds = THRESHOLDS[evidenceClass];
  const flags = [];
  const warningFlags = [];
  const median = asNumber(row.median_active_ask);
  const max = asNumber(row.maximum_active_ask);
  const trimmedLow = asNumber(row.trimmed_low_active_ask);
  const trimmedHigh = asNumber(row.trimmed_high_active_ask);
  const listingCount = Number(row.listing_count) || 0;
  const sellerCount = Number(row.seller_count) || 0;
  const exclusionCount = sumObjectValues(row.exclusion_counts);

  if (!thresholds) flags.push("unsupported_evidence_class");
  if (row.currency !== "USD") flags.push("non_usd_or_missing_currency");
  if (median === null) flags.push("missing_median");
  if (listingCount < (thresholds?.minimum_listing_count ?? Infinity)) flags.push("insufficient_listing_count");
  if (sellerCount < (thresholds?.minimum_seller_count ?? Infinity)) flags.push("insufficient_seller_count");
  if (exclusionCount > 0) flags.push("candidate_exclusion_flags_present");
  if (row.needs_review !== true) flags.push("needs_review_boundary_leak");
  if (row.publishable !== false) flags.push("publishable_boundary_leak");
  if (row.app_visible !== false) flags.push("app_visible_boundary_leak");
  if (row.market_truth !== false) flags.push("market_truth_boundary_leak");

  const maxToMedianRatio = median && max ? max / median : null;
  if (maxToMedianRatio !== null && maxToMedianRatio > thresholds.maximum_max_to_median_ratio) {
    warningFlags.push("extreme_max_to_median_ratio");
  }

  const trimmedBandRatio = trimmedLow && trimmedHigh ? trimmedHigh / trimmedLow : null;
  if (trimmedBandRatio !== null && trimmedBandRatio > thresholds.maximum_trimmed_band_ratio) {
    warningFlags.push("wide_trimmed_band_ratio");
  }

  let reviewBucket = "review_ready_internal_candidate";
  if (flags.some((flag) => flag.includes("boundary_leak"))) reviewBucket = "blocked_boundary_violation";
  else if (flags.includes("unsupported_evidence_class") || flags.includes("non_usd_or_missing_currency") || flags.includes("missing_median")) reviewBucket = "blocked_missing_required_signal";
  else if (flags.includes("candidate_exclusion_flags_present")) reviewBucket = "review_required_contamination";
  else if (flags.includes("insufficient_listing_count") || flags.includes("insufficient_seller_count")) reviewBucket = "review_required_more_evidence";
  else if (warningFlags.length) reviewBucket = "review_required_outlier_spread";

  return {
    review_bucket: reviewBucket,
    flags,
    warning_flags: warningFlags,
    max_to_median_ratio: round(maxToMedianRatio),
    trimmed_band_ratio: round(trimmedBandRatio),
  };
}

function increment(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function csvValue(value) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) || typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function renderCsv(rows) {
  const headers = [
    "review_bucket",
    "evidence_class",
    "gv_id",
    "card_print_id",
    "listing_count",
    "seller_count",
    "median_active_ask",
    "minimum_active_ask",
    "maximum_active_ask",
    "max_to_median_ratio",
    "trimmed_band_ratio",
    "flags",
    "warning_flags",
    "sample_title_1",
    "sample_price_1",
    "sample_url_1",
    "sample_title_2",
    "sample_price_2",
    "sample_url_2",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    const sample1 = row.sample_listings[0] ?? {};
    const sample2 = row.sample_listings[1] ?? {};
    lines.push(
      [
        row.review_bucket,
        row.evidence_class,
        row.gv_id,
        row.card_print_id,
        row.listing_count,
        row.seller_count,
        row.median_active_ask,
        row.minimum_active_ask,
        row.maximum_active_ask,
        row.max_to_median_ratio,
        row.trimmed_band_ratio,
        row.flags,
        row.warning_flags,
        sample1.listing_title,
        sample1.total_ask_price,
        sample1.listing_url,
        sample2.listing_title,
        sample2.total_ask_price,
        sample2.listing_url,
      ].map(csvValue).join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

function renderMarkdown(report) {
  return [
    "# MEE Market Listing Review Queue Export V1",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Source threshold plan: \`${report.source_threshold_plan_fingerprint_sha256}\``,
    "",
    "## Summary",
    "",
    "```json",
    JSON.stringify(report.summary, null, 2),
    "```",
    "",
    "## Bucket Counts",
    "",
    "```json",
    JSON.stringify(report.bucket_counts, null, 2),
    "```",
    "",
    "## Review Files",
    "",
    `- Full JSON queue: \`${report.artifacts.review_queue_json_path}\``,
    `- CSV queue: \`${report.artifacts.review_queue_csv_path}\``,
    "",
    "## Top Review Samples",
    "",
    "```json",
    JSON.stringify(report.samples, null, 2),
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
select coalesce(jsonb_agg(to_jsonb(base) order by base.review_sort, base.evidence_class, base.gv_id), '[]'::jsonb)::text as rows
from (
  select
    r.id::text,
    r.card_print_id::text,
    r.gv_id,
    case
      when r.rollup_version = '${RAW_ROLLUP_VERSION}' then 'raw_single'
      when r.rollup_version = '${SLAB_ROLLUP_VERSION}' then 'slab'
      else coalesce(r.rollup_payload->>'evidence_class', 'unknown')
    end as evidence_class,
    r.source,
    r.rollup_version,
    r.rollup_window,
    r.listing_count,
    r.seller_count,
    r.median_active_ask,
    r.trimmed_low_active_ask,
    r.trimmed_high_active_ask,
    r.minimum_active_ask,
    r.maximum_active_ask,
    r.currency,
    r.exclusion_counts,
    r.rollup_payload,
    r.needs_review,
    r.publishable,
    r.app_visible,
    r.market_truth,
    case
      when r.rollup_version = '${RAW_ROLLUP_VERSION}' then 1
      when r.rollup_version = '${SLAB_ROLLUP_VERSION}' then 2
      else 9
    end as review_sort,
    coalesce(samples.payload, '[]'::jsonb) as sample_listings
  from public.market_listing_rollups r
  left join lateral (
    select jsonb_agg(to_jsonb(sample) order by sample.total_ask_price nulls last, sample.listing_title) as payload
    from (
      select
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
      where c.card_print_id = r.card_print_id
        and c.match_version = '${CANDIDATE_VERSION}'
        and c.title_features->>'listing_evidence_class' = case
          when r.rollup_version = '${RAW_ROLLUP_VERSION}' then 'raw_single'
          when r.rollup_version = '${SLAB_ROLLUP_VERSION}' then 'slab'
          else coalesce(r.rollup_payload->>'evidence_class', 'unknown')
        end
      order by cardinality(c.exclusion_flags), c.match_confidence desc nulls last, o.total_ask_price nulls last
      limit 5
    ) sample
  ) samples on true
  where r.rollup_version in ('${RAW_ROLLUP_VERSION}', '${SLAB_ROLLUP_VERSION}')
) base;
`;

const queryResult = JSON.parse(runSql(sql));
const rawRows = queryResult.rows?.[0]?.rows;
if (!rawRows) throw new Error("[market-listing-review-queue-export] failed to parse review queue rows");

const rows = JSON.parse(rawRows).map((row) => {
  const classification = classify(row);
  return {
    ...row,
    ...classification,
  };
});

const orderedRows = rows.sort((left, right) => {
  const bucketOrder = {
    review_required_contamination: 1,
    review_required_outlier_spread: 2,
    review_ready_internal_candidate: 3,
    review_required_more_evidence: 4,
    blocked_missing_required_signal: 5,
    blocked_boundary_violation: 6,
  };
  return (
    (bucketOrder[left.review_bucket] ?? 99) - (bucketOrder[right.review_bucket] ?? 99) ||
    left.evidence_class.localeCompare(right.evidence_class) ||
    String(left.gv_id).localeCompare(String(right.gv_id))
  );
});

const bucketCounts = {};
const bucketCountsByEvidenceClass = {};
for (const row of orderedRows) {
  increment(bucketCounts, row.review_bucket);
  bucketCountsByEvidenceClass[row.evidence_class] ??= {};
  increment(bucketCountsByEvidenceClass[row.evidence_class], row.review_bucket);
}

const findings = [];
if (!orderedRows.length) findings.push("no_review_queue_rows");
if (orderedRows.some((row) => row.publishable || row.app_visible || row.market_truth)) findings.push("public_visibility_gate_leak");
if (orderedRows.some((row) => row.review_bucket === "blocked_boundary_violation")) findings.push("boundary_violation_rows_present");

const reviewQueuePayload = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  source_threshold_plan_fingerprint_sha256: SOURCE_THRESHOLD_PLAN_FINGERPRINT,
  thresholds: THRESHOLDS,
  rows: orderedRows,
};

const reportPayloadForHash = {
  source_threshold_plan_fingerprint_sha256: SOURCE_THRESHOLD_PLAN_FINGERPRINT,
  thresholds: THRESHOLDS,
  row_count: orderedRows.length,
  bucket_counts: bucketCounts,
  bucket_counts_by_evidence_class: bucketCountsByEvidenceClass,
  findings,
};

mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
const generatedAt = reviewQueuePayload.generated_at;
const stamp = generatedAt.replace(/[:.]/g, "-");
const reviewQueueJsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11w_market_listing_review_queue_${stamp}.json`);
const reviewQueueCsvPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11w_market_listing_review_queue_${stamp}.csv`);
const reportJsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11w_market_listing_review_queue_export_${stamp}.json`);
const reportMdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11w_market_listing_review_queue_export_${stamp}.md`);

writeFileSync(reviewQueueJsonPath, `${JSON.stringify(reviewQueuePayload, null, 2)}\n`);
writeFileSync(reviewQueueCsvPath, renderCsv(orderedRows));

const report = {
  package_id: PACKAGE_ID,
  generated_at: generatedAt,
  mode: "local_review_queue_export_no_writes_no_provider_calls",
  source_threshold_plan_fingerprint_sha256: SOURCE_THRESHOLD_PLAN_FINGERPRINT,
  package_fingerprint_sha256: sha256(reportPayloadForHash),
  summary: {
    total_queue_rows: orderedRows.length,
    review_ready_internal_candidate_count: bucketCounts.review_ready_internal_candidate ?? 0,
    review_required_count: orderedRows.length - (bucketCounts.review_ready_internal_candidate ?? 0),
    raw_single_rows: orderedRows.filter((row) => row.evidence_class === "raw_single").length,
    slab_rows: orderedRows.filter((row) => row.evidence_class === "slab").length,
  },
  bucket_counts: bucketCounts,
  bucket_counts_by_evidence_class: bucketCountsByEvidenceClass,
  samples: {
    contamination: orderedRows.filter((row) => row.review_bucket === "review_required_contamination").slice(0, 10),
    outlier_spread: orderedRows.filter((row) => row.review_bucket === "review_required_outlier_spread").slice(0, 10),
    review_ready: orderedRows.filter((row) => row.review_bucket === "review_ready_internal_candidate").slice(0, 10),
    more_evidence: orderedRows.filter((row) => row.review_bucket === "review_required_more_evidence").slice(0, 10),
  },
  artifacts: {
    review_queue_json_path: rel(reviewQueueJsonPath),
    review_queue_csv_path: rel(reviewQueueCsvPath),
  },
  boundary: {
    provider_calls: false,
    source_fetches: false,
    db_writes: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    vault_writes: false,
    image_writes: false,
    deletes: false,
  },
  findings,
  recommended_next_step:
    findings.length === 0
      ? "Spot-check the CSV queue, especially contamination and outlier buckets. If the queue shape looks right, the next step is designing a one-approval nightly ingest contract around this same review-only pipeline."
      : "Resolve the listed findings before designing nightly automation or promotion workflows.",
};

writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(reportMdPath, renderMarkdown(report));

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      summary: report.summary,
      bucket_counts: report.bucket_counts,
      findings: report.findings,
      artifacts: {
        reportJsonPath: rel(reportJsonPath),
        reportMdPath: rel(reportMdPath),
        reviewQueueJsonPath: rel(reviewQueueJsonPath),
        reviewQueueCsvPath: rel(reviewQueueCsvPath),
      },
      recommended_next_step: report.recommended_next_step,
    },
    null,
    2,
  ),
);
