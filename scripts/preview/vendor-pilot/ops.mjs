// Explicit isolated vendor trial. No operation can target preserved projects.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';import {randomBytes} from 'node:crypto';
export const root=fileURLToPath(new URL('../../../',import.meta.url));
export const out=path.join(root,'.local/integration/vendor-pilot-20260922');
export const name='grookai-vendor-pilot-20260922',org='rksadomjkuoxvrbhsmxu';
export const forbidden=['ycdxbpibncqcchqiihfz','dkuiaiorwirujnrmbpvq','hcdpcbpnnvtbaezefjkd'];
fs.mkdirSync(out,{recursive:true});
let token;
export async function api(route,{method='GET',body}={}){
 token??=execFileSync('pwsh',['-NoProfile','-File',path.join(root,'scripts/preview/collector_management_credential.ps1')],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();assert.ok(token.startsWith('sbp_'));
 assert.ok(!forbidden.some(ref=>route.includes(ref)),'Preserved database access denied');
 const r=await fetch('https://api.supabase.com'+route,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
 if(!r.ok){
  const message=(await r.text()).replaceAll(token,'[redacted]').replaceAll(body?.db_pass??'__no_password__','[redacted]').slice(0,1500);
  fs.writeFileSync(path.join(out,'provider-error-'+Date.now()+'.json'),JSON.stringify({at:new Date().toISOString(),method,route,status:r.status,message},null,2),{flag:'wx'});
  throw Error(`Pilot management ${method} failed: HTTP ${r.status}; private error receipt saved`);
 }
 const text=await r.text();return text?JSON.parse(text):null;
}
export function target(){const p=JSON.parse(fs.readFileSync(path.join(out,'project.json'),'utf8'));assert.equal(p.name,name);assert.equal(p.organization_id,org);assert.match(p.id,/^[a-z]{20}$/);assert.ok(!forbidden.includes(p.id));return p;}
export async function verified(){const expected=target(),p=await api(`/v1/projects/${expected.id}`);assert.equal(p.name,name);assert.equal(p.organization_id,org);return p;}
export async function query(sql){const p=await verified();return api(`/v1/projects/${p.id}/database/query`,{method:'POST',body:{query:sql}});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const mode=process.argv[2];
 if(mode==='create'){
  const projects=await api('/v1/projects'),found=projects.filter(p=>p.name===name);
  if(found.length){assert.equal(found.length,1);assert.equal(target().id,found[0].id);console.log(JSON.stringify({reused:true,id:found[0].id,status:found[0].status}));}
  else{
   assert.ok(!fs.existsSync(path.join(out,'project.json')),'Existing receipt must be reconciled');
   const passwordFile=path.join(out,'database.dpapi');
   const password=fs.existsSync(passwordFile)?execFileSync('pwsh',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; $secure=ConvertTo-SecureString ([Console]::In.ReadToEnd()); [Console]::Write([System.Net.NetworkCredential]::new('', $secure).Password)"],{input:fs.readFileSync(passwordFile,'utf8'),encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}):randomBytes(36).toString('base64url');
   const encrypted=execFileSync('pwsh',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; [Console]::Write((ConvertFrom-SecureString (ConvertTo-SecureString ([Console]::In.ReadToEnd()) -AsPlainText -Force)))"],{input:password,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
   if(!fs.existsSync(passwordFile))fs.writeFileSync(passwordFile,encrypted,{flag:'wx'});
   if(!fs.existsSync(path.join(out,'creation-plan.json')))fs.writeFileSync(path.join(out,'creation-plan.json'),JSON.stringify({at:new Date().toISOString(),name,org,region:'us-east-2',size:'micro',scope:'Vendor signup/store management trial; no payments',authority:'Founder requested a shareable real vendor trial using their own email; existing environments preserved',productionWrites:0},null,2),{flag:'wx'});
   const p=await api('/v1/projects',{method:'POST',body:{name,organization_slug:org,region:'us-east-2',desired_instance_size:'micro',db_pass:password}});
   assert.ok(!forbidden.includes(p.id));fs.writeFileSync(path.join(out,'project.json'),JSON.stringify(p,null,2),{flag:'wx'});console.log(JSON.stringify({created:true,id:p.id,name:p.name,status:p.status}));
  }
 }else if(mode==='status'){const p=await verified();console.log(JSON.stringify({id:p.id,name:p.name,status:p.status}));}
 else throw Error('Explicit create/status action required');
}
