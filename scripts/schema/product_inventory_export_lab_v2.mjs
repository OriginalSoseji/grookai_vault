// One-use inventory439 full replay. No populated or prior lab can be reset.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {snapshotSql} from './vendor_billing_schema_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/product_inventory_export_20261008';
const migration='20261009010000_inventory_export_v1.sql';
const hash=b=>createHash('sha256').update(b).digest('hex');
const hashes=dir=>Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(path.join(dir,n)))]));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(process.argv.length,2);
const mode='full';
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_inventory_export_20261008');
assert.equal(fs.realpathSync('.'),fs.realpathSync(root));
const port=35940,project='inventory-full-439-v2-20261008',fixture=out+'/full-439-v2';
assert.ok(project.length<=40,'Supabase must retain the exact isolated project name');
const relay=project+'-relay',container='supabase_db_'+project,subnet='10.246.117.0/24';
const save=(name,value)=>fs.writeFileSync(fixture+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
const sources=hashes(root+'supabase/migrations');assert.equal(Object.keys(sources).length,439);
const baselinePath=out+'/BASELINE_429.json';
const baseline=JSON.parse(fs.readFileSync(baselinePath));
assert.equal(baseline.status,'passed');assert.equal(baseline.migrations,429);
assert.equal(baseline.comparison.normalizedBytes,0);assert.equal(baseline.productionWrites,0);
assert.equal(baseline.sourceMigrations,438);assert.equal(baseline.localWrites,0);
const age=Date.now()-Date.parse(baseline.at);assert.ok(age>=0&&age<7200000,'Fresh pre-inventory baseline required');
const baseFiles=execFileSync('git',['ls-tree','-r','--name-only','19adf542a89238969606dc5d900d7a92ee0b29ed','--','supabase/migrations'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(n=>/^supabase\/migrations\/[^/]+\.sql$/.test(n));
assert.equal(baseFiles.length,438);
const objects=execFileSync('git',['cat-file','--batch'],{cwd:root,input:baseFiles.map(file=>'19adf542a89238969606dc5d900d7a92ee0b29ed:'+file).join('\n')+'\n',maxBuffer:64*1024*1024});
let offset=0;
for(const file of baseFiles){
  const end=objects.indexOf(10,offset),header=objects.subarray(offset,end).toString('ascii').match(/^[a-f0-9]{40} blob (\d+)$/);
  assert.ok(header,'Missing baseline blob '+file);const size=Number(header[1]),start=end+1;
  assert.equal(hash(fs.readFileSync(root+file)),hash(objects.subarray(start,start+size)),file);
  assert.equal(objects[start+size],10);offset=start+size+1;
}
assert.equal(offset,objects.length);
assert.ok(sources[migration]);
assert.equal(baseline.qualifiedParent,'19adf542a89238969606dc5d900d7a92ee0b29ed');
for(const [name,digest]of Object.entries(baseline.sourceHashes))assert.equal(sources[name],digest,name);
assert.deepEqual(Object.keys(sources).filter(n=>!Object.hasOwn(baseline.sourceHashes,n)),[migration]);
const env={...process.env,DO_NOT_TRACK:'1'};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
async function cli(args,label){
  const fd=fs.openSync(fixture+'/'+label+'.private.log','wx');let r;
  try{r=spawnSync('supabase',[...args,'--workdir',fixture,'--network-id',project],{cwd:fixture,env,stdio:['ignore',fd,fd],windowsHide:true,timeout:600000});}finally{fs.closeSync(fd);}
  assert.ifError(r.error);
  if(r.status!==0 && label==='full-reset'){
    const log=fs.readFileSync(fixture+'/'+label+'.private.log','utf8');
    assert.ok(log.includes('Restarting containers...') && log.includes('Error status 502: An invalid response was received from the upstream server'));
    assert.ok(!/^ERROR[ (:]/m.test(log));
    const applied=[...log.matchAll(/Applying migration ([0-9]+_[^\r\n]+\.sql)\.\.\./g)].map(m=>m[1]);
    assert.deepEqual(applied,Object.keys(sources).filter(n=>mode==='full'||n!==migration));
    const before=guard(439);let ready=false;
    for(let attempt=0;attempt<30;attempt++){
      try{const response=await fetch('http://127.0.0.1:'+(port+1)+'/rest/v1/',{signal:AbortSignal.timeout(2000)});ready=response.status===200 && (await response.json()).swagger==='2.0';}catch{}
      if(ready)break;await new Promise(resolve=>setTimeout(resolve,1000));
    }
    assert.equal(ready,true,'Post-reset gateway remains unavailable; preserve lab without repeating reset');
    assert.deepEqual(guard(439),before);
    save('postrestart-recovery.json',{at:new Date().toISOString(),status:'passed',project,cliExit:r.status,applied:applied.length,logSha256:hash(log),state:before,httpStatus:200,repeatedReset:false,productionWrites:0});
  }else assert.equal(r.status,0,`${label} failed. Preserve this fixture and consumed intent.`);
}
function guard(count,{empty=true}={}){
  const plan=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
  assert.equal(plan.project,project);assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),plan.configSha256);
  assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
  assert.deepEqual(hashes(fixture+'/supabase/migrations'),Object.fromEntries(Object.entries(sources).filter(([n])=>count===439||n!==migration)));
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
  assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(JSON.parse(docker('inspect',relay))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(sources).filter(n=>count===439||n!==migration).map(n=>n.split('_')[0]).sort());
  const state=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from card_prints),'copies',(select count(*) from vault_item_instances),'stores',(select count(*) from vendor_stores),'runs',(select count(*) from cron.job_run_details),'workers',current_setting('max_worker_processes'))"));
  assert.equal(state.workers,'0');assert.equal(state.runs,0);assert.equal(state.stores,0);
  if(empty){assert.equal(state.users,0);assert.equal(state.cards,0);assert.equal(state.copies,0);}
  assert.equal(sql('select app_enabled::text||web_enabled::text||custom_enabled::text from vendor_store_rollout'),'falsefalsefalse');
  assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
  assert.equal(sql('select enabled::text from vendor_discount_control'),'false');
  if(count===439){assert.equal(sql('select count(*) from portfolio_history_requests'),'0');assert.equal(sql('select enabled::text from portfolio_history_control'),'false');assert.equal(sql("select provolatile::text||prosecdef::text from pg_proc where oid='public.vault_inventory_export_v1()'::regprocedure"),'strue');}
  if(count>=438){assert.equal(sql('select enabled::text from vendor_sale_cost_correction_control'),'false');assert.equal(sql('select enabled::text from vendor_event_control'),'false');if(empty)assert.equal(sql('select count(*)::text from vendor_events'),'0');assert.equal(sql('select enabled::text from vendor_negotiated_trade_control'),'false');assert.equal(sql('select enabled::text from vendor_purchase_control'),'false');assert.equal(sql('select edit_enabled::text||capture_enabled::text from vendor_cost_evidence_control'),'falsefalse');assert.equal(sql('select enabled::text from vendor_sales_trade_control'),'false');assert.equal(sql('select enabled::text from vendor_sales_cart_control'),'false');assert.equal(sql('select email_enabled::text||sms_enabled::text from vendor_receipt_delivery_control'),'falsefalse');assert.equal(sql('select enabled::text from vendor_sales_payment_control'),'false');assert.equal(sql('select enabled::text from vendor_receipt_cloud_control'),'false');}
  return state;
}

