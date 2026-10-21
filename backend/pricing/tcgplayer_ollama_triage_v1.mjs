import { createHash } from 'node:crypto';

export const TCGPLAYER_OLLAMA_TRIAGE_VERSION =
  'TCGPLAYER_OLLAMA_TRIAGE_V1';
export const TCGPLAYER_OLLAMA_TRIAGE_MODEL =
  'grookai-card-triage:4b';
export const TCGPLAYER_OLLAMA_TRIAGE_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    decision: {
      type: 'string',
      enum: ['lead_candidate', 'ambiguous', 'insufficient_evidence'],
    },
    candidate_index: { type: ['integer', 'null'], minimum: 0, maximum: 19 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reason_code: {
      type: 'string',
      enum: [
        'unique_field_alignment',
        'alias_or_unicode_review',
        'variant_review_needed',
        'multiple_plausible',
        'insufficient_evidence',
      ],
    },
    explanation: { type: 'string', maxLength: 180 },
  },
  required: [
    'decision',
    'candidate_index',
    'confidence',
    'reason_code',
    'explanation',
  ],
  additionalProperties: false,
});

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

function scalar(value) {
  return String(value ?? '').trim();
}

function normalized(value) {
  return scalar(value)
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/\s+/g, ' ');
}

function numberCoordinate(value) {
  return normalized(value).split('/')[0].replace(/^0+([0-9])/, '$1');
}

function editionFromLabels(values) {
  const joined = values.map(normalized).join(' ');
  if (/\b(1st|first)[ -]?edition\b/.test(joined)) return 'first_edition';
  if (/\bunlimited\b/.test(joined)) return 'unlimited';
  return null;
}

function candidateId(candidate) {
  return scalar(candidate?.card_print_id || candidate?.gv_id);
}

function deterministicCandidateConflicts(row, candidate) {
  const conflicts = [];
  if (Number(candidate.active_tcgplayer_mapping_count ?? 0) > 0) {
    conflicts.push('target_already_mapped');
  }
  const sourceNumber = numberCoordinate(row.printed_number);
  const candidateNumber = numberCoordinate(candidate.canonical_number);
  if (sourceNumber && candidateNumber && sourceNumber !== candidateNumber) {
    conflicts.push('printed_number');
  }

  const expectedSetCode = normalized(row.set_authority?.set_code);
  const candidateSetCode = normalized(candidate.set_code);
  if (expectedSetCode && candidateSetCode && expectedSetCode !== candidateSetCode) {
    conflicts.push('set_code');
  }

  const sourceEdition = editionFromLabels(Array.isArray(row.source_subtypes)
    ? row.source_subtypes
    : []);
  const candidateEdition = editionFromLabels([
    candidate.variant_key,
    candidate.gv_id,
  ]);
  if (sourceEdition && !candidateEdition) {
    conflicts.push('edition_missing_on_candidate');
  } else if (sourceEdition && candidateEdition && sourceEdition !== candidateEdition) {
    conflicts.push('edition');
  }
  return conflicts;
}

export function assertLoopbackOllamaUrlV1(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error('Ollama triage requires an HTTP loopback endpoint');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Ollama triage endpoint cannot contain credentials or query data');
  }
  return url;
}

