import { classifyOnePieceSealedPriceLineageV1 } from
  './one_piece_sealed_pricing_lineage_v1.mjs';
import { hashMtgSealedV1 } from './mtg_sealed_world_v1.mjs';

export const MTG_SEALED_PRICING_REFRESH_V1 =
  'MTG_SEALED_PRICING_REFRESH_V1';
export const MTG_SEALED_PRICING_REFRESH_FRESHNESS_DAYS_V1 = 7;

const DEFAULT_THRESHOLDS = Object.freeze({
  maximum_authority_age_days: 2,
  maximum_removed_member_ratio: 0.10,
  maximum_price_change_ratio: 0.80,
});

function isoDay(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function ageDays(older, newer) {
  const left = isoDay(older);
  const right = isoDay(newer);
  if (!left || !right) return null;
  return Math.floor((Date.parse(`${right}T00:00:00Z`) -
    Date.parse(`${left}T00:00:00Z`)) / 86_400_000);
}

function number(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function countBy(rows, field) {
  const values = [...new Set(rows.map((row) => row[field]))].sort();
  return Object.fromEntries(values.map((value) => [value,
    rows.filter((row) => row[field] === value).length]));
}

function sameMoney(left, right) {
  return number(left) === number(right);
}

export function buildMtgSealedPricingRefreshV1({
  canonicalRows,
  latestPriceRows,
  currentMembers,
  latestSync,
  imageEligibleVariantIds,
  asOfDate,
  producerCommit,
  thresholds = {},
}) {
  if (!/^[0-9a-f]{40}$/.test(producerCommit ?? '')) {
    throw new Error('An exact producer commit SHA is required');
  }
  const authorityDay = isoDay(latestSync?.observed_on);
  const asOfDay = isoDay(asOfDate);
  if (latestSync?.status !== 'completed' || !latestSync?.id || !authorityDay) {
    throw new Error('A completed current-full-sync authority row is required');
  }
  if (!asOfDay) throw new Error('A valid as-of date is required');

  const policy = { ...DEFAULT_THRESHOLDS, ...thresholds,
    source_provider: 'tcgplayer', required_game_key: 'mtg',
    required_language_code: 'en', required_subtype: 'normal',
    required_currency: 'USD', authoritative_field: 'market_price',
    freshness_days_inclusive: MTG_SEALED_PRICING_REFRESH_FRESHNESS_DAYS_V1,
    requires_gate_a_image_eligibility: true,
    low_mid_high_fallback_authorized: false,
    publication_authority: false };
  const pricesByProduct = new Map();
  for (const row of latestPriceRows ?? []) {
    const key = Number(row.source_product_id ?? row.product_id);
    const values = pricesByProduct.get(key) ?? [];
    values.push(row);
    pricesByProduct.set(key, values);
  }
  const currentByVariant = new Map((currentMembers ?? []).map((row) =>
    [row.variant_id, row]));
  const imageEligible = new Set(imageEligibleVariantIds ?? []);
  const rows = [];

  for (const canonical of [...(canonicalRows ?? [])].sort((left, right) =>
    String(left.variant_id).localeCompare(String(right.variant_id)))) {
    const prices = pricesByProduct.get(Number(canonical.source_product_id)) ?? [];
    let lineage = classifyOnePieceSealedPriceLineageV1({
      canonical,
      latestPrices: prices,
      authorityObservedOn: authorityDay,
    });
    if (lineage.qualification_status === 'qualified_exact' &&
        !(number(lineage.market_price) > 0)) {
      lineage = { ...lineage, qualification_status: 'blocked_missing_price',
        qualification_reason: 'tcgplayer_market_price_not_positive' };
    }
    if (lineage.qualification_status === 'qualified_exact' &&
        !imageEligible.has(canonical.variant_id)) {
      lineage = { ...lineage, qualification_status: 'image_coverage_missing',
        qualification_reason: 'variant_not_eligible_in_frozen_gate_a_coverage' };
    }
    const current = currentByVariant.get(canonical.variant_id) ?? null;
    let delta = 'held';
    if (lineage.qualification_status === 'qualified_exact') {
      if (!current) delta = 'added';
      else if (!sameMoney(current.market_price, lineage.market_price)) {
        delta = 'price_changed';
      } else if (current.source_observation_fingerprint !==
          lineage.source_observation_fingerprint ||
          current.source_price_row_identity !== lineage.source_price_row_identity ||
          isoDay(current.observed_on) !== isoDay(lineage.observed_on)) {
        delta = 'observation_refreshed_same_price';
      } else delta = 'unchanged';
    } else if (current) delta = 'removed';
    rows.push({
      variant_id: canonical.variant_id,
      family_id: canonical.family_id,
      source_mapping_id: canonical.source_mapping_id,
      source_product_id: Number(canonical.source_product_id),
      canonical_name: canonical.canonical_name,
      package_form: canonical.package_form,
      language_code: canonical.language_code,
      image_eligible: imageEligible.has(canonical.variant_id),
      current_release_id: current?.release_id ?? null,
      current_qualification_id: current?.qualification_id ?? null,
      current_market_price: number(current?.market_price),
      qualification_status: lineage.qualification_status,
      qualification_reason: lineage.qualification_reason,
      source_price_row_identity: lineage.source_price_row_identity,
      source_subtype_name_normalized: lineage.source_subtype_name_normalized,
      observed_on: isoDay(lineage.observed_on),
      observation_age_days: lineage.observation_age_days,
      currency: lineage.currency,
      market_price: number(lineage.market_price),
      source_observation_fingerprint: lineage.source_observation_fingerprint,
      delta,
    });
  }

  const currentIds = new Set(currentByVariant.keys());
  const canonicalIds = new Set(rows.map((row) => row.variant_id));
  const orphanCurrent = [...currentIds].filter((id) => !canonicalIds.has(id));
  const qualificationStatusCounts = countBy(rows, 'qualification_status');
  const deltaCounts = countBy(rows, 'delta');
  const currentCount = currentMembers?.length ?? 0;
  const removedRatio = currentCount === 0 ? 1 :
    Number(((deltaCounts.removed ?? 0) / currentCount).toFixed(6));
  const qualifiedCount = qualificationStatusCounts.qualified_exact ?? 0;
  const priceChangeRatio = qualifiedCount === 0 ? 1 :
    Number(((deltaCounts.price_changed ?? 0) / qualifiedCount).toFixed(6));
  const findings = [];
  const unique = (values) => new Set(values).size;
  if (!(canonicalRows?.length > 0)) findings.push('empty_canonical_mapping_set');
  if (!(currentCount > 0)) findings.push('empty_current_release');
  if (unique((canonicalRows ?? []).map((row) => row.variant_id)) !==
      (canonicalRows?.length ?? 0)) findings.push('duplicate_canonical_variant');
  if (unique((canonicalRows ?? []).map((row) => row.source_mapping_id)) !==
      (canonicalRows?.length ?? 0)) findings.push('duplicate_source_mapping');
  if (unique((canonicalRows ?? []).map((row) => row.source_product_id)) !==
      (canonicalRows?.length ?? 0)) findings.push('duplicate_source_product');
  if (unique((currentMembers ?? []).map((row) => row.variant_id)) !== currentCount) {
    findings.push('duplicate_current_release_variant');
  }
  if (orphanCurrent.length) findings.push('current_release_member_without_mapping');
  const authorityAge = ageDays(authorityDay, asOfDay);
  if (authorityAge === null || authorityAge < 0 ||
      authorityAge > policy.maximum_authority_age_days) {
    findings.push('latest_sync_outside_operational_freshness');
  }
  if (!(qualifiedCount > 0)) findings.push('empty_proposed_release');
  if (removedRatio > policy.maximum_removed_member_ratio) {
    findings.push('removed_member_ratio_exceeds_threshold');
  }
  if (priceChangeRatio > policy.maximum_price_change_ratio) {
    findings.push('price_change_ratio_exceeds_threshold');
  }

  const body = {
    version: MTG_SEALED_PRICING_REFRESH_V1,
    status: findings.length === 0
      ? 'ready_for_separately_authorized_refresh'
      : 'blocked_before_refresh',
    game_key: 'mtg',
    producer_commit_sha: producerCommit,
    as_of_date: asOfDay,
    latest_sync: { id: latestSync.id, status: latestSync.status,
      observed_on: authorityDay, age_days: authorityAge },
    current_release: {
      release_id: currentMembers?.[0]?.release_id ?? null,
      member_count: currentCount,
    },
    policy,
    counts: {
      canonical_mappings: canonicalRows?.length ?? 0,
      latest_price_rows: latestPriceRows?.length ?? 0,
      image_eligible_variants: imageEligible.size,
      qualified_variants: qualifiedCount,
      orphan_current_members: orphanCurrent.length,
      qualification_statuses: qualificationStatusCounts,
      deltas: deltaCounts,
      removed_member_ratio: removedRatio,
      price_change_ratio: priceChangeRatio,
    },
    rows,
    findings: [...new Set(findings)].sort(),
    boundaries: {
      provider_calls: 0, database_writes: 0, storage_reads: 0,
      storage_writes: 0, pricing_writes: 0, release_pointer_writes: 0,
      visibility_writes: 0, vault_writes: 0,
    },
  };
  return { ...body, plan_fingerprint_sha256: hashMtgSealedV1(body) };
}

export function validateMtgSealedPricingRefreshV1(plan) {
  const findings = [];
  const rows = plan?.rows ?? [];
  if (plan?.version !== MTG_SEALED_PRICING_REFRESH_V1) {
    findings.push('version_mismatch');
  }
  if (new Set(rows.map((row) => row.variant_id)).size !== rows.length) {
    findings.push('duplicate_variant_id');
  }
  if (rows.some((row) => row.qualification_status === 'qualified_exact' &&
      (!row.image_eligible || row.currency !== 'USD' ||
       row.source_subtype_name_normalized !== 'normal' ||
       !(row.market_price > 0) || row.observation_age_days < 0 ||
       row.observation_age_days > MTG_SEALED_PRICING_REFRESH_FRESHNESS_DAYS_V1))) {
    findings.push('unsupported_exact_qualification');
  }
  if (Object.values(plan?.boundaries ?? {}).some((value) => value !== 0)) {
    findings.push('write_boundary_violation');
  }
  const { plan_fingerprint_sha256: ignored, ...body } = plan ?? {};
  if (plan?.plan_fingerprint_sha256 !== hashMtgSealedV1(body)) {
    findings.push('plan_fingerprint_mismatch');
  }
  return { valid: findings.length === 0,
    findings: [...new Set(findings)].sort() };
}
