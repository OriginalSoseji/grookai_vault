import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCollectionPreviewV2} from '../../apps/web/src/lib/import/collectionPreviewV2.ts';
const csv=(rows)=>['Product Name,Category,Set,Card Number,Variance,Grade,Quantity,Portfolio Name',...rows].join('\n');
const basic='Synthetic,Pokemon,Test,007,Reverse Holofoil,Ungraded,2,Private';
function fixture({extraCard=false,missingPrinting=false,failLate=false,repeated=false,wrongPrinting=false}={}){
 const sets=[{id:'s1',name:'Test',game:'pokemon'}];
 const cards=[{id:'c1',set_id:'s1',gv_id:'GV-1',name:'Synthetic',number:'7/100',identity_domain:'pokemon_eng_standard'}];
 if(extraCard)cards.push({...cards[0],id:'c2',gv_id:'GV-2'});
 const printings=[{id:'p1',card_print_id:'c1',finish_key:'reverse',finish_is_active:true}];
 if(extraCard&&!missingPrinting)printings.push({id:'p2',card_print_id:'c2',finish_key:'normal',finish_is_active:true});
 const reads=[];
 const client={from:table=>{let after=null,filter=null;const q={select:()=>q,order:()=>q,limit:()=>q,gt:(_,v)=>{after=v;return q;},in:(k,v)=>{filter=[k,v];return q;},eq:()=>q,then:resolve=>{
  reads.push([table,after]);let rows=table==='sets'?sets:table==='card_prints'?cards:[];
  if(failLate&&table==='card_prints'&&after)return resolve({data:null,error:{message:'offline'}});
  rows=rows.filter(r=>(!after||repeated||r.id>after)&&(!filter||filter[1].includes(r[filter[0]]))).slice(0,1);
  return resolve({data:rows,error:null});}};return q;},rpc:async(_,a)=>({data:printings.filter(p=>a.p_card_print_ids.includes(p.card_print_id)).slice(a.p_offset,a.p_offset+1).map(p=>wrongPrinting?{...p,card_print_id:'foreign'}:p),error:null})};
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
