import { parsePriceChartingCsvRowsV1 } from './market_evidence_pricecharting_csv_acquisition_v1.mjs';

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/[''.:’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  const raw = String(value ?? '').trim();
  const fraction = raw.match(/^([A-Za-z]*\s*0*[0-9]+[A-Za-z]?)(?:\s*\/\s*[0-9A-Za-z]+)?$/);
  const selected = fraction ? fraction[1] : raw;
  return selected
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^([a-z]+)0+(\d)/, '$1$2')
    .replace(/^0+(?=\d)/, '');
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === '') {
      continue;
    }
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function targetNumberDigits(target) {
  return normalizeNumber(target.number_plain).replace(/^[a-z]+/, '');
}

function buildCsvIndexes(csvRows) {
  const byName = new Map();
  const byNameNumber = new Map();
  const byNameNumberSuffix = new Map();

  for (const entry of csvRows) {
    const name = normalizeText(entry.parsed.name);
    const number = normalizeNumber(entry.parsed.number);
    const digits = number.replace(/^[a-z]+/, '');
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(entry);

    const exactKey = `${name}::${number}`;
    if (!byNameNumber.has(exactKey)) byNameNumber.set(exactKey, []);
    byNameNumber.get(exactKey).push(entry);

    if (digits) {
      const suffixKey = `${name}::${digits}`;
      if (!byNameNumberSuffix.has(suffixKey)) byNameNumberSuffix.set(suffixKey, []);
      byNameNumberSuffix.get(suffixKey).push(entry);
    }
  }

  return { byName, byNameNumber, byNameNumberSuffix };
}

function noMatchReason(target, indexes) {
  const name = normalizeText(target.name);
  const number = normalizeNumber(target.number_plain);
  const digits = targetNumberDigits(target);
  const nameRows = indexes.byName.get(name) ?? [];
  const exactRows = indexes.byNameNumber.get(`${name}::${number}`) ?? [];
  const suffixRows = digits ? (indexes.byNameNumberSuffix.get(`${name}::${digits}`) ?? []) : [];

  if (nameRows.length === 0) {
    return {
      gap_reason: 'no_name_in_pricecharting_csv',
      name_match_count: 0,
      exact_number_match_count: 0,
      prefixed_number_match_count: 0,
      sample_csv_products: [],
    };
  }
  if (exactRows.length > 0) {
    return {
      gap_reason: 'name_number_present_set_alias_or_variant_gap',
      name_match_count: nameRows.length,
      exact_number_match_count: exactRows.length,
      prefixed_number_match_count: suffixRows.length,
      sample_csv_products: exactRows.slice(0, 5).map((entry) => entry.row['product-name']),
    };
  }
  if (suffixRows.length > 0) {
    return {
      gap_reason: 'name_present_prefixed_number_gap',
      name_match_count: nameRows.length,
      exact_number_match_count: 0,
      prefixed_number_match_count: suffixRows.length,
      sample_csv_products: suffixRows.slice(0, 5).map((entry) => entry.row['product-name']),
    };
  }
  return {
    gap_reason: 'name_present_number_missing',
    name_match_count: nameRows.length,
    exact_number_match_count: 0,
    prefixed_number_match_count: 0,
    sample_csv_products: nameRows.slice(0, 5).map((entry) => entry.row['product-name']),
  };
}

function dispositionForCandidate(candidate) {
  const flags = new Set(candidate.exclusion_flags ?? []);
  if (flags.has('wrong_print_run')) return 'blocked_wrong_print_run';
  if (flags.has('ambiguous_variant')) return 'review_ambiguous_variant';
  if (candidate.match_confidence_hint === 'high') return 'review_high_confidence_reference';
  return 'review_other';
}

function variantLabelFromCandidate(candidate) {
  const productName = candidate.raw_payload?.product_name ?? candidate.raw_title ?? '';
  const labels = [...String(productName).matchAll(/\[([^\]]+)\]/g)].map((entry) => entry[1].trim());
  return labels.length > 0 ? labels.join(' + ') : 'base_product_label';
}

function topSample(rows, limit) {
  return rows.slice(0, limit).map((row) => ({ ...row }));
}

