// One-use historical-cost437 replay and populated436 upgrade. Local proof only; never remote.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
import {createReceipt,emptyBook} from '../../apps/web/src/lib/receipts/receiptBook.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/product_cost_history_20261008';
const migration='20261008190000_vendor_sale_cost_corrections_v1.sql';
const hash=b=>createHash('sha256').update(b).digest('hex');
const hashes=dir=>Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(path.join(dir,n)))]));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(process.argv.length,3);
const mode=process.argv[2];assert.ok(['full','upgrade'].includes(mode));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_cost_history_20261008');
assert.equal(fs.realpathSync('.'),fs.realpathSync(root));
const port=mode==='full'?35000:35020,project=`costhist-${mode}-437-v1-20261008`,fixture=out+'/'+mode+'-437-v1';
assert.ok(project.length<=40,'Supabase must retain the exact isolated project name');
const relay=project+'-relay',container='supabase_db_'+project,subnet=mode==='full'?'10.246.101.0/24':'10.246.102.0/24';
const save=(name,value)=>fs.writeFileSync(fixture+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
const sources=hashes(root+'supabase/migrations');assert.equal(Object.keys(sources).length,437);
const baselinePath=out+'/BASELINE_429.json';
const baseline=JSON.parse(fs.readFileSync(baselinePath));
assert.equal(baseline.status,'passed');assert.equal(baseline.migrations,429);
assert.equal(baseline.comparison.normalizedBytes,0);assert.equal(baseline.productionWrites,0);
assert.equal(baseline.sourceMigrations,436);assert.equal(baseline.localWrites,0);
const age=Date.now()-Date.parse(baseline.at);assert.ok(age>=0&&age<7200000,'Fresh pre-history baseline required');
const baseFiles=execFileSync('git',['ls-tree','-r','--name-only','070e87baafccc7ad81a3a90c7ee07c0cb4ae549a','--','supabase/migrations'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(n=>/^supabase\/migrations\/[^/]+\.sql$/.test(n));
assert.equal(baseFiles.length,436);
const objects=execFileSync('git',['cat-file','--batch'],{cwd:root,input:baseFiles.map(file=>'070e87baafccc7ad81a3a90c7ee07c0cb4ae549a:'+file).join('\n')+'\n',maxBuffer:64*1024*1024});
let offset=0;
for(const file of baseFiles){
  const end=objects.indexOf(10,offset),header=objects.subarray(offset,end).toString('ascii').match(/^[a-f0-9]{40} blob (\d+)$/);
  assert.ok(header,'Missing baseline blob '+file);const size=Number(header[1]),start=end+1;
  assert.equal(hash(fs.readFileSync(root+file)),hash(objects.subarray(start,start+size)),file);
  assert.equal(objects[start+size],10);offset=start+size+1;
}
assert.equal(offset,objects.length);
assert.ok(sources[migration]);
const parentBase='C:/grookai_vault_operator_artifacts/product_discount_20261008';
const qualified=JSON.parse(fs.readFileSync(parentBase+'/full-436-v1/freeze.json'));
for(const [name,digest] of Object.entries(qualified.sourceHashes))assert.equal(sources[name],digest,name);
assert.equal(baseline.qualifiedParent,'070e87baafccc7ad81a3a90c7ee07c0cb4ae549a');
for(const file of ['full-436-v1/replay-result.json','upgrade-436-v1/upgrade-result.json','shadow-436-v1/receipt.json'])assert.equal(JSON.parse(fs.readFileSync(parentBase+'/'+file)).status,'passed',file);
const env={...process.env,DO_NOT_TRACK:'1'};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
function cli(args,label){
  const fd=fs.openSync(fixture+'/'+label+'.private.log','wx');let r;
  try{r=spawnSync('supabase',[...args,'--workdir',fixture,'--network-id',project],{cwd:fixture,env,stdio:['ignore',fd,fd],windowsHide:true,timeout:600000});}finally{fs.closeSync(fd);}
  assert.ifError(r.error);assert.equal(r.status,0,`${label} failed. Preserve this fixture and consumed intent.`);
}
function guard(count,{empty=true}={}){
  const plan=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
  assert.equal(plan.project,project);assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),plan.configSha256);
  assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
  assert.deepEqual(hashes(fixture+'/supabase/migrations'),Object.fromEntries(Object.entries(sources).filter(([n])=>count===437||n!==migration)));
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
  assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(JSON.parse(docker('inspect',relay))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(sources).filter(n=>count===437||n!==migration).map(n=>n.split('_')[0]).sort());
  const state=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from card_prints),'copies',(select count(*) from vault_item_instances),'stores',(select count(*) from vendor_stores),'runs',(select count(*) from cron.job_run_details),'workers',current_setting('max_worker_processes'))"));
  assert.equal(state.workers,'0');assert.equal(state.runs,0);assert.equal(state.stores,0);
  if(empty){assert.equal(state.users,0);assert.equal(state.cards,0);assert.equal(state.copies,0);}
  assert.equal(sql('select app_enabled::text||web_enabled::text||custom_enabled::text from vendor_store_rollout'),'falsefalsefalse');
  assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
  assert.equal(sql('select enabled::text from vendor_discount_control'),'false');
  if(count===437){assert.equal(sql('select count(*) from vendor_sale_cost_correction_requests'),'0');assert.equal(sql('select enabled::text from vendor_sale_cost_correction_control'),'false');}
  if(count>=436){assert.equal(sql('select enabled::text from vendor_event_control'),'false');if(empty)assert.equal(sql('select count(*)::text from vendor_events'),'0');assert.equal(sql('select enabled::text from vendor_negotiated_trade_control'),'false');assert.equal(sql('select enabled::text from vendor_purchase_control'),'false');assert.equal(sql('select edit_enabled::text||capture_enabled::text from vendor_cost_evidence_control'),'falsefalse');assert.equal(sql('select enabled::text from vendor_sales_trade_control'),'false');assert.equal(sql('select enabled::text from vendor_sales_cart_control'),'false');assert.equal(sql('select email_enabled::text||sms_enabled::text from vendor_receipt_delivery_control'),'falsefalse');assert.equal(sql('select enabled::text from vendor_sales_payment_control'),'false');assert.equal(sql('select enabled::text from vendor_receipt_cloud_control'),'false');}
  return state;
}


