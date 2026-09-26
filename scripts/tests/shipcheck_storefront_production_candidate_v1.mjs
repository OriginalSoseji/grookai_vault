import { localSupabaseStatusSecret } from '../lib/local_supabase_cli_status_v1.mjs';
// Run the unmodified repository shipcheck with local credentials and read-only DB.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
const trialReplay=process.argv[2]==='--trial';
const packageReplay=process.argv[2]==='--package'||trialReplay;
const {root,fixture,guard,hash}=await import(trialReplay?'../schema/storefront_production_trial_lab_v1.mjs':packageReplay?'../schema/storefront_production_package_lab_v1.mjs':'../schema/storefront_production_lab_v1.mjs');
assert.ok(process.argv.length===2||(process.argv.length===3&&packageReplay));guard({full:true,scan:true});
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:29021');
const env={};
for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles','JAVA_HOME','ANDROID_HOME','ANDROID_SDK_ROOT','PUB_CACHE','FLUTTER_ROOT'])if(process.env[key])env[key]=process.env[key];
const pathKey=Object.hasOwn(env,'Path')?'Path':'PATH';env[pathKey]='C:\\src\\flutter\\bin;'+env[pathKey];
// Empty every discovered .env key: no fallback to production credentials.
for(const file of ['.env','.env.local','apps/web/.env','apps/web/.env.local'])if(fs.existsSync(path.join(root,file)))for(const m of fs.readFileSync(path.join(root,file),'utf8').matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm))env[m[1]]='';
const empty=path.join(fixture,'shipcheck-empty.env');if(!fs.existsSync(empty))fs.writeFileSync(empty,'',{flag:'wx'});
Object.assign(env,{DOTENV_CONFIG_PATH:empty,SUPABASE_DB_URL:'postgresql://postgres:postgres@127.0.0.1:29022/postgres?options=-c%20default_transaction_read_only%3Don',SUPABASE_URL:cfg.API_URL,NEXT_PUBLIC_SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY,NEXT_PUBLIC_SUPABASE_ANON_KEY:cfg.ANON_KEY,SUPABASE_SECRET_KEY:localSupabaseStatusSecret(cfg),NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST:'true',GROOKAI_STORE_BATCH_COMMIT_ENABLED:'true',GROOKAI_STORE_BATCH_CANCELLATION_ENABLED:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:29040',SITE_URL:'http://127.0.0.1:29040',GVVI_REFERRAL_COOKIE_SECRET:'isolated-storefront-referral-test-key-at-least-32',NODE_OPTIONS:`--use-system-ca --require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
const stamp=new Date().toISOString().replaceAll(':','-'),logFile=path.join(fixture,`shipcheck-${stamp}.private.log`),log=fs.openSync(logFile,'wx');
const child=spawn('npm.cmd',['run','shipcheck'],{cwd:root,env,shell:true,windowsHide:true,stdio:['ignore',log,log]});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});fs.closeSync(log);
const report={at:new Date().toISOString(),status:code===0?'passed':'failed',exitCode:code,logFile,logSha256:hash(fs.readFileSync(logFile)),command:'npm run shipcheck',localOnly:true,productionWrites:0};
fs.writeFileSync(path.join(root,`docs/audits/${trialReplay?'storefront_production_trials_v1':packageReplay?'storefront_production_package_v1':'storefront_production_20260926'}/shipcheck-${stamp}.json`),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));assert.equal(code,0,'Inspect retained shipcheck log; no hook bypass');
