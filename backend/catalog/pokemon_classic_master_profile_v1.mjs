import assert from 'node:assert/strict';
import { DECKS, sha256 } from './pokemon_classic_identity_evidence_v1.mjs';

export const CLASSIC_SCOPE = 'standard_english_deck_cards_only';
const digest = x => sha256(JSON.stringify(x));
const fact = p => ({ set_key: p.set_key, card_number: p.card_number, card_name: p.card_name, finish_key: p.finish_key });
// Frozen projection hashes from the replayed October 2 whole102 source package.
// Review/media hashes remain evidence-specific; physical identities do not.
const EXACT_FACT_HASHES = Object.freeze({
  'classic-clv': 'c7c7e54325fe912e65f526ec8ce4fd0ea9e9a010cd501aabfd6586f0d96d9288',
  'classic-clc': 'e5286aef84d0bcda71c6e567aca36ac8a531b30afc45dcf127b4487cef81c1c3',
  'classic-clb': '956ab8bf49a3e76f30290a81e33f80533cc296da7f876c2178bd6de0b250be51',
});

// Invoked by the ordinary completion builder too: copying staged facts without
// their bounded profile must never turn them into whole-product completion.
export function assertClassicMasterProfiles({ setsArtifact, cardsArtifact, printingsArtifact }) {
  for (const deck of DECKS) {
    const rows = printingsArtifact.printings.filter(p => p.set_key === deck.set_key);
    const sets = setsArtifact.sets.filter(s => s.key === deck.set_key);
    if (!rows.length && !sets.some(s => s.finish_profile)) continue; // identity-only stage
    assert.equal(sets.length, 1, 'classic_unique_set_configuration_required');
    const set = sets[0], profile = set.finish_profile;
    assert.ok(profile, 'classic_locked_finish_profile_required');
    assert.equal(set.completion_scope, CLASSIC_SCOPE, 'classic_bounded_completion_scope_required');
    assert.equal(set.whole_product_complete, false);
    assert.equal(profile.version, 'POKEMON_CLASSIC_FINISH_EVIDENCE_V1');
    assert.equal(profile.scope, CLASSIC_SCOPE);
    assert.equal(profile.set_key, deck.set_key); assert.equal(profile.printed_deck_code, deck.printed_code);
    assert.equal(profile.parents, 34); assert.equal(profile.printings, 34);
    assert.deepEqual(profile.finish_counts, { holo: 34 });
    assert.deepEqual(profile.conflicts, []); assert.deepEqual(profile.forbidden_facts, []);
    assert.deepEqual(profile.finish_absence_claims, []);
    assert.match(profile.review_sha256, /^[a-f0-9]{64}$/);
    assert.equal(rows.length, 34, 'classic_exact34_printings_required');
    assert.ok(rows.every(p => p.status === 'master_verified' && p.source_count >= 2 && p.finish_key === 'holo'
      && p.source_kinds.includes('marketplace_checklist') && p.source_kinds.includes('collector_reference')), 'classic_exact_finish_evidence_required');
    const facts = rows.map(fact).sort((a, b) => a.card_number.localeCompare(b.card_number));
    assert.deepEqual(facts.map(p => p.card_number), Array.from({ length: 34 }, (_, i) => String(i + 1).padStart(3, '0')), 'classic_exact_coordinates_required');
    assert.deepEqual(facts, profile.exact_facts, 'classic_exact_profile_mismatch');
    assert.equal(digest(facts), profile.exact_facts_sha256, 'classic_profile_hash_mismatch');
    assert.equal(digest(facts), EXACT_FACT_HASHES[deck.set_key], 'classic_frozen_exact_facts_changed');
    assert.deepEqual(profile.protected_facts, facts, 'classic_protected_facts_mismatch');
    const cards = cardsArtifact.cards.filter(p => p.set_key === deck.set_key);
    assert.equal(cards.length, 34);
    assert.deepEqual(cards.map(p => fact({ ...p, finish_key: 'holo' })).sort((a, b) => a.card_number.localeCompare(b.card_number)), facts, 'classic_parent_printing_identity_mismatch');
    assert.deepEqual(set.outside_scope_reviews, profile.outside_scope_reviews, 'classic_outside_scope_reviews_changed');
    assert.equal(profile.outside_scope_reviews.length, deck.printed_code === 'CLV' ? 1 : 0, 'classic_outside_scope_review_missing');
    if (deck.printed_code === 'CLV') {
      const held = profile.outside_scope_reviews[0];
      assert.equal(held.resolved, false); assert.equal(held.deck_code, 'CLV'); assert.equal(held.number, '017');
      assert.equal(held.raw_name, 'Lugia ex'); assert.equal(held.raw_variant, 'Jumbo');
      assert.equal(held.status, 'outside_standard_deck_scope_review_required');
      assert.match(held.source_sha256, /^[a-f0-9]{64}$/); assert.ok(held.source_url && held.reason);
    }
  }
}
