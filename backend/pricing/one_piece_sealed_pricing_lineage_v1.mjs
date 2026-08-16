import { createHash } from "node:crypto";

export const ONE_PIECE_SEALED_PRICING_LINEAGE_VERSION =
  "ONE_PIECE_SEALED_PRICING_LINEAGE_READINESS_V1";
export const ONE_PIECE_SEALED_PRICING_FRESHNESS_DAYS = 7;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

export function stableJsonOnePieceSealedPricingLineageV1(value) {
  return JSON.stringify(stable(value));
}

export function hashOnePieceSealedPricingLineageV1(value) {
  return createHash("sha256").update(
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : stableJsonOnePieceSealedPricingLineageV1(value),
  ).digest("hex");
}

function isoDay(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function ageDays(observedOn, authorityDay) {
  if (!observedOn || !authorityDay) return null;
  const day = 86_400_000;
  return Math.floor((Date.parse(`${isoDay(authorityDay)}T00:00:00Z`) -
    Date.parse(`${isoDay(observedOn)}T00:00:00Z`)) / day);
}

export function classifyOnePieceSealedPriceLineageV1({
  canonical,
  latestPrices,
  authorityObservedOn,
}) {
  const prices = [...(latestPrices ?? [])].sort((left, right) =>
    String(left.subtype_name_normalized).localeCompare(
      String(right.subtype_name_normalized)));
  const base = {
    variant_id: canonical.variant_id,
    family_id: canonical.family_id,
    source_mapping_id: canonical.source_mapping_id,
    source_product_id: Number(canonical.source_product_id),
    source_product_name: canonical.source_product_name,
    package_form: canonical.package_form,
    language_code: canonical.language_code,
    source_active: canonical.source_active === true,
    catalog_metadata_status: canonical.catalog_metadata_status,
    canonical_lineage_exact: canonical.canonical_lineage_exact === true,
    latest_price_row_count: prices.length,
    authority_observed_on: isoDay(authorityObservedOn),
  };
  let status;
  let reason;
  let selected = null;
  if (prices.length === 0) {
    status = "blocked_missing_observation";
    reason = "no_source_price_observation";
  } else if (prices.length !== 1 ||
      prices[0].subtype_name_normalized !== "normal") {
    status = "blocked_ambiguous";
    reason = "sealed_source_subtype_not_single_normal";
  } else {
    selected = prices[0];
    const age = ageDays(selected.observed_on, authorityObservedOn);
    if (!base.source_active || base.catalog_metadata_status !== "current") {
      status = "blocked_source_inactive";
      reason = "source_product_not_current_active";
    } else if (selected.currency !== "USD") {
      status = "blocked_currency";
      reason = "source_currency_not_usd";
    } else if (selected.market_price === null ||
        selected.market_price === undefined) {
      status = "blocked_missing_price";
      reason = "tcgplayer_market_price_null";
    } else if (age === null || age < 0 ||
        age > ONE_PIECE_SEALED_PRICING_FRESHNESS_DAYS) {
      status = "blocked_stale";
      reason = "source_market_price_outside_freshness_window";
    } else {
      status = "qualified_exact";
      reason = "exact_product_single_normal_fresh_usd_market_price";
    }
  }
  return { ...base, qualification_status: status,
    qualification_reason: reason,
    source_price_row_identity: selected?.source_price_row_identity ?? null,
    source_subtype_name_normalized:
      selected?.subtype_name_normalized ?? null,
    observed_on: isoDay(selected?.observed_on),
    observation_age_days: selected
      ? ageDays(selected.observed_on, authorityObservedOn)
      : null,
    currency: selected?.currency ?? null,
    market_price: selected?.market_price === null ||
      selected?.market_price === undefined
      ? null
      : Number(selected.market_price),
    low_price: selected?.low_price === null ||
      selected?.low_price === undefined ? null : Number(selected.low_price),
    source_observation_fingerprint: selected?.payload_hash ?? null,
    persistable_in_existing_qualification_table: selected !== null,
  };
}

export function buildOnePieceSealedPricingLineageAuditV1({
  canonicalRows,
  latestPriceRows,
  latestSync,
}) {
  const pricesByProduct = new Map();
  for (const row of latestPriceRows ?? []) {
    const key = Number(row.product_id);
    const rows = pricesByProduct.get(key) ?? [];
    rows.push(row);
    pricesByProduct.set(key, rows);
  }
  const rows = [...(canonicalRows ?? [])].sort((left, right) =>
    String(left.variant_id).localeCompare(String(right.variant_id)))
    .map((canonical) => classifyOnePieceSealedPriceLineageV1({
      canonical,
      latestPrices: pricesByProduct.get(Number(canonical.source_product_id)),
      authorityObservedOn: latestSync?.observed_on,
    }));
  const statusCounts = Object.fromEntries([...new Set(rows.map((row) =>
    row.qualification_status))].sort().map((status) => [status,
    rows.filter((row) => row.qualification_status === status).length]));
  const core = {
    version: ONE_PIECE_SEALED_PRICING_LINEAGE_VERSION,
    policy: {
      exact_source_provider: "tcgplayer",
      required_subtype: "normal",
      required_currency: "USD",
      authoritative_price_field: "market_price",
      freshness_days_inclusive: ONE_PIECE_SEALED_PRICING_FRESHNESS_DAYS,
      freshness_authority: "latest_completed_current_full_sync_observed_on",
      low_mid_high_fallback_authorized: false,
      publication_authority: false,
    },
    latest_sync: latestSync,
    status_counts: statusCounts,
    rows,
  };
  return { ...core, audit_fingerprint_sha256:
    hashOnePieceSealedPricingLineageV1(core) };
}

export function evaluateOnePieceSealedPricingLineageAuditV1({
  audit,
  proof,
}) {
  const findings = [];
  const rows = audit?.rows ?? [];
  const unique = (field) => new Set(rows.map((row) => row[field])).size;
  if (rows.length !== 390) findings.push("canonical_variant_count_mismatch");
  if (unique("variant_id") !== 390) findings.push("duplicate_variant_id");
  if (unique("source_mapping_id") !== 390) {
    findings.push("duplicate_source_mapping_id");
  }
  if (unique("source_product_id") !== 390) {
    findings.push("duplicate_source_product_id");
  }
  if (audit?.latest_sync?.status !== "completed" ||
      !audit?.latest_sync?.observed_on) {
    findings.push("latest_current_sync_not_complete");
  }
  if (audit?.policy?.publication_authority !== false ||
      audit?.policy?.low_mid_high_fallback_authorized !== false) {
    findings.push("policy_authority_overclaim");
  }
  const validStatuses = new Set(["qualified_exact", "blocked_ambiguous",
    "blocked_missing_observation", "blocked_missing_price", "blocked_stale",
    "blocked_currency", "blocked_source_inactive"]);
  for (const row of rows) {
    if (!validStatuses.has(row.qualification_status)) {
      findings.push(`invalid_status:${row.variant_id}`);
    }
    if (row.canonical_lineage_exact !== true) {
      findings.push(`canonical_lineage_drift:${row.variant_id}`);
    }
    if (row.qualification_status === "qualified_exact" &&
        (row.market_price === null || row.currency !== "USD" ||
         row.source_subtype_name_normalized !== "normal" ||
         row.observation_age_days < 0 ||
         row.observation_age_days > ONE_PIECE_SEALED_PRICING_FRESHNESS_DAYS)) {
      findings.push(`unsupported_qualification:${row.variant_id}`);
    }
    if (row.qualification_status === "blocked_missing_observation" &&
        row.persistable_in_existing_qualification_table !== false) {
      findings.push(`missing_observation_persistence_overclaim:${row.variant_id}`);
    }
  }
  const counted = Object.values(audit?.status_counts ?? {})
    .reduce((sum, count) => sum + Number(count), 0);
  if (counted !== rows.length) findings.push("status_count_reconciliation_mismatch");
  if (proof?.transaction_read_only !== true ||
      proof?.default_transaction_read_only !== true ||
      proof?.transaction_closed_before_artifacts !== true) {
    findings.push("read_only_guard_failed");
  }
  if ((proof?.write_attribution ?? []).length !== 0) {
    findings.push("write_attribution_present");
  }
  if (stableJsonOnePieceSealedPricingLineageV1(proof?.baseline_before) !==
      stableJsonOnePieceSealedPricingLineageV1(proof?.baseline_after)) {
    findings.push("protected_baseline_changed");
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
