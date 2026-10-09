import test from 'node:test';
import assert from 'node:assert/strict';
import {sealedMetadata} from '../../supabase/functions/vault-import-collection-v2/sealed_metadata.ts';
import {sealedSelections,resolveSealedTargets} from '../../supabase/functions/vault-import-collection-v2/sealed_targets.ts';
import {createImportHandlerV3} from '../../supabase/functions/vault-import-collection-v2/handler_v3.ts';
import {verifySealedImportReadback} from '../../supabase/functions/vault-import-collection-v2/sealed_readback.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const row=(extra={})=>({Category:'Pokemon',Set:'Example','Product Name':'Example Booster Box','Card Number':'',Quantity:'2',Grade:'Ungraded',Variance:'Normal','Card Condition':'Near Mint','Average Cost Paid':'0','Date Added':'9/30/2026',Notes:' original\nnotes ','Portfolio Name':'Private',...extra});
const csv=rows=>{const headers=[...new Set(rows.flatMap(r=>Object.keys(r)))],q=s=>'"'+s.replaceAll('"','""')+'"';return [headers,...rows.map(r=>headers.map(h=>r[h]??''))].map(r=>r.map(q).join(',')).join('\r\n');};
const variant={variantId:id(1),familyId:id(2),name:'Example Booster Box',game:'pokemon',packageForm:'booster_box',language:'en',region:null,edition:null,wave:null,identityFingerprint:'a'.repeat(64),releaseId:id(3),releaseState:'frozen',memberMappingId:id(4),mappingId:id(4),mappingVariantId:id(1),mappingStatus:'exact_reviewed',reviewDecision:'confirmed_sealed',promotionAuthorized:true,sourceName:'Example Booster Box',sourceSet:'Example'};
const catalog={releases:[{game:'pokemon',releaseId:id(3),state:'frozen',expectedMembers:1}],variants:[variant]};
test('zero cost needs explicit currency; original condition is never converted to sealed condition',()=>{
 assert.throws(()=>sealedMetadata(row()),/currency_requires_review/);
 const result=sealedMetadata(row(),'usd');
 assert.deepEqual(result,{quantity:2,sealState:'unknown',packageCondition:'unknown',acquisitionCost:0,acquisitionCurrency:'USD',createdAt:'2026-09-30T00:00:00.000Z',createdAtDateOnly:true,notes:' original\nnotes '});
});
test('blank cost is not market price; exact timestamp and notes are retained',()=>{
 const r=sealedMetadata(row({'Average Cost Paid':'','Market Price (As of 2026)':'99.99','Date Added':'2026-09-30T12:14:16.123456-06:00'}));
 assert.equal(r.acquisitionCost,null);assert.equal(r.acquisitionCurrency,null);assert.equal(r.createdAt,'2026-09-30T12:14:16.123456-06:00');assert.equal(r.createdAtDateOnly,false);
});
for(const [name,extra,code]of [
 ['conflicting currency',{Currency:'CAD'},'conflicting_import_currency'],['excess cost precision',{'Average Cost Paid':'2.34567'},'invalid_import_cost'],
 ['negative',{'Average Cost Paid':'-1'},'invalid_import_cost'],['malformed commas',{'Average Cost Paid':'1,2'},'invalid_import_cost'],
 ['too large',{'Average Cost Paid':'10000000000'},'invalid_import_cost'],['conflicting cost',{Cost:'3'},'conflicting_sealed_metadata'],
 ['invalid day',{'Date Added':'2026-02-30'},'invalid_import_date'],['naive time',{'Date Added':'2026-09-30T01:02:03'},'invalid_import_date'],
 ['excess precision',{'Date Added':'2026-09-30T01:02:03.1234567Z'},'invalid_import_date_precision'],
 ['extra meaningful field',{'Certificate':'123'},'import_column_requires_review'],['override',{'Price Override':'10'},'import_column_requires_review'],
 ['graded',{Grade:'PSA 10'},'unsupported_sealed_source'],['watchlist',{Watchlist:'true'},'unsupported_sealed_source'],
 ['numbered',{'Card Number':'12'},'unsupported_sealed_source'],['secondary number',{Number:'12'},'unsupported_sealed_source'],['finish',{Variance:'Foil'},'unsupported_sealed_source'],
 ['ambiguous quantity',{Quantity:'1,,2'},'invalid_import_quantity'],['conflicting identity',{'Card Name':'Another box'},'conflicting_sealed_metadata'],
])test(name,()=>assert.throws(()=>sealedMetadata(row(extra),'USD'),new RegExp(code)));
test('recorded currency and decimal money preserved without rounding',()=>{const r=sealedMetadata(row({Currency:'CAD','Average Cost Paid':'$1,234.50'}));assert.equal(r.acquisitionCost,1234.5);assert.equal(r.acquisitionCurrency,'CAD');});

