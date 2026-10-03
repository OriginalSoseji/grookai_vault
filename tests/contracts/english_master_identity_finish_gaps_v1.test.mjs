import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArtifacts } from '../../scripts/audits/english_master_index_completion_v1_build.mjs';
import { setManifestRow } from '../../scripts/audits/english_master_index_publishable_v1_build.mjs';

const card = (number, set = 'fixture-deck-a') => ({ set_key: set, card_number: number, card_name: 'Card ' + number,
  status: 'master_verified', source_count: 2, source_kinds: ['collector_reference'], sources: ['one', 'two'] });
const printing = (number, extra = {}) => ({ ...card(number), fact_type: 'printing_finish', finish_key: 'holo', ...extra });
function run(cards, printings = [], extra = {}) {
  return buildArtifacts({ setsArtifact: { sets: [{ key: 'fixture-deck-a' }] }, cardsArtifact: { cards },
    printingsArtifact: { printings, finish_absences: [] }, availabilityArtifact: { source_availability: [] },
    manualReviewArtifact: { manual_review: [] }, conflictsArtifact: { conflicts: [] }, finishBlockerClosure: { mapped_blockers: [] }, ...extra });
}
test('whole deck with zero printing rows remains in the source queue without inventing finishes', () => {
  const result = run(Array.from({ length: 34 }, (_, i) => card(String(i + 1))));
  assert.equal(result.setMatrix.sets[0].completion.status, 'card_identity_complete_finish_incomplete');
  assert.equal(result.sourceGapQueue.queue[0].gap_count, 34);
  assert.equal(result.sourceGapQueue.queue[0].gap_unit, 'card_identities_not_printing_facts');
  assert.equal(result.sourceWorklist.worklist[0].identities_without_printing_evidence, 34);
  assert.equal(result.sourceWorklist.worklist[0].printing_finish_gap_count, 0);
  assert.deepEqual(result.masterAdmissibleExport.printings, []);
  const publication = setManifestRow(result.setMatrix.sets[0]);
  assert.equal(publication.publishability_status, 'not_publishable_finish_gaps');
  assert.equal(publication.printings.identities_without_printing_evidence, 34);
  assert.equal(publication.shard_refs, null);
});
test('a verified subset of printings does not complete the whole set', () => {
  const result = run([card('1'), card('2')], [printing('1')]);
  assert.equal(result.setMatrix.sets[0].completion.master_index_complete, false);
  assert.equal(result.sourceGapQueue.queue[0].gap_count, 1);
});
test('exact same-deck coverage keeps a previously complete set complete', () => {
  const result = run([card('1'), card('2')], [printing('1'), printing('2')]);
  assert.equal(result.setMatrix.sets[0].completion.status, 'complete_master_index_set');
  assert.equal(result.sourceGapQueue.queue.length, 0);
});
test('cross-deck or wrong-name printing cannot satisfy a missing identity', () => {
  for (const extra of [{ set_key: 'fixture-deck-b' }, { card_name: 'Other card' }]) {
    const result = run([card('1')], [printing('1', extra)]);
    assert.equal(result.setMatrix.sets.find(s => s.set_key === 'fixture-deck-a').printings.identities_without_printing_evidence, 1);
  }
});
test('known unconfirmed printing remains a fact-review gap rather than counted twice', () => {
  const result = run([card('1')], [printing('1', { status: 'candidate_unconfirmed', source_count: 1 })]);
  assert.equal(result.sourceGapQueue.queue.length, 1);
  assert.equal(result.sourceGapQueue.queue[0].lane, 'finish_human_checklist_evidence');
  assert.equal(result.setMatrix.sets[0].printings.identities_without_printing_evidence, 0);
});
test('finish absence or excluded printing does not stand in for positive physical evidence', () => {
  const p = printing('1');
  for (const extra of [
    { printingsArtifact: { printings: [], finish_absences: [p] } },
    { finishBlockerClosure: { mapped_blockers: [{ ...p, blocker_type: 'wrong_set_or_alias' }] } },
  ]) {
    const result = run([card('1')], [p], extra);
    assert.equal(result.setMatrix.sets[0].printings.identities_without_printing_evidence, 1);
    assert.equal(result.setMatrix.sets[0].completion.master_index_complete, false);
  }
});
test('duplicate identity evidence counts once and retains both facts', () => {
  const result = run([card('1'), card('1')]);
  assert.equal(result.sourceGapQueue.queue[0].gap_count, 1);
  assert.equal(result.masterAdmissibleExport.cards.length, 2);
});
test('numeric zero padding is display formatting, while suffixes and denominators remain significant', () => {
  const c = card('001');
  const p = { ...printing('1'), card_name: c.card_name };
  assert.equal(run([c], [p]).setMatrix.sets[0].printings.identities_without_printing_evidence, 0);
  for (const number of ['1a', '001/034', 'SV001']) {
    assert.equal(run([c], [{ ...p, card_number: number }]).setMatrix.sets[0].printings.identities_without_printing_evidence, 1);
  }
});
test('existing Master name aliases preserve coverage without collapsing retailer or ex qualifiers', () => {
  for (const [card_name, printed_name] of [['Pheromosa & Buzzwole GX', 'Pheromosa & Buzzwole-GX'], ['Ampharos', 'Ampharos δ'], ["Boss's Orders", 'Boss’s Orders']]) {
    assert.equal(run([{ ...card('1'), card_name }], [{ ...printing('1'), card_name: printed_name }]).setMatrix.sets[0].printings.identities_without_printing_evidence, 0);
  }
  for (const card_name of ['Card 1 GameStop', 'Card 1 STAFF', 'Card 1 ex']) {
    assert.equal(run([card('1')], [{ ...printing('1'), card_name }]).setMatrix.sets[0].printings.identities_without_printing_evidence, 1);
  }
});
