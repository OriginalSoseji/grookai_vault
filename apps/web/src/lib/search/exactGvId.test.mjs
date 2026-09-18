import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeExactGvId} from './exactGvId.ts';
import {normalizeQuery} from '../resolver/normalizeQuery.ts';
import {buildSmartSearchIntent} from './smartSearchIntent.ts';
import {resolveSmartSearchQuery} from './resolveSmartSearchQuery.ts';
import {resolveGameScopedSetSearchIntent} from '../publicSets.shared.ts';

const identities=[
 'GV-PK-WCD-2023-PSYCHIC_ELEGANCE-17-BRILLIANT_STARS-137-COLLAPSED_STADIUM',
 'GV-PK-WCD-2025-PULT_BOMB-05-SHROUDED_FABLE-19-DUSCLOPS',
 'GV-PK-MEW-001-REVERSE-HOLO',
 'GV-PK-SWSH9-137-PRIZE-PACK-STAMP',
 'GV-PK-SV3.5-151',
 'GV-PK-JPN-PRODUCT-3090050C1BDFC5CE-103',
];
for(const gvId of identities)test(`exact identifier survives collector parsing: ${gvId}`,()=>{
 const raw=` ${gvId.toLowerCase()} `;
 const intent=buildSmartSearchIntent(raw);
 const query=resolveSmartSearchQuery(raw,intent);
 const setIntent=resolveGameScopedSetSearchIntent(query,'pokemon');
 assert.equal(query,gvId);assert.deepEqual(intent.finishKeys,[]);assert.deepEqual(intent.stampLabels,[]);
 assert.deepEqual(intent.interpretedLabels,[]);assert.deepEqual(setIntent.setCodes,[]);
 assert.equal(setIntent.remainingQuery,gvId);assert.equal(normalizeQuery(query).normalizedGvId,gvId);
});
test('OP and MTG exact identifiers are not interpreted as inline set filters',()=>{
 for(const [id,game] of [['GV-OP-OP01-001','one_piece'],['GV-MTG-LTR-001','mtg']]){
  assert.equal(normalizeExactGvId(id),id);
  const q=resolveSmartSearchQuery(id,buildSmartSearchIntent(id));
  assert.equal(q,id);assert.deepEqual(resolveGameScopedSetSearchIntent(q,game).setCodes,[]);
 }
});
test('ordinary collector queries retain finish and year interpretation',()=>{
 const intent=buildSmartSearchIntent('Gengar 2000-2024 reverse holo');
 assert.equal(intent.releaseYearMin,2000);assert.equal(intent.releaseYearMax,2024);
 assert.ok(intent.finishKeys.includes('reverse'));
 assert.equal(normalizeExactGvId('Charizard 151'),null);
 assert.equal(normalizeExactGvId('GV-PK-MEW-001 extra words'),null);
});
test('legacy spaced Pokemon ID shorthand remains supported',()=>{
 assert.equal(normalizeQuery('GV PK MEW 001').normalizedGvId,'GV-PK-MEW-001');
});
test('punctuation and embedded expressions are not exact identifiers',()=>{
 for(const input of ['GV-PK-X/1','GV-PK-X?foo=1','GV-PK-X,gv_id.eq.Y','prefix GV-PK-MEW-001','GV-PK-'])assert.equal(normalizeExactGvId(input),null);
});
