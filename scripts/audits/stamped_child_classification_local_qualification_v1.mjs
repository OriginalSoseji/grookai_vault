// Synthetic-owner PostgreSQL17 proof. No production connection or Storage access.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import pg from 'pg';

const attempt=process.argv[2];assert.match(attempt??'',/^r[1-9][0-9]*$/);
const out='/artifacts/stamped-child-classification-local-qualification-'+attempt;
assert.equal(fs.existsSync(out),false);fs.mkdirSync(out,{recursive:true});
const read=file=>JSON.parse(file.endsWith('.gz')?gunzipSync(fs.readFileSync(file)):fs.readFileSync(file,'utf8'));
const write=(file,data)=>fs.writeFileSync(out+'/'+file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
for(const key of Object.keys(process.env))if(/SUPABASE|DATABASE|^PG|TOKEN|SECRET|API_KEY/.test(key))delete process.env[key];
const {stampedChildImageManifestV1:manifest,stampedChildImageIntakeKeysV1}=await import('../../backend/warehouse/stamped_child_image_intake_v1.mjs');
const {printingManifestHash:hash}=await import('../../backend/catalog/printing_completeness_gate_v1.mjs');
const local=await import('../../backend/warehouse/stamped_child_classification_local_v1.mjs');
const {runClassificationWorkerV1}=await import('../../backend/warehouse/classification_worker_v1.mjs');
const source=local.stampedChildClassificationLocalCodeBindingV1();
const report={version:'STAMPED_CHILD_CLASSIFICATION_LOCAL_QUALIFICATION_V1',startedAt:new Date().toISOString(),pass:false,productionWrites:0,productionStorageWrites:0,realAccountsCopied:0,sourceFingerprint:source.fingerprint,sourceFiles:source.files.length,databases:[],cases:[],allStampedProgramComplete:false};
const database='stamped_child_classification_33_qualification_'+attempt;
const root='/work',qi=s=>{assert.match(s,/^[a-z_][a-z0-9_]*$/);return '"'+s+'"';};
const connect=async db=>{
 assert.ok(db==='postgres'||new RegExp('^'+database+'(_commit_loss|_legacy)?$').test(db));
 const c=new pg.Client({host:'127.0.0.1',port:5432,database:db,user:'postgres',password:process.env.LOCAL_FIXTURE_PASSWORD,connectionTimeoutMillis:15000,statement_timeout:45000,application_name:'stamped_child_classification_owned_qualification_v1'});await c.connect();return c;
};
let admin,client,audit,adversary;
const plans=read('/artifacts/stamped-classification-draft-plan-v1.private.json.gz').plans;
const observed=read('/artifacts/stamped-child-image-intake-preparation-v5/plan.private.json.gz');
const same=(a,b,message)=>assert.equal(hash(a),hash(b),message);
const tables=['raw_imports','canon_warehouse_candidates','canon_warehouse_candidate_evidence','canon_warehouse_candidate_events','card_prints','card_printings','card_print_identity','owned_fixture_copies','contract_violations'];
async function snapshot(c,{excludeLedger=false}={}){
 const result={};for(const table of tables.filter(t=>!excludeLedger||t!=='contract_violations'))result[table]=(await c.query('select to_jsonb(t) row from public.'+qi(table)+' t order by id')).rows.map(x=>x.row);return result;
}
async function fixture(db){
 assert.equal((await admin.query('select count(*)::int n from pg_database where datname=$1',[db])).rows[0].n,0,'Retain every prior fixture');
 assert.equal((await admin.query("select count(*)::int n from pg_stat_activity where datname='stamped_child_image_intake_33_qualification_r4'")).rows[0].n,0,'Retained template must be inactive');
 await admin.query('create database '+qi(db)+' template stamped_child_image_intake_33_qualification_r4');report.databases.push(db);
 const c=await connect(db);
 try{
  await c.query('alter table public.card_prints add column set_id uuid,add column rarity text,add column image_alt_url text,add column tcgplayer_id text,add column print_identity_key text');
  for(const target of manifest.targets){
   const p=observed.before.parents.find(x=>x.id===target.parentId);assert.ok(p);
   await c.query('update public.card_prints set set_id=$2,rarity=$3,tcgplayer_id=$4,print_identity_key=$5 where id=$1',[p.id,p.set_id,p.rarity,p.tcgplayer_id,p.print_identity_key]);
  }
  const occupants=[...new Map(plans.flatMap(x=>x.identity_audit_package.slot_occupancy.slot_rows).map(x=>[x.id,x])).values()];
  for(const p of occupants){
   if((await c.query('select id from public.card_prints where id=$1',[p.id])).rows.length)continue;
   await c.query('insert into public.card_prints(id,gv_id,name,number,number_plain,set_code,variant_key,set_id,tcgplayer_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[p.id,p.gv_id,p.name,p.number,p.number_plain,p.set_code,p.variant_key,p.set_id,p.tcgplayer_id]);
  }
  // Auxiliary search fixture; actual production search already passed33 read-only probes.
  await c.query(`create function public.search_card_prints_v1(q text,set_code_in text,number_in text,limit_in integer,offset_in integer)
    returns table(id uuid,name text,set_code text,number text,number_digits text,rarity text,image_url text)
    language sql stable as $$ select p.id,p.name,p.set_code,p.number,p.number_plain,p.rarity,p.image_url
    from public.card_prints p where (q is null or lower(p.name)=lower(q))
    and(set_code_in is null or lower(p.set_code)=lower(set_code_in))
    and(number_in is null or ltrim(p.number_plain,'0')=ltrim(number_in,'0'))
    order by p.id limit limit_in offset offset_in $$`);
  report.fixtureSearch='Synthetic exact-coordinate SQL surface; not production search qualification. Exact GVID and real identity-slot code select the target.';
  const sentinel=randomUUID(),base=(await c.query('select to_jsonb(t) row from public.canon_warehouse_candidates t order by id limit 1')).rows[0].row;
  const columns=['id','submitted_by_user_id','intake_channel','submission_type','submission_intent','state','notes','claimed_identity_payload','reference_hints_payload'];
  const sentinelRow={...base,id:sentinel,notes:'Unrelated synthetic RAW candidate must remain exact'};
  await c.query('insert into public.canon_warehouse_candidates('+columns.map(qi).join(',')+') values('+columns.map((_,i)=>'$'+(i+1)).join(',')+')',columns.map(k=>sentinelRow[k]&&typeof sentinelRow[k]==='object'?JSON.stringify(sentinelRow[k]):sentinelRow[k]));
  assert.equal((await c.query('select count(*)::int n from public.owned_fixture_copies')).rows[0].n,66);
  assert.equal((await c.query('select count(*)::int n from auth.users')).rows[0].n,1);
  assert.equal((await c.query('select email from auth.users')).rows[0].email,'synthetic-owner@example.invalid');
  return {client:c,sentinel};
 }catch(error){await c.end();throw error;}
}

try{
 admin=await connect('postgres');report.postgres=(await admin.query("select current_setting('server_version') version")).rows[0].version;
 const own=await fixture(database);client=own.client;audit=await connect(database);adversary=await connect(database);
 const initial=await snapshot(client);let plan=await local.prepareStampedClassificationLocalV1(client);
 write('plan.local.private.json',plan);plan=read(out+'/plan.local.private.json');
 same(await snapshot(client),initial,'Read-only preparation mutated the fixture');
 report.cases.push('actual33_readonly_preparation_exact_targets_and_serialized_plan_roundtrip');
 const rollback=await local.executeStampedClassificationLocalV1({client,auditClient:audit,plan,mode:'rollback'});
 assert.equal(rollback.rollbackProven,true);assert.equal(rollback.updates,99);assert.equal(rollback.inserts,99);
 same(await snapshot(client),initial,'Actual complete rollback left a durable effect');write('rollback.json',rollback);
 report.cases.push('actual99_updates99_events_rolled_back_for_all33_with_trigger_and_owner_preservation');
 // Force a real PostgreSQL error after earlier candidates already wrote in this transaction.
 const failingCandidate=manifest.targets[16];
 await client.query(`create function public.classification_qualification_fail_midway() returns trigger language plpgsql as $$ begin if NEW.candidate_id='${stampedChildImageIntakeKeysV1(failingCandidate).candidateId}'::uuid and NEW.event_type='CLASSIFICATION_COMPLETE' then raise exception 'OWNED_CLASSIFICATION_MID_BATCH_SQL_FAILURE'; end if; return NEW; end $$`);
 await client.query('create trigger classification_qualification_fail_midway before insert on public.canon_warehouse_candidate_events for each row execute function public.classification_qualification_fail_midway()');
 await assert.rejects(local.executeStampedClassificationLocalV1({client,auditClient:audit,plan,mode:'apply'}),/OWNED_CLASSIFICATION_MID_BATCH_SQL_FAILURE/);
 await client.query('drop trigger classification_qualification_fail_midway on public.canon_warehouse_candidate_events');await client.query('drop function public.classification_qualification_fail_midway()');
 same(await snapshot(client,{excludeLedger:true}),await snapshot(adversary,{excludeLedger:true}),'Independent connections disagree');
 same(await snapshot(client,{excludeLedger:true}),Object.fromEntries(Object.entries(initial).filter(([k])=>k!=='contract_violations')),'Mid-batch error left partial classification');
 assert.equal((await snapshot(client)).contract_violations.length,initial.contract_violations.length+1);
 report.cases.push('real_mid_batch_sql_error_rolls_back_all33_and_records_one_independent_failure');
 const stable=await snapshot(client);
 const tampered=structuredClone(plan);tampered.builds[0].writePlan[2].proposedActionType='CREATE_CARD_PRINT';
 await assert.rejects(local.executeStampedClassificationLocalV1({client,auditClient:audit,plan:tampered,mode:'apply'}),/plan changed/);
 same(await snapshot(client),stable);report.cases.push('tampered_plan_rejected_before_write');
 await adversary.query('begin');await adversary.query('select pg_advisory_xact_lock(hashtext($1))',['STAMPED_CHILD_CLASSIFICATION_LOCAL_V1']);
 try{await assert.rejects(local.executeStampedClassificationLocalV1({client,auditClient:audit,plan,mode:'apply'}),/Another classification owns this batch/);}finally{await adversary.query('rollback');}
 same(await snapshot(client),stable);report.cases.push('independent_batch_lock_stops_before_classification');
 const driftId=manifest.targets[0].printingId;
 await client.query("update public.card_printings set finish_key='holo' where id=$1",[driftId]);
 await assert.rejects(local.executeStampedClassificationLocalV1({client,auditClient:audit,plan,mode:'apply'}),/baseline changed/);
 await client.query("update public.card_printings set finish_key='reverse' where id=$1",[driftId]);
 same(await snapshot(client),stable);report.cases.push('changed_existing_printing_stops_before_classification');
 const applied=await local.executeStampedClassificationLocalV1({client,auditClient:audit,plan,mode:'apply'});assert.equal(applied.committed,true);
 write('apply.local.private.json',applied);same(await local.readStampedClassificationLocalStateV1(adversary),applied.state);
 const after=await snapshot(client),sentinelAfter=after.canon_warehouse_candidates.find(x=>x.id===own.sentinel);
 same(sentinelAfter,initial.canon_warehouse_candidates.find(x=>x.id===own.sentinel));
 assert.equal(after.canon_warehouse_candidate_events.length,initial.canon_warehouse_candidate_events.length+99);
 for(const table of ['raw_imports','canon_warehouse_candidate_evidence','card_prints','card_printings','card_print_identity','owned_fixture_copies'])same(after[table],initial[table],table+' changed');
 report.cases.push('actual_atomic33_apply_independent_full_readback_preserves66_owners_and_unrelated_candidate');
 const replay=await local.executeStampedClassificationLocalV1({client,auditClient:audit,plan,mode:'replay',committedReceipt:read(out+'/apply.local.private.json')});
 assert.equal(replay.updates,0);assert.equal(replay.inserts,0);same(await snapshot(client),after);write('replay.json',replay);
 report.cases.push('server_readonly_committed_replay_has_zero_writes');
 await assert.rejects(local.executeStampedClassificationLocalV1({client,auditClient:audit,plan,mode:'apply'}),/baseline changed/);
 same(await snapshot(client),after);report.cases.push('consumed_baseline_cannot_be_applied_again');
 // Lost acknowledgement after the real server COMMIT: preserve durable effects, no receipt or retry.
 const lost=await fixture(database+'_commit_loss'),lostClient=lost.client,lostAudit=await connect(database+'_commit_loss');
 try{
  const lostPlan=await local.prepareStampedClassificationLocalV1(lostClient);let injected=false;
  const proxy={connectionParameters:lostClient.connectionParameters,async query(sql,params){const r=await lostClient.query(sql,params);if(sql==='commit'&&!injected){injected=true;throw Error('OWNED_LOST_COMMIT_RESPONSE');}return r;}};
  let uncertain;try{await local.executeStampedClassificationLocalV1({client:proxy,auditClient:lostAudit,plan:lostPlan,mode:'apply'});}catch(error){uncertain=error;}
  assert.ok(injected);assert.equal(uncertain?.commitUncertain,true);assert.equal(uncertain.automaticRetry,false);
  const durable=await local.readStampedClassificationLocalStateV1(lostAudit);
  assert.equal(durable.events.length,lostPlan.before.events.length+99);assert.equal(durable.candidates.filter(x=>x.state==='REVIEW_READY').length,33);
  for(const key of ['raw','evidence','parents','children','identities','owners'])same(durable[key],lostPlan.before[key]);
  write('lost-commit-independent-diagnosis.json',{pass:true,actualCommitResponseLost:true,durableReviewReadyCandidates:33,durableNewEvents:99,successfulApplyReceiptFabricated:false,automaticRetry:false});
  report.cases.push('real33_commit_response_loss_independently_diagnosed_without_retry_or_fabricated_success');
 }finally{await lostClient.end();await lostAudit.end();}
 // Check that the pre-existing ordinary worker still owns/commits its own single-candidate transaction.
 const legacy=await fixture(database+'_legacy');
 try{
  process.env.SUPABASE_DB_URL='postgresql://postgres:'+encodeURIComponent(process.env.LOCAL_FIXTURE_PASSWORD)+'@127.0.0.1:5432/'+database+'_legacy';
  const id=stampedChildImageIntakeKeysV1(manifest.targets[0]).candidateId;
  const beforeLegacy=await snapshot(legacy.client),result=await runClassificationWorkerV1({candidateId:id,apply:true,emitLogs:false});
  assert.equal(result.results[0].status,'applied');
  const afterLegacy=await snapshot(legacy.client);assert.equal(afterLegacy.canon_warehouse_candidate_events.length,beforeLegacy.canon_warehouse_candidate_events.length+3);
  for(const table of ['raw_imports','canon_warehouse_candidate_evidence','card_prints','card_printings','card_print_identity','owned_fixture_copies','contract_violations'])same(afterLegacy[table],beforeLegacy[table]);
  const again=await runClassificationWorkerV1({candidateId:id,apply:true,emitLogs:false});assert.equal(again.results[0].status,'skipped');same(await snapshot(legacy.client),afterLegacy);
  report.cases.push('ordinary_classifier_still_commits_one_candidate_and_skips_repeat_without_extra_rows');
 }finally{await legacy.client.end();delete process.env.SUPABASE_DB_URL;}
 report.syntheticOwnedCopiesPreserved=66;report.unrelatedCandidatePreserved=true;report.localEffects={distinctCandidateUpdates:33,updateStatements:99,eventInserts:99,canonicalWrites:0,founderApprovals:0,failureLedgerRows:1};
 report.databaseBytes=(await admin.query('select sum(pg_database_size(datname))::text bytes from pg_database where datname=any($1::text[])',[report.databases])).rows[0].bytes;
 report.pass=true;
}catch(error){report.error={message:String(error.message),stack:String(error.stack).slice(0,5000)};process.exitCode=1;}
finally{
 await Promise.allSettled([client?.end(),audit?.end(),adversary?.end(),admin?.end()]);
 report.finishedAt=new Date().toISOString();write('result.json',report);console.log(JSON.stringify(report));
}
