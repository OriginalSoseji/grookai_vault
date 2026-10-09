// Isolated gateway and physical proof. No provider traffic, deployment or old fixture edits.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='C:/gv_product_portability_20261008',base='C:/grookai_vault_operator_artifacts/product_portability_20261008';
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
const read=p=>JSON.parse(fs.readFileSync(p));
const current=read(base+'/samsung-build-current.json');assert.equal(current.status,'built');
const {run,output}=current;
assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
assert.match(output,new RegExp('^'+run+'/device-[0-9]+$'));
const f=read(run+'/fixture.private.json');assert.equal(f.state,'prepared');
const command=(n,a)=>execFileSync(n,a,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:64*1024*1024});
command(process.execPath,['scripts/audits/product_portability_fixture_v1.mjs','verify',run]);
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir','C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008/full-438-v2']));assert.equal(cfg.API_URL,'http://127.0.0.1:35521');
const sources=['tests/integration/helpers/product_portability_gateway_v1.ts','supabase/functions/vault-import-collection-v2/handler.ts','supabase/functions/_shared/auth.ts'];
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const hashes=Object.fromEntries(sources.map(p=>[p,sha(p)]));
fs.writeFileSync(output+'/gateway-source.json',JSON.stringify({hashes,port:35841,upstream:cfg.API_URL,dependencyFetches:0},null,2),{flag:'wx'});
const env={};for(const k of ['PATH','Path','SystemRoot','SYSTEMROOT','USERPROFILE','APPDATA','LOCALAPPDATA','TEMP','TMP'])if(process.env[k])env[k]=process.env[k];
Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,GV_PORTABILITY_FIXTURE_OWNER:f.users[1].id,DENO_NO_UPDATE_CHECK:'1',DENO_NO_PACKAGE_JSON:'1'});
const fd=fs.openSync(output+'/gateway.private.log','wx');let edge,exit;
try {
 edge=spawn('C:/Users/ccabr/scoop/apps/deno/current/deno.exe',['run','--cached-only','--no-check','--no-config','--no-lock','--no-prompt','--allow-env','--allow-net=127.0.0.1:35521,127.0.0.1:35841','tests/integration/helpers/product_portability_gateway_v1.ts'],{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]});
 exit=new Promise(resolve=>edge.once('exit',resolve));
 let ready=false;for(let i=0;i<60&&!ready;i++) {assert.equal(edge.exitCode,null,'Gateway exited');try{const r=await fetch('http://127.0.0.1:35841/__portability_health',{signal:AbortSignal.timeout(1000)});ready=(await r.json()).project===f.project;}catch{}if(!ready)await new Promise(resolve=>setTimeout(resolve,250));}assert.ok(ready,'Gateway unavailable');
 const runFd=fs.openSync(output+'/runner.private.log','wx');
 try {
  const process=spawn('pwsh',['-NoProfile','-File',base+'/run-samsung-v4.ps1','-Output',output],{cwd:root,windowsHide:true,stdio:['ignore',runFd,runFd]});
  const code=await new Promise(resolve=>process.once('exit',resolve));assert.equal(code,0,'Samsung proof failed; inspect private log');
 } finally {fs.closeSync(runFd);}
 for(const[p,h]of Object.entries(hashes))assert.equal(sha(p),h,p);
 console.log(JSON.stringify({status:'passed',output,productionWrites:0,providerCalls:0}));
}finally{if(edge&&edge.exitCode===null)edge.kill();if(exit)await exit;fs.closeSync(fd);}
