import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { sha256, qualifyClassicIdentities } from '../../backend/catalog/pokemon_classic_identity_evidence_v1.mjs';
import { qualifyClassicFinishes } from '../../backend/catalog/pokemon_classic_finish_evidence_v1.mjs';
import { ARTIFACTS } from '../../backend/catalog/pokemon_classic_master_staging_v1.mjs';
import { stageClassicFinishes, assertClassicFinishPreservation } from '../../backend/catalog/pokemon_classic_finish_staging_v1.mjs';
import { assertClassicMasterProfiles } from '../../backend/catalog/pokemon_classic_master_profile_v1.mjs';
import { buildArtifacts } from '../../scripts/audits/english_master_index_completion_v1_build.mjs';
import { setManifestRow } from '../../scripts/audits/english_master_index_publishable_v1_build.mjs';
import { classicStagingTestBaseline } from '../helpers/pokemon_classic_staging_baseline_v1.mjs';

const identityRoot = new URL('../../docs/audits/english_master_index_completion_v1/classic_identity_20261002/', import.meta.url);
const finishRoot = new URL('../classic_finish_20261002/', identityRoot);
const active = new URL('../../docs/audits/verified_master_set_index_v1/english_master_index_v1/', import.meta.url);
const read = (root, name) => JSON.parse(fs.readFileSync(new URL(name, root)));
const preserved = read(identityRoot, 'identity-package.json');
const namespace = { project: 'ycdxbpibncqcchqiihfz', read_only: true, verified_tls: true,
  observed_at: '2026-10-02T18:00:00Z', sanity: { cards: 40000, sets: 150, traits: 5000 },
  sets: Array.from({ length: 150 }, (_, i) => ({ id: 'fixture-' + i, code: 'fixture-' + i, game: 'pokemon' })) };
const sources = preserved.sources.map(s => ({ ...s, bytes: gunzipSync(fs.readFileSync(new URL('source_snapshots/' + s.key + '.html.gz', identityRoot))) }));
const identityPackage = qualifyClassicIdentities({ sources, namespace });
const review = read(finishRoot, 'automated-visual-review.json');
review.identity_fingerprint = identityPackage.fingerprint;
// Synthetic byte bindings test the mechanics, not the pixels or a new review.
const photographs = review.rows.map(r => {
  const bytes = Buffer.from(`synthetic staging test ${r.deck_code}-${r.number}`); r.image_sha256 = sha256(bytes);
  return { deck_code: r.deck_code, number: r.number, bytes, sha256: r.image_sha256, status: 200, verified_tls: true,
    url: r.image_url, final_url: r.image_url, retrieved_at: '2026-10-02T19:00:00Z' };
});
const finishEvidence = { review, reviewBytes: Buffer.from(JSON.stringify(review)), photographs,
  checklists: read(finishRoot, 'checklist-acquisition.json').map(s => ({ ...s, bytes: gunzipSync(fs.readFileSync(new URL(s.file, finishRoot))) })) };
const finishPackage = qualifyClassicFinishes({ ...finishEvidence, identity: identityPackage });
const baseline = classicStagingTestBaseline();
const input = { baseline, sources, namespace, identityPackage, finishEvidence, finishPackage };
const before = sha256(JSON.stringify(baseline));
const result = stageClassicFinishes(input), { staged, completion } = result;

