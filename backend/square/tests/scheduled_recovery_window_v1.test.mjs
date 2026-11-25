import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {randomUUID} from 'node:crypto';
import {squareEnvironmentConfig} from '../service_v1.mjs';

const flag='GROOKAI_SQUARE_RECOVERY_WINDOW_ENABLED';
const fixture={GITHUB_ACTIONS:'true',NODE_ENV:'production',SUPABASE_URL:'https://ycdxbpibncqcchqiihfz.supabase.co',
 SUPABASE_SECRET_KEY:'fixture-only-not-a-credential',SQUARE_ENVIRONMENT:'production',SQUARE_APP_ID:'fixture-app',
 SQUARE_CALLBACK_URL:'https://grookaivault.com/api/square/oauth/callback',SQUARE_APP_SECRET:'fixture-app-secret',
 SQUARE_TOKEN_ENCRYPTION_KEY:'fixture-encryption-key',GROOKAI_SQUARE_LINKING_ENABLED:'true',
 GROOKAI_SQUARE_CATALOG_ENABLED:'true',GROOKAI_SQUARE_COMMERCE_ENABLED:'true',GROOKAI_SQUARE_ARTWORK_ENABLED:'false'};

async function invoke(value,durable,price){
 const durableFlag='GROOKAI_SQUARE_DURABLE_RECOVERY_ENABLED';
 const priceFlag='GROOKAI_SQUARE_PRICE_BATCH_ENABLED';
 const keys=[...Object.keys(fixture),flag,durableFlag,priceFlag],before=new Map(keys.map(key=>[key,process.env[key]]));
 const priorExit=process.exitCode,calls=[],errors=[];let file;
 const spawned=mock.method(childProcess,'spawnSync',(binary,args,options)=>{
  assert.equal(binary,process.execPath);assert.ok(args[0].endsWith('run_commerce_worker_v2.mjs'));
  assert.equal(args[1],'--once');assert.ok(args[2].startsWith('--env-file='));
  assert.equal(options.windowsHide,true);file=args[2].slice('--env-file='.length);
  const contents=fs.readFileSync(file,'utf8');
  const values=Object.fromEntries(contents.trim().split('\n').map(line=>{
   const split=line.indexOf('=');return[line.slice(0,split),JSON.parse(line.slice(split+1))];
  }));
  calls.push({values,workerConfig:squareEnvironmentConfig(values)});return{status:0};
 });
 const logged=mock.method(console,'error',message=>errors.push(message));
 try{
  Object.assign(process.env,fixture);if(value===undefined)delete process.env[flag];else process.env[flag]=value;
  if(durable===undefined)delete process.env[durableFlag];else process.env[durableFlag]=durable;
  if(price===undefined)delete process.env[priceFlag];else process.env[priceFlag]=price;
  process.exitCode=undefined;syncBuiltinESMExports();
  // Execute the real adapter. Intercept only process creation: no worker,
  // Supabase client or provider request can start with these fixture values.
  await import(new URL('../run_scheduled_commerce_v2.mjs?case='+randomUUID(),import.meta.url));
  return{calls,errors,exitCode:process.exitCode??0,temporaryFileRemoved:file?!fs.existsSync(file):true};
 }finally{
  spawned.mock.restore();logged.mock.restore();syncBuiltinESMExports();process.exitCode=priorExit;
  for(const[key,old]of before)if(old===undefined)delete process.env[key];else process.env[key]=old;
 }
}

test('the actual scheduled adapter carries an explicit flag to the worker and defaults a missing flag off',async()=>{
 for(const value of [undefined,'false','true']){
  const result=await invoke(value);assert.equal(result.exitCode,0);assert.equal(result.calls.length,1);
  assert.equal(result.calls[0].values[flag],value??'false');
  assert.equal(result.calls[0].workerConfig.recoveryWindowEnabled,value==='true');
  assert.equal(result.temporaryFileRemoved,true);assert.deepEqual(result.errors,[]);
 }
});
test('actual GitHub adapter carries default-off batch admission and rejects unsafe/malformed settings before launch',async()=>{
 for(const value of [undefined,'false','true']){const result=await invoke('true','true',value);assert.equal(result.exitCode,0);assert.equal(result.calls[0].values.GROOKAI_SQUARE_PRICE_BATCH_ENABLED,value??'false');assert.equal(result.calls[0].workerConfig.priceBatchEnabled,value==='true');assert.equal(result.temporaryFileRemoved,true);}
 for(const value of ['TRUE','','true\nEXTRA=1']){const result=await invoke('true','true',value);assert.equal(result.exitCode,1);assert.equal(result.calls.length,0);}
 const unsafe=await invoke('true','false','true');assert.equal(unsafe.exitCode,1);assert.equal(unsafe.calls.length,0);
});

test('malformed recovery flags never launch a scheduled worker or inject private environment lines',async()=>{
 for(const value of ['TRUE','1','',' true','true\nSQUARE_ENVIRONMENT=sandbox','false\r\nEXTRA=1']){
  const result=await invoke(value);assert.equal(result.exitCode,1);assert.equal(result.calls.length,0);
  assert.deepEqual(result.errors,['square_scheduler_configuration_unavailable']);assert.equal(result.temporaryFileRemoved,true);
 }
});

test('the actual adapter carries durable recovery with a false fallback and requires the bounded selection window',async()=>{
 for(const durable of [undefined,'false','true']){
  const result=await invoke('true',durable);assert.equal(result.exitCode,0);assert.equal(result.calls.length,1);
  assert.equal(result.calls[0].values.GROOKAI_SQUARE_DURABLE_RECOVERY_ENABLED,durable??'false');
  assert.equal(result.temporaryFileRemoved,true);
 }
 for(const [window,durable] of [[undefined,'true'],['false','true'],['true','TRUE'],['true','true\nEXTRA=1']]){
  const result=await invoke(window,durable);assert.equal(result.exitCode,1);assert.equal(result.calls.length,0);
  assert.equal(result.temporaryFileRemoved,true);assert.deepEqual(result.errors,['square_scheduler_configuration_unavailable']);
 }
});
