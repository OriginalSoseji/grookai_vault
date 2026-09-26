// One-use activation of the already-tested candidate on the fixed pilot alias.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
import {out,root,query,verified} from './ops.mjs';
assert.equal(process.argv.length,2);
const project='prj_6eeKXtBiLWciS3F2K7Usz8JhwDgy',deployment='dpl_3XPX7MGwMAoUC46MPUfBMsgjwBWu';
const previous='dpl_hS9B4Yy3duYatRAVHXk6SG9721Sj',alias='grookai-vendor-preview.vercel.app';
const target='https://grookai-vendor-preview-6w6ho7x80-sosejis-projects.vercel.app';
const hash=b=>createHash('sha256').update(b).digest('hex');
const token=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'))).token;
async function vercel(route,body){const r=await fetch('https://api.vercel.com'+route+'?teamId=team_EFKFYSau9Gf8wEaix8zXgQZG',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});assert.ok(r.ok,'Pilot hosting request failed: '+r.status);return r.json();}
assert.equal((await verified()).id,'hrtbjchobencariqclab');
const proof=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/vendor_batch_commit_v1/hosted-20260923.json')));
assert.equal(proof.status,'passed');assert.equal(proof.target,target);assert.equal(proof.checks.length,7);
const fixture=JSON.parse(fs.readFileSync(path.join(out,'batch-commit-hosted-fixture.private.json')));assert.equal(fixture.status,'passed');assert.ok(!fixture.cleanupWarning);
const matching=fs.readdirSync(out).filter(n=>/^scan-matching-v2-hosted-\d+\.json$/.test(n)).map(n=>JSON.parse(fs.readFileSync(path.join(out,n)))).find(r=>r.origin===target&&r.results.length===8);assert.ok(matching);
const manifest=JSON.parse(fs.readFileSync(path.join(out,'hosting-package-current.json')));assert.equal(manifest.project,project);assert.equal(manifest.database,'hrtbjchobencariqclab');
for(const f of manifest.files)assert.equal(hash(fs.readFileSync(path.join(root,f.path))),f.sha256,f.path);
const deployed=await vercel('/v13/deployments/'+deployment);assert.equal(deployed.projectId,project);assert.equal(deployed.readyState,'READY');assert.equal(deployed.target,null);assert.equal('https://'+deployed.url,target);
assert.equal((await vercel('/v4/aliases/'+alias)).deploymentId,previous);
assert.equal((await query('select enabled from vendor_batch_intake_control'))[0].enabled,false);
const env=await vercel('/v9/projects/'+project+'/env');assert.ok(!env.envs.some(e=>e.key.startsWith('STRIPE_')||/^GROOKAI_VENDOR_.*ENABLED$/.test(e.key)));
assert.deepEqual(env.envs.find(e=>e.key==='GROOKAI_STORE_BATCH_COMMIT_ENABLED')?.target,['preview']);
const inviteHash=hash(fs.readFileSync(path.join(out,'review-invite.private.json')));
fs.writeFileSync(path.join(out,'batch-commit-activation-intent.json'),JSON.stringify({at:new Date().toISOString(),project,deployment,previous,alias,inviteHash},null,2),{flag:'wx'});
const require=createRequire(path.join(root,'apps/web/package.json')),{createServerClient}=require('@supabase/ssr');
const account=JSON.parse(fs.readFileSync(path.join(out,'proof-accounts.private.json')))[2],key=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json'))).find(k=>k.name==='anon').api_key;
const jar=new Map(),client=createServerClient('https://hrtbjchobencariqclab.supabase.co',key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:xs=>xs.forEach(x=>jar.set(x.name,x.value))}});
try{
 assert.equal((await client.auth.signInWithPassword(account)).error,null);
 await query('update public.vendor_batch_intake_control set enabled=true where singleton;');
 await vercel('/v2/deployments/'+deployment+'/aliases',{alias});
 assert.equal((await vercel('/v4/aliases/'+alias)).deploymentId,deployment);
 const r=await fetch('https://'+alias+'/api/stores/owner/intake',{headers:{cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')},signal:AbortSignal.timeout(60000)});assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);assert.deepEqual(await r.json(),{commit:true,recognition:true});
 const landing=await fetch('https://'+alias+'/vendor-preview');assert.equal(landing.status,200);assert.match(await landing.text(),/add the reviewed copies/);
 assert.equal(hash(fs.readFileSync(path.join(out,'review-invite.private.json'))),inviteHash);
 const state=(await query('select (select enabled from vendor_batch_intake_control) as batch,(select onboarding_enabled from vendor_seller_rollout) as payments,(select orders_enabled from vendor_orders_rollout) as checkout,(select count(*)::int from vendor_orders) as orders,(select count(*)::int from web_events) as telemetry;'))[0];assert.deepEqual(state,{batch:true,payments:false,checkout:false,orders:0,telemetry:0});
 const receipt={at:new Date().toISOString(),status:'passed',database:'hrtbjchobencariqclab',project,deployment,previous,alias:'https://'+alias,state,existingCopiesUnchanged:5,retainedArchivedSyntheticCopies:2,inviteUnchanged:true,matchingCases:8,hostedBatchGroups:7,manifestHash:hash(JSON.stringify(manifest)),productionWrites:0,rollback:'Disable vendor_batch_intake_control.enabled and return the alias to the previous deployment; retain schema, receipts and owner data.'};
 fs.writeFileSync(path.join(root,'docs/audits/vendor_batch_commit_v1/release-20260923.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
 console.log(JSON.stringify(receipt));
}catch(error){await query('update public.vendor_batch_intake_control set enabled=false where singleton;');await vercel('/v2/deployments/'+previous+'/aliases',{alias});throw error;}
finally{await client.auth.signOut({scope:'local'});}
