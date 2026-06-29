function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === '') continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function assertArtifact(name, artifact, { phasePrefix = null } = {}) {
  if (!artifact || typeof artifact !== 'object') {
    throw new Error(`[market-evidence-free-reference-gap] ${name} is required`);
  }
  if (artifact.contract !== 'MARKET_EVIDENCE_ENGINE_V1') {
    throw new Error(`[market-evidence-free-reference-gap] ${name} contract mismatch`);
  }
  if (phasePrefix && !String(artifact.phase ?? '').startsWith(phasePrefix)) {
    throw new Error(`[market-evidence-free-reference-gap] ${name} phase mismatch`);
  }
}

function targetKey(row) {
  return row.card_print_id ?? row.gv_id;
}

function targetIdentity(row) {
  return {
    card_print_id: row.card_print_id ?? null,
    gv_id: row.gv_id ?? null,
    name: row.name ?? null,
    set_code: row.set_code ?? null,
    number_plain: row.number_plain ?? null,
  };
}

function reviewedById(acquisition) {
  return new Map((acquisition.reviewed_targets ?? []).map((row) => [targetKey(row), row]));
}

function eligibleIds(normalized) {
  return new Set((normalized.normalized_evidence ?? [])
    .filter((row) => row.model_eligible === true)
    .map((row) => row.card_print_id)
    .filter(Boolean));
}

function batchTargets(batch) {
  const targets = new Map();
  for (const item of batch.items ?? []) {
    if (!targetKey(item)) continue;
    if (!targets.has(targetKey(item))) {
      targets.set(targetKey(item), targetIdentity(item));
    }
  }
  return Array.from(targets.values());
}

function coverageBucket({ tcgcsvEligible, pokemonTcgEligible }) {
  if (tcgcsvEligible && pokemonTcgEligible) return 'both_model_eligible';
  if (tcgcsvEligible) return 'tcgcsv_only_model_eligible';
  if (pokemonTcgEligible) return 'pokemontcg_io_only_model_eligible';
  return 'no_model_eligible_reference';
}

function missReason(row) {
  if (row.coverage_bucket !== 'no_model_eligible_reference') return 'covered';
  if (row.tcgcsv_status === 'no_tcgcsv_product_price_match' && row.pokemontcg_io_status === 'missing_pokemonapi_external_id') {
    return 'tcgcsv_product_gap_and_missing_pokemonapi_mapping';
  }
  if (row.tcgcsv_status === 'no_tcgcsv_price_rows_for_product' && row.pokemontcg_io_status === 'missing_pokemonapi_external_id') {
    return 'tcgcsv_product_has_no_price_rows_and_missing_pokemonapi_mapping';
  }
  if (row.tcgcsv_status === 'no_tcgcsv_price_rows_for_product') return 'tcgcsv_product_has_no_price_rows';
  if (row.tcgcsv_status === 'no_tcgcsv_group_match') return 'tcgcsv_group_alias_gap';
  if (row.tcgcsv_status === 'no_tcgcsv_product_price_match') return 'tcgcsv_product_or_number_gap';
  if (row.pokemontcg_io_status === 'missing_pokemonapi_external_id') return 'missing_pokemonapi_mapping';
  if (row.pokemontcg_io_status === 'pokemonapi_payload_missing') return 'pokemonapi_payload_missing';
  if (row.pokemontcg_io_status === 'no_reference_prices_in_payload') return 'pokemonapi_payload_has_no_reference_prices';
  return 'unclassified_reference_gap';
}

function sourceSummary(acquisition, normalized) {
  return {
    acquisition_summary: acquisition.summary ?? {},
    normalized_summary: normalized.summary ?? {},
    disposition_counts: normalized.counts?.disposition_counts ?? {},
    quality_flag_counts: normalized.counts?.quality_flag_counts ?? {},
  };
}

function sample(rows, limit) {
  return rows.slice(0, limit).map((row) => ({ ...row }));
}