test('whole102 additive stage preserves all existing facts and exposes bounded completion', () => {
  assert.equal(sha256(JSON.stringify(baseline)), before, 'input mutation');
  assertClassicFinishPreservation(baseline, staged, identityPackage, finishPackage);
  assert.equal(result.report.added_printing_facts, 102);
  assert.equal(result.report.prior_printings_preserved, baseline.printingsArtifact.printings.length);
  assert.equal(result.report.locked_me04_profile, 'passed');
  assert.equal(result.report.production_writes, 0); assert.equal(result.report.write_ready, false);
  for (const s of result.report.classic_sets) {
    assert.equal(s.completion.status, 'complete_master_index_base_scope');
    assert.equal(s.completion.master_index_complete, false);
    assert.equal(s.completion.eligible_for_future_downstream_audit, false);
    assert.equal(s.completion.eligible_for_scoped_downstream_audit, true);
    assert.deepEqual(s.finish_counts, { holo: 34 });
    assert.equal(setManifestRow(s).shard_refs, null);
  }
});
test('ordinary exports keep Jumbo visible as an unresolved size claim without a fake printing', () => {
  const queue = completion.sourceGapQueue.queue.filter(r => r.set_key.startsWith('classic-'));
  assert.equal(queue.length, 1); assert.equal(queue[0].lane, 'outside_base_scope_review');
  assert.equal(queue[0].reviews[0].resolved, false); assert.equal(queue[0].reviews[0].raw_variant, 'Jumbo');
  assert.equal(completion.masterAdmissibleExport.bounded_scopes.length, 3);
  assert.equal(completion.masterAdmissibleExport.printings.filter(p => p.set_key.startsWith('classic-')).length, 102);
});
test('completed old sets and all old completion outcomes remain identical', () => {
  const old = buildArtifacts(baseline);
  assert.deepEqual(completion.setMatrix.sets.filter(s => !s.set_key.startsWith('classic-')), old.setMatrix.sets);
  assert.equal(completion.setMatrix.sets.find(s => s.set_key === 'me04').completion.status, 'complete_master_index_set');
});
test('editable package flags cannot replace full source replay', () => {
  assert.throws(() => stageClassicFinishes({ ...input, finishPackage: { ...finishPackage, write_ready: true } }), /finish_package_source_replay_mismatch/);
});
test('modified old printing and old suppression are rejected', () => {
  const changed = { ...staged, printingsArtifact: { ...staged.printingsArtifact, printings: [...staged.printingsArtifact.printings] } };
  changed.printingsArtifact.printings[0] = { ...changed.printingsArtifact.printings[0], finish_key: 'invented' };
  assert.throws(() => assertClassicFinishPreservation(baseline, changed, identityPackage, finishPackage), /prior_facts_changed/);
  assert.throws(() => assertClassicFinishPreservation(baseline, { ...staged, suppressed: {} }, identityPackage, finishPackage), /protected_artifact_changed/);
});
function alteredScope() {
  return { ...staged,
    setsArtifact: { ...staged.setsArtifact, sets: staged.setsArtifact.sets.map(s => s.key.startsWith('classic-') ? structuredClone(s) : s) },
    cardsArtifact: { ...staged.cardsArtifact, cards: staged.cardsArtifact.cards.map(s => s.set_key.startsWith('classic-') ? structuredClone(s) : s) },
    printingsArtifact: { ...staged.printingsArtifact, printings: staged.printingsArtifact.printings.map(s => s.set_key.startsWith('classic-') ? structuredClone(s) : s) } };
}
for (const [name, mutate, error] of [
  ['missing profile', x => { delete x.setsArtifact.sets.at(-3).finish_profile; }, /locked_finish_profile/],
  ['missing scope', x => { delete x.setsArtifact.sets.at(-3).completion_scope; }, /bounded_completion_scope/],
  ['extra printing', x => { x.printingsArtifact.printings.push(x.printingsArtifact.printings.at(-1)); }, /exact34/],
  ['finish flip', x => { x.printingsArtifact.printings.at(-1).finish_key = 'normal'; }, /exact_finish/],
  ['hidden Jumbo', x => { const s = x.setsArtifact.sets.at(-3); s.outside_scope_reviews = []; s.finish_profile.outside_scope_reviews = []; }, /outside_scope_review_missing/],
  ['false Jumbo resolution', x => { const s = x.setsArtifact.sets.at(-3); s.outside_scope_reviews[0].resolved = true; }, /false/],
  ['whole-product completion', x => { x.setsArtifact.sets.at(-3).whole_product_complete = true; }, /false/],
]) test(`${name} blocks ordinary completion, not merely the dedicated stager`, () => {
  const x = alteredScope(); mutate(x); assert.throws(() => buildArtifacts(x), error);
});
test('coordinated name/profile/hash editing still fails the frozen exact profile', () => {
  const x = alteredScope(), s = x.setsArtifact.sets.at(-3), p = s.finish_profile;
  x.cardsArtifact.cards.find(r => r.set_key === s.key).card_name = 'Counterfeit name';
  x.printingsArtifact.printings.find(r => r.set_key === s.key).card_name = 'Counterfeit name';
  p.exact_facts[0].card_name = 'Counterfeit name'; p.protected_facts = p.exact_facts;
  p.exact_facts_sha256 = sha256(JSON.stringify(p.exact_facts));
  assert.throws(() => assertClassicMasterProfiles(x), /frozen_exact_facts_changed/);
});
test('bounded scope can never receive whole-set shards even with a mistaken complete status', () => {
  const row = structuredClone(result.report.classic_sets[0]); row.completion.status = 'complete_master_index_set';
  const exported = setManifestRow(row);
  assert.equal(exported.publishability_status, 'not_publishable_whole_set_base_scope_only'); assert.equal(exported.shard_refs, null);
});
