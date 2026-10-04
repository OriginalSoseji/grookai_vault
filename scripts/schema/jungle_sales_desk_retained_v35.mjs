// One-use fresh417 baseline then retained-data upgrade to425. Never targets remote or resets populated labs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync,spawnSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const migration='20261002010000_jungle_slab_atomic_intake_v1.sql';
const pending=["20261001050000_jungle_edition_foundation_v1.sql","20261001203000_jungle_edition_price_reader_integration_v1.sql","20261001211000_jungle_edition_current_artifact_date_v1.sql","20261001213000_jungle_edition_artifact_date_lineage_v1.sql","20261001220000_jungle_edition_scoped_lineage_validation_v1.sql","20261001223000_jungle_edition_resolved_readiness_v1.sql","20261001224000_jungle_edition_search_v5_integration_v1.sql","20261002010000_jungle_slab_atomic_intake_v1.sql"];
const hash=b=>createHash('sha256').update(b).digest('hex');
const hashes=dir=>Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(path.join(dir,n)))]));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(process.argv.length,3);
const mode=process.argv[2];assert.equal(mode,'upgrade');
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_jungle_edition_20261001');
const port=mode==='full'?54000:54020,project=`jungle-edition-${mode}-425-v35-20261001`,fixture=out+'/'+mode+'-425-v35';
const relay=project+'-relay',container='supabase_db_'+project,subnet=mode==='full'?'10.248.27.0/24':'10.248.28.0/24';
const save=(name,value)=>fs.writeFileSync(fixture+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
const sources=hashes(root+'supabase/migrations');assert.equal(Object.keys(sources).length,425);
const baseline=JSON.parse(fs.readFileSync('C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/jungle-sales-desk-baseline-417-latest.json'));
assert.equal(baseline.status,'passed');assert.equal(baseline.migrations,417);assert.equal(baseline.productionWrites,0);
assert.ok(Date.now()-Date.parse(baseline.at)<6*3600000,'Fresh baseline required');
for(const [n,h]of Object.entries(baseline.sourceHashes))assert.equal(sources[n],h);
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
  assert.deepEqual(hashes(fixture+'/supabase/migrations'),Object.fromEntries(Object.entries(sources).filter(([n])=>count===425||!pending.includes(n))));
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
  assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(JSON.parse(docker('inspect',relay))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(sources).filter(n=>count===425||!pending.includes(n)).map(n=>n.split('_')[0]).sort());
  const state=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from card_prints),'copies',(select count(*) from vault_item_instances),'stores',(select count(*) from vendor_stores),'runs',(select count(*) from cron.job_run_details),'workers',current_setting('max_worker_processes'))"));
  assert.equal(state.workers,'0');assert.equal(state.runs,0);assert.equal(state.stores,0);
  if(empty){assert.equal(state.users,0);assert.equal(state.cards,0);assert.equal(state.copies,0);}
  assert.equal(sql('select app_enabled::text||web_enabled::text||custom_enabled::text from vendor_store_rollout'),'falsefalsefalse');
  assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
  assert.equal(sql('select enabled::text from vendor_sales_cart_control'),'false');
  assert.equal(sql('select enabled::text from vendor_receipt_cloud_control'),'false');
  return state;
}

