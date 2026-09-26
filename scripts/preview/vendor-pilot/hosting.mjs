import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {out,root,verified} from './ops.mjs';
const team='team_EFKFYSau9Gf8wEaix8zXgQZG',name='grookai-vendor-preview',alias=name+'.vercel.app';
const preserved=['prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum','prj_pPujDVUHcFfqArtLGRQ4niAQbbFB','prj_uFWwtWB8nhubCGyl6EqkFKVc35eN','prj_oQ3eOCL0S5WcGOWE7w4Ux1iSu4N8'];
const token=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'),'utf8')).token;
const save=(file,data)=>fs.writeFileSync(path.join(out,file),JSON.stringify(data,null,2),{flag:'wx'});
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function vercel(route,{method='GET',body}={}){
 if(method!=='GET')assert.ok(!preserved.some(id=>route.includes(id)),'Preserved project mutation denied');
 const r=await fetch('https://api.vercel.com'+route+(route.includes('?')?'&':'?')+'teamId='+team,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
 if(!r.ok){save('hosting-error-'+Date.now()+'.json',{route,method,status:r.status,message:(await r.text()).replaceAll(token,'[redacted]').slice(0,1500)});throw Error('Vercel HTTP '+r.status+'; private receipt saved');}return r.json();
}
export function project(){const p=JSON.parse(fs.readFileSync(path.join(out,'vercel-project.json')));assert.equal(p.name,name);assert.ok(!preserved.includes(p.id));return p;}
const mode=process.argv[2];
if(mode==='create'){
 const list=await vercel('/v9/projects?limit=100');assert.ok(!list.pagination?.next,'Pagination must be reconciled');
 const exists=list.projects.filter(p=>p.name===name);
 if(exists.length){assert.equal(exists.length,1);assert.equal(project().id,exists[0].id);}
 else{
  assert.ok(!fs.existsSync(path.join(out,'vercel-project.json')));
  save('hosting-preserved-before.json',list.projects.map(p=>({id:p.id,name:p.name,target:p.targets?.production?.id})));
  const p=await vercel('/v11/projects',{method:'POST',body:{name,framework:'nextjs',rootDirectory:'apps/web',publicSource:false}});
  save('vercel-project.json',{id:p.id,name:p.name});
 }
 const p=project();await vercel(`/v9/projects/${p.id}`,{method:'PATCH',body:{ssoProtection:null,autoAssignCustomDomains:false,nodeVersion:'22.x',resourceConfig:{buildMachineType:'standard'}}});
 const actual=await vercel(`/v9/projects/${p.id}`);assert.ok(!actual.link);assert.equal(actual.ssoProtection,null);
 console.log(JSON.stringify({created:p.id,name,externalVendorAccess:true,gitIntegration:false}));
}else if(mode==='configure'){
 const p=project(),db=await verified();assert.equal(db.id,'hrtbjchobencariqclab');
 const keys=JSON.parse(fs.readFileSync(path.join(out,'keys.private.json')));
 const settings={SUPABASE_URL:`https://${db.id}.supabase.co`,SUPABASE_PUBLISHABLE_KEY:keys.find(k=>k.name==='anon').api_key,SUPABASE_SECRET_KEY:keys.find(k=>k.name==='service_role').api_key,
 NEXT_PUBLIC_VENDOR_PILOT:'true',NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING:'false',NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB:'false',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'false',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',
 NEXT_PUBLIC_SITE_URL:'https://'+alias,SITE_URL:'https://'+alias,NEXT_TELEMETRY_DISABLED:'1',GROOKAI_DISABLE_TELEMETRY:'1'};
 for(const flag of ['SCHEMA_RPC','PERSONAL','CUSTOM','SET','SHARED','VIEW_LINKS','PUBLIC','COMMUNITY','TEMPLATES','NOTIFICATIONS','PULSE_SHARING'])settings[`GROOKAI_BINDERS_${flag}_V1_ENABLED`]=['SCHEMA_RPC','PERSONAL','CUSTOM'].includes(flag)?'true':'false';
 const actual=await vercel(`/v9/projects/${p.id}`);assert.equal(actual.name,name);assert.ok(!actual.link);assert.equal(actual.ssoProtection,null);
 await vercel(`/v10/projects/${p.id}/env?upsert=true`,{method:'POST',body:Object.entries(settings).map(([key,value])=>({key,value,type:'encrypted',target:['preview','production']}))});
 save('hosting-configured.json',{project:p.id,database:db.id,keys:Object.keys(settings),payments:false,telemetry:false});console.log(JSON.stringify({configured:true,project:p.id}));
}else if(mode==='package'){
 const p=project(),db=await verified(),dest=path.join(out,'web-package-'+Date.now());
 const names=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','apps/web','scripts/ci/run_next_build_with_system_ca.mjs','scripts/ci/preserve_storefront_build_config.mjs','scripts/generate_public_set_card_counts.mjs'],{cwd:root,encoding:'utf8',windowsHide:true}).split('\0').filter(Boolean);
 const files=[];
 for(const relative of new Set(names)){
  if(/(^|\/)(\.env[^/]*|node_modules|\.next[^/]*|\.vercel|private|tests|test-results|playwright-report|visual-fixtures)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/.test(relative)||relative.startsWith('apps/web/scripts/'))continue;
  const bytes=fs.readFileSync(path.join(root,relative)),dst=path.join(dest,relative);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,bytes);files.push({path:relative,sha256:hash(bytes),bytes:bytes.length});
 }
 assert.ok(files.some(f=>f.path==='apps/web/src/app/api/vendor-preview/activate/route.ts'));
 fs.mkdirSync(path.join(dest,'.vercel'),{recursive:true});fs.writeFileSync(path.join(dest,'.vercel/project.json'),JSON.stringify({projectId:p.id,orgId:team}));
 const manifest={project:p.id,database:db.id,dest,files};save('hosting-package-'+Date.now()+'.json',manifest);fs.writeFileSync(path.join(out,'hosting-package-current.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({packaged:true,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)}));
}else if(mode==='deploy'){
 const p=project(),m=JSON.parse(fs.readFileSync(path.join(out,'hosting-package-current.json')));assert.equal(m.project,p.id);assert.equal(m.database,'hrtbjchobencariqclab');
 for(const f of m.files)assert.equal(hash(fs.readFileSync(path.join(m.dest,f.path))),f.sha256);
 const cli='C:/Users/ccabr/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/index.js';assert.ok(fs.existsSync(cli));
 const clean=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(SUPABASE|STRIPE|GROOKAI|PSA|UPSTASH|VERCEL|RESEND|SENTRY|BRIDGE|POSTHOG)/.test(k)));
 const output=execFileSync(process.execPath,['--use-system-ca',cli,'deploy',m.dest,'--yes','--no-wait','--scope','sosejis-projects'],{env:clean,cwd:m.dest,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});
 const urls=output.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/g)||[];assert.ok(urls.length);save('hosting-submitted-'+Date.now()+'.json',{project:p.id,url:urls.at(-1)});console.log(JSON.stringify({submitted:true,url:urls.at(-1)}));
}else if(mode==='status'){
 const p=project(),list=await vercel(`/v6/deployments?projectId=${p.id}&limit=3`);console.log(JSON.stringify(list.deployments.map(d=>({id:d.uid,url:d.url,state:d.state}))));
}else if(mode==='alias'){
 const p=project(),list=await vercel(`/v6/deployments?projectId=${p.id}&limit=1`),d=list.deployments[0];assert.equal(d.state,'READY');
 if(process.argv[3])assert.equal(d.uid,process.argv[3],'Latest deployment changed; validate it before aliasing');
 const detail=await vercel(`/v13/deployments/${d.uid}`);assert.equal(detail.projectId,p.id);
 const domains=await vercel(`/v9/projects/${p.id}/domains`);assert.ok(domains.domains.some(x=>x.name===alias&&x.projectId===p.id));
 const actual=await vercel(`/v2/deployments/${d.uid}/aliases`);if(!actual.aliases.some(a=>a.alias===alias))await vercel(`/v2/deployments/${d.uid}/aliases`,{method:'POST',body:{alias}});
 save('hosting-alias-'+Date.now()+'.json',{project:p.id,deployment:d.uid,alias});console.log(JSON.stringify({alias,deployment:d.uid}));
}else throw Error('Explicit create/configure/package/deploy/status/alias required');
