import releasedLedger from '../../backend/catalog/jungle_catalog_427_ledger.json' with {type:'json'};
import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import fs from 'node:fs';
import {reviewJungleEditionSourcesV4 as review,jungleSourcePayloadHashV1 as hash,jungleProductCompatibilityV1 as match} from '../../backend/pricing/jungle_edition_source_review_v4.mjs';
const at='2026-10-01T18:00:00Z';
function fixture(){
 const rawProduct={productId:45120,categoryId:3,groupId:635,name:'Clefable (1)',extendedData:[{name:'Number',value:'01/64'}]};
 const rawQuote={productId:45120,subTypeName:'1st Edition Holofoil',marketPrice:100};
 const bytes=Buffer.from(JSON.stringify({results:[rawQuote]}));
 const parent={id:'parent',printed_coordinate:'1',printed_identity_modifier:'edition:first_edition',name:'Clefable',gv_id:'GV-PK-JU-1-FIRST-EDITION'};
 return {asOf:at,manifest:{authority:{set_id:'set'},fingerprint:'manifest',parents:[parent],printings:[{id:'child',card_print_id:'parent',finish_key:'holo'}]},artifactBytes:new Map([['artifact',bytes]]),snapshot:{at,project_ref:'ycdxbpibncqcchqiihfz',read_only:true,tls_verified:true,setId:'set',sanity:{migrations:427},version:'JUNGLE_EDITION_POST_RELEASE_CAPTURE_V44',ledger:releasedLedger.map((version,i)=>({version,name:i===426?'sales_trade_ins_v1':'fixture'})),releaseState:{links:0,bindings:0,assignments:0,slab_receipts:0},collisions:{parents:[],children:[]},
  sourceRun:{id:'run',finished_at:at,observed_on:'2026-10-01',sync_mode:'current_full_sync',status:'completed',failed_count:0},
  sourceProducts:[{product_id:45120,category_id:3,group_id:635,source_active:true,catalog_metadata_status:'current',name:rawProduct.name,extended_data:rawProduct.extendedData,raw_payload:rawProduct,payload_hash:hash(rawProduct)}],
  sourceArtifacts:[{id:'artifact',sync_run_id:'run',category_id:3,group_id:635,artifact_kind:'prices',http_status:200,sha256:createHash('sha256').update(bytes).digest('hex')}],
  observations:[{id:'quote',source_price_row_identity:'tcgplayer:45120:1st edition holofoil',product_id:45120,category_id:3,group_id:635,subtype_name:rawQuote.subTypeName,observed_on:'2026-10-01',last_seen_run_id:'run',market_price:100,currency:'USD',raw_payload:rawQuote,payload_hash:hash(rawQuote),source_artifact_id:'artifact'}]}};
}
test('verified bytes yield compatibility only, never execution or publication authority',()=>{const r=review(fixture());assert.equal(r.summary.compatible,1);assert.equal(r.execution_authorized,false);assert.equal(r.publishable,false);assert.equal(r.write_ready,false);assert.deepEqual(r.executable_deltas,[]);});
for(const [name,change] of [
 ['missing bytes',f=>f.artifactBytes.clear()],['altered bytes',f=>f.artifactBytes.set('artifact',Buffer.from('{}'))],
 ['stale snapshot',f=>f.snapshot.at='2026-09-30T18:00:00Z'],['future snapshot',f=>f.snapshot.at='2026-10-02T18:00:00Z'],
 ['stale source',f=>f.snapshot.sourceRun.finished_at='2026-09-28T18:00:00Z'],['failed source',f=>f.snapshot.sourceRun.failed_count=1],
 ['product drift',f=>f.snapshot.sourceProducts[0].name='Wrong'],['raw product drift',f=>f.snapshot.sourceProducts[0].raw_payload.name='Wrong'],
 ['quote amount drift',f=>f.snapshot.observations[0].market_price=10],['quote payload drift',f=>f.snapshot.observations[0].raw_payload.marketPrice=10],
 ['wrong run',f=>f.snapshot.observations[0].last_seen_run_id='other'],['wrong currency',f=>f.snapshot.observations[0].currency='EUR'],
 ['duplicate source identity',f=>f.snapshot.observations.push({...f.snapshot.observations[0],id:'other'})],
 ['duplicate product',f=>f.snapshot.sourceProducts.push(f.snapshot.sourceProducts[0])],
 ['unknown schema',f=>f.snapshot.sanity.migrations=416],
])test(name+' rejects',()=>{const f=fixture();change(f);assert.throws(()=>review(f));});
test('opposite edition stays held',()=>{const f=fixture();f.manifest.parents[0].printed_identity_modifier='edition:unlimited';assert.deepEqual(review(f).rows[0].reasons,['missing_exact_edition_quote']);});
test('wrong finish stays held',()=>{const f=fixture();f.manifest.printings[0].finish_key='normal';assert.deepEqual(review(f).rows[0].reasons,['missing_exact_edition_quote']);});
test('wrong printed number stays held',()=>{const f=fixture();f.manifest.parents[0].printed_coordinate='17';assert.equal(review(f).summary.held,1);});
test('inactive product stays held',()=>{const f=fixture();f.snapshot.sourceProducts[0].source_active=false;assert.equal(review(f).summary.held,1);});
test('duplicate Number fields cannot match',()=>{const f=fixture(),p=f.snapshot.sourceProducts[0];p.extended_data.push(p.extended_data[0]);assert.equal(match(f.manifest.parents[0],p),false);});
test('only reviewed Nidoran female spelling is allowed',()=>{const f=fixture(),p=f.snapshot.sourceProducts[0];Object.assign(p,{name:'Nidoran F',extended_data:[{name:'Number',value:'57/64'}]});assert.equal(match({name:'Nidoran ♀',printed_coordinate:'57'},p),true);assert.equal(match({name:'Nidoran ♂',printed_coordinate:'57'},p),false);});
test('Poke Ball alias is bounded to canonical Jungle Trainer64',()=>{const f=fixture(),p=f.snapshot.sourceProducts[0];Object.assign(p,{name:'Poke Ball',extended_data:[{name:'Number',value:'64/64'}]});assert.equal(match({name:'Poké Ball',printed_coordinate:'64'},p),true);assert.equal(match({name:'Pokeball',printed_coordinate:'64'},p),false);p.group_id=999;assert.equal(match({name:'Poké Ball',printed_coordinate:'64'},p),false);});
test('source alias does not generalize to another coordinate or source name',()=>{const f=fixture(),p=f.snapshot.sourceProducts[0];Object.assign(p,{name:'Poke Ball',extended_data:[{name:'Number',value:'63/64'}]});assert.equal(match({name:'Poké Ball',printed_coordinate:'63'},p),false);p.extended_data=[{name:'Number',value:'64/64'}];for(const name of ['Pokeball','Poke Ball (Error)','Poké Ball [1st Edition]']){p.name=name;assert.equal(match({name:'Poké Ball',printed_coordinate:'64'},p),false);}});
test('additive migration carries the exact alias while foundation stays unchanged',()=>{const old=fs.readFileSync(new URL('../../supabase/migrations/20261001050000_jungle_edition_foundation_v1.sql',import.meta.url),'utf8');const sql=fs.readFileSync(new URL('../../supabase/migrations/20261001203000_jungle_edition_price_reader_integration_v1.sql',import.meta.url),'utf8');assert.doesNotMatch(old,/'Poke Ball'/);assert.match(sql,/when card.number_plain = '64' and card.name = 'Poké Ball' then 'Poke Ball' else card.name end/);});

for(const[name,change]of [['modified old ledger ID',f=>f.snapshot.ledger[0].version='20000101000000'],['missing ledger ID',f=>f.snapshot.ledger.pop()],['old snapshot type',f=>f.snapshot.version='old'],['staged catalog collision',f=>f.snapshot.collisions.parents.push({id:'x'})],['existing binding',f=>f.snapshot.releaseState.bindings=1],['old425 schema',f=>f.snapshot.sanity.migrations=425]])test(name+' rejects before compatibility',()=>{const f=fixture();change(f);assert.throws(()=>review(f));});
