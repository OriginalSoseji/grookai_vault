import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {buildCollectionPreviewV2} from '../../apps/web/src/lib/import/collectionPreviewV2.ts';
import {parseCsv} from '../../supabase/functions/vault-import-collection-v2/source.ts';
import {resolveTargets} from '../../supabase/functions/vault-import-collection-v2/handler.ts';
const cases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_retailer_scope_v1.json',import.meta.url)));
const cardId='11111111-1111-4111-8111-111111111111',printingId='22222222-2222-4222-8222-222222222222';
for(const c of cases)test('retailer preview and server: '+c.label,async()=>{
 const set={id:'33333333-3333-4333-8333-333333333333',name:'Generations',code:'g1',game:'pokemon'};
 const card={id:cardId,gv_id:'GV-RETAILER-TEST',set_id:set.id,sets:set,...c.card};
 const option={id:printingId,card_print_id:cardId,finish_key:c.catalogFinish??'holo',finish_is_active:c.active??true};
 const tables={sets:[set],card_prints:[card],card_print_identity:[]};
 const client={from(table){let after=null;const filters=[];const q={select:()=>q,order:()=>q,limit:()=>q,eq:(k,v)=>{filters.push(r=>r[k]===v);return q;},in:(k,v)=>{filters.push(r=>v.includes(r[k]));return q;},gt:(k,v)=>{after=v;return q;},then:resolve=>Promise.resolve({data:tables[table].filter(r=>(!after||r.id>after)&&filters.every(f=>f(r))),error:null}).then(resolve)};return q;},rpc:async(name,a)=>{assert.equal(name,'get_public_card_printing_options_v1');const options=c.missingPrinting?[]:[option,...(c.duplicatePrinting?[{...option,id:'44444444-4444-4444-8444-444444444444'}]:[])];return{data:options.filter(p=>a.p_card_print_ids.includes(p.card_print_id)).slice(a.p_offset,a.p_offset+1),error:null};}};
 const csv=`Category,Product Name,Set,Card Number,Quantity,Variance,Grade,Average Cost Paid\n${c.category??'Pokemon'},${c.sourceName},${c.sourceSet},${c.sourceNumber},2,${c.variance??'Holofoil'},Ungraded,4.25`;
 const source=parseCsv(csv),original=structuredClone(source),p=await buildCollectionPreviewV2(client,'owner',csv);
 assert.equal(p.readyCopies,c.expected?2:0);assert.deepEqual(p.rows[0].source,original[0]);
 const selected=[{sourceIndices:[0],cardId,gvId:card.gv_id,cardPrintingId:printingId}];
 if(c.expected){const targets=await resolveTargets(client,source,selected);assert.equal(targets[0].desiredQuantity,2);assert.equal(targets[0].acquisitionCost,4.25);assert.equal(targets[0].finishKey,'holo');assert.equal(p.rows[0].selection.cardPrintingId,printingId);}
 else await assert.rejects(resolveTargets(client,source,selected),/import_card_identity_mismatch|import_printing_identity_mismatch|import_printing_requires_review/);
 assert.deepEqual(source,original);
});
