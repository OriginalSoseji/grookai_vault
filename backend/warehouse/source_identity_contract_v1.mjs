export const SOURCE_IDENTITY_CONTRACT_V1 = 'WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1';
export const SOURCE_IDENTITY_TYPE = 'SOURCE_BACKED';
export const EXTERNAL_DISCOVERY_BRIDGE_SOURCE = 'external_discovery_bridge_v1';

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

export function normalizeVariantKey(value) {
  return normalizeTextOrNull(value);
}

function normalizeNumberPlain(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/[^0-9]/g, '').replace(/^0+/, '');
  return digits.length > 0 ? digits : null;
}

function uniqueText(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const normalized = normalizeTextOrNull(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function getSourceBackedIdentity(candidate) {
  const claimed = asRecord(candidate?.claimed_identity_payload) ?? {};
  const reference = asRecord(candidate?.reference_hints_payload) ?? {};
  const claimedVariant = asRecord(claimed.variant_identity);
  const referenceVariant = asRecord(reference.variant_identity);
  const variantIdentity = claimedVariant ?? referenceVariant ?? null;

  const bridgeSource =
    normalizeTextOrNull(reference.bridge_source) ??
    normalizeTextOrNull(claimed.bridge_source) ??
    normalizeTextOrNull(reference.provenance?.bridge_source);

  const sourceSetId =
    normalizeTextOrNull(reference.source_set_id) ??
    normalizeTextOrNull(claimed.source_set_id) ??
    normalizeTextOrNull(reference.provenance?.source_set_id);

  const name =
    normalizeTextOrNull(claimed.card_name) ??
    normalizeTextOrNull(claimed.name) ??
    normalizeTextOrNull(reference.card_name) ??
    normalizeTextOrNull(reference.name);

  const printedNumber =
    normalizeTextOrNull(claimed.printed_number) ??
    normalizeTextOrNull(claimed.number) ??
    normalizeTextOrNull(reference.printed_number) ??
    normalizeTextOrNull(reference.number);

  const numberPlain =
    normalizeTextOrNull(claimed.number_plain) ??
    normalizeTextOrNull(reference.number_plain) ??
    normalizeNumberPlain(printedNumber);

  const setCode =
    normalizeLowerOrNull(claimed.set_code) ??
    normalizeLowerOrNull(claimed.set_hint) ??
    normalizeLowerOrNull(reference.set_code) ??
    normalizeLowerOrNull(reference.set_hint);

  const setName =
    normalizeTextOrNull(claimed.set_name) ??
    normalizeTextOrNull(reference.set_name) ??
    normalizeTextOrNull(reference.source_card_snapshot?.set_name);

  const rarity =
    normalizeTextOrNull(claimed.rarity_hint) ??
    normalizeTextOrNull(claimed.rarity) ??
    normalizeTextOrNull(reference.rarity_hint) ??
    normalizeTextOrNull(reference.rarity) ??
    normalizeTextOrNull(reference.source_card_snapshot?.rarity);

  const variantKey =
    normalizeVariantKey(variantIdentity?.variant_key) ??
    normalizeVariantKey(claimed.variant_key) ??
    normalizeVariantKey(reference.variant_key);

  const illustrationCategory =
    normalizeTextOrNull(variantIdentity?.illustration_category) ??
    normalizeTextOrNull(claimed.illustration_category) ??
    normalizeTextOrNull(reference.illustration_category);

  const variantIdentityStatus =
    normalizeTextOrNull(variantIdentity?.status) ??
    normalizeTextOrNull(claimed.variant_identity_status) ??
    normalizeTextOrNull(reference.variant_identity_status);

  const variantIdentityRule =
    normalizeTextOrNull(variantIdentity?.rule) ??
    normalizeTextOrNull(claimed.variant_identity_rule) ??
    normalizeTextOrNull(reference.variant_identity_rule);

  const collisionGroupKey =
    normalizeTextOrNull(variantIdentity?.collision_group_key) ??
    normalizeTextOrNull(claimed.collision_group_key) ??
    normalizeTextOrNull(reference.collision_group_key);

  const ambiguityNotes = uniqueText([
    ...(Array.isArray(reference.ambiguity_notes) ? reference.ambiguity_notes : []),
    ...(Array.isArray(claimed.ambiguity_notes) ? claimed.ambiguity_notes : []),
  ]);

  const sourceCandidateId =
    normalizeTextOrNull(reference.source_candidate_id) ??
    normalizeTextOrNull(claimed.source_candidate_id);

  const isBridgeCandidate = bridgeSource === EXTERNAL_DISCOVERY_BRIDGE_SOURCE;
  const isComplete = Boolean(isBridgeCandidate && name && numberPlain && setCode);
  const requiresVariantKey = Boolean(collisionGroupKey || variantIdentityRule || variantIdentityStatus);
  const variantMissing = Boolean(requiresVariantKey && !variantKey);
  const hasAmbiguity = ambiguityNotes.length > 0;
  const autoReady =
    isComplete &&
    !variantMissing &&
    !hasAmbiguity &&
    (!requiresVariantKey || variantIdentityStatus === 'RESOLVED_BY_VARIANT_KEY');

  return {
    source_type: isBridgeCandidate ? SOURCE_IDENTITY_TYPE : null,
    bridge_source: bridgeSource,
    source_set_id: sourceSetId,
    source_candidate_id: sourceCandidateId,
    name,
    printed_number: printedNumber,
    number_plain: numberPlain,
    set_code: setCode,
    set_name: setName,
    rarity,
    variant_key: variantKey,
    illustration_category: illustrationCategory,
    variant_identity_status: variantIdentityStatus,
    variant_identity_rule: variantIdentityRule,
    collision_group_key: collisionGroupKey,
    variant_identity: variantIdentity,
    ambiguity_notes: ambiguityNotes,
    is_bridge_candidate: isBridgeCandidate,
    is_complete: isComplete,
    requires_variant_key: requiresVariantKey,
    variant_missing: variantMissing,
    auto_ready: autoReady,
  };
}

export function isSourceBackedBridgeCandidate(candidate) {
  return getSourceBackedIdentity(candidate).is_bridge_candidate;
}

export function buildSourceBackedMetadataExtractionPackages({ candidate, evidenceRows = [], scanResults = [] }) {
  const identity = getSourceBackedIdentity(candidate);

  const rawPackage = {
    version: 'V1',
    status: identity.auto_ready ? 'READY' : 'BLOCKED',
    extractor: {
      worker: SOURCE_IDENTITY_CONTRACT_V1,
      pipeline: SOURCE_IDENTITY_CONTRACT_V1,
      extraction_engine: 'bridge_payload_identity',
      analysis_version: 'V1',
    },
    source_refs: {
      candidate_id: candidate?.id ?? null,
      candidate_state: candidate?.state ?? null,
      submission_intent: candidate?.submission_intent ?? null,
      source_type: SOURCE_IDENTITY_TYPE,
      bridge_source: identity.bridge_source,
      source_set_id: identity.source_set_id,
      source_candidate_id: identity.source_candidate_id,
      evidence_row_ids: evidenceRows.map((row) => row.id),
      identity_scan_result_ids: scanResults.map((row) => row.id),
    },
    direct_signals: {
      name: identity.name,
      number: identity.printed_number,
      set: identity.set_code,
      printed_modifier: identity.variant_key,
    },
    confidence: {
      overall: identity.auto_ready ? 1 : 0,
      name: identity.name ? 1 : 0,
      number: identity.number_plain ? 1 : 0,
      set: identity.set_code ? 1 : 0,
      printed_modifier: identity.variant_key ? 1 : 0,
    },
    raw_signals: {
      source_identity: {
        contract: SOURCE_IDENTITY_CONTRACT_V1,
        source_type: SOURCE_IDENTITY_TYPE,
        bridge_source: identity.bridge_source,
        source_set_id: identity.source_set_id,
        source_candidate_id: identity.source_candidate_id,
        name: identity.name,
        printed_number: identity.printed_number,
        number_plain: identity.number_plain,
        set_code: identity.set_code,
        set_name: identity.set_name,
        rarity: identity.rarity,
        variant_key: identity.variant_key,
        illustration_category: identity.illustration_category,
        variant_identity_status: identity.variant_identity_status,
      },
    },
    errors: identity.auto_ready ? [] : ['source_identity_incomplete'],
  };

  const normalizedPackage = {
    version: 'V1',
    status: identity.auto_ready ? 'READY' : 'BLOCKED',
    confidence: identity.auto_ready ? 'HIGH' : 'LOW',
    source_type: SOURCE_IDENTITY_TYPE,
    bridge_source: identity.bridge_source,
    identity: {
      name: identity.name,
      number: identity.number_plain,
      number_plain: identity.number_plain,
      printed_number: identity.printed_number,
      set_code: identity.set_code,
      set_name: identity.set_name,
    },
    variant_key: identity.variant_key,
    illustration_category: identity.illustration_category,
    variant_identity_status: identity.variant_identity_status,
    field_confidence: {
      name: identity.name ? 1 : null,
      number: identity.number_plain ? 1 : null,
      set: identity.set_code ? 1 : null,
    },
    printed_modifier: {
      status: identity.variant_key ? 'READY' : 'BLOCKED',
      modifier_key: identity.variant_key,
      modifier_label: identity.illustration_category ?? identity.variant_key,
      confidence: identity.variant_key ? 1 : null,
      reason: identity.variant_key ? 'source_backed_variant_identity' : 'missing_printed_modifier_signal',
      ambiguity_flags: [],
    },
    missing_fields: uniqueText([
      !identity.name ? 'name' : null,
      !identity.number_plain ? 'collector_number' : null,
      !identity.set_code ? 'set_identity' : null,
      identity.variant_missing ? 'variant_key' : null,
    ]),
    evidence_gaps: [],
    ambiguity_notes: identity.variant_missing ? ['variant_identity_missing'] : identity.ambiguity_notes,
    next_actions: identity.auto_ready
      ? ['Use the source-backed metadata package for warehouse interpretation and founder review.']
      : ['Complete the required source identity fields before promotion.'],
  };

  return {
    identity,
    rawPackage,
    normalizedPackage,
  };
}

export function buildSourceBackedInterpreterPackage({ candidate, classificationPackage = null }) {
  const identity = getSourceBackedIdentity(candidate);
  const proposedAction =
    normalizeTextOrNull(classificationPackage?.proposed_action_type) ??
    normalizeTextOrNull(candidate?.proposed_action_type) ??
    'CREATE_CARD_PRINT';

  return {
    version: 'V1',
    contract: SOURCE_IDENTITY_CONTRACT_V1,
    source_type: SOURCE_IDENTITY_TYPE,
    bridge_source: identity.bridge_source,
    status: identity.auto_ready ? 'READY' : 'BLOCKED',
    decision: identity.auto_ready ? 'CREATE_NEW_CANON_PARENT' : 'BLOCKED',
    founder_explanation: identity.auto_ready
      ? `Source-backed bridge candidate provides deterministic identity for ${identity.name} ${identity.printed_number}.`
      : 'Source-backed bridge candidate is missing required identity fields.',
    canon_context: {
      canonical_set_code: identity.set_code,
      canonical_set_name: identity.set_name,
      matched_card_print_id: null,
      matched_card_printing_id: null,
      number: identity.number_plain,
      variant_key: identity.variant_key,
      finish_key: null,
    },
    proposed_action: identity.auto_ready ? proposedAction : null,
    variant_identity: identity.variant_identity ?? null,
    ambiguity_flags: identity.ambiguity_notes,
    missing_fields: uniqueText([
      !identity.name ? 'card_name' : null,
      !identity.number_plain ? 'printed_number' : null,
      !identity.set_code ? 'set_code' : null,
      identity.variant_missing ? 'variant_key' : null,
    ]),
  };
}
