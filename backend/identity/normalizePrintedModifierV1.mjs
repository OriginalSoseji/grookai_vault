function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function clamp01(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeLooseText(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function collectSignals({ rawSignals, noteText }) {
  const signals = [];

  const pushSignal = (source, value, confidence) => {
    const rawText = normalizeTextOrNull(value);
    if (!rawText) return;
    signals.push({
      source,
      raw_text: rawText,
      normalized_text: normalizeLooseText(rawText),
      confidence: clamp01(confidence),
    });
  };

  pushSignal(
    'ai:printed_modifier',
    rawSignals?.ai?.raw_printed_modifier_text,
    rawSignals?.ai?.printed_modifier_confidence,
  );
  pushSignal(
    'ai:stamp',
    rawSignals?.ai?.raw_stamp_text,
    rawSignals?.ai?.printed_modifier_confidence,
  );
  pushSignal(
    'ocr:printed_modifier',
    rawSignals?.ocr?.raw_printed_modifier_text,
    rawSignals?.ocr?.printed_modifier_confidence,
  );
  pushSignal(
    'ocr:stamp',
    rawSignals?.ocr?.raw_stamp_text,
    rawSignals?.ocr?.printed_modifier_confidence,
  );
  pushSignal(
    'ocr:modifier_region',
    rawSignals?.ocr?.raw_modifier_region_text,
    rawSignals?.ocr?.printed_modifier_confidence,
  );

  const candidateSignals = Array.isArray(rawSignals?.ocr?.raw_modifier_candidate_signals)
    ? rawSignals.ocr.raw_modifier_candidate_signals
    : [];
  for (const signal of candidateSignals) {
    pushSignal(
      normalizeTextOrNull(signal?.source) ?? 'ocr:modifier_candidate',
      signal?.text ?? signal?.raw_text,
      signal?.confidence,
    );
  }

  pushSignal('candidate:notes', noteText, 0.35);

  return signals;
}

function matchPokemonTogether(signal) {
  const normalized = signal?.normalized_text;
  if (!normalized) return null;
  const hasPokemon = /\bpokemon\b/.test(normalized);
  const hasTogether = /\btogether\b/.test(normalized);
  if (hasPokemon && hasTogether) {
    return {
      modifier_key: 'pokemon_together_stamp',
      modifier_label: 'Pokemon Together Stamp',
      confidence: signal.confidence,
      source: signal.source,
      raw_text: signal.raw_text,
    };
  }
  return null;
}

const KNOWN_MODIFIER_MATCHERS = [matchPokemonTogether];

export function normalizePrintedModifierV1({
  rawSignals,
  baseIdentity,
  noteText = null,
}) {
  const signals = collectSignals({ rawSignals, noteText });
  const rawInputsUsed = signals.map((signal) => `${signal.source}:${signal.raw_text}`);
  const visualSignals = signals.filter((signal) => signal.source !== 'candidate:notes');

  const matches = [];
  for (const signal of signals) {
    for (const matcher of KNOWN_MODIFIER_MATCHERS) {
      const match = matcher(signal);
      if (match) {
        matches.push(match);
      }
    }
  }

  if (matches.length === 0) {
    return {
      status: 'BLOCKED',
      modifier_key: null,
      modifier_label: null,
      confidence: 0,
      reason: 'missing_printed_modifier_signal',
      ambiguity_flags: [],
      raw_inputs_used: rawInputsUsed,
    };
  }

  const uniqueKeys = unique(matches.map((match) => match.modifier_key));
  if (uniqueKeys.length > 1) {
    return {
      status: 'PARTIAL',
      modifier_key: null,
      modifier_label: null,
      confidence: 0,
      reason: 'multiple_modifier_candidates',
      ambiguity_flags: ['modifier_signal_ambiguous'],
      raw_inputs_used: rawInputsUsed,
    };
  }

  const winnerKey = uniqueKeys[0];
  const winnerMatches = matches.filter((match) => match.modifier_key === winnerKey);
  const visualWinnerMatches = winnerMatches.filter((match) => match.source !== 'candidate:notes');
  const bestVisual = visualWinnerMatches.sort((left, right) => right.confidence - left.confidence)[0] ?? null;
  const bestAny = winnerMatches.sort((left, right) => right.confidence - left.confidence)[0] ?? null;
  const winner = bestVisual ?? bestAny;

  if (!winner) {
    return {
      status: 'BLOCKED',
      modifier_key: null,
      modifier_label: null,
      confidence: 0,
      reason: 'missing_printed_modifier_signal',
      ambiguity_flags: [],
      raw_inputs_used: rawInputsUsed,
    };
  }

  const supportingVisualCount = visualWinnerMatches.length;
  const confidence = clamp01(
    Math.max(winner.confidence, bestVisual ? 0.82 : 0.35) +
      Math.min(0.12, Math.max(0, supportingVisualCount - 1) * 0.06) +
      (baseIdentity?.name && baseIdentity?.number && baseIdentity?.set_code ? 0.04 : 0),
  );

  if (!bestVisual) {
    return {
      status: 'PARTIAL',
      modifier_key: winner.modifier_key,
      modifier_label: winner.modifier_label,
      confidence,
      reason: 'notes_claim_modifier_without_visual_confirmation',
      ambiguity_flags: ['notes_only_modifier_signal'],
      raw_inputs_used: rawInputsUsed,
    };
  }

  if (confidence < 0.78) {
    return {
      status: 'PARTIAL',
      modifier_key: winner.modifier_key,
      modifier_label: winner.modifier_label,
      confidence,
      reason: 'visual_modifier_signal_below_ready_threshold',
      ambiguity_flags: ['low_confidence_modifier_signal'],
      raw_inputs_used: rawInputsUsed,
    };
  }

  return {
    status: 'READY',
    modifier_key: winner.modifier_key,
    modifier_label: winner.modifier_label,
    confidence,
    reason: 'visual_printed_modifier_detected',
    ambiguity_flags: [],
    raw_inputs_used: rawInputsUsed,
  };
}
