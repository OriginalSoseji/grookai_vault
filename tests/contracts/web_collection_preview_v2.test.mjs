import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCollectionPreviewV2} from '../../apps/web/src/lib/import/collectionPreviewV2.ts';
import {chooseCollectionReviewCandidate} from '../../apps/web/src/lib/import/collectionPreviewChoices.ts';
const csv=(rows)=>['Product Name,Category,Set,Card Number,Variance,Grade,Quantity,Portfolio Name',...rows].join('\n');
const basic='Synthetic,Pokemon,Test,007,Reverse Holofoil,Ungraded,2,Private';
const namedFinishes=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_named_finishes_v1.json',import.meta.url)));
for(const c of namedFinishes)test('web named finish keeps exact child and original source: '+c.name,async()=>{
 const source=basic.replace('Synthetic',c.name).replace('Reverse Holofoil','Holofoil');
 const p=await buildCollectionPreviewV2(fixture({primaryFinish:c.finish??'holo'}).client,'owner',csv([source]));
 assert.equal(p.readyRows,c.finish?1:0);assert.equal(p.rows[0].source['Product Name'],c.name);
 if(!c.finish)return;
 assert.equal(p.rows[0].selection.cardPrintingId,'p1');assert.equal(p.rows[0].finish,c.finish);assert.equal(p.readyCopies,2);
 for(const options of [{primaryFinish:'holo'},{primaryActive:false},{primaryDomain:'pokemon_jpn_standard'}]){
  const held=await buildCollectionPreviewV2(fixture({primaryFinish:c.finish,...options}).client,'owner',csv([source]));assert.equal(held.readyRows,0);
 }
 for(const value of ['Normal','Reverse Holofoil','Foil']){
  const held=await buildCollectionPreviewV2(fixture({primaryFinish:c.finish}).client,'owner',csv([source.replace('Holofoil',value)]));assert.equal(held.readyRows,0);
 }
 const blank=await buildCollectionPreviewV2(fixture({primaryFinish:c.finish}).client,'owner',csv([source.replace('Holofoil','')]));assert.equal(blank.rows[0].finish,c.finish);
});
const artLabels=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_pokemon_art_labels_v1.json',import.meta.url)));
for(const c of artLabels)test('web art labels require catalog evidence: '+c.label,async()=>{
 const source=basic.replace('Synthetic',c.name).replace('Reverse Holofoil','Holofoil');
 const options={primaryFinish:'holo',primaryCard:{name:'Synthetic-EX',rarity:c.rarity,variant_key:c.variant}};
 const p=await buildCollectionPreviewV2(fixture(options).client,'owner',csv([source]));assert.equal(p.readyRows,c.expected?1:0);assert.equal(p.rows[0].source['Product Name'],c.name);
 if(!c.expected)return;
 assert.equal(p.rows[0].selection.cardPrintingId,'p1');assert.equal(p.readyCopies,2);
 for(const change of [{primaryActive:false},{primaryFinish:'normal'},{primaryDomain:'pokemon_jpn_standard'},{primaryCard:{...options.primaryCard,rarity:null}}])assert.equal((await buildCollectionPreviewV2(fixture({...options,...change}).client,'owner',csv([source]))).readyRows,0);
});
function fixture({extraCard=false,missingPrinting=false,failLate=false,repeated=false,wrongPrinting=false,sameFinish=false,duplicatePrinting=false,inactive=false,primaryFinish='reverse',primaryActive=true,primaryDomain='pokemon_eng_standard',primaryCard={},jungle=null}={}){
 const sets=[{id:'s1',name:'Test',code:'test',game:'pokemon'}];
 const cards=[{id:'c1',set_id:'s1',gv_id:'GV-1',name:'Synthetic',number:'7/100',identity_domain:primaryDomain,variant_key:'',...primaryCard}];
 if(extraCard)cards.push({...cards[0],id:'c2',gv_id:'GV-2',variant_key:'play_pokemon_stamp',printed_identity_modifier:'prize_pack_stamp'});
 if(jungle)cards.forEach(card=>{card.set_code='base2';});
 const printings=[{id:'p1',card_print_id:'c1',finish_key:primaryFinish,finish_is_active:primaryActive}];
 if(extraCard&&!missingPrinting)printings.push({id:'p2',card_print_id:'c2',finish_key:sameFinish?'reverse':'normal',finish_is_active:!inactive});
 if(duplicatePrinting)printings.push({id:'p3',card_print_id:'c2',finish_key:'reverse',finish_is_active:true});
 const reads=[];
 const client={from:table=>{let after=null,filter=null;const q={select:()=>q,order:()=>q,limit:()=>q,gt:(_,v)=>{after=v;return q;},in:(k,v)=>{filter=[k,v];return q;},eq:()=>q,then:resolve=>{
  reads.push([table,after]);let rows=table==='sets'?sets:table==='card_prints'?cards:[];
  if(failLate&&table==='card_prints'&&after)return resolve({data:null,error:{message:'offline'}});
  rows=rows.filter(r=>(!after||repeated||r.id>after)&&(!filter||filter[1].includes(r[filter[0]]))).slice(0,1);
  return resolve({data:rows,error:null});}};return q;},rpc:async(name,a)=>{reads.push([name,a]);if(name==='get_jungle_edition_resolution_v1')return jungle;return {data:printings.filter(p=>a.p_card_print_ids.includes(p.card_print_id)).slice(a.p_offset,a.p_offset+1).map(p=>wrongPrinting?{...p,card_print_id:'foreign'}:p),error:null};}};
 return{client,reads};
}
test('complete capped pages, normalized number and explicit finish preserve exact selection',async()=>{
 const f=fixture({extraCard:true});const p=await buildCollectionPreviewV2(f.client,'owner',csv([basic]));
 assert.equal(p.readyRows,1);assert.equal(p.readyCopies,2);assert.equal(p.rows[0].selection.cardId,'c1');assert.equal(p.rows[0].selection.cardPrintingId,'p1');assert.ok(f.reads.some(([table,after])=>table==='card_prints'&&after==='c2'));
});
test('missing printing evidence does not erase an ambiguous parent',async()=>{
 const p=await buildCollectionPreviewV2(fixture({extraCard:true,missingPrinting:true}).client,'owner',csv([basic]));assert.equal(p.readyRows,0);assert.match(p.rows[0].reason,/Multiple/);
});
test('identical metadata aggregates quantities but grades, portfolios and numberless products remain distinct',async()=>{
 const p=await buildCollectionPreviewV2(fixture().client,'owner',csv([basic,basic.replace(',2,',',3,'),basic.replace('Ungraded','PSA 10'),basic.replace('Private','Other'),basic.replace('007','')]));
 assert.equal(p.sourceRows,5);assert.equal(p.readyRows,3);assert.equal(p.readyCopies,7);assert.equal(p.reviewRows,2);assert.deepEqual(p.rows[0].sourceIndices,[0,1]);assert.equal(p.rows[0].quantity,5);assert.equal(p.rows[1].source.Grade,'PSA 10');assert.equal(p.rows[1].selection,null);assert.equal(p.rows[3].source['Card Number'],'');
});
for(const mode of ['failLate','repeated','wrongPrinting'])test('incomplete catalog fails the whole preview: '+mode,async()=>{
 await assert.rejects(buildCollectionPreviewV2(fixture({[mode]:true}).client,'owner',csv([basic])));
});
test('blank finish requires one governed printing, unsupported finish stays visible',async()=>{
 const p=await buildCollectionPreviewV2(fixture().client,'owner',csv([basic.replace('Reverse Holofoil',''),basic.replace('Reverse Holofoil','Glitter')]));assert.equal(p.readyRows,1);assert.equal(p.reviewRows,1);assert.equal(p.rows[1].source.Variance,'Glitter');
});

