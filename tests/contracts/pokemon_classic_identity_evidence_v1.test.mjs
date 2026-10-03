import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {DECKS,sha256,qualifyClassicIdentities,parseClassicBulbapedia,identityNameKey} from '../../backend/catalog/pokemon_classic_identity_evidence_v1.mjs';
import {collectHumanFixtureEvidence} from '../../scripts/audits/verified_master_set_index_v1/source_adapters/human_fixtures.mjs';
import {classifyEvidence} from '../../scripts/audits/verified_master_set_index_v1/agreement_engine/classifier.mjs';
const root=new URL('../../docs/audits/english_master_index_completion_v1/classic_identity_20261002/',import.meta.url);
const preserved=JSON.parse(fs.readFileSync(new URL('identity-package.json',root)));
function input(){
 const sets=Array.from({length:150},(_,i)=>({id:'fixture-'+i,game:i===0?'mtg':'pokemon',code:i===0?'clb':'fixture-'+i,name:'fixture'}));
 return{sources:preserved.sources.map(s=>({...s,bytes:gunzipSync(fs.readFileSync(new URL('source_snapshots/'+s.key+'.html.gz',root)))})),namespace:{project:'ycdxbpibncqcchqiihfz',read_only:true,verified_tls:true,observed_at:'2026-10-02T18:00:00Z',sanity:{cards:40000,sets:150,traits:5000},sets}};
}
function changeSource(x,key,mutate){const s=x.sources.find(s=>s.key===key);s.bytes=Buffer.from(mutate(s.bytes.toString()));s.sha256=sha256(s.bytes);}
test('all102 source identities replay with two independent authorities and no finish invention',()=>{
 const x=input(),p=qualifyClassicIdentities(x);assert.deepEqual(p.cards,preserved.cards);assert.deepEqual(p.joins,preserved.joins);
 assert.equal(p.records.length,204);assert.equal(p.finish_reviews_approved,0);assert.deepEqual(p.printings,[]);assert.equal(p.write_ready,false);assert.equal(p.active_master_changed,false);
 assert.deepEqual(qualifyClassicIdentities(x),p);assert.equal(p.sets.find(s=>s.printed_code==='CLB').original_code_owners[0].game,'mtg');
});
test('existing Master fixture adapter and classifier accept exact identity-only package',async()=>{
 const records=await collectHumanFixtureEvidence(DECKS.map(d=>({key:d.set_key})),{fixtureDir:new URL('source_fixtures/',root).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
 const classified=classifyEvidence(records);assert.equal(records.length,204);assert.equal(classified.cards.length,102);assert.ok(classified.cards.every(c=>c.status==='master_verified'&&c.source_count===2));assert.equal(classified.printings.length,0);assert.equal(classified.conflicts.length,0);
});
for(const [name,change,pattern]of [
 ['source byte tamper',x=>x.sources[0].bytes=Buffer.from('tampered'),/source_bytes_hash/],
 ['missing source',x=>x.sources.pop(),/4/],
 ['wrong source authority',x=>x.sources[0].url='https://pkmncards.com/copy',/bulbagarden/],
 ['failed acquisition',x=>x.sources[0].status=403,/200/],
 ['wrong target',x=>x.namespace.project='other',/ycdxb/],
 ['failed maturity gate',x=>x.namespace.sanity.cards=1,/assert/],
 ['partial global namespace',x=>x.namespace.sets.pop(),/complete_global/],
 ['duplicate global owner',x=>x.namespace.sets[1].id=x.namespace.sets[0].id,/duplicate_set/],
 ['cross-game proposed code collision',x=>x.namespace.sets[0].code='CLASSIC-CLB',/canonical_code_occupied/],
 ['wrong English boundary',x=>changeSource(x,'bulbapedia',s=>s.replace('id="English_decks"','id="Other_decks"')),/english_section/],
 ['unnamed deck',x=>changeSource(x,'bulbapedia',s=>s.replace('<big><b>Venusaur &amp; Lugia ex Deck','<big><b>Other Deck')),/unknown_english_deck/],
 ['conflicting exact name',x=>changeSource(x,'bulbapedia',s=>s.replace('>Bulbasaur</a>','>Other Species</a>')),/independent_identity_conflict/],
 ['new variant qualifier',x=>changeSource(x,'bulbapedia',s=>s.replace('>Bulbasaur</a>','>Bulbasaur STAFF</a>')),/independent_identity_conflict/],
 ['duplicate printed coordinate',x=>changeSource(x,'pkmncards-clv',s=>s.replace(/#002/g,'#001')),/card_url_scope_mismatch|exact_coordinates/],
 ['wrong printed deck',x=>changeSource(x,'pkmncards-clv',s=>s.replace(/\(CLV\)/g,'(CLB)')),/printed_deck_mismatch/],
])test(name+' fails closed for the whole package',()=>{const x=input();change(x);assert.throws(()=>qualifyClassicIdentities(x),pattern);});
test('named deck sections can reorder without swapping card identities',()=>{
 const x=input(),html=x.sources.find(s=>s.key==='bulbapedia').bytes.toString(),a=html.indexOf('id="English_decks"'),b=html.indexOf('id="Japanese_.26_Traditional_Chinese_decks"',a);
 const h=html.slice(a,b),headers=[...h.matchAll(/<big><b>([\s\S]*?)<\/b><\/big>/g)];
 const blocks=headers.map((m,i)=>h.slice(m.index,headers[i+1]?.index??h.length));
 const reordered='id="English_decks"'+blocks.reverse().join('')+'id="Japanese_.26_Traditional_Chinese_decks"';
 assert.deepEqual(parseClassicBulbapedia(reordered).sort((a,b)=>a.deck_code.localeCompare(b.deck_code)||a.number.localeCompare(b.number)),parseClassicBulbapedia(html).sort((a,b)=>a.deck_code.localeCompare(b.deck_code)||a.number.localeCompare(b.number)));
});
test('only reviewed display aliases collapse; meaningful qualifiers survive',()=>{
 assert.equal(identityNameKey('Basic {G} Energy'),identityNameKey('Grass Energy'));
 assert.equal(identityNameKey("Boss's Orders [Giovanni]"),identityNameKey("Boss's Orders"));
 for(const name of ['Bulbasaur STAFF','Bulbasaur (GameStop)','Bulbasaur ex'])assert.notEqual(identityNameKey(name),identityNameKey('Bulbasaur'));
});
