// Owned PostgreSQL17 qualification only. Never consumes production credentials or user accounts.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';import {gunzipSync,gzipSync} from 'node:zlib';import {Client} from 'pg';
import {createServer} from 'node:http';import {createClient} from '@supabase/supabase-js';
import {createStampedChildImageStorageAdapterV1} from '../../backend/warehouse/stamped_child_image_storage_adapter_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {stampedChildImageManifestV1 as manifest,buildStampedChildImageIntakePlanV1,assertStampedChildImagePlanV1} from '../../backend/warehouse/stamped_child_image_intake_v1.mjs';
import {stampedChildImageIntakeCodeBindingV1} from '../../backend/warehouse/stamped_child_image_intake_code_binding_v1.mjs';
import {readStampedIntakeSchemaV1,readStampedIntakeRowsV1,executeStampedIntakeTransactionV1,stageStampedIntakeRawObjectsV1,verifyStampedIntakeRawObjectsV1,assertStampedIntakeAuthorityV1,assertStampedIntakeDatabaseV1} from '../../backend/warehouse/stamped_child_image_intake_execution_v1.mjs';

const args=process.argv.slice(2);assert.equal(args.length,8);const opts={};for(let i=0;i<args.length;i+=2){assert.ok(['--observed-plan','--asset-config','--out','--attempt'].includes(args[i]));assert.ok(!(args[i]in opts));opts[args[i]]=args[i+1];}
assert.equal(process.version,'v22.23.5');assert.match(opts['--attempt'],/^r[1-9][0-9]*$/);
const root=path.resolve(new URL('../../',import.meta.url).pathname),out=path.resolve(opts['--out']);assert.ok(out.startsWith('/artifacts/'));assert.equal(fs.existsSync(out),false);fs.mkdirSync(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),read=file=>JSON.parse(file.endsWith('.gz')?gunzipSync(fs.readFileSync(file)):fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')),write=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const observedBytes=fs.readFileSync(opts['--observed-plan']),observed=read(opts['--observed-plan']),observedReport=read(path.dirname(opts['--observed-plan'])+'/result.json');assert.equal(observedReport.pass,true);assert.equal(sha(observedBytes),observedReport.planSha256);const{fingerprint,...observedBody}=observed;assert.equal(hash(observedBody),fingerprint);
const assetConfig=read(opts['--asset-config']),toMounted=file=>{const prefix='C:/grookai_vault_operator_artifacts/all_stamped_reverse_holos_20261124/';assert.ok(file.replaceAll('\\','/').startsWith(prefix));return '/artifacts/'+file.replaceAll('\\','/').slice(prefix.length);},originals=Object.fromEntries(manifest.targets.map(t=>[t.printingId,fs.readFileSync(toMounted(assetConfig.imageFiles[t.printingId]))]));
const source=stampedChildImageIntakeCodeBindingV1(),revalidate=async()=>stampedChildImageIntakeCodeBindingV1().fingerprint;
const report={version:'STAMPED_CHILD_IMAGE_LOCAL_QUALIFICATION_V1',startedAt:new Date().toISOString(),pass:false,productionWrites:0,productionStorageWrites:0,realAccountsCopied:0,sourceFingerprint:source.fingerprint,attempt:opts['--attempt'],cases:[],databases:[]};
const connect=async database=>{assert.ok(database==='postgres'||/^stamped_child_image_intake_33_qualification_[a-z0-9_]+$/.test(database));const c=new Client({host:'127.0.0.1',port:5432,user:'postgres',password:process.env.LOCAL_FIXTURE_PASSWORD,database,application_name:'stamped_child_image_owned_qualification_v1',connectionTimeoutMillis:15000,statement_timeout:30000,query_timeout:35000});await c.connect();return c;};
let admin,client,audit,adversary,storageServer;
const quoted=s=>{assert.match(s,/^[a-z_][a-z0-9_]*$/);return '"'+s+'"';};
async function createFixture(database){
  assert.match(database,/^stamped_child_image_intake_33_qualification_[a-z0-9_]+$/);assert.equal((await admin.query('select count(*)::int n from pg_database where datname=$1',[database])).rows[0].n,0,'Retain every existing fixture; use a new attempt');
  await admin.query('create database '+quoted(database));report.databases.push(database);const c=await connect(database);
  try{
  await c.query('create schema auth; create schema storage; create schema extensions; create extension pgcrypto with schema extensions; create sequence public.raw_imports_id_seq');
  await c.query(`create table auth.users(id uuid primary key,email text not null);
    create table public.user_entitlements(id uuid primary key,user_id uuid references auth.users(id),email text,role text,is_active boolean,source text);
    create table storage.buckets(id text primary key,public boolean);
    create table public.card_prints(id uuid primary key,gv_id text,name text,number text,number_plain text,set_code text,variant_key text,image_source text,image_url text);
    create table public.card_printings(id uuid primary key,card_print_id uuid references public.card_prints(id),printing_gv_id text,finish_key text,is_provisional boolean,image_source text,image_path text,image_url text,image_alt_url text,image_status text);
    create table public.card_print_identity(id uuid primary key,card_print_id uuid references public.card_prints(id),is_active boolean,identity_domain text);
    create table public.canon_warehouse_promotion_staging(id uuid primary key);
    create table public.identity_snapshots(id uuid primary key);create table public.condition_snapshots(id uuid primary key);create table public.identity_scan_events(id uuid primary key);
    create table public.owned_fixture_copies(id uuid primary key,parent_id uuid references public.card_prints(id),printing_id uuid references public.card_printings(id),owner_id uuid references auth.users(id),copy_note text);`);
  const user='11111111-1111-4111-8111-111111111111',entitlement='22222222-2222-4222-8222-222222222222';
  await c.query("insert into auth.users values($1,'synthetic-owner@example.invalid')",[user]);
  await c.query("insert into public.user_entitlements values($1,$2,null,'founder',true,'synthetic_owned_fixture')",[entitlement,user]);
  await c.query("insert into storage.buckets values('user-card-images',false)");
  for(const t of manifest.targets){
    await c.query('insert into public.card_prints values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[t.parentId,t.parentGvId,t.printedName,t.printedNumber,t.numberPlain,t.setCode,t.variantKey,'representative','https://example.invalid/base/'+t.parentId+'.jpg']);
    await c.query('insert into public.card_printings values($1,$2,$3,$4,false,null,null,null,null,$5)',[t.printingId,t.parentId,t.printingGvId,t.finishKey,'representative_shared_stamp']);
    await c.query("insert into public.card_print_identity values($1,$2,true,'pokemon_eng_standard')",[randomUUID(),t.parentId]);
    for(const assigned of[true,false])await c.query('insert into public.owned_fixture_copies values($1,$2,$3,$4,$5)',[randomUUID(),t.parentId,assigned?t.printingId:null,user,assigned?'synthetic_assigned':'synthetic_unassigned']);
  }
  const allowed=new Set(['uuid','text','jsonb','boolean','timestamp with time zone','bigint']);
  for(const table of['raw_imports','canon_warehouse_candidates','canon_warehouse_candidate_evidence','canon_warehouse_candidate_events']){
    const columns=observed.before.schema.columns.filter(col=>col.table_name===table);assert.ok(columns.length);
    const definitions=columns.map(col=>{assert.ok(allowed.has(col.data_type),col.data_type);return quoted(col.column_name)+' '+col.data_type+(col.column_default?' default '+col.column_default:'')+(col.is_nullable==='NO'?' not null':'');});
    await c.query('create table public.'+quoted(table)+'('+definitions.join(',')+')');
  }
  const orderedConstraints=[...observed.before.schema.constraints.filter(c=>!c.definition.startsWith('FOREIGN KEY')),...observed.before.schema.constraints.filter(c=>c.definition.startsWith('FOREIGN KEY'))];
  for(const constraint of orderedConstraints)await c.query('alter table public.'+quoted(constraint.table_name)+' add constraint '+quoted(constraint.conname)+' '+constraint.definition);
  const definitions=new Set();for(const trigger of observed.before.schema.triggers){if(!definitions.has(trigger.function_definition)){await c.query(trigger.function_definition);definitions.add(trigger.function_definition);}await c.query(trigger.definition);}
  const ledgerMigration=fs.readFileSync(root+'/supabase/migrations/20260423150000_contract_runtime_layer_v1.sql','utf8');
  const start=ledgerMigration.indexOf('create table if not exists public.contract_violations'),end=ledgerMigration.indexOf('create table if not exists public.quarantine_records');assert.ok(start>=0&&end>start);await c.query(ledgerMigration.slice(start,end));
  const before={};for(const[key,table]of[['parents','card_prints'],['children','card_printings'],['identities','card_print_identity']])before[key]=(await c.query('select to_jsonb(t) row from public.'+quoted(table)+' t order by id')).rows.map(r=>r.row);
  for(const key of['existingCandidates','existingRawReceipts','existingEvidence','existingEvents','existingObjects'])before[key]=[];before.bucket={id:'user-card-images',public:false};before.schema=await readStampedIntakeSchemaV1(c);
  const entitlementFingerprint=(await c.query("select encode(extensions.digest(jsonb_build_object('entitlement_id',e.id,'user_id',e.user_id,'role',e.role,'is_active',e.is_active)::text,'sha256'),'hex') fp from public.user_entitlements e where id=$1",[entitlement])).rows[0].fp;
  const proposedRuns=['stage_raw','rollback','apply','replay'].map(mode=>({mode,runId:randomUUID()}));
  const plan=buildStampedChildImageIntakePlanV1({before,actor:{userId:user,authUserId:user,role:'founder',isActive:true,entitlementFingerprint},sourceContexts:observed.sourceContexts,proposedRuns,codeFingerprint:source.fingerprint,observedAt:new Date().toISOString()});assertStampedChildImagePlanV1(plan);
  return {client:c,plan};
  }catch(error){await c.end().catch(()=>{});throw error;}
}

function fileStore(directory,{failAfterWrite=0}={}){
  fs.mkdirSync(directory,{recursive:true});const calls=[];
  const target=(bucket,key)=>{assert.equal(bucket,'user-card-images');const file=path.resolve(directory,key);assert.ok(file.startsWith(path.resolve(directory)+path.sep));return file;};
  return {projectRef:'owned_local',calls,upload:async(bucket,key,bytes,options)=>{assert.equal(options.upsert,false);const file=target(bucket,key);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});calls.push(key);if(failAfterWrite===calls.length)throw Error('OWNED_FIXTURE_LOST_UPLOAD_ACK');return {path:key};},download:async(bucket,key)=>fs.readFileSync(target(bucket,key))};
}
async function owners(c){return(await c.query('select to_jsonb(t)::text row_json from public.owned_fixture_copies t order by id')).rows;}
async function assertEmpty(c,plan){for(const rows of Object.values(await readStampedIntakeRowsV1(c,plan)))assert.equal(rows.length,0);}
const context=(plan,mode,extra={})=>({environment:'owned_local',codeFingerprint:source.fingerprint,runId:plan.proposedRuns.find(run=>run.mode===mode).runId,mode,...extra});
try{
  admin=await connect('postgres');report.postgres=(await admin.query("select current_setting('server_version') version")).rows[0].version;assert.match(report.postgres,/^17\./);
  const fixture=await createFixture('stamped_child_image_intake_33_qualification_'+opts['--attempt']);client=fixture.client;const plan=fixture.plan;audit=await connect(report.databases[0]);adversary=await connect(report.databases[0]);
  assertStampedIntakeDatabaseV1(client,'owned_local');const originalOwners=await owners(client),sequenceBefore=(await client.query('select last_value::text,is_called from public.raw_imports_id_seq')).rows;assert.equal(originalOwners.length,66);
  write('plan.local.private.json',plan);
  assert.throws(()=>assertStampedIntakeAuthorityV1({plan,codeFingerprint:source.fingerprint,runId:randomUUID(),mode:'stage_raw',environment:'production',now:new Date().toISOString()}));report.cases.push('missing_production_authority_rejected_before_effects');
  const partial=fileStore(out+'/raw-partial-preserved',{failAfterWrite:3});let partialError;
  try{await stageStampedIntakeRawObjectsV1({plan,context:context(plan,'stage_raw'),storage:partial,guardClient:client,auditClient:audit,revalidate,originals});}catch(error){partialError=error;}
  assert.ok(partialError);assert.equal(partial.calls.length,3);assert.equal(partialError.confirmedRawObjects,2);assert.equal(partialError.automaticRetry,false);await assertEmpty(client,plan);report.cases.push('partial_upload_and_lost_ack_retained_without_retry');
  // Exercise the installed Supabase SDK on a loopback-only Storage wire fixture.
  // This is not a claim of live Supabase Storage or copied production credentials.
  const backing=fileStore(out+'/raw-originals'),wire={uploads:0,downloads:0,duplicateRejections:0,errors:[]};
  const byKey=new Map(plan.rows.map(row=>[row.keys.storagePath,manifest.targets.find(t=>t.printingId===row.candidate.reference_hints_payload.printing_reference)]));
  storageServer=createServer(async(req,res)=>{
    try{
      assert.equal(req.headers.authorization,'Bearer owned-local-storage-fixture');
      assert.equal(req.headers.apikey,'owned-local-storage-fixture');
      const prefix='/storage/v1/object/user-card-images/';assert.ok(req.url.startsWith(prefix));
      const key=decodeURIComponent(req.url.slice(prefix.length)),target=byKey.get(key);assert.ok(target,'Unexpected Storage object');
      if(req.method==='POST'){
        assert.equal(req.headers['x-upsert'],'false');assert.equal(req.headers['content-type'],'image/jpeg');
        const parts=[];let size=0;for await(const part of req){size+=part.length;assert.ok(size<=target.bytes);parts.push(part);}
        const bytes=Buffer.concat(parts);assert.equal(sha(bytes),target.originalSha256);
        if(backing.calls.includes(key)){wire.duplicateRejections++;res.writeHead(409,{'content-type':'application/json'});res.end(JSON.stringify({statusCode:'409',error:'Duplicate',message:'Object already exists'}));return;}
        await backing.upload('user-card-images',key,bytes,{contentType:'image/jpeg',upsert:false});wire.uploads++;
        res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({Key:'user-card-images/'+key,Id:randomUUID()}));
      }else{
        assert.equal(req.method,'GET');const bytes=await backing.download('user-card-images',key);wire.downloads++;
        res.writeHead(200,{'content-type':'image/jpeg','content-length':bytes.length});res.end(bytes);
      }
    }catch(error){wire.errors.push(String(error.message));res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({statusCode:'400',error:'Invalid fixture request',message:String(error.message)}));}
  });
  await new Promise((resolve,reject)=>{storageServer.once('error',reject);storageServer.listen(0,'127.0.0.1',resolve);});
  const sdk=createClient('http://127.0.0.1:'+storageServer.address().port,'owned-local-storage-fixture',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const storage=createStampedChildImageStorageAdapterV1(sdk,{plan,context:context(plan,'stage_raw'),revalidate});
  const staged=await stageStampedIntakeRawObjectsV1({plan,context:context(plan,'stage_raw'),storage,guardClient:client,auditClient:audit,revalidate,originals});assert.equal(staged.objects,33);
  const first=manifest.targets[0],firstKey=plan.rows.find(r=>r.candidate.reference_hints_payload.printing_reference===first.printingId).keys.storagePath;
  await assert.rejects(storage.upload('user-card-images',firstKey,originals[first.printingId],{contentType:'image/jpeg',upsert:false}),/already exists/);
  assert.equal(wire.uploads,33);assert.equal(wire.downloads,33);assert.equal(wire.duplicateRejections,1);assert.deepEqual(wire.errors,[]);
  report.storageWire={sdk:'@supabase/supabase-js',transport:'loopback HTTP fixture',productionCredentialsUsed:false,uploads:33,initialByteReadbacks:33,duplicateRejections:1};
  report.cases.push('installed_supabase_sdk_exact33_immutable_original_uploads_and_readback_duplicate_rejected');
  const verifyStoredObjects=()=>verifyStampedIntakeRawObjectsV1({plan,storage}),base={client,auditClient:audit,plan,revalidate,verifyStoredObjects};
  const rollback=await executeStampedIntakeTransactionV1({...base,context:context(plan,'rollback',{storageReceipt:staged})});assert.equal(rollback.inserts,132);assert.equal(rollback.rollbackProven,true);await assertEmpty(client,plan);report.cases.push('real132_row_rollback_and_empty_readback');
  const originalQuery=client.query.bind(client);let evidenceInserts=0;
  client.query=async(sql,values)=>{const result=await originalQuery(sql,values);if(/^insert into public\."canon_warehouse_candidate_evidence"/.test(sql)&&++evidenceInserts===2)await originalQuery('select 1/0');return result;};
  let midFailure;try{await executeStampedIntakeTransactionV1({...base,context:context(plan,'rollback',{storageReceipt:staged})});}catch(error){midFailure=error;}finally{client.query=originalQuery;}
  assert.ok(midFailure);assert.equal(midFailure.automaticRetry,false);await assertEmpty(client,plan);report.cases.push('actual_mid_batch_sql_error_rolls_back_every_intake_row');
  await adversary.query('select pg_advisory_lock(hashtext($1))',['STAMPED_CHILD_IMAGE_INTAKE_V1']);let locked;
  try{await executeStampedIntakeTransactionV1({...base,context:context(plan,'rollback',{storageReceipt:staged})});}catch(error){locked=error;}finally{await adversary.query('select pg_advisory_unlock(hashtext($1))',['STAMPED_CHILD_IMAGE_INTAKE_V1']);}
  assert.ok(locked);await assertEmpty(client,plan);report.cases.push('independent_writer_lock_blocks_before_intake');
  const sourceDrift={...base,revalidate:async()=> 'f'.repeat(64)};await assert.rejects(executeStampedIntakeTransactionV1({...sourceDrift,context:context(plan,'rollback',{storageReceipt:staged})}));await assertEmpty(client,plan);report.cases.push('source_drift_stops_before_intake');
  const applied=await executeStampedIntakeTransactionV1({...base,context:context(plan,'apply',{storageReceipt:staged,rollbackReceipt:rollback})});assert.equal(applied.inserts,132);assert.equal(applied.committed,true);write('apply.private.json',applied);report.cases.push('real132_row_apply_with_raw_unapproved_candidates');
  const independent=await connect(report.databases[0]);try{assert.deepEqual(await readStampedIntakeRowsV1(independent,plan),applied.writeRows);assert.deepEqual(await owners(independent),originalOwners);}finally{await independent.end();}report.cases.push('independent_connection_exact_readback_and66_owned_copies');
  const replay=await executeStampedIntakeTransactionV1({...base,context:context(plan,'replay',{storageReceipt:staged,rollbackReceipt:rollback,committedReceipt:applied})});assert.equal(replay.inserts,0);assert.equal(replay.committed,true);report.cases.push('committed_zero_total_row_replay');
  const auditRows=(await audit.query('select count(*)::int n from public.contract_violations')).rows[0].n;assert.equal(auditRows,4);assert.deepEqual(await owners(client),originalOwners);assert.deepEqual((await client.query('select last_value::text,is_called from public.raw_imports_id_seq')).rows,sequenceBefore);report.cases.push('four_durable_failure_outcomes_and_sequence_preservation');
  report.localWrites={rawImports:33,warehouseCandidates:33,warehouseEvidence:33,warehouseEvents:33,failureLedgerRows:auditRows};report.immutableRawObjects=33;report.partialRawObjectsRetained=3;report.syntheticOwnedCopiesPreserved=66;report.replayInserts=0;
  write('rollback.json',rollback);write('storage-stage.json',staged);write('replay.json',replay);
  report.databaseBytes=(await client.query('select pg_database_size(current_database())::text bytes')).rows[0].bytes;
  const lost=await createFixture('stamped_child_image_intake_33_qualification_'+opts['--attempt']+'_commit_loss');
  const lostClient=lost.client,lostAudit=await connect(report.databases.at(-1)),lostPlan=lost.plan,lostStore=fileStore(out+'/raw-commit-loss-originals');
  try{
    const lostOwners=await owners(lostClient);
    const lostStage=await stageStampedIntakeRawObjectsV1({plan:lostPlan,context:context(lostPlan,'stage_raw'),storage:lostStore,guardClient:lostClient,auditClient:lostAudit,revalidate,originals});
    const lostBase={client:lostClient,auditClient:lostAudit,plan:lostPlan,revalidate,verifyStoredObjects:()=>verifyStampedIntakeRawObjectsV1({plan:lostPlan,storage:lostStore})};
    const lostRollback=await executeStampedIntakeTransactionV1({...lostBase,context:context(lostPlan,'rollback',{storageReceipt:lostStage})});
    const originalCommitQuery=lostClient.query.bind(lostClient);let commitResponsesDropped=0;
    lostClient.query=async(sql,values)=>{const result=await originalCommitQuery(sql,values);if(sql==='commit'&&commitResponsesDropped++===0)throw Error('OWNED_FIXTURE_LOST_COMMIT_ACK');return result;};
    const attemptedContext=context(lostPlan,'apply',{storageReceipt:lostStage,rollbackReceipt:lostRollback});let lostError;
    try{await executeStampedIntakeTransactionV1({...lostBase,context:attemptedContext});}catch(error){lostError=error;}finally{lostClient.query=originalCommitQuery;}
    assert.ok(lostError);assert.equal(lostError.commitUncertain,true);assert.equal(lostError.automaticRetry,false);assert.equal(commitResponsesDropped,1);
    const diagnosisClient=await connect(report.databases.at(-1));
    try{
      const writeRows=await readStampedIntakeRowsV1(diagnosisClient,lostPlan);let total=0;
      for(const[key,rows]of Object.entries(writeRows)){assert.equal(rows.length,33);total+=rows.length;for(const expected of lostPlan.rows.map(r=>r[key])){const actual=JSON.parse(rows.find(r=>r.id===expected.id).row_json);for(const[field,value]of Object.entries(expected))if(field!=='id')assert.equal(hash(actual[field]),hash(value),key+':'+field);}}
      assert.equal(total,132);
      const durableRuns=(await diagnosisClient.query("select distinct metadata->>'plannedApplyRunId' run_id,metadata->>'inputFingerprint' input_fingerprint from public.canon_warehouse_candidate_events")).rows;
      assert.deepEqual(durableRuns,[{run_id:attemptedContext.runId,input_fingerprint:lostPlan.inputFingerprint}]);
      assert.equal((await diagnosisClient.query('select count(*)::int n from public.contract_violations')).rows[0].n,1);
      assert.deepEqual(await owners(diagnosisClient),lostOwners);
      write('lost-commit-independent-diagnosis.json',{pass:true,method:'Actual COMMIT forwarded once; its response was dropped before the caller received it. A separate connection diagnosed all132 durable rows and the exact planned apply run/input fingerprint.',planFingerprint:lostPlan.fingerprint,runId:attemptedContext.runId,durableRows:132,failureLedgerRows:1,syntheticOwnedCopiesPreserved:66,automaticRetry:false,successfulApplyReceiptFabricated:false});
    }finally{await diagnosisClient.end();}
    report.cases.push('actual132_row_commit_response_loss_independently_diagnosed_without_retry');
    report.lostCommitQualification={durableRows:132,failureLedgerRows:1,successfulApplyReceiptFabricated:false,automaticRetry:false};
  }finally{await Promise.allSettled([lostClient.end(),lostAudit.end()]);}
  assert.equal(await revalidate(),source.fingerprint);report.pass=true;
}catch(error){report.error={code:error.code,message:String(error.message).slice(0,1800),audit:error.audit??null,auditPersistenceFailure:error.auditPersistenceFailure??null};process.exitCode=1;}
finally{if(storageServer){storageServer.closeAllConnections();await new Promise(resolve=>storageServer.close(resolve));}await Promise.allSettled([client?.end(),audit?.end(),adversary?.end(),admin?.end()]);report.finishedAt=new Date().toISOString();write('result.json',report);console.log(JSON.stringify(report));}