assert.equal(mode,'full');
assert.ok(fs.existsSync(fixture+'/reset-intent.json'));
assert.ok(!fs.existsSync(fixture+'/replay-result.json'));
assert.ok(!fs.existsSync(fixture+'/fixture-intent.json'));
const frozen=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
assert.equal(hash(fs.readFileSync(root+'scripts/schema/product_cost_history_lab_v1.mjs')),frozen.scriptSha256);
const resetLog=fs.readFileSync(fixture+'/full-reset.private.log','utf8');
assert.ok(resetLog.includes('Restarting containers...'));
assert.ok(resetLog.includes('Error status 502: An invalid response was received from the upstream server'));
assert.ok(!/^ERROR[ (:]/m.test(resetLog));
const applied=[...resetLog.matchAll(/Applying migration ([0-9]+_[^\r\n]+\.sql)\.\.\./g)].map(m=>m[1]);
assert.deepEqual(applied,Object.keys(sources));
const before=guard(437);
const ready=await fetch('http://127.0.0.1:35001/rest/v1/',{signal:AbortSignal.timeout(10000)});
assert.equal(ready.status,200);const api=await ready.json();assert.equal(api.swagger,'2.0');
save('postrestart-recovery-intent.json',{at:new Date().toISOString(),project,consumed:true,resetCliExit:1,reason:'Migration replay finished; isolated gateway returned502 during CLI container restart',resetLogSha256:hash(resetLog),applied:applied.length,before,httpStatus:ready.status,scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),productionWrites:0});
cli(['db','push','--local','--yes'],'postrestart-push-noop');
assert.ok(fs.readFileSync(fixture+'/postrestart-push-noop.private.log','utf8').includes('Local database is up to date.'));
const after=guard(437);assert.deepEqual(after,before);
save('replayed.private.json',JSON.parse(sql(snapshotSql)));
save('replay-result.json',{status:'passed',at:new Date().toISOString(),fullReplay:true,noOpPush:true,migrations:437,project,productionWrites:0,retainedFixtureResets:0,state:after,resetCliExit:1,postRestartRecovered:true,recoveryIntent:'postrestart-recovery-intent.json',repeatedReset:false});
console.log(JSON.stringify({status:'passed',project,migrations:437,resetCliExit:1,postRestartRecovered:true,repeatedReset:false}));
