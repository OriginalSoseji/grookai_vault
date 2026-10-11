import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionCatalogConflictIds} from '../../apps/web/src/lib/import/collectionCatalogConflicts.ts';
import {chooseCollectionReviewCandidate} from '../../apps/web/src/lib/import/collectionPreviewChoices.ts';
import {collectionReviewCounts, collectionReviewCsv, filterCollectionRows} from '../../apps/web/src/lib/import/collectionReviewWorkspace.ts';
import {buildCollectionPreviewV2} from '../../apps/web/src/lib/import/collectionPreviewV2.ts';

const candidate=(id,code,extra={})=>({cardId:id,gvId:`GV-${id}`,name:'Pikachu',number:'018',setName:'Example',setCode:code,variantKey:null,printedIdentityModifier:null,finish:'normal',selection:{sourceIndices:[0],cardId:id,gvId:`GV-${id}`,cardPrintingId:`printing-${id}`},unavailableReason:null,...extra});
const csv='Product Name,Category,Set,Card Number,Variance,Grade,Quantity\nPikachu,Pokemon,Example,018,Normal,Ungraded,2';
const source={'Product Name':'Pikachu',Category:'Pokemon',Set:'Example','Card Number':'018',Variance:'Normal',Grade:'Ungraded',Quantity:'2'};
function preview(candidates){return {ownerId:'synthetic',sourceRows:1,readyRows:0,readyCopies:0,reviewRows:1,rows:[{sourceIndices:[0],source,sourceRecords:[source],quantity:2,reason:'Review',selection:null,matchedName:null,finish:null,review:{reason:'Review',selectedCardId:null,candidates}}]};}

