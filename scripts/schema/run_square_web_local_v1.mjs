// Bind every local Next invocation to the owned lab; inherited production
// variables must never win over the task's synthetic environment file.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const root='C:/grookai_square_sync_20261110',require=createRequire(root+'/backend/package.json');
const command=process.argv[2];assert.ok(['typecheck','lint','dev','dev-fixture','build'].includes(command));
const cfg=require('dotenv').parse(fs.readFileSync(root+'/apps/web/.env.local'));
assert.equal(cfg.SUPABASE_URL,'http://127.0.0.1:61841');assert.equal(cfg.NEXT_PUBLIC_SITE_URL,'http://127.0.0.1:61850');
assert.equal(cfg.SQUARE_ENVIRONMENT,'sandbox');assert.equal(cfg.NEXT_PUBLIC_SQUARE_LOCAL_TEST,'true');
const env={...process.env};
for(const key of Object.keys(env))if(/SUPABASE|SQUARE|STRIPE|^EBAY_|^VERCEL|GROOKAI_COLLECTOR_RELEASE|COLLECTOR_(STAGING|PREVIEW|FIXTURE|HOSTED)|_LOCAL_TEST|^NODE_ENV$|^GV_USER_ACCESS_TOKEN$/.test(key))delete env[key];
Object.assign(env,cfg,{NODE_USE_SYSTEM_CA:'1'});
if(command==='dev-fixture'){
 env.SQUARE_PROVIDER_FIXTURE_V2='true';env.NODE_OPTIONS=(env.NODE_OPTIONS??'')+' --import=file:///C:/grookai_square_sync_20261110/scripts/schema/square_provider_preload_v2.mjs';
}
const executable=command==='lint'?root+'/apps/web/node_modules/eslint/bin/eslint.js':root+'/apps/web/node_modules/next/dist/bin/next';
const args=command==='typecheck'?['typegen']:command==='lint'?['.','--max-warnings=0']:command.startsWith('dev')?['dev','--hostname','127.0.0.1','--port','61850','--webpack']:['build','--webpack'];
console.log('LOCAL Next '+command+': http://127.0.0.1:61850 → http://127.0.0.1:61841; production variables excluded');
const run=args=>new Promise(resolve=>{
 const log=command.startsWith('dev')?'C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1/web-'+command+'-'+Date.now()+'.log':null;
 const fd=log?fs.openSync(log,'wx'):null;if(log)console.log('Retaining local server output at '+log);
 const child=spawn(process.execPath,args,{cwd:root+'/apps/web',env,stdio:fd===null?'inherit':['ignore',fd,fd],windowsHide:true});
 child.on('error',()=>resolve(1));child.on('close',code=>{if(fd!==null)fs.closeSync(fd);resolve(code??1);});
});
let code=await run([executable,...args]);
if(code===0&&command==='typecheck')code=await run([root+'/apps/web/node_modules/typescript/bin/tsc','--noEmit']);
process.exitCode=code;
