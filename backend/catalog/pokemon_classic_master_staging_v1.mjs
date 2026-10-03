import assert from 'node:assert/strict';
import { DECKS, sha256, qualifyClassicIdentities } from './pokemon_classic_identity_evidence_v1.mjs';
import { buildArtifacts } from '../../scripts/audits/english_master_index_completion_v1_build.mjs';
import { setManifestRow } from '../../scripts/audits/english_master_index_publishable_v1_build.mjs';
import { assertMe04FinishTruthV1 } from '../../scripts/audits/me04_finish_truth_v1.mjs';

export const VERSION = 'POKEMON_CLASSIC_MASTER_STAGING_V1';
export const ARTIFACTS = Object.freeze({
  index: 'english_master_index_v1.json',
  setsArtifact: 'english_master_index_sets_v1.json',
  cardsArtifact: 'english_master_index_cards_v1.json',
  printingsArtifact: 'english_master_index_printings_v1.json',
  availabilityArtifact: 'english_master_index_source_availability_v1.json',
  manualReviewArtifact: 'english_master_index_manual_review_v1.json',
  conflictsArtifact: 'english_master_index_conflicts_v1.json',
  finishBlockerClosure: 'english_master_index_finish_blocker_closure_v1.json',
  suppressed: 'english_master_index_suppressed_structured_finish_candidates_v1.json',
});
const keys = new Set(DECKS.map(d => d.set_key));
const digest = value => sha256(JSON.stringify(value));
const countBy = (rows, field) => rows.reduce((counts, row) => {
  counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return counts;
}, {});

export function assertClassicStagePreservation(baseline, staged, identity) {
  assert.equal(staged.cardsArtifact.cards.length, baseline.cardsArtifact.cards.length + 102);
  assert.equal(digest(staged.cardsArtifact.cards.slice(0, -102)), digest(baseline.cardsArtifact.cards), 'prior_card_facts_changed');
  assert.equal(digest(staged.cardsArtifact.cards.slice(-102)), digest(identity.cards), 'classic_card_facts_changed');
  assert.equal(digest(staged.setsArtifact.sets.slice(0, -3)), digest(baseline.setsArtifact.sets), 'prior_sets_changed');
  assert.equal(staged.setsArtifact.sets.length, baseline.setsArtifact.sets.length + 3);
  assert.equal(digest(staged.availabilityArtifact.source_availability.slice(0, -6)), digest(baseline.availabilityArtifact.source_availability), 'prior_source_availability_changed');
  for (const name of ['printingsArtifact', 'manualReviewArtifact', 'conflictsArtifact', 'finishBlockerClosure', 'suppressed']) {
    assert.equal(digest(staged[name]), digest(baseline[name]), `protected_artifact_changed:${name}`);
  }
  assertMe04FinishTruthV1(staged.printingsArtifact.printings, 'Preserved Master ME04 locked profile');
}

