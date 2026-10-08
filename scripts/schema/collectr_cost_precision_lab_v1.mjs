// One-use exact production package replay430 and retained429 upgrade; excludes deferred receipt delivery. Never remote.
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
const out='C:/grookai_vault_operator_artifacts/collectr_cost_precision_20261008';
const migration='20261008100000_collectr_sealed_cost_precision_v1.sql';
const hash=b=>createHash('sha256').update(typeof b==='string'||Buffer.isBuffer(b)?b:JSON.stringify(b)).digest('hex');
const hashes=dir=>Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(path.join(dir,n)))]));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(process.argv.length,3);
const operation=process.argv[2];assert.ok(['full','upgrade','resume-upgrade-start','finish-upgrade-fixture'].includes(operation));
const resumeStart=operation==='resume-upgrade-start',resumeFixture=operation==='finish-upgrade-fixture',mode=resumeStart||resumeFixture?'upgrade':operation;
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_collectr_adventure_20261001');
const port=mode==='full'?33700:33720,project=mode==='full'?'collectr-cost-full-430-v1-20261008':'collectr-cost-upgrade-430-v1-20261008',fixture=out+'/'+mode+'-430-v1';
const relay=project+'-relay',container='supabase_db_'+project,subnet=mode==='full'?'10.245.201.0/24':'10.245.202.0/24';
const save=(name,value)=>fs.writeFileSync(fixture+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
const allSources=hashes(root+'supabase/migrations');assert.equal(Object.keys(allSources).length,431);
const deferred='20261005150000_vendor_receipt_delivery_v1.sql';
assert.equal(allSources[deferred],'b23a47b9892a5a2ccfc65f9fb81b350496ba560baaaab0ac8cd961d6eb2da84d');
const sources=Object.fromEntries(Object.entries(allSources).filter(([n])=>n!==deferred));assert.equal(Object.keys(sources).length,430);
const baselinePath=out+'/BASELINE_429.json';
const baseline=JSON.parse(fs.readFileSync(baselinePath));
assert.equal(baseline.status,'passed');assert.equal(baseline.migrations,429);
assert.equal(baseline.comparison.normalizedBytes,0);assert.equal(baseline.productionWrites,0);
assert.ok(Date.now()-Date.parse(baseline.at)<6*3600000,'Fresh read-only baseline required');
const prior=JSON.parse(fs.readFileSync('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json'));
assert.equal(Object.keys(prior.sourceHashes).length,429);
for(const [name,digest] of Object.entries(prior.sourceHashes))assert.equal(sources[name],digest,name);
assert.deepEqual(Object.keys(sources).filter(n=>!Object.hasOwn(prior.sourceHashes,n)),[migration]);
assert.equal(sources[migration],'df88cafdfec62a185e6743a210d68f82939029b31438fd3e76dcf44562b3cc14');
assert.ok(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>1.5*1024**3,'Insufficient host free space for bounded lab');
assert.ok(sources[migration]);
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
  assert.deepEqual(hashes(fixture+'/supabase/migrations'),Object.fromEntries(Object.entries(sources).filter(([n])=>count===430||n!==migration)));
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
  assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(JSON.parse(docker('inspect',relay))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(sources).filter(n=>count===430||n!==migration).map(n=>n.split('_')[0]).sort());
  const state=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from card_prints),'copies',(select count(*) from vault_item_instances),'stores',(select count(*) from vendor_stores),'runs',(select count(*) from cron.job_run_details),'workers',current_setting('max_worker_processes'))"));
  assert.equal(state.workers,'0');assert.equal(state.runs,0);assert.equal(state.stores,0);
  if(empty){assert.equal(state.users,0);assert.equal(state.cards,0);assert.equal(state.copies,0);}
  assert.equal(sql('select app_enabled::text||web_enabled::text||custom_enabled::text from vendor_store_rollout'),'falsefalsefalse');
  assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
  if(count===430){assert.equal(sql('select enabled::text from vendor_sales_trade_control'),'false');assert.equal(sql('select enabled::text from vendor_sales_cart_control'),'false');assert.equal(sql("select to_regclass('public.vendor_receipt_delivery_control') is null"),'t');assert.equal(sql('select enabled::text from vendor_sales_payment_control'),'false');}
  return state;
}

