// Replayable real PostgreSQL qualification; never creates or resets a database.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import pg from 'pg';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {GENERIC_PLAY_NINE_QUALIFICATION_DATABASE,readGenericPlayNineIntakeFrameV1,
  buildGenericPlayNineIntakePlanV1,classifyGenericPlayNineIntakeStateV1,qualifyGenericPlayNineIntakeTransactionV1}
  from '../../backend/warehouse/generic_play_nine_intake_v1.mjs';
import {getSourceBackedIdentity,buildSourceBackedMetadataExtractionPackages,buildSourceBackedInterpreterPackage}
  from '../../backend/warehouse/source_identity_contract_v1.mjs';
import {auditWarehouseCandidateIdentitySlotV1} from '../../backend/identity/identity_slot_audit_v1.mjs';
import {buildPromotionWritePlanSnapshot} from '../../backend/warehouse/promotion_stage_worker_v1.mjs';
const out=path.resolve(process.argv[2]??'');assert.ok(process.argv[2]);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const database=process.argv[3]??GENERIC_PLAY_NINE_QUALIFICATION_DATABASE;
assert.ok([GENERIC_PLAY_NINE_QUALIFICATION_DATABASE,'stamped_bulk_proposed_ids_qualification_v1'].includes(database));
const config={host:'127.0.0.1',port:56230,user:'postgres',password:'postgres',database,connectionTimeoutMillis:10000,statement_timeout:45000};
const client=new pg.Client(config),independent=new pg.Client(config),actorUserId='00000000-0000-4000-a000-000000000901';
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const report={version:'GENERIC_PLAY_NINE_INTAKE_LOCAL_QUALIFICATION_V1',startedAt:new Date().toISOString(),database,
  productionWrites:0,pass:false,phases:[],negativeCases:[],warehousePreviews:[],canonicalExecutionClaimed:false};
const protectedTables=['games','sets','card_prints','card_print_identity','card_print_identity_aliases','card_printings',
  'card_printing_truth_reviews','raw_imports','external_discovery_candidates','external_mappings','external_printing_mappings',
  'vault_item_instances','market_price_publication_snapshots'];
