import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bodyHash,readArtworkReference,classifyArtworkReference,classifyCatalogProductArtwork,runArtworkBuild} from '../pokemon_artwork_classification_v1.mjs';

const parent={id:'urs-202',gv_id:'GV-PK-TWM-202',name:'Bloodmoon Ursaluna ex',set_code:'sv06',number:'202',rarity:'Ultra Rare',identity_domain:'pokemon_eng_standard'};
const catalog={...parent,identity_active:true,identity_consistent:true,publicly_visible:true,identity_id:'identity-202',identity_key_hash:'a'.repeat(64)};
const mappings=[{id:9,source:'tcgplayer',external_id:'550246',active:true,card_print_id:parent.id}];
function receipt(notes='Full Art',extra='') {
  const body_text=`<h1 id="product_name">Bloodmoon Ursaluna ex #202 <a href="/console/pokemon-twilight-masquerade">Pokemon Twilight Masquerade</a></h1>
   <table id="attribute"><tr><td class="title">Card Number:</td><td class="details">#202</td></tr>
   <tr><td class="title">Notes:</td><td class="details">${notes}</td></tr>
   <tr><td class="title">TCGPlayer ID:</td><td class="details"><a>550246</a></td></tr>${extra}</table>`;
  return {url:'https://www.pricecharting.com/game/pokemon-twilight-masquerade/bloodmoon-ursaluna-ex-202',body_text,body_sha256:bodyHash(body_text)};
}
const classify=(r=receipt(),overrides={})=>classifyArtworkReference({receipt:r,parent,catalog,mappings,setName:'Twilight Masquerade',...overrides});

test('explicit structured artwork metadata binds to one exact existing canonical card',()=>{
  const result=classify();assert.equal(result.state,'classified');assert.equal(result.row.category,'Full Art');
  assert.equal(result.row.evidence.source_field,'Details.Notes');assert.equal(result.row.evidence.mapping_id,'9');
  assert.equal(result.row.card_print_id,parent.id);
});
test('auction text, generic rarity, negation and missing notes cannot supply Full Art',()=>{
  for(const notes of ['none','Ultra Rare','Special Illustration Rare','not Full Art','']) {
    assert.equal(classify(receipt(notes,'<tr><td>Auction: Full Art</td><td>Full Art $99</td></tr>')).reason,'NO_EXPLICIT_FULL_ART');
  }
  const r=receipt('none');
  const body=r.body_text+'<table><tr><td class="title">Notes:</td><td>Full Art</td></tr></table>';
  assert.equal(classify({...r,body_text:body,body_sha256:bodyHash(body)}).reason,'NO_EXPLICIT_FULL_ART');
});
test('original integrity, source scope and contradictory structured fields fail closed',()=>{
  const r=receipt();assert.throws(()=>readArtworkReference({...r,body_text:r.body_text+'changed'}),/INTEGRITY/);
  assert.throws(()=>readArtworkReference({...r,url:'https://other.test/game/pokemon-x/y'}),/INTEGRITY/);
  assert.throws(()=>readArtworkReference(receipt('Full Art','<tr><td class="title">Notes:</td><td>none</td></tr>')),/DUPLICATE/);
  const changed=r.body_text.replace('#202</td>','#216</td>');
  assert.throws(()=>readArtworkReference({...r,body_text:changed,body_sha256:bodyHash(changed)}),/COORDINATES/);
});
test('name, number, set and reciprocal mapping ownership must all agree',()=>{
  for(const overrides of [{setName:'Other Set'},{parent:{...parent,name:'Different'}},{parent:{...parent,number:'216'}},
    {mappings:[]},{mappings:[{...mappings[0],card_print_id:'another'}]},
    {mappings:[...mappings,{...mappings[0],id:10,card_print_id:'another'}]}]) assert.equal(classify(receipt(),overrides).state,'held');
});
test('suppression, identity drift and other domains cannot acquire the label',()=>{
  for(const override of [{identity_active:false},{identity_consistent:false},{publicly_visible:false},{identity_domain:'tcg_pocket'},
    {name:'Changed'},{gv_id:'GV-PK-TWM-216'},{set_code:'other'},{number:'216'}]) {
    assert.equal(classify(receipt(),{catalog:{...catalog,...override}}).reason,'CATALOG_IDENTITY');
  }
});