test('ambiguous candidates require an explicit choice and retain variant and printing identity',async()=>{
 const p=await buildCollectionPreviewV2(fixture({extraCard:true,sameFinish:true}).client,'owner',csv([basic,basic.replace(',2,',',3,')]));
 assert.equal(p.readyRows,0);assert.equal(p.reviewRows,2);
 const row=p.rows[0];assert.equal(row.review.selectedCardId,null);assert.equal(row.review.candidates.length,2);
 const stamped=row.review.candidates[1];assert.equal(stamped.variantKey,'play_pokemon_stamp');assert.equal(stamped.printedIdentityModifier,'prize_pack_stamp');assert.equal(stamped.setCode,'test');assert.equal(stamped.selection.cardPrintingId,'p2');
 const selected=chooseCollectionReviewCandidate(p,[0,1],'c2');
 assert.equal(selected.readyRows,2);assert.equal(selected.readyCopies,5);assert.equal(selected.reviewRows,0);
 assert.equal(selected.rows[0].selection.cardId,'c2');assert.equal(selected.rows[0].selection.cardPrintingId,'p2');assert.equal(selected.rows[0].review.selectedCardId,'c2');
 for(const field of ['source','sourceRecords','sourceIndices','quantity'])assert.deepEqual(selected.rows[0][field],row[field]);
 assert.equal(p.rows[0].selection,null);
 const changed=chooseCollectionReviewCandidate(selected,[0,1],'c1');assert.equal(changed.rows[0].selection.cardPrintingId,'p1');assert.equal(changed.readyCopies,5);
 assert.deepEqual(chooseCollectionReviewCandidate(changed,[0,1],null),p);
});

