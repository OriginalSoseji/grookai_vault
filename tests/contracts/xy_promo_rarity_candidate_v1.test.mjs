import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {evaluateXyPromoCandidate} from '../../backend/pokemon/xy_promo_rarity_candidate_v1.mjs';
const x=JSON.parse(fs.readFileSync(new URL('../../docs/audits/xy_promo_rarity_review_20261118/xy-pair-frozen-readback.json',import.meta.url)));
const completed=JSON.parse(fs.readFileSync(new URL('../../docs/audits/xy_promo_rarity_review_20261118/xy-pair-postsync-readback.json',import.meta.url)));
function inputFor(parent,data=x){
 const mappings=data.mappings.filter(m=>m.card_print_id===parent.id),id=mappings.find(m=>m.source==='tcgplayer').external_id;
 const product=data.products.find(p=>String(p.row.product_id)===id).row,group=data.groups.find(g=>g.row.group_id===product.group_id).row;
 return {parent,set:data.sets.find(s=>s.id===parent.set_id),identities:data.identities.filter(i=>i.card_print_id===parent.id),
  traits:data.traits.filter(t=>t.card_print_id===parent.id),mappings,raw:data.raw,product,group,
  groupSets:data.groupSets.find(g=>g.group_id===group.group_id),runs:data.runs};
}
test('running source sync holds both cards instead of creating corrections',()=>{
 for(const parent of x.parents)assert.equal(evaluateXyPromoCandidate(inputFor(parent)).status,'completed_source_sync_required');
});
test('exact pair requires current complete source, preserved conflicting trait and exact identity',()=>{
 for(const parent of completed.parents){
  const input=inputFor(parent,completed);
  assert.equal(evaluateXyPromoCandidate(input).status,'candidate_only');
  assert.notEqual(evaluateXyPromoCandidate({...input,parent:{...parent,rarity:'Rare'}}).status,'candidate_only');
  assert.notEqual(evaluateXyPromoCandidate({...input,identities:[]}).status,'candidate_only');
  assert.notEqual(evaluateXyPromoCandidate({...input,traits:[{...input.traits[0],rarity:'Promo'}]}).status,'candidate_only');
  const current=input.raw.find(r=>r.source==='pokemonapi'&&r.payload._external_id===`xyp-${parent.number}`);
  assert.notEqual(evaluateXyPromoCandidate({...input,raw:[...input.raw,{...current,id:'999999999',ingested_at:'2099-01-01T00:00:00Z'}]}).status,'candidate_only');
  assert.notEqual(evaluateXyPromoCandidate({...input,product:{...input.product,payload_hash:'0'.repeat(64)}}).status,'candidate_only');
  assert.notEqual(evaluateXyPromoCandidate({...input,mappings:input.mappings.map(m=>m.source==='pokemonapi'?{...m,owners:2}:m)}).status,'candidate_only');
  assert.notEqual(evaluateXyPromoCandidate({...input,runs:input.runs.map(r=>({...r,failed_count:1}))}).status,'candidate_only');
 }
});
