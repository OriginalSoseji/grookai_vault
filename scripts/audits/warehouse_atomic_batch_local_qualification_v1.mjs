// Real PostgreSQL proof against an already prepared, exclusively owned fixture.
// Preserve every previous run/database; this script never resets or seeds one.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import pg from 'pg';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {assertWarehouseTransactionContextV1} from '../../backend/warehouse/transaction_context_v1.mjs';
import {runWarehouseAtomicBatchV1,verifyWarehouseAtomicBatchReceiptV1,WAREHOUSE_ATOMIC_PROMOTION_BATCH_V1}
  from '../../backend/warehouse/atomic_promotion_batch_v1.mjs';
assert.ok([4,5].includes(process.argv.length),'Expected retained plan, new exclusive output directory and optional owned database');
const plan=JSON.parse(fs.readFileSync(process.argv[2])),out=path.resolve(process.argv[3]);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const database=process.argv[4]??'stamped_bulk_promotion_qualification_v1';
assert.ok(['stamped_bulk_promotion_qualification_v1','stamped_bulk_promotion_registry_qualification_v1',
  'stamped_bulk_integrated_qualification_v1','stamped_bulk_normal_qualification_v1',
  'stamped_bulk_normal_qualification_r2','stamped_bulk_proposed_ids_qualification_v1'].includes(database),'owned_local_qualification_database_required');
const childBatch=plan.targets.every(t=>t.expected.mutation_type==='reviewed_printing_admission');
const config={host:'127.0.0.1',port:56230,user:'postgres',password:'postgres',database,
  connectionTimeoutMillis:10000,statement_timeout:45000,query_timeout:50000};
const client=new pg.Client(config),independent=new pg.Client(config),quote=s=>'"'+s.replaceAll('"','""')+'"';
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const report={version:'WAREHOUSE_ATOMIC_BATCH_LOCAL_QUALIFICATION_V1',startedAt:new Date().toISOString(),pass:false,database,
  productionWrites:0,actualOwnerApproval:false,phases:[],negativeCases:[],originalLaboratoriesUnchanged:true};
