import {
  normalizeTcgplayerMarketSubtypeV1,
} from "./tcgplayer_market_publication_policy_v1.mjs";
import {
  classifyTcgplayerMarketProductScopeV1_1,
  TCGPLAYER_MARKET_V1_1_GROUP_SCOPE_RULES,
} from "./tcgplayer_market_product_scope_v1.mjs";

export const TCGPLAYER_MARKET_COVERAGE_POLICY_V1 =
  "TCGPLAYER_MARKET_COVERAGE_POLICY_V1";
export const TCGPLAYER_MARKET_COVERAGE_POLICY_V1_1 =
  "TCGPLAYER_MARKET_COVERAGE_POLICY_V1_1";
export const TCGPLAYER_MARKET_MINIMUM_COVERAGE_PERCENT_V1 = 95;

export const TCGPLAYER_MARKET_V1_SCOPE_EXCLUSION_RULES =
  TCGPLAYER_MARKET_V1_1_GROUP_SCOPE_RULES;

const GAP_REASON_PRIORITY = [
  "ambiguous_active_source_mapping",
  "ambiguous_card_mapping",
  "ambiguous_printing_finish_mapping",
  "duplicate_source_product_subtype",
  "missing_active_source_mapping",
  "missing_exact_card_mapping",
  "missing_source_mapping_identity",
  "missing_mapping_method",
  "missing_canonical_card_identity",
  "missing_variant_assignment",
  "variant_assignment_not_exact_child_finish",
  "missing_exact_printing_finish_mapping",
  "missing_canonical_printing_identity",
  "missing_printed_number_evidence",
  "finish_mapping_conflict",
  "not_english_standard_identity",
  "source_sync_not_completed",
  "source_sync_not_reconciled",
  "missing_source_freshness",
  "source_observation_stale",
];

function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function evidence(row) {
  return row?.evidence && typeof row.evidence === "object"
    ? row.evidence
    : {};
}

function reasons(row) {
  return Array.isArray(row?.reason_codes)
    ? [...new Set(row.reason_codes.map(text).filter(Boolean))].sort()
    : [];
}

export function tcgplayerMarketV1GroupScopeExclusionV1(groupName) {
  const value = text(groupName);
  const match = TCGPLAYER_MARKET_V1_SCOPE_EXCLUSION_RULES.find((rule) =>
    rule.pattern.test(value),
  );
  return match?.id ?? null;
}

export function tcgplayerMarketCoverageEraV1(publishedOn) {
  const match = text(publishedOn).match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return "unknown";
  const date = match[1];
  if (date < "2005-01-01") return "vintage";
  if (date >= "2016-01-01") return "modern";
  return "middle";
}

export function tcgplayerMarketCoverageValueBandV1(marketPrice) {
  const value = number(marketPrice);
  if (value === null || value <= 0) return "not_usable";
  if (value < 1) return "low";
  if (value < 20) return "medium";
  return "high";
}

function denominatorExclusion(row) {
  const rowEvidence = evidence(row);
  const categoryId = Number(row.category_id ?? rowEvidence.category_id);
  const sourceActive =
    row.source_product_active ?? rowEvidence.source_product_active;
  const sourceCatalogStatus = text(
    row.source_product_catalog_status ??
      rowEvidence.source_product_catalog_status,
  );
  const currency = text(row.currency).toUpperCase();
  const marketPrice = number(row.market_price);
  const normalizedFinish =
    text(row.normalized_finish_key ?? rowEvidence.normalized_finish_key) ||
    normalizeTcgplayerMarketSubtypeV1(row.source_subtype_name);
  const scope = classifyTcgplayerMarketProductScopeV1_1(row);

  if (categoryId !== 3) return "not_pokemon_category";
  if (sourceActive !== true) return "source_product_inactive";
  if (sourceCatalogStatus !== "current") return "source_product_not_current";
  if (!scope.in_scope) return scope.reason_code;
  if (currency !== "USD") return "unsupported_currency";
  if (marketPrice === null || marketPrice <= 0) {
    return "missing_positive_market_price";
  }
  if (!normalizedFinish) return "unsupported_source_subtype";
  if (row.language_result === "non_english") return "non_english_source";
  if (row.source_integrity_result === "failed") {
    return "source_integrity_not_usable";
  }
  return null;
}

function primaryGapReason(row) {
  const rowReasons = reasons(row);
  const priority = GAP_REASON_PRIORITY.find((reason) =>
    rowReasons.includes(reason),
  );
  return priority ?? rowReasons[0] ?? "unclassified_coverage_gap";
}

