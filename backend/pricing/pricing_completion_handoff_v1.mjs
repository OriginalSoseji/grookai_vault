/**
 * Data-only bridge to existing reviewed maintenance, NOT a new executor.
 * No artifact path, command, SQL, environment variable or worker-provided adapter
 * is loaded or executed. This module does not import the side-effectful existing
 * maintenance/publisher entrypoints.
 *
 * Two separately trusted controller capabilities are mandatory. The authority
 * verifier must authenticate actual founder approval and run the existing
 * authority/selection/source gates against the bound bytes. The reservation
 * capability must atomically, durably reserve ALL replay keys (fail if any was
 * previously reserved, applied, uncertain or consumed). Their labels/hashes are
 * not authentication. Never install worker callbacks that echo input objects.
 * A crash after reservation is an operator reconciliation case, not a replay.
 */
import { createHash } from 'node:crypto';
import { pricingCompletionDigestV1, pricingCompletionKeyV1 } from './pricing_completion_queue_v1.mjs';

export const PRICING_COMPLETION_HANDOFF_V1 = 'PRICING_COMPLETION_HANDOFF_V1';
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX_AGE_MS = 36 * 60 * 60 * 1000;
const SUBTYPES = new Set(['Normal', 'Holofoil', 'Reverse Holofoil']);
const GATES = Object.freeze([
  'selectTcgplayerExactMappingApplyBatchV1',
  'assertMasterMappingBatchAuthority',
  'clean_producing_commit_and_plan_ancestry',
  'fresh_source_target_canary_and_publication_exclusion_readback',
  'explicit_founder_approval_for_exact_insert_scope',
]);
const ADAPTERS = Object.freeze({
  mapping: Object.freeze({
    id: 'TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_V1',
    launcher: 'backend/maintenance/run_canon_maintenance_v1.mjs',
    entrypoint: 'backend/maintenance/tcgplayer_market_exact_mapping_apply_v1.mjs',
    policy: 'TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_POLICY_V1_1',
    maxMappings: 25, operation: 'insert_existing_parent_mappings',
  }),
  publication: Object.freeze({
    id: 'TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_12',
    entrypoint: 'scripts/workers/tcgplayer_market_publication_worker_v1.mjs',
    separatelyGuarded: true, authorizedByThisHandoff: false,
  }),
  readback: Object.freeze({ id: 'get_market_pricing_read_model_v1', exactPrintingRequired: true }),
});
const ARTIFACT_FIELDS = ['candidatesJsonl', 'summaryJson', 'runPlanJson', 'masterAuthorityJson'];
const CONTEXT_FIELDS = ['producingCommit', 'planCommit', 'sourceRunId', 'sourceSyncRunId', 'sourceObservedAt', 'targetProjectRef'];
const ATT_FIELDS = ['version', 'authorizationId', 'bindingDigest', 'executionApprovalDigest', 'reviewDigest',
  'approvedAt', 'expiresAt', 'approverPrincipal', 'verifierPrincipal', 'validatedGateIds'];
function assert(ok, message) { if (!ok) throw new Error(`pricing_completion_handoff:${message}`); }
function plain(value, keys, name) {
  assert(value && Object.getPrototypeOf(value) === Object.prototype, `${name}_object_required`);
  assert(Object.keys(value).every(key => keys.includes(key)), `${name}_unexpected_field`);
  assert(keys.every(key => Object.hasOwn(value, key)), `${name}_missing_field`);
}
function text(value) { assert(typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 1000, 'exact_text_required'); return value; }
function timestamp(value, name) { assert(Number.isSafeInteger(value) && value >= 0, `${name}_invalid`); return value; }
function digestBytes(value) { return createHash('sha256').update(value).digest('hex'); }
function exactValues(left, right, label) { assert(pricingCompletionDigestV1(left) === pricingCompletionDigestV1(right), label); }
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function clone(value) { pricingCompletionDigestV1(value); return JSON.parse(JSON.stringify(value)); }
function parseArtifacts(artifacts) {
  plain(artifacts, ARTIFACT_FIELDS, 'artifacts');
  const hashes = {};
  for (const field of ARTIFACT_FIELDS) {
    assert(typeof artifacts[field] === 'string' && Buffer.byteLength(artifacts[field]) <= 32 * 1024 * 1024, 'invalid_artifact_bytes');
    hashes[field] = digestBytes(artifacts[field]);
  }
  const candidates = artifacts.candidatesJsonl.split(/\r?\n/).filter(row => row.trim()).map(row => JSON.parse(row));
  assert(candidates.length > 0 && candidates.length <= 25, 'mapping_batch_limit_1_to_25');
  return { candidates, summary: JSON.parse(artifacts.summaryJson), runPlan: JSON.parse(artifacts.runPlanJson),
    masterAuthority: JSON.parse(artifacts.masterAuthorityJson), hashes };
}

