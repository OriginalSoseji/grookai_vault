import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCollectionImportHandler} from '../../supabase/functions/vault-import-collection-v2/handler.ts';
// Keep fixtures local: importing another test file would register its tests twice.
const row={'Product Name':'Synthetic card',Category:'Pokemon',Set:'151','Card Number':'65',Variance:'Reverse Holofoil',Grade:'Ungraded','Card Condition':'LP',Quantity:'2','Average Cost Paid':'4.25','Portfolio Name':'Private'};
const toCsv=rows=>{const keys=Object.keys(rows[0]);return[keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');};
const owner=randomUUID(),cardId=randomUUID(),printing=randomUUID(),requestId=randomUUID();
const selection={sourceIndices:[0],cardId,gvId:'GV-TEST',cardPrintingId:printing};
function fixture(options={}) {
 const writes=[],reads=[];
 const client={from:()=>{
  let after=null;const query={select:()=>query,in:()=>query,gt:(_,value)=>{after=value;return query;},order:()=>query,limit:async()=>{
   reads.push({after});return {error:options.catalogError??null,data:after?[]:[{id:cardId,gv_id:'GV-TEST',name:'Synthetic card',number:'065/165',sets:{name:'151',game:'pokemon'},...options.card}]};
  }};return query;
 },rpc:async(name,args)=>{
  reads.push({name,args});return{error:options.printingError??null,data:args.p_offset?[]:[{id:printing,card_print_id:cardId,finish_key:'reverse',finish_is_active:true,...options.printing},...(options.extraPrintings??[])]};
 }};
 const handler=createCollectionImportHandler({requireUser:async()=>{if(options.authError)throw{code:options.authError};return{userId:owner,sb:client};},createServiceRoleClient:()=>({rpc:async(name,args)=>{
  writes.push({name,args});if(options.transportLoss)throw Error('response lost');
  return{error:options.rpcError??null,data:{success:true,requestId:args.p_request_id,sourceSha256:args.p_source_sha256,sourceRows:args.p_source_rows.length,reviewRows:args.p_source_rows.length-args.p_targets.reduce((n,t)=>n+t.sourceIndices.length,0),importedCards:args.p_targets.reduce((n,t)=>n+t.desiredQuantity,0),importedEntries:args.p_targets.length,
   targets:args.p_targets.map(t=>({...t,instanceIds:Array.from({length:t.desiredQuantity},()=>randomUUID())})),...options.response}};
 }})});
 return{writes,reads,send:(override={})=>handler(new Request('http://localhost/import',{method:'POST',body:JSON.stringify({ownerUserId:owner,requestId,csvText:toCsv([row]),targets:[selection],...override})}))};
}
test('one authenticated atomic save derives metadata from original CSV',async()=>{
 const f=fixture();const response=await f.send({targets:[{...selection,desiredQuantity:900,condition:'NM',acquisitionCost:999}]});
 assert.equal(response.status,200);assert.equal(f.writes.length,1);
 const {name,args}=f.writes[0];assert.equal(name,'admin_import_vault_collection_v2');assert.equal(args.p_user_id,owner);assert.equal(args.p_request_id,requestId);
 assert.equal(args.p_targets[0].desiredQuantity,2);assert.equal(args.p_targets[0].condition,'LP');assert.equal(args.p_targets[0].finishKey,'reverse');assert.equal(args.p_targets[0].acquisitionCost,4.25);assert.deepEqual(args.p_source_rows,[row]);
 assert.equal(f.reads.filter(r=>'after'in r).length,2);assert.deepEqual(f.reads.filter(r=>r.args).map(r=>r.args.p_offset),[0,1]);
});
for(const [name,override] of Object.entries({owner:{ownerUserId:randomUUID()},request:{requestId:'invalid'},duplicate:{targets:[selection,selection]},outOfRange:{targets:[{...selection,sourceIndices:[1]}]},fraction:{targets:[{...selection,sourceIndices:[0.5]}]},grade:{csvText:toCsv([{...row,Grade:'PSA 10'}])},mismatchedName:{csvText:toCsv([{...row,'Product Name':'Different'}])}}))test(`rejects ${name} before writer`,async()=>{const f=fixture();assert.ok((await f.send(override)).status>=400);assert.equal(f.writes.length,0);});
for(const options of [{authError:'invalid_jwt'},{authError:'server_misconfigured'},{catalogError:{}},{printingError:{}},{printing:{finish_key:'holo'}},{card:{sets:{name:'151',game:'mtg'}}},{extraPrintings:[{id:randomUUID(),card_print_id:cardId,finish_key:'reverse',finish_is_active:true}]}])test('unavailable or ambiguous identity fails closed',async()=>{const f=fixture(options);assert.ok((await f.send()).status>=400);assert.equal(f.writes.length,0);});
test('unresolved rows can be retained without creating inventory',async()=>{const f=fixture();const r=await f.send({targets:[],csvText:toCsv([{...row,Grade:'PSA 10'}])});assert.equal(r.status,200);assert.equal((await r.json()).reviewRows,1);assert.equal(f.writes[0].args.p_targets.length,0);});
test('different purchase metadata cannot collapse into one target',async()=>{const f=fixture();const r=await f.send({csvText:toCsv([row,{...row,'Average Cost Paid':'99'}]),targets:[{...selection,sourceIndices:[0,1]}]});assert.equal(r.status,400);assert.equal(f.writes.length,0);});
test('same-metadata records retain originals and sum only their quantities',async()=>{const f=fixture();assert.equal((await f.send({csvText:toCsv([row,{...row,Quantity:'3'}]),targets:[{...selection,sourceIndices:[1,0]}]})).status,200);assert.equal(f.writes[0].args.p_targets[0].desiredQuantity,5);assert.equal(f.writes[0].args.p_source_rows.length,2);});
for(const options of [{transportLoss:true},{rpcError:{}},{response:{requestId:randomUUID()}},{response:{targets:[]}},{response:{importedCards:900}}])test('uncertain result never reports successful import or falls back',async()=>{const f=fixture(options);const r=await f.send();assert.equal(r.status,503);assert.equal((await r.json()).error,'import_outcome_unconfirmed');assert.equal(f.writes.length,1);});
