// Real local Auth/Storage plus the shipped Edge handler and concurrent DB calls.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
const root='C:/gv_intake_release_20261028';assert.equal(process.cwd().replaceAll('\\','/'),root);
const base='C:/gv_intake_recovery_private_20261027/reviewed-intake-release-v1';
const work=base+'/local-date-fresh-479',project='reviewed-intake-date-fresh-479-20261028',db='supabase_db_'+project;
const resumed=process.argv[2]==='resume-v1';assert.ok(process.argv[2]===undefined||resumed);
const out=base+'/date-runtime-qualification-v1';assert.equal(fs.existsSync(out),resumed);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const sql=q=>execFileSync('docker',['exec','-i',db,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',timeout:60000,maxBuffer:8_000_000}).trim();
assert.equal(sql('select count(*) from auth.users'),resumed?'2':'0');assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'479');
assert.equal(sql('select count(*) from public.purchase_lots'),'0');
assert.equal(sql("select current_setting('max_worker_processes')"),'0');
const sha=b=>createHash('sha256').update(b).digest('hex');
const frozen=JSON.parse(fs.readFileSync(base+'/candidate-frozen.json'));
const dateFrozen=JSON.parse(fs.readFileSync(base+'/candidate-frozen-date-v1.json'));assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+dateFrozen.file)),dateFrozen.sha256);assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+frozen.migration)),frozen.sha256);
const cliEnv={...process.env};for(const key of Object.keys(cliEnv))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete cliEnv[key];
const credentials=JSON.parse(execFileSync('supabase',['status','--output','json','--workdir',work,'--network-id',project],{env:cliEnv,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const url='http://127.0.0.1:60601';assert.match(credentials.API_URL,/127\.0\.0\.1:60601/);
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const localSecret=localSupabaseStatusSecret(credentials);
const admin=createClient(url,localSecret,options),anon=()=>createClient(url,credentials.ANON_KEY,options);
const ok=r=>{if(r.error)throw Error(r.error.message);return r.data;};
if(!resumed)fs.mkdirSync(out);const save=(name,data)=>fs.writeFileSync(out+'/'+name,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
save(resumed?'resume-intent-v1.json':'intent.json',{at:new Date().toISOString(),project,localOnly:true,neverReset:true,sourceSha256:frozen.sha256});
const stored=resumed?JSON.parse(fs.readFileSync(out+'/accounts-private.json')):null;
const password=stored?.password??randomBytes(32).toString('base64url'),users=[];
for(const name of ['owner','peer']){
  const email=`reviewed-intake-runtime-${name}-20261028@local.test`;
  const user=resumed?stored.users.find(u=>u.name===name):ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
  const client=anon();const session=ok(await client.auth.signInWithPassword({email,password})).session;
  assert.equal(ok(await client.auth.getUser()).user.id,user.id);users.push({name,id:user.id,email,client,token:session.access_token});
}
if(!resumed)save('accounts-private.json',{password,users:users.map(({client,...u})=>u)});
const [owner,peer]=users;
const hostFile=out+'/local-edge-host.ts';
if(!resumed)fs.writeFileSync(hostFile,`import {createIntakeHandler} from '${pathToFileURL(root+'/supabase/functions/vault-intake-v1/handler.ts')}';\nimport {requireUser,createServiceRoleClient} from '${pathToFileURL(root+'/supabase/functions/_shared/auth.ts')}';\nDeno.serve({hostname:'127.0.0.1',port:60609},createIntakeHandler({requireUser,createServiceRoleClient}));\n`,{flag:'wx'});
const childEnv=Object.fromEntries(['PATH','SystemRoot','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','DENO_DIR'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
Object.assign(childEnv,{SUPABASE_URL:url,SUPABASE_SECRET_KEY:localSecret});
const log=fs.openSync(out+(resumed?'/edge-runtime-resume-v1.log':'/edge-runtime.log'),'wx');
const server=spawn('C:/Users/ccabr/scoop/shims/deno.exe',['run','--no-prompt','--cached-only','--allow-net=127.0.0.1:60601,127.0.0.1:60609','--allow-env','--allow-read='+root+','+out,hostFile],{env:childEnv,windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
const endpoint='http://127.0.0.1:60609';const tests=[];
async function request(user,action,payload,extra={}){
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',...(user?{authorization:'Bearer '+user.token}:{})},body:JSON.stringify({action,payload,...extra}),signal:AbortSignal.timeout(30000)});
  assert.equal(response.headers.get('cache-control'),'no-store');return {status:response.status,body:await response.json()};
}
async function success(user,action,payload,extra){const r=await request(user,action,payload,extra);assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.ok,true);return r.body.result;}
try{
  let ready=false;for(let n=0;n<200;n++){try{const r=await fetch(endpoint,{method:'OPTIONS',signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Real Edge handler failed to start; inspect private runtime log');
  assert.equal((await request(null,'lots.list',{})).status,401);
  assert.equal((await request({token:'invalid'},'lots.list',{})).status,401);tests.push('real_auth_rejects_missing_and_invalid_tokens');
  const card=sql("select id from public.card_prints where set_code='pgo' and number='1' limit 1");
  const lotId=randomUUID();const lotPayload={id:lotId,name:'Runtime private lot',purchased_on:'2026-10-27',currency:'USD',total_cost_cents:10000};
  const disabled=await request(owner,'lot.save',lotPayload);assert.equal(disabled.status,503);assert.equal(disabled.body.error,'intake_service_unavailable');
  assert.equal(sql(`select status from public.vault_intake_operations_v1 where id='${disabled.body.operation_id}'`),'failed');tests.push('default_off_failure_durable_in_independent_connection');
  const control=ok(await admin.rpc('collector_intake_set_control_v1',{p_expected_revision:1,p_enabled:false,p_canary_actor_ids:[owner.id]}));assert.equal(control.ok,true);
  const lot=await success(owner,'lot.save',lotPayload,{user_id:peer.id,p_actor_user_id:peer.id});assert.equal(lot.user_id,owner.id);
  assert.equal((await request(peer,'lot.detail',{lot_id:lotId})).status,404);assert.deepEqual(await success(peer,'lots.list',{}),[]);
  const forbidden=await owner.client.rpc('vault_intake_request_v1',{p_actor_user_id:owner.id,p_action:'lots.list',p_payload:{}});assert.ok(forbidden.error);
  const leaked=await peer.client.from('purchase_lots').select('*');assert.ok(leaked.error||leaked.data.length===0);tests.push('verified_actor_ignores_spoof_and_real_roles_deny_private_access');
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1kAAAAASUVORK5CYII=','base64'),photo=owner.id+'/'+randomUUID()+'/front.png';
  ok(await owner.client.storage.from('vault-intake-private').upload(photo,image,{contentType:'image/png'}));
  const downloaded=ok(await owner.client.storage.from('vault-intake-private').download(photo));assert.equal(sha(Buffer.from(await downloaded.arrayBuffer())),sha(image));
  assert.ok((await peer.client.storage.from('vault-intake-private').download(photo)).error);
  assert.ok((await peer.client.storage.from('vault-intake-private').upload(owner.id+'/peer.png',image,{contentType:'image/png'})).error);
  assert.ok((await anon().storage.from('vault-intake-private').download(photo)).error);
  assert.ok((await owner.client.storage.from('vault-intake-private').upload(owner.id+'/bad.txt',Buffer.from('private'),{contentType:'text/plain'})).error);tests.push('real_private_storage_owner_bytes_peer_anon_mime_boundaries');
  const batch=randomUUID(),item=randomUUID();
  const saved=await success(owner,'batch.save',{id:batch,lot_id:lotId,title:'Concurrent partial review',currency:'USD',acquired_on:'2026-10-27',snapshot:{allocation_reviewed:true,items:[{id:item,state:'confirmed',card_id:card,quantity:2,condition:'Unspecified',copy_costs_cents:[1000,1001],allocation:{lot_revision:lot.revision}},{id:randomUUID(),card_id:card,quantity:1}]}});
  const commits=await Promise.all(Array.from({length:4},()=>success(owner,'batch.commit',{id:batch,revision:saved.revision})));
  for(const r of commits)assert.deepEqual(r,commits[0]);assert.equal(commits[0].batch.state,'partial');assert.equal(sql(`select count(*) from public.vault_item_instances where user_id='${owner.id}'`),'2');
  const freshClient=anon();const freshSession=ok(await freshClient.auth.signInWithPassword({email:owner.email,password})).session;
  const recovered=await success({token:freshSession.access_token},'batch.commit',{id:batch,revision:saved.revision});assert.deepEqual(recovered,commits[0]);tests.push('four_concurrent_partial_commits_and_new_session_retry_share_exact_ids');
  const badBatch=randomUUID(),before=sql(`select count(*) from public.vault_item_instances where user_id='${owner.id}'`);
  const badSaved=await success(owner,'batch.save',{id:badBatch,title:'Atomic runtime failure',currency:'USD',acquired_on:'2026-10-27',snapshot:{items:[{id:'11111111-1111-4111-8111-111111111111',state:'confirmed',card_id:card,quantity:1},{id:'ffffffff-ffff-4fff-8fff-ffffffffffff',state:'confirmed',card_id:randomUUID(),quantity:1,notes:'Private note absent from operation diagnostic'}]}});
  const failed=await request(owner,'batch.commit',{id:badBatch,revision:badSaved.revision});assert.notEqual(failed.status,200);
  assert.equal(sql(`select count(*) from public.vault_item_instances where user_id='${owner.id}'`),before);
  const operation=JSON.parse(sql(`select to_jsonb(v) from public.vault_intake_operations_v1 v where id='${failed.body.operation_id}'`));assert.equal(operation.status,'failed');assert.ok(!JSON.stringify(operation).includes('Private note'));tests.push('committed_failure_record_survives_atomic_copy_rollback');
  const requestId=randomUUID(),copy=commits[0].saved_items[0].instance_ids[0],salePayload={request_id:requestId,instance_id:copy,amount:50,expenses:4,currency:'USD',sold_on:'2026-10-27'};
  const sales=await Promise.all(Array.from({length:4},()=>success(owner,'sale.record',salePayload)));
  for(const sale of sales)assert.deepEqual(sale,sales[0]);assert.equal(sql(`select count(*) from public.vault_intake_sales_v1 where request_id='${requestId}'`),'1');
  assert.equal((await request(owner,'sale.record',{...salePayload,amount:51})).status,409);tests.push('four_concurrent_sales_one_disposition_and_conflicting_reuse_rejected');
  const raceLot=await success(owner,'lot.save',{id:randomUUID(),name:'Competing reserve',purchased_on:'2026-10-27',currency:'USD',total_cost_cents:100});const batches=[];
  for(let n=0;n<2;n++)batches.push(await success(owner,'batch.save',{id:randomUUID(),lot_id:raceLot.id,title:'Competing reviewed batch '+n,currency:'USD',acquired_on:'2026-10-27',snapshot:{allocation_reviewed:true,items:[{id:randomUUID(),state:'confirmed',card_id:card,quantity:1,copy_costs_cents:[80],allocation:{lot_revision:raceLot.revision}}]}}));
  const race=await Promise.all(batches.map(b=>request(owner,'batch.commit',{id:b.id,revision:b.revision})));assert.equal(race.filter(r=>r.status===200).length,1);assert.equal(race.filter(r=>r.status===409).length,1);
  const raceDetail=await success(owner,'lot.detail',{lot_id:raceLot.id});assert.equal(raceDetail.copies.length,1);assert.equal(raceDetail.lot.reserve_cents,20);tests.push('competing_stale_allocations_cannot_spend_reserve_twice');
  for(const example of [
    {name:'denver',day:'2020-01-15',instant:'2020-01-15T07:00:00.000Z',offset:-420},
    {name:'kiritimati',day:'2020-01-15',instant:'2020-01-14T10:00:00.000Z',offset:840},
    {name:'kolkata',day:'2020-01-15',instant:'2020-01-14T18:30:00.000Z',offset:330},
    {name:'dst_midnight',day:'2018-11-04',instant:'2018-11-04T03:00:00.000Z',offset:-120},
  ]){
    const dateBatch=await success(owner,'batch.save',{id:randomUUID(),title:'Acquisition date runtime '+example.name,currency:'USD',acquired_on:example.day,snapshot:{acquired_at:example.instant,acquired_utc_offset_minutes:example.offset,items:[{id:randomUUID(),state:'confirmed',card_id:card,quantity:1,copy_costs_cents:[123]}]}});
    const dateReceipt=await success(owner,'batch.commit',{id:dateBatch.id,revision:dateBatch.revision});
    const dateCopy=dateReceipt.saved_items[0].instance_ids[0];
    const dateRow=ok(await owner.client.from('vault_item_instances').select('acquisition_date,acquired_on').eq('id',dateCopy).single());assert.equal(new Date(dateRow.acquisition_date).toISOString(),example.instant);assert.equal(dateRow.acquired_on,example.day);
    const from=new Date(Date.parse(example.instant)-1).toISOString(),to=new Date(Date.parse(example.instant)+86400000).toISOString();
    const period=ok(await owner.client.rpc('inventory_card_profitability_read_v2',{p_from:from,p_to:to,p_date_basis:'acquired'}));assert.ok(period.items.some(v=>v.instanceId===dateCopy));
    const savedPeriod=ok(await owner.client.rpc('inventory_card_profitability_read_v2',{p_from:'2026-10-01T00:00:00Z',p_to:'2026-11-01T00:00:00Z',p_date_basis:'acquired'}));assert.ok(!savedPeriod.items.some(v=>v.instanceId===dateCopy));
    assert.deepEqual(await success(owner,'batch.commit',{id:dateBatch.id,revision:dateBatch.revision}),dateReceipt);tests.push('historical_acquisition_date_'+example.name);
  }
  const invalidDateBatch=await success(owner,'batch.save',{id:randomUUID(),title:'Invalid acquisition boundary',currency:'USD',acquired_on:'2020-01-15',snapshot:{acquired_at:'2020-01-15T00:00:00.000Z',acquired_utc_offset_minutes:-420,items:[{id:randomUUID(),state:'confirmed',card_id:card,quantity:1}]}});
  const dateCount=ok(await admin.from('vault_item_instances').select('id').eq('user_id',owner.id)).length;
  const invalidDate=await request(owner,'batch.commit',{id:invalidDateBatch.id,revision:invalidDateBatch.revision});assert.equal(invalidDate.status,422);assert.equal(invalidDate.body.error,'invalid_payload');
  assert.equal(ok(await admin.from('vault_item_instances').select('id').eq('user_id',owner.id)).length,dateCount);
  assert.equal(ok(await admin.from('vault_intake_operations_v1').select('status').eq('id',invalidDate.body.operation_id).single()).status,'failed');
  assert.ok((await owner.client.rpc('vault_intake_acquisition_instant_v1',{p_acquired_on:'2020-01-15',p_snapshot:{}})).error);tests.push('invalid_acquisition_is_atomic_audited_and_helper_is_private');
  const paused=ok(await admin.rpc('collector_intake_set_control_v1',{p_expected_revision:2,p_enabled:false,p_canary_actor_ids:[]}));assert.equal(paused.ok,true);
  assert.equal((await request(owner,'sale.record',{...salePayload,request_id:randomUUID()})).status,503);assert.ok((await success(owner,'batch.get',{id:batch})).id);tests.push('audited_pause_stops_writes_and_preserves_owner_recovery_reads');
  const report={at:new Date().toISOString(),pass:true,tests,sourceSha256:frozen.sha256,dateSourceSha256:dateFrozen.sha256,actualShippedHandler:true,actualSharedAuth:true,realGoTrueAndStorage:true,crossConnectionDurability:true,concurrency:true,productionWrites:0,writesOffAfter:true};
  save('result.json',report);fs.writeFileSync(root+'/docs/audits/reviewed_intake_date_release_20261028/runtime-qualification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,tests:tests.length,realAuthStorageAndConcurrency:true,productionWrites:0}));
}finally{server.kill();}
