// Real isolated Auth/PostgREST, committed concurrent saves, and response loss.
// Synthetic catalog/certificates only. Never reset/reseed any retained fixture.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const project='jungle-edition-full-422-v25-20261001',fixture=base+'/full-422-v25';
const out=base+'/slab-committed-v1',container='supabase_db_'+project;
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),'c:/gv_jungle_edition_20261001');
assert.ok(!fs.existsSync(out),'One-use test intent must not be replayed');
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(fixture+'/freeze.json'),replay=read(fixture+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,422);assert.equal(replay.fullReplay,true);assert.equal(replay.noOpPush,true);
assert.equal(read(base+'/slab-replay-parity-v2/receipt.json').status,'passed');
for(const [name,h]of Object.entries(freeze.sourceHashes))assert.equal(sha(fs.readFileSync('supabase/migrations/'+name)),h,name);
assert.equal(sha(fs.readFileSync(fixture+'/supabase/config.toml')),freeze.configSha256);assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:2*1024*1024});
const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const address=db.NetworkSettings.Networks[project].IPAddress;assert.match(address,/^10\.248\.19\.[2-9][0-9]*$/);
const relay=JSON.parse(docker('inspect',project+'-relay'))[0];assert.equal(relay.State.Running,true);
for(const bindings of Object.values(relay.HostConfig.PortBindings))for(const b of bindings)assert.equal(b.HostIp,'127.0.0.1');
assert.equal(docker('exec',project+'-relay','cat','/relay.mjs').trim(),fs.readFileSync(fixture+'/relay.mjs','utf8').trim());
const dbConfig={host:'127.0.0.1',port:53200,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:10000,statement_timeout:30000};
const c=new pg.Client(dbConfig);await c.connect();
const q=async(sql,args)=>(await c.query(sql,args)).rows;
const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations,(select count(*)::int from auth.users) users,(select count(*)::int from card_prints) cards,(select count(*)::int from vault_item_instances) copies"))[0];
assert.deepEqual(state,{address,workers:'0',migrations:422,users:0,cards:0,copies:0});
const env={...process.env};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
const status=JSON.parse(execFileSync('supabase',['status','--output','json','--workdir',fixture,'--network-id',project],{env,encoding:'utf8',windowsHide:true,timeout:20000,stdio:['ignore','pipe','pipe']}));
assert.equal(status.API_URL,'http://127.0.0.1:53201');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(status.API_URL,localSupabaseStatusSecret(status),options),anon=createClient(status.API_URL,status.ANON_KEY,options);
const ids=Object.fromEntries(['set','legacy','first','unlimited','firstChild','unlimitedChild'].map(k=>[k,randomUUID()]));
fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),project,ids,synthetic:true,consumed:true,productionWrites:0,sourceSha256:sha(fs.readFileSync(new URL(import.meta.url)))});
const tests=[],pass=name=>{tests.push(name);console.log(JSON.stringify({passed:tests.length,last:name}));};
const rpc='admin_jungle_slab_intake_v1';
const payload=cert=>({PSACert:{CertNumber:cert,Year:'1999',Brand:'POKEMON JUNGLE',Category:'TCG CARDS',CardNumber:'1',Subject:'Clefable',Variety:'1ST EDITION HOLO',CardGrade:'MINT 9',GradeDescription:'MINT 9',IsPSADNA:false,IsDualCert:false,ItemStatus:null}});
const args=(user,cert,request=randomUUID())=>({p_user_id:user,p_request_id:request,p_card_print_id:ids.first,p_card_printing_id:ids.firstChild,p_cert_number:cert,p_grade:9,p_provider_payload:payload(cert)});
const counts=async()=> (await q("select (select count(*)::int from jungle_slab_intake_receipts_v1) receipts,(select count(*)::int from slab_certs) certs,(select count(*)::int from vault_item_instances) copies,(select count(*)::int from vault_items) anchors,(select count(*)::int from slab_provenance_events where event_source='psa:jungle-intake-v1') events"))[0];
const invoke=async a=>{const r=await admin.rpc(rpc,a);assert.ifError(r.error);return r.data;};
// Hold the exact production owner/cert lock until every HTTP transaction is
// demonstrably waiting. This establishes actual overlap, not Promise timing.
async function overlap(inputs,kind,key){
 const lock=new pg.Client(dbConfig);await lock.connect();let pending=[];
 try{
  await lock.query('begin');await lock.query('select pg_advisory_xact_lock(hashtextextended($1,0))',['jungle-slab-'+kind+':'+key]);
  pending=inputs.map(a=>admin.rpc(rpc,a).then(r=>r));
  let waiting=0;
  for(let i=0;i<100;i++){waiting=(await q("select count(*)::int n from pg_stat_activity where datname='postgres' and wait_event='advisory' and query like '%admin_jungle_slab_intake_v1%'")).at(0).n;if(waiting>=inputs.length)break;await new Promise(r=>setTimeout(r,50));}
  assert.ok(waiting>=inputs.length,'All actual HTTP transactions must overlap at the advisory lock');
  await lock.query('commit');const result=await Promise.all(pending);save('overlap-'+tests.length+'.json',{kind,requests:inputs.length,observedWaiting:waiting});return result;
 }finally{await lock.query('rollback').catch(()=>{});await lock.end();await Promise.allSettled(pending);}
}
try{
 const before=(await c.query(snapshotSql)).find(r=>r.rows?.[0]?.receipt).rows[0].receipt;save('before-schema.private.json',before);
 await c.query('begin');
 await c.query("insert into sets(id,code,name,game) values($1,'base2','Jungle','pokemon')",[ids.set]);
 for(const [key,gv,modifier]of [['legacy','GV-PK-JU-1',null],['first','GV-PK-JU-1-FIRST-EDITION','edition:first_edition'],['unlimited','GV-PK-JU-1-UNLIMITED','edition:unlimited']])await c.query("insert into card_prints(id,set_id,set_code,name,number,gv_id,game_id,identity_domain,set_identity_model,variant_key,printed_identity_modifier) select $1,$2,'base2','Clefable','1',$3,id,'pokemon_eng_standard','standard','',$4 from games where code='pokemon'",[ids[key],ids.set,gv,modifier]);
 const manifest='b'.repeat(64);
 for(const [key,edition,gv]of [['first','first_edition','GV-PK-JU-1-FIRST-EDITION'],['unlimited','unlimited','GV-PK-JU-1-UNLIMITED']]){
  const child=ids[key+'Child'];
  await c.query("insert into card_printings(id,card_print_id,finish_key,printing_gv_id,is_provisional,provenance_source,provenance_ref) values($1,$2,'holo',$3,false,'MASTER_INDEX_ADDITIVE_PRINTING_REPAIR_V1',$4)",[child,ids[key],gv+'-HOLO','master-index:'+manifest]);
  await c.query("insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason,expected_finish_keys,source_report_path,evidence) values($1,'verified','visible','synthetic committed concurrency fixture',array['holo'],$2,$3)",[child,'master-index:'+manifest,{manifest_fingerprint:manifest,card_print_id:ids[key],finish_key:'holo',review_sha256:'d'.repeat(64)}]);
  await c.query("insert into jungle_edition_identity_links_v1(legacy_card_print_id,card_print_id,card_printing_id,edition,finish_key,state,manifest_sha256,review_ref) values($1,$2,$3,$4,'holo','active',$5,'synthetic-committed-proof')",[ids.legacy,ids[key],child,edition,manifest]);
 }
 await c.query('commit');pass('Synthetic fixture committed only into the previously empty qualified422 lab');
 const users=[];
 for(let i=0;i<2;i++){
  const email=randomUUID()+'@jungle-committed.invalid',password=randomUUID()+'aA!8';
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);
  const client=createClient(status.API_URL,status.ANON_KEY,options),login=await client.auth.signInWithPassword({email,password});assert.ifError(login.error);assert.equal(login.data.user.id,created.data.user.id);
  users.push({id:created.data.user.id,client,email,password,session:login.data.session});
 }
 save('users.private.json',users.map(({client,...u})=>u));pass('Two distinct users created and signed in through real local Auth');
 const a=args(users[0].id,'0009902001');
 for(const [name,client]of [['anonymous',anon],['owner',users[0].client],['other user',users[1].client]]){
  const r=await client.rpc(rpc,a);assert.ok(r.error);assert.match(r.error.message,/permission denied/);pass(name+' cannot invoke the service-only writer');
  const hidden=await client.from('jungle_slab_intake_receipts_v1').select('*');assert.ok(hidden.error);pass(name+' cannot read private receipts');
 }
 assert.deepEqual(await counts(),{receipts:0,certs:0,copies:0,anchors:0,events:0});
 const resolution=await users[0].client.rpc('get_jungle_edition_resolution_v1',{p_card_print_id:ids.first});assert.ifError(resolution.error);assert.equal(resolution.data.status,'ready');pass('Signed-in exact edition resolution is ready');
 const concurrent=await overlap(Array.from({length:6},()=>a),'owner',users[0].id);
 for(const r of concurrent)assert.ifError(r.error);
 assert.equal(new Set(concurrent.map(r=>r.data.instance_id)).size,1);assert.equal(concurrent.filter(r=>!r.data.replayed).length,1);
 assert.deepEqual(await counts(),{receipts:1,certs:1,copies:1,anchors:1,events:1});pass('Six overlapping same-key HTTP saves commit exactly one copy and provenance event');
 const first=concurrent[0].data,existing=await counts(),retry=await invoke(a);assert.equal(retry.instance_id,first.instance_id);assert.equal(retry.replayed,true);assert.deepEqual(await counts(),existing);pass('Committed retry returns original IDs without allocating more rows');
 const different=await overlap([args(users[0].id,'0009902002'),args(users[0].id,'0009902002')],'owner',users[0].id);
 assert.equal(different.filter(r=>!r.error).length,1);assert.match(different.find(r=>r.error).error.message,/ALREADY_OWNED/);pass('Overlapping different keys for one owner/certificate create one copy');
 const shared=await overlap([args(users[0].id,'0009902003'),args(users[1].id,'0009902003')],'cert','0009902003');for(const r of shared)assert.ifError(r.error);
 assert.equal(shared[0].data.slab_cert_id,shared[1].data.slab_cert_id);assert.notEqual(shared[0].data.instance_id,shared[1].data.instance_id);pass('Different owners share certificate identity without sharing owned copies');
 const lostArgs=args(users[0].id,'0009902004');
 let received=false;
 const responseLoss=createClient(status.API_URL,localSupabaseStatusSecret(status),{...options,global:{fetch:async(input,init)=>{const response=await fetch(input,init);if(String(input).endsWith('/rpc/'+rpc)){assert.equal(response.status,200);await response.arrayBuffer();received=true;throw new TypeError('Synthetic loss after committed HTTP response');}return response;}}});
 const lost=await responseLoss.rpc(rpc,lostArgs);assert.ok(lost.error);assert.equal(received,true);const committed=await counts();
 const recovered=await invoke(lostArgs);assert.equal(recovered.replayed,true);assert.deepEqual(await counts(),committed);pass('Lost committed HTTP response recovers exact original save on retry');
 const conflict=structuredClone(a);conflict.p_provider_payload.extra='changed';const bad=await admin.rpc(rpc,conflict);assert.match(bad.error?.message,/RETRY_CONFLICT/);assert.deepEqual(await counts(),committed);pass('Same-key altered observation rejects without partial writes');
 const ownerRows=await users[0].client.from('vault_item_instances').select('id,user_id');assert.ifError(ownerRows.error);assert.equal(ownerRows.data.length,4);assert.ok(ownerRows.data.every(r=>r.user_id===users[0].id));
 const otherRows=await users[1].client.from('vault_item_instances').select('id,user_id');assert.ifError(otherRows.error);assert.equal(otherRows.data.length,1);assert.ok(otherRows.data.every(r=>r.user_id===users[1].id));pass('Real authenticated RLS isolates each owner after committed saves');
 await c.query('update vault_item_instances set archived_at=now() where id=$1',[first.instance_id]);const archived=await admin.rpc(rpc,a);assert.match(archived.error?.message,/RETRY_STATE_CHANGED/);assert.deepEqual(await counts(),committed);pass('Archived committed retry cannot revive or replace a copy');
 const final=await counts();assert.deepEqual(final,{receipts:5,certs:4,copies:5,anchors:5,events:5});
 const after=(await c.query(snapshotSql)).find(r=>r.rows?.[0]?.receipt).rows[0].receipt;save('after-schema.private.json',after);assert.deepEqual(after.LEDGER,before.LEDGER);
 const comparison=await compareSnapshots(before,after,{output:out+'/schema-comparison'});
 save('receipt.json',{at:new Date().toISOString(),status:'passed',project,tests,checks:tests.length,counts:final,ids,owners:users.map(u=>u.id),schemaComparison:comparison,realAuth:true,realPostgREST:true,concurrencyObserved:true,committedResponseLoss:true,provider:'synthetic fixtures; no real PSA calls',browserUiTested:false,productionWrites:0,retainedFixtureResets:0});
 console.log(JSON.stringify({status:'passed',checks:tests.length,counts:final,out}));
}catch(e){await c.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack});throw e;}finally{await c.end();}