assert.ok(!fs.existsSync(fixture),'Never reuse a prior preparation/reset intent');
assert.equal(docker('ps','-a','--filter','name='+project,'--format','{{.Names}}'),'');
assert.equal(docker('volume','ls','--filter','name='+project,'--format','{{.Name}}'),'');
for(const p of [port,port+1,port+4,port+8])await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(p,'127.0.0.1',()=>server.close(resolve));});
for(const n of JSON.parse(docker('network','inspect',...docker('network','ls','-q').split(/\s+/))))for(const ip of n.IPAM.Config??[])assert.notEqual(ip.Subnet,subnet);
fs.mkdirSync(fixture+'/supabase/migrations',{recursive:true});fs.mkdirSync(fixture+'/supabase/.temp');
let config=fs.readFileSync('C:/grookai_vault_operator_artifacts/audit_vault_write_pause_20260927/replay-411/supabase/config.toml','utf8').replaceAll('audit-vault-pause-411-20260927',project).replace(/5704([0-9])/g,(_,n)=>String(port+Number(n)));
fs.writeFileSync(fixture+'/supabase/config.toml',config,{flag:'wx'});
fs.writeFileSync(fixture+'/supabase/.temp/postgres-version','17.6.1.113',{flag:'wx'});
for(const name of Object.keys(sources))if(mode==='full'||name!==migration)fs.copyFileSync(root+'supabase/migrations/'+name,fixture+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
save('freeze.json',{at:new Date().toISOString(),project,fixture,mode,sourceHashes:sources,configSha256:hash(config),baselineReceipt:baselinePath,baselineSha256:hash(fs.readFileSync(baselinePath)),scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url)))});
const relayCode=`import net from 'node:net';for(const [port,service,targetPort] of ${JSON.stringify([[port,'db',5432],[port+1,'kong',8000],[port+4,'inbucket',8025]])}){net.createServer(source=>{const target=net.connect(targetPort,'supabase_'+service+'_${project}');source.on('error',()=>target.destroy());target.on('error',()=>source.destroy());source.on('close',()=>target.destroy());target.on('close',()=>source.destroy());source.pipe(target).pipe(source)}).listen(port,'0.0.0.0')}`;
fs.writeFileSync(fixture+'/relay.mjs',relayCode,{flag:'wx'});
save('start-intent.json',{at:new Date().toISOString(),project,subnet,ports:[port,port+1,port+4],consumed:true});
docker('network','create','--internal','--subnet',subnet,project);
docker('create','--name',relay,'--network','bridge',...([port,port+1,port+4].flatMap(p=>['-p',`127.0.0.1:${p}:${p}`])),'node:22-bookworm-slim','node','/relay.mjs');
docker('cp',fixture+'/relay.mjs',relay+':/relay.mjs');docker('network','connect',project,relay);docker('start',relay);
await cli(['start','--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],'start');
const initial=guard(439);save('before-reset.json',initial);
save('reset-intent.json',{at:new Date().toISOString(),project,sourceHashes:sources,initial,consumed:true});
await cli(['db','reset','--local','--no-seed','--yes'],'full-reset');guard(439);
await cli(['db','push','--local','--yes'],'push-noop');
save('replayed.private.json',JSON.parse(sql(snapshotSql)));
save('replay-result.json',{status:'passed',at:new Date().toISOString(),fullReplay:true,noOpPush:true,migrations:439,project,productionWrites:0,retainedFixtureResets:0,state:guard(439)});
console.log(JSON.stringify({status:'passed',mode,project,fixture,migrations:439}));
