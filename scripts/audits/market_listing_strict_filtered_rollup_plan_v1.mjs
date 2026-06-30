import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { evaluateMarketListingTitleGateV1, MARKET_LISTING_TITLE_GATE_VERSION } from "../../backend/pricing/market_listing_title_gate_v1.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

const PACKAGE_ID = "MARKET-LISTING-STRICT-FILTERED-ROLLUP-PLAN-V1";
const SOURCE_STRICT_TITLE_AUDIT_FINGERPRINT = "7f5e73c2c9504291194b6f7ff269a3145ad6c9c1e075ceb012a79d3fa1417eec";
const CANDIDATE_VERSION = "MEE_11S_REVIEW_ONLY_TARGETED_LISTING_CANDIDATES_V1";
const PAGE_SIZE = 1000;

const THRESHOLDS = {
  raw_single: {
    minimum_listing_count: 5,
    minimum_seller_count: 2,
  },
  slab: {
    minimum_listing_count: 3,
    minimum_seller_count: 2,
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

function percentile(sortedValues, p) {
  if (!sortedValues.length) return null;
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function round(value) {
  return value === null || value === undefined ? null : Math.round(Number(value) * 100) / 100;
}

function increment(map, key, amount = 1) {
  map[key] = (map[key] ?? 0) + amount;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function supabaseReadWithRetry(label, factory, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await factory();
    if (!result.error) return result;
    lastError = result.error;
    if (attempt < attempts) await sleep(500 * attempt);
  }
  throw new Error(`[market-listing-strict-filtered-rollup-plan] ${label} failed: ${lastError?.message ?? "unknown error"}`);
}

function groupKey(row) {
  return `${row.card_print_id}|${row.gv_id}|${row.evidence_class}`;
}

function firstRelated(value) {
  return Array.isArray(value) ? (value[0] ?? {}) : (value ?? {});
}

function makeRollup(group) {
  const prices = group.prices.sort((left, right) => left - right);
  const thresholds = THRESHOLDS[group.evidence_class];
  const listingCount = prices.length;
  const sellerCount = group.sellers.size;
  const reviewBucket =
    listingCount >= thresholds.minimum_listing_count && sellerCount >= thresholds.minimum_seller_count
      ? "strict_filtered_review_ready_internal_candidate"
      : "strict_filtered_needs_more_evidence";

  return {
    card_print_id: group.card_print_id,
    gv_id: group.gv_id,
    evidence_class: group.evidence_class,
    listing_count: listingCount,
    seller_count: sellerCount,
    median_active_ask: round(percentile(prices, 0.5)),
    trimmed_low_active_ask: round(percentile(prices, 0.1)),
    trimmed_high_active_ask: round(percentile(prices, 0.9)),
    minimum_active_ask: round(prices[0] ?? null),
    maximum_active_ask: round(prices.at(-1) ?? null),
    q25: round(percentile(prices, 0.25)),
    q75: round(percentile(prices, 0.75)),
    p95: round(percentile(prices, 0.95)),
    review_bucket: reviewBucket,
    sample_titles: group.samples.slice(0, 5),
  };
}

function renderMarkdown(report) {
  return [
    "# MEE Market Listing Strict Filtered Rollup Plan V1",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Source strict title audit: \`${report.source_strict_title_audit_fingerprint_sha256}\``,
    "",
    "## Summary",
    "",
    "```json",
    JSON.stringify(report.summary, null, 2),
    "```",
    "",
    "## Exclusion Reasons",
    "",
    "```json",
    JSON.stringify(report.strict_title_exclusion_reason_counts, null, 2),
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

async function fetchCandidateRows() {
  const supabase = createBackendClient();
  const rows = [];
  let lastCandidateId = null;
  for (;;) {
    const { data } = await supabaseReadWithRetry(`candidate page after ${lastCandidateId ?? "start"}`, () => {
      let query = supabase
        .from("market_listing_card_candidates")
        .select(`
        id,
        card_print_id,
        gv_id,
        source_listing_id,
        title_features,
        exclusion_flags,
        match_confidence,
        obs:market_listing_observations!market_listing_card_candidates_observation_id_fkey(
          listing_title,
          total_ask_price,
          currency,
          seller_key,
          condition_text
        )
      `)
        .eq("match_version", CANDIDATE_VERSION)
        .order("id", { ascending: true })
        .limit(PAGE_SIZE);
      if (lastCandidateId) query = query.gt("id", lastCandidateId);
      return query;
    });
    if (!data?.length) break;
    lastCandidateId = data.at(-1).id;

    for (const row of data) {
      const obs = firstRelated(row.obs);
      const evidenceClass = row.title_features?.listing_evidence_class;
      if (!["raw_single", "slab"].includes(evidenceClass)) continue;
      if (obs.total_ask_price === null || obs.total_ask_price === undefined || obs.currency !== "USD") continue;
      rows.push({
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        source_listing_id: row.source_listing_id,
        evidence_class: evidenceClass,
        listing_title: obs.listing_title,
        query_text: row.title_features?.query_text ?? null,
        strategy: row.title_features?.strategy ?? null,
        total_ask_price: obs.total_ask_price,
        currency: obs.currency,
        seller_key: obs.seller_key,
        condition_text: obs.condition_text,
        exclusion_flags: row.exclusion_flags,
        match_confidence: row.match_confidence,
      });
    }

    if (data.length < PAGE_SIZE) break;
  }
  return rows.sort((left, right) => (
    left.evidence_class.localeCompare(right.evidence_class)
    || left.gv_id.localeCompare(right.gv_id)
    || left.source_listing_id.localeCompare(right.source_listing_id)
  ));
}

async function fetchCardMetadata(candidateRows) {
  const supabase = createBackendClient();
  const ids = [...new Set(candidateRows.map((row) => row.card_print_id).filter(Boolean))];
  const map = new Map();
  for (let index = 0; index < ids.length; index += 200) {
    const chunk = ids.slice(index, index + 200);
    const { data } = await supabaseReadWithRetry(`card metadata page ${index}-${index + chunk.length - 1}`, () => supabase
      .from("card_prints")
      .select("id,gv_id,name,set_code,number,number_plain,printed_set_abbrev,printed_identity_modifier,identity_domain,set:sets(name)")
      .in("id", chunk));
    for (const row of data ?? []) {
      map.set(row.id, {
        id: row.id,
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        set_name: row.set?.name ?? null,
        number: row.number,
        number_plain: row.number_plain,
        printed_set_abbrev: row.printed_set_abbrev,
        printed_identity_modifier: row.printed_identity_modifier,
        identity_domain: row.identity_domain,
      });
    }
  }
  return map;
}

const candidateRows = await fetchCandidateRows();
const cardMetadata = await fetchCardMetadata(candidateRows);
const groups = new Map();
const exclusionReasonCounts = {};
const candidateCounts = {
  total: candidateRows.length,
  strict_title_passed: 0,
  strict_title_excluded: 0,
  raw_single_total: 0,
  raw_single_passed: 0,
  slab_total: 0,
  slab_passed: 0,
};

function titleGate(row) {
  return evaluateMarketListingTitleGateV1({
    ...row,
    card: cardMetadata.get(row.card_print_id) ?? null,
  });
}

for (const row of candidateRows) {
  increment(candidateCounts, `${row.evidence_class}_total`);
  const gate = titleGate(row);
  if (!gate.passes) {
    candidateCounts.strict_title_excluded += 1;
    for (const reason of gate.reasons) increment(exclusionReasonCounts, reason);
    continue;
  }

  candidateCounts.strict_title_passed += 1;
  increment(candidateCounts, `${row.evidence_class}_passed`);
  const key = groupKey(row);
  const group = groups.get(key) ?? {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    evidence_class: row.evidence_class,
    prices: [],
    sellers: new Set(),
    samples: [],
  };
  group.prices.push(Number(row.total_ask_price));
  if (row.seller_key) group.sellers.add(row.seller_key);
  if (group.samples.length < 5) {
    group.samples.push({
      title: row.listing_title,
      total_ask_price: round(row.total_ask_price),
      condition_text: row.condition_text,
    });
  }
  groups.set(key, group);
}

const rollups = [...groups.values()].map(makeRollup).sort((left, right) => (
  left.review_bucket.localeCompare(right.review_bucket) ||
  left.evidence_class.localeCompare(right.evidence_class) ||
  left.gv_id.localeCompare(right.gv_id)
));

const bucketCounts = {};
const evidenceBucketCounts = {};
for (const row of rollups) {
  increment(bucketCounts, row.review_bucket);
  evidenceBucketCounts[row.evidence_class] ??= {};
  increment(evidenceBucketCounts[row.evidence_class], row.review_bucket);
}

const findings = [];
if (!rollups.length) findings.push("no_strict_filtered_rollups");
if (candidateCounts.strict_title_excluded > 0) findings.push("strict_title_filter_excluded_candidate_rows");

const generatedAt = new Date().toISOString();
const reportPayloadForHash = {
  source_strict_title_audit_fingerprint_sha256: SOURCE_STRICT_TITLE_AUDIT_FINGERPRINT,
  title_gate_version: MARKET_LISTING_TITLE_GATE_VERSION,
  candidate_counts: candidateCounts,
  rollup_bucket_counts: bucketCounts,
  evidence_bucket_counts: evidenceBucketCounts,
  strict_title_exclusion_reason_counts: exclusionReasonCounts,
};

mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
const stamp = generatedAt.replace(/[:.]/g, "-");
const rollupJsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11y_market_listing_strict_filtered_rollups_${stamp}.json`);
const reportJsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11y_market_listing_strict_filtered_rollup_plan_${stamp}.json`);
const reportMdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11y_market_listing_strict_filtered_rollup_plan_${stamp}.md`);

writeFileSync(rollupJsonPath, `${JSON.stringify({ generated_at: generatedAt, rows: rollups }, null, 2)}\n`);

const report = {
  package_id: PACKAGE_ID,
  generated_at: generatedAt,
  mode: "local_strict_filtered_rollup_plan_no_writes_no_provider_calls",
  source_strict_title_audit_fingerprint_sha256: SOURCE_STRICT_TITLE_AUDIT_FINGERPRINT,
  title_gate_version: MARKET_LISTING_TITLE_GATE_VERSION,
  package_fingerprint_sha256: sha256(reportPayloadForHash),
  summary: {
    candidate_rows_total: candidateCounts.total,
    candidate_rows_strict_title_passed: candidateCounts.strict_title_passed,
    candidate_rows_strict_title_excluded: candidateCounts.strict_title_excluded,
    strict_filtered_rollup_count: rollups.length,
    strict_filtered_review_ready_count: bucketCounts.strict_filtered_review_ready_internal_candidate ?? 0,
    strict_filtered_needs_more_evidence_count: bucketCounts.strict_filtered_needs_more_evidence ?? 0,
    raw_single_passed_candidates: candidateCounts.raw_single_passed,
    slab_passed_candidates: candidateCounts.slab_passed,
  },
  candidate_counts: candidateCounts,
  rollup_bucket_counts: bucketCounts,
  evidence_bucket_counts: evidenceBucketCounts,
  strict_title_exclusion_reason_counts: exclusionReasonCounts,
  samples: {
    review_ready: rollups.filter((row) => row.review_bucket === "strict_filtered_review_ready_internal_candidate").slice(0, 12),
    needs_more_evidence: rollups.filter((row) => row.review_bucket === "strict_filtered_needs_more_evidence").slice(0, 12),
  },
  artifacts: {
    strict_filtered_rollups_json_path: rel(rollupJsonPath),
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
    "Use this strict-filtered rollup plan as the nightly pipeline target: filter listing rows before medians are calculated, then generate internal review-only rollups from the passing listings only.",
};

writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(reportMdPath, renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  summary: report.summary,
  findings: report.findings,
  artifacts: {
    reportJsonPath: rel(reportJsonPath),
    reportMdPath: rel(reportMdPath),
    strictFilteredRollupsJsonPath: rel(rollupJsonPath),
  },
  recommended_next_step: report.recommended_next_step,
}, null, 2));
