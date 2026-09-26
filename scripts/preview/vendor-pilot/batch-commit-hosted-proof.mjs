// Bounded synthetic HTTP proof. Retains two archived QA receipts, never deletes
// audit history or touches pre-existing copies/catalog/profile/entitlement rows.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {out,root,query,verified} from './ops.mjs';
const target=process.argv[2],canonical='https://grookai-vendor-preview.vercel.app';
const resume=process.argv[3]==='--resume-hidden-copy';assert.equal(process.argv.length,resume?4:3);assert.match(target??'',/^https:\/\/grookai-vendor-preview-[a-z0-9]+-sosejis-projects\.vercel\.app$/);
assert.equal((await verified()).id,'hrtbjchobencariqclab');
const require=createRequire(path.join(root,'apps/web/package.json')),{createServerClient}=require('@supabase/ssr'),sharp=require('sharp');
const accounts=JSON.parse(fs.readFileSync(path.join(out,'proof-accounts.private.json')));
const key=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))).find(k=>k.name==='anon').api_key;
const privateFile=path.join(out,'batch-commit-hosted-fixture.private.json');
assert.equal(fs.existsSync(privateFile),resume,'Consumed proof: reconcile retained receipts; never allocate a new batch blindly');
const fixture=resume?JSON.parse(fs.readFileSync(privateFile)):{at:new Date().toISOString(),target,batch:randomUUID(),items:[randomUUID(),randomUUID()],copies:[]};
if(resume){assert.equal(fixture.status,'failed');assert.equal(fixture.target,target);assert.equal(fixture.copies.length,1);assert.match(fixture.cleanupWarning??'',/single JSON object/);fs.copyFileSync(privateFile,path.join(out,'batch-commit-hosted-initial-failure.private.json'),fs.constants.COPYFILE_EXCL);fs.copyFileSync(path.join(root,'docs/audits/vendor_batch_commit_v1/hosted-20260923.json'),path.join(root,'docs/audits/vendor_batch_commit_v1/hosted-initial-failure-20260923.json'),fs.constants.COPYFILE_EXCL);delete fixture.cleanupWarning;}
const save=()=>fs.writeFileSync(privateFile,JSON.stringify(fixture,null,2));save();
const checks=[],sessions=[];
const pass=name=>{checks.push(name);console.log('PASS '+name);};
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
const retainedSql=`select jsonb_build_object('profiles',coalesce((select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'[]'),'stores',coalesce((select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'[]'),'copies',coalesce((select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'[]'),'entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),'[]')) as data;`;
const beforeFile=path.join(out,'batch-commit-hosted-retained.private.json');
const before=resume?JSON.parse(fs.readFileSync(beforeFile)):(await query(retainedSql))[0].data;
if(!resume)fs.writeFileSync(beforeFile,JSON.stringify(before,null,2),{flag:'wx'});
async function readCopy(id){assert.match(id,/^[0-9a-f-]{36}$/);const rows=await query(`select * from public.vault_item_instances where id='${id}' and user_id='${accounts[2].id}'`);assert.equal(rows.length,1);return rows[0];}
if(resume){const v=await readCopy(fixture.copies[0]);assert.ok(v.archived_at);assert.equal(v.legacy_vault_item_id,null);assert.equal(v.intent,'hold');}
async function login(account){const jar=new Map(),client=createServerClient('https://hrtbjchobencariqclab.supabase.co',key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:xs=>xs.forEach(x=>jar.set(x.name,x.value))}});ok(await client.auth.signInWithPassword(account));const s={client,jar};sessions.push(s);return s;}
const owner=await login(accounts[2]),other=await login(accounts[0]),expired=await login(accounts[1]);
const image=await sharp({create:{width:180,height:250,channels:3,background:'#405879'}}).jpeg().toBuffer();
const digest=createHash('sha256').update(image).digest('hex');
async function http(route,{auth=owner,body,origin=canonical}={}){
 const r=await fetch(target+route,{method:body===undefined?'GET':'POST',headers:{...(auth?{cookie:[...auth.jar].map(([k,v])=>k+'='+v).join('; ')}:{}),...(body===undefined?{}:{Origin:origin,'Content-Type':Buffer.isBuffer(body)?'image/jpeg':'application/json'})},body:body===undefined?undefined:Buffer.isBuffer(body)?body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{}return{status:r.status,data,text,headers:r.headers};
}
const route='/api/stores/owner/intake';
const finish=data=>http(route+'/finish',{body:{batch_id:data.batch_id,item_id:data.item_id}});
const upload=(data,side,body=image,auth=owner)=>http(route+'/media?'+new URLSearchParams({batch:data.batch_id,item:data.item_id,side}),{body,auth});
const receipt=data=>http(route+'?'+new URLSearchParams({batch:data.batch_id,item:data.item_id}));
let failure;
try{
 assert.equal((await http(route,{auth:null})).status,401);assert.equal((await http(route,{auth:expired})).status,403);
 const caps=await http(route);assert.equal(caps.data.commit,false);assert.equal(caps.data.recognition,true);
 assert.equal((await http(route,{body:{}})).status,503);
 pass('candidate disabled by database control; authentication and matching preserved');
 await query('update public.vendor_batch_intake_control set enabled=true where singleton;');
 assert.equal((await http(route)).data.commit,true);
 const search=await http('/api/stores/owner/inventory?q=Pikachu');assert.equal(search.status,200);
 const card=search.data.cards.find(c=>c.printings.length);assert.ok(card);
 const state=(await http('/api/stores/owner')).data;fixture.owner=accounts[2].id;fixture.store=state.store.id;save();
 const data={version:1,batch_id:fixture.batch,item_id:fixture.items[0],card_id:card.id,printing_id:card.printings[0].id,condition:'LP',intent:'hold',amount:'',currency:'USD',sections:[],location:'Synthetic hosted batch QA',list:false,front_sha256:digest,back_sha256:digest};fixture.requests=[data,{...data,item_id:fixture.items[1]}];save();
 assert.equal((await http(route,{body:data,auth:null})).status,401);
 assert.equal((await http(route,{body:data,auth:expired})).status,403);
 assert.equal((await http(route,{body:data,origin:'https://invalid.example'})).status,403);
 const direct=await owner.client.rpc('vendor_batch_intake_prepare_v1',{p_owner:fixture.owner,p_store:fixture.store,p_data:data});assert.ok(direct.error);
 pass('unauthenticated, expired, foreign-origin and direct owner RPC writes rejected');
 const pair=await Promise.all([http(route,{body:data}),http(route,{body:data})]);for(const r of pair)assert.equal(r.status,200,r.text);
 const saved=(await receipt(data)).data;assert.ok(saved.instance_id);if(!fixture.copies.includes(saved.instance_id))fixture.copies.push(saved.instance_id);save();
 const hidden=await readCopy(saved.instance_id);assert.ok(hidden.archived_at);assert.equal(hidden.legacy_vault_item_id,null);assert.equal(hidden.intent,'hold');
 assert.equal((await http(route,{body:{...data,condition:'NM'}})).status,409);
 assert.equal((await http(route+'?'+new URLSearchParams({batch:data.batch_id,item:data.item_id}),{auth:other})).status,404);
 assert.equal((await upload(data,'front',image,other)).status,409);
 pass('concurrent prepare creates one hidden copy; changed requests and foreign receipt access denied');
 assert.equal((await finish(data)).status,409);assert.equal((await upload(data,'front',Buffer.from('wrong bytes'))).status,409);
 assert.equal((await upload(data,'front')).status,200);assert.equal((await upload(data,'front')).status,200);
 assert.equal((await finish(data)).status,409);assert.equal((await upload(data,'back')).status,200);
 const publicMedia=await fetch('https://hrtbjchobencariqclab.supabase.co/storage/v1/object/public/user-card-images/'+fixture.owner+'/vault-instances/'+saved.instance_id+'/front/current');assert.ok(publicMedia.status>=400);
 pass('missing/altered scans cannot finish; upload retry succeeds and stored photos stay private');
 const finished=await Promise.all([finish(data),finish(data)]);for(const r of finished)assert.equal(r.status,200,r.text);assert.deepEqual(finished[0].data,finished[1].data);
 const copy=ok(await owner.client.from('vault_item_instances').select('*').eq('id',saved.instance_id).single());assert.equal(copy.archived_at,null);assert.equal(copy.asking_price_currency,null);assert.equal(copy.condition_label,'LP');assert.equal(copy.intent,'hold');assert.equal(copy.notes,data.location);
 const second=fixture.requests[1];assert.equal((await http(route,{body:second})).status,200);const secondReceipt=(await receipt(second)).data;fixture.copies.push(secondReceipt.instance_id);save();assert.notEqual(secondReceipt.instance_id,saved.instance_id);
 for(const side of ['front','back'])assert.equal((await upload(second,side)).status,200);assert.equal((await finish(second)).status,200);
 assert.equal(ok(await owner.client.from('vendor_batch_intake_receipts').select('*').eq('batch_id',fixture.batch)).length,2);
 assert.equal(ok(await owner.client.from('vendor_store_items').select('instance_id').in('instance_id',fixture.copies)).length,0);
 pass('concurrent finish returns one identity; identical scans as separate items produce two private copies');
 for(const id of fixture.copies)ok(await owner.client.rpc('vault_archive_exact_instance_v1',{p_instance_id:id}));
 assert.equal((await finish(data)).status,200);assert.ok((await readCopy(saved.instance_id)).archived_at);
 pass('synthetic copies archived through owner RPC; completed retry never reactivates them');
 for(const [url,body] of [['/api/vendor-billing/owner',{action:'checkout',plan:'store_web'}],['/api/vendor-payments/owner',{action:'onboarding'}]])assert.equal((await http(url,{body})).status,503);
 const after=(await query(retainedSql))[0].data;
 for(const k of ['profiles','stores','entitlements'])assert.deepEqual(after[k],before[k],k);
 assert.deepEqual(after.copies.filter(c=>!fixture.copies.includes(c.id)),before.copies);
 const stateAfter=(await query('select (select count(*)::int from vendor_orders) as orders,(select count(*)::int from web_events) as telemetry,(select count(*)::int from vendor_billing_accounts) as billing,(select count(*)::int from vendor_seller_accounts) as sellers;'))[0];assert.deepEqual(stateAfter,{orders:0,telemetry:0,billing:0,sellers:0});
 pass('all five existing copies, profiles, stores and grants unchanged; payments and telemetry remain off');
}catch(error){failure=error;}finally{
 await query('update public.vendor_batch_intake_control set enabled=false where singleton;');
 for(const id of fixture.copies){
  const current=await readCopy(id);
  if(!current.archived_at){const r=await owner.client.rpc('vault_archive_exact_instance_v1',{p_instance_id:id});if(r.error)fixture.cleanupWarning=r.error.message;}
 }
 fixture.status=failure?'failed':'passed';save();
 for(const s of sessions)await s.client.auth.signOut({scope:'local'});
 const report={at:new Date().toISOString(),status:fixture.status,target,checks,existingCopies:before.copies.length,retainedSyntheticArchivedCopies:fixture.copies.length,batchControlAfter:false,productionWrites:0,...(failure?{error:String(failure)}:{})};
 fs.writeFileSync(path.join(root,'docs/audits/vendor_batch_commit_v1/hosted-20260923.json'),JSON.stringify(report,null,2));
}
if(failure)throw failure;
