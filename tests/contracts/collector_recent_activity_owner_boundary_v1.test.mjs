import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const ts=require('typescript');
const source=fs.readFileSync(new URL('../../apps/web/src/lib/vault/getRecentOwnedCards.ts',import.meta.url),'utf8');
const exports={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
  {exports,Error,Number,String,Boolean,Map,Set,require:name=>{assert.equal(name,'server-only');return {};}});
const {getRecentOwnedCards}=exports;
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const card={id:'card-1',gv_id:'GV-PK-MEW-200',name:'Blastoise ex',set_code:'sv03.5',number:'200',image_url:'https://example.test/card.webp',image_alt_url:null,sets:{name:'151'}};
const instance=(id,user=owner,date='2026-09-12T00:00:00Z')=>({id,user_id:user,card_print_id:card.id,created_at:date,archived_at:null});
function fixture({instances=[instance('copy-1')],cards=[card],failure=null,throwOn=null}={}){
  const calls=[];
  return {calls,from(table){
    assert.ok(['vault_item_instances','card_prints'].includes(table));
    const call={table,filters:[],orders:[]};calls.push(call);
    const query={
      select(columns){call.columns=columns;return this;},
      eq(field,value){call.filters.push(row=>row[field]===value);call.ownerFilter={field,value};return this;},
      is(field,value){call.filters.push(row=>row[field]===value);call.activeFilter={field,value};return this;},
      not(field,operator,value){assert.equal(operator,'is');call.filters.push(row=>row[field]!==value);return this;},
      order(field,options){call.orders.push({field,...options});return this;},
      limit(value){call.limit=value;return this;},
      in(field,ids){call.ids=[...ids];call.filters.push(row=>ids.includes(row[field]));return this;},
      then(resolve,reject){
        if(throwOn===table)return Promise.reject(new Error('transport unavailable')).then(resolve,reject);
        if(failure===table)return Promise.resolve({data:null,error:{message:'read denied'}}).then(resolve,reject);
        let data=(table==='vault_item_instances'?instances:cards).filter(row=>call.filters.every(f=>f(row)));
        data=[...data].sort((a,b)=>{for(const o of call.orders){const d=String(a[o.field]).localeCompare(String(b[o.field]));if(d)return o.ascending?d:-d;}return 0;});
        if(call.limit)data=data.slice(0,call.limit);
        return Promise.resolve({data,error:null}).then(resolve,reject);
      }
    };return query;
  }};
}
test('recent activity scopes active canonical ownership before bounded metadata enrichment',async()=>{
  const client=fixture({instances:[instance('own-old',owner,'2026-09-10'),instance('other-new',other),{...instance('archived'),archived_at:'2026-09-11'},instance('own-new')]});
  const result=await getRecentOwnedCards(client,owner,10);
  assert.equal(result.error,null);assert.deepEqual(Array.from(result.data,row=>row.id),['own-new','own-old']);
  assert.deepEqual(client.calls[0].ownerFilter,{field:'user_id',value:owner});
  assert.deepEqual(client.calls[0].activeFilter,{field:'archived_at',value:null});
  assert.equal(client.calls[0].limit,10);assert.deepEqual(client.calls[1].ids,['card-1']);
  assert.equal(result.data[0].gv_id,card.gv_id);assert.equal(result.data[0].set_name,'151');
});
test('recent activity caps reads at 50 and resolves timestamp ties by exact instance ID',async()=>{
  const client=fixture({instances:Array.from({length:80},(_,i)=>instance(String(i).padStart(3,'0')))});
  const result=await getRecentOwnedCards(client,owner,1000);
  assert.equal(result.data.length,50);assert.equal(result.data[0].id,'079');assert.equal(client.calls[0].limit,50);
});
test('empty ownership performs no catalog lookup and unknown owner performs no reads',async()=>{
  const client=fixture({instances:[]});assert.equal((await getRecentOwnedCards(client,owner)).data.length,0);assert.equal(client.calls.length,1);
  const denied=fixture();assert.ok((await getRecentOwnedCards(denied,'')).error);assert.equal(denied.calls.length,0);
});
test('activity does not invent identity for hidden or unmapped cards',async()=>{
  const client=fixture({cards:[]});assert.equal((await getRecentOwnedCards(client,owner)).data.length,0);
});
test('sealed instances cannot consume the card activity window',async()=>{
  const client=fixture({instances:[{...instance('sealed'),card_print_id:null},instance('card',owner,'2026-09-10')]});
  const result=await getRecentOwnedCards(client,owner,1);assert.equal(result.data.length,1);assert.equal(result.data[0].id,'card');
});
for(const table of ['vault_item_instances','card_prints'])test(`activity fails closed when ${table} read fails`,async()=>{
  const result=await getRecentOwnedCards(fixture({failure:table}),owner);assert.equal(result.data,null);assert.equal(result.error.message,'read denied');
});
test('activity contains transport errors without fabricating an empty successful feed',async()=>{
  const result=await getRecentOwnedCards(fixture({throwOn:'vault_item_instances'}),owner);assert.equal(result.data,null);assert.match(result.error.message,/transport/);
});
test('both account routes use the authenticated canonical activity reader, never legacy projections or admin fallback',()=>{
  for(const route of ['vault','wall']){
    const text=fs.readFileSync(new URL(`../../apps/web/src/app/${route}/page.tsx`,import.meta.url),'utf8');
    assert.match(text,/getRecentOwnedCards\(supabase, user\.id, (10|50)\)/);assert.doesNotMatch(text,/v_recently_added/);
  }
  assert.match(source,/import "server-only"/);assert.doesNotMatch(source,/createServerAdminClient|v_vault_items|\.rpc\(|\.insert\(|\.update\(|\.delete\(/);
});
