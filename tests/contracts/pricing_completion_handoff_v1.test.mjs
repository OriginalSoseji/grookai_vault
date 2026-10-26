import test from 'node:test';
import assert from 'node:assert/strict';
import { createPricingCompletionHandoffV1, pricingCompletionHandoffNextStageV1 } from '../../backend/pricing/pricing_completion_handoff_v1.mjs';
import { pricingCompletionDigestV1 as digest, pricingCompletionKeyV1 as key } from '../../backend/pricing/pricing_completion_queue_v1.mjs';

const NOW = Date.parse('2026-10-14T12:00:00.000Z');
const ID = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const copy = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const evidence = { priceBasis: 'TCGPLAYER_MARKET', physicalConditionVerified: false,
    identityDimensionsVerified: true, productScopeResult: 'in_scope',
    sourceSyncRunId: ID(1), sourceObservationId: ID(2),
    sourceFinishedAt: new Date(NOW - 1000).toISOString() };
  const identity = { kind: 'source', provider: 'tcgplayer', category: '3', productId: '123',
    subtype: 'Holofoil', currency: 'USD', condition: 'NOT_CONDITION_SPECIFIC' };
  const item = { key: key(identity), identity, state: 'review_needed', reason: 'missing_active_source_mapping',
    generation: 1, sourceRunId: ID(3), sourceDigest: digest(evidence), evidence };
  const candidate = { policy_version: 'TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_3',
    disposition: 'candidate', source_product_id: 123, source_product_name: 'Reviewed card',
    printed_number: '1', normalized_source_name: 'reviewed card', normalized_source_number: '1',
    mapping_method: 'exact_group_set_number_name_consensus_v1', mapping_confidence: 0.99,
    source_subtypes: ['Holofoil'], supporting_gap_observation_ids: [ID(2)], supporting_gap_row_count: 1,
    target: { card_print_id: ID(4), set_id: ID(5), gv_id: 'GV-PK-TEST-1', set_code: 'test',
      canonical_name: 'Reviewed card', canonical_number: '1', variant_key: '',
      active_standard_identity_count: 1, active_tcgplayer_mapping_count: 0 } };
  candidate.candidate_fingerprint = digest(candidate);
  // Deliberately synthetic gate evidence. Real controllers must run the existing
  // authority validator with actual bound source bytes and authenticate approval.
  const authority = { version: 'MASTER_INDEX_MAPPING_AUTHORITY_V1',
    purpose: 'evidence_binding_not_execution_authorization', candidate_fingerprints: [candidate.candidate_fingerprint],
    scopes: [{ manifest: { game: 'pokemon', language: 'en', identity_policy_version: 'POKEMON_EN_PHYSICAL_V1' } }] };
  authority.fingerprint = digest(authority);
  return { items: [item], artifacts: {
    candidatesJsonl: JSON.stringify(candidate) + '\n',
    summaryJson: JSON.stringify({ status: 'passed', counts: { candidates: 1 } }),
    runPlanJson: JSON.stringify({ mode: 'read_only_dry_run', tracked_worktree_clean: true,
      commit_sha: 'a'.repeat(40), source_sync_run_id: ID(1) }),
    masterAuthorityJson: JSON.stringify(authority),
  }, context: { producingCommit: 'b'.repeat(40), planCommit: 'a'.repeat(40), sourceRunId: ID(3),
    sourceSyncRunId: ID(1), sourceObservedAt: NOW - 1000, targetProjectRef: 'ycdxbpibncqcchqiihfz' },
  reviewEvidence: { opaqueReviewId: 'review-source-1' }, now: NOW };
}
function verifier({ binding, now }) {
  return { version: 'PRICING_COMPLETION_REVIEW_ATTESTATION_V1', authorizationId: 'founder-authorization-1',
    bindingDigest: digest(binding), executionApprovalDigest: 'c'.repeat(64), reviewDigest: 'd'.repeat(64),
    approvedAt: now - 100, expiresAt: now + 1000, approverPrincipal: 'founder',
    verifierPrincipal: 'independent-review-controller', validatedGateIds: [...binding.requiredGateIds] };
}
function controller(verifyReviewedAuthority = verifier) {
  const heldKeys = new Set();
  let calls = 0;
  const reserveIntent = ({ intentId, bindingDigest, replayKeys }) => {
    calls++;
    if (replayKeys.some(value => heldKeys.has(value))) throw new Error('durable_intent_already_reserved');
    replayKeys.forEach(value => heldKeys.add(value));
    return { intentId, bindingDigest, replayKeys, state: 'reserved', reservationId: `reservation-${calls}` };
  };
  return { handoff: createPricingCompletionHandoffV1({ verifyReviewedAuthority, reserveIntent }),
    heldKeys, calls: () => calls, reserveIntent };
}
function changeItem(f, mutate) {
  mutate(f.items[0]);
  f.items[0].key = key(f.items[0].identity);
  f.items[0].sourceDigest = digest(f.items[0].evidence);
}
function changeCandidate(f, mutate) {
  const candidate = JSON.parse(f.artifacts.candidatesJsonl);
  mutate(candidate); delete candidate.candidate_fingerprint; candidate.candidate_fingerprint = digest(candidate);
  f.artifacts.candidatesJsonl = JSON.stringify(candidate) + '\n';
  const authority = JSON.parse(f.artifacts.masterAuthorityJson);
  authority.candidate_fingerprints = [candidate.candidate_fingerprint];
  delete authority.fingerprint; authority.fingerprint = digest(authority);
  f.artifacts.masterAuthorityJson = JSON.stringify(authority);
}