function buildBinding({ items, artifacts, context, now }) {
  timestamp(now, 'now'); plain(context, CONTEXT_FIELDS, 'context');
  assert(COMMIT.test(context.producingCommit) && COMMIT.test(context.planCommit), 'commit_binding_required');
  assert(UUID.test(context.sourceRunId) && UUID.test(context.sourceSyncRunId), 'source_run_binding_required');
  assert(context.targetProjectRef === 'ycdxbpibncqcchqiihfz', 'target_project_not_governed_production');
  timestamp(context.sourceObservedAt, 'sourceObservedAt');
  assert(now >= context.sourceObservedAt && now - context.sourceObservedAt <= MAX_AGE_MS, 'source_stale_or_future');
  const { candidates, summary, runPlan, masterAuthority, hashes } = parseArtifacts(artifacts);
  assert(summary.status === 'passed' && summary.counts?.candidates === candidates.length, 'plan_summary_not_reconciled');
  assert(runPlan.mode === 'read_only_dry_run' && runPlan.tracked_worktree_clean === true
    && runPlan.commit_sha === context.planCommit && runPlan.source_sync_run_id === context.sourceSyncRunId, 'plan_source_binding_mismatch');
  assert(masterAuthority.version === 'MASTER_INDEX_MAPPING_AUTHORITY_V1'
    && masterAuthority.purpose === 'evidence_binding_not_execution_authorization', 'wrong_master_authority_kind');
  const { fingerprint, ...authorityBody } = masterAuthority;
  assert(SHA.test(fingerprint) && fingerprint === pricingCompletionDigestV1(authorityBody), 'master_authority_fingerprint_mismatch');
  assert(Array.isArray(masterAuthority.scopes) && masterAuthority.scopes.length > 0, 'reviewed_master_scopes_required');
  for (const scope of masterAuthority.scopes) assert(scope.manifest?.game === 'pokemon'
    && scope.manifest?.language === 'en' && scope.manifest?.identity_policy_version === 'POKEMON_EN_PHYSICAL_V1', 'unsupported_master_scope');

  assert(Array.isArray(items) && items.length > 0 && items.length <= 75, 'bounded_queue_items_required');
  const candidateProducts = new Set(), candidateTargets = new Set(), allObservations = new Set();
  for (const candidate of candidates) {
    const { candidate_fingerprint: candidateHash, ...body } = candidate;
    assert(SHA.test(candidateHash) && candidateHash === pricingCompletionDigestV1(body), 'candidate_fingerprint_mismatch');
    assert(candidate.policy_version === 'TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_2'
      && candidate.disposition === 'candidate', 'candidate_policy_or_disposition_unsupported');
    assert(Number.isSafeInteger(candidate.source_product_id) && candidate.source_product_id > 0, 'candidate_product_invalid');
    assert(!candidateProducts.has(candidate.source_product_id), 'duplicate_candidate_product'); candidateProducts.add(candidate.source_product_id);
    assert(UUID.test(candidate.target?.card_print_id) && UUID.test(candidate.target?.set_id), 'existing_parent_target_required');
    assert(!candidateTargets.has(candidate.target.card_print_id), 'duplicate_candidate_target'); candidateTargets.add(candidate.target.card_print_id);
    assert(candidate.target.variant_key === '' && candidate.target.active_standard_identity_count === 1
      && candidate.target.active_tcgplayer_mapping_count === 0, 'only_unmapped_existing_base_parent_inserts_supported');
    assert(Number.isFinite(candidate.mapping_confidence) && candidate.mapping_confidence >= 0.99
      && candidate.mapping_confidence <= 1, 'mapping_confidence_below_floor');
    assert(Array.isArray(candidate.source_subtypes) && candidate.source_subtypes.length > 0
      && candidate.source_subtypes.every(subtype => SUBTYPES.has(subtype)), 'unsupported_candidate_subtype');
    assert(Array.isArray(candidate.supporting_gap_observation_ids) && candidate.supporting_gap_observation_ids.length > 0
      && candidate.supporting_gap_row_count === candidate.supporting_gap_observation_ids.length, 'candidate_observation_binding_required');
    for (const id of candidate.supporting_gap_observation_ids) {
      assert(UUID.test(id) && !allObservations.has(id), 'invalid_or_duplicate_supporting_observation'); allObservations.add(id);
    }
  }
  exactValues(masterAuthority.candidate_fingerprints, candidates.map(row => row.candidate_fingerprint).sort(), 'master_authority_selection_mismatch');
  const keys = new Set(), observations = new Set();
  const projected = items.map(item => {
    assert(item.key === pricingCompletionKeyV1(item.identity) && !keys.has(item.key), 'item_identity_key_mismatch_or_duplicate'); keys.add(item.key);
    assert(item.state === 'review_needed' && item.reason === 'missing_active_source_mapping', 'item_not_reviewed_mapping_gap');
    const identity = item.identity;
    assert(identity.kind === 'source' && identity.provider === 'tcgplayer' && identity.category === '3'
      && identity.currency === 'USD' && identity.condition === 'NOT_CONDITION_SPECIFIC'
      && SUBTYPES.has(identity.subtype), 'unsupported_or_unknown_identity_dimensions');
    assert(item.sourceRunId === context.sourceRunId && Number.isSafeInteger(item.generation) && item.generation > 0, 'item_source_generation_mismatch');
    assert(item.sourceDigest === pricingCompletionDigestV1(item.evidence), 'item_evidence_digest_mismatch');
    assert(item.evidence.priceBasis === 'TCGPLAYER_MARKET' && item.evidence.identityDimensionsVerified === true
      && item.evidence.sourceSyncRunId === context.sourceSyncRunId, 'item_source_basis_not_verified');
    assert(item.evidence.productScopeResult === 'in_scope', 'unsupported_or_unqualified_product_scope');
    const observed = Date.parse(item.evidence.sourceFinishedAt);
    assert(Number.isFinite(observed) && observed === context.sourceObservedAt, 'item_source_time_mismatch');
    const observationId = item.evidence.sourceObservationId;
    assert(UUID.test(observationId) && !observations.has(observationId), 'item_observation_duplicate_or_missing'); observations.add(observationId);
    const candidate = candidates.find(row => String(row.source_product_id) === identity.productId);
    assert(candidate && candidate.source_subtypes.includes(identity.subtype)
      && candidate.supporting_gap_observation_ids.includes(observationId), 'item_not_bound_to_exact_candidate');
    return { key: item.key, identity: clone(identity), sourceDigest: item.sourceDigest, sourceRunId: item.sourceRunId,
      generation: item.generation, observationId, candidateFingerprint: candidate.candidate_fingerprint,
      targetCardPrintId: candidate.target.card_print_id, targetSetId: candidate.target.set_id };
  }).sort((a, b) => a.key.localeCompare(b.key));
  exactValues([...observations].sort(), [...allObservations].sort(), 'queue_and_plan_observation_scope_mismatch');
  assert(new Set(projected.map(row => row.candidateFingerprint)).size === candidates.length, 'unused_mapping_candidate');
  for (const candidate of candidates) exactValues([...new Set(candidate.source_subtypes)].sort(),
    [...new Set(projected.filter(item => item.candidateFingerprint === candidate.candidate_fingerprint)
      .map(item => item.identity.subtype))].sort(), 'candidate_subtype_scope_mismatch');
  return { version: PRICING_COMPLETION_HANDOFF_V1, operation: ADAPTERS.mapping.operation,
    context: clone(context), artifactHashes: hashes, authorityFingerprint: fingerprint,
    mappingCount: candidates.length, itemCount: projected.length, items: projected,
    candidateFingerprints: candidates.map(row => row.candidate_fingerprint).sort(),
    requiredGateIds: [...GATES] };
}

