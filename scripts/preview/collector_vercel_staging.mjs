import {exec,out,root,target} from './collector_hosted_ops.mjs';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const token=JSON.parse(readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'),'utf8')).token;
export const team='team_EFKFYSau9Gf8wEaix8zXgQZG';
export async function vercel(route,{method='GET',body}={}){
 if(method!=='GET'&&['prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum','prj_uFWwtWB8nhubCGyl6EqkFKVc35eN'].some(id=>route.includes(id)))throw Error('Preserved Vercel project mutation denied');
 const r=await fetch(`https://api.vercel.com${route}${route.includes('?')?'&':'?'}teamId=${team}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
 if(!r.ok)throw Error(`Vercel ${method} ${route}: ${r.status} ${(await r.text()).slice(0,300)}`);return r.json();
}
export function project(){const p=JSON.parse(readFileSync(`${out}/vercel-project.json`));assert.equal(p.name,'grookai-collector-staging');assert.ok(!['prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum','prj_uFWwtWB8nhubCGyl6EqkFKVc35eN'].includes(p.id));return p;}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/collector_vercel_staging.mjs')){
 const mode=process.argv[2];
 if(mode==='create'){
  const list=await vercel('/v9/projects?limit=100');
  const matches=list.projects.filter(p=>p.name==='grookai-collector-staging');
  if(matches.length){assert.equal(matches.length,1);assert.ok(existsSync(`${out}/vercel-project.json`),'Existing project needs receipt reconciliation');assert.equal(project().id,matches[0].id);}
  else {const p=await vercel('/v11/projects',{method:'POST',body:{name:'grookai-collector-staging',framework:'nextjs',rootDirectory:'apps/web',publicSource:false}});writeFileSync(`${out}/vercel-project.json`,JSON.stringify({id:p.id,name:p.name},null,2));}
  const p=project();await vercel(`/v9/projects/${p.id}`,{method:'PATCH',body:{ssoProtection:{deploymentType:'all'},autoAssignCustomDomains:false,nodeVersion:'22.x',resourceConfig:{buildMachineType:'standard'}}});
  const fresh=await vercel(`/v9/projects/${p.id}`);assert.equal(fresh.ssoProtection.deploymentType,'all');assert.ok(!fresh.link);console.log(JSON.stringify({id:p.id,name:p.name,protected:true,gitIntegration:false}));
 }else if(mode==='verify-live'){
  const saved=JSON.parse(readFileSync(`${out}/preservation.json`));const live=await vercel(`/v9/projects/${saved.live.projectId}`);assert.equal(live.targets.production.id,saved.live.deploymentId);
  const domains=await vercel(`/v9/projects/${saved.live.projectId}/domains`);assert.deepEqual(domains.domains.map(d=>d.name).sort(),saved.live.domains.slice().sort());
  writeFileSync(`${out}/live-readback.json`,JSON.stringify({checkedAt:new Date().toISOString(),deploymentId:live.targets.production.id,domains:saved.live.domains,unchanged:true},null,2));console.log(JSON.stringify({unchanged:true,deploymentId:live.targets.production.id}));
 }else throw Error('Explicit create/verify-live mode required');
}
