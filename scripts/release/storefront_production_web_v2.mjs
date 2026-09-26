// Freeze and build a production-target website without moving any public domain.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,hash} from '../schema/storefront_production_trial_lab_v1.mjs';
assert.equal(process.argv.length,3);const mode=process.argv[2];assert.ok(['package','deploy','status'].includes(mode));
const project='prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum',team='team_EFKFYSau9Gf8wEaix8zXgQZG',alias='grookaivault.com';
const dir=path.join(root,'.local/integration/production-web-v2'),audit=path.join(root,'docs/audits/storefront_production_trials_v1');
const token=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'))).token;
const api=async route=>{const r=await fetch('https://api.vercel.com'+route+(route.includes('?')?'&':'?')+'teamId='+team,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});assert.ok(r.ok,`Hosting read HTTP ${r.status}`);return r.json();};
const save=(name,data)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(data,null,2),{flag:'wx'});
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name)));
const settings={GROOKAI_STORE_PRODUCTION_V1:'true',GROOKAI_STORE_TRIAL_V1:'true',GROOKAI_COLLECTOR_RELEASE_V1:'true',NEXT_PUBLIC_SUPABASE_URL:'https://ycdxbpibncqcchqiihfz.supabase.co',NEXT_PUBLIC_SITE_URL:'https://grookaivault.com',SITE_URL:'https://grookaivault.com',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',
  GROOKAI_STORE_BATCH_COMMIT_ENABLED:'true',GROOKAI_STORE_BATCH_CANCELLATION_ENABLED:'true',
  GROOKAI_STORE_SCAN_MATCH_V2_ENABLED:'true',GROOKAI_STORE_SCAN_MATCH_V13_ENABLED:'false',GROOKAI_STORE_SCAN_MATCH_V14_ENABLED:'false',GROOKAI_STORE_SCAN_VISUAL_V24_ENABLED:'true',GROOKAI_STORE_SCAN_VISUAL_V25_ENABLED:'true',GROOKAI_STORE_SCAN_VISUAL_V26_ENABLED:'false',GROOKAI_STORE_SCAN_METADATA_V27_ENABLED:'true',GROOKAI_STORE_SCAN_FEATURES_V29_ENABLED:'true',GROOKAI_STORE_SCAN_VISUAL_DIAGNOSTICS:'false',GROOKAI_STORE_SCAN_RESOURCE_DIAGNOSTICS:'false',
  NEXT_PUBLIC_VENDOR_PILOT:'false',NEXT_PUBLIC_VENDOR_DEVICE_QA:'false',NEXT_PUBLIC_COLLECTOR_STAGING:'false',NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB:'false',NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING:'false',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'false',NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST:'false'};