let relations;
const snapshot=async c=>{
  const sql=relations.map((r,i)=>`select ${i}::int relation_index,count(*)::int count,
    md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by to_jsonb(t)::text),'')) digest from ${quote(r.schema)}.${quote(r.table)} t`).join(' union all ');
  const rows=(await c.query(sql)).rows.sort((a,b)=>a.relation_index-b.relation_index);
  const tables=Object.fromEntries(rows.map(row=>[relations[row.relation_index].schema+'.'+relations[row.relation_index].table,{count:row.count,digest:row.digest}]));
  const sequences=(await c.query("select schemaname,sequencename,last_value::text from pg_sequences where schemaname=any($1::text[]) order by 1,2",[['public','auth','grookai_square','grookai_inventory','grookai_vendor_pricing']])).rows;
  return {tables,sequences};
};
const proxy=query=>({connection:client.connection,connectionParameters:client.connectionParameters,query});
try {
  await client.connect();await independent.connect();
  assert.equal((await client.query('select current_database() name')).rows[0].name,database);
  assert.equal((await client.query('select count(*)::int n from auth.users')).rows[0].n,1);
  assert.equal((await client.query('select count(*)::int n from auth.sessions')).rows[0].n,0);
  relations=(await client.query(`select n.nspname schema,c.relname "table" from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname=any($1::text[]) and c.relkind in('r','p') order by 1,2`,[['public','auth','grookai_square','grookai_inventory','grookai_vendor_pricing']])).rows;
  const before=await snapshot(independent);save('before.private.json',before);report.protectedRelations=relations.length;
  const originals={};for(const table of ['card_prints','card_print_identity','canon_warehouse_candidate_events'])
    originals[table]=(await independent.query(`select to_jsonb(t) row from public.${table} t order by id`)).rows.map(r=>r.row);
  assert.equal(before.tables['public.card_prints'].count,childBatch?27:18,'Requires retained unexecuted local fixture');
  await assert.rejects(assertWarehouseTransactionContextV1(client,{serializable:true}),/serializable_transaction_required|explicit_external_transaction_required/);
  // Even a session-wide SERIALIZABLE default cannot turn autocommit into an
  // external transaction; verify the XID survives between statements.
  await client.query("set default_transaction_isolation='serializable'");
  await assert.rejects(assertWarehouseTransactionContextV1(client,{serializable:true}),/explicit_external_transaction_required/);
  await client.query("set default_transaction_isolation='read committed'");
  await client.query('begin');await assert.rejects(runWarehouseAtomicBatchV1({client,plan}),/dedicated_idle_pg_client_required/);
  assert.equal((await client.query('select 17 value')).rows[0].value,17);await client.query('rollback');
  const preflight=await runWarehouseAtomicBatchV1({client,plan});assert.equal(preflight.executed,0);report.phases.push(preflight);save('preflight.json',preflight);
  await independent.query('begin');await independent.query('select pg_advisory_xact_lock(hashtext($1))',[WAREHOUSE_ATOMIC_PROMOTION_BATCH_V1]);
  let competing;try{await runWarehouseAtomicBatchV1({client,plan,mode:'apply',apply:true});}catch(e){competing=e;}finally{await independent.query('rollback');}
  assert.match(competing?.message??'',/competing_atomic_promotion_batch/);assert.equal(competing.commit_uncertain,false);
  assert.deepEqual(await snapshot(independent),before);report.negativeCases.push({name:'competing_batch_lock',rejected:true});
  const defects=[
    ['immutable_frozen_stage',async c=>{await c.query("update public.canon_warehouse_promotion_staging set frozen_payload=jsonb_set(frozen_payload,'{synthetic_drift}','true'::jsonb) where id=$1",[plan.stage_ids[0]]);},/frozen_payload is immutable/],
    ['changed_stage_before_state',async c=>{await c.query("update public.canon_warehouse_promotion_staging set last_error='Synthetic unexpected before-state change' where id=$1",[plan.stage_ids[0]]);},/before_state_or_plan_changed/],
    ['changed_approval_actor',async c=>{const actor='00000000-0000-4000-a000-000000000902';await c.query('insert into auth.users(id) values($1)',[actor]);await c.query('update public.canon_warehouse_candidates set founder_approved_by_user_id=$2 where id=$1',[plan.targets[0].candidate_id,actor]);},/approver_changed/],
    ['immutable_explicit_approval_event',async c=>{await c.query("update public.canon_warehouse_candidate_events set actor_type='SYSTEM' where candidate_id=$1 and event_type='FOUNDER_APPROVED'",[plan.targets[0].candidate_id]);},/canon_warehouse_candidate_events is insert-only/],
  ];
  for(const [name,mutate,pattern]of defects) {
    let injected=false,caught;const wrapped=proxy(async(...args)=>{
      const result=await client.query(...args);
      if(args[0]==='begin isolation level serializable'&&!injected){injected=true;await mutate(client);}return result;
    });
    try{await runWarehouseAtomicBatchV1({client:wrapped,plan,mode:'apply',apply:true});}catch(e){caught=e;}
    assert.match(caught?.message??'',pattern);assert.equal(caught.commit_uncertain,false);assert.equal(caught.rollback_uncertain,false);
    assert.deepEqual(await snapshot(independent),before);const evidence={name,rejected:true,independentAllRelationRollback:true,message:caught.message};report.negativeCases.push(evidence);save(name+'.json',evidence);
  }
  // First eight parent INSERTs genuinely execute. A real PostgreSQL failure on
  // the ninth must roll back all parents, claims, events and candidate changes.
  let inserts=0,late;const lateFailure=proxy(async(...args)=>{
    if((childBatch?/insert\s+into\s+public\.card_printings\s*\(/i:/insert\s+into\s+public\.card_prints\s*\(/i).test(args[0])&&++inserts===9)return client.query('select 1/0');
    return client.query(...args);
  });
  try{await runWarehouseAtomicBatchV1({client:lateFailure,plan,mode:'apply',apply:true});}catch(e){late=e;}
  assert.ok(late);assert.equal(inserts,9);assert.equal(late.commit_uncertain,false);assert.equal(late.rollback_uncertain,false);
  assert.deepEqual(await snapshot(independent),before);report.negativeCases.push({name:'ninth_insert_real_postgres_failure',actualEarlierInserts:8,allRelationsRolledBack:true});
  if(plan.targets.some(t=>t.expected.registry)) {
    let registryWrites=0,caught;
    const failure=proxy(async(...args)=>{
      if(/insert\s+into\s+public\.card_print_identity\s*\(/i.test(args[0])&&++registryWrites===9)return client.query('select 1/0');
      return client.query(...args);
    });
    try{await runWarehouseAtomicBatchV1({client:failure,plan,mode:'apply',apply:true});}catch(error){caught=error;}
    assert.ok(caught);assert.equal(registryWrites,9);assert.equal(caught.commit_uncertain,false);assert.equal(caught.rollback_uncertain,false);
    assert.deepEqual(await snapshot(independent),before);report.negativeCases.push({name:'ninth_registry_insert_real_postgres_failure',actualEarlierRegistryInserts:8,allRelationsRolledBack:true});
  }
  if(childBatch) {
    let reviewWrites=0,caught;
    const failure=proxy(async(...args)=>{
      if(/insert\s+into\s+public\.card_printing_truth_reviews\s*\(/i.test(args[0])&&++reviewWrites===9)return client.query('select 1/0');
      return client.query(...args);
    });
    try{await runWarehouseAtomicBatchV1({client:failure,plan,mode:'apply',apply:true});}catch(error){caught=error;}
    assert.ok(caught);assert.equal(reviewWrites,9);assert.equal(caught.commit_uncertain,false);
    assert.deepEqual(await snapshot(independent),before);report.negativeCases.push({name:'ninth_truth_review_insert_failure',allRelationsRolledBack:true});
  }
  const rollback=await runWarehouseAtomicBatchV1({client,plan,mode:'rollback',apply:true});assert.equal(rollback.executed,9);assert.equal(rollback.committed,false);
  assert.deepEqual(await snapshot(independent),before);report.phases.push(rollback);save('rollback.private.json',rollback);
  const applied=await runWarehouseAtomicBatchV1({client,plan,mode:'apply',apply:true});assert.equal(applied.executed,9);assert.equal(applied.committed,true);
  report.phases.push(applied);save('apply.private.json',applied);
  await verifyWarehouseAtomicBatchReceiptV1(independent,plan,applied.receipt);
  const after=await snapshot(independent),changed=Object.keys(before.tables).filter(key=>hash(before.tables[key])!==hash(after.tables[key]));
  const registryInserts=plan.targets.filter(t=>t.expected.registry).length;
  assert.deepEqual(changed.sort(),['public.card_prints','public.canon_warehouse_candidate_events','public.canon_warehouse_candidates','public.canon_warehouse_promotion_staging',
    ...(registryInserts?['public.card_print_identity']:[])].filter(t=>!childBatch||t!=='public.card_prints')
    .concat(childBatch?['public.card_printings','public.card_printing_truth_reviews','public.raw_imports']:[]).sort());
  assert.equal(after.tables['public.card_prints'].count,before.tables['public.card_prints'].count+(childBatch?0:9));
  if(childBatch)for(const table of ['card_printings','card_printing_truth_reviews','raw_imports'])
    assert.equal(after.tables['public.'+table].count,before.tables['public.'+table].count+9);
  assert.equal(after.tables['public.canon_warehouse_candidate_events'].count,before.tables['public.canon_warehouse_candidate_events'].count+18);
  assert.equal(after.tables['public.card_print_identity'].count,before.tables['public.card_print_identity'].count+registryInserts);
  for(const [table,rows]of Object.entries(originals)) {
    const retained=(await independent.query(`select to_jsonb(t) row from public.${table} t where id=any($1::uuid[]) order by id`,[rows.map(r=>r.id)])).rows.map(r=>r.row);
    assert.deepEqual(retained,rows,'Existing row changed: '+table);
  }
  assert.deepEqual(after.sequences,before.sequences);
  const replay=await runWarehouseAtomicBatchV1({client,plan,mode:'apply',apply:true,committedReceipt:applied.receipt});assert.equal(replay.executed,0);report.phases.push(replay);save('replay.private.json',replay);
  assert.deepEqual(await snapshot(independent),after);
  const readback=await runWarehouseAtomicBatchV1({client:independent,plan,mode:'readback',committedReceipt:applied.receipt});assert.equal(readback.executed,0);
  save('independent-readback.private.json',readback);report.independentReadback=true;report.actualCommittedParents=childBatch?0:9;
  report.actualCommittedPrintings=childBatch?9:0;report.actualNewActiveRegistryRows=registryInserts;
  report.sourceRowsExistingIdentitiesPrintingsMappingsImagesOwnersAndSequencesPreserved=true;report.immutableOriginalStagesAndApprovalsPreserved=true;
  report.pass=true;
} catch(error) {
  await client.query('rollback').catch(()=>{});await independent.query('rollback').catch(()=>{});
  report.error={message:error.message,code:error.code,commitUncertain:error.commit_uncertain,rollbackUncertain:error.rollback_uncertain,stack:error.stack};process.exitCode=1;
} finally {
  await client.end().catch(()=>{});await independent.end().catch(()=>{});report.finishedAt=new Date().toISOString();save('result.json',report);
  console.log(JSON.stringify({pass:report.pass,negativeCases:report.negativeCases.length,protectedRelations:report.protectedRelations,
    committedLocalParents:report.actualCommittedParents,independentReadback:report.independentReadback,productionWrites:0,error:report.error}));
}