test('handoff freezes exact reviewed scope and fixed adapters without execution or closure', () => {
  const c = controller(), f = fixture();
  const before = copy(f);
  const result = c.handoff.prepare(f);
  assert.equal(result.executionEnabled, false);
  assert.equal(result.queueResolutionAllowed, false);
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.productionWrites, 0);
  assert.equal(result.binding.mappingCount, 1);
  assert.equal(result.binding.items[0].sourceDigest, f.items[0].sourceDigest);
  assert.equal(result.adapters.mapping.maxMappings, 25);
  assert.equal(result.adapters.mapping.launcher, 'backend/maintenance/run_canon_maintenance_v1.mjs');
  assert.equal(result.adapters.publication.authorizedByThisHandoff, false);
  assert.equal(c.calls(), 1);
  assert.equal(c.heldKeys.size, 2);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.binding.items[0].identity));
  assert.throws(() => { result.adapters.mapping.entrypoint = 'untrusted.mjs'; }, TypeError);
  assert.deepEqual(f, before);
});

test('missing trusted authority or durable reservation capability blocks before admission', () => {
  assert.throws(() => createPricingCompletionHandoffV1().prepare(fixture()), /trusted_review_verifier_required/);
  assert.throws(() => createPricingCompletionHandoffV1({ verifyReviewedAuthority: verifier }).prepare(fixture()), /durable_one_use_reservation_required/);
});

test('untrusted success booleans cannot substitute for authenticated bound review', () => {
  const c = controller(() => ({ approved: true, verified: true }));
  assert.throws(() => c.handoff.prepare(fixture()), /review_attestation_/);
  assert.equal(c.calls(), 0);
});

test('source staleness, future observations and stale review are rejected', () => {
  for (const sourceObservedAt of [NOW - 36 * 3600000 - 1, NOW + 1]) {
    const f = fixture(); f.context.sourceObservedAt = sourceObservedAt;
    assert.throws(() => controller().handoff.prepare(f), /source_stale_or_future/);
  }
  const c = controller(args => ({ ...verifier(args), expiresAt: args.now }));
  assert.throws(() => c.handoff.prepare(fixture()), /review_expired_or_future/);
  assert.equal(c.calls(), 0);
});

test('unknown dimensions, other games, unsupported products and alternate reasons never route to mapping insert', () => {
  const mutations = [
    item => { item.identity.condition = 'UNKNOWN'; },
    item => { item.identity.currency = 'XXX'; },
    item => { item.identity.category = '1'; },
    item => { item.identity.subtype = '1st Edition'; },
    item => { item.reason = 'special_variant_v1_1'; },
    item => { item.evidence.productScopeResult = 'unsupported_product_kind'; },
    item => { item.evidence.priceBasis = 'EBAY_ASK'; },
    item => { item.evidence.identityDimensionsVerified = false; },
  ];
  for (const mutation of mutations) {
    const f = fixture(); changeItem(f, mutation);
    const c = controller(); assert.throws(() => c.handoff.prepare(f)); assert.equal(c.calls(), 0);
  }
});

test('candidate edits and reviewed artifact byte drift invalidate frozen authority binding', () => {
  const f = fixture();
  let approvedDigest;
  const c = controller(args => {
    approvedDigest ??= digest(args.binding);
    return { ...verifier(args), bindingDigest: approvedDigest };
  });
  c.handoff.prepare(f);
  f.artifacts.summaryJson += '\n';
  assert.throws(() => c.handoff.prepare(f), /review_binding_mismatch/);
  const tampered = fixture();
  tampered.artifacts.candidatesJsonl = tampered.artifacts.candidatesJsonl.replace('Reviewed card', 'Changed card');
  assert.throws(() => controller().handoff.prepare(tampered), /candidate_fingerprint_mismatch/);
});

