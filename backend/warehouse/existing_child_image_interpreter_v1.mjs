// Shared deterministic interpretation for an already classified existing child.
// This proposes an image action; it does not approve, stage, or mutate anything.
const text = value => typeof value === 'string' ? value.trim() : '';
const number = value => text(value).split('/')[0].replace(/^0+(?=\d)/, '');
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export function buildExistingChildImageInterpreterV1({
  candidate, classificationPackage: classification, metadataPackage, canonContext,
  hasFrontEvidence, evidenceGaps = [], variantIdentity = null,
}) {
  const audit = classification?.metadata_documentation?.extracted_fields?.identity_audit_package;
  const routing = audit?.routing, resolver = classification?.resolver_summary;
  const identity = metadataPackage?.identity, auditedIdentity = audit?.candidate_identity;
  const resolution = classification?.identity_resolution_package;
  const target = resolution?.action_payload;
  if (candidate?.submission_intent !== 'MISSING_IMAGE' ||
      !['CLASSIFIED','REVIEW_READY','APPROVED_BY_FOUNDER','STAGED_FOR_PROMOTION'].includes(candidate?.state) ||
      candidate.proposed_action_type !== 'ENRICH_CARD_PRINTING_IMAGE' || hasFrontEvidence !== true ||
      classification?.candidate_id !== candidate?.id || classification?.classification_status !== 'CLASSIFIED_READY' ||
      classification?.proposed_action_type !== 'ENRICH_CARD_PRINTING_IMAGE' ||
      classification?.identity_resolution !== 'ATTACH_PRINTING' ||
      audit?.identity_audit_status !== 'PRINTING_ONLY' || (audit?.ambiguity_flags?.length ?? 1) !== 0 ||
      (audit?.missing_fields?.length ?? 0) !== 0 ||
      (classification?.metadata_documentation?.ambiguity_notes?.length ?? 0) !== 0 ||
      resolution?.identity_resolution !== 'ATTACH_PRINTING' || target?.approved_action_type !== 'ENRICH_CARD_PRINTING_IMAGE' ||
      metadataPackage?.status !== 'READY' || (metadataPackage?.missing_fields?.length ?? 0) !== 0 ||
      (metadataPackage?.ambiguity_notes?.length ?? 0) !== 0) return null;
  const parent = canonContext?.matched_card_print_id, child = canonContext?.matched_card_printing_id;
  if (!uuid.test(parent ?? '') || !uuid.test(child ?? '') ||
      [resolver, routing, target].some(value => value?.matched_card_print_id !== parent || value?.matched_card_printing_id !== child) ||
      routing?.proposed_action_type !== 'ENRICH_CARD_PRINTING_IMAGE' ||
      !text(canonContext?.finish_key) || routing?.finish_key !== canonContext.finish_key ||
      target?.finish_key !== canonContext.finish_key ||
      !text(canonContext?.canonical_set_code) || !text(canonContext?.number) ||
      !text(identity?.name) || !text(identity?.printed_number) ||
      text(identity.name).toLowerCase() !== text(auditedIdentity?.name).toLowerCase() ||
      number(identity.printed_number) !== number(auditedIdentity?.number_plain) ||
      number(identity.printed_number) !== number(canonContext.number) ||
      text(identity.set_code) !== text(auditedIdentity?.set_code) ||
      text(identity.set_code) !== text(canonContext.canonical_set_code) ||
      text(canonContext.variant_key) !== text(auditedIdentity?.variant_key) ||
      // The finish-only router may leave variant_key null because it is not
      // creating a parent variant. The audited parent identity above is exact.
      (text(routing?.variant_key) && text(canonContext.variant_key) !== text(routing.variant_key))) return null;
  return {
    version:'V1',status:'READY',decision:'IMAGE_REPAIR_ONLY',
    reason_code:'CHILD_PRINTING_IMAGE_MISSING_OR_WEAK',confidence:'HIGH',
    founder_explanation:'The current classifier and identity audit resolve this image to the same existing parent and child printing. Repair the child image only; retain both identities and the parent image.',
    canon_context:{...canonContext},proposed_action:'ENRICH_CARD_PRINTING_IMAGE',
    missing_fields:[],evidence_gaps:[...new Set(evidenceGaps)],variant_identity:variantIdentity,
    next_actions:['Founder execution approval and the existing frozen staging/executor gates remain required.'],
    raw_reason_code:classification.interpreter_reason_code ?? null,
  };
}
