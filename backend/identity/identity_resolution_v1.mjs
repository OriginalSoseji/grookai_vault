export const IDENTITY_RESOLUTION_VERSION = 'V1';

export const IDENTITY_RESOLUTION_STATES = Object.freeze({
  PROMOTE_NEW: 'PROMOTE_NEW',
  PROMOTE_VARIANT: 'PROMOTE_VARIANT',
  ATTACH_PRINTING: 'ATTACH_PRINTING',
  MAP_ALIAS: 'MAP_ALIAS',
  BLOCK_REVIEW_REQUIRED: 'BLOCK_REVIEW_REQUIRED',
  BLOCK_AMBIGUOUS: 'BLOCK_AMBIGUOUS',
});

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

function getIdentityAuditPackage(classificationPackage, identityAuditPackage = null) {
  const extracted = asRecord(classificationPackage?.metadata_documentation?.extracted_fields);
  return (
    identityAuditPackage ??
    asRecord(classificationPackage?.identity_audit_package) ??
    asRecord(extracted?.identity_audit_package)
  );
}

function getCandidateReference(candidate) {
  return asRecord(candidate?.reference_hints_payload) ?? {};
}

function getCandidateClaimed(candidate) {
  return asRecord(candidate?.claimed_identity_payload) ?? {};
}

function getExternalMappingSource(candidate) {
  const reference = getCandidateReference(candidate);
  const claimed = getCandidateClaimed(candidate);
  return (
    normalizeLowerOrNull(reference.external_source) ??
    normalizeLowerOrNull(claimed.external_source) ??
    null
  );
}

function getExternalMappingId(candidate) {
  const reference = getCandidateReference(candidate);
  const claimed = getCandidateClaimed(candidate);
  return (
    normalizeTextOrNull(reference.source_card_snapshot?.external_id) ??
    normalizeTextOrNull(reference.upstream_id) ??
    normalizeTextOrNull(claimed.upstream_id) ??
    null
  );
}

function getSourceSetId(candidate) {
  const reference = getCandidateReference(candidate);
  const claimed = getCandidateClaimed(candidate);
  return normalizeTextOrNull(reference.source_set_id) ?? normalizeTextOrNull(claimed.source_set_id) ?? null;
}

function getSourceCandidateId(candidate) {
  const reference = getCandidateReference(candidate);
  const claimed = getCandidateClaimed(candidate);
  return normalizeTextOrNull(reference.source_candidate_id) ?? normalizeTextOrNull(claimed.source_candidate_id) ?? null;
}

function getBridgeSource(candidate) {
  const reference = getCandidateReference(candidate);
  const claimed = getCandidateClaimed(candidate);
  return (
    normalizeTextOrNull(reference.bridge_source) ??
    normalizeTextOrNull(claimed.bridge_source) ??
    normalizeTextOrNull(reference.provenance?.bridge_source) ??
    null
  );
}

function buildBaseResolution(identityAuditPackage, classificationPackage) {
  const identityAuditStatus = normalizeTextOrNull(identityAuditPackage?.identity_audit_status);
  const identityAuditReasonCode = normalizeTextOrNull(identityAuditPackage?.reason_code);
  const interpreterReasonCode = normalizeTextOrNull(classificationPackage?.interpreter_reason_code);
  return {
    version: IDENTITY_RESOLUTION_VERSION,
    identity_audit_status: identityAuditStatus,
    identity_audit_reason_code: identityAuditReasonCode,
    identity_resolution: null,
    reason_code: identityAuditReasonCode ?? interpreterReasonCode ?? 'IDENTITY_RESOLUTION_UNSET',
    explanation: null,
    action_payload: null,
  };
}

