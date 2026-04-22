export const SOURCE_IDENTITY_CONTRACT_V1 = 'WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1';
export const SOURCE_IDENTITY_TYPE = 'SOURCE_BACKED';
export const EXTERNAL_DISCOVERY_BRIDGE_SOURCE = 'external_discovery_bridge_v1';
const RESOLVED_VARIANT_IDENTITY_STATUSES = new Set(['RESOLVED_BY_VARIANT_KEY', 'RESOLVED_STAMPED_IDENTITY']);
export const PROMO_SLASH_NUMBER_UNDERLYING_BASE_SET_ROUTE = 'PROMO_SLASH_NUMBER_UNDERLYING_BASE_SET_ROUTE';

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

  const compact = normalized.replace(/[⁄∕]/g, '/').replace(/\s+/g, '');
  const left = compact.includes('/') ? compact.split('/', 1)[0] : compact;
  const digits = left.replace(/[^0-9]/g, '').replace(/^0+/, '');
  return digits.length > 0 ? digits : null;
}

export function hasSlashPrintedNumberV1(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return false;
  }

  return /[\/⁄∕]/.test(normalized);
}

function extractStampedUnderlyingBaseProofSummary(claimed, reference, variantIdentity) {
  return (
    asRecord(reference?.stamped_identity_evidence)?.underlying_base_proof_summary ??
    asRecord(claimed?.stamped_identity_evidence)?.underlying_base_proof_summary ??
    asRecord(variantIdentity?.source_evidence)?.underlying_base_proof_summary ??
    null
  );
}

export function resolveUnderlyingBaseFromPrintedNumberV1({
  sourceSetId = null,
  declaredSetCode = null,
  printedNumber = null,
  variantIdentityStatus = null,
  proofSummary = null,
} = {}) {
  const normalizedDeclaredSetCode = normalizeLowerOrNull(declaredSetCode);
  const underlyingBaseState = normalizeTextOrNull(proofSummary?.underlying_base_state);
  const underlyingBaseSetCode = normalizeLowerOrNull(proofSummary?.live_base_set_code);
  const underlyingBaseCardPrintId = normalizeTextOrNull(proofSummary?.live_base_card_print_id);
  const printedNumberHasSlash = hasSlashPrintedNumberV1(printedNumber);
  const hasResolvedVariantIdentity = RESOLVED_VARIANT_IDENTITY_STATUSES.has(
    normalizeTextOrNull(variantIdentityStatus),
  );
  const hasProvenUnderlyingBase =
    underlyingBaseState === 'PROVEN' &&
    underlyingBaseSetCode &&
    underlyingBaseSetCode !== normalizedDeclaredSetCode;
  const shouldRouteToUnderlyingBaseSet =
    printedNumberHasSlash &&
    hasResolvedVariantIdentity &&
    hasProvenUnderlyingBase;

  return {
    source_set_id: normalizeTextOrNull(sourceSetId),
    declared_set_code: normalizedDeclaredSetCode,
    effective_set_code: shouldRouteToUnderlyingBaseSet ? underlyingBaseSetCode : normalizedDeclaredSetCode,
    routing_reason: shouldRouteToUnderlyingBaseSet ? PROMO_SLASH_NUMBER_UNDERLYING_BASE_SET_ROUTE : null,
    printed_number_has_slash: printedNumberHasSlash,
    variant_identity_resolved: hasResolvedVariantIdentity,
    underlying_base_state: underlyingBaseState,
    underlying_base_set_code: underlyingBaseSetCode,
    underlying_base_card_print_id: underlyingBaseCardPrintId,
    underlying_base_proof_summary: asRecord(proofSummary) ?? null,
    resolution_confidence: shouldRouteToUnderlyingBaseSet ? 'PROVEN_UNDERLYING_BASE' : null,
  };
}

