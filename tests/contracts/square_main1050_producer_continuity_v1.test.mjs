import test from 'node:test';
import assert from 'node:assert/strict';
import {priceLinkCodeBindingV1} from '../../backend/pricing/japanese_reviewed_price_links_v1.mjs';
import {priceLinkCodeBindingV2} from '../../backend/pricing/japanese_reviewed_price_links_v2.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {assertSquareMain1050ProducerContinuityV1 as check} from '../../scripts/lib/square_main1050_producer_continuity_v1.mjs';

const first=priceLinkCodeBindingV1(),second=priceLinkCodeBindingV2();
test('Square composition preserves both accepted producers and admits only six exact additional SQL files',()=>{
 assert.equal(check(first,'japaneseV1').historicalFiles,594);
 assert.equal(check(second,'japaneseV2').historicalFiles,600);
 assert.equal(check(first,'japaneseV1').currentFiles,600);
 assert.equal(check(second,'japaneseV2').currentFiles,606);
});
for(const [name,change]of [
 ['changed original file',b=>{b.files[0].sha256='0'.repeat(64);}],
 ['missing original file',b=>{b.files.shift();}],
 ['duplicate original file',b=>{b.files[1]=structuredClone(b.files[0]);}],
 ['changed Square SQL',b=>{b.files.find(x=>x.file.includes('20261124230000')).sha256='0'.repeat(64);}],
 ['missing Square SQL',b=>{b.files=b.files.filter(x=>!x.file.includes('20261124230000'));}],
 ['unknown extra SQL',b=>{b.files.push({file:'supabase/migrations/20990101000000_unknown.sql',sha256:'0'.repeat(64)});}],
 ['changed original order',b=>{[b.files[0],b.files[1]]=[b.files[1],b.files[0]];}],
])test('source composition rejects '+name+' even with a freshly computed fingerprint',()=>{
 const b=structuredClone(second);change(b);b.fingerprint=hash(b.files);assert.throws(()=>check(b,'japaneseV2'));
});
test('source composition rejects a forged fingerprint or unknown programme',()=>{
 assert.throws(()=>check({...second,fingerprint:'0'.repeat(64)},'japaneseV2'));
 assert.throws(()=>check(second,'other'));
});
