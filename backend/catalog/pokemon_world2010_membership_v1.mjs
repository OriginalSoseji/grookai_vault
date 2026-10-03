import assert from 'node:assert/strict';
import { DECKS } from './pokemon_world2010_relationship_review_v1.mjs';
import { assertWorld2010IdentityProjection, projectionHash, stageWorld2010IdentityArtifacts } from './pokemon_world2010_identity_projection_v1.mjs';

export const VERSION = 'POKEMON_WORLD2010_MEMBERSHIP_V1';
// Frozen from the source-replayed whole109 projection. A new adjudication needs
// a new policy; recomputing a payload's own hash cannot erase an existing hold.
const LOCKED = Object.freeze({
  'wcd2010-boltevoir': '080e4da3180c74591b31964280ad187cb087e7433defd7efa2d5f4510b4883a1',
  'wcd2010-luxchomp-of-the-spirit': '2bebe1546363d5b227063382743fc99477652a57b78f8f21a2dada1bf44ebbb1',
  'wcd2010-happy-luck': 'cdf36ad33d84b48c76ed7b1cdf88f40d167b01af5f1bd71a9a7fa1aa81f33ca8',
  'wcd2010-power-cottonweed': '24f38d2f52f31956ca78c5068f78d222980a7685c46faf1229c745efbcd4cedd',
});
const ordered = rows => [...rows].sort((a, b) => a.key.localeCompare(b.key));
const cardBinding = card => {
  const { relationship_review_fingerprint, ...stable } = card;
  return { key: card.key, card_number: card.card_number, card_name: card.card_name,
    parent_id: card.existing_parent.card_print_id, fact_sha256: projectionHash(stable) };
};

export function buildWorld2010MembershipProfiles(projection, inputs) {
  assertWorld2010IdentityProjection(projection, inputs);
  return projection.sets.map(set => {
    const deck = DECKS.find(d => d.code === set.key);
    const body = { version: VERSION, set_key: set.key, canonical_set_id: set.canonical_set_id,
      expected_identity_count: set.expected_identity_count, admitted_identity_count: set.admitted_identity_count,
      held_identity_count: set.held_identity_count, physical_deck_quantity: 60,
      coordinate_policy: set.coordinate_policy, whole_set_complete: false,
      admitted_members: ordered(projection.cards.filter(c => c.set_key === set.key).map(cardBinding)),
      held: structuredClone(projection.held.filter(h => h.deck === deck.deck)) };
    return { ...body, fingerprint: projectionHash(body) };
  });
}

export function assertWorld2010MembershipProfile(profile, setKey) {
  assert.ok(LOCKED[setKey], 'world_membership_unknown_deck');
  assert.ok(profile, 'world_membership_profile_required');
  const { fingerprint, ...body } = profile;
  assert.equal(profile.set_key, setKey, 'world_membership_deck_mismatch');
  assert.equal(projectionHash(body), fingerprint, 'world_membership_hash_mismatch');
  assert.equal(fingerprint, LOCKED[setKey], 'world_membership_frozen_scope_changed');
  return profile;
}

export function assertWorld2010MasterMembership({ setsArtifact, cardsArtifact, printingsArtifact }) {
  for (const deck of DECKS) {
    const sets = (setsArtifact.sets ?? []).filter(s => s.key === deck.code);
    const cards = (cardsArtifact.cards ?? []).filter(c => c.set_key === deck.code);
    const printings = (printingsArtifact.printings ?? []).filter(c => c.set_key === deck.code);
    if (!sets.length && !cards.length && !printings.length) continue;
    assert.equal(sets.length, 1, 'world_membership_unique_set_required');
    const set = sets[0], profile = assertWorld2010MembershipProfile(set.anthology_membership, deck.code);
    for (const field of ['canonical_set_id','expected_identity_count','admitted_identity_count','held_identity_count','physical_deck_quantity','coordinate_policy'])
      assert.deepEqual(set[field], profile[field], 'world_membership_set_field_changed:' + field);
    assert.equal(set.identity_model, 'reprint_anthology');
    assert.equal(set.printed_total, null, 'world_membership_is_not_printed_denominator');
    assert.equal(set.complete, false);
    assert.deepEqual(ordered(cards.map(cardBinding)), profile.admitted_members, 'world_membership_exact_admitted_facts_required');
    // Future printing admission is separate. It cannot introduce an unreviewed
    // identity or resolve one of this policy's held warehouse relationships.
    for (const printing of printings) assert.ok(profile.admitted_members.some(c =>
      c.card_number === printing.card_number && c.card_name === printing.card_name), 'world_printing_unreviewed_identity');
  }
}

export function stageWorld2010MembershipArtifacts(projection, inputs) {
  const staged = stageWorld2010IdentityArtifacts(projection, inputs);
  const profiles = buildWorld2010MembershipProfiles(projection, inputs);
  for (const profile of profiles) staged.setsArtifact.sets.find(s => s.key === profile.set_key).anthology_membership = profile;
  assertWorld2010MasterMembership(staged);
  return staged;
}

// Publication reads a derived matrix, so it must verify the profile itself,
// independently of an upstream completion-status string.
export function world2010MembershipForPublication(set) {
  if (!LOCKED[set.set_key]) return null;
  const profile = assertWorld2010MembershipProfile(set.anthology_membership, set.set_key);
  assert.equal(set.card_identity.total_working_facts, profile.admitted_identity_count);
  assert.equal(set.card_identity.master_admissible, profile.admitted_identity_count);
  assert.equal(set.card_identity.expected_membership, profile.expected_identity_count);
  assert.equal(set.card_identity.held_membership, profile.held_identity_count);
  return profile;
}
