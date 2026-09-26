import test from 'node:test';
import assert from 'node:assert/strict';
import {historyFilters,historyHref,historyCursor,decodeHistoryCursor,literalHistoryPattern,readDispositionHistory,EMPTY_HISTORY_FILTERS,HISTORY_LIMIT} from '../../apps/web/src/lib/vault/vaultDispositionHistory.ts';
const id='12345678-1234-1234-1234-123456789abc',at='2026-09-19T12:30:12.123456+00:00';
test('cursor retains microseconds and stable ID tie-breaker',()=>assert.deepEqual(decodeHistoryCursor(historyCursor(at,id)),{at,id}));
for(const value of ['', '!', Buffer.from('{"at":"2026-01-01T00:00:00Z","id":"x),user_id.neq.null"}').toString('base64url'), Buffer.from(JSON.stringify({at:'2026-02-31T00:00:00Z',id})).toString('base64url'),Buffer.from(JSON.stringify({at,id,ownerId:id})).toString('base64url'),'a'.repeat(241)])test(`reject malformed cursor ${value.slice(0,12)}`,()=>assert.throws(()=>decodeHistoryCursor(value)));
for(const raw of [{q:['a','b']},{field:'owner'},{type:'paid'},{q:'x'.repeat(121)},{ownerId:id},{after:'garbage'}])test(`reject malformed filters ${JSON.stringify(raw).slice(0,40)}`,()=>assert.throws(()=>historyFilters(raw)));
test('filter URLs stay internal and preserve encoded text',()=>{
 const filters=historyFilters({q:'  a & b / ?  ',field:'counterparty',type:'sale'});
 const url=new URL(historyHref(filters),'https://fixture.invalid');assert.equal(url.pathname,'/vault/transactions');assert.equal(url.searchParams.get('q'),'a & b / ?');assert.equal(url.searchParams.get('type'),'sale');
});
test('search treats SQL wildcard characters literally',()=>assert.equal(literalHistoryPattern('a%_\\b'),'%a\\%\\_\\\\b%'));
test('history rejects signed-out requests before querying rows',async()=>{
 let called=false;const client={auth:{getUser:async()=>({data:{user:null},error:null})},from:()=>{called=true;}};
 await assert.rejects(readDispositionHistory(client,EMPTY_HISTORY_FILTERS),/Sign in/);assert.equal(called,false);
});
test('history pins actor, ordering, bounds and escaped search; read errors are not empty results',async()=>{
 const calls=[];const query={};for(const method of ['select','eq','ilike','or','order'])query[method]=(...args)=>{calls.push([method,...args]);return query;};
 query.limit=async n=>{calls.push(['limit',n]);return {data:null,error:{message:'fixture'}};};
 const client={auth:{getUser:async()=>({data:{user:{id}},error:null})},from:table=>{calls.push(['from',table]);return query;}};
 await assert.rejects(readDispositionHistory(client,{query:'%_',field:'counterparty',type:'trade',after:historyCursor(at,id)}),/could not be loaded/);
 assert(calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]===id));assert(calls.some(c=>c[0]==='ilike'&&c[2]==='%\\%\\_%'));
 assert(calls.some(c=>c[0]==='or'&&c[1]===`created_at.lt.${at},and(created_at.eq.${at},id.lt.${id})`));
 assert.deepEqual(calls.filter(c=>c[0]==='order'),[['order','created_at',{ascending:false}],['order','id',{ascending:false}]]);assert.deepEqual(calls.at(-1),['limit',HISTORY_LIMIT+1]);
});