export function resolveIdentityResolutionV1({
  candidate = null,
  classificationPackage = null,
  identityAuditPackage = null,
} = {}) {
  const resolvedIdentityAuditPackage = getIdentityAuditPackage(classificationPackage, identityAuditPackage);
  const result = buildBaseResolution(resolvedIdentityAuditPackage, classificationPackage);
  const identityAuditStatus = normalizeTextOrNull(resolvedIdentityAuditPackage?.identity_audit_status);
  const routing = asRecord(resolvedIdentityAuditPackage?.routing) ?? {};
  const matchedCardPrintId = normalizeTextOrNull(routing.matched_card_print_id);
  const matchedCardPrintingId = normalizeTextOrNull(routing.matched_card_printing_id);
  const variantKey = normalizeTextOrNull(routing.variant_key);
  const finishKey = normalizeTextOrNull(routing.finish_key);
  const proposedActionType =
    normalizeTextOrNull(classificationPackage?.proposed_action_type) ??
    normalizeTextOrNull(classificationPackage?.candidate_summary?.proposed_action_type) ??
    null;

  switch (identityAuditStatus) {
    case 'NEW_CANONICAL':
      result.identity_resolution = IDENTITY_RESOLUTION_STATES.PROMOTE_NEW;
      result.explanation = 'Identity resolution routes this candidate to a new canonical parent row.';
      result.action_payload = {
        action_type: 'CREATE_CARD_PRINT',
        approved_action_type: 'CREATE_CARD_PRINT',
        target_table: 'card_prints',
        matched_card_print_id: null,
        matched_card_printing_id: null,
        variant_key: null,
        finish_key: null,
        proposed_action_type: proposedActionType,
      };
      return result;

    case 'VARIANT_IDENTITY':
      result.identity_resolution = IDENTITY_RESOLUTION_STATES.PROMOTE_VARIANT;
      result.explanation = 'Identity resolution routes this candidate to a new canonical parent row with a deterministic variant_key.';
      result.action_payload = {
        action_type: 'CREATE_CARD_PRINT',
        approved_action_type: 'CREATE_CARD_PRINT',
        target_table: 'card_prints',
        matched_card_print_id: null,
        matched_card_printing_id: null,
        variant_key: variantKey,
        finish_key: null,
        proposed_action_type: proposedActionType,
      };
      return result;

    case 'PRINTING_ONLY':
      result.identity_resolution = IDENTITY_RESOLUTION_STATES.ATTACH_PRINTING;
      result.explanation = 'Identity resolution routes this candidate to an existing parent row as a finish-only child printing.';
      result.action_payload = {
        action_type: 'ATTACH_PRINTING',
        approved_action_type: matchedCardPrintingId ? 'ENRICH_CANON_IMAGE' : 'CREATE_CARD_PRINTING',
        target_table: matchedCardPrintingId ? 'card_printings' : 'card_printings',
        matched_card_print_id: matchedCardPrintId,
        matched_card_printing_id: matchedCardPrintingId,
        variant_key: null,
        finish_key: finishKey,
        proposed_action_type: proposedActionType,
      };
      return result;

    case 'ALIAS': {
      const source = getExternalMappingSource(candidate);
      const externalId = getExternalMappingId(candidate);
      result.identity_resolution = IDENTITY_RESOLUTION_STATES.MAP_ALIAS;
      result.explanation = 'Identity resolution routes this candidate to an external mapping attachment instead of a new canonical row.';
      result.action_payload = {
        action_type: 'UPSERT_EXTERNAL_MAPPING',
        approved_action_type: null,
        target_table: 'external_mappings',
        matched_card_print_id: matchedCardPrintId,
        source,
        external_id: externalId,
        active: true,
        bridge_source: getBridgeSource(candidate),
        source_set_id: getSourceSetId(candidate),
        source_candidate_id: getSourceCandidateId(candidate),
        missing_requirements: [
          !matchedCardPrintId ? 'matched_card_print_id' : null,
          !source ? 'external_source' : null,
          !externalId ? 'external_id' : null,
        ].filter(Boolean),
        proposed_action_type: proposedActionType,
      };
      return result;
    }

    case 'SLOT_CONFLICT':
      result.identity_resolution = IDENTITY_RESOLUTION_STATES.BLOCK_REVIEW_REQUIRED;
      result.explanation = 'Identity resolution blocks automatic promotion because the collector slot is already owned by a different canonical identity.';
      result.action_payload = {
        action_type: 'FOUNDER_REVIEW',
        approved_action_type: null,
        target_table: null,
        matched_card_print_id: matchedCardPrintId,
        matched_card_printing_id: null,
        proposed_action_type: proposedActionType,
      };
      return result;

    case 'AMBIGUOUS':
      result.identity_resolution = IDENTITY_RESOLUTION_STATES.BLOCK_AMBIGUOUS;
      result.explanation = 'Identity resolution blocks automatic promotion because the available identity evidence is ambiguous.';
      result.action_payload = {
        action_type: 'MANUAL_IDENTITY_REVIEW',
        approved_action_type: null,
        target_table: null,
        matched_card_print_id: matchedCardPrintId,
        matched_card_printing_id: matchedCardPrintingId,
        proposed_action_type: proposedActionType,
      };
      return result;

    default:
      result.reason_code = result.reason_code ?? 'IDENTITY_AUDIT_STATUS_MISSING';
      result.explanation = 'Identity resolution could not be derived because the classification package does not carry a supported identity audit status.';
      result.action_payload = {
        action_type: null,
        approved_action_type: null,
        target_table: null,
        matched_card_print_id: matchedCardPrintId,
        matched_card_printing_id: matchedCardPrintingId,
        proposed_action_type: proposedActionType,
      };
      return result;
  }
}

export function validateIdentityResolutionForApprovedActionV1(identityResolution, approvedActionType) {
  const normalizedResolution = normalizeTextOrNull(identityResolution);
  const normalizedActionType = normalizeTextOrNull(approvedActionType);

  if (!normalizedResolution) {
    return {
      ok: false,
      reason: 'identity_resolution_missing',
      missing: ['identity_resolution'],
    };
  }

  if (!normalizedActionType) {
    return {
      ok: false,
      reason: 'approved_action_type_missing',
      missing: ['approved_action_type'],
    };
  }

  if (normalizedActionType === 'CREATE_CARD_PRINT') {
    if (
      normalizedResolution === IDENTITY_RESOLUTION_STATES.PROMOTE_NEW ||
      normalizedResolution === IDENTITY_RESOLUTION_STATES.PROMOTE_VARIANT
    ) {
      return { ok: true };
    }

    return {
      ok: false,
      reason: `identity_resolution_disallows_create_card_print:${normalizedResolution}`,
      missing: ['identity_resolution must be PROMOTE_NEW or PROMOTE_VARIANT'],
    };
  }

  if (normalizedActionType === 'CREATE_CARD_PRINTING' || normalizedActionType === 'ENRICH_CANON_IMAGE') {
    if (normalizedResolution === IDENTITY_RESOLUTION_STATES.ATTACH_PRINTING) {
      return { ok: true };
    }

    return {
      ok: false,
      reason: `identity_resolution_disallows_attach_printing:${normalizedResolution}`,
      missing: ['identity_resolution must be ATTACH_PRINTING'],
    };
  }

  return {
    ok: false,
    reason: `identity_resolution_unknown_action_type:${normalizedActionType}`,
    missing: ['Supported approved_action_type'],
  };
}
