import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import{out,root,verified,query}from'./ops.mjs';
const variant=process.argv[3]??'metadata';assert.ok(['baseline','metadata'].includes(variant));const dir=path.join(root,'.local/integration/vendor-scan-hosted-v27-'+variant);fs.mkdirSync(dir,{recursive:true});
const team='team_EFKFYSau9Gf8wEaix8zXgQZG',project='prj_6eeKXtBiLWciS3F2K7Usz8JhwDgy',alias='grookai-vendor-preview.vercel.app',previous='dpl_F9id47NjSDscTwE2wx1F1gWpgGRR';
const token=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'))).token;
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex'),save=(name,data)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(data,null,2),{flag:'wx'});
async function api(route){const r=await fetch('https://api.vercel.com'+route+(route.includes('?')?'&':'?')+'teamId='+team,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});assert.ok(r.ok,'Hosting read failed HTTP '+r.status);return r.json();}
async function audit(){
 const db=await verified();assert.equal(db.id,'hrtbjchobencariqclab');
 const [p,a,env]=await Promise.all([api('/v9/projects/'+project),api('/v4/aliases/'+alias),api('/v10/projects/'+project+'/env?decrypt=true')]);
 assert.equal(p.name,'grookai-vendor-preview');assert.ok(!p.link);assert.equal(p.autoAssignCustomDomains,false);assert.equal(a.deploymentId,previous);
 const selected=env.envs.filter(e=>e.target?.includes('preview')&&!e.gitBranch),values={};
 for(const e of selected){if(!['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','NEXT_PUBLIC_VENDOR_PILOT','NEXT_PUBLIC_COLLECTOR_STAGING','GROOKAI_DISABLE_TELEMETRY'].includes(e.key)&&!e.key.startsWith('STRIPE_')&&!(e.key.startsWith('GROOKAI_VENDOR_')&&e.key.endsWith('_ENABLED')))continue;const detail=await api('/v1/projects/'+project+'/env/'+e.id);assert.ok(detail.decrypted===true,'Environment value was not decrypted');values[e.key]=detail.value;}
 assert.ok(values.SUPABASE_URL==='https://hrtbjchobencariqclab.supabase.co','Preview database mismatch');assert.ok(values.NEXT_PUBLIC_VENDOR_PILOT==='true'&&values.NEXT_PUBLIC_COLLECTOR_STAGING==='true'&&values.GROOKAI_DISABLE_TELEMETRY==='1','Preview mode mismatch');
 assert.ok(!Object.entries(values).some(([k,v])=>k.startsWith('STRIPE_')&&v||k.startsWith('GROOKAI_VENDOR_')&&k.endsWith('_ENABLED')&&v==='true'));
 const keys=read(path.join(out,'keys.private.json'));assert.ok(values.SUPABASE_PUBLISHABLE_KEY===keys.find(k=>k.name==='anon').api_key,'Publishable credential mismatch');assert.ok(values.SUPABASE_SECRET_KEY===keys.find(k=>k.name==='service_role').api_key,'Server credential mismatch');
 return{at:new Date().toISOString(),project,database:db.id,alias,previous,nodeVersion:p.nodeVersion,resourceConfig:p.resourceConfig,previewKeys:Object.keys(values).sort(),paymentsDisabled:true,telemetryDisabled:true};
}
const mode=process.argv[2];
if(mode==='audit'){
 const state=await audit();const counts=await query('begin read only; select (select count(*) from card_prints) cards,(select count(*) from sets) sets,(select count(*) from card_printings) printings,(select count(*) from card_print_traits) traits; rollback;');
 save('audit.json',{...state,counts});console.log(JSON.stringify({project,database:state.database,aliasUnchanged:true,counts}));
}else if(mode==='package'){
 await audit();
 const proofPath='docs/audits/vendor_scan_runtime_v26/PROOF_20260924.json',proof=read(path.join(root,proofPath));
 const changed=new Set(['scanVisualServerV24.ts'].map(n=>'apps/web/src/lib/stores/'+n));
 for(const[file,sha]of Object.entries(proof.sourceHashes))if(!changed.has(file))assert.equal(hash(fs.readFileSync(path.join(root,file))),sha);
 const frozen=read(path.join(root,'docs/audits/vendor_scan_visual_v23/PROOF_20260924.json'));
 for(const[file,sha]of Object.entries(frozen.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,file))),sha);
 const parity=read(path.join(root,'.local/integration/vendor-scan-runtime-v25/shortlist-parity.private.json'));
 assert.equal(parity.summary.same,320);assert.equal(parity.sourceSha256,hash(fs.readFileSync(path.join(root,'apps/web/src/lib/stores/scanShortlistV25.mjs'))));
 const runtime=read(path.join(root,'.local/integration/vendor-scan-runtime-v27/runtime-final.private.json'));
 assert.equal(runtime.summary.same,17);assert.equal(runtime.summary.errors,0);
 for(const[name,sha]of Object.entries(runtime.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,'apps/web/src/lib/stores',name))),sha);
 const log=fs.readFileSync(path.join(root,'.local/integration/vendor-scan-runtime-v27/tests.txt'),'utf8');assert.match(log,/# tests 39\b/);assert.match(log,/# fail 0\b/);
 const config=read(path.join(root,'apps/web/vercel.json'));assert.deepEqual(config.functions,{'src/app/api/stores/owner/intake/match/route.ts':{supportsCancellation:true}});
 assert.ok(proof.cancellation.serverAbortObserved&&proof.algorithmUnchanged);
 const dest=path.join(dir,'web-package');assert.ok(!fs.existsSync(dest));
 const names=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','apps/web','scripts/ci/run_next_build_with_system_ca.mjs','scripts/ci/preserve_storefront_build_config.mjs','scripts/generate_public_set_card_counts.mjs'],{cwd:root,encoding:'utf8',windowsHide:true}).split('\0').filter(Boolean),files=[];
 for(const relative of new Set(names)){
  if(/(^|\/)(\.env[^/]*|node_modules|\.next[^/]*|\.vercel|private|tests|test-results|playwright-report|visual-fixtures)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/.test(relative)||relative.startsWith('apps/web/scripts/'))continue;
  const b=fs.readFileSync(path.join(root,relative)),target=path.join(dest,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,b,{flag:'wx'});files.push({path:relative,sha256:hash(b),bytes:b.length});
 }
 fs.mkdirSync(path.join(dest,'.vercel'),{recursive:true});fs.writeFileSync(path.join(dest,'.vercel/project.json'),JSON.stringify({projectId:project,orgId:team}));
 save('package.json',{at:new Date().toISOString(),project,database:'hrtbjchobencariqclab',dest,files,sourceProofSha256:hash(fs.readFileSync(path.join(root,proofPath)))});console.log(JSON.stringify({packaged:true,files:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0)}));
}else if(mode==='deploy'||mode==='deploy-retry'){
 if(mode==='deploy-retry'){const old=read(path.join(dir,'deploy-intent.json'));assert.ok(!fs.existsSync(path.join(dir,'submitted.json')));const list=await api('/v6/deployments?projectId='+project+'&limit=10');assert.ok(!list.deployments.some(d=>d.createdAt>=Date.parse(old.at)),'Reconcile any submitted deployment before retry');}
 await audit();const plan=read(path.join(dir,'package.json'));assert.equal(plan.project,project);assert.ok(!fs.existsSync(path.join(dir,mode==='deploy'?'deploy-intent.json':'deploy-retry-intent.json')));
 for(const f of plan.files)assert.equal(hash(fs.readFileSync(path.join(plan.dest,f.path))),f.sha256);
 const settings={GROOKAI_STORE_SCAN_MATCH_V2_ENABLED:'true',GROOKAI_STORE_SCAN_MATCH_V13_ENABLED:'false',GROOKAI_STORE_SCAN_MATCH_V14_ENABLED:'false',GROOKAI_STORE_SCAN_VISUAL_V24_ENABLED:'true',GROOKAI_STORE_SCAN_VISUAL_V25_ENABLED:'true',GROOKAI_STORE_SCAN_VISUAL_V26_ENABLED:'false',GROOKAI_STORE_SCAN_METADATA_V27_ENABLED:variant==='metadata'?'true':'false',GROOKAI_STORE_SCAN_VISUAL_DIAGNOSTICS:'true',GROOKAI_STORE_SCAN_RESOURCE_DIAGNOSTICS:'true'};
 save(mode==='deploy'?'deploy-intent.json':'deploy-retry-intent.json',{at:new Date().toISOString(),project,previous,scope:'unshared preview only; deployment-specific flag overrides; no project setting or alias changes',settings});
 const cli='C:/Users/ccabr/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/index.js';
 const args=['--use-system-ca',cli,'deploy',plan.dest,'--yes','--no-wait','--scope','sosejis-projects'];
 for(const[k,v]of Object.entries(settings))args.push('--env',k+'='+v,'--build-env',k+'='+v);
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(SUPABASE|STRIPE|GROOKAI|PSA|UPSTASH|VERCEL|RESEND|SENTRY|BRIDGE|POSTHOG)/.test(k)));
 env.NODE_USE_SYSTEM_CA='1';env.NODE_OPTIONS='--use-system-ca --dns-result-order=ipv4first';env.NO_UPDATE_NOTIFIER='1';
 const output=execFileSync(process.execPath,args,{cwd:plan.dest,env,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});
 const urls=output.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/g)||[];assert.ok(urls.length);const url=urls.at(-1);assert.match(url,/^https:\/\/grookai-vendor-preview-[a-z0-9]+-sosejis-projects\.vercel\.app$/);
 save('submitted.json',{at:new Date().toISOString(),project,url});await audit();console.log(JSON.stringify({submitted:true,url,aliasUnchanged:true}));
}else if(mode==='status'){
 const submitted=read(path.join(dir,'submitted.json')),d=await api('/v13/deployments/'+new URL(submitted.url).hostname);assert.equal(d.projectId,project);
 const a=await api('/v4/aliases/'+alias);assert.equal(a.deploymentId,previous);
 const status={at:new Date().toISOString(),id:d.id,url:submitted.url,state:d.readyState,errorCode:d.errorCode,errorMessage:d.errorMessage,aliasUnchanged:true};
 save('status-'+Date.now()+'.json',status);if(d.readyState==='READY'&&!fs.existsSync(path.join(dir,'ready.json')))save('ready.json',status);console.log(JSON.stringify(status));
}else throw Error('Choose audit/package/deploy/status');