for(const [left,right] of [['tk-ex-latio','tk1b'],['2021swsh','mcd21'],['sv04.5','sv4pt5'],['pgo','swsh10.5'],['sv08.5','sv8pt5'],['sv06.5','sv6pt5']]) {
  test(`different catalog coordinates are not an owner variant choice: ${left}/${right}`,()=>{
    const candidates=[candidate('a',left),candidate('b',right,{number:'18',gvId:'GV-PK-PAF-18-S'})],p=preview(candidates),before=structuredClone(p);
    assert.deepEqual([...collectionCatalogConflictIds(candidates)],['a','b']);
    assert.equal(collectionReviewCounts(p).catalog,1);assert.equal(collectionReviewCounts(p).choices,0);
    assert.equal(filterCollectionRows(p,'review','catalog','pikachu').length,1);
    for(const id of ['a','b'])assert.throws(()=>chooseCollectionReviewCandidate(p,[0],id),/catalog records disagree/);
    assert.equal(collectionReviewCsv(p,csv).split('\r\n').filter(Boolean).length,2);
    assert.deepEqual(p,before);
  });
}
test('a distinct stamped candidate remains selectable beside held base records; undo retains every source field',()=>{
  const p=preview([candidate('a','one'),candidate('b','two'),candidate('stamp','one',{printedIdentityModifier:'prize_pack_stamp'})]);
  const chosen=chooseCollectionReviewCandidate(p,[0],'stamp');
  assert.equal(chosen.readyCopies,2);assert.equal(chosen.reviewRows,0);assert.equal(collectionReviewCounts(chosen).catalog,0);
  assert.deepEqual(chooseCollectionReviewCandidate(chosen,[0],null),p);
});
test('different explicit variants/names/numbers and same-set choices are not classified as cross-set conflicts',()=>{
  for(const extra of [{variantKey:'first_edition'},{printedIdentityModifier:'staff_stamp'},{name:'Raichu'},{number:'019'},{setCode:'one'},{setCode:''}]) {
    assert.equal(collectionCatalogConflictIds([candidate('a','one'),candidate('b','two',extra)]).size,0);
  }
});
test('classification ignores finish availability, rarity, prices and artificial GV suffixes',()=>{
  const a=candidate('a','one'),b=candidate('b','two',{finish:null,selection:null,gvId:'GV-PK-PAF-018-S',rarity:'Shiny Rare',price:100});
  assert.equal(collectionCatalogConflictIds([a,b]).size,2);
});
test('fresh preview keeps conflicting matches held and preserves exact source without extra catalog reads',async()=>{
  const sets=[{id:'s1',name:'Example',code:'one',game:'pokemon'},{id:'s2',name:'Example',code:'two',game:'pokemon'}];
  const cards=sets.map((s,i)=>({id:`c${i}`,gv_id:`GV-${i}`,name:'Pikachu',number:i?'18':'018',set_id:s.id,set_code:s.code,variant_key:null,printed_identity_modifier:null,identity_domain:'pokemon_eng_standard'}));
  const options=cards.map(c=>({id:`p-${c.id}`,card_print_id:c.id,finish_key:'normal',finish_is_active:true}));
  const tables=[];
  const client={from(table){tables.push(table);let after=null,scope=null;const q={select:()=>q,order:()=>q,limit:()=>q,gt:(_,v)=>{after=v;return q;},in:(key,values)=>{scope=[key,values];return q;},then(resolve){assert.ok(['sets','card_prints'].includes(table));resolve({data:(table==='sets'?sets:cards).filter(r=>(!after||r.id>after)&&(!scope||scope[1].includes(r[scope[0]]))),error:null});}};return q;},async rpc(name,args){assert.equal(name,'get_public_card_printing_options_v1');return {data:args.p_offset?[]:options,error:null};}};
  const p=await buildCollectionPreviewV2(client,'synthetic',csv);
  assert.equal(p.readyRows,0);assert.equal(p.reviewRows,1);assert.equal(p.rows[0].quantity,2);
  assert.match(p.rows[0].reason,/catalog repair/);assert.deepEqual(p.rows[0].source,source);
  for(const c of p.rows[0].review.candidates){assert.equal(c.selection,null);assert.match(c.unavailableReason,/catalog records disagree/);}
  assert.equal(collectionReviewCounts(p).catalog,1);assert.ok(tables.every(t=>['sets','card_prints'].includes(t)));
});
test('finish narrowing cannot hide a cross-set catalog conflict',async()=>{
  const sets=[{id:'s1',name:'Example',code:'one',game:'pokemon'},{id:'s2',name:'Example',code:'two',game:'pokemon'}];
  const cards=sets.map((s,i)=>({id:`c${i}`,gv_id:`GV-${i}`,name:'Pikachu',number:'018',set_id:s.id,set_code:s.code,variant_key:null,printed_identity_modifier:null,identity_domain:'pokemon_eng_standard'}));
  const options=[
    {id:'p-normal',card_print_id:'c0',finish_key:'normal',finish_is_active:true},
    {id:'p-holo',card_print_id:'c1',finish_key:'holo',finish_is_active:true},
  ];
  const client={from(table){let after=null,scope=null;const q={select:()=>q,order:()=>q,limit:()=>q,gt:(_,v)=>{after=v;return q;},in:(key,values)=>{scope=[key,values];return q;},then(resolve){resolve({data:(table==='sets'?sets:cards).filter(r=>(!after||r.id>after)&&(!scope||scope[1].includes(r[scope[0]]))),error:null});}};return q;},async rpc(name,args){assert.equal(name,'get_public_card_printing_options_v1');return {data:args.p_offset?[]:options,error:null};}};
  const p=await buildCollectionPreviewV2(client,'synthetic',csv);
  assert.equal(p.readyRows,0);assert.equal(p.reviewRows,1);
  assert.match(p.rows[0].reason,/catalog repair/);
  assert.deepEqual(p.rows[0].review.candidates.map(c=>[c.cardId,c.finish,c.selection]),[
    ['c0','normal',null],
    ['c1',null,null],
  ]);
  for(const c of p.rows[0].review.candidates)assert.match(c.unavailableReason,/catalog records disagree/);
});
