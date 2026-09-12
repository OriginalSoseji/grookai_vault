import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';

export const root='C:/grookai_vault_collector_authenticated';
export const out='C:/grookai_vault_operator_artifacts/collector_polish/hosted_staging_1789182212844';
export const org='rksadomjkuoxvrbhsmxu';
export const name='grookai-collector-staging-20260911';
export const forbidden=['ycdxbpibncqcchqiihfz','dkuiaiorwirujnrmbpvq'];
export const exec=(file,args,options={})=>execFileSync(file,args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,windowsHide:true,stdio:['pipe','pipe','pipe'],...options});
let token;
export async function api(route,{method='GET',body}={}){
 token??=exec('pwsh',['-NoProfile','-File','scripts/preview/collector_management_credential.ps1']).trim();
 assert.ok(token.startsWith('sbp_'),'Unexpected management credential encoding');
 if(method!=='GET'&&forbidden.some(ref=>route.includes(ref)))throw Error('Production/recovery mutation denied');
 const response=await fetch(`https://api.supabase.com${route}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
 if(!response.ok){const text=await response.text();throw Error(`${method} ${route}: ${response.status} ${text.slice(0,400).replaceAll(token,'[redacted]')}`);}
 const text=await response.text();return text?JSON.parse(text):null;
}
export function privateFile(file,value){
 const dir=`${out}/private`;mkdirSync(dir,{recursive:true});
 const user=exec('whoami',[]).trim();
 exec('icacls',[dir,'/inheritance:r','/grant:r',`${user}:(OI)(CI)F`,'SYSTEM:(OI)(CI)F']);
 writeFileSync(`${dir}/${file}`,JSON.stringify(value,null,2));
}
export function target(){const p=JSON.parse(readFileSync(`${out}/staging-project.json`));assert.equal(p.name,name);assert.equal(p.organization_id,org);assert.match(p.id,/^[a-z]{20}$/);assert.ok(!forbidden.includes(p.id));return p;}
export async function verifyTarget(){const p=target();const fresh=await api(`/v1/projects/${p.id}`);assert.equal(fresh.name,name);assert.equal(fresh.organization_id,org);return fresh;}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/collector_hosted_ops.mjs')){
 const mode=process.argv[2];
 if(mode==='create'){
  assert.ok(existsSync(`${out}/preservation.json`));
  const projects=await api('/v1/projects');
  const matches=projects.filter(p=>p.name===name);
  if(matches.length){assert.equal(matches.length,1);assert.ok(existsSync(`${out}/staging-project.json`),'Existing project without receipt; reconcile before reuse');assert.equal(target().id,matches[0].id);console.log(JSON.stringify({reused:true,project:matches[0].id}));}
  else{
   assert.ok(!existsSync(`${out}/staging-project.json`),'Missing remote project with existing receipt');
   const password=randomBytes(36).toString('base64url');privateFile('database.json',{password});
   writeFileSync(`${out}/creation-plan.json`,JSON.stringify({name,organization:org,size:'micro',region:'us-east-2',authority:'Founder authorized distinct hosted writable staging; preserve live and candidate',productionWrites:false,restoreDrillWrites:false,publicUsersCopied:false},null,2));
   const p=await api('/v1/projects',{method:'POST',body:{name,organization_slug:org,db_pass:password,region:'us-east-2',desired_instance_size:'micro'}});
   assert.ok(!forbidden.includes(p.id));writeFileSync(`${out}/staging-project.json`,JSON.stringify(p,null,2));console.log(JSON.stringify({created:true,id:p.id,name:p.name,status:p.status}));
  }
 }else if(mode==='status'){const p=await verifyTarget();console.log(JSON.stringify({id:p.id,name:p.name,status:p.status}));}
 else throw Error('Explicit create or status mode required');
}
