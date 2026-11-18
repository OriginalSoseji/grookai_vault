import { assert, boundedArray, digest, text } from './common.mjs';

export const DECKLIST_USAGE_BASIS = 'published_tournament_decklists_v1';
export const VERIFIED_CARD_LINES = 'verified_card_lines_v1';
export const usesPublishedDecklists = policy => ['pokemon_playables_policy:v2','pokemon_playables_policy:v3'].includes(policy?.version) && policy.evidence_basis === DECKLIST_USAGE_BASIS;
export const usesVerifiedCardLines = policy => policy?.version === 'pokemon_playables_policy:v3' && policy.deck_resolution === VERIFIED_CARD_LINES;

export function validatePolicy(policy) {
  assert(['pokemon_playables_policy:v1', 'pokemon_playables_policy:v2','pokemon_playables_policy:v3'].includes(policy?.version), 'POLICY_VERSION');
  if (policy.version !== 'pokemon_playables_policy:v1') assert(usesPublishedDecklists(policy), 'POLICY_DECKLIST_BASIS_REQUIRED');
  else assert(policy.evidence_basis === undefined, 'POLICY_EVIDENCE_BASIS_REQUIRES_V2');
  if(policy.version==='pokemon_playables_policy:v3')assert(usesVerifiedCardLines(policy)&&policy.minimum_resolved_decks===undefined,'POLICY_PARTIAL_RESOLUTION_REQUIRED');
  else assert(policy.deck_resolution===undefined&&policy.minimum_contributing_decks===undefined,'POLICY_PARTIAL_RESOLUTION_REQUIRES_V3');
  assert(['shadow_candidate', 'approved'].includes(policy.release_state), 'POLICY_RELEASE_STATE');
  assert(policy.window_days === 30, 'POLICY_WINDOW_MUST_BE_30_DAYS');
  assert(policy.scope?.game === 'pokemon' && policy.scope.format === 'standard' &&
    policy.scope.language === 'en' && policy.scope.identity_domain === 'pokemon_eng_standard' && policy.scope.platform === 'paper', 'POLICY_SCOPE');
  boundedArray(policy.reviewers, 100).forEach(value => text(value));
  assert(new Set(policy.reviewers).size === policy.reviewers.length, 'POLICY_DUPLICATE_REVIEWER');
  const deckFloor=usesVerifiedCardLines(policy)?'minimum_contributing_decks':'minimum_resolved_decks';
  for (const key of ['publication_max_age_hours', 'legality_max_age_hours', 'minimum_events', deckFloor, 'minimum_card_events', 'minimum_card_decks', 'maximum_events', 'maximum_decks_per_event', 'maximum_groups', 'maximum_receipt_bytes']) {
    assert(Number.isInteger(policy[key]) && policy[key] > 0, 'POLICY_POSITIVE_INTEGER_REQUIRED', key);
  }
  assert(policy.publication_max_age_hours <= 24 && policy.legality_max_age_hours <= 24, 'POLICY_FRESHNESS_LIMIT');
  assert(policy.maximum_events <= 10000 && policy.maximum_groups <= 20000 && policy.maximum_decks_per_event <= 20000 && policy.maximum_receipt_bytes <= 32 * 1024 * 1024, 'POLICY_RESOURCE_BOUND');
  assert(policy.minimum_card_events >= 2 && policy.minimum_card_decks >= 2, 'POLICY_INDEPENDENT_SUPPORT_REQUIRED');
  assert(policy.minimum_events >= policy.minimum_card_events && policy[deckFloor] >= policy.minimum_card_decks, 'POLICY_COVERAGE_THRESHOLDS');
  boundedArray(policy.allowed_populations, 3).forEach(value => assert(['full_field', 'top_cut', 'published_subset'].includes(value), 'POLICY_POPULATION'));
  assert(policy.allowed_populations.length > 0, 'POLICY_POPULATION');
  if (policy.release_state === 'approved') {
    assert(policy.reviewers.length > 0 && policy.calibration?.status === 'approved', 'POLICY_CALIBRATION_REQUIRED');
    assert(policy.reviewers.includes(policy.calibration.reviewed_by), 'POLICY_REVIEWER_REQUIRED');
    text(policy.calibration.sample_artifact, 'POLICY_SAMPLE_ARTIFACT_REQUIRED', 1000);
    text(policy.calibration.basis, 'POLICY_CALIBRATION_BASIS_REQUIRED', 4000);
    if(usesVerifiedCardLines(policy))assert(policy.calibration.partial_coverage_reviewed===true,'POLICY_PARTIAL_COVERAGE_REVIEW_REQUIRED');
  }
  return digest(policy);
}