const capacity=fs.statfsSync('C:/');const freeBytes=Number(capacity.bavail)*Number(capacity.bsize);
assert.ok(freeBytes>=10*1024**3,'At least 10 GiB host free required for bounded new lab; no cleanup/reset is authorized');
assert.ok(!fs.existsSync(fixture),'Never reuse a prior preparation/reset intent');
assert.equal(docker('ps','-a','--filter','name='+project,'--format','{{.Names}}'),'');
assert.equal(docker('volume','ls','--filter','name='+project,'--format','{{.Name}}'),'');
for(const p of [port,port+1,port+4,port+8])await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(p,'127.0.0.1',()=>server.close(resolve));});
for(const n of JSON.parse(docker('network','inspect',...docker('network','ls','-q').split(/\s+/))))for(const ip of n.IPAM.Config??[])assert.notEqual(ip.Subnet,subnet);
fs.mkdirSync(fixture+'/supabase/migrations',{recursive:true});fs.mkdirSync(fixture+'/supabase/.temp');
let config=fs.readFileSync('C:/grookai_vault_operator_artifacts/cosmos_pricing_support_20260930/full-411/supabase/config.toml','utf8').replaceAll('cosmos-pricing-full-411-20260930',project).replace(/6104([0-9])/g,(_,n)=>String(port+Number(n)));
fs.writeFileSync(fixture+'/supabase/config.toml',config,{flag:'wx'});
fs.writeFileSync(fixture+'/supabase/.temp/postgres-version','17.6.1.113',{flag:'wx'});
for(const name of Object.keys(sources))if(mode==='full'||!pending.includes(name))fs.copyFileSync(root+'supabase/migrations/'+name,fixture+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
save('freeze.json',{at:new Date().toISOString(),project,fixture,mode,sourceHashes:sources,configSha256:hash(config),baselineReceipt:baseline.output,scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url)))});
const relayCode=`import net from 'node:net';for(const [port,service,targetPort] of ${JSON.stringify([[port,'db',5432],[port+1,'kong',8000],[port+4,'inbucket',8025]])}){net.createServer(source=>{const target=net.connect(targetPort,'supabase_'+service+'_${project}');source.on('error',()=>target.destroy());target.on('error',()=>source.destroy());source.on('close',()=>target.destroy());target.on('close',()=>source.destroy());source.pipe(target).pipe(source)}).listen(port,'0.0.0.0')}`;
fs.writeFileSync(fixture+'/relay.mjs',relayCode,{flag:'wx'});
save('start-intent.json',{at:new Date().toISOString(),project,subnet,ports:[port,port+1,port+4],consumed:true});
docker('network','create','--internal','--subnet',subnet,project);
docker('create','--name',relay,'--network','bridge',...([port,port+1,port+4].flatMap(p=>['-p',`127.0.0.1:${p}:${p}`])),'node:22-bookworm-slim','node','/relay.mjs');
docker('cp',fixture+'/relay.mjs',relay+':/relay.mjs');docker('network','connect',project,relay);docker('start',relay);
cli(['start','--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],'start');
const initial=guard(mode==='full'?425:417);save('before-reset.json',initial);
save('reset-intent.json',{at:new Date().toISOString(),project,sourceHashes:sources,initial,consumed:true});
cli(['db','reset','--local','--no-seed','--yes'],'full-reset');guard(mode==='full'?425:417);
if(mode==='full'){
  cli(['db','push','--local','--yes'],'push-noop');
  save('replayed.private.json',JSON.parse(sql(snapshotSql)));
  save('replay-result.json',{status:'passed',at:new Date().toISOString(),fullReplay:true,noOpPush:true,migrations:425,project,productionWrites:0,retainedFixtureResets:0,state:guard(425)});
}

if(mode==='upgrade'){
  const beforeSchema=JSON.parse(sql(snapshotSql));save('baseline.private.json',beforeSchema);
  const qualified=JSON.parse(fs.readFileSync('C:/grookai_vault_operator_artifacts/sales_desk_pro_20261003/full-417-v1/replayed.private.json'));
  assert.deepEqual(beforeSchema.LEDGER,qualified.LEDGER);
  await compareSnapshots(beforeSchema,qualified,{output:fixture+'/baseline-parity'});
  const owner=randomUUID(),card=randomUUID(),set=randomUUID(),gvId='GV-PK-UPGRADE-'+randomUUID();
  const book={version:1,storeName:'Synthetic retained sales book',receipts:[],customers:[{id:randomUUID(),name:'Fixture customer',email:'fixture@example.invalid',phone:'',wants:'',notes:'Preserve across Jungle migration',updatedAt:new Date().toISOString()}]};
  save('seed-intent.json',{at:new Date().toISOString(),owner,card,set,consumed:true,synthetic:true});
  sql(`begin;
    insert into auth.users(id,aud,role,email) values('${owner}','authenticated','authenticated','${owner}@jungle-upgrade.invalid');
    insert into public.sets(id,code,name,game) values('${set}','${set}','Jungle retained upgrade fixture','pokemon');
    insert into public.card_prints(id,set_id,name,number,gv_id,game_id) values('${card}','${set}','Retained card','1','${gvId}',(select id from games where code='pokemon'));
    select public.admin_vault_instance_create_v1(p_user_id=>'${owner}'::uuid,p_card_print_id=>'${card}'::uuid,p_condition_label=>'LP');
    select public.admin_vault_instance_create_v1(p_user_id=>'${owner}'::uuid,p_card_print_id=>'${card}'::uuid,p_condition_label=>'NM');
    select vendor_receipt_book_validate_v1('${JSON.stringify(book)}'::jsonb,'${owner}'::uuid);
    insert into vendor_receipt_books(owner_id,revision,book) values('${owner}',1,'${JSON.stringify(book)}'::jsonb);
    commit;`);
  const tables=JSON.parse(sql("select json_agg(c.relname order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'"));
  for(const n of tables)assert.match(n,/^[a-z_][a-z0-9_]*$/);
  const fp=tables.map(n=>`select '${n}' table_name,count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public."${n}" t`).join(' union all ');
  const footprintSql='select json_agg(t order by table_name) from ('+fp+') t';
  const before=JSON.parse(sql(footprintSql));save('before-footprints.json',before);
  const retainedSql="select json_build_object('copies',(select json_agg(t order by id) from vault_item_instances t),'books',(select json_agg(t order by owner_id) from vendor_receipt_books t),'cards',(select json_agg(t order by id) from card_prints t))";
  const retained=JSON.parse(sql(retainedSql));save('before-retained.private.json',retained);
  assert.equal(retained.copies.length,2);assert.equal(retained.books.length,1);
  guard(417,{empty:false});
  save('upgrade-intent.json',{at:new Date().toISOString(),project,pending,sourceHashes:sources,consumed:true,productionWrites:0,resetsAfterPopulation:0});
  for(const name of pending)fs.copyFileSync(root+'supabase/migrations/'+name,fixture+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
  cli(['db','push','--local','--include-all','--yes'],'upgrade');
  cli(['db','push','--local','--yes'],'push-noop');guard(425,{empty:false});
  const after=JSON.parse(sql(footprintSql));save('after-footprints.json',after);assert.deepEqual(after,before);
  const afterRetained=JSON.parse(sql(retainedSql));save('after-retained.private.json',afterRetained);assert.deepEqual(afterRetained,retained);
  const schema=JSON.parse(sql(snapshotSql));save('upgraded.private.json',schema);
  const full=JSON.parse(fs.readFileSync(out+'/full-425-v35/replay-result.json'));assert.equal(full.status,'passed');assert.equal(full.fullReplay,true);assert.equal(full.noOpPush,true);
  const clean=JSON.parse(fs.readFileSync(out+'/full-425-v35/replayed.private.json'));assert.deepEqual(schema.LEDGER,clean.LEDGER);
  const comparison=await compareSnapshots(schema,clean,{output:fixture+'/combined-parity'});
  save('upgrade-result.json',{at:new Date().toISOString(),status:'passed',migrations:425,baselineMigrations:417,retainedCopies:2,retainedBooks:1,protectedPublicTables:tables.length,allExistingRowsUnchanged:true,noOpPush:true,comparison,resetsAfterPopulation:0,productionWrites:0,sourceHashes:sources,project});
}
console.log(JSON.stringify({status:'passed',mode,project,fixture,migrations:425}));