export function buildMarketEvidenceGapAnalysisV1({
  acquisition,
  csvRaw,
  generatedAt = new Date().toISOString(),
  sampleLimit = 50,
} = {}) {
  if (!acquisition || typeof acquisition !== 'object') {
    throw new Error('[market-evidence-gap-analysis] acquisition is required');
  }
  if (acquisition.contract !== 'MARKET_EVIDENCE_ENGINE_V1') {
    throw new Error('[market-evidence-gap-analysis] acquisition contract mismatch');
  }
  if (!Array.isArray(acquisition.reviewed_targets)) {
    throw new Error('[market-evidence-gap-analysis] reviewed_targets must be an array');
  }
  if (!Array.isArray(acquisition.candidate_evidence)) {
    throw new Error('[market-evidence-gap-analysis] candidate_evidence must be an array');
  }
  if (typeof csvRaw !== 'string') {
    throw new Error('[market-evidence-gap-analysis] csvRaw is required');
  }
  if (!Number.isInteger(sampleLimit) || sampleLimit < 1) {
    throw new Error('[market-evidence-gap-analysis] sampleLimit must be a positive integer');
  }

  const csvRows = parsePriceChartingCsvRowsV1(csvRaw);
  const indexes = buildCsvIndexes(csvRows);
  const noMatchTargets = acquisition.reviewed_targets
    .filter((target) => target.status === 'no_pricecharting_csv_match')
    .map((target) => ({
      card_print_id: target.card_print_id,
      gv_id: target.gv_id,
      name: target.name,
      set_code: target.set_code,
      number_plain: target.number_plain,
      ...noMatchReason(target, indexes),
    }));

  const candidateRows = acquisition.candidate_evidence.map((candidate) => ({
    card_print_id: candidate.card_print_id,
    gv_id: candidate.gv_id,
    source: candidate.source,
    set_code: candidate.gv_id?.split('-')?.slice(0, 3)?.join('-') ?? null,
    raw_title: candidate.raw_title,
    raw_price: candidate.raw_price,
    condition_hint: candidate.condition_hint,
    match_confidence_hint: candidate.match_confidence_hint,
    disposition: dispositionForCandidate(candidate),
    variant_label: variantLabelFromCandidate(candidate),
    exclusion_flags: candidate.exclusion_flags ?? [],
  }));
  const ambiguousOrBlocked = candidateRows.filter((row) => (
    row.disposition === 'blocked_wrong_print_run'
    || row.disposition === 'review_ambiguous_variant'
  ));

  return {
    generated_at: generatedAt,
    contract: 'MARKET_EVIDENCE_ENGINE_V1',
    phase: 'MEE-05B_RAW_EVIDENCE_GAP_ANALYSIS_V1',
    mode: 'local_gap_analysis_only',
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_rollups: false,
      migration_apply: false,
      public_price_publication: false,
    },
    summary: {
      reviewed_target_count: acquisition.reviewed_targets.length,
      no_match_target_count: noMatchTargets.length,
      candidate_evidence_count: acquisition.candidate_evidence.length,
      ambiguous_or_blocked_candidate_count: ambiguousOrBlocked.length,
      csv_pokemon_card_rows: csvRows.length,
    },
    counts: {
      no_match_by_gap_reason: countBy(noMatchTargets, (target) => target.gap_reason),
      no_match_by_set_code: countBy(noMatchTargets, (target) => target.set_code ?? 'unknown'),
      ambiguous_or_blocked_by_disposition: countBy(ambiguousOrBlocked, (row) => row.disposition),
      ambiguous_or_blocked_by_variant_label: countBy(ambiguousOrBlocked, (row) => row.variant_label),
    },
    samples: {
      no_match_targets: topSample(noMatchTargets, sampleLimit),
      prefixed_number_gap_targets: topSample(noMatchTargets.filter((target) => target.gap_reason === 'name_present_prefixed_number_gap'), sampleLimit),
      set_alias_or_variant_gap_targets: topSample(noMatchTargets.filter((target) => target.gap_reason === 'name_number_present_set_alias_or_variant_gap'), sampleLimit),
      ambiguous_or_blocked_candidates: topSample(ambiguousOrBlocked, sampleLimit),
    },
    recommendations: [
      {
        key: 'number_prefix_alias_matching',
        applies_when: 'name_present_prefixed_number_gap is material',
        action: 'Add governed source-number aliases such as BW01 -> 01 for promo-style lanes before rerunning acquisition.',
      },
      {
        key: 'set_alias_matching',
        applies_when: 'name_number_present_set_alias_or_variant_gap is material',
        action: 'Add approved set aliases before widening source coverage.',
      },
      {
        key: 'variant_lane_review',
        applies_when: 'review_ambiguous_variant and blocked_wrong_print_run remain material',
        action: 'Keep variant-labeled PriceCharting rows review-gated; do not promote as market truth.',
      },
    ],
  };
}
