import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createRequire}from'node:module';import{out,verified}from'./ops.mjs';
const origin=process.argv[2],canonical='https://grookai-vendor-preview.vercel.app',dir='.local/integration/vendor-scan-release-20260924';
assert.ok(origin===canonical||/^https:\/\/grookai-vendor-preview-[a-z0-9]+-sosejis-projects\.vercel\.app$/.test(origin));assert.equal((await verified()).id,'hrtbjchobencariqclab');
const require=createRequire(new URL('../../../apps/web/package.json',import.meta.url)),{createServerClient}=require('@supabase/ssr'),jar=new Map();
const key=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))).find(k=>k.name==='anon').api_key,account=JSON.parse(fs.readFileSync(path.join(out,'proof-accounts.private.json')))[2];
const client=createServerClient('https://hrtbjchobencariqclab.supabase.co',key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:xs=>xs.forEach(x=>jar.set(x.name,x.value))}});
assert.equal((await client.auth.signInWithPassword(account)).error,null);
const report={at:new Date().toISOString(),origin,checks:[],results:[],inventoryWrites:0},file=dir+'/search-recovery-hosted-'+Date.now()+'.json';
async function request(route,options={},auth=true){const start=Date.now(),r=await fetch(origin+route,{...options,headers:{...(auth?{cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}:{}),...options.headers},signal:AbortSignal.timeout(28000)});return{status:r.status,ms:Date.now()-start,cache:r.headers.get('cache-control'),data:await r.json()};}
try{
 assert.equal((await request('/api/stores/owner/inventory?q=Roserade',{},false)).status,401);report.checks.push('anonymous inventory search denied');
 for(const [q,expected]of [['GV-PK-LOR-TG02','GV-PK-LOR-TG02'],['GV-PK-ASR-TG02','GV-PK-ASR-TG02'],['Roserade','GV-PK-LOR-TG02'],['Flapple','GV-PK-ASR-TG02']]){const r=await request('/api/stores/owner/inventory?q='+encodeURIComponent(q));assert.equal(r.status,200);assert.match(r.cache,/no-store/);assert.ok(r.data.cards.some(c=>c.gv_id===expected&&c.printings.length));assert.ok(r.data.cards.length<=60);report.results.push({q,ms:r.ms,count:r.data.cards.length,expectedPresent:true});}
 const pages=[];for(const offset of [0,20]){const r=await request('/api/stores/owner/inventory?q=Pikachu&offset='+offset);assert.equal(r.status,200);pages.push(r.data);}
 assert.ok(pages[0].more&&pages[1].cards.length);assert.equal(pages[0].cards.filter(c=>pages[1].cards.some(d=>d.id===c.id)).length,0);report.checks.push('two search pages retain distinct bounded results');
 const intake=await request('/api/stores/owner/intake');assert.equal(intake.status,200);assert.equal(intake.data.recognition,true);assert.equal(intake.data.commit,true);
 const bytes=fs.readFileSync(process.env.USERPROFILE+'/.codex/tmp/vendor-real-scans-20260923/derived/scan-0075.jpeg.jpg');
 const match=await request('/api/stores/owner/intake/match',{method:'POST',headers:{Origin:canonical,'Content-Type':'image/jpeg'},body:bytes});assert.equal(match.status,200);assert.ok(match.data.cards.length);assert.ok(match.data.cards.every(c=>c.gv_id==='GV-PK-MEW-003'&&c.rotation===180));report.legacyMatch={ms:match.ms,gvIds:match.data.cards.map(c=>c.gv_id)};report.checks.push('previously recognized bordered Venusaur still recognized by V2');
 for(const [route,body]of [['/api/vendor-billing/owner',{action:'checkout',plan:'store_web'}],['/api/vendor-payments/owner',{action:'onboarding'}]])assert.equal((await request(route,{method:'POST',headers:{Origin:canonical,'Content-Type':'application/json'},body:JSON.stringify(body)})).status,503);
 report.checks.push('billing and seller payment actions remain disabled');report.status='passed';
}catch(e){report.status='failed';report.error=String(e.message).split('\n')[0];process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(report,null,2));await client.auth.signOut({scope:'local'});console.log(JSON.stringify({receipt:file,...report}));}
