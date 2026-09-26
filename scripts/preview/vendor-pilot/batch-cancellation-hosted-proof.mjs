// One synthetic cancellation tombstone; no copy allocation, media upload or deletion.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {createRequire} from 'node:module';
import {out,root,query,verified} from './ops.mjs';
const target=process.argv[2],origin='https://grookai-vendor-preview.vercel.app';assert.equal(process.argv.length,3);assert.match(target??'',/^https:\/\/grookai-vendor-preview-[a-z0-9]+-sosejis-projects\.vercel\.app$/);
assert.equal((await verified()).id,'hrtbjchobencariqclab');
const applied=JSON.parse(fs.readFileSync(path.join(out,'batch-cancellation-v1-applied.json')));assert.equal(applied.status,'passed');
const fixtureFile=path.join(out,'batch-cancellation-hosted-fixture.private.json');assert.ok(!fs.existsSync(fixtureFile),'Consumed proof; reconcile retained fixture before any retry');
const fixture={at:new Date().toISOString(),target,batch:randomUUID(),item:randomUUID()};fs.writeFileSync(fixtureFile,JSON.stringify(fixture,null,2),{flag:'wx'});
const require=createRequire(path.join(root,'apps/web/package.json')),{createServerClient}=require('@supabase/ssr');
const accounts=JSON.parse(fs.readFileSync(path.join(out,'proof-accounts.private.json'))),keys=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))),key=keys.find(k=>k.name==='anon').api_key;
const retainedSql=`select jsonb_build_object('profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'grants',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),'receipts',(select jsonb_agg(to_jsonb(r) order by owner_id,store_id,batch_id,item_id) from vendor_batch_intake_receipts r),'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events)) as retained;`;
const before=(await query(retainedSql))[0].retained;fs.writeFileSync(path.join(out,'batch-cancellation-hosted-before.private.json'),JSON.stringify(before,null,2),{flag:'wx'});
const sessions=[],checks=[];const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
async function login(a){const jar=new Map(),client=createServerClient('https://hrtbjchobencariqclab.supabase.co',key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:xs=>xs.forEach(x=>jar.set(x.name,x.value))}});ok(await client.auth.signInWithPassword(a));const s={client,jar};sessions.push(s);return s;}
const owner=await login(accounts[2]),other=await login(accounts[0]),route='/api/stores/owner/intake';
async function request(p,{auth=owner,body,requestOrigin=origin}={}){const r=await fetch(target+p,{method:body===undefined?'GET':'POST',headers:{...(auth?{cookie:[...auth.jar].map(([k,v])=>k+'='+v).join('; ')}:{}),...(body===undefined?{}:{origin:requestOrigin,'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});const text=await r.text();let data;try{data=JSON.parse(text);}catch{}return{status:r.status,data,text,cache:r.headers.get('cache-control')};}
const pass=s=>{checks.push(s);console.log('PASS '+s);};let failure;
try{
 const caps=await request(route);assert.equal(caps.status,200);assert.deepEqual(caps.data,{commit:true,recognition:true,cancellation:true});assert.match(caps.cache,/no-store/);
 const body={batch_id:fixture.batch,item_id:fixture.item};
 assert.equal((await request(route+'/cancel',{auth:null,body})).status,401);assert.equal((await request(route+'/cancel',{body,requestOrigin:'https://invalid.example'})).status,403);
 assert.equal((await request(route+'/cancel',{body:{batch_id:'invalid',item_id:fixture.item}})).status,409);
 assert.equal((await request(route+'/cancel',{body:{...body,padding:'x'.repeat(1500)}})).status,409);pass('owner capability, no-store, authentication, origin and bounded-input checks');
 const state=(await request('/api/stores/owner')).data;assert.ok(before.stores.some(s=>s.id===state.store.id&&s.owner_id===accounts[2].id));
 const rpcArgs={p_owner:accounts[2].id,p_store:state.store.id,p_batch:fixture.batch,p_item:fixture.item};
 assert.ok((await owner.client.rpc('vendor_batch_intake_cancel_v1',rpcArgs)).error);assert.ok((await owner.client.rpc('vendor_batch_intake_finish_base_v1',rpcArgs)).error);pass('direct authenticated cancellation and internal finalize denied');
 const cancelled=await Promise.all([request(route+'/cancel',{body}),request(route+'/cancel',{body}),request(route+'/cancel',{body})]);for(const r of cancelled){assert.equal(r.status,200,r.text);assert.equal(r.data.cancelled,true);assert.equal(r.data.completed,false);assert.match(r.cache,/no-store/);}
 const rows=ok(await owner.client.from('vendor_batch_intake_cancellations').select('*').eq('batch_id',fixture.batch).eq('item_id',fixture.item));assert.equal(rows.length,1);assert.equal(rows[0].owner_id,accounts[2].id);assert.equal(rows[0].store_id,state.store.id);
 assert.equal(ok(await other.client.from('vendor_batch_intake_cancellations').select('*').eq('batch_id',fixture.batch)).length,0);pass('concurrent cancellation creates one owner-isolated tombstone');
 const completed=before.receipts.find(r=>r.owner_id===accounts[2].id&&r.completed_at);assert.ok(completed);
 const late={...completed.request,batch_id:fixture.batch,item_id:fixture.item};assert.equal((await request(route,{body:late})).status,409);assert.equal((await request(route+'/finish',{body})).status,409);
 const recovered=await request(route+'/cancel',{body:{batch_id:completed.batch_id,item_id:completed.item_id}});assert.equal(recovered.status,200,recovered.text);assert.equal(recovered.data.completed,true);assert.equal(recovered.data.cancelled,false);assert.equal(recovered.data.id,completed.instance_id);pass('late preparation blocked and completed cancellation recovers original receipt');
 for(const [p,b] of [['/api/vendor-billing/owner',{action:'checkout',plan:'store_web'}],['/api/vendor-payments/owner',{action:'onboarding'}]])assert.equal((await request(p,{body:b})).status,503);
 assert.deepEqual((await query(retainedSql))[0].retained,before);pass('existing copies, profiles, stores, grants and receipts unchanged; payments disabled');
}catch(error){failure=error.message;process.exitCode=1;}
finally{for(const s of sessions)await s.client.auth.signOut({scope:'local'});}
const report={at:new Date().toISOString(),status:failure?'failed':'passed',target,checks,failure,existingCopies:before.copies.length,inventoryWrites:0,photoUploads:0,productionWrites:0,retainedSyntheticTombstones:1};fs.writeFileSync(path.join(root,'docs/audits/vendor_batch_cancellation_v1/hosted-20260923.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