export function classifyTcgplayerMarketCoverageRowV1(row = {}) {
  const exclusionReason = denominatorExclusion(row);
  const inDenominator = exclusionReason === null;
  const inNumerator =
    inDenominator && ["publish", "delay"].includes(text(row.decision));
  const rowEvidence = evidence(row);
  const normalizedFinish =
    text(row.normalized_finish_key ?? rowEvidence.normalized_finish_key) ||
    normalizeTcgplayerMarketSubtypeV1(row.source_subtype_name) ||
    "unsupported";
  const mapped =
    Number(rowEvidence.source_mapping_count) === 1 &&
    Number(rowEvidence.card_print_mapping_count) === 1 &&
    Boolean(text(row.card_print_id));

  return {
    policy_version: TCGPLAYER_MARKET_COVERAGE_POLICY_V1_1,
    decision_id: row.id ?? null,
    source_observation_id: row.source_observation_id ?? null,
    source_product_id: Number(row.source_product_id),
    source_product_name: text(row.source_product_name) || null,
    source_group_id: Number(row.source_group_id),
    source_group_name: text(row.source_group_name) || null,
    source_subtype_name: text(row.source_subtype_name) || null,
    normalized_finish_key: normalizedFinish,
    market_price: number(row.market_price),
    decision: text(row.decision) || null,
    reason_codes: reasons(row),
    in_denominator: inDenominator,
    denominator_exclusion_reason: exclusionReason,
    product_scope: classifyTcgplayerMarketProductScopeV1_1(row),
    in_numerator: inNumerator,
    primary_gap_reason:
      inDenominator && !inNumerator ? primaryGapReason(row) : null,
    mapped,
    exact_printing:
      mapped &&
      Number(rowEvidence.card_printing_mapping_count) === 1 &&
      text(row.variant_assignment_status) === "exact_child_finish" &&
      Boolean(text(row.card_printing_id)),
    dimensions: {
      set: text(row.source_group_name) || "unknown",
      era: tcgplayerMarketCoverageEraV1(row.source_group_published_on),
      finish: normalizedFinish,
      value_band: tcgplayerMarketCoverageValueBandV1(row.market_price),
    },
  };
}

function increment(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function dimensionReport(rows, dimension) {
  const groups = new Map();
  for (const row of rows.filter((candidate) => candidate.in_denominator)) {
    const key = row.dimensions[dimension] ?? "unknown";
    const item = groups.get(key) ?? {
      denominator: 0,
      numerator: 0,
      mapped: 0,
      exact_printing: 0,
      publish: 0,
      delay: 0,
      quarantine: 0,
      suppress_stale: 0,
      gap_reasons: {},
    };
    item.denominator += 1;
    if (row.in_numerator) item.numerator += 1;
    if (row.mapped) item.mapped += 1;
    if (row.exact_printing) item.exact_printing += 1;
    if (Object.hasOwn(item, row.decision)) item[row.decision] += 1;
    if (row.primary_gap_reason) {
      increment(item.gap_reasons, row.primary_gap_reason);
    }
    groups.set(key, item);
  }
  return Object.fromEntries(
    [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [
        key,
        {
          ...item,
          coverage_percent:
            item.denominator === 0
              ? null
              : Number(((item.numerator / item.denominator) * 100).toFixed(3)),
        },
      ]),
  );
}

export function summarizeTcgplayerMarketCoverageV1(
  rawRows,
  { minimumCoveragePercent = TCGPLAYER_MARKET_MINIMUM_COVERAGE_PERCENT_V1 } = {},
) {
  const rows = rawRows.map(classifyTcgplayerMarketCoverageRowV1);
  const denominator = rows.filter((row) => row.in_denominator);
  const numerator = denominator.filter((row) => row.in_numerator);
  const gaps = denominator.filter((row) => !row.in_numerator);
  const exclusions = rows.filter((row) => !row.in_denominator);
  const coveragePercent =
    denominator.length === 0
      ? 0
      : Number(((numerator.length / denominator.length) * 100).toFixed(3));
  const gapReasons = {};
  const exclusionReasons = {};
  const decisions = {};
  for (const row of gaps) increment(gapReasons, row.primary_gap_reason);
  for (const row of exclusions) {
    increment(exclusionReasons, row.denominator_exclusion_reason);
  }
  for (const row of rows) increment(decisions, row.decision ?? "missing");
  const unclassifiedGapCount =
    gapReasons.unclassified_coverage_gap ?? 0;
  const findings = [];
  if (denominator.length === 0) findings.push("coverage_denominator_empty");
  if (unclassifiedGapCount > 0) {
    findings.push("coverage_gap_without_deterministic_reason");
  }
  if (coveragePercent < minimumCoveragePercent) {
    findings.push("coverage_below_required_threshold");
  }
  if (denominator.length !== numerator.length + gaps.length) {
    findings.push("coverage_reconciliation_mismatch");
  }

  return {
    policy_version: TCGPLAYER_MARKET_COVERAGE_POLICY_V1_1,
    status: findings.length ? "failed" : "passed",
    threshold_percent: minimumCoveragePercent,
    counts: {
      selected_source_price_rows: rows.length,
      denominator_rows: denominator.length,
      numerator_rows: numerator.length,
      gap_rows: gaps.length,
      excluded_rows: exclusions.length,
      mapped_denominator_rows: denominator.filter((row) => row.mapped).length,
      exact_printing_denominator_rows: denominator.filter(
        (row) => row.exact_printing,
      ).length,
      unclassified_gap_rows: unclassifiedGapCount,
    },
    coverage_percent: coveragePercent,
    rows_needed_for_threshold: Math.max(
      0,
      Math.ceil((minimumCoveragePercent / 100) * denominator.length) -
        numerator.length,
    ),
    decisions,
    gap_reasons: Object.fromEntries(
      Object.entries(gapReasons).sort((left, right) => right[1] - left[1]),
    ),
    exclusion_reasons: Object.fromEntries(
      Object.entries(exclusionReasons).sort(
        (left, right) => right[1] - left[1],
      ),
    ),
    by_set: dimensionReport(rows, "set"),
    by_era: dimensionReport(rows, "era"),
    by_finish: dimensionReport(rows, "finish"),
    by_value_band: dimensionReport(rows, "value_band"),
    findings,
    rows,
  };
}
