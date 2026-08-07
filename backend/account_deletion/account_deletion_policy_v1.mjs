import crypto from 'node:crypto';

export const ACCOUNT_DELETION_POLICY_VERSION = 'ACCOUNT_DELETION_POLICY_V1';

const RETAINED_OPERATIONAL_REFERENCES = new Set([
  'public.canon_warehouse_candidate_credits.user_id',
  'public.canon_warehouse_candidate_evidence.created_by_user_id',
  'public.canon_warehouse_candidates.submitted_by_user_id',
  'public.canon_warehouse_promotion_staging.staged_by_user_id',
  'public.card_execution_events.initiated_by_user_id',
  'public.card_interaction_outcomes.executed_by_user_id',
  'public.card_interaction_outcomes.source_user_id',
  'public.card_interaction_outcomes.target_user_id',
]);

const USER_CONTENT_REFERENCES = new Set([
  'public.listings.owner_id',
]);

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function targetFingerprint(userId) {
  return sha256(`grookai-account-deletion-v1:${String(userId).trim().toLowerCase()}`);
}

export function referenceKey(reference) {
  return `${reference.schema_name}.${reference.table_name}.${reference.column_name}`;
}

export function classifyReference(reference) {
  const key = referenceKey(reference);
  if (reference.delete_action === 'CASCADE') {
    return { policy: 'delete_with_hard_auth_removal', key };
  }
  if (reference.delete_action === 'SET NULL') {
    return { policy: 'anonymize_with_hard_auth_removal', key };
  }
  if (USER_CONTENT_REFERENCES.has(key)) {
    return { policy: 'delete_user_content_before_auth_removal', key };
  }
  if (reference.nullable) {
    return { policy: 'scrub_nullable_attribution_before_auth_removal', key };
  }
  if (RETAINED_OPERATIONAL_REFERENCES.has(key)) {
    return { policy: 'retain_pseudonymous_operational_history', key };
  }
  return { policy: 'unclassified_hard_delete_blocker', key };
}

export function buildDeletionDecision({ references, activeOwnedBinders = 0 }) {
  const populated = references
    .filter((reference) => Number(reference.row_count) > 0)
    .map((reference) => ({
      ...reference,
      ...classifyReference(reference),
    }));
  const retained = populated.filter(
    (reference) => reference.policy === 'retain_pseudonymous_operational_history',
  );
  const unclassified = populated.filter(
    (reference) => reference.policy === 'unclassified_hard_delete_blocker',
  );

  if (Number(activeOwnedBinders) > 0) {
    return {
      decision: 'manual_binder_resolution_required',
      hard_delete_allowed: false,
      reason: 'Active or archived owned Binders must be transferred or deleted first.',
      retained_reference_count: retained.length,
      unclassified_reference_count: unclassified.length,
    };
  }
  if (unclassified.length > 0) {
    return {
      decision: 'policy_repair_required',
      hard_delete_allowed: false,
      reason: 'At least one populated hard-delete blocker has no approved policy.',
      retained_reference_count: retained.length,
      unclassified_reference_count: unclassified.length,
    };
  }
  if (retained.length > 0) {
    return {
      decision: 'soft_delete_and_anonymized_retention_required',
      hard_delete_allowed: false,
      reason: 'Required operational history prevents immediate hard deletion.',
      retained_reference_count: retained.length,
      unclassified_reference_count: 0,
    };
  }
  return {
    decision: 'hard_delete_allowed',
    hard_delete_allowed: true,
    reason: 'No retained or unclassified hard-delete blockers are populated.',
    retained_reference_count: 0,
    unclassified_reference_count: 0,
  };
}

export function canonicalPlanPayload(plan) {
  return {
    version: plan.version,
    policy_version: plan.policy_version,
    request_ticket_hash: plan.request_ticket_hash,
    target_fingerprint: plan.target_fingerprint,
    target_exists: plan.target_exists,
    target_soft_deleted: plan.target_soft_deleted,
    references: plan.references,
    storage: plan.storage,
    active_owned_binders: plan.active_owned_binders,
    decision: plan.decision,
    boundaries: plan.boundaries,
  };
}

export function planFingerprint(plan) {
  return sha256(JSON.stringify(canonicalPlanPayload(plan)));
}