const protectedState=async c=>{
  const state={};for(const table of protectedTables)
    state[table]=(await c.query(`select count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by to_jsonb(t)::text),'')) digest from public.${table} t`)).rows[0];
  state.auth=(await c.query('select (select count(*)::int from auth.users) users,(select count(*)::int from auth.sessions) sessions')).rows[0];
  state.sequences=(await c.query("select schemaname,sequencename,last_value::text from pg_sequences where schemaname in('public','auth') order by 1,2")).rows;
  return state;
};
try {
  await client.connect();await independent.connect();
  const frame=await readGenericPlayNineIntakeFrameV1(client),plan=buildGenericPlayNineIntakePlanV1(frame);
  assert.equal(classifyGenericPlayNineIntakeStateV1(plan,frame),'before','Use a separately prepared new fixture; never reset the retained lab');
  assert.equal(frame.intakes.length,2);const before=await protectedState(client);assert.deepEqual(before.auth,{users:1,sessions:0});
  const eventsBefore=(await client.query('select count(*)::int n from public.canon_warehouse_candidate_events')).rows[0].n;
  save('plan.json',plan);save('protected-before.json',before);report.planFingerprint=plan.fingerprint;
  const run=async(mode,extra={})=>{
    const result=await qualifyGenericPlayNineIntakeTransactionV1({client,plan,mode,actorUserId,readFrame:readGenericPlayNineIntakeFrameV1,...extra});
    report.phases.push(result);save(`${report.phases.length}-${mode}.json`,result);return result;
  };
  assert.equal((await run('preflight')).inserted,0);
  // These are actual database changes inside the candidate transaction. Every
  // rejection is independently read back, preserving the original two rows.
  const defects=[
    ['historical_note_drift',async c=>{await c.query("update public.canon_warehouse_candidates set notes=notes||' changed' where id=$1",[frame.intakes[0].id]);},/source_or_protected_state_drift/],
    ['source_number_drift',async c=>{await c.query("update public.external_discovery_candidates set number_raw='999/999' where id=$1",[plan.source_rows[0].id]);},/source_or_protected_state_drift/],
    ['unexpected_additional_intake',async c=>{const id=frame.intakes[0].id;await c.query('insert into public.canon_warehouse_candidates(submitted_by_user_id,intake_channel,submission_type,notes,tcgplayer_id,submission_intent,state,claimed_identity_payload,reference_hints_payload)select submitted_by_user_id,intake_channel,submission_type,notes,tcgplayer_id,submission_intent,\'RAW\',claimed_identity_payload,reference_hints_payload from public.canon_warehouse_candidates where id=$1',[id]);},/unreviewed_existing_intake/],
    ['missing_base_identity',async c=>{await c.query('update public.card_print_identity set is_active=false where id=$1',[frame.baseIdentities[0].id]);},/current_identity_evidence_not_ready/],
  ];
  for(const [name,mutate,pattern]of defects) {
    let first=true,caught;
    const readFrame=async c=>{if(first){first=false;await mutate(c);}return readGenericPlayNineIntakeFrameV1(c);};
    try{await qualifyGenericPlayNineIntakeTransactionV1({client,plan,mode:'apply',actorUserId,readFrame});}catch(error){caught=error;}
    assert.ok(caught,name+' unexpectedly committed');assert.match(caught.message,pattern,name);
    assert.equal(caught.commit_uncertain,false);assert.equal(caught.rollback_uncertain,false);
    assert.equal(classifyGenericPlayNineIntakeStateV1(plan,await readGenericPlayNineIntakeFrameV1(independent)),'before');
    assert.deepEqual(await protectedState(independent),before);
    const evidence={name,rejected:true,error:caught.message,independentRollbackReadback:true};report.negativeCases.push(evidence);save('negative-'+name+'.json',evidence);
  }
  const rollback=await run('rollback');assert.equal(rollback.inserted,9);assert.equal(rollback.rollback_proven,true);
  assert.equal(classifyGenericPlayNineIntakeStateV1(plan,await readGenericPlayNineIntakeFrameV1(independent)),'before');
  assert.equal((await independent.query('select count(*)::int n from public.canon_warehouse_candidate_events')).rows[0].n,eventsBefore);
  assert.deepEqual(await protectedState(independent),before);
  const applied=await run('apply');assert.equal(applied.inserted,9);assert.equal(applied.committed,true);
  const after=await readGenericPlayNineIntakeFrameV1(independent);assert.equal(classifyGenericPlayNineIntakeStateV1(plan,after),'after');
  assert.equal((await run('readback')).inserted,0);assert.equal((await run('apply')).inserted,0);
  assert.equal((await independent.query('select count(*)::int n from public.canon_warehouse_candidate_events')).rows[0].n,eventsBefore+9);
  assert.deepEqual(await protectedState(independent),before);
  // Exercise the real classification/interpreter/staging-preview implementations
  // on actual database-assigned RAW candidate IDs, never invented warehouse IDs.
  for(const candidate of after.intakes.filter(r=>r.state==='RAW')) {
    const identity=getSourceBackedIdentity(candidate);
    const audit=await auditWarehouseCandidateIdentitySlotV1(independent,{candidate,
      candidateVariantIdentity:candidate.reference_hints_payload.variant_identity,sourceBackedIdentity:identity});
    const classification={proposed_action_type:audit.routing.proposed_action_type};
    const metadata=buildSourceBackedMetadataExtractionPackages({candidate});
    const interpreter=buildSourceBackedInterpreterPackage({candidate,classificationPackage:classification,identityAuditPackage:audit});
    const preview=await buildPromotionWritePlanSnapshot(independent,{candidate,
      metadataExtraction:{normalized_metadata_package:metadata.normalizedPackage},interpreterPackage:interpreter,
      identityAuditPackage:audit,classificationPackage:classification});
    assert.equal(preview.status,'READY');assert.equal(preview.actions.card_prints.action,'CREATE');
    assert.equal(preview.actions.card_printings.action,'NONE');assert.equal(preview.actions.external_mappings.action,'NONE');
    report.warehousePreviews.push({product:candidate.tcgplayer_id,candidateId:candidate.id,status:preview.status,
      successorOf:candidate.reference_hints_payload.generic_play_nine_intake.successor_of,previewHash:hash(preview)});
  }
  assert.equal(report.warehousePreviews.length,9);
  // Lose only the acknowledgement of a real zero-write replay COMMIT. The
  // adapter must report uncertainty and must not automatically retry it.
  const lostAck={connectionParameters:client.connectionParameters,query:async(...args)=>{
    const result=await client.query(...args);if(args[0]==='commit')throw Error('Synthetic lost replay commit acknowledgement');return result;
  }};
  let uncertain;try{await qualifyGenericPlayNineIntakeTransactionV1({client:lostAck,plan,mode:'apply',actorUserId,readFrame:readGenericPlayNineIntakeFrameV1});}catch(error){uncertain=error;}
  assert.equal(uncertain?.commit_uncertain,true);report.commitAcknowledgementLoss={actualZeroWriteReplayCommit:true,uncertaintyReported:true,newNineRowCommitLossClaimed:false,automaticRetry:false};
  assert.equal(classifyGenericPlayNineIntakeStateV1(plan,await readGenericPlayNineIntakeFrameV1(independent)),'after');
  assert.deepEqual(await protectedState(independent),before);
  report.rawCandidatesInserted=9;report.bridgeEventsInserted=9;report.historicalIntakesUnchanged=2;report.pass=true;
} catch(error) {
  await client.query('rollback').catch(()=>{});report.error={message:error.message,code:error.code,stack:error.stack};process.exitCode=1;
} finally {
  await client.end().catch(()=>{});await independent.end().catch(()=>{});report.finishedAt=new Date().toISOString();save('result.json',report);
  console.log(JSON.stringify({pass:report.pass,negativeCases:report.negativeCases.length,phases:report.phases,
    actualWarehousePreviews:report.warehousePreviews.length,productionWrites:0,error:report.error}));
}