async function hosting(){
  const [p,a,envs]=await Promise.all([api('/v9/projects/'+project),api('/v4/aliases/'+alias),api('/v10/projects/'+project+'/env')]);
  assert.equal(p.id,project);assert.equal(p.name,'grookai-vault');assert.equal(p.rootDirectory,'apps/web');assert.equal(p.nodeVersion,'24.x');
  const selected=envs.envs.filter(e=>e.target?.includes('production')&&!e.gitBranch);
  assert.ok(!selected.some(e=>e.key.startsWith('STRIPE_')),'Review unexpected payment configuration');
  for(const e of selected.filter(e=>e.key.startsWith('GROOKAI_VENDOR_')&&e.key.endsWith('_ENABLED'))){const detail=await api('/v1/projects/'+project+'/env/'+e.id);assert.notEqual(detail.value,'true','Payment rollout must remain disabled');}
  const values={};for(const key of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','GROOKAI_COLLECTOR_RELEASE_V1']){const entry=selected.find(e=>e.key===key);assert.ok(entry);const detail=await api('/v1/projects/'+project+'/env/'+entry.id+'?decrypt=true');assert.ok(detail.type==='plain'||detail.decrypted===true);values[key]=detail.value;}
  assert.equal(values.SUPABASE_URL,'https://ycdxbpibncqcchqiihfz.supabase.co');assert.equal(values.GROOKAI_COLLECTOR_RELEASE_V1,'true');
  // Verify real project credentials read-only, without persisting or logging them.
  const response=await fetch(values.SUPABASE_URL+'/storage/v1/bucket/vendor-scan-features-v29',{headers:{apikey:values.SUPABASE_SECRET_KEY,Authorization:'Bearer '+values.SUPABASE_SECRET_KEY},signal:AbortSignal.timeout(15000)});assert.ok(response.ok,'Existing production server credential cannot read its private cache');assert.equal((await response.json()).public,false);
  return {at:new Date().toISOString(),project,alias,previous:a.deploymentId,nodeVersion:p.nodeVersion,sourceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),paymentsDisabled:true};
}
if(mode==='package'){
  assert.ok(!fs.existsSync(dir));const state=await hosting();
  const checks=fs.readdirSync(audit).filter(n=>/^shipcheck-.*\.json$/.test(n)).map(n=>JSON.parse(fs.readFileSync(path.join(audit,n))));assert.ok(checks.some(r=>r.status==='passed'&&Date.now()-Date.parse(r.at)<7200000));
  fs.mkdirSync(dir,{recursive:true});save('hosting-before.json',state);
  const dest=path.join(dir,'web-package');
  const selected=new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','apps/web','scripts/ci/run_next_build_with_system_ca.mjs','scripts/ci/preserve_storefront_build_config.mjs','scripts/generate_public_set_card_counts.mjs'],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean));
  const config=fs.readFileSync(path.join(root,'apps/web/next.config.mjs'),'utf8');
  for(const match of config.matchAll(/"\.\.\/\.\.\/(docs\/[^"\n]+)"/g)){
    const relative=match[1];assert.ok(!relative.includes('..'));
    if(relative.includes('*')){assert.ok(relative.endsWith('/*.json'));const parent=relative.slice(0,-7);for(const name of fs.readdirSync(path.join(root,parent)).filter(n=>n.endsWith('.json')))selected.add(parent+'/'+name);}
    else if(fs.existsSync(path.join(root,relative)))selected.add(relative);
  }
  const files=[];
  for(const relative of selected){
    if(/(^|\/)(\.env[^/]*|node_modules|\.next[^/]*|\.vercel|private|tests|test-results|playwright-report|visual-fixtures)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/.test(relative)||relative.startsWith('apps/web/scripts/'))continue;
    const bytes=fs.readFileSync(path.join(root,relative)),destination=path.join(dest,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes,{flag:'wx'});files.push({path:relative,sha256:hash(bytes),bytes:bytes.length});
  }
  for(const name of ['scanExpandedCatalogV13.json.gz','scanExpandedMetadataV27.json.gz','scanExpandedFeaturesV29.json.gz'])assert.ok(files.some(f=>f.path==='apps/web/src/lib/stores/'+name));
  fs.mkdirSync(path.join(dest,'.vercel'));fs.writeFileSync(path.join(dest,'.vercel/project.json'),JSON.stringify({projectId:project,orgId:team}),{flag:'wx'});
  save('package.json',{...state,dest,settings,files});console.log(JSON.stringify({status:'packaged',files:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0),aliasUnchanged:true}));
}else if(mode==='deploy'){
  const state=await hosting(),plan=read('package.json');assert.equal(state.previous,plan.previous);
  const schema=JSON.parse(fs.readFileSync(path.join(audit,'production-applied.json')));assert.equal(schema.status,'passed');assert.equal(schema.target,'ycdxbpibncqcchqiihfz');
  for(const file of plan.files)assert.equal(hash(fs.readFileSync(path.join(plan.dest,file.path))),file.sha256);
  assert.deepEqual(plan.settings,settings);assert.ok(!fs.existsSync(path.join(dir,'deploy-intent.json')));
  save('deploy-intent.json',{at:new Date().toISOString(),project,previous:plan.previous,packageSha256:hash(fs.readFileSync(path.join(dir,'package.json'))),settings,skipDomain:true});
  const cli='C:/Users/ccabr/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/index.js';
  const args=['--use-system-ca',cli,'deploy',plan.dest,'--yes','--no-wait','--prod','--skip-domain','--scope','sosejis-projects'];
  for(const [key,value] of Object.entries(settings))args.push('--env',key+'='+value,'--build-env',key+'='+value);
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/(SUPABASE|STRIPE|GROOKAI|PSA|UPSTASH|VERCEL|RESEND|SENTRY|BRIDGE|POSTHOG)/.test(key)));env.NODE_OPTIONS='--use-system-ca --dns-result-order=ipv4first';env.NO_UPDATE_NOTIFIER='1';
  const output=execFileSync(process.execPath,args,{cwd:plan.dest,env,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:240000,maxBuffer:4*1024*1024});
  const url=(output.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/g)??[]).at(-1);assert.ok(url);assert.match(new URL(url).hostname,/^grookai-vault-[a-z0-9]+-sosejis-projects\.vercel\.app$/);
  save('submitted.json',{at:new Date().toISOString(),project,url});assert.equal((await api('/v4/aliases/'+alias)).deploymentId,plan.previous);console.log(JSON.stringify({status:'submitted',url,aliasUnchanged:true}));
}else{
  const submitted=read('submitted.json'),plan=read('package.json');const deployment=await api('/v13/deployments/'+new URL(submitted.url).hostname);assert.equal(deployment.projectId,project);
  const a=await api('/v4/aliases/'+alias);assert.equal(a.deploymentId,plan.previous);
  const report={at:new Date().toISOString(),id:deployment.id,url:submitted.url,state:deployment.readyState,errorCode:deployment.errorCode,errorMessage:deployment.errorMessage,aliasUnchanged:true};
  save('status-'+Date.now()+'.json',report);if(deployment.readyState==='READY'&&!fs.existsSync(path.join(dir,'ready.json')))save('ready.json',report);console.log(JSON.stringify(report));
}