test('retained catalog product labels require exact card, set, number and active ownership',()=>{
  const p={...parent,name:'Judge',number:'209',set_code:'sm8',rarity:'Rare Ultra'};
  const product={product_id:179010,category_id:3,group_id:2328,source_active:true,catalog_metadata_status:'current',
    source_url:'https://www.tcgplayer.com/product/179010/pokemon-sm-lost-thunder-judge-full-art',
    raw_payload:{productId:179010,categoryId:3,groupId:2328,name:'Judge (Full Art)',extendedData:[{name:'Number',value:'209/214'}]}};
  const input={product,group:{group_id:2328,name:'SM - Lost Thunder'},parent:p,catalog:{...catalog,...p},
    mappings:[{...mappings[0],external_id:'179010'}],setName:'Lost Thunder'};
  assert.equal(classifyCatalogProductArtwork(input).state,'classified');
  for(const change of [{product:{...product,source_active:false}},{group:{group_id:2328,name:'SM - Other'}},
    {product:{...product,raw_payload:{...product.raw_payload,name:'Judge'}}},
    {product:{...product,raw_payload:{...product.raw_payload,extendedData:[{name:'Number',value:'208/214'}]}}},
    {mappings:[...input.mappings,{...input.mappings[0],id:10,card_print_id:'other'}]}]) {
    assert.equal(classifyCatalogProductArtwork({...input,...change}).state,'held');
  }
});

test('released artwork facts contain explicit evidence and no private source originals or prices',()=>{
  const model=JSON.parse(fs.readFileSync(new URL('../../../shared/catalog/pokemon_artwork_classification_v1.json',import.meta.url),'utf8'));
  assert.equal(model.version,'pokemon_artwork_classification:v1');
  assert.equal(model.coverage.classified,model.rows.length);
  assert.equal(model.coverage.candidates_checked,model.coverage.classified+model.coverage.held);
  assert.equal(new Set(model.rows.map(row=>row.card_print_id)).size,model.rows.length);
  for(const row of model.rows){
    assert.equal(row.category,'Full Art');assert.match(row.gv_id,/^GV-PK-/);
    assert.match(row.evidence.body_sha256,/^[a-f0-9]{64}$/);assert.match(row.evidence.identity_key_hash,/^[a-f0-9]{64}$/);
    if(row.evidence.source_field==='Details.Notes')assert.equal(row.evidence.source_value,'Full Art');
    else{assert.equal(row.evidence.source_field,'name');assert.match(row.evidence.source_value,/\(Full Art\)$/);}
    for(const forbidden of ['body_text','raw_payload','prices','raw_import_id'])assert.equal(JSON.stringify(row).includes(`"${forbidden}"`),false);
  }
});

test('metadata builds persist one terminal receipt with stage and version on success and failure',async()=>{
  for(const fail of [false,true]){
    const receipts=[],store={saveRun:async run=>{receipts.push(structuredClone(run));}};
    const task=()=>runArtworkBuild(store,async run=>{run.stage='stage_references';if(fail)throw Error('ARTWORK_REFERENCE_INTEGRITY');return {classified:1};});
    if(fail)await assert.rejects(task,/ARTWORK_REFERENCE_INTEGRITY/);else assert.equal((await task()).classified,1);
    assert.equal(receipts.length,2);assert.equal(receipts[0].status,'running');
    assert.equal(receipts[1].status,fail?'failed':'succeeded');assert.equal(receipts[1].run_id,receipts[0].run_id);
    assert.equal(receipts[1].stage,'stage_references');assert.equal(receipts[1].version,'pokemon_artwork_classification:v1');
    if(fail){assert.equal(receipts[1].error_code,'ARTWORK_REFERENCE_INTEGRITY');assert(receipts[1].error_detail);}
  }
});
test('uncertain terminal persistence cannot emit a second contradictory terminal',async()=>{
  const receipts=[],store={saveRun:async run=>{receipts.push(run.status);if(run.status==='succeeded')throw Error('storage unavailable after DB receipt');}};
  await assert.rejects(()=>runArtworkBuild(store,async()=>({classified:1})),/storage unavailable/);
  assert.deepEqual(receipts,['running','succeeded']);
});
