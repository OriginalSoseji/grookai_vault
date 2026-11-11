// Scheduler adapter: exact canonical production configuration, private temporary
// env file, ordinary durable worker, and no credentials in arguments or output.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const names=['NODE_ENV','SUPABASE_URL','SUPABASE_SECRET_KEY','SQUARE_ENVIRONMENT','SQUARE_APP_ID','SQUARE_CALLBACK_URL',
 'SQUARE_APP_SECRET','SQUARE_TOKEN_ENCRYPTION_KEY','GROOKAI_SQUARE_LINKING_ENABLED','GROOKAI_SQUARE_CATALOG_ENABLED','GROOKAI_SQUARE_COMMERCE_ENABLED'];
let directory;
try{
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.NODE_ENV!=='production'||process.env.SUPABASE_URL!=='https://ycdxbpibncqcchqiihfz.supabase.co'||process.env.SQUARE_ENVIRONMENT!=='production')throw Error();
 if(names.some(name=>!process.env[name]||/[\r\n\0]/.test(process.env[name])))throw Error();
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'grookai-square-'));fs.chmodSync(directory,0o700);
 const file=path.join(directory,'worker.private.env');fs.writeFileSync(file,names.map(name=>name+'='+JSON.stringify(process.env[name])).join('\n')+'\n',{mode:0o600,flag:'wx'});
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('./run_commerce_worker_v2.mjs',import.meta.url)),'--once','--env-file='+file],{stdio:'inherit',timeout:12*60*1000,windowsHide:true});
 if(result.error||result.status!==0)process.exitCode=1;
}catch{console.error('square_scheduler_configuration_unavailable');process.exitCode=1;}
finally{if(directory){fs.rmSync(path.join(directory,'worker.private.env'),{force:true});fs.rmdirSync(directory);}}
