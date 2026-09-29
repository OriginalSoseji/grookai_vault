// One-use full replay in a new synthetic project. Never resets existing labs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
assert.equal(process.argv.length,2);
const root='C:/gv_store_seller_link_20260928',project='grookai-seller-upgrade-20260929';
const out=root+'/.local/integration/seller-adoption-v1',fixture=out+'/upgrade-proof';
const container='supabase_db_'+project,relay=project+'-relay',subnet='10.249.163.0/24';
const hash=b=>createHash('sha256').update(b).digest('hex');
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
const baseline=JSON.parse(fs.readFileSync(out+'/baseline.json'));assert.equal(baseline.status,'passed');assert.equal(baseline.migrations,408);
assert.ok(Date.now()-Date.parse(baseline.at)<6*3600000);
const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'/supabase/migrations/'+n))]));
assert.equal(Object.keys(sources).length,409);
for(const [n,h]of Object.entries(baseline.sourceHashes))assert.equal(sources[n],h);
assert.deepEqual(Object.keys(sources).filter(n=>!baseline.sourceHashes[n]),['20260928213000_vendor_seller_adoption_v1.sql']);
assert.ok(!fs.existsSync(fixture),'Do not reuse a consumed replay intent');
assert.equal(docker('ps','-a','--filter','name='+project,'--format','{{.Names}}'),'');
assert.equal(docker('volume','ls','--filter','name='+project,'--format','{{.Name}}'),'');
assert.ok(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>4e9);
for(const port of [30621,30622,30624,30628,30640])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
for(const network of JSON.parse(docker('network','inspect',...docker('network','ls','-q').split(/\s+/))))for(const ip of network.IPAM.Config??[])assert.notEqual(ip.Subnet,subnet);
const prior='C:/gv_store_cart_20260927/.local/integration/store-cart-lab-v1';
const original=fs.readFileSync(prior+'/supabase/config.toml','utf8');
assert.equal(hash(original),JSON.parse(fs.readFileSync(prior+'/preparation.json')).configSha256);
const config=original.replaceAll('grookai-store-cart-20260927',project).replaceAll('298','306');
assert.ok(config.includes('max_worker_processes = 0'));assert.ok(!config.includes('ycdxbpibncqcchqiihfz'));
fs.mkdirSync(fixture+'/supabase/migrations',{recursive:true});fs.mkdirSync(fixture+'/supabase/.temp');
const candidate='20260928213000_vendor_seller_adoption_v1.sql';
for(const name of Object.keys(sources).filter(n=>n!==candidate))fs.copyFileSync(root+'/supabase/migrations/'+name,fixture+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
fs.writeFileSync(fixture+'/supabase/config.toml',config,{flag:'wx'});
fs.writeFileSync(fixture+'/supabase/.temp/postgres-version','17.6.1.113',{flag:'wx'});
const save=(name,value)=>fs.writeFileSync(fixture+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),project,container,relay,sourceHashes:sources,configSha256:hash(config),consumed:true});
const code=`import net from 'node:net';for(const [port,service,targetPort] of [[30622,'db',5432],[30621,'kong',8000],[30624,'inbucket',8025]]){net.createServer(source=>{const target=net.connect(targetPort,'supabase_'+service+'_${project}');source.on('error',()=>target.destroy());target.on('error',()=>source.destroy());source.on('close',()=>target.destroy());target.on('close',()=>source.destroy());source.pipe(target).pipe(source)}).listen(port,'0.0.0.0')}`;
fs.writeFileSync(fixture+'/relay.mjs',code,{flag:'wx'});
docker('network','create','--internal','--subnet',subnet,project);
docker('create','--name',relay,'--network','bridge',...([30621,30622,30624].flatMap(p=>['-p',`127.0.0.1:${p}:${p}`])),'node:22-bookworm-slim','node','/relay.mjs');
docker('cp',fixture+'/relay.mjs',relay+':/relay.mjs');docker('network','connect',project,relay);docker('start',relay);
const env={...process.env,DO_NOT_TRACK:'1'};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
function cli(args,label){const fd=fs.openSync(fixture+'/'+label+'.private.log','wx');let result;
 try{result=spawnSync('supabase',[...args,'--workdir',fixture,'--network-id',project],{env,stdio:['ignore',fd,fd],windowsHide:true,timeout:600000});}finally{fs.closeSync(fd);}
 assert.ifError(result.error);assert.equal(result.status,0,label+' failed; preserve consumed intent');}
