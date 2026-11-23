// Run the real CLI and scheduler; replace only the shared SDK boundary with an
// empty fixture authority. No live credential or provider can be initialized.
import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const entry=fileURLToPath(new URL('../run_commerce_worker_v2.mjs',import.meta.url));
const sdk=new URL('../../supabase_backend_client.mjs',import.meta.url).href;
function invoke(mode,patch={}){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'grookai-durable-cli-'));
 const cfg={NODE_ENV:'production',SUPABASE_URL:'https://ycdxbpibncqcchqiihfz.supabase.co',SUPABASE_SECRET_KEY:'fixture-not-a-key',
  SQUARE_ENVIRONMENT:'production',GROOKAI_SQUARE_DURABLE_RECOVERY_ENABLED:'true',GROOKAI_SQUARE_RECOVERY_WINDOW_ENABLED:'true',...patch};
 const fixture=`export function createBackendClient(){console.log('fixture_client_initialized');return {rpc:async(name,args)=>{
 console.log('fixture_rpc:'+name+':'+(args.p_action??''));
 if(name==='square_commerce_health_v2'||name==='square_commerce_run_health_v3')return {data:{fixtureHealth:true}};
 if(name!=='square_durable_recovery_v1')throw Error('Unexpected legacy or business RPC');
 if(args.p_action==='run_start')return {data:{started:true}};
 if(args.p_action==='claim')return {data:{empty:true}};
 if(args.p_action==='health')return {data:{version:'SQUARE_DURABLE_RECOVERY_V1',fixtureHealth:true}};
 if(args.p_action==='run_finish')return {data:{runId:args.p_data.runId,status:'succeeded',succeeded:0,failed:0,skipped:0,targetsChecked:0,errorCode:''}};
 throw Error('Unexpected scheduler action');}};}`;
 const files=['loader.mjs','register.mjs','worker.private.env'];
 try{
  fs.writeFileSync(path.join(directory,files[0]),`export async function load(url,context,next){
   if(url===${JSON.stringify(sdk)})return {format:'module',shortCircuit:true,source:${JSON.stringify(fixture)}};
   return next(url,context);}`);
  fs.writeFileSync(path.join(directory,files[1]),`import {register} from 'node:module';
   globalThis.fetch=()=>{throw Error('Network forbidden in CLI fixture');};register(${JSON.stringify(pathToFileURL(path.join(directory,files[0])).href)},import.meta.url);`);
  fs.writeFileSync(path.join(directory,files[2]),Object.entries(cfg).map(([key,value])=>key+'='+JSON.stringify(value)).join('\n')+'\n',{mode:0o600});
  const env={...process.env};for(const key of Object.keys(env))if(/SUPABASE|SQUARE|^GV_USER_ACCESS_TOKEN$|^NODE_ENV$/.test(key))delete env[key];
  return spawnSync(process.execPath,['--import',pathToFileURL(path.join(directory,files[1])).href,entry,mode,'--env-file='+path.join(directory,files[2])],
   {encoding:'utf8',windowsHide:true,timeout:15000,env});
 }finally{
  for(const name of files){const target=path.join(directory,name);if(fs.existsSync(target))fs.unlinkSync(target);}fs.rmdirSync(directory);
 }
}
test('the real enabled once CLI reaches the durable authority, never the legacy merchant selector',()=>{
 const result=invoke('--once');assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
 assert.ok(result.stdout.includes('fixture_rpc:square_durable_recovery_v1:run_start'));
 assert.ok(result.stdout.includes('fixture_rpc:square_durable_recovery_v1:claim'));
 assert.ok(result.stdout.includes('fixture_rpc:square_durable_recovery_v1:run_finish'));
 assert.ok(!result.stdout.includes('square_worker_run_v1'));assert.ok(result.stdout.includes('"status":"succeeded"'));
});
test('the real enabled health CLI adds read-only durable health',()=>{
 const result=invoke('--health');assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
 assert.ok(result.stdout.includes('fixture_rpc:square_durable_recovery_v1:health'));
 assert.ok(!result.stdout.includes(':claim'));assert.ok(!result.stdout.includes(':run_start'));
});
test('the real CLI rejects durable admission without the target window before SDK construction',()=>{
 const result=invoke('--once',{GROOKAI_SQUARE_RECOVERY_WINDOW_ENABLED:'false'});
 assert.ifError(result.error);assert.equal(result.status,1);assert.ok(!result.stdout.includes('fixture_client_initialized'));
 assert.ok(result.stderr.includes('square_scheduler_configuration_unavailable'));
});
