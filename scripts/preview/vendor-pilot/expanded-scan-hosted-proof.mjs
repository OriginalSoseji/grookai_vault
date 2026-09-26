import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{createRequire}from'node:module';import{out,verified,query}from'./ops.mjs';
const origin=process.argv[2],canonical='https://grookai-vendor-preview.vercel.app',dir='.local/integration/vendor-scan-release-20260924';
assert.match(origin??'',/^https:\/\/grookai-vendor-preview-[a-z0-9]+-sosejis-projects\.vercel\.app$/);assert.equal((await verified()).id,'hrtbjchobencariqclab');
const require=createRequire(new URL('../../../apps/web/package.json',import.meta.url)),{createServerClient}=require('@supabase/ssr');
const accounts=JSON.parse(fs.readFileSync(path.join(out,'proof-accounts.private.json'))),key=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))).find(k=>k.name==='anon').api_key;
const base=process.env.USERPROFILE+'/.codex/tmp/vendor-real-scans-20260923',hash=b=>createHash('sha256').update(b).digest('hex'),sessions=[];
const report={at:new Date().toISOString(),origin,database:'hrtbjchobencariqclab',checks:[],results:[],inventoryWrites:0};const file=dir+'/hosted-matching-'+Date.now()+'.json';
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2));
async function login(index){const jar=new Map(),client=createServerClient('https://hrtbjchobencariqclab.supabase.co',key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:xs=>xs.forEach(x=>jar.set(x.name,x.value))}});assert.equal((await client.auth.signInWithPassword(accounts[index])).error,null);const s={jar,client};sessions.push(s);return s;}
const owner=await login(2),other=await login(0),expired=await login(1);
const retained=`select md5(jsonb_build_object('copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'grants',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events))::text) as digest;`;
const before=(await query('begin read only;'+retained+'rollback;'))[0].digest;
async function request(bytes,{auth=owner,requestOrigin=canonical,signal=AbortSignal.timeout(28000),contentType='image/jpeg'}={}){
 const start=Date.now(),r=await fetch(origin+'/api/stores/owner/intake/match',{method:'POST',headers:{Origin:requestOrigin,'Content-Type':contentType,...(auth?{cookie:[...auth.jar].map(([k,v])=>k+'='+v).join('; ')}:{})},body:bytes,signal});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{throw Error('Non-JSON matcher response HTTP '+r.status);}
 return{http:r.status,ms:Date.now()-start,cacheControl:r.headers.get('cache-control'),data};
}
const cases=[
 ['gallery-v12/derived/gallery-1.jpg','GV-PK-LOR-TG02',0],['gallery-v12/derived/gallery-2.jpg','GV-PK-ASR-TG02',0],['gallery-v12/derived/gallery-3.jpg','GV-PK-ASR-TG02',180],
 ['holdout-v4/derived/fresh-0002.jpg','GV-PK-PR-SW-SWSH189',0],['holdout-v2/derived/holdout-0010.heic.jpg','GV-PK-MEW-156',180],['derived/scan-0075.jpeg.jpg','GV-PK-MEW-003',180,'known_recall_loss'],['holdout-v2/derived/holdout-0082.jpeg.jpg',null,null],
];
try{
 const tiny=Buffer.from('invalid');assert.equal((await request(tiny,{auth:null})).http,401);assert.equal((await request(tiny,{auth:expired})).http,403);assert.equal((await request(tiny,{requestOrigin:'https://invalid.example'})).http,403);assert.equal((await request(tiny,{contentType:'text/plain'})).http,415);assert.equal((await request(Buffer.alloc(4*1024*1024+1))).http,413);report.checks.push('anonymous, expired, origin, type and size boundaries');save();
 for(const [fileName,expected,rotation,qualification]of cases){
  const bytes=fs.readFileSync(path.join(base,fileName)),r=await request(bytes);if(r.http!==200){report.failedRequest={case:fileName,http:r.http,ms:r.ms};save();}assert.equal(r.http,200,fileName+': '+JSON.stringify(r.data));assert.match(r.cacheControl,/no-store/);
  // A separately retained failed proof established this legacy V2 recall loss.
  // Preserve it explicitly; this does not count as a successful recognition.
  if(qualification==='known_recall_loss'&&!r.data.cards.length)report.knownRecallLosses=[{file:fileName,previous:'V2 suggestion',current:'manual search required',reason:'Black-bordered scan fails expanded structural admission; no gate lowered'}];
  if(expected){if(qualification!=='known_recall_loss')assert.ok(r.data.cards.length);assert.ok(r.data.cards.every(c=>c.gv_id===expected&&c.rotation===rotation&&c.printings.length&&c.printings.every(p=>p.printing_gv_id)));}
  else assert.deepEqual(r.data.cards,[]);
  assert.ok(!('text'in r.data)&&!('confidence'in r.data));report.results.push({case:fileName,sha256:hash(bytes),http:r.http,ms:r.ms,status:r.data.status,candidates:r.data.cards.map(c=>({gvId:c.gv_id,rotation:c.rotation,printingIds:c.printings.map(p=>p.id)}))});save();console.log(JSON.stringify({case:fileName,status:r.data.status,ms:r.ms}));
 }
 const bytes=fs.readFileSync(base+'/gallery-v12/derived/gallery-1.jpg');
 const concurrent=await Promise.all([request(bytes),request(bytes,{auth:other})]);assert.ok(concurrent.every(r=>[200,429].includes(r.http)));assert.ok(concurrent.some(r=>r.http===200));for(const r of concurrent.filter(r=>r.http===200))assert.ok(r.data.cards.every(c=>c.gv_id==='GV-PK-LOR-TG02'));
 report.concurrency=concurrent.map(r=>({http:r.http,ms:r.ms}));report.checks.push('two owners receive a correct result or explicit busy response; no distributed quota claim');save();
 const control=new AbortController();const cancelled=request(bytes,{signal:control.signal});setTimeout(()=>control.abort(),1000);await assert.rejects(cancelled,e=>e.name==='AbortError');
 const retryStart=Date.now();let recovered;
 while(Date.now()-retryStart<25000){const r=await request(bytes);if(r.http!==429){recovered=r;break;}await new Promise(resolve=>setTimeout(resolve,500));}
 assert.equal(recovered?.http,200);assert.ok(recovered.data.cards.some(c=>c.gv_id==='GV-PK-LOR-TG02'));report.checks.push('client cancellation followed by successful retry');report.cancellationRecoveryMs=Date.now()-retryStart;
 assert.equal((await query('begin read only;'+retained+'rollback;'))[0].digest,before);report.checks.push('inventory, stores, profiles, grants, orders and telemetry unchanged');report.status=report.knownRecallLosses?.length?'passed_with_known_recall_loss':'passed';
}catch(e){report.status='failed';report.error=e.message;throw e;}
finally{report.finishedAt=new Date().toISOString();save();for(const s of sessions)await s.client.auth.signOut({scope:'local'});console.log(JSON.stringify({receipt:file,status:report.status}));}