export function planTcgplayerOllamaTriageRowV1(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Triage row must be an object');
  }
  const sourceProductId = Number(row.source_product_id);
  if (!Number.isSafeInteger(sourceProductId) || sourceProductId <= 0) {
    throw new Error('Triage row requires a positive source_product_id');
  }
  const sourceName = scalar(row.source_product_name);
  const sourceGroup = scalar(row.source_group_name);
  const printedNumber = scalar(row.printed_number);
  const missingNumberReviewAllowed = !printedNumber
    && row.candidate_search?.allow_missing_number_review === true;
  if (!sourceName || !sourceGroup || (!printedNumber && !missingNumberReviewAllowed)) {
    return {
      source_product_id: sourceProductId,
      disposition: 'held_by_deterministic_guard',
      reason: 'missing_source_identity_fields',
      missing_fields: [
        !sourceName ? 'source_product_name' : null,
        !sourceGroup ? 'source_group_name' : null,
        !printedNumber && !missingNumberReviewAllowed ? 'printed_number' : null,
      ].filter(Boolean),
      model_call_allowed: false,
      candidate_count: Array.isArray(row.candidate_targets)
        ? row.candidate_targets.length
        : 0,
      compatible_candidates: [],
      rejected_candidates: [],
    };
  }
  const candidates = Array.isArray(row.review_targets) && row.review_targets.length > 0
    ? row.review_targets
    : Array.isArray(row.candidate_targets)
      ? row.candidate_targets
      : [];
  if (candidates.length > 20) {
    return {
      source_product_id: sourceProductId,
      disposition: 'held_by_deterministic_guard',
      reason: 'candidate_count_exceeds_limit',
      model_call_allowed: false,
      candidate_count: candidates.length,
      compatible_candidates: [],
      rejected_candidates: [],
    };
  }

  const rejectedCandidates = [];
  const compatibleCandidates = [];
  for (const candidate of candidates) {
    const id = candidateId(candidate);
    if (!id) {
      rejectedCandidates.push({ candidate_id: null, conflicts: ['candidate_id'] });
      continue;
    }
    const conflicts = deterministicCandidateConflicts(row, candidate);
    if (conflicts.length) rejectedCandidates.push({ candidate_id: id, conflicts });
    else compatibleCandidates.push({
      candidate_id: id,
      card_print_id: scalar(candidate.card_print_id) || null,
      gv_id: scalar(candidate.gv_id) || null,
      set_code: scalar(candidate.set_code) || null,
      canonical_name: scalar(candidate.canonical_name) || null,
      canonical_number: scalar(candidate.canonical_number) || null,
      variant_key: scalar(candidate.variant_key) || null,
      active_standard_identity_count:
        Number(candidate.active_standard_identity_count ?? 0),
      active_tcgplayer_mapping_count:
        Number(candidate.active_tcgplayer_mapping_count ?? 0),
    });
  }

  if (!compatibleCandidates.length) {
    return {
      source_product_id: sourceProductId,
      disposition: 'held_by_deterministic_guard',
      reason: candidates.length ? 'all_candidates_conflict' : 'no_candidate_targets',
      model_call_allowed: false,
      candidate_count: candidates.length,
      compatible_candidates: [],
      rejected_candidates: rejectedCandidates,
    };
  }

  return {
    source_product_id: sourceProductId,
    disposition: 'local_model_review_lead',
    reason: 'compatible_candidates_require_review',
    model_call_allowed: true,
    candidate_count: candidates.length,
    compatible_candidates: compatibleCandidates,
    rejected_candidates: rejectedCandidates,
    prompt: {
      task: 'Rank a review lead. Never grant mapping authority.',
      source: {
        source_product_id: sourceProductId,
        name: sourceName,
        group: sourceGroup,
        printed_number: printedNumber,
        printed_number_missing: !printedNumber,
        normalized_name: scalar(row.normalized_source_name) || null,
        normalized_number: scalar(row.normalized_source_number) || null,
        subtypes: Array.isArray(row.source_subtypes) ? row.source_subtypes : [],
        target_set_code: scalar(row.set_authority?.set_code) || null,
      },
      candidates: compatibleCandidates.map((candidate, candidateIndex) => ({
        ...candidate,
        candidate_index: candidateIndex,
      })),
      rules: {
        output_is_advisory_only: true,
        candidate_index_must_come_from_candidates: true,
        uncertainty_requires_ambiguous_or_insufficient_evidence: true,
        missing_printed_number_can_only_produce_a_review_lead: true,
      },
    },
  };
}

export function validateTcgplayerOllamaAdviceV1(advice, plan) {
  if (!advice || typeof advice !== 'object' || Array.isArray(advice)) {
    throw new Error('Ollama advice must be a JSON object');
  }
  const allowedDecisions = new Set(
    TCGPLAYER_OLLAMA_TRIAGE_SCHEMA.properties.decision.enum,
  );
  const allowedReasons = new Set(
    TCGPLAYER_OLLAMA_TRIAGE_SCHEMA.properties.reason_code.enum,
  );
  if (!allowedDecisions.has(advice.decision)) {
    throw new Error('Ollama advice has an invalid decision');
  }
  if (!allowedReasons.has(advice.reason_code)) {
    throw new Error('Ollama advice has an invalid reason_code');
  }
  if (typeof advice.confidence !== 'number'
    || advice.confidence < 0
    || advice.confidence > 1) {
    throw new Error('Ollama advice has an invalid confidence');
  }
  if (typeof advice.explanation !== 'string' || advice.explanation.length > 180) {
    throw new Error('Ollama advice has an invalid explanation');
  }
  if (advice.candidate_index !== null
    && (!Number.isInteger(advice.candidate_index)
      || advice.candidate_index < 0
      || advice.candidate_index >= plan.compatible_candidates.length)) {
    throw new Error('Ollama advice selected a candidate outside the guarded set');
  }
  if (advice.decision === 'lead_candidate' && advice.candidate_index === null) {
    throw new Error('Ollama lead_candidate advice requires candidate_index');
  }
  if (advice.decision !== 'lead_candidate' && advice.candidate_index !== null) {
    throw new Error('Non-lead Ollama advice cannot select candidate_index');
  }
  return {
    decision: advice.decision,
    candidate_index: advice.candidate_index,
    candidate_id: advice.candidate_index === null
      ? null
      : plan.compatible_candidates[advice.candidate_index].candidate_id,
    confidence: advice.confidence,
    reason_code: advice.reason_code,
    explanation: advice.explanation,
  };
}

export function sha256TcgplayerOllamaEvidenceV1(value) {
  return createHash('sha256').update(value).digest('hex');
}
