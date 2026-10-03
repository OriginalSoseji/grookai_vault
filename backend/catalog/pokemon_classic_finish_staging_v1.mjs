import assert from 'node:assert/strict';
import { DECKS, sha256 } from './pokemon_classic_identity_evidence_v1.mjs';
import { stageClassicMaster } from './pokemon_classic_master_staging_v1.mjs';
import { qualifyClassicFinishes } from './pokemon_classic_finish_evidence_v1.mjs';
import { CLASSIC_SCOPE, assertClassicMasterProfiles } from './pokemon_classic_master_profile_v1.mjs';
import { buildArtifacts } from '../../scripts/audits/english_master_index_completion_v1_build.mjs';
import { setManifestRow } from '../../scripts/audits/english_master_index_publishable_v1_build.mjs';
import { assertMe04FinishTruthV1 } from '../../scripts/audits/me04_finish_truth_v1.mjs';

export const VERSION = 'POKEMON_CLASSIC_FINISH_STAGING_V1';
const digest = x => sha256(JSON.stringify(x));
const keys = new Set(DECKS.map(d => d.set_key));
const countBy = (rows, field) => rows.reduce((counts, row) => { counts[row[field]] = (counts[row[field]] ?? 0) + 1; return counts; }, {});

export function assertClassicFinishPreservation(baseline, staged, identity, finish) {
  for (const [artifact, field, additions] of [['cardsArtifact', 'cards', identity.cards], ['printingsArtifact', 'printings', finish.printings]]) {
    assert.equal(staged[artifact][field].length, baseline[artifact][field].length + 102);
    assert.equal(digest(staged[artifact][field].slice(0, -102)), digest(baseline[artifact][field]), `prior_facts_changed:${artifact}`);
    assert.deepEqual(staged[artifact][field].slice(-102), additions, `added_facts_changed:${artifact}`);
    const { [field]: beforeRows, ...beforeMeta } = baseline[artifact];
    const { [field]: afterRows, ...afterMeta } = staged[artifact];
    assert.deepEqual(afterMeta, beforeMeta, `artifact_metadata_changed:${artifact}`);
  }
  assert.equal(staged.setsArtifact.sets.length, baseline.setsArtifact.sets.length + 3);
  assert.equal(digest(staged.setsArtifact.sets.slice(0, -3)), digest(baseline.setsArtifact.sets), 'prior_sets_changed');
  assert.equal(digest(staged.availabilityArtifact.source_availability.filter(s => !keys.has(s.set_key))), digest(baseline.availabilityArtifact.source_availability), 'prior_availability_changed');
  for (const name of ['manualReviewArtifact', 'conflictsArtifact', 'finishBlockerClosure', 'suppressed']) {
    assert.equal(digest(staged[name]), digest(baseline[name]), `protected_artifact_changed:${name}`);
  }
  assertClassicMasterProfiles(staged);
  assert.deepEqual(staged.setsArtifact.sets.slice(-3).map(s => s.finish_profile), finish.profiles, 'source_profiles_changed');
  assertMe04FinishTruthV1(staged.printingsArtifact.printings, 'Classic additive finish staging ME04');
}

export function stageClassicFinishes(input) {
  const { baseline, identityPackage, finishEvidence, finishPackage } = input;
  const { staged: identityStage } = stageClassicMaster(input);
  const finish = qualifyClassicFinishes({ ...finishEvidence, identity: identityPackage });
  assert.deepEqual(finish, finishPackage, 'finish_package_source_replay_mismatch');
  const configurations = identityStage.setsArtifact.sets.slice(-3).map(set => {
    const profile = finish.profiles.find(p => p.set_key === set.key);
    return { ...set, completion_scope: CLASSIC_SCOPE, whole_product_complete: false,
      finish_profile_status: 'qualified_source_candidate', finish_profile: profile,
      outside_scope_reviews: profile.outside_scope_reviews };
  });
  const availability = [];
  for (const set of configurations) {
    const records = finish.records.filter(r => r.set_key === set.key);
    for (const source of new Set(records.map(r => r.source_key))) {
      const rows = records.filter(r => r.source_key === source);
      set.source_aliases[source] = rows.map(r => r.source_url).filter((s, i, all) => all.indexOf(s) === i);
      set.source_status[source] = 'preserved'; set.source_totals[source] = { total: rows.length };
      availability.push({ set_key: set.key, set_name: set.set_name, source_key: source,
        source_alias: set.source_aliases[source], configured_status: 'preserved', runtime_status: 'collected', evidence_rows: rows.length, error: null });
    }
  }
  const staged = { ...identityStage,
    setsArtifact: { ...baseline.setsArtifact, sets: [...baseline.setsArtifact.sets, ...configurations] },
    printingsArtifact: { ...baseline.printingsArtifact, printings: [...baseline.printingsArtifact.printings, ...finish.printings] },
    availabilityArtifact: { ...baseline.availabilityArtifact, source_availability: [...identityStage.availabilityArtifact.source_availability, ...availability] },
  };
  const overlap = new Map(identityStage.index.summary.source_overlap.map(row => [row.source_key, { ...row }]));
  for (const row of finish.records) { const prior = overlap.get(row.source_key) ?? { source_key: row.source_key, evidence_rows: 0 }; prior.evidence_rows++; overlap.set(row.source_key, prior); }
  staged.index = { ...identityStage.index,
    preparation: { version: VERSION, identity_fingerprint: identityPackage.fingerprint, finish_fingerprint: finish.fingerprint,
      scope: CLASSIC_SCOPE, whole_product_complete: false, write_ready: false, active_master_changed: false },
    summary: { ...identityStage.index.summary, evidence_rows: identityStage.index.summary.evidence_rows + finish.records.length,
      source_overlap: [...overlap.values()], printings_by_status: countBy(staged.printingsArtifact.printings, 'status'),
      source_availability_by_status: countBy(staged.availabilityArtifact.source_availability.map(r => ({ status: `${r.source_key}|${r.runtime_status}` })), 'status') },
  };
  assertClassicFinishPreservation(baseline, staged, identityPackage, finish);
  const completion = buildArtifacts(staged);
  const classicSets = completion.setMatrix.sets.filter(s => keys.has(s.set_key));
  assert.equal(classicSets.length, 3);
  for (const set of classicSets) {
    assert.equal(set.completion.status, 'complete_master_index_base_scope');
    assert.equal(set.card_identity.master_admissible, 34); assert.equal(set.printings.master_admissible, 34);
    assert.equal(set.printings.identities_without_printing_evidence, 0);
    assert.equal(set.completion.master_index_complete, false);
  }
  const report = { version: VERSION, status: 'guarded_standard_deck_finish_candidate', scope: CLASSIC_SCOPE,
    write_ready: false, active_master_changed: false, production_writes: 0, whole_product_complete: false,
    added_card_facts: 102, added_printing_facts: 102, added_source_records: 408,
    identity_fingerprint: identityPackage.fingerprint, finish_fingerprint: finish.fingerprint,
    prior_cards_preserved: baseline.cardsArtifact.cards.length, prior_printings_preserved: baseline.printingsArtifact.printings.length,
    exact_profiles: 'passed', locked_me04_profile: 'passed', outside_scope_reviews: finish.outside_scope_reviews,
    classic_sets: classicSets, classic_publishability: classicSets.map(setManifestRow),
    blockers: ['Active Master promotion, normal source hooks/commit/push and canonical executor qualification remain separate gates.',
      'The Jumbo size claim remains unresolved outside the standard-deck scope.'] };
  return { staged, completion, report };
}