export function createPricingCompletionHandoffV1({ verifyReviewedAuthority, reserveIntent } = {}) {
  return Object.freeze({
    prepare({ items, artifacts, reviewEvidence, context, now = Date.now() }) {
      assert(typeof verifyReviewedAuthority === 'function', 'trusted_review_verifier_required');
      assert(typeof reserveIntent === 'function', 'durable_one_use_reservation_required');
      const binding = buildBinding({ items, artifacts, context, now });
      const bindingDigest = pricingCompletionDigestV1(binding);
      const attestation = clone(verifyReviewedAuthority({ binding: clone(binding), artifacts: clone(artifacts),
        reviewEvidence: clone(reviewEvidence), now }));
      plain(attestation, ATT_FIELDS, 'review_attestation');
      assert(attestation.version === 'PRICING_COMPLETION_REVIEW_ATTESTATION_V1'
        && attestation.bindingDigest === bindingDigest, 'review_binding_mismatch');
      text(attestation.authorizationId); text(attestation.approverPrincipal); text(attestation.verifierPrincipal);
      assert(attestation.approverPrincipal !== attestation.verifierPrincipal, 'independent_review_authentication_required');
      assert(SHA.test(attestation.executionApprovalDigest) && SHA.test(attestation.reviewDigest), 'authenticated_review_evidence_required');
      timestamp(attestation.approvedAt, 'approvedAt'); timestamp(attestation.expiresAt, 'expiresAt');
      assert(attestation.approvedAt <= now && attestation.expiresAt > now
        && attestation.expiresAt - attestation.approvedAt <= MAX_AGE_MS, 'review_expired_or_future');
      exactValues(attestation.validatedGateIds, [...GATES], 'existing_executor_gates_not_attested');
      // Product/target replay keys intentionally exclude approval IDs, timestamps,
      // generation and hashes: changing labels or reserializing a plan must not
      // enable a second mapping insert. Ledger recovery requires live readback.
      const replayKeys = [...new Set(binding.items.flatMap(item => [
        `mapping-source:${pricingCompletionDigestV1({ project: context.targetProjectRef,
          provider: item.identity.provider, category: item.identity.category, productId: item.identity.productId })}`,
        `mapping-target:${pricingCompletionDigestV1({ project: context.targetProjectRef,
          provider: item.identity.provider, targetCardPrintId: item.targetCardPrintId })}`,
      ]))].sort();
      const intentId = `pricing-handoff:${pricingCompletionDigestV1({ bindingDigest, authorizationId: attestation.authorizationId })}`;
      const reservation = clone(reserveIntent({ intentId, bindingDigest, replayKeys: [...replayKeys],
        authorizationId: attestation.authorizationId, now }));
      plain(reservation, ['intentId', 'bindingDigest', 'replayKeys', 'state', 'reservationId'], 'reservation');
      assert(reservation.intentId === intentId && reservation.bindingDigest === bindingDigest
        && reservation.state === 'reserved', 'replay_or_reservation_not_acquired');
      exactValues(reservation.replayKeys, replayKeys, 'replay_scope_not_reserved'); text(reservation.reservationId);
      return freeze({ version: PRICING_COMPLETION_HANDOFF_V1, intentId, bindingDigest,
        state: 'reserved_for_guarded_mapping_adapter', binding, attestation, reservation,
        adapters: clone(ADAPTERS), executionEnabled: false, automaticRetryAllowed: false,
        productionWrites: 0, queueResolutionAllowed: false,
        nextRequiredStage: 'existing_guarded_mapping_dry_run_and_explicit_apply_revalidation',
        afterMappingApplied: 'independent_mapping_readback_then_separately_guarded_pricing_publication',
        completionRule: 'Only the queue trusted independent publication and application-read verifier may resolve a pricing item.' });
    },
  });
}

/** Classifies already independently authenticated milestones; never closes work. */
export function pricingCompletionHandoffNextStageV1(stage) {
  const next = {
    mapping_applied: 'independent_mapping_readback_required',
    mapping_readback_verified: 'guarded_pricing_shadow_reconciliation_and_publication_required',
    price_published: 'independent_exact_application_price_read_required',
    price_read_verified: 'submit_bound_evidence_to_queue_trusted_verifier',
    commit_uncertain: 'stop_and_reconcile_no_automatic_replay',
  };
  assert(Object.hasOwn(next, stage), 'unsupported_handoff_stage');
  return freeze({ stage, nextStage: next[stage], queueResolutionAllowed: false, automaticReplayAllowed: false });
}
