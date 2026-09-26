import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{createRequire}from'node:module';
import{out,verified,query}from'./ops.mjs';
const variant=process.argv[2]??'metadata';assert.ok(['baseline','metadata'].includes(variant));const dir='.local/integration/vendor-scan-hosted-v27-'+variant,read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const ready=read(dir+'/ready.json'),origin=ready.url,canonical='https://grookai-vendor-preview.vercel.app';
assert.match(origin,/^https:\/\/grookai-vendor-preview-[a-z0-9]+-sosejis-projects\.vercel\.app$/);assert.equal((await verified()).id,'hrtbjchobencariqclab');
const output=dir+'/hosted-proof.private.json';assert.ok(!fs.existsSync(output));
const require=createRequire(new URL('../../../apps/web/package.json',import.meta.url)),{createServerClient}=require('@supabase/ssr');
const accounts=read(path.join(out,'proof-accounts.private.json')),key=read(path.join(out,'keys.private.json')).find(k=>k.name==='anon').api_key,sessions=[];
async function login(i){const jar=new Map(),client=createServerClient('https://hrtbjchobencariqclab.supabase.co',key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:rows=>rows.forEach(r=>jar.set(r.name,r.value))}});const r=await client.auth.signInWithPassword(accounts[i]);assert.ok(!r.error,'Synthetic login failed');const result={client,jar};sessions.push(result);return result;}
const owner=await login(2),other=await login(0),expired=await login(1);
const retained=`select md5(jsonb_build_object('copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'grants',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events))::text) as digest;`;
const before=(await query('begin read only;'+retained+'rollback;'))[0].digest;
const report={at:new Date().toISOString(),deployment:ready.id,origin,scope:'Direct HTTPS requests to unshared deployment using synthetic owner sessions and canonical Origin header; not browser or physical-device proof.',database:'hrtbjchobencariqclab',beforeDigest:before,checks:[],rows:[]};
const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2));save();
async function request(bytes,{auth=owner,requestOrigin=canonical,signal=AbortSignal.timeout(40000),contentType='image/jpeg'}={}){
 const start=performance.now(),response=await fetch(origin+'/api/stores/owner/intake/match',{method:'POST',headers:{Origin:requestOrigin,'Content-Type':contentType,...(auth?{cookie:[...auth.jar].map(([k,v])=>k+'='+v).join('; ')}:{})},body:bytes,signal});
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{throw Error('Non-JSON response HTTP '+response.status);}
 return{http:response.status,ms:Math.round(performance.now()-start),cache:response.headers.get('cache-control'),data};
}
const labels=read('.local/integration/vendor-scan-visual-v16/labels.private.json'),previous=read('.local/integration/vendor-scan-visual-v23/regression.private.json');
const lost=new Set(['holdout-0041.heic','holdout-0081.jpeg','holdout-0083.jpeg','holdout-0085.jpeg','holdout-0087.jpeg','holdout-0089.jpeg','holdout-0091.jpeg','holdout-0095.jpeg','holdout-0097.jpeg']);
let cases=labels.filter(r=>['gallery_v12','browser_heic','legacy'].includes(r.corpus)||r.corpus==='v2_100'&&lost.has(r.file)).map(r=>({...r,expectedResult:previous.rows.find(p=>p.corpus===r.corpus&&p.file===r.file)}));
cases=cases.filter(r=>r.corpus==='browser_heic'||r.corpus==='gallery_v12'&&r.file==='gallery-3.jpg'||r.file==='holdout-0041.heic'||r.corpus==='legacy');
try{
 const tiny=Buffer.from('invalid');
 for(const[name,payload,options,status]of [['anonymous',tiny,{auth:null},401],['expired package',tiny,{auth:expired},403],['foreign origin',tiny,{requestOrigin:'https://invalid.example'},403],['invalid media type',tiny,{contentType:'text/plain'},415],['oversized body',Buffer.alloc(4*1024*1024+1),{},413]]){
  const r=await request(payload,options);report.checks.push({name,http:r.http,passed:r.http===status});save();assert.equal(r.http,status,name);
 }
 for(const label of cases){
  const bytes=fs.readFileSync(label.path);assert.equal(hash(bytes),label.sha256);const r=await request(bytes),expected=label.expectedResult.candidates;
  const same=r.http===200&&r.data.cards?.length===expected.length&&r.data.cards.every(c=>expected.some(e=>e.id===c.id&&e.rotation===c.rotation)&&c.printings?.length&&c.printings.every(p=>p.printing_gv_id));
  report.rows.push({corpus:label.corpus,file:label.file,sha256:label.sha256,http:r.http,ms:r.ms,same,status:r.data.status,error:r.data.error,candidates:(r.data.cards??[]).map(c=>({id:c.id,gv_id:c.gv_id,rotation:c.rotation,printingCount:c.printings?.length}))});save();console.log(JSON.stringify({file:label.file,http:r.http,ms:r.ms,same}));
  assert.equal(r.http,200,'Matching unavailable');assert.match(r.cache,/no-store/);assert.ok(same,'Result differs from frozen V23 expectation');
 }
 const fresh=process.env.USERPROFILE+'/.codex/tmp/vendor-real-scans-20260923/holdout-visual-v23';
 for(const file of['fresh-01.jpeg','fresh-12.jpeg']){const r=await request(fs.readFileSync(fresh+'/derived/'+file));report.rows.push({file,http:r.http,ms:r.ms,same:r.http===200&&r.data.cards?.length===0,status:r.data.status});save();assert.equal(r.http,200);assert.deepEqual(r.data.cards,[]);}
 if(variant==='metadata'){
 const bytes=fs.readFileSync(cases.find(r=>r.corpus==='browser_heic').path),expected='GV-PK-LOR-TG02';
 const concurrent=await Promise.all([request(bytes),request(bytes,{auth:other})]);report.concurrency=concurrent.map(r=>({http:r.http,ms:r.ms,cards:r.data.cards?.map(c=>c.gv_id)}));save();assert.ok(concurrent.every(r=>[200,429].includes(r.http)));assert.ok(concurrent.some(r=>r.http===200));for(const r of concurrent.filter(r=>r.http===200))assert.ok(r.data.cards.some(c=>c.gv_id===expected));
 const controller=new AbortController(),pending=request(bytes,{signal:controller.signal});setTimeout(()=>controller.abort(),8000);await assert.rejects(pending,e=>e.name==='AbortError');
 const start=performance.now();let retry;
 await new Promise(resolve=>setTimeout(resolve,1500));retry=await request(bytes);report.cancellation={clientAbortAfterMs:8000,graceMs:1500,firstRetryHttp:retry.http,retryMs:Math.round(performance.now()-start)};save();
 assert.equal(retry.http,200);assert.ok(retry.data.cards.some(c=>c.gv_id===expected));report.cancellation={...report.cancellation,passed:true,retryMs:Math.round(performance.now()-start)};
 }
 report.status='passed';
}catch(error){report.status='failed';report.error=error.message;process.exitCode=1;}
finally{
 try{const after=(await query('begin read only;'+retained+'rollback;'))[0].digest;report.afterDigest=after;report.retainedDataUnchanged=after===before;if(after!==before){report.status='failed';process.exitCode=1;}}catch{report.readbackError=true;report.status='failed';process.exitCode=1;}
 report.finishedAt=new Date().toISOString();save();for(const s of sessions)await s.client.auth.signOut({scope:'local'});console.log(JSON.stringify({status:report.status,cases:report.rows.length,same:report.rows.filter(r=>r.same).length,error:report.error,retainedDataUnchanged:report.retainedDataUnchanged}));
}
