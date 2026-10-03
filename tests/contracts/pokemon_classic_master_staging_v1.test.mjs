import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { ARTIFACTS, stageClassicMaster, assertClassicStagePreservation } from '../../backend/catalog/pokemon_classic_master_staging_v1.mjs';
import { qualifyClassicIdentities } from '../../backend/catalog/pokemon_classic_identity_evidence_v1.mjs';
import { classicStagingTestBaseline } from '../helpers/pokemon_classic_staging_baseline_v1.mjs';

const root = new URL('../../docs/audits/english_master_index_completion_v1/classic_identity_20261002/', import.meta.url);
const active = new URL('../../docs/audits/verified_master_set_index_v1/english_master_index_v1/', import.meta.url);
const preserved = JSON.parse(fs.readFileSync(new URL('identity-package.json', root)));
const namespace = { project: 'ycdxbpibncqcchqiihfz', read_only: true, verified_tls: true,
  observed_at: '2026-10-02T18:00:00Z', sanity: { cards: 40000, sets: 150, traits: 5000 },
  sets: Array.from({ length: 150 }, (_, i) => ({ id: 'fixture-' + i, code: 'fixture-' + i, game: 'pokemon' })) };
const sources = preserved.sources.map(source => ({ ...source,
  bytes: gunzipSync(fs.readFileSync(new URL('source_snapshots/' + source.key + '.html.gz', root))) }));
const identityPackage = qualifyClassicIdentities({ sources, namespace });
const baseline = classicStagingTestBaseline();
const input = { baseline, sources, namespace, identityPackage };

test('actual whole102 staging preserves all historical truth and locked ME04 facts', () => {
  const { staged, completion, report } = stageClassicMaster(input);
  assert.equal(report.added_card_facts, 102);
  assert.equal(report.added_printing_facts, 0);
  assert.equal(report.locked_me04_profile, 'passed');
  assert.equal(staged.printingsArtifact, baseline.printingsArtifact);
  assert.equal(staged.cardsArtifact.cards.length, baseline.cardsArtifact.cards.length + 102);
  assert.equal(completion.sourceWorklist.worklist.filter(row => row.set_key.startsWith('classic-')).length, 3);
  assert.equal(completion.setMatrix.sets.find(row => row.set_key === 'me04').printings.identities_without_printing_evidence, 0);
  assert.equal(completion.setMatrix.sets.find(row => row.set_key === 'me04').completion.status, 'complete_master_index_set');
  const altered = { ...staged, cardsArtifact: { ...staged.cardsArtifact, cards: [...staged.cardsArtifact.cards] } };
  altered.cardsArtifact.cards[0] = { ...altered.cardsArtifact.cards[0], card_name: 'Changed prior identity' };
  assert.throws(() => assertClassicStagePreservation(baseline, altered, identityPackage), /prior_card_facts_changed/);
  assert.throws(() => assertClassicStagePreservation(baseline, { ...staged, suppressed: {} }, identityPackage), /protected_artifact_changed/);
});
test('changed candidate flags cannot substitute for replaying original evidence', () => {
  assert.throws(() => stageClassicMaster({ ...input, identityPackage: { ...identityPackage, write_ready: true } }), /source_replay_mismatch/);
});
test('occupied Master scope cannot silently overwrite or duplicate identities', () => {
  const occupied = { ...baseline, setsArtifact: { ...baseline.setsArtifact, sets: [...baseline.setsArtifact.sets, { key: 'classic-clv' }] } };
  assert.throws(() => stageClassicMaster({ ...input, baseline: occupied }), /classic_scope_already_present/);
});
test('protected ME04 finish drift blocks output even with unchanged total counts', () => {
  const printings = baseline.printingsArtifact.printings.map(row => row.set_key === 'me04' && row.card_number === '109'
    ? { ...row, finish_key: 'normal' } : row);
  assert.throws(() => stageClassicMaster({ ...input, baseline: { ...baseline, printingsArtifact: { ...baseline.printingsArtifact, printings } } }), /forbidden Normal|Holo-only|58 holo/);
});
