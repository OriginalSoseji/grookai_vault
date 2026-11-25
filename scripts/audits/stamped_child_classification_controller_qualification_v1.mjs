// Synthetic-owner PostgreSQL17 proof. No production connection or Storage access.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import pg from 'pg';

const attempt=process.argv[2];assert.match(attempt??'',/^r[1-9][0-9]*$/);
const out='/artifacts/stamped-child-classification-controller-qualification-'+attempt;
assert.equal(fs.existsSync(out),false);fs.mkdirSync(out,{recursive:true});
const read=file=>JSON.parse(file.endsWith('.gz')?gunzipSync(fs.readFileSync(file)):fs.readFileSync(file,'utf8'));
const write=(file,data)=>fs.writeFileSync(out+'/'+file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
for(const key of Object.keys(process.env))if(/SUPABASE|DATABASE|^PG|TOKEN|SECRET|API_KEY/.test(key))delete process.env[key];
const {stampedChildImageManifestV1:manifest,stampedChildImageIntakeKeysV1}=await import('../../backend/warehouse/stamped_child_image_intake_v1.mjs');
const {printingManifestHash:hash}=await import('../../backend/catalog/printing_completeness_gate_v1.mjs');
const local=await import('../../backend/warehouse/stamped_child_classification_v1.mjs');
const {runClassificationWorkerV1}=await import('../../backend/warehouse/classification_worker_v1.mjs');
const source=local.stampedChildClassificationCodeBindingV1();
const report={version:'STAMPED_CHILD_CLASSIFICATION_CONTROLLER_QUALIFICATION_V1',startedAt:new Date().toISOString(),pass:false,productionWrites:0,productionStorageWrites:0,realAccountsCopied:0,sourceFingerprint:source.fingerprint,sourceFiles:source.files.length,databases:[],cases:[],allStampedProgramComplete:false};
const database='stamped_child_classification_33_controller_'+attempt;
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
  await c.query('create schema grookai_square;create schema grookai_inventory;create schema grookai_vendor_pricing;alter table storage.buckets add column file_size_limit bigint,add column allowed_mime_types text[];create table public.card_printing_truth_reviews(id uuid primary key,card_printing_id uuid references public.card_printings(id));');
  await c.query(`create function public.controller_qualification_fail_midway() returns trigger language plpgsql as $$ begin if NEW.candidate_id::text=current_setting('grookai.qualification_fail_candidate',true) and NEW.event_type='CLASSIFICATION_COMPLETE' then raise exception 'OWNED_CONTROLLER_MID_BATCH_FAILURE'; end if; return NEW; end $$`);
  await c.query('create trigger controller_qualification_fail_midway before insert on public.canon_warehouse_candidate_events for each row execute function public.controller_qualification_fail_midway()');
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

const intakePlan=read('/artifacts/stamped-child-image-intake-local-qualification-r4/plan.local.private.json');
const intakeReceipt=read('/artifacts/stamped-child-image-intake-local-qualification-r4/apply.private.json');
const originalConfig=read('/artifacts/stamped-child-image-intake-readonly-config-v2.json');
const toMounted=file=>{const prefix='C:/grookai_vault_operator_artifacts/all_stamped_reverse_holos_20261124/';assert.ok(file.replaceAll('\\','/').startsWith(prefix));return '/artifacts/'+file.replaceAll('\\','/').slice(prefix.length);};
const verifyRawObjects=async()=>{for(const t of manifest.targets){const bytes=fs.readFileSync(toMounted(originalConfig.imageFiles[t.printingId]));assert.equal(bytes.length,t.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),t.originalSha256);}return {pass:true,objects:33,storageWrites:0};};
const revalidate=async()=>local.stampedChildClassificationCodeBindingV1().fingerprint;
const prepare=c=>local.prepareStampedClassificationV1({client:c,actor:intakePlan.actor,proposedRuns:['rollback','apply','replay'].map(mode=>({mode,runId:randomUUID()})),codeFingerprint:source.fingerprint,environment:'owned_local',intakePlan,intakeReceipt});
const context=(plan,mode,extra={})=>({environment:'owned_local',mode,runId:plan.proposedRuns.find(x=>x.mode===mode).runId,codeFingerprint:source.fingerprint,...extra});
const execute=(plan,mode,extra={})=>local.executeStampedClassificationV1({client,auditClient:audit,plan,context:context(plan,mode,extra),revalidate,verifyRawObjects});
try{
 admin=await connect('postgres');report.postgres=(await admin.query("select current_setting('server_version') version")).rows[0].version;
 const own=await fixture(database);client=own.client;audit=await connect(database);adversary=await connect(database);
 const initial=await snapshot(client);let plan=await prepare(client);write('plan.local.private.json',plan);plan=read(out+'/plan.local.private.json');
 same(await snapshot(client),initial);report.cases.push('original132_receipt_verified_and_actual33_server_readonly_plan_serializes_exactly');
 const rollback=await execute(plan,'rollback');assert.equal(rollback.rollbackProven,true);assert.equal(rollback.updates,99);assert.equal(rollback.inserts,99);same(await snapshot(client),initial);write('rollback.json',rollback);
 report.cases.push('real99_updates99_events_full_rollback_with_five_schema_and_reference_digest_preservation');
 const beforeMissing=await snapshot(client);await assert.rejects(execute(plan,'apply'));same(await snapshot(client),beforeMissing);report.cases.push('missing_matching_rollback_rejected_before_any_failure_ledger_write');
 const badPlan=structuredClone(plan);badPlan.builds[0].writePlan[2].proposedActionType='CREATE_CARD_PRINT';await assert.rejects(execute(badPlan,'rollback'),/plan changed/);same(await snapshot(client),beforeMissing);report.cases.push('tampered_action_plan_rejected_before_effects');
 await client.query("select set_config('grookai.qualification_fail_candidate',$1,false)",[stampedChildImageIntakeKeysV1(manifest.targets[16]).candidateId]);
 await assert.rejects(execute(plan,'apply',{rollbackReceipt:rollback}),/OWNED_CONTROLLER_MID_BATCH_FAILURE/);
 await client.query("select set_config('grookai.qualification_fail_candidate','',false)");
 same(await snapshot(client,{excludeLedger:true}),Object.fromEntries(Object.entries(initial).filter(([k])=>k!=='contract_violations')));
 let newFailures=(await snapshot(client)).contract_violations.filter(x=>!initial.contract_violations.some(y=>y.id===x.id));
 assert.equal(newFailures.length,1);assert.equal(newFailures[0].payload_snapshot.programme,local.VERSION);assert.equal(newFailures[0].payload_snapshot.planFingerprint,plan.fingerprint);assert.equal(newFailures[0].payload_snapshot.runId,plan.proposedRuns[1].runId);
 const failedSnapshot=await snapshot(client);await assert.rejects(execute(plan,'apply',{rollbackReceipt:rollback}),/attempt is consumed/);same(await snapshot(client),failedSnapshot);
 report.cases.push('actual_mid_batch_sql_error_rolls_back_all33_one_scoped_failure_and_failed_attempt_cannot_reenter');
 plan=await prepare(client);await adversary.query('begin');await adversary.query('select pg_advisory_xact_lock(hashtext($1))',[local.VERSION]);
 try{await assert.rejects(execute(plan,'rollback'),/Another classification owns this batch/);}finally{await adversary.query('rollback');}
 same(await snapshot(client,{excludeLedger:true}),Object.fromEntries(Object.entries(initial).filter(([k])=>k!=='contract_violations')));report.cases.push('held_batch_lock_stops_before_classification');
 plan=await prepare(client);const copy=initial.owned_fixture_copies[0];await client.query("update public.owned_fixture_copies set copy_note='OWNED_DRIFT' where id=$1",[copy.id]);
 await assert.rejects(execute(plan,'rollback'),/baseline changed/);await client.query('update public.owned_fixture_copies set copy_note=$2 where id=$1',[copy.id,copy.copy_note]);
 same(await snapshot(client,{excludeLedger:true}),Object.fromEntries(Object.entries(initial).filter(([k])=>k!=='contract_violations')));report.cases.push('actual_foreign_key_owner_row_drift_blocks_release');
 plan=await prepare(client);await client.query('alter table public.card_prints enable row level security');
 await assert.rejects(execute(plan,'rollback'),/baseline changed/);await client.query('alter table public.card_prints disable row level security');
 report.cases.push('actual_row_security_drift_blocks_release');
 plan=await prepare(client);await assert.rejects(local.executeStampedClassificationV1({client,auditClient:audit,plan,context:context(plan,'rollback'),revalidate:async()=>'0'.repeat(64),verifyRawObjects}),/source changed/);
 same(await snapshot(client,{excludeLedger:true}),Object.fromEntries(Object.entries(initial).filter(([k])=>k!=='contract_violations')));report.cases.push('source_drift_blocks_before_candidate_mutation');
 plan=await prepare(client);await assert.rejects(local.executeStampedClassificationV1({client,auditClient:audit,plan,context:context(plan,'rollback'),revalidate,verifyRawObjects:async()=>({pass:true,objects:32,storageWrites:0})}));
 report.cases.push('incomplete_original_byte_proof_blocks_before_candidate_mutation');
 // The same exclusive directory claim is used by the actual operator CLI.
 const intentDir=out+'/once-only/'+randomUUID(),intent={planFingerprint:plan.fingerprint,automaticRetry:false};local.reserveStampedClassificationDirectoryV1(intentDir,intent);
 assert.throws(()=>local.reserveStampedClassificationDirectoryV1(intentDir,intent),/EEXIST/);same(read(intentDir+'/intent.json'),intent);report.cases.push('actual_operator_directory_claim_is_exclusive_and_retains_first_intent');
 plan=await prepare(client);const finalRollback=await execute(plan,'rollback');write('final-rollback.json',finalRollback);
 const applied=await execute(plan,'apply',{rollbackReceipt:finalRollback});assert.equal(applied.committed,true);assert.equal(applied.commitUncertain,false);write('apply.local.private.json',applied);
 const independent=await local.readStampedClassificationStateV1(adversary,plan.actor);local.assertStampedClassificationCommittedStateV1(plan,independent);same(independent,applied.state);
 const after=await snapshot(client);same(after.canon_warehouse_candidates.find(x=>x.id===own.sentinel),initial.canon_warehouse_candidates.find(x=>x.id===own.sentinel));
 for(const table of ['raw_imports','canon_warehouse_candidate_evidence','card_prints','card_printings','card_print_identity','owned_fixture_copies'])same(after[table],initial[table]);
 report.cases.push('actual_atomic33_apply_independent_full_reference_security_readback_preserves66_owners_and_unrelated_rows');
 const replay=await execute(plan,'replay',{rollbackReceipt:finalRollback,committedReceipt:read(out+'/apply.local.private.json')});assert.equal(replay.updates,0);assert.equal(replay.inserts,0);same(await snapshot(client),after);write('replay.json',replay);
 report.cases.push('actual_server_readonly_replay_has_zero_total_rows');
 const lost=await fixture(database+'_commit_loss'),lostClient=lost.client,lostAudit=await connect(database+'_commit_loss');
 try{
  const lostPlan=await prepare(lostClient),lostRollback=await local.executeStampedClassificationV1({client:lostClient,auditClient:lostAudit,plan:lostPlan,context:context(lostPlan,'rollback'),revalidate,verifyRawObjects});let injected=false;
  const proxy={connectionParameters:lostClient.connectionParameters,async query(sql,params){const r=await lostClient.query(sql,params);if(sql==='commit'&&!injected){injected=true;throw Error('OWNED_CONTROLLER_LOST_COMMIT_RESPONSE');}return r;}};
  let uncertain;try{await local.executeStampedClassificationV1({client:proxy,auditClient:lostAudit,plan:lostPlan,context:context(lostPlan,'apply',{rollbackReceipt:lostRollback}),revalidate,verifyRawObjects});}catch(error){uncertain=error;}
  assert.equal(injected,true);assert.equal(uncertain?.commitUncertain,true);assert.equal(uncertain.automaticRetry,false);
  const durable=await local.readStampedClassificationStateV1(lostAudit,lostPlan.actor);local.assertStampedClassificationCommittedStateV1(lostPlan,durable);
  const scoped=(await lostAudit.query("select id from public.contract_violations where payload_snapshot->>'programme'=$1 and payload_snapshot->>'planFingerprint'=$2",[local.VERSION,lostPlan.fingerprint])).rows;assert.equal(scoped.length,1);
  write('lost-commit-independent-diagnosis.json',{pass:true,actualCommitResponseLost:true,durableCandidates:33,durableNewEvents:99,scopedFailureRows:1,successfulApplyReceiptFabricated:false,automaticRetry:false});
  report.cases.push('real33_commit_response_loss_independent_full_data_security_diagnosis_and_one_failure_without_retry');
 }finally{await lostClient.end();await lostAudit.end();}
 report.localEffects={distinctCandidatesUpdated:33,updateStatements:99,eventInserts:99,canonicalWrites:0,founderApprovals:0};report.syntheticOwnedCopiesPreserved=66;report.failureRows=(await snapshot(client)).contract_violations.length-initial.contract_violations.length;
 report.databaseBytes=(await admin.query('select sum(pg_database_size(datname))::text bytes from pg_database where datname=any($1::text[])',[report.databases])).rows[0].bytes;
 report.originalImageProof='All33 preserved JPEG byte hashes and lengths; local filesystem transport. Production SDK download proof remains mandatory.';report.productionAuthority=false;report.pass=true;
}catch(error){report.error={message:String(error.message),stack:String(error.stack).slice(0,5000)};process.exitCode=1;}
finally{await Promise.allSettled([client?.end(),audit?.end(),adversary?.end(),admin?.end()]);report.finishedAt=new Date().toISOString();write('result.json',report);console.log(JSON.stringify(report));}