export function stageClassicMaster({ baseline, sources, namespace, identityPackage }) {
  // Replay preserved source bytes, rather than trusting an editable candidate's
  // master_verified flags, fingerprint, or a claimed automated review signature.
  const identity = qualifyClassicIdentities({ sources, namespace });
  assert.deepEqual(identity, identityPackage, 'identity_package_source_replay_mismatch');
  assertMe04FinishTruthV1(baseline.printingsArtifact.printings, 'Baseline Master ME04 locked profile');
  for (const [name, field] of [['setsArtifact', 'sets'], ['cardsArtifact', 'cards'], ['printingsArtifact', 'printings'], ['availabilityArtifact', 'source_availability'], ['manualReviewArtifact', 'manual_review'], ['conflictsArtifact', 'conflicts']]) {
    assert.ok(Array.isArray(baseline[name][field]), `invalid_baseline:${name}`);
    assert.ok(baseline[name][field].every(row => !keys.has(String(row.set_key ?? row.key).toLowerCase())), `classic_scope_already_present:${name}`);
  }
  assert.equal(baseline.index.language, 'en');
  assert.equal(baseline.index.audit_only, true);
  const configurations = identity.sets.map(deck => ({
    key: deck.set_key, set_name: deck.set_name, printed_deck_code: deck.printed_code,
    printed_total: '034', expected_identity_count: 34, language: 'en',
    source_aliases: { pkmncards: `pokemon-trading-card-game-classic-${deck.slug}`, bulbapedia_set_list: `${deck.title} (English)` },
    source_status: { pkmncards: 'preserved', bulbapedia_set_list: 'preserved' },
    source_totals: { pkmncards: { total: 34 }, bulbapedia_set_list: { total: 34 } },
    finish_profile: null, finish_profile_status: 'not_qualified',
  }));
  const availability = identity.sets.flatMap(deck => ['pkmncards', 'bulbapedia_set_list'].map(source_key => ({
    set_key: deck.set_key, set_name: deck.set_name, source_key,
    source_alias: configurations.find(s => s.key === deck.set_key).source_aliases[source_key],
    configured_status: 'preserved', runtime_status: 'collected', evidence_rows: 34, error: null,
  })));
  const staged = {
    ...baseline,
    setsArtifact: { ...baseline.setsArtifact, sets: [...baseline.setsArtifact.sets, ...configurations] },
    cardsArtifact: { ...baseline.cardsArtifact, cards: [...baseline.cardsArtifact.cards, ...identity.cards] },
    availabilityArtifact: { ...baseline.availabilityArtifact, source_availability: [...baseline.availabilityArtifact.source_availability, ...availability] },
  };
  const sourceOverlap = new Map(baseline.index.summary.source_overlap.map(row => [row.source_key, { ...row }]));
  for (const source of ['pkmncards', 'bulbapedia_set_list']) {
    const prior = sourceOverlap.get(source) ?? { source_key: source, evidence_rows: 0 };
    sourceOverlap.set(source, { ...prior, evidence_rows: prior.evidence_rows + 102 });
  }
  staged.index = { ...baseline.index,
    preparation: { version: VERSION, identity_fingerprint: identity.fingerprint, write_ready: false, active_master_changed: false },
    summary: { ...baseline.index.summary,
      sets: staged.setsArtifact.sets.length,
      evidence_rows: baseline.index.summary.evidence_rows + 204,
      source_overlap: [...sourceOverlap.values()],
      cards_by_status: countBy(staged.cardsArtifact.cards, 'status'),
      printings_by_status: countBy(staged.printingsArtifact.printings, 'status'),
      source_availability_by_status: countBy(staged.availabilityArtifact.source_availability.map(row => ({ status: `${row.source_key}|${row.runtime_status}` })), 'status'),
    },
    artifact_manifest: {
      sets: ARTIFACTS.setsArtifact, cards: ARTIFACTS.cardsArtifact, printings: ARTIFACTS.printingsArtifact,
      source_availability: ARTIFACTS.availabilityArtifact, manual_review: ARTIFACTS.manualReviewArtifact,
      conflicts: ARTIFACTS.conflictsArtifact, suppressed_structured_finish_candidates: ARTIFACTS.suppressed,
      finish_blocker_closure: ARTIFACTS.finishBlockerClosure,
    },
  };
  assertClassicStagePreservation(baseline, staged, identity);
  const completion = buildArtifacts(staged);
  const classicSets = completion.setMatrix.sets.filter(row => keys.has(row.set_key));
  const publishability = classicSets.map(setManifestRow);
  assert.ok(publishability.every(row => row.publishability_status === 'not_publishable_finish_gaps' && row.shard_refs === null));
  assert.equal(classicSets.length, 3);
  for (const row of classicSets) {
    assert.equal(row.card_identity.master_admissible, 34);
    assert.equal(row.printings.total_working_facts, 0);
    assert.equal(row.printings.identities_without_printing_evidence, 34);
    assert.equal(row.completion.status, 'card_identity_complete_finish_incomplete');
    assert.equal(row.completion.eligible_for_future_downstream_audit, false);
  }
  assert.equal(completion.sourceGapQueue.queue.filter(row => keys.has(row.set_key)).reduce((n, row) => n + row.gap_count, 0), 102);
  const report = { version: VERSION, status: 'guarded_identity_candidate_finish_incomplete',
    production_writes: 0, active_master_changed: false, write_ready: false,
    identity_fingerprint: identity.fingerprint, added_card_facts: 102, added_source_records: 204,
    added_printing_facts: 0, prior_cards_preserved: baseline.cardsArtifact.cards.length,
    prior_printings_preserved: baseline.printingsArtifact.printings.length,
    locked_me04_profile: 'passed', classic_sets: classicSets, classic_publishability: publishability,
    protected_artifact_hashes: Object.fromEntries(['printingsArtifact', 'manualReviewArtifact', 'conflictsArtifact', 'finishBlockerClosure', 'suppressed'].map(name => [name, digest(staged[name])])),
    blockers: ['All102 exact English finish qualifications and locked per-deck printing manifests remain open.', 'Candidate is not an active Master integration, canonical package, or production approval.'],
  };
  return { staged, completion, report };
}
