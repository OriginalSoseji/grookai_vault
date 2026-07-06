import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

const PACKAGE_ID = "MARKET-LISTING-REVIEW-GATE-THRESHOLD-PLAN-V1";
const SOURCE_CLEANUP_BASELINE_FINGERPRINT = "fc70b2d5a34a6f5378ec1a219eb0e0e1933342e0743f86bcf5cd078bf6d1575e";
const RAW_ROLLUP_VERSION = "MEE_11S_INTERNAL_RAW_SINGLE_ACTIVE_ASK_REVIEW_V1";
const SLAB_ROLLUP_VERSION = "MEE_11S_INTERNAL_SLAB_ACTIVE_ASK_REVIEW_V1";

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
    maxBuffer: 96 * 1024 * 1024,
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

function evidenceClassFor(row) {
  if (row.rollup_version === SLAB_ROLLUP_VERSION) return "slab";
  if (row.rollup_version === RAW_ROLLUP_VERSION) return "raw_single";
  return row.rollup_payload?.evidence_class ?? "unknown";
}

function classify(row) {
  const evidenceClass = evidenceClassFor(row);
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
    evidence_class: evidenceClass,
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

function topSamples(rows, predicate, limit = 15) {
  return rows
    .filter(predicate)
    .sort((left, right) => {
      const leftListings = Number(left.listing_count) || 0;
      const rightListings = Number(right.listing_count) || 0;
      return rightListings - leftListings || String(left.gv_id).localeCompare(String(right.gv_id));
    })
    .slice(0, limit)
    .map((row) => ({
      gv_id: row.gv_id,
      evidence_class: row.evidence_class,
      review_bucket: row.review_bucket,
      listing_count: row.listing_count,
      seller_count: row.seller_count,
      median_active_ask: row.median_active_ask,
      minimum_active_ask: row.minimum_active_ask,
      maximum_active_ask: row.maximum_active_ask,
      max_to_median_ratio: row.max_to_median_ratio,
      trimmed_band_ratio: row.trimmed_band_ratio,
      flags: row.flags,
      warning_flags: row.warning_flags,
    }));
}

function renderMarkdown(report) {
  return [
    "# MEE Market Listing Review Gate Threshold Plan V1",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Source cleanup baseline: \`${report.source_cleanup_baseline_fingerprint_sha256}\``,
    "",
    "## Thresholds",
    "",
    "```json",
    JSON.stringify(report.thresholds, null, 2),
    "```",
    "",
    "## Summary",
    "",
    "```json",
    JSON.stringify(report.summary, null, 2),
    "```",
    "",
    "## Buckets",
    "",
    "```json",
    JSON.stringify(report.bucket_counts, null, 2),
    "```",
    "",
    "## Samples",
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
select coalesce(jsonb_agg(to_jsonb(t) order by evidence_class, gv_id), '[]'::jsonb)::text as rollups
from (
  select
    id::text,
    card_print_id::text,
    gv_id,
    case
      when rollup_version = '${RAW_ROLLUP_VERSION}' then 'raw_single'
      when rollup_version = '${SLAB_ROLLUP_VERSION}' then 'slab'
      else coalesce(rollup_payload->>'evidence_class', 'unknown')
    end as evidence_class,
    source,
    rollup_version,
    rollup_window,
    listing_count,
    seller_count,
    median_active_ask,
    trimmed_low_active_ask,
    trimmed_high_active_ask,
    minimum_active_ask,
    maximum_active_ask,
    currency,
    exclusion_counts,
    rollup_payload,
    needs_review,
    publishable,
    app_visible,
    market_truth
  from public.market_listing_rollups
  where rollup_version in ('${RAW_ROLLUP_VERSION}', '${SLAB_ROLLUP_VERSION}')
) t;
`;

const queryResult = JSON.parse(runSql(sql));
const rawRollups = queryResult.rows?.[0]?.rollups;
if (!rawRollups) throw new Error("[market-listing-review-gate-threshold-plan] failed to parse rollups");

const enrichedRows = JSON.parse(rawRollups).map((row) => ({
  ...row,
  ...classify(row),
}));

const bucketCounts = {};
const bucketCountsByEvidenceClass = {};
const flagCounts = {};
const warningFlagCounts = {};
for (const row of enrichedRows) {
  increment(bucketCounts, row.review_bucket);
  bucketCountsByEvidenceClass[row.evidence_class] ??= {};
  increment(bucketCountsByEvidenceClass[row.evidence_class], row.review_bucket);
  for (const flag of row.flags) increment(flagCounts, flag);
  for (const flag of row.warning_flags) increment(warningFlagCounts, flag);
}

const findings = [];
if (!enrichedRows.length) findings.push("no_market_listing_rollups_found");
if (bucketCounts.blocked_boundary_violation > 0) findings.push("boundary_violation_rollups_present");
if (enrichedRows.some((row) => row.publishable || row.app_visible || row.market_truth)) findings.push("public_visibility_gate_leak");

const readyRows = enrichedRows.filter((row) => row.review_bucket === "review_ready_internal_candidate");
const reportPayloadForHash = {
  thresholds: THRESHOLDS,
  total_rollups: enrichedRows.length,
  bucket_counts: bucketCounts,
  bucket_counts_by_evidence_class: bucketCountsByEvidenceClass,
  flag_counts: flagCounts,
  warning_flag_counts: warningFlagCounts,
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "read_only_review_gate_threshold_plan_no_writes",
  source_cleanup_baseline_fingerprint_sha256: SOURCE_CLEANUP_BASELINE_FINGERPRINT,
  package_fingerprint_sha256: sha256(reportPayloadForHash),
  thresholds: THRESHOLDS,
  summary: {
    total_rollups: enrichedRows.length,
    raw_single_rollups: enrichedRows.filter((row) => row.evidence_class === "raw_single").length,
    slab_rollups: enrichedRows.filter((row) => row.evidence_class === "slab").length,
    review_ready_internal_candidate_count: readyRows.length,
    review_ready_raw_single_count: readyRows.filter((row) => row.evidence_class === "raw_single").length,
    review_ready_slab_count: readyRows.filter((row) => row.evidence_class === "slab").length,
    review_required_count: enrichedRows.length - readyRows.length,
  },
  bucket_counts: bucketCounts,
  bucket_counts_by_evidence_class: bucketCountsByEvidenceClass,
  flag_counts: flagCounts,
  warning_flag_counts: warningFlagCounts,
  samples: {
    review_ready_internal_candidates: topSamples(enrichedRows, (row) => row.review_bucket === "review_ready_internal_candidate"),
    review_required_more_evidence: topSamples(enrichedRows, (row) => row.review_bucket === "review_required_more_evidence"),
    review_required_contamination: topSamples(enrichedRows, (row) => row.review_bucket === "review_required_contamination"),
    review_required_outlier_spread: topSamples(enrichedRows, (row) => row.review_bucket === "review_required_outlier_spread"),
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
      ? "Review the threshold buckets and sample rows. If the split looks reasonable, the next step is a local-only review queue export for human inspection, not public pricing."
      : "Resolve the listed findings before building a review queue or any promotion workflow.",
};

mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
const stamp = report.generated_at.replace(/[:.]/g, "-");
const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11v_market_listing_review_gate_threshold_plan_${stamp}.json`);
const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11v_market_listing_review_gate_threshold_plan_${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      summary: report.summary,
      bucket_counts: report.bucket_counts,
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
