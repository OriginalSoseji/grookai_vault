// Persist tested non-secret production flags and switch only the apex domain.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root='C:/gv_store_production_20260926',dir=root+'/.local/integration/production-live-v1';
const project='prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum',team='team_EFKFYSau9Gf8wEaix8zXgQZG',alias='grookaivault.com';
const mode=process.argv[2];assert.equal(process.argv.length,3);assert.ok(['environment','promote','verify'].includes(mode));
const read=n=>JSON.parse(fs.readFileSync(dir+'/'+n)),save=(n,d)=>fs.writeFileSync(dir+'/'+n,JSON.stringify(d,null,2),{flag:'wx'});
const ready=JSON.parse(fs.readFileSync(root+'/.local/integration/production-web-v4/ready.json'));
const plan=JSON.parse(fs.readFileSync(root+'/.local/integration/production-web-v4/package.json'));
assert.equal(read('hosted-proof.private.json').status,'passed');assert.equal(read('hosted-proof.private.json').deployment,ready.id);
const token=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'))).token;
async function api(route,body){const r=await fetch('https://api.vercel.com'+route+(route.includes('?')?'&':'?')+'teamId='+team,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});assert.ok(r.ok,`Hosting HTTP ${r.status}`);return r.json();}
const current=await api('/v4/aliases/'+alias),www=await api('/v4/aliases/www.'+alias),p=await api('/v9/projects/'+project);
assert.equal(p.id,project);assert.equal(p.nodeVersion,'24.x');
const deployment=await api('/v13/deployments/'+ready.id);assert.equal(deployment.readyState,'READY');assert.equal(deployment.projectId,project);
if(mode==='environment'){
  assert.equal(current.deploymentId,plan.previous);assert.ok(!fs.existsSync(dir+'/environment-intent.json'));
  const existing=(await api('/v10/projects/'+project+'/env')).envs;
  assert.ok(!existing.some(e=>e.target?.includes('production')&&e.key.startsWith('STRIPE_')));
  const before=[];for(const[key,value]of Object.entries(plan.settings)){assert.ok(!/SECRET|TOKEN|KEY|PASSWORD/.test(key));const found=existing.filter(e=>e.key===key&&e.target?.includes('production')&&!e.gitBranch);assert.ok(found.length<=1);before.push({key,previous:found[0]?await api('/v1/projects/'+project+'/env/'+found[0].id+'?decrypt=true'):null,value});}
  save('environment-before.private.json',before);save('environment-intent.json',{at:new Date().toISOString(),project,keys:before.map(e=>e.key),target:'production'});
  for(const {key,value}of before){const r=await api('/v10/projects/'+project+'/env?upsert=true',{key,value,type:'plain',target:['production'],comment:'Verified browse-only storefront release; payments stay disabled'});assert.ok(!r.failed?.length);}
  const after=(await api('/v10/projects/'+project+'/env')).envs;for(const{key,value}of before){const row=after.find(e=>e.key===key&&e.target?.includes('production')&&!e.gitBranch);assert.ok(row);const detail=await api('/v1/projects/'+project+'/env/'+row.id+'?decrypt=true');assert.equal(detail.value,value);}
  save('environment-persisted.json',{at:new Date().toISOString(),project,keys:before.map(e=>e.key),wwwDeployment:www.deploymentId,globalProtection:p.ssoProtection,paymentsEnabled:false});console.log('Production storefront flags persisted and read back.');
}else if(mode==='promote'){
  assert.equal(current.deploymentId,plan.previous);const env=read('environment-persisted.json');assert.equal(www.deploymentId,env.wwwDeployment);assert.deepEqual(p.ssoProtection,env.globalProtection);
  assert.ok(!fs.existsSync(dir+'/promotion-intent.json'));save('promotion-intent.json',{at:new Date().toISOString(),alias,from:current.deploymentId,to:ready.id,wwwDeployment:www.deploymentId});
  await api('/v2/deployments/'+ready.id+'/aliases',{alias});assert.equal((await api('/v4/aliases/'+alias)).deploymentId,ready.id);assert.equal((await api('/v4/aliases/www.'+alias)).deploymentId,www.deploymentId);
  save('promoted.json',{at:new Date().toISOString(),alias,deployment:ready.id,wwwUnchanged:true});console.log(JSON.stringify({status:'promoted',url:'https://'+alias+'/account/store',deployment:ready.id}));
}else{
  assert.equal(current.deploymentId,ready.id);const results=[];
  for(const[route,status]of [['/store-trial',200],['/account/store',307],['/api/stores/owner',401],['/store/no-store-release-check',404]]){const r=await fetch('https://'+alias+route,{redirect:'manual',signal:AbortSignal.timeout(30000)});const text=await r.text();assert.equal(r.status,status,route);assert.ok(!r.headers.get('location')?.includes('vercel.com/sso'));results.push({route,status:r.status,location:r.headers.get('location'),bytes:text.length});}
  save('public-verified.json',{at:new Date().toISOString(),alias,deployment:ready.id,results});console.log(JSON.stringify({status:'passed',url:'https://'+alias+'/account/store',checks:results.length}));
}
