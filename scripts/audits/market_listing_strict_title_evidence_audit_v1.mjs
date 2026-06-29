import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

const PACKAGE_ID = "MARKET-LISTING-STRICT-TITLE-EVIDENCE-AUDIT-V1";
const SOURCE_REVIEW_QUEUE_FINGERPRINT = "90dd4d88dbd8eaf911ad76e0d3e40e848ca2a22ae092c42f83a627afda56ddb8";
const RAW_ROLLUP_VERSION = "MEE_11S_INTERNAL_RAW_SINGLE_ACTIVE_ASK_REVIEW_V1";
const SLAB_ROLLUP_VERSION = "MEE_11S_INTERNAL_SLAB_ACTIVE_ASK_REVIEW_V1";
const CANDIDATE_VERSION = "MEE_11S_REVIEW_ONLY_TARGETED_LISTING_CANDIDATES_V1";

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

function lower(value) {
  return String(value ?? "").toLowerCase();
}

function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function parseBaseLane(gvId) {
  if (!gvId?.startsWith("GV-PK-BASE1-")) return null;
  const body = gvId.replace("GV-PK-BASE1-", "");
  if (body.endsWith("-FIRST-EDITION")) return { lane: "first_edition", number: body.replace("-FIRST-EDITION", "") };
  if (body.endsWith("-SHADOWLESS")) return { lane: "shadowless", number: body.replace("-SHADOWLESS", "") };
  if (body.endsWith("-1999-2000")) return { lane: "1999_2000", number: body.replace("-1999-2000", "") };
  return { lane: "base_or_unlimited", number: body };
}

function numberPattern(number) {
  const escaped = String(number).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^0-9])${escaped}\\s*(/|of|#|$|[^0-9])`, "i");
}

function titleSignals(row, title) {
  const text = lower(title);
  const signals = {
    has_pokemon: text.includes("pokemon") || text.includes("pokémon") || text.includes("pok├"),
    has_lot_noise: includesAny(text, [" lot ", "bundle", "choose a card", "buy 3 get 3", "playset", "x4 ", "4x "]),
    has_foreign_noise: includesAny(text, ["japanese", "italiano", "dutch", "german", "french", "spanish", "korean", "chinese"]),
    has_base_set: includesAny(text, ["base set", "base-set"]),
    has_first_edition: includesAny(text, ["1st edition", "first edition", "1st. edition"]),
    has_shadowless: text.includes("shadowless"),
    has_1999_2000: includesAny(text, ["1999-2000", "4th print", "fourth print"]),
    has_base_set_2: includesAny(text, ["base set 2", "base 2", "/130"]),
    has_exact_number: false,
  };

  const baseLane = parseBaseLane(row.gv_id);
  if (baseLane?.number) signals.has_exact_number = numberPattern(baseLane.number).test(text);
  return signals;
}

function candidatePasses(row, listing) {
  const signals = titleSignals(row, listing.listing_title);
  const baseLane = parseBaseLane(row.gv_id);
  const reasons = [];

  if (!signals.has_pokemon) reasons.push("missing_pokemon_token");
  if (signals.has_lot_noise) reasons.push("lot_or_bulk_title_noise");
  if (signals.has_foreign_noise) reasons.push("foreign_language_title_noise");

  if (baseLane) {
    if (!signals.has_base_set) reasons.push("base_lane_missing_base_set");
    if (!signals.has_exact_number) reasons.push("base_lane_missing_exact_number");
    if (signals.has_base_set_2) reasons.push("base_lane_has_base_set_2_noise");
    if (baseLane.lane === "first_edition" && !signals.has_first_edition) reasons.push("first_edition_lane_missing_title_token");
    if (baseLane.lane === "shadowless" && !signals.has_shadowless) reasons.push("shadowless_lane_missing_title_token");
    if (baseLane.lane === "1999_2000" && !signals.has_1999_2000) reasons.push("1999_2000_lane_missing_title_token");
  }

  return {
    passes_strict_title_gate: reasons.length === 0,
    reasons,
    signals,
  };
}

