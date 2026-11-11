// Bounded private oneshot. No public scheduler endpoint or installed timer.
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {createBackendClient} from '../supabase_backend_client.mjs';
import {createSquareBackendService} from './backend_service_v1.mjs';
import {squareEnvironmentConfig} from './service_v1.mjs';
import {runSquareCatalogTick} from './worker_v1.mjs';
try {
  const args=process.argv.slice(2),mode=args[0];
  if(!['--once','--health'].includes(mode)||args.length<2||args.length>3||!args[1].startsWith('--env-file=')||
    (args[2]&&!/^--max-items=([1-9]|1[0-9]|2[0-5])$/.test(args[2]))||(mode==='--health'&&args.length!==2))throw Error();
  const file=path.resolve(args[1].slice('--env-file='.length)),cfg=dotenv.parse(fs.readFileSync(file));
  // Read an explicitly named server env, never inherit a stray service credential.
  for(const key of Object.keys(process.env))if(/SUPABASE|SQUARE|^NODE_ENV$/.test(key))delete process.env[key];
  Object.assign(process.env,cfg);
  const local=cfg.SUPABASE_URL==='http://127.0.0.1:61841';
  const remote=cfg.SUPABASE_URL==='https://ycdxbpibncqcchqiihfz.supabase.co'&&cfg.NODE_ENV==='production';
  if(!local&&!remote)throw Error();
  console.log((local?'LOCAL':'REMOTE')+' Square '+mode+': '+cfg.SUPABASE_URL);
  const client=createBackendClient();
  if(mode==='--health'){
    const result=await client.rpc('square_health_v1');if(result.error)throw Error();
    console.log(JSON.stringify(result.data));
  }else{
    const config=squareEnvironmentConfig(cfg);
    const service=createSquareBackendService({client,config});
    const result=await runSquareCatalogTick({client,service,environment:config.environment,
      enabled:config.catalogEnabled,maxItems:args[2]?Number(args[2].split('=')[1]):10});
    console.log(JSON.stringify(result));if(result.status==='failed')process.exitCode=1;
  }
}catch{console.error('square_worker_invocation_or_state_failed');process.exitCode=1;}