function deriveStampedPromoSetRouting({
  sourceSetId,
  declaredSetCode,
  printedNumber,
  variantIdentityStatus,
  claimed,
  reference,
  variantIdentity,
}) {
  const proofSummary = extractStampedUnderlyingBaseProofSummary(claimed, reference, variantIdentity);
  return resolveUnderlyingBaseFromPrintedNumberV1({
    sourceSetId,
    declaredSetCode,
    printedNumber,
    variantIdentityStatus,
    proofSummary,
  });
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

  const declaredSetCode =
    normalizeLowerOrNull(claimed.set_code) ??
    normalizeLowerOrNull(claimed.set_hint) ??
    normalizeLowerOrNull(reference.set_code) ??
    normalizeLowerOrNull(reference.set_hint);

  const declaredSetName =
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

  const setRouting = deriveStampedPromoSetRouting({
    sourceSetId,
    declaredSetCode,
    printedNumber,
    variantIdentityStatus,
    claimed,
    reference,
    variantIdentity,
  });

  const setCode = setRouting.effective_set_code;
  const setName = setRouting.routing_reason ? null : declaredSetName;

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
    (!requiresVariantKey || RESOLVED_VARIANT_IDENTITY_STATUSES.has(variantIdentityStatus));

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
    declared_set_code: declaredSetCode,
    declared_set_name: declaredSetName,
    set_routing_reason: setRouting.routing_reason,
    underlying_base_set_code: setRouting.underlying_base_set_code,
    underlying_base_card_print_id: setRouting.underlying_base_card_print_id,
    underlying_base_proof_summary: setRouting.underlying_base_proof_summary,
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
        declared_set_code: identity.declared_set_code,
        declared_set_name: identity.declared_set_name,
        rarity: identity.rarity,
        variant_key: identity.variant_key,
        illustration_category: identity.illustration_category,
        variant_identity_status: identity.variant_identity_status,
        set_routing_reason: identity.set_routing_reason,
        underlying_base_set_code: identity.underlying_base_set_code,
        underlying_base_card_print_id: identity.underlying_base_card_print_id,
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
    canonical_routing: identity.set_routing_reason
      ? {
          declared_set_code: identity.declared_set_code,
          effective_set_code: identity.set_code,
          reason: identity.set_routing_reason,
          underlying_base_set_code: identity.underlying_base_set_code,
          underlying_base_card_print_id: identity.underlying_base_card_print_id,
        }
      : null,
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

export function buildSourceBackedInterpreterPackage({
  candidate,
  classificationPackage = null,
  identityAuditPackage = null,
}) {
  const identity = getSourceBackedIdentity(candidate);
  const identityAuditStatus = normalizeTextOrNull(identityAuditPackage?.identity_audit_status);
  const identityAuditReasonCode = normalizeTextOrNull(identityAuditPackage?.reason_code);
  const identityResolution = normalizeTextOrNull(classificationPackage?.identity_resolution);
  const identityResolutionPackage = asRecord(classificationPackage?.identity_resolution_package);
  const routedVariantKey =
    normalizeVariantKey(identityAuditPackage?.routing?.variant_key) ??
    identity.variant_key;
  const routedFinishKey =
    normalizeTextOrNull(identityAuditPackage?.routing?.finish_key);
  const matchedCardPrintId = normalizeTextOrNull(identityAuditPackage?.routing?.matched_card_print_id);
  const matchedCardPrintingId = normalizeTextOrNull(identityAuditPackage?.routing?.matched_card_printing_id);
  const proposedAction =
    normalizeTextOrNull(classificationPackage?.proposed_action_type) ??
    normalizeTextOrNull(candidate?.proposed_action_type) ??
    (identityAuditStatus === 'PRINTING_ONLY' ? 'CREATE_CARD_PRINTING' : 'CREATE_CARD_PRINT');

  let status = identity.auto_ready ? 'READY' : 'BLOCKED';
  let decision = identity.auto_ready ? 'CREATE_NEW_CANON_PARENT' : 'BLOCKED';
  let founderExplanation = identity.auto_ready
    ? `Source-backed bridge candidate provides deterministic identity for ${identity.name} ${identity.printed_number}.`
    : 'Source-backed bridge candidate is missing required identity fields.';
  let missingFields = uniqueText([
    !identity.name ? 'card_name' : null,
    !identity.number_plain ? 'printed_number' : null,
    !identity.set_code ? 'set_code' : null,
    identity.variant_missing ? 'variant_key' : null,
  ]);

  if (identityAuditStatus === 'PRINTING_ONLY') {
    const ready = Boolean(matchedCardPrintId && routedFinishKey);
    status = ready ? 'READY' : 'BLOCKED';
    decision = ready ? 'CREATE_CHILD_PRINTING' : 'BLOCKED';
    founderExplanation = ready
      ? 'Identity slot audit resolved the candidate as finish-only under an existing canonical parent.'
      : 'Identity slot audit resolved a finish-only distinction but did not produce a canonical parent and finish_key.';
    missingFields = uniqueText([
      !matchedCardPrintId ? 'matched_card_print_id' : null,
      !routedFinishKey ? 'finish_key' : null,
    ]);
  } else if (identityAuditStatus === 'ALIAS') {
    status = 'BLOCKED';
    decision = 'MATCH_EXISTING_CANON_ALIAS';
    founderExplanation = 'Identity slot audit resolved the candidate as an alias of an existing canonical row. Promotion is not lawful from this state.';
    missingFields = [];
  } else if (identityAuditStatus === 'SLOT_CONFLICT') {
    status = 'BLOCKED';
    decision = 'SLOT_CONFLICT';
    founderExplanation = 'Identity slot audit found an occupied canonical slot owned by a different card identity.';
    missingFields = [];
  } else if (identityAuditStatus === 'AMBIGUOUS') {
    status = 'BLOCKED';
    decision = 'AMBIGUOUS';
    founderExplanation = 'Identity slot audit could not deterministically resolve a lawful canonical route.';
  } else if (identityAuditStatus === 'VARIANT_IDENTITY') {
    status = identity.auto_ready && Boolean(routedVariantKey) ? 'READY' : 'BLOCKED';
    decision = status === 'READY' ? 'CREATE_NEW_CANON_PARENT' : 'BLOCKED';
    founderExplanation = status === 'READY'
      ? `Identity slot audit resolved ${identity.name} ${identity.printed_number} as an identity-bearing variant requiring variant_key=${routedVariantKey}.`
      : 'Identity slot audit requires a deterministic variant_key before promotion can proceed.';
    missingFields = uniqueText([
      !identity.name ? 'card_name' : null,
      !identity.number_plain ? 'printed_number' : null,
      !identity.set_code ? 'set_code' : null,
      !routedVariantKey ? 'variant_key' : null,
    ]);
  }

  return {
    version: 'V1',
    contract: SOURCE_IDENTITY_CONTRACT_V1,
    source_type: SOURCE_IDENTITY_TYPE,
    bridge_source: identity.bridge_source,
    status,
    decision,
    founder_explanation: founderExplanation,
    identity_audit_status: identityAuditStatus,
    identity_audit_reason_code: identityAuditReasonCode,
    identity_resolution: identityResolution,
    identity_resolution_action: identityResolutionPackage?.action_payload ?? null,
    canon_context: {
      canonical_set_code: identity.set_code,
      canonical_set_name: identity.set_name,
      declared_set_code: identity.declared_set_code,
      matched_card_print_id: matchedCardPrintId,
      matched_card_printing_id: matchedCardPrintingId,
      number: identity.number_plain,
      variant_key: routedVariantKey,
      finish_key: routedFinishKey,
    },
    proposed_action: status === 'READY' ? proposedAction : null,
    variant_identity: identity.variant_identity ?? null,
    ambiguity_flags: identity.ambiguity_notes,
    missing_fields: missingFields,
  };
}
