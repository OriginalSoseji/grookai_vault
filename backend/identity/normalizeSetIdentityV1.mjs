function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeUpperToken(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  const compact = normalized.toUpperCase().replace(/[^A-Z0-9.-]/g, '');
  return compact.length > 0 ? compact : null;
}

function normalizeLowerName(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  return normalized.toLowerCase().replace(/\s+/g, ' ');
}

function clamp01(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function boostConfidence(base, delta) {
  return clamp01((Number.isFinite(base) ? base : 0) + delta);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildEmptyResult(reason, rawInputsUsed = []) {
  return {
    status: 'PARTIAL',
    set_code: null,
    set_name: null,
    confidence: 0,
    ambiguity_flags: [],
    reason,
    raw_inputs_used: rawInputsUsed,
    matched_set_candidates: [],
  };
}

let pokemonSetIndexPromise = null;

async function loadPokemonSetIndexV1(supabase) {
  if (!pokemonSetIndexPromise) {
    pokemonSetIndexPromise = (async () => {
      const { data, error } = await supabase
        .from('sets')
        .select('id, code, name, printed_set_abbrev')
        .eq('game', 'pokemon');

      if (error) {
        throw new Error(`set_index_load_failed:${error.message}`);
      }

      const rows = Array.isArray(data) ? data : [];
      const byCode = new Map();
      const byAbbrev = new Map();
      const byName = new Map();

      for (const row of rows) {
        const code = normalizeTextOrNull(row?.code)?.toLowerCase() ?? null;
        const abbrev = normalizeUpperToken(row?.printed_set_abbrev);
        const name = normalizeLowerName(row?.name);

        if (code) {
          byCode.set(code, row);
        }

        if (abbrev) {
          if (!byAbbrev.has(abbrev)) byAbbrev.set(abbrev, []);
          byAbbrev.get(abbrev).push(row);
        }

        if (name) {
          if (!byName.has(name)) byName.set(name, []);
          byName.get(name).push(row);
        }
      }

      return {
        rows,
        byCode,
        byAbbrev,
        byName,
      };
    })();
  }

  return pokemonSetIndexPromise;
}

function collectResolverSetSummary(resolverCandidates) {
  const resolverRows = Array.isArray(resolverCandidates) ? resolverCandidates : [];
  const rowsWithSet = resolverRows.filter((row) => normalizeTextOrNull(row?.set_code));
  const uniqueCodes = unique(rowsWithSet.map((row) => normalizeTextOrNull(row?.set_code)?.toLowerCase()));

  if (uniqueCodes.length !== 1) {
    return {
      unique_set_code: null,
      unique_set_name: null,
      unique_candidate_count: 0,
      set_distribution: uniqueCodes,
    };
  }

  const winner = rowsWithSet.find(
    (row) => normalizeTextOrNull(row?.set_code)?.toLowerCase() === uniqueCodes[0],
  );

  return {
    unique_set_code: uniqueCodes[0],
    unique_set_name: normalizeTextOrNull(winner?.set_name) ?? null,
    unique_candidate_count: rowsWithSet.length,
    set_distribution: uniqueCodes,
  };
}

function collectDirectSetSignals(input) {
  const signals = [];

  const pushSignal = (source, kind, rawValue, confidence) => {
    const rawText = normalizeTextOrNull(rawValue);
    if (!rawText) return;
    signals.push({
      source,
      kind,
      raw_text: rawText,
      token: normalizeUpperToken(rawText),
      name_key: normalizeLowerName(rawText),
      confidence: clamp01(confidence),
    });
  };

  pushSignal('ai:set_abbrev', 'abbrev', input?.ai?.raw_set_abbrev_text, input?.ai?.set_confidence);
  pushSignal('ai:set_text', 'name', input?.ai?.raw_set_text, input?.ai?.set_confidence);
  pushSignal(
    'ocr:printed_set_abbrev_raw',
    'abbrev',
    input?.ocr?.raw_set_abbrev_text,
    input?.ocr?.set_confidence,
  );
  pushSignal(
    'ocr:set_symbol_region_text',
    'abbrev',
    input?.ocr?.raw_set_symbol_region_text,
    input?.ocr?.set_symbol_region_confidence,
  );

  const candidateSignals = Array.isArray(input?.ocr?.raw_set_candidate_signals)
    ? input.ocr.raw_set_candidate_signals
    : [];

  for (const signal of candidateSignals) {
    pushSignal(
      normalizeTextOrNull(signal?.source) ?? 'ocr:set_candidate',
      normalizeTextOrNull(signal?.kind) ?? 'abbrev',
      signal?.text,
      signal?.confidence,
    );
  }

  return signals;
}

function matchSignalToSets(signal, setIndex) {
  const matches = [];

  if (signal.kind === 'abbrev' && signal.token) {
    const byCode = setIndex.byCode.get(signal.token.toLowerCase());
    if (byCode) {
      matches.push({
        row: byCode,
        match_type: 'set_code_exact',
        source: signal.source,
        raw_text: signal.raw_text,
        confidence: signal.confidence,
      });
    }

    const byAbbrev = setIndex.byAbbrev.get(signal.token) ?? [];
    for (const row of byAbbrev) {
      matches.push({
        row,
        match_type: 'printed_set_abbrev_exact',
        source: signal.source,
        raw_text: signal.raw_text,
        confidence: signal.confidence,
      });
    }
  }

  if (signal.name_key) {
    const byName = setIndex.byName.get(signal.name_key) ?? [];
    for (const row of byName) {
      matches.push({
        row,
        match_type: 'set_name_exact',
        source: signal.source,
        raw_text: signal.raw_text,
        confidence: signal.confidence,
      });
    }
  }

  return matches;
}

export async function normalizeSetIdentityV1({
  supabase,
  rawSignals,
  resolverCandidates,
  nameConfidence,
  numberConfidence,
}) {
  const setIndex = await loadPokemonSetIndexV1(supabase);
  const directSignals = collectDirectSetSignals(rawSignals);
  const rawInputsUsed = directSignals.map((signal) => `${signal.source}:${signal.raw_text}`);
  const resolverSummary = collectResolverSetSummary(resolverCandidates);

  const directMatches = directSignals.flatMap((signal) => matchSignalToSets(signal, setIndex));
  const directByCode = new Map();

  for (const match of directMatches) {
    const code = normalizeTextOrNull(match?.row?.code)?.toLowerCase();
    if (!code) continue;
    if (!directByCode.has(code)) {
      directByCode.set(code, {
        row: match.row,
        confidence: match.confidence,
        match_types: [match.match_type],
        sources: [`${match.source}:${match.raw_text}`],
      });
      continue;
    }

    const existing = directByCode.get(code);
    existing.confidence = Math.max(existing.confidence, match.confidence);
    existing.match_types = unique([...existing.match_types, match.match_type]);
    existing.sources = unique([...existing.sources, `${match.source}:${match.raw_text}`]);
  }

  const directEntries = Array.from(directByCode.entries())
    .map(([code, value]) => ({
      set_code: code,
      set_name: normalizeTextOrNull(value.row?.name),
      confidence: boostConfidence(value.confidence, Math.min(0.12, Math.max(0, value.sources.length - 1) * 0.04)),
      match_types: value.match_types,
      sources: value.sources,
    }))
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        left.set_code.localeCompare(right.set_code),
    );

  const matchedSetCandidates = directEntries.map((entry) => ({
    set_code: entry.set_code,
    set_name: entry.set_name,
    confidence: entry.confidence,
    match_types: entry.match_types,
    sources: entry.sources,
  }));

  const nameScore = clamp01(nameConfidence);
  const numberScore = clamp01(numberConfidence);
  const identityStrong = nameScore >= 0.9 && numberScore >= 0.9;
  const directBest = directEntries[0] ?? null;
  const directSecond = directEntries[1] ?? null;
  const resolverCode = resolverSummary.unique_set_code;

  if (directBest && directSecond && directBest.set_code !== directSecond.set_code) {
    if (resolverCode && directEntries.some((entry) => entry.set_code === resolverCode)) {
      const winner = directEntries.find((entry) => entry.set_code === resolverCode);
      return {
        status: identityStrong ? 'READY' : 'PARTIAL',
        set_code: winner.set_code,
        set_name: winner.set_name,
        confidence: clamp01(Math.max(winner.confidence, 0.82)),
        ambiguity_flags: ['direct_set_signal_ambiguous', 'resolver_disambiguated_set'],
        reason: 'resolver_disambiguated_direct_set_signals',
        raw_inputs_used: rawInputsUsed,
        matched_set_candidates: matchedSetCandidates,
      };
    }

    return {
      status: 'PARTIAL',
      set_code: null,
      set_name: null,
      confidence: 0,
      ambiguity_flags: ['direct_set_signal_ambiguous'],
      reason: 'multiple_direct_set_matches',
      raw_inputs_used: rawInputsUsed,
      matched_set_candidates: matchedSetCandidates,
    };
  }

  if (directBest && resolverCode && resolverCode !== directBest.set_code) {
    return {
      status: 'PARTIAL',
      set_code: null,
      set_name: null,
      confidence: 0,
      ambiguity_flags: ['resolver_set_conflict'],
      reason: 'resolver_conflicts_with_direct_set_signal',
      raw_inputs_used: rawInputsUsed,
      matched_set_candidates: matchedSetCandidates,
    };
  }

  if (directBest && resolverCode && resolverCode === directBest.set_code) {
    return {
      status: 'READY',
      set_code: directBest.set_code,
      set_name: directBest.set_name,
      confidence: boostConfidence(Math.max(directBest.confidence, 0.88), 0.07),
      ambiguity_flags: [],
      reason: 'direct_set_signal_agrees_with_unique_resolver_set',
      raw_inputs_used: rawInputsUsed,
      matched_set_candidates: matchedSetCandidates,
    };
  }

  if (resolverCode && identityStrong) {
    const resolverCandidate = (Array.isArray(resolverCandidates) ? resolverCandidates : []).find(
      (row) => normalizeTextOrNull(row?.set_code)?.toLowerCase() === resolverCode,
    );
    return {
      status: 'READY',
      set_code: resolverCode,
      set_name: normalizeTextOrNull(resolverCandidate?.set_name),
      confidence: 0.88,
      ambiguity_flags: [],
      reason: 'unique_resolver_set_from_strong_name_number_identity',
      raw_inputs_used: rawInputsUsed,
      matched_set_candidates: matchedSetCandidates,
    };
  }

  if (directBest && directBest.confidence >= 0.88) {
    return {
      status: 'READY',
      set_code: directBest.set_code,
      set_name: directBest.set_name,
      confidence: directBest.confidence,
      ambiguity_flags: [],
      reason: 'direct_set_signal_exact',
      raw_inputs_used: rawInputsUsed,
      matched_set_candidates: matchedSetCandidates,
    };
  }

  if (directBest && directBest.confidence >= 0.6) {
    return {
      status: 'PARTIAL',
      set_code: directBest.set_code,
      set_name: directBest.set_name,
      confidence: directBest.confidence,
      ambiguity_flags: ['low_confidence_set_signal'],
      reason: 'direct_set_signal_below_ready_threshold',
      raw_inputs_used: rawInputsUsed,
      matched_set_candidates: matchedSetCandidates,
    };
  }

  if (resolverSummary.set_distribution.length > 1) {
    return {
      status: 'PARTIAL',
      set_code: null,
      set_name: null,
      confidence: 0,
      ambiguity_flags: ['resolver_set_ambiguous'],
      reason: 'multiple_resolver_sets',
      raw_inputs_used: rawInputsUsed,
      matched_set_candidates: matchedSetCandidates,
    };
  }

  if (resolverCode) {
    return {
      status: 'PARTIAL',
      set_code: resolverCode,
      set_name: null,
      confidence: 0.7,
      ambiguity_flags: ['resolver_only_set'],
      reason: 'resolver_set_without_strong_name_number_identity',
      raw_inputs_used: rawInputsUsed,
      matched_set_candidates: matchedSetCandidates,
    };
  }

  return buildEmptyResult(
    directSignals.length > 0 ? 'no_lawful_set_match_from_direct_signals' : 'missing_set_signals',
    rawInputsUsed,
  );
}
