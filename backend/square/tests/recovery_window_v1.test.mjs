import test from 'node:test';
import assert from 'node:assert/strict';
import {SquareCommerceService} from '../commerce_service_v2.mjs';
import {squareEnvironmentConfig} from '../service_v1.mjs';

const owner='c1000000-0000-4000-8000-000000000001';
const connectionId='c1000000-0000-4000-8000-000000000002';
const instanceId='c1000000-0000-4000-8000-000000000003';

test('the recovery window configuration is server-only and defaults off',()=>{
 for(const value of [undefined,'false','TRUE','1',true]){
  assert.equal(squareEnvironmentConfig({GROOKAI_SQUARE_RECOVERY_WINDOW_ENABLED:value}).recoveryWindowEnabled,false);
 }
 assert.equal(squareEnvironmentConfig({GROOKAI_SQUARE_RECOVERY_WINDOW_ENABLED:'true'}).recoveryWindowEnabled,true);
});

async function readRequest(config,options){
 const reads=[];
 const rpc=async(action,data)=>{
  if(action==='signals')return [];
  if(action==='commerce_targets'){reads.push(structuredClone(data));return [];}
  return {recorded:true};
 };
 const catalog={withConnection:async(o,c,fn)=>{
  assert.equal(o,owner);assert.equal(c,connectionId);
  return fn({connection:{id:connectionId,owner_id:owner,location_id:'fixture-location',created_at:'2026-11-20T00:00:00Z',auto_sync:true},
   context:{ownerId:owner,connectionId,leaseToken:instanceId,fence:7},client:{recentOrders:async()=>[],recentRefunds:async()=>[]}});
 }};
 const service=new SquareCommerceService({catalog,rpc,config:{commerceEnabled:true,...config}});
 const result=await service.processConnection(owner,connectionId,options);
 assert.equal(result.failed,0);assert.equal(reads.length,1);
 assert.equal(reads[0].leaseToken,instanceId);assert.equal(reads[0].fence,7);
 return reads[0];
}

test('opted-in automatic two- and five-target reads request the same bounded authority window',async()=>{
 for(const maxTargets of [2,5]){
  const request=await readRequest({recoveryWindowEnabled:true},{maxTargets});
  assert.equal(request.automaticRecoveryLimit,maxTargets);
 }
});

test('the new automatic target window defaults off and requires literal server enablement',async()=>{
 for(const config of [{},{recoveryWindowEnabled:false},{recoveryWindowEnabled:'true'}]){
  const request=await readRequest(config,{maxTargets:2});
  assert.equal(Object.hasOwn(request,'automaticRecoveryLimit'),false);
 }
});

test('manual, focused and other batch sizes preserve their existing target request',async()=>{
 for(const options of [{maxTargets:2,manual:true},{maxTargets:5,focusInstanceId:instanceId},
  {maxTargets:1},{maxTargets:3},{maxTargets:25}]){
  const request=await readRequest({recoveryWindowEnabled:true},options);
  assert.equal(Object.hasOwn(request,'automaticRecoveryLimit'),false);
  assert.equal(request.focusInstanceId,options.focusInstanceId);
 }
});