function reviewBucketFromStrict(row, passCount, totalCount) {
  if (totalCount === 0) return "strict_title_blocked_no_candidate_titles";
  const passRatio = passCount / totalCount;
  const minimumPassCount = row.evidence_class === "slab" ? 3 : 5;
  if (passCount >= minimumPassCount && passRatio >= 0.6) return "strict_title_review_ready";
  if (passCount > 0) return "strict_title_review_required_mixed_titles";
  return "strict_title_blocked_title_mismatch";
}

function increment(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function renderMarkdown(report) {
  return [
    "# MEE Market Listing Strict Title Evidence Audit V1",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Source review queue: \`${report.source_review_queue_fingerprint_sha256}\``,
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
    JSON.stringify(report.strict_bucket_counts, null, 2),
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
select coalesce(jsonb_agg(to_jsonb(base) order by base.evidence_class, base.gv_id), '[]'::jsonb)::text as rows
from (
  select
    r.id::text as rollup_id,
    r.card_print_id::text,
    r.gv_id,
    case
      when r.rollup_version = '${RAW_ROLLUP_VERSION}' then 'raw_single'
      when r.rollup_version = '${SLAB_ROLLUP_VERSION}' then 'slab'
      else coalesce(r.rollup_payload->>'evidence_class', 'unknown')
    end as evidence_class,
    r.rollup_version,
    r.listing_count,
    r.seller_count,
    r.median_active_ask,
    r.minimum_active_ask,
    r.maximum_active_ask,
    r.currency,
    r.needs_review,
    r.publishable,
    r.app_visible,
    r.market_truth,
    coalesce(listings.payload, '[]'::jsonb) as candidate_listings
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
        c.match_confidence,
        c.exclusion_flags
      from public.market_listing_card_candidates c
      join public.market_listing_observations o on o.id = c.observation_id
      where c.card_print_id = r.card_print_id
        and c.match_version = '${CANDIDATE_VERSION}'
        and c.title_features->>'listing_evidence_class' = case
          when r.rollup_version = '${RAW_ROLLUP_VERSION}' then 'raw_single'
          when r.rollup_version = '${SLAB_ROLLUP_VERSION}' then 'slab'
          else coalesce(r.rollup_payload->>'evidence_class', 'unknown')
        end
      order by o.total_ask_price nulls last, o.listing_title
      limit 25
    ) sample
  ) listings on true
  where r.rollup_version in ('${RAW_ROLLUP_VERSION}', '${SLAB_ROLLUP_VERSION}')
) base;
`;

const queryResult = JSON.parse(runSql(sql));
const rawRows = queryResult.rows?.[0]?.rows;
if (!rawRows) throw new Error("[market-listing-strict-title-evidence-audit] failed to parse rows");

const rows = JSON.parse(rawRows);
const auditedRows = rows.map((row) => {
  const listingAudits = (row.candidate_listings ?? []).map((listing) => ({
    ...listing,
    strict_title_gate: candidatePasses(row, listing),
  }));
  const passCount = listingAudits.filter((listing) => listing.strict_title_gate.passes_strict_title_gate).length;
  const totalCount = listingAudits.length;
  const strictBucket = reviewBucketFromStrict(row, passCount, totalCount);
  const reasonCounts = {};
  for (const listing of listingAudits) {
    for (const reason of listing.strict_title_gate.reasons) increment(reasonCounts, reason);
  }
  return {
    gv_id: row.gv_id,
    card_print_id: row.card_print_id,
    evidence_class: row.evidence_class,
    listing_count: row.listing_count,
    seller_count: row.seller_count,
    median_active_ask: row.median_active_ask,
    minimum_active_ask: row.minimum_active_ask,
    maximum_active_ask: row.maximum_active_ask,
    strict_sample_count: totalCount,
    strict_pass_count: passCount,
    strict_pass_ratio: totalCount ? Math.round((passCount / totalCount) * 1000) / 1000 : 0,
    strict_review_bucket: strictBucket,
    strict_reason_counts: reasonCounts,
    sample_failures: listingAudits
      .filter((listing) => !listing.strict_title_gate.passes_strict_title_gate)
      .slice(0, 5)
      .map((listing) => ({
        title: listing.listing_title,
        total_ask_price: listing.total_ask_price,
        reasons: listing.strict_title_gate.reasons,
        url: listing.listing_url,
      })),
    sample_passes: listingAudits
      .filter((listing) => listing.strict_title_gate.passes_strict_title_gate)
      .slice(0, 5)
      .map((listing) => ({
        title: listing.listing_title,
        total_ask_price: listing.total_ask_price,
        url: listing.listing_url,
      })),
  };
});

const bucketCounts = {};
const bucketCountsByEvidenceClass = {};
const reasonCounts = {};
for (const row of auditedRows) {
  increment(bucketCounts, row.strict_review_bucket);
  bucketCountsByEvidenceClass[row.evidence_class] ??= {};
  increment(bucketCountsByEvidenceClass[row.evidence_class], row.strict_review_bucket);
  for (const [reason, count] of Object.entries(row.strict_reason_counts)) {
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + count;
  }
}

const findings = [];
const blockedOrMixed = (bucketCounts.strict_title_blocked_title_mismatch ?? 0) + (bucketCounts.strict_title_review_required_mixed_titles ?? 0);
if (blockedOrMixed > 0) findings.push("strict_title_gate_reduces_review_ready_pool");
if ((reasonCounts.first_edition_lane_missing_title_token ?? 0) > 0) findings.push("first_edition_lane_title_mismatches_present");
if ((reasonCounts.shadowless_lane_missing_title_token ?? 0) > 0) findings.push("shadowless_lane_title_mismatches_present");
if ((reasonCounts["1999_2000_lane_missing_title_token"] ?? 0) > 0) findings.push("1999_2000_lane_title_mismatches_present");
if ((reasonCounts.base_lane_missing_exact_number ?? 0) > 0) findings.push("base_lane_exact_number_mismatches_present");

const reportPayloadForHash = {
  source_review_queue_fingerprint_sha256: SOURCE_REVIEW_QUEUE_FINGERPRINT,
  strict_bucket_counts: bucketCounts,
  strict_bucket_counts_by_evidence_class: bucketCountsByEvidenceClass,
  strict_reason_counts: reasonCounts,
  findings,
};

const generatedAt = new Date().toISOString();
const report = {
  package_id: PACKAGE_ID,
  generated_at: generatedAt,
  mode: "read_only_strict_title_evidence_audit_no_writes",
  source_review_queue_fingerprint_sha256: SOURCE_REVIEW_QUEUE_FINGERPRINT,
  package_fingerprint_sha256: sha256(reportPayloadForHash),
  summary: {
    total_rollups_audited: auditedRows.length,
    strict_title_review_ready_count: bucketCounts.strict_title_review_ready ?? 0,
    strict_title_review_required_mixed_titles_count: bucketCounts.strict_title_review_required_mixed_titles ?? 0,
    strict_title_blocked_title_mismatch_count: bucketCounts.strict_title_blocked_title_mismatch ?? 0,
    strict_title_blocked_no_candidate_titles_count: bucketCounts.strict_title_blocked_no_candidate_titles ?? 0,
  },
  strict_bucket_counts: bucketCounts,
  strict_bucket_counts_by_evidence_class: bucketCountsByEvidenceClass,
  strict_reason_counts: reasonCounts,
  samples: {
    blocked_title_mismatch: auditedRows.filter((row) => row.strict_review_bucket === "strict_title_blocked_title_mismatch").slice(0, 12),
    mixed_titles: auditedRows.filter((row) => row.strict_review_bucket === "strict_title_review_required_mixed_titles").slice(0, 12),
    strict_ready: auditedRows.filter((row) => row.strict_review_bucket === "strict_title_review_ready").slice(0, 12),
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
    "Patch the review gate to include strict title evidence rules before nightly automation: exact number/set checks for high-risk lanes, required Base print-run tokens for 1st Edition/Shadowless/1999-2000, and exclusion of lot/foreign/bulk titles from rollup medians rather than merely flagging the parent rollup.",
};

mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
const stamp = generatedAt.replace(/[:.]/g, "-");
const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11x_market_listing_strict_title_evidence_audit_${stamp}.json`);
const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11x_market_listing_strict_title_evidence_audit_${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      summary: report.summary,
      strict_bucket_counts: report.strict_bucket_counts,
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
