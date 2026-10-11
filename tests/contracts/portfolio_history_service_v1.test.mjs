import test from 'node:test';
import assert from 'node:assert/strict';
import {PortfolioHistoryService} from '../../apps/web/src/lib/vault/portfolioHistoryService.mjs';
import {changePortfolioJournal} from '../../apps/web/src/lib/vault/portfolioHistoryJournal.mjs';
import {summarizePortfolioObservationV1 as summarize} from '../../backend/vault/portfolio_history_v1.mjs';
const id=n=>`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`,owner=id(1),day='2026-10-08';
const summary=(count=0)=>summarize({version:1,scope:'all_active_owned_copies',ownerId:owner,snapshotId:id(2),sequence:'1',capturedAt:day+'T12:00:00.000Z',complete:true,ownedCount:count,copies:Array.from({length:count},(_,i)=>({copyId:id(i+500),kind:'raw',basisKey:'a'.repeat(64),reference:null,unpricedReason:'no_qualified_price'}))});
const outcome=(request,status='captured')=>({version:1,ownerId:owner,request,status,pointId:status==='captured'?id(2):null,errorCode:status==='failed'?'pricing_unavailable':null,recordedAt:day+'T12:00:00.000Z',summary:status==='captured'?summary():null});
function fixture(){
 let row=null,seq=100,listener=()=>{},saved=null;const calls=[];
 const store={read:async()=>structuredClone(row),change:async change=>{calls.push(change.action);row=changePortfolioJournal(row,change);return structuredClone(row);}};
 const gateway={ownerId:owner,subscribe:fn=>{listener=fn;return()=>{};},
  recover:async request=>{calls.push('recover');return saved;},capture:async request=>{calls.push('capture');saved=outcome(request);return saved;},cancel:async request=>{calls.push('cancel');return outcome(request,'cancelled');},
  capabilities:async()=>({version:1,enabled:true,day,maximumCopies:20000,cadence:'first_visit_utc_day'}),
  list:async()=>({version:1,ownerId:owner,watermark:'1',points:[summary()],nextBefore:null}),
  compare:async()=>null,export:async()=>({version:1,ownerId:owner,point:summary(),rows:[],nextAfterCopy:null})};
 const make=()=>new PortfolioHistoryService({gateway,store,newId:()=>id(seq++)});const service=make();
 return {service,make,store,gateway,calls,read:()=>row,changeOwner:()=>{gateway.ownerId=id(9);listener(id(9));}};
}
test('capture is durably staged before any network write and exact acknowledged',async()=>{
 const f=fixture(),result=await f.service.begin(day,null);assert.equal(result.status,'captured');assert.deepEqual(f.calls,['stage','recover','capture','acknowledge']);assert.equal(f.read().pending,null);assert.equal(f.read().lastOutcome.request.day,day);
});
test('failed local storage never sends a capture',async()=>{
 const f=fixture();f.store.change=async()=>{throw Error('disk full');};await assert.rejects(f.service.begin(day,null),/disk full/);assert.deepEqual(f.calls,[]);
});
test('lost successful response recovers original outcome after service restart without duplicate write',async()=>{
 const f=fixture(),capture=f.gateway.capture;f.gateway.capture=async request=>{await capture(request);throw Error('lost response');};
 const first=await f.service.begin(day,null);assert.equal(first.status,'unconfirmed');const request=structuredClone(f.read().pending);f.service.dispose();
 const result=await f.make().recover();assert.equal(result.status,'captured');assert.deepEqual(result.acknowledgement.request,request);assert.equal(f.calls.filter(v=>v==='capture').length,1);assert.equal(f.read().pending,null);
});
test('null recovery keeps the exact request and never sends a capture by itself',async()=>{
 const f=fixture();f.gateway.capture=async()=>{throw Error('offline');};await f.service.begin(day,null);const retained=structuredClone(f.read());
 assert.equal((await f.service.recover()).status,'unconfirmed');assert.deepEqual(f.read(),retained);
});
test('server cancellation is required before releasing the request',async()=>{
 const f=fixture();f.gateway.capture=async()=>{throw Error('offline');};await f.service.begin(day,null);f.gateway.cancel=async()=>{throw Error('offline');};
 assert.equal((await f.service.cancel()).status,'unconfirmed');assert.ok(f.read().pending);
 f.gateway.cancel=async request=>outcome(request,'cancelled');assert.equal((await f.service.cancel()).status,'cancelled');assert.equal(f.read().pending,null);
});
test('failed capture is terminal and keeps its day to prevent an automatic retry loop',async()=>{
 const f=fixture();f.gateway.capture=async request=>outcome(request,'failed');const result=await f.service.begin(day,null);
 assert.equal(result.status,'failed');assert.equal(f.read().pending,null);assert.equal(f.read().lastOutcome.request.day,day);
});
test('acknowledgement write failure retains pending server-success for recovery',async()=>{
 const f=fixture(),change=f.store.change;f.store.change=async value=>{if(value.action==='acknowledge')throw Error('disk full');return change(value);};
 assert.equal((await f.service.begin(day,null)).status,'unconfirmed');assert.ok(f.read().pending);f.store.change=change;
 assert.equal((await f.service.recover()).status,'captured');assert.equal(f.calls.filter(v=>v==='capture').length,1);
});
test('different-owner acknowledgement cannot clear the journal',async()=>{
 const f=fixture();f.gateway.capture=async request=>({...outcome(request),ownerId:id(9)});assert.equal((await f.service.begin(day,null)).status,'unconfirmed');assert.ok(f.read().pending);
});
test('owner switching during a write invalidates values and retains the owner journal',async()=>{
 const f=fixture();let invalidated=0;f.service.onInvalidated(()=>invalidated++);f.gateway.capture=async request=>{f.changeOwner();return outcome(request);};
 await assert.rejects(f.service.begin(day,null),/account changed/);assert.equal(invalidated,1);assert.ok(f.read().pending);await assert.rejects(f.service.list(),/account changed/);
});
test('parallel in-process capture is rejected before a second stage',async()=>{
 const f=fixture();let release;f.gateway.recover=()=>new Promise(resolve=>{release=resolve;});const first=f.service.begin(day,null);await new Promise(resolve=>setImmediate(resolve));
 await assert.rejects(f.service.begin(day,null),/already being checked/);release(null);assert.equal((await first).status,'captured');assert.equal(f.calls.filter(v=>v==='stage').length,1);
});
test('independent instances cannot overwrite the same retained request',async()=>{
 const f=fixture();f.gateway.capture=async()=>{throw Error('offline');};await f.service.begin(day,null);await assert.rejects(f.make().begin(day,null));assert.equal(f.calls.filter(v=>v==='recover').length,1);
});
test('complete empty export is legitimate',async()=>{const f=fixture();assert.deepEqual((await f.service.export(id(2))).rows,[]);});
test('complete export follows immutable ordered pages',async()=>{
 const f=fixture(),point=summary(101),rows=Array.from({length:101},(_,i)=>({copy:{copyId:id(i+500)},evidence:{copyId:id(i+500)}}));let calls=0;
 f.gateway.export=async(pointId,after)=>{calls++;assert.equal(pointId,id(2));assert.equal(after,calls===1?null:id(599));return {version:1,ownerId:owner,point,rows:calls===1?rows.slice(0,100):rows.slice(100),nextAfterCopy:calls===1?id(599):null};};
 assert.equal((await f.service.export(id(2))).rows.length,101);assert.equal(calls,2);
});
for(const mode of ['missing','duplicate','wrongOwner','wrongPoint','badCursor','changedSummary','ownerSwitch'])test('export refuses '+mode+' without delivering partial data',async()=>{
 const f=fixture(),point=summary(101),rows=Array.from({length:101},(_,i)=>({copy:{copyId:id(i+500)},evidence:{copyId:id(i+500)}}));let calls=0;
 f.gateway.export=async()=>{
  calls++;const v={version:1,ownerId:owner,point:structuredClone(point),rows:calls===1?rows.slice(0,100):rows.slice(100),nextAfterCopy:calls===1?id(599):null};
  if(mode==='missing'&&calls===2)v.rows=[];
  if(mode==='duplicate'&&calls===2)v.rows=rows.slice(0,1);
  if(mode==='wrongOwner')v.ownerId=id(9);
  if(mode==='wrongPoint')v.point.snapshotId=id(9);
  if(mode==='badCursor')v.nextAfterCopy=id(9);
  if(mode==='changedSummary'&&calls===2)v.point.capturedAt=day+'T13:00:00.000Z';
  if(mode==='ownerSwitch'&&calls===2)f.changeOwner();return v;
 };await assert.rejects(f.service.export(id(2)));
});