for(const [raw,expected] of [['45.0000',45],['34.9900',34.99],['$1,234.5000',1234.5],['0.0000',0],['9999999999.9900',9999999999.99],['9.9950',9.995],['4.9980',4.998],['0.0001',0.0001],['1.234000',1.234],['1.0001',1.0001],['9999999999.9899',9999999999.9899]])test('exact average cost and original source survive save serialization: '+raw,async()=>{
 const original=row({'Average Cost Paid':raw}),before=structuredClone(original);
 assert.equal(sealedMetadata(original,'USD').acquisitionCost,expected);assert.deepEqual(original,before);
 const h=harness(),p=input();p.csvText=csv([original]);
 assert.equal((await h.handler(request(p))).status,200);
 assert.equal(h.saved.p_sealed_targets[0].acquisitionCost,expected);assert.deepEqual(h.saved.p_source_rows,[original]);
 assert.equal(JSON.parse(JSON.stringify(h.saved)).p_sealed_targets[0].acquisitionCost,expected);
});
for(const raw of ['0.00001','1.23001','1.234001','9999999999.9901','1.00e0','NaN','Infinity','-Infinity'])test('unsupported precision, bounds and malformed costs remain held: '+raw,async()=>{
 assert.throws(()=>sealedMetadata(row({'Average Cost Paid':raw}),'USD'),/invalid_import_cost/);
 const h=harness(),p=input();p.csvText=csv([row({'Average Cost Paid':raw})]);
 assert.equal((await h.handler(request(p))).status,400);assert.equal(h.saved,undefined);
});
test('padded zero still requires explicit currency',()=>assert.throws(()=>sealedMetadata(row({'Average Cost Paid':'0.0000'})),/currency_requires_review/));
test('source overlap with card selection rejects',()=>assert.throws(()=>sealedSelections([{sealedVariantId:id(1),sourceIndices:[0]}],2,new Set([0])),/source_indices/));
test('duplicate and out of bounds selections reject',()=>{for(const sourceIndices of [[0,0],[2],[-1],[0.5]])assert.throws(()=>sealedSelections([{sealedVariantId:id(1),sourceIndices}],2));});
test('compatible source groups aggregate quantities but keep source indices',()=>{
 const result=resolveSealedTargets(csv([row(),row({Quantity:'3'})]),catalog,[{sealedVariantId:id(1),sourceIndices:[0,1]}],'USD');
 assert.equal(result[0].desiredQuantity,5);assert.equal(result[0].mappingId,id(4));assert.deepEqual(result[0].sourceIndices,[0,1]);assert.equal(result[0].objectKind,'sealed');
});
test('distinct portfolios and notes cannot be merged into one source group',()=>{for(const extra of [{'Portfolio Name':'Other'},{Notes:'Other'}])assert.throws(()=>resolveSealedTargets(csv([row(),row(extra)]),catalog,[{sealedVariantId:id(1),sourceIndices:[0,1]}],'USD'),/incompatible/);});
test('catalog release or selection identity cannot be forged',()=>{
 assert.throws(()=>resolveSealedTargets(csv([row()]),catalog,[{sealedVariantId:id(99),sourceIndices:[0]}],'USD'),/identity_requires_review/);
 assert.throws(()=>resolveSealedTargets(csv([row()]),{...catalog,variants:[]},[{sealedVariantId:id(1),sourceIndices:[0]}],'USD'),/incomplete/);
});
const input=()=>({requestId:id(50),ownerUserId:id(51),csvText:csv([row()]),targets:[],sealedTargets:[{sealedVariantId:id(1),sourceIndices:[0]}],sealedAcquisitionCurrency:'USD'});
const request=p=>new Request('http://local.test/import',{method:'POST',body:JSON.stringify(p)});
function harness({receipt=null,catalogValue=catalog,writeError=false,alter=r=>r,allowNewRequest=true}={}){
 const calls=[];let saved;
 const client={from:()=>{throw Error('unexpected card catalog');},rpc:async(name,args)=>{calls.push(name);return {error:null,data:name==='get_collection_import_receipt_v3'?receipt:catalogValue};}};
 const handler=createImportHandlerV3({allowNewRequest,requireUser:async()=>({userId:id(51),sb:client}),createServiceRoleClient:()=>({rpc:async(name,args)=>{
   calls.push(name);saved=args;
   return {error:writeError?{message:'lost response'}:null,data:alter({success:true,version:3,requestId:args.p_request_id,sourceSha256:args.p_source_sha256,sourceRows:1,reviewRows:0,importedCards:0,importedSealed:2,importedEntries:1,targets:[],sealedTargets:[{objectKind:'sealed',sourceIndices:[0],sealedVariantId:id(1),instanceIds:[id(60),id(61)]}]})};
 }})});
 return {handler,calls,get saved(){return saved;}};
}
test('adapter derives all metadata and uses one atomic RPC',async()=>{
 const h=harness(),p=input();p.sealedTargets[0].acquisitionCost=999;p.sealedTargets[0].sealState='factory_sealed';
 const response=await h.handler(request(p));assert.equal(response.status,200);
 assert.deepEqual(h.calls,['get_collection_import_receipt_v3','get_collection_import_sealed_catalog_v3','admin_import_vault_collection_v3']);
 assert.equal(h.saved.p_sealed_targets[0].acquisitionCost,0);assert.equal(h.saved.p_sealed_targets[0].sealState,'unknown');assert.deepEqual(h.saved.p_source_rows,[row()]);
});
test('successful recovery bypasses unavailable catalog and never writes again',async()=>{
 const first=harness(),response=await first.handler(request(input())),receipt=await response.json();
 const recovered=harness({receipt,catalogValue:null});assert.equal((await recovered.handler(request(input()))).status,200);assert.deepEqual(recovered.calls,['get_collection_import_receipt_v3']);
});
test('disabled web rollout rejects new requests but recovers durable success',async()=>{
 const blocked=harness({allowNewRequest:false});assert.equal((await blocked.handler(request(input()))).status,422);assert.deepEqual(blocked.calls,['get_collection_import_receipt_v3']);
 const first=harness(),receipt=await (await first.handler(request(input()))).json();
 const recovered=harness({allowNewRequest:false,receipt});assert.equal((await recovered.handler(request(input()))).status,200);assert.deepEqual(recovered.calls,['get_collection_import_receipt_v3']);
});
test('conflicting durable request is visible without catalog or save',async()=>{
 const h=harness({receipt:{success:false,requestId:id(50),error:'import_request_conflict'}});
 assert.equal((await h.handler(request(input()))).status,409);assert.equal(h.calls.length,1);
});
test('lost response remains unconfirmed with the original UUID',async()=>{
 const h=harness({writeError:true}),r=await h.handler(request(input()));assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'import_outcome_unconfirmed',requestId:id(50)});
});
for(const [name,alter]of [
 ['duplicate copies',r=>({...r,sealedTargets:[{...r.sealedTargets[0],instanceIds:[id(60),id(60)]}]})],
 ['missing copies',r=>({...r,sealedTargets:[]})],['overreported additions',r=>({...r,importedSealed:3})],
 ['wrong source',r=>({...r,sourceSha256:'f'.repeat(64)})],['wrong variant',r=>({...r,sealedTargets:[{...r.sealedTargets[0],sealedVariantId:id(99)}]})],
])test(`untrusted receipt: ${name}`,async()=>assert.equal((await harness({alter}).handler(request(input()))).status,503));
test('account switch and missing currency cannot reach writer',async()=>{
 const h=harness();assert.equal((await h.handler(request({...input(),ownerUserId:id(99)}))).status,409);
 assert.equal((await h.handler(request({...input(),sealedAcquisitionCurrency:null}))).status,400);assert.equal(h.calls.length,0);
});
async function readbackFixture(change=()=>{}) {
 const h=harness(),attempt=input(),receipt=await (await h.handler(request(attempt))).json();
 const data={document:[row()],groups:[{group_key:'b'.repeat(64),source_indices:[0],instance_ids:[id(60),id(61)],target:h.saved.p_sealed_targets[0]}],
  copies:[{id:id(60),sealed_product_variant_id:id(1),archived_at:'2026-10-01',notes:'owner edited'},{id:id(61),sealed_product_variant_id:id(1)}]};
 change(data,receipt,attempt);
 const reads=[];
 const client={from:name=>{let after=null;const query={select:()=>query,eq:()=>query,order:()=>query,limit:()=>query,gt:(_,v)=>{after=v;return query;},
  single:async()=>({data:{source_rows:data.document},error:null}),then:(resolve,reject)=>Promise.resolve({data:data.groups.filter(g=>after===null||g.group_key>after),error:null}).then(resolve,reject)};return query;},
 rpc:async(name,args)=>{reads.push({name,args});return{data:data.copies,error:null};}};
 return {verify:()=>verifySealedImportReadback(client,attempt,receipt),reads};
}
test('sealed readback verifies source, immutable target and archived/edited exact copies',async()=>{
 const f=await readbackFixture();await f.verify();assert.equal(f.reads.length,1);assert.equal(f.reads[0].name,'get_collection_import_sealed_copies_v3');
});
for(const [name,change]of [
 ['missing copy',d=>d.copies.pop()],['wrong variant',d=>d.copies[0].sealed_product_variant_id=id(99)],
 ['wrong source',d=>d.document[0].Notes='changed'],['wrong group target',d=>d.groups[0].target.acquisitionCost=10],
 ['missing group',d=>d.groups=[]],['duplicate mapping',d=>d.groups.push({...d.groups[0],group_key:'c'.repeat(64)})],
 ['wrong review count',(_,r)=>r.reviewRows=1],['unmapped extra copy',d=>d.copies.push({id:id(70),sealed_product_variant_id:id(1)})],
])test(`sealed readback rejects ${name}`,async()=>assert.rejects((await readbackFixture(change)).verify(),/readback_unconfirmed/));