if(resumeFixture){
  const frozen=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
  assert.equal(frozen.project,project);assert.deepEqual(frozen.sourceHashes,sources);
  assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),frozen.configSha256);
  assert.ok(fs.existsSync(fixture+'/fixture-intent.json'));
  for(const name of ['import-fixture.private.json','upgrade-intent.json','upgrade-result.json','finish-fixture-intent.json'])assert.equal(fs.existsSync(fixture+'/'+name),false,name);
  guard(429,{empty:false});
  const counts=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'copies',(select count(*) from vault_item_instances),'cards',(select count(*) from card_prints),'printings',(select count(*) from card_printings),'books',(select count(*) from vendor_receipt_books),'groups',(select count(*) from vault_collection_import_groups_v2),'docs',(select count(*) from vault_collection_import_documents_v2),'receipts',(select count(*) from vault_collection_import_receipts_v3))"));
  assert.deepEqual(counts,{users:1,copies:2,cards:1,printings:1,books:1,groups:0,docs:0,receipts:0});
  save('finish-fixture-intent.json',{at:new Date().toISOString(),project,counts,scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),scope:'Continue after fixture serialization error; never reset/reseed existing copies',consumed:true});
}else if(resumeStart){
  // Resume only a failed initial connection, before any migration reset or data
  // fixture was attempted. Never restart/reset a populated or completed lab.
  const frozen=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
  assert.equal(frozen.project,project);assert.deepEqual(frozen.sourceHashes,sources);
  assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),frozen.configSha256);
  assert.equal(fs.existsSync(fixture+'/supabase/.temp/project-ref'),false);
  for(const n of ['before-reset.json','reset-intent.json','fixture-intent.json','upgrade-intent.json','upgrade-result.json','resume-start-intent.json'])assert.equal(fs.existsSync(fixture+'/'+n),false,n);
  assert.match(fs.readFileSync(fixture+'/start.private.log','utf8'),/dial tcp 127\.0\.0\.1:33720: i\/o timeout/);
  assert.deepEqual(hashes(fixture+'/supabase/migrations'),Object.fromEntries(Object.entries(sources).filter(([n])=>n!==migration)));
  assert.equal(docker('ps','-a','--filter','name=supabase_','--format','{{.Names}}').split(/\r?\n/).filter(n=>n.endsWith('_'+project)).length,0);
  const relayState=JSON.parse(docker('inspect',relay))[0];assert.equal(relayState.State.Running,true);
  assert.deepEqual(Object.keys(relayState.NetworkSettings.Networks).sort(),['bridge',project].sort());
  for(const bindings of Object.values(relayState.NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  save('resume-start-intent.json',{at:new Date().toISOString(),project,sourceHashes:sources,scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),consumed:true,scope:'Initial connection failure only; no prior reset or populated fixture'});
}else{
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
}
if(!resumeFixture){
cli(['start','--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],resumeStart?'resume-start':'start');
const initial=guard(mode==='full'?430:429);save('before-reset.json',initial);
save('reset-intent.json',{at:new Date().toISOString(),project,sourceHashes:sources,initial,consumed:true});
cli(['db','reset','--local','--no-seed','--yes'],'full-reset');guard(mode==='full'?430:429);
}
if(mode==='full'){
  cli(['db','push','--local','--yes'],'push-noop');
  save('replayed.private.json',JSON.parse(sql(snapshotSql)));
  save('replay-result.json',{status:'passed',at:new Date().toISOString(),fullReplay:true,noOpPush:true,migrations:430,project,productionWrites:0,retainedFixtureResets:0,state:guard(430)});
}else{
  const before=resumeFixture?JSON.parse(fs.readFileSync(fixture+'/baseline.private.json')):JSON.parse(sql(snapshotSql));if(!resumeFixture)save('baseline.private.json',before);
  const intent=resumeFixture?JSON.parse(fs.readFileSync(fixture+'/fixture-intent.json')):{user:randomUUID(),card:randomUUID(),set:randomUUID(),gvId:'GV-PK-UPGRADE-'+randomUUID(),receiptId:randomUUID()};
  const {user,card,set,gvId}=intent;
  const oldReceipt=createReceipt({storeName:'Synthetic retained shop',confirmed:true,method:'Cash',customer:{name:'',email:'',phone:'',wants:'',notes:''},items:[{description:'Pre-upgrade sale',quantity:'1',price:'12.34'}],note:'Retain this receipt',tax:'0'},intent.receiptId,'2026-10-03T12:00:00.000Z');
  const oldBook=JSON.stringify({...emptyBook(),receipts:[{receipt:oldReceipt,customerId:null}]}).replaceAll("'","''");
  if(!resumeFixture){
  save('fixture-intent.json',{at:new Date().toISOString(),user,card,set,gvId,receiptId:oldReceipt.id,scope:'synthetic two-copy and prior-format receipt retention',consumed:true});
  sql(`begin;insert into auth.users(id,aud,role,email) values('${user}','authenticated','authenticated','${user}@native-upgrade.invalid');
    insert into public.sets(id,code,name,game) values('${set}','${set}','Search upgrade fixture','pokemon');
    insert into public.card_prints(id,set_id,name,number,gv_id,game_id) values('${card}','${set}','Search upgrade card','1','${gvId}',(select id from games where code='pokemon'));
    select public.admin_vault_instance_create_v1(p_user_id=>'${user}'::uuid,p_card_print_id=>'${card}'::uuid,p_condition_label=>'LP');
    select public.admin_vault_instance_create_v1(p_user_id=>'${user}'::uuid,p_card_print_id=>'${card}'::uuid,p_condition_label=>'NM');
    select public.vendor_receipt_book_validate_v1('${oldBook}'::jsonb,'${user}'::uuid);
    insert into public.vendor_receipt_books(owner_id,revision,book) values('${user}',1,'${oldBook}'::jsonb);commit;`);
  }
  assert.equal(sql(`select count(*) from vault_item_instances where user_id='${user}' and card_print_id='${card}' and condition_label in ('LP','NM')`),'2');
  assert.deepEqual(JSON.parse(sql(`select book from vendor_receipt_books where owner_id='${user}'`)),JSON.parse(oldBook.replaceAll("''","'")));
  const printing=resumeFixture?sql(`select id from card_printings where card_print_id='${card}' and finish_key='normal'`):randomUUID(),request=randomUUID(),source=[{'Product Name':'Search upgrade card','Card Number':'1',Grade:'Ungraded',Quantity:'1'}];
  assert.match(printing,/^[a-f0-9-]{36}$/);
  const targets=[{sourceIndices:[0],cardId:card,gvId,cardPrintingId:printing,finishKey:'normal',desiredQuantity:1,condition:'NM',acquisitionCost:12.34,createdAt:null,createdAtDateOnly:false,notes:'Retain imported copy'}];
  if(!resumeFixture)sql(`insert into card_printings(id,card_print_id,finish_key) values('${printing}','${card}','normal');`);
  const importCall=`select admin_import_vault_collection_v3('${user}','${request}','${hash(targets)}','${hash(source)}','${JSON.stringify(source)}'::jsonb,'${JSON.stringify(targets)}'::jsonb,'[]'::jsonb)`;
  const imported=JSON.parse(sql(importCall));assert.equal(imported.success,true);assert.equal(imported.importedCards,1);
  save('import-fixture.private.json',{user,request,source,targets,receipt:imported});
  const retainedSql="select json_build_object('copies',(select json_agg(t order by id) from vault_item_instances t),'anchors',(select json_agg(t order by id) from vault_items t),'owners',(select json_agg(t order by user_id) from vault_owners t),'cards',(select json_agg(t order by id) from card_prints t),'sets',(select json_agg(to_jsonb(t)-'search_code_lower' order by id) from sets t),'receiptBooks',(select json_agg(t order by owner_id) from vendor_receipt_books t),'importDocuments',(select json_agg(t order by user_id,source_sha256) from vault_collection_import_documents_v2 t),'importGroups',(select json_agg(t order by user_id,source_sha256,group_key) from vault_collection_import_groups_v2 t),'importReceipts',(select json_agg(t order by user_id,request_id) from vault_collection_import_receipts_v3 t))";
  const retained=JSON.parse(sql(retainedSql));save('before-upgrade.private.json',retained);
  guard(429,{empty:false});fs.copyFileSync(root+'supabase/migrations/'+migration,fixture+'/supabase/migrations/'+migration,fs.constants.COPYFILE_EXCL);
  save('upgrade-intent.json',{at:new Date().toISOString(),project,migration,sha256:sources[migration],consumed:true});
  cli(['db','push','--local','--include-all','--yes'],'upgrade');guard(430,{empty:false});
  cli(['db','push','--local','--yes'],'push-noop');
  assert.deepEqual(JSON.parse(sql(retainedSql)),retained);assert.equal(sql("select count(*) from sets where search_code_lower is distinct from lower(code)"),'0');
  assert.deepEqual(JSON.parse(sql(importCall)),imported,'Pre-upgrade receipt must recover without another save');
  assert.deepEqual(JSON.parse(sql(retainedSql)),retained,'Recovery must preserve all retained records');
  sql(`select public.vendor_receipt_book_validate_v1(book,owner_id) from public.vendor_receipt_books where owner_id='${user}'::uuid`);
  const after=JSON.parse(sql(snapshotSql));save('upgraded.private.json',after);
  const clean=JSON.parse(fs.readFileSync(out+'/full-430-v1/replayed.private.json'));assert.deepEqual(after.LEDGER,clean.LEDGER);
  const comparison=await compareSnapshots(after,clean,{output:fixture+'/parity'});
  save('upgrade-result.json',{status:'passed',at:new Date().toISOString(),migrations:430,project,noOpPush:true,retainedCopies:retained.copies.length,retainedReceiptBooks:retained.receiptBooks.length,retainedImportGroups:retained.importGroups.length,retainedImportReceipts:retained.importReceipts.length,priorImportRecovered:true,priorReceiptFormatValidated:true,allFixtureRowsUnchanged:true,comparison,productionWrites:0,resetsAfterPopulation:0});
}
console.log(JSON.stringify({status:'passed',mode,project,fixture,migrations:430}));
