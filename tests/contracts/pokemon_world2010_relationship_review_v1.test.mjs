import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseWorld2010Checklist, qualifyWorld2010Relationships, assertWorld2010RelationshipReview, DECKS } from '../../backend/catalog/pokemon_world2010_relationship_review_v1.mjs';
const root = process.env.CLASSIC_PROOF_INPUT_ROOT;
function inputs() {
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'world2010-live-existing-identity-v5/snapshot.json')));
  const dir = path.join(root, 'world2010-retained-checklist-recovery-v3/originals');
  const corr = JSON.parse(fs.readFileSync(path.join(root, 'world2010-retained-checklist-recovery-v3/corroboration.json')));
  const originals = new Map(DECKS.map(d => [d.code, fs.readFileSync(path.join(dir, path.basename(corr.groups.find(g => g.deck === d.deck).retained_file)))]));
  return { snapshot, originals };
}
const qualify = f => qualifyWorld2010Relationships(f.snapshot, f.originals, '2026-10-03T01:35:00.000Z');

test('multi-link SP names preserve one exact origin tuple and ignore header mentions', () => {
  const rows = parseWorld2010Checklist(`{{TCG ID|Wrong|Header|1}}\n{{decklist/entry|2|[[Garchomp C LV.X (Supreme Victors 145)|Garchomp]] {{SP|C}} [[Garchomp C LV.X (Supreme Victors 145)|LV.X]]|Colorless||Rare Holo}}`);
  assert.deepEqual(rows[0].tuple, { origin_set: 'Supreme Victors', name: 'Garchomp C LV.X', number: '145' });
  assert.equal(rows.length, 1);
});
test('distinct tuples on one deck row fail instead of guessing one', () => {
  assert.throws(() => parseWorld2010Checklist('{{decklist/entry|1|{{TCG ID|Base Set|Pikachu|58}} [[Pikachu (Jungle 60)]]|}}'), /multiple_distinct/);
});
test('unnumbered Energy rows remain unnumbered and cannot inherit another coordinate', () => {
  assert.equal(parseWorld2010Checklist('{{decklist/entry|8|{{TCG|Psychic Energy}}|Psychic||Common}}')[0].tuple, null);
});

test('all original whole109 inputs replay into92 reviews and17 holds without source mutation', { skip: !root }, () => {
  const f = inputs(), before = JSON.stringify(f.snapshot), a = qualify(f), b = qualify(f);
  assert.deepEqual(a, b); assert.equal(JSON.stringify(f.snapshot), before);
  assert.deepEqual(a.counts, { products: 109, qualified: 92, held: 17, retained_lineages: 9, ingress_required: 83 });
  assert.equal(a.execution_authorized, false); assert.equal(a.human_signature, null);
  assert.ok(a.qualified.every(r => r.source === 'tcgcsv' && !r.finish_authority && !r.new_parent_allowed));
  assert.equal(a.qualified.filter(r => r.source_name_alias).length, 5);
  assert.equal(a.held.filter(r => r.reasons.includes('stored_parent_denominator_disagrees_with_source_hint')).length, 2);
});
for (const [name, mutate, error] of [
  ['incomplete product scope', f => f.snapshot.products.pop(), /whole109/],
  ['duplicate product', f => f.snapshot.products[1] = structuredClone(f.snapshot.products[0]), /duplicate_products/],
  ['source bytes', f => f.originals.set(DECKS[0].code, Buffer.from('modified')), /original_checklist_hash/],
  ['different source year', f => { f.snapshot.products[0].name = f.snapshot.products[0].name.replace('2010', '2011'); f.snapshot.products[0].raw_payload.name = f.snapshot.products[0].name; }, /exact_year_signature/],
  ['source contradictory group', f => { f.snapshot.products[0].raw_payload.groupId = 99; }, /Expected values/],
  ['stamp qualifier', f => { const p=f.snapshot.products[0];p.name=p.name.replace(' - 2010', ' STAFF - 2010');p.raw_payload.name=p.name; }, /exact92_scope/],
  ['cross-deck parent identity', f => { f.snapshot.parents.find(p => p.name === 'Azelf').printed_identity_modifier = 'ordinary Base Set'; }, /Expected values/],
  ['child omission', f => f.snapshot.printings.pop(), /preserve100/],
  ['new existing mapping', f => f.snapshot.mappings.push({id:'1'}), /existing_mapping_requires/],
  ['new existing identity', f => f.snapshot.identities.push({id:'1'}), /existing_identity_requires/],
  ['raw source relabel', f => { f.snapshot.raw_receipts[0].source='tcgdex'; }, /Expected values/],
  ['raw ID precision/replacement', f => { f.snapshot.raw_receipts[0].id='9007199254740993'; }, /exact_retained_raw/],
  ['raw discovery drift', f => { f.snapshot.raw_receipts[0].payload._external_id='tcgcsv:3:1'; }, /Expected values/],
  ['resolved hold injection', f => { f.snapshot.parents.find(p=>p.name==='Baltoy'&&p.printed_total===32).printed_total=147; }, /one_preserved_child|exact92_scope|all17_holds/],
]) test(name + ' stops the whole review', { skip: !root }, () => { const f = inputs(); mutate(f); assert.throws(() => qualify(f), error); });

const originalFiles = ['a68083defbd62001e17b4f60.txt','de97c9c06a995c647c679837.txt','ffedc48138afc4348196f2a7.txt','3f076026c787eb5af1c8e0f7.txt'];
test('four checked-in original deck checklists retain all109 entries and240 physical cards', async () => {
  const { createHash } = await import('node:crypto');
  const counts = DECKS.map((d,i) => {
    const bytes = fs.readFileSync(new URL('../../docs/audits/image_truth_v1/cache_wh18a_world_championship_sources_v1/' + originalFiles[i], import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), d.sha256);
    const rows = parseWorld2010Checklist(bytes.toString());
    assert.equal(rows.reduce((n,r)=>n+r.copies,0),60);
    return { rows:rows.length,numbered:rows.filter(r=>r.tuple).length };
  });
  assert.deepEqual(counts,[{rows:32,numbered:30},{rows:30,numbered:28},{rows:24,numbered:24},{rows:23,numbered:22}]);
});


test('frozen review replay rejects changed relationships and human attribution', { skip: !root }, () => {
  const f = inputs(), review = qualify(f);
  assert.deepEqual(assertWorld2010RelationshipReview(review, f.snapshot, f.originals), { qualified:92, held:17, execution_authorized:false });
  for (const change of [r=>{r.qualified[0].parent_id=r.qualified[1].parent_id;},r=>{r.actor_type='human';},r=>{r.execution_authorized=true;},r=>{r.held.pop();}]) {
    const altered=structuredClone(review); change(altered);
    assert.throws(()=>assertWorld2010RelationshipReview(altered,f.snapshot,f.originals),/world2010_source_review_replay_mismatch/);
  }
});
