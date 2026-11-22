import test from 'node:test';
import assert from 'node:assert/strict';
import {SquareCommerceService} from '../commerce_service_v2.mjs';

const owner='b1000000-0000-4000-8000-000000000001';
const connectionId='b1000000-0000-4000-8000-000000000002';
const id=n=>`b1000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

function harness({activeCount=7,soldCount=2}={}){
 const active=Array.from({length:activeCount},(_,i)=>({id:id(10+i),instance_id:id(100+i),item_id:'active-item-'+i,variation_id:'active-'+i,selected:true,allocation_state:'active'}));
 const sold=Array.from({length:soldCount},(_,i)=>({id:id(1000+i),instance_id:id(2000+i),item_id:'sold-item-'+i,variation_id:'sold-'+i,selected:false,allocation_state:'sold'}));
 const targets=[...active,...sold],byId=new Map(targets.map(t=>[t.id,t]));
 const quantities=new Map(targets.map(t=>[t.variation_id,t.allocation_state==='sold'?(t===sold[0]?0:1):1]));
 const calls=[],writes=[],checked=[],synced=[],pending=new Map();
 let currentTarget;
 const rpc=async(action,data)=>{
  calls.push(action);
  if(action==='signals')return [];
  if(action==='commerce_targets'){
   const ordered=[...active,...sold];
   if(data.focusInstanceId)ordered.sort((a,b)=>Number(b.instance_id===data.focusInstanceId)-Number(a.instance_id===data.focusInstanceId));
   return structuredClone(ordered);
  }
  if(action==='allocation'){
   const t=byId.get(data.targetId);currentTarget=t.id;
   return {target:t,allocation:{state:t.allocation_state},offer:t.allocation_state==='sold'?null:{gvviId:'GVVI-DEMO0000-000001'},sellEnabled:true,pending:pending.get(t.id)??null};
  }
  if(action==='stock_prepare'){
   assert.equal(byId.get(data.targetId).allocation_state,'sold');
   assert.equal(data.kind,'withdraw');
   const operation={id:'operation-'+data.targetId,kind:data.kind,payload:data.payload,status:'prepared',created_at:'2026-11-22T08:00:00Z'};
   pending.set(data.targetId,operation);return structuredClone(operation);
  }
  if(action==='stock_begin'){
   const operation=pending.get(data.targetId);assert.ok(operation);operation.status='sending';return structuredClone(operation);
  }
  if(action==='stock_finish'){
   assert.equal(data.quantity,0);assert.equal(pending.get(data.targetId).kind,'withdraw');
   assert.equal(byId.get(data.targetId).allocation_state,'sold');pending.delete(data.targetId);return {recorded:true};
  }
  if(action==='target_checked'){
   checked.push(data.targetId);
   const target=byId.get(data.targetId),queue=target.allocation_state==='sold'?sold:active;
   // The real authority updates updated_at; each priority group returns oldest first.
   queue.splice(queue.indexOf(target),1);queue.push(target);
  }
  return {recorded:true};
 };
 const client={recentOrders:async()=>[],recentRefunds:async()=>[],inventoryQuantity:async variation=>quantities.get(variation),changeInventory:async payload=>{
  assert.equal(calls.at(-1),'stock_begin');
  const change=payload.changes[0].physical_count;
  assert.equal(change.quantity,'0');assert.equal(byId.get(currentTarget).allocation_state,'sold');
  quantities.set(change.catalog_object_id,0);writes.push(structuredClone(payload));
 }};
 const catalog={withConnection:async(o,c,fn)=>{
  assert.equal(o,owner);assert.equal(c,connectionId);
  return fn({connection:{id:connectionId,owner_id:owner,location_id:'fixture-location',created_at:'2026-11-20T00:00:00Z',auto_sync:true},context:{ownerId:owner,connectionId},client});
 },sync:async(o,c,target)=>{synced.push(target);return {status:'synchronized'};}};
 const service=new SquareCommerceService({catalog,rpc,config:{commerceEnabled:true,catalogEnabled:true},now:()=>Date.parse('2026-11-22T08:00:00Z')});
 return {service,targets,active,sold,quantities,writes,checked,synced,pending};
}

test('automatic two-target batches rotate through sold copies behind a larger active queue and withdraw unexpected restock',async()=>{
 const h=harness(),soldIds=h.sold.map(t=>t.id);
 for(let tick=0;tick<soldIds.length;tick++){
  const result=await h.service.processConnection(owner,connectionId,{maxTargets:2});
  assert.equal(result.failed,0);assert.equal(result.succeeded,2);
 }
 assert.deepEqual(h.checked.filter(id=>soldIds.includes(id)),soldIds);
 assert.equal(h.checked.length,4);
 assert.equal(h.writes.length,1);
 for(const t of h.targets){
  assert.equal(h.quantities.get(t.variation_id),t.allocation_state==='sold'?0:1);
  if(t.allocation_state==='sold')assert.equal(h.synced.includes(t.id),false);
 }
 assert.equal(h.pending.size,0);
 // Repeating recovery observes confirmed zero, without another count or new allocation.
 await h.service.processConnection(owner,connectionId,{maxTargets:2});
 assert.equal(h.writes.length,1);
});

test('focused one-copy and manual requests retain the requested foreground work',async()=>{
 for(const options of [{maxTargets:1,focus:true},{maxTargets:2,focus:true},{maxTargets:2,manual:true}]){
  const h=harness(),focus=h.active.at(-1);
  const result=await h.service.processConnection(owner,connectionId,{maxTargets:options.maxTargets,manual:options.manual??false,...(options.focus?{focusInstanceId:focus.instance_id}:{})});
  assert.equal(result.failed,0);assert.equal(h.checked.length,options.maxTargets);
  assert.equal(h.writes.length,0);
  assert.ok(h.checked.every(id=>h.active.some(t=>t.id===id)));
  if(options.focus){assert.equal(h.checked[0],focus.id);assert.equal(result.focusStatus,'ready');}
 }
});

test('automatic batches retain their bound with only active stock, only sold stock, or an already included sold copy',async()=>{
 for(const options of [{activeCount:4,soldCount:0},{activeCount:0,soldCount:3},{activeCount:1,soldCount:2}]){
  const h=harness(options),result=await h.service.processConnection(owner,connectionId,{maxTargets:2});
  assert.equal(result.failed,0);assert.equal(h.checked.length,2);assert.equal(new Set(h.checked).size,2);
  assert.ok(h.writes.every(w=>w.changes[0].physical_count.quantity==='0'));
 }
});
