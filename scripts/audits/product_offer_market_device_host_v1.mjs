// Serve the real local resolver while the physical-device host owns the test lifecycle.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
const root='C:/gv_product_offer_market_20261008',base='C:/grookai_vault_operator_artifacts/product_offer_market_20261008';
assert.equal(process.cwd().replaceAll('\\','/'),root);assert.equal(process.argv.length,3);
const run=process.argv[2];assert.match(run,new RegExp('^'+base+'/market-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),f=read(run+'/fixture.private.json');assert.equal(f.state,'prepared');
assert.equal(read(base+'/CHECKPOINT.json').sourceFrozen,false);
const cfg=JSON.parse(execFileSync('supabase',['status','-o','json','--workdir','C:/grookai_vault_operator_artifacts/product_negotiated_trade_20261007/full-433-v4'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000}));
assert.equal(cfg.API_URL,'http://127.0.0.1:33561');assert.equal(read(run+'/defines.private.json').GROOKAI_WEB_BASE_URL,'http://127.0.0.1:33611');
assert.equal(fs.readdirSync(root+'/apps/web').some(name=>name.startsWith('.env')),false);
await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(33611,'127.0.0.1',()=>s.close(resolve));});
const env={};for(const[k,v]of Object.entries(process.env))if(/^(PATH|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMFILES|PROGRAMDATA)$/i.test(k))env[k]=v;
Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_SALES_NEGOTIATED_TRADE_LOCAL_TEST:'true',NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY:'false',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:'http://127.0.0.1:33611',NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:33611',NODE_USE_SYSTEM_CA:'1'});
const log=fs.openSync(run+'/resolver.private.log','wx');let server,stopped,result={status:'failed',serverStopped:false};
try{
 server=spawn(process.execPath,['--use-system-ca',root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','33611'],{cwd:root+'/apps/web',env,windowsHide:true,stdio:['ignore',log,log]});stopped=new Promise(resolve=>server.once('exit',resolve));
 let ready=false;for(let i=0;i<60;i++){
  assert.equal(server.exitCode,null);
  try{const r=await fetch('http://127.0.0.1:33611/api/resolver/search?'+new URLSearchParams({q:f.name,game:'pokemon',pagination:'1',offset:'0',limit:'64'}),{signal:AbortSignal.timeout(30000)});if(r.ok){const data=await r.json();fs.writeFileSync(run+'/resolver-readiness.json',JSON.stringify(data,null,2));if(data.rows?.some(row=>row.id===f.card)){ready=true;break;}}}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 assert.ok(ready,'Real local resolver did not return the prepared card');
 const hostLog=fs.openSync(run+'/host.private.log','wx');
 const host=spawn('pwsh',['-NoProfile','-File',base+'/run-samsung.ps1'],{cwd:root,env:{...process.env,MARKET_ACCEPTANCE_RUN:run},windowsHide:true,stdio:['ignore',hostLog,hostLog]});
 const exit=await new Promise((resolve,reject)=>{host.once('exit',resolve);host.once('error',reject);});fs.closeSync(hostLog);assert.equal(exit,0,'Samsung acceptance host failed');
 result.status='passed';
}catch(error){result.error=error.message.split('\n')[0];}
finally{
 if(server&&server.exitCode===null){execFileSync('taskkill',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'pipe'});await stopped;}
 result.serverStopped=!server||server.exitCode!==null||server.signalCode!==null;fs.closeSync(log);
 // A server-start failure happens before the device host's own finally block.
 if(read(run+'/fixture.private.json').state!=='restored')execFileSync(process.execPath,['scripts/audits/product_offer_market_fixture_v1.mjs','restore',run],{cwd:root,windowsHide:true,stdio:'pipe',timeout:60000});
 fs.writeFileSync(run+'/host-result.json',JSON.stringify(result,null,2));
}
console.log(JSON.stringify({run,...result}));if(result.status!=='passed')process.exitCode=1;