function guard(){
 const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
 assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
 assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
 assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(sources).filter(n=>n!==candidate).map(n=>n.split('_')[0]).sort());
 assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from vendor_seller_accounts)||'|'||(select count(*) from card_prints)"),'0|0|0|0');
 assert.equal(sql('select onboarding_enabled::text from vendor_seller_rollout'),'false');
 assert.equal(sql('select orders_enabled::text from vendor_orders_rollout'),'false');
}
const fullDir=out+'/replay-409',full=JSON.parse(fs.readFileSync(fullDir+'/receipt.json'));
assert.equal(full.status,'passed');assert.deepEqual(full.sourceHashes,sources);
cli(['start','--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],'start-408');guard();
const controller=JSON.stringify({feesPayer:'account',paymentLosses:'stripe',requirementCollection:'stripe',dashboard:'full'});
for(const state of ['reserved','creating','bound','deauthorized','closing']){
 sql(`do $$declare u uuid:=gen_random_uuid();s uuid:=gen_random_uuid();begin
  insert into auth.users(id,email,email_confirmed_at) values(u,'upgrade-${state}@example.invalid',now());
  insert into vendor_stores(id,owner_id,slug,display_name) values(s,u,'upgrade-${state}','Retained synthetic ${state}');
  insert into vendor_seller_accounts(owner_id,store_id,stripe_account_id,livemode,controller,state,creation_started_at,connected_account_id,closeout_id,closeout_requested_at)
   values(u,s,'acct_upgradePlatform',false,'${controller}'::jsonb,'${state}',
    ${state==='reserved'?'null':'now()'},${['bound','deauthorized','closing'].includes(state)?"'acct_upgrade"+state+"'":'null'},
    ${state==='closing'?'gen_random_uuid()':'null'},${state==='closing'?'now()':'null'});
 end$$;`);
}
const retainedSql=`select jsonb_build_object('users',(select jsonb_agg(to_jsonb(u) order by id) from auth.users u),
 'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),
 'sellers',(select jsonb_agg(to_jsonb(a)-'adoption_grant_id'-'adoption_evidence' order by id) from vendor_seller_accounts a))`;
const before=JSON.parse(sql(retainedSql));save('retained-before.private.json',before);
fs.copyFileSync(root+'/supabase/migrations/'+candidate,fixture+'/supabase/migrations/'+candidate,fs.constants.COPYFILE_EXCL);
cli(['db','push','--local','--yes'],'upgrade-409');cli(['db','push','--local','--yes'],'push-noop');
assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(sources).map(n=>n.split('_')[0]).sort());
const after=JSON.parse(sql(retainedSql));assert.deepEqual(after,before);save('retained-after.private.json',after);
assert.equal(sql('select count(*) from vendor_seller_accounts where adoption_grant_id is not null or adoption_evidence is not null'),'0');
assert.equal(sql('select count(*) from vendor_seller_adoption_grants'),'0');
assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from cron.job_run_details)"),'0|0');
assert.equal(sql('select onboarding_enabled::text from vendor_seller_rollout'),'false');
assert.equal(sql('select orders_enabled::text from vendor_orders_rollout'),'false');
const upgraded=JSON.parse(sql(snapshotSql));save('upgraded.private.json',upgraded);
const pristine=JSON.parse(fs.readFileSync(fullDir+'/replayed.private.json'));
await compareSnapshots(upgraded,pristine,{reconcile:true,output:fixture+'/parity'});
const report={status:'passed',at:new Date().toISOString(),project,fromMigrations:408,toMigrations:409,
 schemaParity:true,retainedDataProof:true,retainedSellerStates:before.sellers.map(a=>a.state).sort(),sourceHashes:sources,productionWrites:0};
save('receipt.json',report);console.log(JSON.stringify({status:'passed',project,schemaParity:true,retainedDataProof:true,productionWrites:0}));
