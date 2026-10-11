// One-use portfolio438 replay and populated437 upgrade. Local proof only; never remote.
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
const out='C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008';
const migration='20261008220000_portfolio_history_v1.sql';
const hash=b=>createHash('sha256').update(b).digest('hex');
const hashes=dir=>Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(path.join(dir,n)))]));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(process.argv.length,3);
const mode=process.argv[2];assert.ok(['full','upgrade'].includes(mode));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_portfolio_history_20261008');
assert.equal(fs.realpathSync('.'),fs.realpathSync(root));
const port=mode==='full'?35440:35460,project=`portfolio-${mode}-438-v1-20261008`,fixture=out+'/'+mode+'-438-v1';
assert.ok(project.length<=40,'Supabase must retain the exact isolated project name');
const relay=project+'-relay',container='supabase_db_'+project,subnet=mode==='full'?'10.246.107.0/24':'10.246.108.0/24';
const save=(name,value)=>fs.writeFileSync(fixture+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
const sources=hashes(root+'supabase/migrations');assert.equal(Object.keys(sources).length,438);
const baselinePath=out+'/BASELINE_429.json';
const baseline=JSON.parse(fs.readFileSync(baselinePath));
assert.equal(baseline.status,'passed');assert.equal(baseline.migrations,429);
assert.equal(baseline.comparison.normalizedBytes,0);assert.equal(baseline.productionWrites,0);
assert.equal(baseline.sourceMigrations,437);assert.equal(baseline.localWrites,0);
const age=Date.now()-Date.parse(baseline.at);assert.ok(age>=0&&age<7200000,'Fresh pre-portfolio baseline required');
const baseFiles=execFileSync('git',['ls-tree','-r','--name-only','f19d39f20f35e030fffc9379d0d2eb1d854d6966','--','supabase/migrations'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(n=>/^supabase\/migrations\/[^/]+\.sql$/.test(n));
assert.equal(baseFiles.length,437);
const objects=execFileSync('git',['cat-file','--batch'],{cwd:root,input:baseFiles.map(file=>'f19d39f20f35e030fffc9379d0d2eb1d854d6966:'+file).join('\n')+'\n',maxBuffer:64*1024*1024});
let offset=0;
for(const file of baseFiles){
  const end=objects.indexOf(10,offset),header=objects.subarray(offset,end).toString('ascii').match(/^[a-f0-9]{40} blob (\d+)$/);
  assert.ok(header,'Missing baseline blob '+file);const size=Number(header[1]),start=end+1;
  assert.equal(hash(fs.readFileSync(root+file)),hash(objects.subarray(start,start+size)),file);
  assert.equal(objects[start+size],10);offset=start+size+1;
}
assert.equal(offset,objects.length);
assert.ok(sources[migration]);
const parentBase='C:/grookai_vault_operator_artifacts/product_cost_history_20261008';
const qualified=JSON.parse(fs.readFileSync(parentBase+'/full-437-v1/freeze.json'));
for(const [name,digest] of Object.entries(qualified.sourceHashes))assert.equal(sources[name],digest,name);
assert.equal(baseline.qualifiedParent,'f19d39f20f35e030fffc9379d0d2eb1d854d6966');
for(const file of ['full-437-v1/replay-result.json','upgrade-437-v1/upgrade-result.json','shadow-437-v1/receipt.json'])assert.equal(JSON.parse(fs.readFileSync(parentBase+'/'+file)).status,'passed',file);
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
    const before=guard(mode==='full'?438:437);let ready=false;
    for(let attempt=0;attempt<30;attempt++){
      try{const response=await fetch('http://127.0.0.1:'+(port+1)+'/rest/v1/',{signal:AbortSignal.timeout(2000)});ready=response.status===200 && (await response.json()).swagger==='2.0';}catch{}
      if(ready)break;await new Promise(resolve=>setTimeout(resolve,1000));
    }
    assert.equal(ready,true,'Post-reset gateway remains unavailable; preserve lab without repeating reset');
    assert.deepEqual(guard(mode==='full'?438:437),before);
    save('postrestart-recovery.json',{at:new Date().toISOString(),status:'passed',project,cliExit:r.status,applied:applied.length,logSha256:hash(log),state:before,httpStatus:200,repeatedReset:false,productionWrites:0});
  }else assert.equal(r.status,0,`${label} failed. Preserve this fixture and consumed intent.`);
}
function guard(count,{empty=true}={}){
  const plan=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
  assert.equal(plan.project,project);assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),plan.configSha256);
  assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
  assert.deepEqual(hashes(fixture+'/supabase/migrations'),Object.fromEntries(Object.entries(sources).filter(([n])=>count===438||n!==migration)));
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
  assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(JSON.parse(docker('inspect',relay))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(sources).filter(n=>count===438||n!==migration).map(n=>n.split('_')[0]).sort());
  const state=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from card_prints),'copies',(select count(*) from vault_item_instances),'stores',(select count(*) from vendor_stores),'runs',(select count(*) from cron.job_run_details),'workers',current_setting('max_worker_processes'))"));
  assert.equal(state.workers,'0');assert.equal(state.runs,0);assert.equal(state.stores,0);
  if(empty){assert.equal(state.users,0);assert.equal(state.cards,0);assert.equal(state.copies,0);}
  assert.equal(sql('select app_enabled::text||web_enabled::text||custom_enabled::text from vendor_store_rollout'),'falsefalsefalse');
  assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
  assert.equal(sql('select enabled::text from vendor_discount_control'),'false');
  if(count===438){assert.equal(sql('select count(*) from portfolio_history_requests'),'0');assert.equal(sql('select enabled::text from portfolio_history_control'),'false');}
  if(count>=437){assert.equal(sql('select enabled::text from vendor_sale_cost_correction_control'),'false');assert.equal(sql('select enabled::text from vendor_event_control'),'false');if(empty)assert.equal(sql('select count(*)::text from vendor_events'),'0');assert.equal(sql('select enabled::text from vendor_negotiated_trade_control'),'false');assert.equal(sql('select enabled::text from vendor_purchase_control'),'false');assert.equal(sql('select edit_enabled::text||capture_enabled::text from vendor_cost_evidence_control'),'falsefalse');assert.equal(sql('select enabled::text from vendor_sales_trade_control'),'false');assert.equal(sql('select enabled::text from vendor_sales_cart_control'),'false');assert.equal(sql('select email_enabled::text||sms_enabled::text from vendor_receipt_delivery_control'),'falsefalse');assert.equal(sql('select enabled::text from vendor_sales_payment_control'),'false');assert.equal(sql('select enabled::text from vendor_receipt_cloud_control'),'false');}
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
const initial=guard(mode==='full'?438:437);save('before-reset.json',initial);
save('reset-intent.json',{at:new Date().toISOString(),project,sourceHashes:sources,initial,consumed:true});
await cli(['db','reset','--local','--no-seed','--yes'],'full-reset');guard(mode==='full'?438:437);
if(mode==='full'){
  await cli(['db','push','--local','--yes'],'push-noop');
  save('replayed.private.json',JSON.parse(sql(snapshotSql)));
  save('replay-result.json',{status:'passed',at:new Date().toISOString(),fullReplay:true,noOpPush:true,migrations:438,project,productionWrites:0,retainedFixtureResets:0,state:guard(438)});
}else{
  const before=JSON.parse(sql(snapshotSql));save('baseline.private.json',before);
  const user=randomUUID(),card=randomUUID(),set=randomUUID(),gvId='GV-PK-UPGRADE-'+randomUUID();
  const oldReceipt=createReceipt({storeName:'Synthetic retained shop',confirmed:true,method:'Cash',customer:{name:'',email:'',phone:'',wants:'',notes:''},items:[{description:'Pre-upgrade sale',quantity:'1',price:'12.34'}],note:'Retain this receipt',tax:'0'},randomUUID(),'2026-10-03T12:00:00.000Z');
  const oldBook=JSON.stringify({...emptyBook(),receipts:[{receipt:oldReceipt,customerId:null}]}).replaceAll("'","''");
  save('fixture-intent.json',{at:new Date().toISOString(),user,card,set,gvId,receiptId:oldReceipt.id,scope:'synthetic two-copy and prior-format receipt retention',consumed:true});
  sql(`begin;insert into auth.users(id,aud,role,email) values('${user}','authenticated','authenticated','${user}@native-upgrade.invalid');
    insert into public.sets(id,code,name,game) values('${set}','${set}','Search upgrade fixture','pokemon');
    insert into public.card_prints(id,set_id,name,number,gv_id,game_id) values('${card}','${set}','Search upgrade card','1','${gvId}',(select id from games where code='pokemon'));
    select public.admin_vault_instance_create_v1(p_user_id=>'${user}'::uuid,p_card_print_id=>'${card}'::uuid,p_condition_label=>'LP');
    select public.admin_vault_instance_create_v1(p_user_id=>'${user}'::uuid,p_card_print_id=>'${card}'::uuid,p_condition_label=>'NM');
    select public.vendor_receipt_book_validate_v1('${oldBook}'::jsonb,'${user}'::uuid);
    insert into public.vendor_receipt_books(owner_id,revision,book) values('${user}',1,'${oldBook}'::jsonb);
    update public.vault_item_instances set acquisition_cost=case when condition_label='NM' then 0 else 12.34 end,
      acquisition_currency=case when condition_label='NM' then 'CAD' else null end where user_id='${user}';commit;`);
  const seedLog=fs.openSync(fixture+'/modern-seed.private.log','wx');let seeded;
  try{seeded=spawnSync(process.execPath,[root+'scripts/audits/product_portfolio_history_seed_v1.mjs'],{cwd:root,stdio:['ignore',seedLog,seedLog],windowsHide:true,timeout:180000});}finally{fs.closeSync(seedLog);}
  assert.ifError(seeded.error);assert.equal(seeded.status,0,'Modern retained fixture failed; preserve consumed lab');
  const modern=JSON.parse(fs.readFileSync(fixture+'/modern-seed-result.json'));assert.equal(modern.status,'passed');assert.equal(modern.costSnapshots,3);assert.equal(modern.retainedEvents,1);assert.equal(modern.retainedEventRequests,4);
  const retainedTables=['auth.users','public.vault_owners','public.vault_items','public.vault_item_instances','public.vault_item_instance_dispositions','public.vault_copy_cost_requests','public.card_events','public.pricing_watch','public.card_prints','public.card_printings','public.sets','public.vendor_receipt_books','public.vendor_sales_cart_receipts','public.vendor_sale_cost_snapshots','public.vendor_event_owners','public.vendor_events','public.vendor_event_expenses','public.vendor_event_assignments','public.vendor_event_requests','public.vendor_sales_cart_cancellations'];
  const retainedSql='select jsonb_build_object('+retainedTables.map(t=>`'${t}',(select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from ${t} t)`).join(',')+')';
  const retained=JSON.parse(sql(retainedSql));save('before-upgrade.private.json',retained);
  guard(437,{empty:false});fs.copyFileSync(root+'supabase/migrations/'+migration,fixture+'/supabase/migrations/'+migration,fs.constants.COPYFILE_EXCL);
  save('upgrade-intent.json',{at:new Date().toISOString(),project,migration,sha256:sources[migration],consumed:true});
  await cli(['db','push','--local','--include-all','--yes'],'upgrade');guard(438,{empty:false});
  assert.deepEqual(JSON.parse(sql(retainedSql)),retained);assert.equal(sql("select count(*) from sets where search_code_lower is distinct from lower(code)"),'0');
  sql('select public.vendor_receipt_book_validate_v1(book,owner_id) from public.vendor_receipt_books');
  const after=JSON.parse(sql(snapshotSql));save('upgraded.private.json',after);
  const clean=JSON.parse(fs.readFileSync(out+'/full-438-v1/replayed.private.json'));assert.deepEqual(after.LEDGER,clean.LEDGER);
  const comparison=await compareSnapshots(after,clean,{output:fixture+'/parity'});
  save('upgrade-result.json',{status:'passed',at:new Date().toISOString(),migrations:438,project,retainedCopies:retained['public.vault_item_instances'].length,retainedReceiptBooks:retained['public.vendor_receipt_books'].length,retainedCostSnapshots:retained['public.vendor_sale_cost_snapshots'].length,retainedTables:retainedTables.length,modernReceiptSeed:modern,priorReceiptFormatValidated:true,allFixtureRowsUnchanged:true,comparison,productionWrites:0,resetsAfterPopulation:0});
}
console.log(JSON.stringify({status:'passed',mode,project,fixture,migrations:438}));