for(const options of [{missingPrinting:true},{sameFinish:true,duplicatePrinting:true},{sameFinish:true,inactive:true}])test('an unverified candidate stays visible but cannot be selected: '+JSON.stringify(options),async()=>{
 const p=await buildCollectionPreviewV2(fixture({extraCard:true,...options}).client,'owner',csv([basic]));
 assert.equal(p.readyRows,0);assert.equal(p.rows[0].review.candidates.length,2);
 assert.equal(p.rows[0].review.candidates[1].selection,null);assert.ok(p.rows[0].review.candidates[1].unavailableReason);
 assert.throws(()=>chooseCollectionReviewCandidate(p,[0],'c2'),/cannot be confirmed/);
 assert.equal(chooseCollectionReviewCandidate(p,[0],'c1').readyRows,1);
});

test('choices cannot resolve held grades, unsupported finishes, unknown cards or unknown groups',async()=>{
 const p=await buildCollectionPreviewV2(fixture({extraCard:true,sameFinish:true}).client,'owner',csv([basic,basic.replace('Ungraded','PSA 10'),basic.replace('Reverse Holofoil','Surge Foil')]));
 assert.equal(p.rows[1].review,undefined);assert.equal(p.rows[2].review,undefined);
 for(const [indices,id]of [[[1],'c1'],[[2],'c1'],[[9],'c1'],[[0],'foreign']])assert.throws(()=>chooseCollectionReviewCandidate(p,indices,id));
 assert.equal(p.readyRows,0);
});

test('blank finish does not expose a choice of different child finishes',async()=>{
 const p=await buildCollectionPreviewV2(fixture({extraCard:true,duplicatePrinting:true}).client,'owner',csv([basic.replace('Reverse Holofoil','')]));
 assert.equal(p.rows[0].review.candidates[1].selection,null);
 assert.throws(()=>chooseCollectionReviewCandidate(p,[0],'c2'));
});