export function buildFreeReferenceCoverageGapV1({
  batch,
  tcgcsvAcquisition,
  tcgcsvNormalized,
  pokemonTcgAcquisition,
  pokemonTcgNormalized,
  generatedAt = new Date().toISOString(),
  sampleLimit = 50,
} = {}) {
  assertArtifact('batch', batch, { phasePrefix: 'MEE-04C' });
  assertArtifact('tcgcsvAcquisition', tcgcsvAcquisition, { phasePrefix: 'MEE-06B' });
  assertArtifact('tcgcsvNormalized', tcgcsvNormalized, { phasePrefix: 'MEE-06C' });
  assertArtifact('pokemonTcgAcquisition', pokemonTcgAcquisition, { phasePrefix: 'MEE-06A' });
  assertArtifact('pokemonTcgNormalized', pokemonTcgNormalized, { phasePrefix: 'MEE-06C' });
  if (!Array.isArray(batch.items)) {
    throw new Error('[market-evidence-free-reference-gap] batch.items must be an array');
  }
  if (!Number.isInteger(sampleLimit) || sampleLimit < 1) {
    throw new Error('[market-evidence-free-reference-gap] sampleLimit must be a positive integer');
  }

  const targets = batchTargets(batch);
  const tcgcsvTargets = reviewedById(tcgcsvAcquisition);
  const pokemonTcgTargets = reviewedById(pokemonTcgAcquisition);
  const tcgcsvEligibleIds = eligibleIds(tcgcsvNormalized);
  const pokemonTcgEligibleIds = eligibleIds(pokemonTcgNormalized);

  const targetRows = targets.map((target) => {
    const key = targetKey(target);
    const tcgcsvReviewed = tcgcsvTargets.get(key);
    const pokemonTcgReviewed = pokemonTcgTargets.get(key);
    const tcgcsvEligible = tcgcsvEligibleIds.has(target.card_print_id);
    const pokemonTcgEligible = pokemonTcgEligibleIds.has(target.card_print_id);
    const coverage_bucket = coverageBucket({ tcgcsvEligible, pokemonTcgEligible });
    const row = {
      ...target,
      tcgcsv_status: tcgcsvReviewed?.status ?? 'not_reviewed',
      pokemontcg_io_status: pokemonTcgReviewed?.status ?? 'not_reviewed',
      tcgcsv_candidate_count: tcgcsvReviewed?.candidate_count ?? 0,
      pokemontcg_io_candidate_count: pokemonTcgReviewed?.candidate_count ?? 0,
      tcgcsv_model_eligible: tcgcsvEligible,
      pokemontcg_io_model_eligible: pokemonTcgEligible,
      coverage_bucket,
    };
    return {
      ...row,
      miss_reason: missReason(row),
    };
  });

  const uncovered = targetRows.filter((row) => row.coverage_bucket === 'no_model_eligible_reference');
  const covered = targetRows.filter((row) => row.coverage_bucket !== 'no_model_eligible_reference');

  return {
    generated_at: generatedAt,
    contract: 'MARKET_EVIDENCE_ENGINE_V1',
    phase: 'MEE-06D_FREE_REFERENCE_COVERAGE_GAP_V1',
    mode: 'local_free_reference_coverage_gap_only',
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_rollups: false,
      migration_apply: false,
      public_price_publication: false,
    },
    summary: {
      target_count: targets.length,
      covered_target_count: covered.length,
      uncovered_target_count: uncovered.length,
      tcgcsv_model_eligible_card_count: tcgcsvEligibleIds.size,
      pokemontcg_io_model_eligible_card_count: pokemonTcgEligibleIds.size,
      combined_model_eligible_card_count: new Set([...tcgcsvEligibleIds, ...pokemonTcgEligibleIds]).size,
    },
    sources: {
      tcgcsv_reference: sourceSummary(tcgcsvAcquisition, tcgcsvNormalized),
      pokemontcg_io_reference: sourceSummary(pokemonTcgAcquisition, pokemonTcgNormalized),
    },
    counts: {
      coverage_bucket_counts: countBy(targetRows, (row) => row.coverage_bucket),
      miss_reason_counts: countBy(uncovered, (row) => row.miss_reason),
      uncovered_by_set_code: countBy(uncovered, (row) => row.set_code ?? 'unknown'),
      tcgcsv_status_counts: countBy(targetRows, (row) => row.tcgcsv_status),
      pokemontcg_io_status_counts: countBy(targetRows, (row) => row.pokemontcg_io_status),
      status_pair_counts: countBy(targetRows, (row) => `${row.tcgcsv_status} + ${row.pokemontcg_io_status}`),
    },
    samples: {
      uncovered_targets: sample(uncovered, sampleLimit),
      tcgcsv_product_gaps: sample(uncovered.filter((row) => row.tcgcsv_status === 'no_tcgcsv_product_price_match'), sampleLimit),
      missing_pokemonapi_mapping: sample(targetRows.filter((row) => row.pokemontcg_io_status === 'missing_pokemonapi_external_id'), sampleLimit),
      both_model_eligible: sample(targetRows.filter((row) => row.coverage_bucket === 'both_model_eligible'), sampleLimit),
    },
    recommendations: [
      {
        key: 'prioritize_tcgcsv_product_gap',
        action: 'Inspect no_tcgcsv_product_price_match rows first; these are the remaining free-reference misses after group aliasing succeeds.',
      },
      {
        key: 'backfill_pokemonapi_mappings',
        action: 'Backfill PokemonTCG external IDs for rows already covered by TCGCSV so PokemonTCG.io can corroborate reference buckets.',
      },
      {
        key: 'defer_warehouse_until_gap_policy',
        action: 'Do not write warehouse evidence until coverage gaps and source precedence are documented.',
      },
    ],
    targets: targetRows,
  };
}
