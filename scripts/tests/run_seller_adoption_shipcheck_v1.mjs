// Unmodified repository shipcheck against the qualified, retained local lab.
// No reset, production credentials, arbitrary command or target override.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
import {captureStorefrontBuildConfig} from '../ci/preserve_storefront_build_config.mjs';
assert.ok(process.argv.length===2 || (process.argv.length===3&&process.argv[2]==='--commit'));
const commit=process.argv[2]==='--commit';
const root='C:/gv_store_seller_link_20260928',project='grookai-seller-review-20260929';
assert.equal(fs.realpathSync(process.cwd()).replaceAll('\\','/').toLowerCase(),root.toLowerCase());
if(commit){
 assert.equal(execFileSync('git',['diff','--name-only'],{cwd:root,encoding:'utf8'}).trim(),'','Stage reviewed changes first');
 assert.equal(execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim(),'','Review untracked source first');
 const hook=execFileSync('git',['rev-parse','--git-path','hooks/pre-commit'],{cwd:root,encoding:'utf8'}).trim();
 assert.match(fs.readFileSync(path.resolve(root,hook),'utf8'),/GROOKAI_MANAGED_HOOK_V1[\s\S]*npm run shipcheck/);
}
const base=root+'/.local/integration/seller-adoption-v2',fixture=base+'/replay-409';
const hash=value=>createHash('sha256').update(value).digest('hex');
const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'/supabase/migrations/'+n))]));
const proof=JSON.parse(fs.readFileSync(fixture+'/receipt.json'));
assert.equal(proof.status,'passed');assert.equal(proof.fullReplay,true);assert.deepEqual(proof.sourceHashes,sources);
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];
assert.equal(db.State.Running,true);assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:31021');
const dbUrl=new URL(cfg.DB_URL);assert.equal(dbUrl.hostname,'127.0.0.1');assert.equal(dbUrl.port,'31022');
dbUrl.searchParams.set('options','-c default_transaction_read_only=on');
const env={};
for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles','JAVA_HOME','ANDROID_HOME','ANDROID_SDK_ROOT','PUB_CACHE','FLUTTER_ROOT'])if(process.env[key])env[key]=process.env[key];
const pathKey=Object.hasOwn(env,'Path')?'Path':'PATH';env[pathKey]='C:\\src\\flutter\\bin;'+env[pathKey];
for(const dir of [root,path.join(root,'apps/web')])for(const name of ['.env','.env.local','.env.production','.env.production.local']){
 const file=path.join(dir,name);if(!fs.existsSync(file))continue;
 for(const match of fs.readFileSync(file,'utf8').matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm))env[match[1]]='';
}
const out=base+'/shipcheck-'+Date.now();fs.mkdirSync(out);fs.writeFileSync(out+'/empty.env','',{flag:'wx'});
Object.assign(env,{DOTENV_CONFIG_PATH:out+'/empty.env',SUPABASE_DB_URL:dbUrl.href,
 SUPABASE_URL:cfg.API_URL,NEXT_PUBLIC_SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY,
 NEXT_PUBLIC_SUPABASE_ANON_KEY:cfg.ANON_KEY,SUPABASE_SECRET_KEY:localSupabaseStatusSecret(cfg),
 NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST:'true',
 GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:'http://127.0.0.1:31040',NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:31040',
 GVVI_REFERRAL_COOKIE_SECRET:'isolated-adoption-referral-key-at-least-32-characters',
 NODE_OPTIONS:`--use-system-ca --require=${root}/scripts/tests/vendor_storefront_network_guard.cjs`});
const restore=captureStorefrontBuildConfig(root+'/apps/web',env),logFile=out+'/shipcheck.private.log';
const fd=fs.openSync(logFile,'wx');let code;
try{
 const child=commit?spawn('git',['commit','-m','fix: preserve seller approval history and revocation'],{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]}):
  spawn('npm.cmd',['run','shipcheck'],{cwd:root,env,shell:true,windowsHide:true,stdio:['ignore',fd,fd]});
 console.log(JSON.stringify({state:'running',project,output:out}));
 code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
}finally{fs.closeSync(fd);restore();}
const receipt={status:code===0?'passed':'failed',at:new Date().toISOString(),exitCode:code,
 command:commit?'git commit with normal pre-commit shipcheck':'npm run shipcheck',normalHooks:commit,project,
 commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceHashes:sources,
 sourceDirty:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim().length>0,
 logFile,logSha256:hash(fs.readFileSync(logFile)),productionWrites:0,sharedResets:0};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({status:receipt.status,exitCode:code,output:out}));process.exitCode=code===0?0:1;
