import assert from 'node:assert/strict';
import{AUDITED_QUALIFICATION_DATABASE,qualifyGameStopRegistryTransaction,assertGameStopPricingWindowClear}from'./gamestop_registry_fifteen_v1.mjs';
import{assertGameStopRunRecordStorage,readGameStopRunRecord,retainedJobDigest,appendGameStopRunRecord,persistGameStopFailure}from'./gamestop_registry_run_records_v1.mjs';
export async function qualifyGameStopRegistryAuditedTransaction({client,auditClient,plan,mode,runId,codeFingerprint,committedIdentityRows,beforeCommit=async()=>{}}){
 for(const c of [client,auditClient]){const p=c.connectionParameters;assert.ok(['127.0.0.1','localhost'].includes(p.host));assert.equal(Number(p.port),5432);assert.equal(p.user,'postgres');assert.equal(p.database,AUDITED_QUALIFICATION_DATABASE);assert.equal((await c.query('select current_database() name')).rows[0].name,AUDITED_QUALIFICATION_DATABASE);}
 assert.ok(['rollback','apply'].includes(mode));assert.match(runId,/^[a-f0-9-]{36}$/);assert.match(codeFingerprint,/^[a-f0-9]{64}$/);
 assert.notEqual(client,auditClient,'Independent audit connection required');let retainedJobsBefore;
 const context={runId,planFingerprint:plan.fingerprint,codeFingerprint,mode,startedAt:new Date((await client.query('select clock_timestamp() at')).rows[0].at).toISOString()};
 try{
  const result=await qualifyGameStopRegistryTransaction({client,plan,mode,committedIdentityRows,beforeCommit,
   afterBegin:async()=>{await assertGameStopPricingWindowClear(client);await assertGameStopRunRecordStorage(client);assert.equal(await readGameStopRunRecord(client,runId),null,'Run already has an outcome; diagnose instead of retrying');retainedJobsBefore=await retainedJobDigest(client,runId);},
   recordSuccess:async proof=>appendGameStopRunRecord(client,{...context,expectedRetainedDigest:retainedJobsBefore,result:{...proof,otherTableWrites:1,auditRows:1,committed:true,commitUncertain:false}}),
  });
  if(mode==='rollback'){await auditClient.query('begin isolation level serializable');try{await appendGameStopRunRecord(auditClient,{...context,result:{...result,otherTableWrites:1,auditRows:1}});await auditClient.query('commit');}catch(error){await auditClient.query('rollback').catch(()=>{});throw error;}}
  return{...result,otherTableWrites:1,auditRows:1,auditPersisted:true,runId};
 }catch(error){try{error.audit=await persistGameStopFailure(auditClient,context,error);}catch(failure){error.auditPersistenceFailure=failure.message;}throw error;}
}
