import test from 'node:test';
import assert from 'node:assert/strict';
import {correctionFixture,correctionOwner} from '../fixtures/sale_cost_correction_cases_v1.mjs';
import {changeCostCorrectionJournal} from '../../apps/web/src/lib/sales/costCorrectionJournal.mjs';
import {CostCorrectionService} from '../../apps/web/src/lib/sales/costCorrectionService.mjs';
function setup(){
 const f=correctionFixture();let row=null,outcome=null,n=0,listener=()=>{};const calls=[];
 const store={async read(){return structuredClone(row);},async change(c){row=changeCostCorrectionJournal(row,c);return structuredClone(row);}};
 const gateway={ownerId:correctionOwner,subscribe(l){listener=l;return ()=>{};},async available(){return true;},async read(){return [f.state];},async history(){return [f.outcome];},async recover(r){calls.push(['recover',structuredClone(r)]);return structuredClone(outcome);},async apply(r){calls.push(['apply',structuredClone(r)]);outcome=structuredClone(f.outcome);return structuredClone(outcome);},async cancel(r){calls.push(['cancel',structuredClone(r)]);outcome??={...structuredClone(f.outcome),status:'cancelled',revision:null,source:null};return structuredClone(outcome);}};
 const make=()=>new CostCorrectionService({gateway,store,newId:()=>`e1000000-0000-4000-8000-${String(++n).padStart(12,'0')}`});
 return {f,store,gateway,calls,make,get row(){return row;},set outcome(v){outcome=v;},changeOwner(owner){gateway.ownerId=owner;listener(owner);}};
}
test('lost successful response recovers after service restart without another apply',async()=>{
 const s=setup(),service=s.make(),apply=s.gateway.apply;s.gateway.apply=async r=>{await apply(r);throw Error('Response lost');};
 assert.equal((await service.begin(s.f.outcome.request,null)).status,'unconfirmed');const bytes=JSON.stringify(s.row.pending);service.dispose();
 s.gateway.available=async()=>false;const next=s.make();assert.equal(await next.available(),false);assert.equal((await next.recover()).status,'applied');
 assert.equal(s.calls.filter(c=>c[0]==='apply').length,1);assert.equal(JSON.stringify(s.calls[0][1]),bytes);assert.equal(s.row.pending,null);next.dispose();
});
test('null reads and refusals retain request until terminal cancellation',async()=>{
 const s=setup(),service=s.make();s.gateway.apply=async()=>{throw Object.assign(Error('stale'),{code:'PT409'});};
 const pending=await service.begin(s.f.outcome.request,null);assert.equal(pending.status,'unconfirmed');assert.equal(pending.code,'PT409');
 assert.equal((await service.recover()).status,'unconfirmed');assert.deepEqual(s.row.pending,s.f.outcome.request);
 assert.equal((await service.cancel()).status,'cancelled');assert.equal(s.row.pending,null);service.dispose();
});
test('completion arriving before cancel is acknowledged as applied',async()=>{
 const s=setup(),service=s.make();s.gateway.apply=async()=>{throw Error('Delayed');};await service.begin(s.f.outcome.request,null);
 s.gateway.cancel=async()=>s.f.outcome;assert.equal((await service.cancel()).status,'applied');service.dispose();
});
test('malformed and foreign outcomes cannot clear pending state',async()=>{
 for(const alter of [o=>o.request.reason+=' changed',o=>o.ownerId='d1000000-0000-4000-8000-000000000002',o=>o.status='pending']){
  const s=setup(),service=s.make(),bad=structuredClone(s.f.outcome);alter(bad);s.gateway.apply=async()=>bad;assert.equal((await service.begin(s.f.outcome.request,null)).status,'unconfirmed');assert.deepEqual(s.row.pending,s.f.outcome.request);service.dispose();
 }
});
test('storage failure prevents network mutation and acknowledgement failure retains recovery',async()=>{
 const s=setup(),service=s.make(),change=s.store.change;s.store.change=async()=>{throw Error('Disk full');};
 await assert.rejects(service.begin(s.f.outcome.request,null));assert.equal(s.calls.length,0);
 s.store.change=async c=>{if(c.action==='acknowledge')throw Error('Disk full');return change(c);};assert.equal((await service.begin(s.f.outcome.request,null)).status,'unconfirmed');assert.ok(s.row.pending);
 s.store.change=change;assert.equal((await service.recover()).status,'applied');service.dispose();
});
test('account invalidation closes late reads and never crosses a request into the next owner',async()=>{
 const s=setup(),service=s.make();let release;s.gateway.recover=()=>new Promise(resolve=>{release=resolve;});
 const attempt=service.begin(s.f.outcome.request,null);await new Promise(resolve=>setImmediate(resolve));s.changeOwner('d1000000-0000-4000-8000-000000000002');release(null);
 await assert.rejects(attempt,/account changed/);assert.ok(s.row.pending);assert.equal(s.calls.length,0);
 s.changeOwner(correctionOwner);await assert.rejects(service.recover(),/account changed/);service.dispose();
});
test('partial and malformed report reads reject instead of becoming no corrections',async()=>{
 const s=setup(),service=s.make();assert.deepEqual(await service.read([s.f.receipt.id]),[s.f.state]);s.gateway.read=async()=>[];
 await assert.rejects(service.read([s.f.receipt.id]));await assert.rejects(service.read([s.f.receipt.id,s.f.receipt.id.toUpperCase()]));assert.deepEqual(await service.read([]),[]);service.dispose();
});
