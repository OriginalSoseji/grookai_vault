import test from 'node:test';
import assert from 'node:assert/strict';
import {SquareCommerceService} from '../commerce_service_v2.mjs';
import {squareArchiveRecoveryTarget,squareAwareVaultArchive} from '../vault_archive_recovery_v1.mjs';
const owner='ee000000-0000-4000-8000-000000000001',instance='ee000000-0000-4000-8000-000000000002';
const connection='ee000000-0000-4000-8000-000000000003',target='ee000000-0000-4000-8000-000000000004';
const gvvi='GVVI-EE000000-000001';
const reserved=id=>({code:'55000',message:'square_stock_reserved',details:JSON.stringify({kind:'square_vault_removal_v1',instanceId:id,gvvi})});
test('normal archive does not contact Square',async()=>{
 let requests=0;const receipt={data:{archived_instance_id:instance},error:null};
 assert.equal(await squareAwareVaultArchive({archive:async()=>receipt,prepare:async()=>{requests++;}}),receipt);
 assert.equal(requests,0);
});
test('only the rollback exact-copy target can be prepared, then the same owner archive is retried',async()=>{
 const calls=[];let attempts=0;
 const result=await squareAwareVaultArchive({archive:async()=>{calls.push('archive');return ++attempts===1?{data:null,error:reserved(instance)}:{data:{archived_instance_id:instance},error:null};},
  prepare:async id=>{calls.push(id);return{status:'ready_to_archive',instanceId:id,gvvi};}});
 assert.equal(result.data.archived_instance_id,instance);assert.deepEqual(calls,['archive',instance,'archive']);
});
test('bulk request can prepare each encountered exact copy while retaining the atomic original writer',async()=>{
 const other='ee000000-0000-4000-8000-000000000005';let attempts=0;const prepared=[];
 const result=await squareAwareVaultArchive({archive:async()=>({data:++attempts===3?{removed:2}:null,error:attempts<3?reserved(attempts===1?instance:other):null}),
  prepare:async id=>{prepared.push(id);return{status:'ready_to_archive',instanceId:id,gvvi};}});
 assert.equal(result.data.removed,2);assert.deepEqual(prepared,[instance,other]);
});
test('reservation errors without the structured server proof never trigger a withdrawal',async()=>{
 for(const error of[{...reserved(instance),details:null},{...reserved(instance),details:'Internal Server Error'},
  {...reserved(instance),code:'42501'},{...reserved(instance),message:'ebay_stock_reserved'},
  reserved('invalid'),{...reserved(instance),details:JSON.stringify({kind:'other',instanceId:instance,gvvi})}]){
  let calls=0;const result=await squareAwareVaultArchive({archive:async()=>({error}),prepare:async()=>{calls++;}});
  assert.equal(result.error,error);assert.equal(calls,0);
 }
 assert.equal(squareArchiveRecoveryTarget(reserved(instance)).instanceId,instance);
});
test('uncertain transport never replays archive and repeated or mismatched proof never loops',async()=>{
 let calls=0;await assert.rejects(squareAwareVaultArchive({archive:async()=>{calls++;throw Error('transport uncertain');},prepare:async()=>{throw Error('must not prepare');}}),/transport uncertain/);assert.equal(calls,1);
 calls=0;await assert.rejects(squareAwareVaultArchive({archive:async()=>{calls++;return{error:reserved(instance)};},prepare:async()=>{throw Error('provider uncertain');}}),/provider uncertain/);assert.equal(calls,1);
 let prepares=0;const repeated=await squareAwareVaultArchive({archive:async()=>({error:reserved(instance)}),prepare:async()=>{prepares++;return{status:'ready_to_archive',instanceId:instance,gvvi};}});
 assert.equal(prepares,1);assert.equal(repeated.error.message,'square_removal_unconfirmed');
 const wrong=await squareAwareVaultArchive({archive:async()=>({error:reserved(instance)}),prepare:async()=>({status:'ready_to_archive',instanceId:target,gvvi})});
 assert.equal(wrong.error.message,'square_removal_unconfirmed');
});
function serviceFixture({quantity=0,attestError=false}={}){
 const calls=[];
 const rpc=async(action,data)=>{
  calls.push({action,data});
  if(action==='vault_removal_context')return{instanceId:instance,gvvi,archived:false,claims:[{connectionId:connection,targetId:target}]};
  if(action==='allocation')return{target:{id:target,instance_id:instance,variation_id:'local-variation'}};
  if(action==='vault_removal_attest'){if(attestError)throw Object.assign(Error('square_removal_unconfirmed'),{code:'square_removal_unconfirmed'});return{status:'ready_to_archive',instanceId:instance,gvvi};}
  return{recorded:true};
 };
 const catalog={withConnection:async(actor,id,run)=>{
  assert.equal(actor,owner);assert.equal(id,connection);
  return run({connection:{location_id:'local-location'},context:{ownerId:owner,connectionId:connection,leaseToken:'fenced-local-lease',fence:7},
   client:{inventoryQuantity:async(variation,location)=>{calls.push({action:'provider_quantity'});assert.equal(variation,'local-variation');assert.equal(location,'local-location');return quantity;}}});
 }};
 const service=new SquareCommerceService({catalog,rpc,config:{}});
 service.withdraw=async(actor,id,t)=>{assert.equal(actor,owner);assert.equal(id,connection);assert.equal(t,target);calls.push({action:'withdraw'});};
 service.reconcile=async()=>{calls.push({action:'reconcile'});};
 return{service,calls};
}
test('preparation withdraws, reconciles and reads actual zero before a fenced attestation and durable success',async()=>{
 const{service,calls}=serviceFixture();const result=await service.prepareVaultRemoval(owner,instance);
 assert.equal(result.status,'ready_to_archive');
 assert.deepEqual(calls.map(c=>c.action),['vault_removal_context','commerce_run_start','withdraw','reconcile','allocation','provider_quantity','vault_removal_attest','commerce_run_finish']);
 const proof=calls.find(c=>c.action==='vault_removal_attest').data;
 assert.equal(proof.quantity,0);assert.equal(proof.instanceId,instance);assert.equal(proof.fence,7);
 assert.equal('physicalCopyPresent'in proof,false);assert.equal('registerOnline'in proof,false);
 assert.equal(calls.at(-1).data.result.status,'succeeded');
});
test('nonzero provider stock or rejected authority is persisted as failed and never becomes permission to archive',async()=>{
 for(const options of[{quantity:1},{attestError:true}]){
  const{service,calls}=serviceFixture(options);await assert.rejects(service.prepareVaultRemoval(owner,instance));
  assert.equal(calls.at(-1).action,'commerce_run_finish');assert.equal(calls.at(-1).data.result.status,'failed');
  if(options.quantity===1)assert.equal(calls.some(c=>c.action==='vault_removal_attest'),false);
 }
});
test('invalid target identities are rejected before provider work',async()=>{
 const{service,calls}=serviceFixture();await assert.rejects(service.prepareVaultRemoval(owner,'not-an-instance'));
 assert.equal(calls.length,0);
});
