// Synchronize only the declared empty proof lab's gateway after Storage recreation.
// No schema commands, API responses, permissions or production services change.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
const project='reviewed-intake-date-fresh-479-20261028';
const work='C:/gv_intake_recovery_private_20261027/reviewed-intake-release-v1/local-date-fresh-479';
assert.equal(process.argv[2],project);
assert.ok(fs.existsSync(work+'/reset-intent.json'));
assert.equal(fs.existsSync(work+'/supabase/.temp/project-ref'),false);
const inspect=name=>JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}))[0];
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
for(const service of ['storage','kong','db'])assert.deepEqual(Object.keys(inspect('supabase_'+service+'_'+project).NetworkSettings.Networks),[project]);
const output=work+'/gateway-reset-result.json';assert.equal(fs.existsSync(output),false);
const events=spawn('docker',['events','--format','{{json .}}','--filter','type=container','--filter','event=start'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let buffer='',done=false;
const finish=(result,code)=>{if(done)return;done=true;clearTimeout(timer);fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});events.kill();process.exitCode=code;};
const timer=setTimeout(()=>finish({pass:false,error:'storage_restart_not_observed',productionChanges:0},1),180000);
events.stdout.on('data',chunk=>{
  buffer+=chunk;
  while(buffer.includes('\n')){
    const at=buffer.indexOf('\n'),line=buffer.slice(0,at);buffer=buffer.slice(at+1);
    if(done||!line.trim())continue;
    try{
      const event=JSON.parse(line);if(event.Actor?.Attributes?.name!=='supabase_storage_'+project)continue;
      const state=execFileSync('docker',['exec','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-c',"select (select count(*) from auth.users)::text||':'||(select count(*) from public.vault_item_instances)::text"],{encoding:'utf8',timeout:5000}).trim();assert.equal(state,'0:0');
      const gateway=inspect('supabase_kong_'+project);assert.deepEqual(Object.keys(gateway.NetworkSettings.Networks),[project]);
      execFileSync('docker',['restart','--time','1','supabase_kong_'+project],{encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']});
      finish({pass:true,at:new Date().toISOString(),storageRestartObserved:true,gatewayRestarted:true,emptyOwnedLabVerified:true,productionChanges:0},0);
    }catch{finish({pass:false,error:'owned_gateway_recovery_failed',productionChanges:0},1);}
  }
});
events.on('error',()=>finish({pass:false,error:'docker_events_unavailable',productionChanges:0},1));
fs.writeFileSync(work+'/gateway-monitor-ready.json',JSON.stringify({at:new Date().toISOString(),project,pass:true}),{flag:'wx'});
