import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCollectionPreviewV2} from '../../apps/web/src/lib/import/collectionPreviewV2.ts';

const csv='Product Name,Category,Set,Card Number,Variance,Grade,Quantity\nSynthetic,Pokemon,Test,007,Reverse Holofoil,Ungraded,2';
const pad=n=>String(n).padStart(4,'0');
function fixture({failure=null}={}) {
 const sets=Array.from({length:105},(_,i)=>({id:'s'+pad(i),name:'Test',code:'test',game:'pokemon'}));
 const cards=sets.flatMap((set,i)=>[0,1].map(j=>({id:'c'+pad(209-i*2-j),set_id:set.id,gv_id:'GV-'+i+'-'+j,name:'Synthetic',number:'007/100',identity_domain:'pokemon_eng_standard',variant_key:'variant-'+j})));
 const prints=cards.map(c=>({id:'p'+c.id,card_print_id:c.id,finish_key:'reverse',finish_is_active:true}));
 const state={active:0,maxActive:0,setsStarted:new Set(),emptySets:new Set()};
 const client={from:table=>{
  let after=null,ids=null;
  const q={select:()=>q,order:()=>q,limit:()=>q,gt:(_,v)=>{after=v;return q;},in:(_,v)=>{ids=v;return q;},then:async resolve=>{
   if(table==='card_prints') {
    assert.equal(ids.length,1,'each read must have one indexed set scope');
    state.setsStarted.add(ids[0]);state.active++;state.maxActive=Math.max(state.maxActive,state.active);
    await new Promise(r=>setImmediate(r));
    state.active--;
    if(failure==='late'&&ids[0]==='s0001'&&after)return resolve({data:null,error:{code:'57014'}});
   }
   let rows=(table==='sets'?sets:table==='card_prints'?cards:[]).filter(r=>(!after||r.id>after)&&(!ids||ids.includes(r.set_id))).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,table==='sets'?13:1);
   if(table==='card_prints') {
    if(!rows.length)state.emptySets.add(ids[0]);
    if(failure==='wrong-set'&&ids[0]==='s0001'&&rows.length)rows=[{...rows[0],set_id:'s0002'}];
    if(failure==='repeat'&&ids[0]==='s0001'&&after)rows=[cards.find(c=>c.id===after)];
   }
   return resolve({data:rows,error:null});
  }};return q;
 },rpc:async(name,args)=>({data:prints.filter(p=>args.p_card_print_ids.includes(p.card_print_id)).slice(args.p_offset,args.p_offset+7),error:null})};
 return{client,state,cards};
}

test('105 sets remain complete across capped pages and retain stable ambiguity choices',async()=>{
 const f=fixture(),p=await buildCollectionPreviewV2(f.client,'owner',csv);
 assert.equal(p.readyRows,0);assert.equal(p.reviewRows,1);assert.equal(p.rows[0].quantity,2);
 const candidates=p.rows[0].review.candidates;
 assert.equal(candidates.length,210);assert.equal(new Set(candidates.map(c=>c.cardId)).size,210);
 assert.equal(f.state.setsStarted.size,105);assert.equal(f.state.emptySets.size,105);
 assert.equal(f.state.maxActive,4);assert.equal(f.state.active,0);
 // The established order sorts UUIDs within each 100-set partition, not by
 // completion time or set, and keeps the last five sets after that partition.
 assert.equal(candidates[0].cardId,'c0010');assert.equal(candidates[199].cardId,'c0209');
 assert.equal(candidates[200].cardId,'c0000');assert.equal(candidates[209].cardId,'c0009');
 for(const c of candidates){assert.deepEqual(c.selection.sourceIndices,[0]);assert.equal(c.selection.cardPrintingId,'p'+c.cardId);assert.equal(c.finish,'reverse');}
});

for(const failure of ['late','wrong-set','repeat'])test('catalog '+failure+' rejects the entire preview and drains active reads',async()=>{
 const f=fixture({failure});
 await assert.rejects(buildCollectionPreviewV2(f.client,'owner',csv));
 assert.equal(f.state.active,0);assert.ok(f.state.maxActive<=4);
 assert.deepEqual([...f.state.setsStarted].sort(),['s0000','s0001','s0002','s0003']);
});

test('an entirely unsupported export does not read the catalog',async()=>{
 const f=fixture(),p=await buildCollectionPreviewV2(f.client,'owner',csv.replace('Ungraded','PSA 10'));
 assert.equal(p.readyRows,0);assert.equal(p.reviewRows,1);assert.equal(f.state.setsStarted.size,0);
});
