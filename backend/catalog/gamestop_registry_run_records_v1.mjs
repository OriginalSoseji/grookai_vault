import assert from 'node:assert/strict';
import schema from '../../docs/catalog/gamestop_registry_fifteen_v1/run_record_schema.json' with {type:'json'};
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';
export const JOB_TYPE='gamestop_registry_fifteen_run_v1';
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
freeze(schema);
const same=(a,b,message)=>assert.equal(hash(a),hash(b),message);
export const auditJobId=runId=>String(-1n-BigInt('0x'+hash({version:JOB_TYPE,runId}).slice(0,15)));
export async function readGameStopRunRecordSchema(client){
 const table='public.ingestion_jobs',s={};
 s.columns=(await client.query(`select a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,a.attgenerated,pg_get_expr(d.adbin,d.adrelid) default_expression from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=$1::regclass and a.attnum>0 and not a.attisdropped order by a.attnum`,[table])).rows;
 s.constraints=(await client.query('select conname,contype,pg_get_constraintdef(oid) definition from pg_constraint where conrelid=$1::regclass order by conname',[table])).rows;
 s.indexes=(await client.query("select indexname,indexdef from pg_indexes where schemaname='public' and tablename='ingestion_jobs' order by indexname")).rows;
 s.triggers=(await client.query('select t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) definition,pg_get_functiondef(p.oid) function_definition from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid=$1::regclass and not t.tgisinternal order by t.tgname',[table])).rows;
 s.rules=(await client.query("select rulename,definition from pg_rules where schemaname='public' and tablename='ingestion_jobs' order by rulename")).rows;
 s.policies=(await client.query("select * from pg_policies where schemaname='public' and tablename='ingestion_jobs' order by policyname")).rows;
 s.incomingReferences=(await client.query("select conrelid::regclass::text relation,conname,pg_get_constraintdef(oid) definition from pg_constraint where contype='f' and confrelid=$1::regclass order by 1,2",[table])).rows;
 return s;
}
export async function assertGameStopRunRecordStorage(client){
 same(await readGameStopRunRecordSchema(client),schema,'Run-record storage INSERT effects changed');
 assert.equal(schema.triggers.length,0);assert.equal(schema.rules.length,0);assert.equal(schema.incomingReferences.length,0);
}
export async function readGameStopRunRecord(client,runId){
 const rows=(await client.query("select id::text id,job_type,status,payload,to_jsonb(j)::text row_json from public.ingestion_jobs j where id=$1::bigint",[auditJobId(runId)])).rows;
 assert.ok(rows.length<=1);return rows[0]??null;
}
export async function retainedJobDigest(client,runId){
 return (await client.query("select count(*)::int rows,encode(extensions.digest(coalesce(string_agg(encode(extensions.digest(to_jsonb(j)::text,'sha256'),'hex'),'' order by id),''),'sha256'),'hex') sha256 from public.ingestion_jobs j where id<>$1::bigint",[auditJobId(runId)])).rows[0];
}
export async function appendGameStopRunRecord(client,{runId,planFingerprint,codeFingerprint,mode,startedAt,result,error,expectedRetainedDigest}){
 assert.match(runId,/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);assert.match(planFingerprint,/^[a-f0-9]{64}$/);assert.match(codeFingerprint,/^[a-f0-9]{64}$/);assert.ok(['rollback','apply'].includes(mode));
 await client.query('lock table public.ingestion_jobs in share row exclusive mode');
 await assertGameStopRunRecordStorage(client);assert.equal(await readGameStopRunRecord(client,runId),null,'Audit ID collision; never overwrite or suppress');
 const before=await retainedJobDigest(client,runId),server=(await client.query('select clock_timestamp() at')).rows[0].at;
 if(expectedRetainedDigest)same(before,expectedRetainedDigest,'Pre-existing ingestion jobs drifted before audit append');
 const payload={version:JOB_TYPE,run_id:runId,mode,plan_fingerprint:planFingerprint,complete_producer_fingerprint:codeFingerprint,
  started_at:startedAt,finished_at:new Date(server).toISOString(),stage:error?'failed':'verified',identity_insert_count:(error?.commitUncertain||error?.rollbackUncertain)?null:(result?.inserts??0),
  error_code:error?(error.code??'REGISTRY_EXECUTION_FAILED'):null,error_detail:error?String(error.message).slice(0,2000):null,
  commit_uncertain:error?.commitUncertain??false,rollback_uncertain:error?.rollbackUncertain??false,audit_commit_uncertain:error?.auditCommitUncertain??false,result:result??null};
 const inserted=await client.query("insert into public.ingestion_jobs(id,job_type,payload,status,attempts,created_at,last_attempt_at,locked_by,locked_at,requester_user_id) values($1::bigint,$2,$3::jsonb,$4,1,$5::timestamptz,$5::timestamptz,null,null,null)",[auditJobId(runId),JOB_TYPE,JSON.stringify(payload),error?'failed':'succeeded',payload.finished_at]);assert.equal(inserted.rowCount,1);
 same(await retainedJobDigest(client,runId),before,'Pre-existing ingestion jobs changed');const actual=await readGameStopRunRecord(client,runId);assert.equal(actual.job_type,JOB_TYPE);assert.equal(actual.status,error?'failed':'succeeded');same(actual.payload,payload,'Audit outcome readback mismatch');return actual;
}
export async function persistGameStopFailure(client,context,error){
 await client.query('begin isolation level serializable');
 try{await assertGameStopRunRecordStorage(client);const existing=await readGameStopRunRecord(client,context.runId);
  if(existing){assert.equal(existing.job_type,JOB_TYPE,'Audit ID belongs to another job');assert.ok(['succeeded','failed'].includes(existing.status));assert.equal(existing.payload.version,JOB_TYPE);assert.equal(existing.payload.mode,context.mode);assert.equal(existing.payload.run_id,context.runId);assert.equal(existing.payload.plan_fingerprint,context.planFingerprint);assert.equal(existing.payload.complete_producer_fingerprint,context.codeFingerprint);assert.ok(error.commitUncertain||error.auditCommitUncertain,'An existing terminal outcome is not replay authority');await client.query('rollback');return{persisted:true,existingTerminalOutcome:true,commitUncertain:error.commitUncertain??false,auditCommitUncertain:error.auditCommitUncertain??false,row:existing.row_json};}
  const row=await appendGameStopRunRecord(client,{...context,error});await client.query('commit');return{persisted:true,existingTerminalOutcome:false,row:row.row_json};
 }catch(failure){await client.query('rollback').catch(()=>{});throw failure;}
}