test('source observation, subtype, run and item count must exactly match the reviewed candidates', () => {
  for (const mutate of [
    f => changeItem(f, item => { item.evidence.sourceObservationId = ID(99); }),
    f => changeItem(f, item => { item.sourceRunId = ID(99); }),
    f => changeItem(f, item => { item.evidence.sourceSyncRunId = ID(99); }),
    f => changeItem(f, item => { item.evidence.sourceFinishedAt = new Date(NOW - 2000).toISOString(); }),
    f => changeCandidate(f, candidate => { candidate.source_subtypes.push('Normal'); }),
    f => { f.items.push(copy(f.items[0])); },
    f => { f.items[0].sourceDigest = '0'.repeat(64); },
  ]) {
    const f = fixture(); mutate(f); assert.throws(() => controller().handoff.prepare(f));
  }
});

test('inactive repairs, already-mapped targets, non-base variants and dirty plans fail closed', () => {
  for (const mutate of [
    f => changeCandidate(f, candidate => { candidate.policy_version = 'TCGPLAYER_MARKET_EXACT_MAPPING_PLAN_POLICY_V1_2'; }),
    f => changeCandidate(f, candidate => { candidate.target.active_tcgplayer_mapping_count = 1; }),
    f => changeCandidate(f, candidate => { candidate.target.variant_key = 'first_edition'; }),
    f => { f.artifacts.inactiveRepairAuthorityJson = '{}'; },
    f => { const plan = JSON.parse(f.artifacts.runPlanJson); plan.tracked_worktree_clean = false; f.artifacts.runPlanJson = JSON.stringify(plan); },
    f => { f.context.targetProjectRef = 'different-project'; },
  ]) {
    const f = fixture(); mutate(f); assert.throws(() => controller().handoff.prepare(f));
  }
});

test('all existing semantic/execution gates must be independently attested', () => {
  const c = controller(args => ({ ...verifier(args), validatedGateIds: args.binding.requiredGateIds.slice(1) }));
  assert.throws(() => c.handoff.prepare(fixture()), /existing_executor_gates_not_attested/);
  assert.equal(c.calls(), 0);
});

test('repeat reservation and relabeled approval cannot automatically replay the same mapping', () => {
  const c = controller(); const f = fixture();
  c.handoff.prepare(f);
  assert.throws(() => c.handoff.prepare(f), /already_reserved/);
  const relabeled = createPricingCompletionHandoffV1({
    verifyReviewedAuthority: args => ({ ...verifier(args), authorizationId: 'new-approval-label' }), reserveIntent: c.reserveIntent,
  });
  const changed = copy(f); changed.artifacts.summaryJson += '\n'; changed.items[0].generation = 2;
  assert.throws(() => relabeled.prepare(changed), /already_reserved/);
  changeCandidate(changed, candidate => { candidate.target.card_print_id = ID(55); });
  assert.throws(() => relabeled.prepare(changed), /already_reserved/);
});

test('uncertain or mismatched ledger responses fail closed', () => {
  for (const mutate of [
    result => ({ ...result, state: 'commit_uncertain' }),
    result => ({ ...result, bindingDigest: '0'.repeat(64) }),
    result => ({ ...result, replayKeys: [] }),
  ]) {
    const c = controller();
    const handoff = createPricingCompletionHandoffV1({ verifyReviewedAuthority: verifier,
      reserveIntent: args => mutate(c.reserveIntent(args)) });
    assert.throws(() => handoff.prepare(fixture()));
    assert.equal(c.heldKeys.size, 2, 'uncertain admission remains reserved until independent reconciliation');
  }
});

test('mapping applied and published are intermediate states and never close pricing items', () => {
  assert.equal(pricingCompletionHandoffNextStageV1('mapping_applied').nextStage, 'independent_mapping_readback_required');
  assert.equal(pricingCompletionHandoffNextStageV1('price_published').nextStage, 'independent_exact_application_price_read_required');
  const read = pricingCompletionHandoffNextStageV1('price_read_verified');
  assert.equal(read.queueResolutionAllowed, false);
  assert.equal(read.nextStage, 'submit_bound_evidence_to_queue_trusted_verifier');
  assert.equal(pricingCompletionHandoffNextStageV1('commit_uncertain').automaticReplayAllowed, false);
  assert.throws(() => pricingCompletionHandoffNextStageV1('complete'), /unsupported_handoff_stage/);
});
