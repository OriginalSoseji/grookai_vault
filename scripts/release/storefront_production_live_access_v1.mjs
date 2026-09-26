// Temporary owner-authorized automation access; never disable project protection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root='C:/gv_store_production_20260926',dir=path.join(root,'.local/integration/production-live-v1');
const project='prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum',team='team_EFKFYSau9Gf8wEaix8zXgQZG';
const token=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'))).token;
const mode=process.argv[2];assert.equal(process.argv.length,3);assert.ok(['create','check','revoke'].includes(mode));
fs.mkdirSync(dir,{recursive:true});const secretFile=path.join(dir,'automation.private.json');
async function api(route,body){const r=await fetch('https://api.vercel.com'+route+'?teamId='+team,{method:body?'PATCH':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});assert.ok(r.ok,`Hosting HTTP ${r.status}`);return r.json();}
const before=await api('/v9/projects/'+project);assert.equal(before.id,project);
if(mode==='create'){
  assert.ok(!fs.existsSync(secretFile));assert.equal(Object.keys(before.protectionBypass??{}).length,0);
  const result=await api('/v1/projects/'+project+'/protection-bypass',{generate:{note:'Temporary storefront release verification 2026-09-26'}});
  const [secret]=Object.keys(result.protectionBypass);assert.ok(secret);
  fs.writeFileSync(secretFile,JSON.stringify({at:new Date().toISOString(),secret,sso:before.ssoProtection}),{flag:'wx'});
  const after=await api('/v9/projects/'+project);assert.ok(after.protectionBypass[secret]);assert.deepEqual(after.ssoProtection,before.ssoProtection);
  console.log(JSON.stringify({status:'automation_access_created',globalProtectionUnchanged:true}));
}else if(mode==='check'){
  const {secret}=JSON.parse(fs.readFileSync(secretFile));const base=JSON.parse(fs.readFileSync(path.join(root,'.local/integration/production-web-v4/ready.json'))).url;
  const results=[];for(const route of ['/store-trial','/account/store','/api/stores/owner','/store/no-store-release-check']){
    const r=await fetch(base+route,{headers:{'x-vercel-protection-bypass':secret},redirect:'manual',signal:AbortSignal.timeout(45000)});const body=await r.text();
    results.push({route,status:r.status,location:r.headers.get('location'),noStore:r.headers.get('cache-control'),bytes:body.length});
    assert.ok(!r.headers.get('location')?.includes('vercel.com/sso'));
    if(route==='/api/stores/owner')assert.equal(r.status,401);
  }
  fs.writeFileSync(path.join(dir,'unauthenticated.json'),JSON.stringify({at:new Date().toISOString(),results}),{flag:'wx'});console.log(JSON.stringify(results));
}else{
  const {secret,sso}=JSON.parse(fs.readFileSync(secretFile));assert.deepEqual(before.ssoProtection,sso);
  if(before.protectionBypass?.[secret])await api('/v1/projects/'+project+'/protection-bypass',{revoke:{secret,regenerate:false}});
  const after=await api('/v9/projects/'+project);assert.ok(!after.protectionBypass?.[secret]);assert.deepEqual(after.ssoProtection,sso);
  fs.writeFileSync(path.join(dir,'automation-revoked.json'),JSON.stringify({at:new Date().toISOString(),globalProtectionUnchanged:true}),{flag:'wx'});console.log('Temporary automation access revoked');
}