test('manual choice keeps the 50000-copy limit and exact source grouping',async()=>{
 const p=await buildCollectionPreviewV2(fixture({extraCard:true,sameFinish:true}).client,'owner',csv([basic]));
 const excessive=structuredClone(p);excessive.rows[0].quantity=50001;
 assert.throws(()=>chooseCollectionReviewCandidate(excessive,[0],'c1'),/50,000/);
 const corrupt=structuredClone(p);corrupt.rows[0].review.candidates[0].selection.sourceIndices=[99];
 assert.throws(()=>chooseCollectionReviewCandidate(corrupt,[0],'c1'));
 assert.equal(p.readyRows,0);
});

for(const status of ['selection_required','ready','unavailable'])test('Jungle '+status+' remains review even when a finish could pick one parent',async()=>{
 const data={...JSON.parse(fs.readFileSync('tests/fixtures/jungle_edition_resolution_v1.json')),status};
 const f=fixture({extraCard:true,jungle:{data,error:null}});
 const p=await buildCollectionPreviewV2(f.client,'owner',csv([basic]));
 assert.equal(p.readyRows,0);assert.equal(p.readyCopies,0);assert.equal(p.reviewRows,1);assert.equal(p.rows[0].selection,null);assert.equal(p.rows[0].review,undefined);assert.throws(()=>chooseCollectionReviewCandidate(p,[0],'c1'),/no catalog choices/);
 assert.equal(p.rows[0].source['Portfolio Name'],'Private');assert.equal(p.rows[0].quantity,2);
 assert.match(p.rows[0].reason,/edition|First Edition/);assert.ok(!f.reads.some(([name])=>name==='get_public_card_printing_options_v1'));
});
for(const jungle of [{error:{code:'57014',message:'timeout'}},{data:{version:1,status:'ready',options:[]},error:null}])test('unavailable or malformed Jungle evidence cannot become a ready import',async()=>{
 const p=await buildCollectionPreviewV2(fixture({jungle}).client,'owner',csv([basic]));
 assert.equal(p.readyRows,0);assert.match(p.rows[0].reason,/could not be checked/);
});
test('non-governed Jungle special keeps exact finish matching',async()=>{
 const p=await buildCollectionPreviewV2(fixture({extraCard:true,jungle:{data:{version:1,status:'not_applicable',options:[]},error:null}}).client,'owner',csv([basic]));
 assert.equal(p.readyRows,1);assert.equal(p.rows[0].selection.cardId,'c1');assert.equal(p.rows[0].selection.cardPrintingId,'p1');
});
for(const status of ['selection_required','ready','unavailable'])test('named finish cannot bypass Jungle '+status+' hold',async()=>{
 const data={...JSON.parse(fs.readFileSync('tests/fixtures/jungle_edition_resolution_v1.json')),status};
 const p=await buildCollectionPreviewV2(fixture({primaryFinish:'cosmos_holo',jungle:{data,error:null}}).client,'owner',csv([basic.replace('Synthetic','Synthetic (Cosmos Holo)').replace('Reverse Holofoil','Holofoil')]));
 assert.equal(p.readyRows,0);assert.equal(p.rows[0].selection,null);assert.equal(p.rows[0].review,undefined);assert.match(p.rows[0].reason,/edition|First Edition/);
});

for(const status of ['selection_required','ready','unavailable'])test('catalog-supported artwork label cannot bypass Jungle '+status+' hold',async()=>{
 const c=artLabels.find(c=>c.expected);assert.ok(c);
 const data={...JSON.parse(fs.readFileSync('tests/fixtures/jungle_edition_resolution_v1.json')),status};
 const p=await buildCollectionPreviewV2(fixture({primaryFinish:'holo',primaryCard:{name:'Synthetic-EX',rarity:c.rarity,variant_key:c.variant},jungle:{data,error:null}}).client,'owner',csv([basic.replace('Synthetic',c.name).replace('Reverse Holofoil','Holofoil')]));
 assert.equal(p.readyRows,0);assert.equal(p.readyCopies,0);assert.equal(p.rows[0].selection,null);assert.match(p.rows[0].reason,/edition|First Edition/);
});
