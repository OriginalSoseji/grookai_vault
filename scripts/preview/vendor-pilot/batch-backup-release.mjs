// UI-only release to the fixed isolated trial; no database or environment writes.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
import {out,root,query,verified} from './ops.mjs';
assert.equal(process.argv.length,2);
const project='prj_6eeKXtBiLWciS3F2K7Usz8JhwDgy',deployment='dpl_EZ2Xyi2puqj7hxiZEp4oMUxbZV1k',previous='dpl_3XPX7MGwMAoUC46MPUfBMsgjwBWu';
const canonical='https://grookai-vendor-preview.vercel.app',target='https://grookai-vendor-preview-7vhvcq5pk-sosejis-projects.vercel.app';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f));
const token=read(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json')).token;
async function vercel(route,body){const r=await fetch('https://api.vercel.com'+route+'?teamId=team_EFKFYSau9Gf8wEaix8zXgQZG',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});assert.ok(r.ok);return r.json();}
assert.equal((await verified()).id,'hrtbjchobencariqclab');
const proof=read(path.join(root,'docs/audits/vendor_batch_backup_v1/local-proof-20260923.json'));assert.equal(proof.status,'passed');
for(const [f,digest] of Object.entries(proof.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,f))),digest);
const manifest=read(path.join(out,'hosting-package-current.json'));assert.equal(manifest.project,project);assert.equal(manifest.database,'hrtbjchobencariqclab');
for(const f of manifest.files)assert.equal(hash(fs.readFileSync(path.join(root,f.path))),f.sha256);
const priorHash=read(path.join(root,'docs/audits/vendor_batch_commit_v1/release-20260923.json')).manifestHash;
const prior=fs.readdirSync(out).filter(n=>/^hosting-package-\d+\.json$/.test(n)).map(n=>read(path.join(out,n))).find(m=>hash(JSON.stringify(m))===priorHash);assert.ok(prior);
const oldFiles=new Map(prior.files.map(f=>[f.path,f.sha256]));
const changed=manifest.files.filter(f=>oldFiles.get(f.path)!==f.sha256).map(f=>f.path).sort();
assert.deepEqual(changed,Object.keys(proof.sourceHashes).sort());assert.ok(prior.files.every(f=>manifest.files.some(n=>n.path===f.path)));
const d=await vercel('/v13/deployments/'+deployment);assert.equal(d.projectId,project);assert.equal(d.readyState,'READY');assert.equal(d.target,null);assert.equal('https://'+d.url,target);
assert.equal((await vercel('/v4/aliases/grookai-vendor-preview.vercel.app')).deploymentId,previous);
const retainedSql=`select jsonb_build_object('copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'batch',(select enabled from vendor_batch_intake_control),'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events)) as state;`;
const before=read(path.join(out,'batch-backup-before.private.json'));assert.deepEqual((await query(retainedSql))[0].state,before);
const require=createRequire(path.join(root,'apps/web/package.json')),{createServerClient}=require('@supabase/ssr');
const accounts=read(path.join(out,'proof-accounts.private.json')),key=read(path.join(out,'keys.private.json')).find(k=>k.name==='anon').api_key;
const jar=new Map(),client=createServerClient('https://hrtbjchobencariqclab.supabase.co',key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:xs=>xs.forEach(x=>jar.set(x.name,x.value))}});
const inviteHash=hash(fs.readFileSync(path.join(out,'review-invite.private.json')));
let promoted=false;
async function check(origin){
 const request=async(route,auth=true)=>fetch(origin+route,{headers:auth?{cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}:{},signal:AbortSignal.timeout(60000)});
 assert.equal((await request('/api/stores/owner/intake',false)).status,401);
 const r=await request('/api/stores/owner/intake');assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);assert.deepEqual(await r.json(),{commit:true,recognition:true});
 assert.equal((await request('/account/store')).status,200);assert.equal((await request('/vendor-preview',false)).status,200);
}
try{
 assert.equal((await client.auth.signInWithPassword(accounts[2])).error,null);await check(target);
 fs.writeFileSync(path.join(out,'batch-backup-release-intent.json'),JSON.stringify({at:new Date().toISOString(),project,deployment,previous,changed},null,2),{flag:'wx'});
 await vercel('/v2/deployments/'+deployment+'/aliases',{alias:'grookai-vendor-preview.vercel.app'});promoted=true;
 assert.equal((await vercel('/v4/aliases/grookai-vendor-preview.vercel.app')).deploymentId,deployment);await check(canonical);
 assert.deepEqual((await query(retainedSql))[0].state,before);assert.equal(hash(fs.readFileSync(path.join(out,'review-invite.private.json'))),inviteHash);
 const receipt={at:new Date().toISOString(),status:'passed',project,deployment,previous,origin:canonical,changed,manifestHash:hash(JSON.stringify(manifest)),existingCopiesUnchanged:before.copies.length,profileStoreInventoryUnchanged:true,inviteUnchanged:true,batchAndMatchingEnabled:true,databaseWrites:0,environmentWrites:0,productionWrites:0,rollback:'Return only the pilot alias to '+previous+'; retain browser backups and server receipts.'};
 fs.writeFileSync(path.join(root,'docs/audits/vendor_batch_backup_v1/release-20260923.json'),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}catch(error){if(promoted)await vercel('/v2/deployments/'+previous+'/aliases',{alias:'grookai-vendor-preview.vercel.app'});throw error;}
finally{await client.auth.signOut({scope:'local'});}
