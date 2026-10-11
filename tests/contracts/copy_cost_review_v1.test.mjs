import test from 'node:test';
import assert from 'node:assert/strict';
import {costReviewIds,costReviewRows,costReviewLabel,readCostReview} from '../../apps/web/src/lib/vault/copyCostReview.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const id=i=>`22222222-2222-4222-8222-${String(i).padStart(12,'0')}`;
const cost=(status,amount=null,currency=null,minor=null)=>({status,amount,currency,minor});
const row=(i,value=cost('missing_amount'),archived=false)=>({instanceId:id(i),cost:value,archived});
const body=copies=>({ownerId:owner,editEnabled:true,copies});
test('known zero and foreign currency are distinct from incomplete and unavailable evidence',()=>{
 const response=body([row(0),row(1,cost('missing_currency','12')),row(2,cost('known','0','USD','0')),row(3,cost('known','3','CAD','300')),row(4,cost('invalid_amount','0.001','USD')),row(5,cost('known','9','USD','900'),true)]);
 const before=JSON.stringify(response),result=costReviewRows(owner,Array.from({length:7},(_,i)=>id(i)),response);
 assert.deepEqual(result.map(r=>r.state),['missingAmount','missingCurrency','known','known','needsReview','unavailable','unavailable']);
 assert.equal(costReviewLabel(result[2]),'USD 0.00');assert.equal(costReviewLabel(result[3]),'CAD 3.00');
 assert.equal(JSON.stringify(response),before);assert.ok(Object.isFrozen(result));assert.ok(Object.isFrozen(result[2].cost));
});
test('scope normalizes and deduplicates UUIDs, rejects invalid and oversized input',()=>{
 assert.deepEqual(costReviewIds([id(1).toUpperCase(),id(1)]),[id(1)]);
 for(const value of [null,['bad'],Array.from({length:10001},(_,i)=>id(i))])assert.throws(()=>costReviewIds(value));
});
for(const kind of ['owner','duplicate','unrequested','archive','cost','flag'])test(`rejects ${kind} response without turning failure into missing evidence`,()=>{
 const value=body([row(0)]);
 if(kind==='owner')value.ownerId=id(4);
 if(kind==='duplicate')value.copies.push(row(0));
 if(kind==='unrequested')value.copies=[row(1)];
 if(kind==='archive')value.copies[0].archived=null;
 if(kind==='cost')value.copies[0].cost.amount=5;
 if(kind==='flag')value.editEnabled=null;
 assert.throws(()=>costReviewRows(owner,[id(0)],value));
});
test('contradictory known or missing evidence cannot count as recorded',()=>{
 const result=costReviewRows(owner,[id(0),id(1),id(2)],body([row(0,cost('known','1','USD','200')),row(1,cost('known','1','usd','100')),row(2,cost('missing_amount','5'))]));
 assert.ok(result.every(r=>r.state==='needsReview'));
});
test('201 copies use complete 100/100/1 batches and retain order',async()=>{
 const calls=[];const result=await readCostReview(owner,Array.from({length:201},(_,i)=>id(i)),{fetcher:async(url,options)=>{
  assert.equal(options.cache,'no-store');assert.equal(options.credentials,'same-origin');
  const ids=new URL(url,'http://fixture.invalid').searchParams.get('ids').split(',');calls.push(ids);
  return {ok:true,json:async()=>body(ids.map(instanceId=>({instanceId,archived:false,cost:cost('missing_amount')})))};
 }});
 assert.deepEqual(calls.map(x=>x.length),[100,100,1]);assert.deepEqual(result.map(r=>r.instanceId),calls.flat());
});
test('later failure rejects the whole result and cancels further dispatch',async()=>{
 let calls=0;await assert.rejects(readCostReview(owner,Array.from({length:201},(_,i)=>id(i)),{fetcher:async()=>({ok:++calls!==2,json:async()=>body([])})}));assert.equal(calls,2);
});
test('account/scope invalidation hides a late result and stops later batches',async()=>{
 let current=true,calls=0;await assert.rejects(readCostReview(owner,Array.from({length:201},(_,i)=>id(i)),{isCurrent:()=>current,fetcher:async()=>{calls++;current=false;return {ok:true,json:async()=>body([])};}}));assert.equal(calls,1);
});
test('empty scope reads nothing; pre-aborted scope cannot dispatch',async()=>{
 let calls=0;const fetcher=async()=>{calls++;};assert.deepEqual(await readCostReview(owner,[],{fetcher}),[]);
 const controller=new AbortController();controller.abort();await assert.rejects(readCostReview(owner,[id(0)],{fetcher,signal:controller.signal}));assert.equal(calls,0);
});
