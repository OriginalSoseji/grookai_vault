import {exec,out,root,target,verifyTarget} from './collector_hosted_ops.mjs';
import {vercel,project,team} from './collector_vercel_staging.mjs';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const p=project();const db=await verifyTarget();
const keys=JSON.parse(readFileSync(`${out}/private/keys.json`));
const settings={SUPABASE_URL:`https://${db.id}.supabase.co`,SUPABASE_PUBLISHABLE_KEY:keys.find(k=>k.name==='anon').api_key,SUPABASE_SECRET_KEY:keys.find(k=>k.name==='service_role').api_key,
 NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING:'true',NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB:'false',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',
 NEXT_PUBLIC_SITE_URL:'https://grookai-collector-staging.vercel.app',SITE_URL:'https://grookai-collector-staging.vercel.app',NEXT_TELEMETRY_DISABLED:'1'};
for(const flag of ['SCHEMA_RPC','PERSONAL','CUSTOM','SET','SHARED','VIEW_LINKS','PUBLIC','COMMUNITY','TEMPLATES','NOTIFICATIONS','PULSE_SHARING'])settings[`GROOKAI_BINDERS_${flag}_V1_ENABLED`]=['SCHEMA_RPC','PERSONAL','CUSTOM'].includes(flag)?'true':'false';
const mode=process.argv[2];
if(mode==='configure'){
 const fresh=await vercel(`/v9/projects/${p.id}`);assert.equal(fresh.ssoProtection.deploymentType,'all');assert.ok(!fresh.link);
 await vercel(`/v10/projects/${p.id}/env?upsert=true`,{method:'POST',body:Object.entries(settings).map(([key,value])=>({key,value,type:'encrypted',target:['preview','production']}))});
 console.log(JSON.stringify({configured:p.id,database:db.id,keys:Object.keys(settings),productionProjectUntouched:true}));
}else if(mode==='package'){
 const dest=`${out}/hosted-package-${Date.now()}`;
 const candidates=[...new Set(exec('git',['ls-files','--cached','--others','--exclude-standard','-z','--','apps/web','scripts/ci/run_next_build_with_system_ca.mjs','scripts/generate_public_set_card_counts.mjs']).split('\0').filter(Boolean))];
 const files=[];const hash=b=>createHash('sha256').update(b).digest('hex');
 for(const relative of candidates){
  if(/(^|\/)(\.env[^/]*|node_modules|\.next[^/]*|\.vercel|private|tests|test-results|playwright-report|visual-fixtures)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/.test(relative)||relative.startsWith('apps/web/scripts/'))continue;
  const bytes=readFileSync(`${root}/${relative}`);const dst=`${dest}/${relative}`;mkdirSync(path.dirname(dst),{recursive:true});writeFileSync(dst,bytes);assert.equal(hash(readFileSync(dst)),hash(bytes));files.push({path:relative,sha256:hash(bytes),bytes:bytes.length});
 }
 mkdirSync(`${dest}/.vercel`,{recursive:true});writeFileSync(`${dest}/.vercel/project.json`,JSON.stringify({projectId:p.id,orgId:team}));
 const manifest={createdAt:new Date().toISOString(),project:p.id,database:db.id,baseCommit:exec('git',['rev-parse','HEAD']).trim(),branch:exec('git',['branch','--show-current']).trim(),files,dest,notProduction:true};
 writeFileSync(`${out}/hosted-package-manifest.json`,JSON.stringify(manifest,null,2));console.log(JSON.stringify({dest,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)}));
}else if(mode==='deploy'){
 const manifest=JSON.parse(readFileSync(`${out}/hosted-package-manifest.json`));assert.equal(manifest.project,p.id);assert.equal(manifest.database,db.id);
 for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(`${manifest.dest}/${f.path}`)).digest('hex'),f.sha256);
 const cli='C:/Users/ccabr/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/index.js';assert.ok(existsSync(cli));
 // A first deployment may target "production" inside THIS isolated project.
 // It never targets grookai-vault or either preserved project.
 const clean=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(SUPABASE|PSA|UPSTASH|VERCEL|RESEND|SENTRY|BRIDGE|POSTHOG)/.test(k)));
 const output=exec(process.execPath,['--use-system-ca',cli,'deploy',manifest.dest,'--yes','--no-wait','--scope','sosejis-projects'],{env:clean});
 const urls=output.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/g)||[];assert.ok(urls.length);writeFileSync(`${out}/hosted-deployment-submit.json`,JSON.stringify({project:p.id,url:urls.at(-1),manifest:`${out}/hosted-package-manifest.json`,submittedAt:new Date().toISOString()},null,2));console.log(JSON.stringify({submitted:true,url:urls.at(-1),project:p.id}));
}else if(mode==='alias'){
 const list=await vercel(`/v6/deployments?projectId=${p.id}&limit=1`);const d=list.deployments[0];assert.equal(d.state,'READY');
 const detail=await vercel(`/v13/deployments/${d.uid}`);assert.equal(detail.projectId,p.id);
 const domains=await vercel(`/v9/projects/${p.id}/domains`);assert.ok(domains.domains.some(x=>x.name==='grookai-collector-staging.vercel.app'&&x.projectId===p.id));
 const existing=await vercel(`/v2/deployments/${d.uid}/aliases`);
 if(!existing.aliases.some(a=>a.alias==='grookai-collector-staging.vercel.app'))await vercel(`/v2/deployments/${d.uid}/aliases`,{method:'POST',body:{alias:'grookai-collector-staging.vercel.app'}});
 writeFileSync(`${out}/staging-alias.json`,JSON.stringify({project:p.id,deployment:d.uid,alias:'grookai-collector-staging.vercel.app',recordedAt:new Date().toISOString()},null,2));console.log(JSON.stringify({alias:'grookai-collector-staging.vercel.app',deployment:d.uid}));
}else if(mode==='status'){
 const list=await vercel(`/v6/deployments?projectId=${p.id}&limit=3`);console.log(JSON.stringify(list.deployments.map(d=>({id:d.uid,url:d.url,state:d.state,target:d.target}))));
}else throw Error('Explicit configure/package/deploy/status required');
