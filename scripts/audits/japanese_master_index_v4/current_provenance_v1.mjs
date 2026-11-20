// Older artifacts do not distinguish active from historical evidence.
export function hasCurrentProvenance(card) {
  const evidence = card.active_baseline_evidence_ids ?? card.baseline_evidence_ids ?? [];
  return card.independent_source_count > 0 || evidence.length > 0;
}

export function assertionDisposition(identity, assertion, dispositionsByIdentity) {
  if (assertion.assertion_lane === 'preserved_inactive_evidence') {
    return 'excluded_source_assertion';
  }
  if (identity) {
    const disposition = dispositionsByIdentity[identity.disposition];
    if (!disposition) throw new Error(`Missing assertion disposition for ${identity.disposition}`);
    return disposition;
  }
  if (assertion.final_disposition === 'conflict_blocked') return 'source_group_conflict';
  if (assertion.final_disposition === 'adjudicated_excluded') return 'excluded_source_assertion';
  return 'unlinked_source_assertion_requires_adjudication';
}
