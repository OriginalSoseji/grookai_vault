// Full repository gate on the fixed stock-reservation fixture. No arbitrary command/target,
// production credential inheritance, database reset, provider call or deployment.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {root,fixture,project,hash,guard,sql} from '../schema/vendor_order_cancellation_runtime_v1.mjs';
function guardRuntime(){
 const result=guard({full:true});
 assert.equal(sql("select (select count(*) from vendor_orders)||'|'||(select count(*) from vendor_order_attempts)||'|'||(select count(*) from vendor_order_signals)||'|'||(select count(*) from vendor_order_observations)||'|'||(select orders_enabled::text from vendor_orders_rollout);"),'0|0|0|0|false');
 assert.equal(sql("select (select count(*) from vendor_stock_reservations)||'|'||(select reservations_enabled::text from vendor_stock_rollout);"),'0|false');
 const replay=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/vendor_order_cancellation_v1/replay.json')));
 assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,result.sourceHashes);
 assert.equal(sql('select count(*) from public.vendor_store_custom_imports;'),'0');
 assert.equal(sql("select (select count(*) from public.vendor_seller_accounts)||'|'||(select count(*) from public.vendor_seller_events)||'|'||(select onboarding_enabled::text from public.vendor_seller_rollout);"),'0|0|false');
 assert.equal(sql("select app_enabled::text||'|'||web_enabled::text||'|'||custom_enabled::text from public.vendor_store_rollout;"),'false|false|false');
 assert.equal(sql("select (select count(*) from public.vendor_billing_accounts)||'|'||(select count(*) from public.vendor_billing_checkout_attempts)||'|'||(select count(*) from public.vendor_billing_events)||'|'||(select count(*) from public.vendor_billing_reconcile_runs)||'|'||(select count(*) from public.vendor_billing_closed_accounts)||'|'||(select count(*) from public.vendor_account_financial_holds);"),'0|0|0|0|0|0');
 return result;
}
assert.ok(process.argv.length===2||(process.argv.length===3&&/^--commit(?:=.+)?$/.test(process.argv[2])));
const commit=process.argv.length===3;
const subject=process.argv[2]?.startsWith('--commit=')?process.argv[2].slice('--commit='.length):'chore: reconcile applied catalog migration before order cancellation';
assert.ok(subject.trim().length>0&&subject.length<=120&&!/[\r\n]/.test(subject),'Use one short commit subject');
if(commit)assert.equal(execFileSync('git',['diff','--name-only'],{cwd:root,encoding:'utf8'}).trim(),'','Stage reviewed changes before committing');
const mergeHead=execFileSync('git',['rev-parse','--git-path','MERGE_HEAD'],{cwd:root,encoding:'utf8'}).trim();
const commitArgs=fs.existsSync(path.resolve(root,mergeHead))?['commit','--no-edit']:['commit','-m',subject];
const runtime=guardRuntime();
for(const dir of [root,path.join(root,'apps/web')])for(const name of ['.env','.env.local','.env.production','.env.production.local']){
 const file=path.join(dir,name);if(!fs.existsSync(file))continue;
 assert.ok(dir===root&&name==='.env'&&fs.readFileSync(file,'utf8').split(/\r?\n/).every(line=>/^\s*(?:(?:SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY)=\s*)?$/.test(line)),`Uninspected private environment: ${name}`);
}
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:20821');assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'20822');
assert.ok(cfg.PUBLISHABLE_KEY?.startsWith('sb_publishable_'));assert.ok(cfg.SECRET_KEY?.startsWith('sb_secret_'));
const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles','JAVA_HOME','ANDROID_HOME','ANDROID_SDK_ROOT','PUB_CACHE','FLUTTER_ROOT'])if(process.env[key])env[key]=process.env[key];
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),emptyEnv=path.join(fixture,'shipcheck-empty.env');fs.writeFileSync(emptyEnv,'');
Object.assign(env,{DOTENV_CONFIG_PATH:emptyEnv,SUPABASE_DB_URL:'postgresql://postgres:postgres@127.0.0.1:20822/postgres?options=-c%20default_transaction_read_only%3Don',
 SUPABASE_URL:'http://127.0.0.1:15439',SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,
 NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',
 GVVI_REFERRAL_COOKIE_SECRET:'isolated-billing-shipcheck-referral-key-at-least-32',SITE_URL:'http://127.0.0.1:15440',NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:15440',
 NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
const sockets=new Set(),relay=net.createServer(socket=>{const upstream=net.connect(20821,'127.0.0.1');sockets.add(socket);sockets.add(upstream);socket.pipe(upstream).pipe(socket);
 socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>{sockets.delete(socket);upstream.destroy();});upstream.on('close',()=>{sockets.delete(upstream);socket.destroy();});});
const logPath=path.join(fixture,`shipcheck-${stamp}.log`),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
let code;
try{
 await new Promise((resolve,reject)=>{relay.once('error',reject);relay.listen(15439,'127.0.0.1',resolve);});
 const fd=fs.openSync(logPath,'wx');
 try{const child=commit?
  spawn('git',commitArgs,{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]}):
  spawn('npm.cmd',['run','shipcheck'],{cwd:root,env,shell:true,windowsHide:true,stdio:['ignore',fd,fd]});
  console.log(JSON.stringify({state:'running',project,log:path.basename(logPath),pid:child.pid}));
  code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
 }finally{fs.closeSync(fd);}
}finally{for(const socket of sockets)socket.destroy();relay.close();}
guardRuntime();
const log=fs.readFileSync(logPath,'utf8'),last=(re)=>[...log.matchAll(re)].at(-1)?.[1]??null;
const receipt={at:new Date().toISOString(),status:code===0?'passed':'failed',exitCode:code,command:commit?'git commit with normal pre-commit shipcheck':'npm run shipcheck',project,head,
 resultHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceUncommitted:!commit||code!==0,
 migrationSha256:runtime.sourceHashes['20260919080000_vendor_stripe_billing_v1.sql'],checkoutMigrationSha256:runtime.sourceHashes['20260919180000_vendor_checkout_creation_v1.sql'],ordersMigrationSha256:runtime.sourceHashes['20260919170000_vendor_orders_v1.sql'],stockMigrationSha256:runtime.sourceHashes['20260919150000_vendor_stock_reservations_v1.sql'],sellerMigrationSha256:runtime.sourceHashes['20260919130000_vendor_seller_bindings_v1.sql'],importMigrationSha256:runtime.sourceHashes['20260919120000_vendor_custom_product_import_v1.sql'],runnerSha256:hash(fs.readFileSync(new URL(import.meta.url))),logSha256:hash(log),
 nodeTests:last(/^# tests (\d+)/gm),nodePassed:last(/^# pass (\d+)/gm),nodeFailed:last(/^# fail (\d+)/gm),nodeSkipped:last(/^# skipped (\d+)/gm),
 flutterPassed:last(/\+(\d+): All tests passed!/g),productionWrites:0,providerRequests:0,sharedResets:0,rolloutEnabled:false};
fs.writeFileSync(path.join(root,'docs/audits/vendor_order_cancellation_v1',`shipcheck-${stamp}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify(receipt));process.exitCode=code===0?0:1;
