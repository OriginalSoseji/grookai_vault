// Owned local SQL proof only. No production route, database creation or resets.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import pg from 'pg';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {readReviewedPlayNormalNineSourceV1,readReviewedPlayNormalNineMappingSchemaV1,buildReviewedPlayNormalNinePriceLinkPlanV1,
  applyReviewedPlayNormalNinePriceLinksWithinTransactionV1 as apply} from '../../backend/pricing/reviewed_play_normal_nine_price_links_v1.mjs';
import {REVIEWED_PLAY_NORMAL_NINE_REGISTRY_V1 as registry} from '../../backend/pricing/reviewed_play_normal_nine_registry_v1.mjs';
import {REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V3,REVIEWED_SPECIAL_CANDIDATE_JOINS_V3}
  from '../../backend/pricing/tcgplayer_reviewed_special_candidate_evidence_v3.mjs';
import {evaluateTcgplayerMarketQualificationV3_4 as qualify} from '../../backend/pricing/tcgplayer_market_publication_policy_v3_4.mjs';
const out=path.resolve(process.argv[2]??'');assert.ok(process.argv[2]);assert.equal(fs.existsSync(out),false);fs.mkdirSync(out,{recursive:true});
const database='stamped_bulk_price_links_qualification_v1',config={host:'127.0.0.1',port:56230,user:'postgres',password:'postgres',database,
  connectionTimeoutMillis:10000,statement_timeout:45000,query_timeout:50000};
const c=new pg.Client(config),independent=new pg.Client(config),actorUserId='00000000-0000-4000-a000-000000000901';
const report={startedAt:new Date().toISOString(),pass:false,database,productionWrites:0,actualOwnerApproval:false,
  sourceLaboratoriesChanged:false,negativeCases:[],phases:[]};
const save=(name,v)=>fs.writeFileSync(path.join(out,name),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const quote=s=>'"'+s.replaceAll('"','""')+'"';let relations;
const snapshot=async client=>{
  const sql=relations.map((r,i)=>`select ${i}::int relation_index,count(*)::int count,
    md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n'order by to_jsonb(t)::text),''))digest from ${quote(r.schema)}.${quote(r.table)} t`).join(' union all ');
  const tables=Object.fromEntries((await client.query(sql)).rows.sort((a,b)=>a.relation_index-b.relation_index)
    .map(r=>[relations[r.relation_index].schema+'.'+relations[r.relation_index].table,{count:r.count,digest:r.digest}]));
  const sequences=(await client.query("select schemaname,sequencename,last_value::text from pg_sequences where schemaname=any($1::text[])order by 1,2",[['public','auth','grookai_square','grookai_inventory','grookai_vendor_pricing']])).rows;
  return {tables,sequences};
};
try{
 await c.connect();await independent.connect();assert.equal((await c.query('select current_database() name')).rows[0].name,database);
 assert.equal((await c.query('select count(*)::int n from auth.users')).rows[0].n,1);assert.equal((await c.query('select count(*)::int n from auth.sessions')).rows[0].n,0);
 relations=(await c.query("select n.nspname schema,c.relname\"table\"from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=any($1::text[])and c.relkind in('r','p')order by 1,2",[['public','auth','grookai_square','grookai_inventory','grookai_vendor_pricing']])).rows;
 const before=await snapshot(independent);assert.equal(before.tables['public.external_mappings'].count,0);save('before.private.json',before);
 await c.query('begin isolation level repeatable read read only');
 const source=await readReviewedPlayNormalNineSourceV1(c),schema=await readReviewedPlayNormalNineMappingSchemaV1(c);
 await c.query('rollback');const plan=buildReviewedPlayNormalNinePriceLinkPlanV1({source,schema,preparedAt:new Date().toISOString()});
 save('plan.private.json',plan);report.planFingerprint=plan.fingerprint;report.producerFingerprint=plan.code_binding.fingerprint;
 const run=async({client=c,changedPlan=plan,commit=false}={})=>{
  let begun=false,commitSent=false,committed=false;
  try{begun=true;await client.query('begin isolation level serializable');const result=await apply(client,{plan:changedPlan,actorUserId});
   if(commit){commitSent=true;await client.query('commit');committed=true;}else await client.query('rollback');begun=false;
   return {...result,committed,commit_uncertain:false};
  }catch(e){e.commit_uncertain=commitSent&&!committed;if(begun&&!committed)await client.query('rollback');throw e;}
 };
 await assert.rejects(apply(c,{plan,actorUserId}),/serializable_transaction_required/);
 await independent.query('begin');await independent.query("select pg_advisory_xact_lock(hashtext('grookai:tcgcsv:current:v1'))");
 await assert.rejects(run(),/source_or_publication_writer_active/);await independent.query('rollback');assert.deepEqual(await snapshot(independent),before);
 report.negativeCases.push({name:'active_source_writer',rejected:true});
 for(const [name,inject,expected]of [
  ['changed_actual_source',async client=>{await client.query('update public.tcgcsv_source_price_daily_observations set market_price=market_price+1 where id=$1',[source.observations[0].id]);},/mapping_current_source_changed/],
  ['changed_verified_review',async client=>{await client.query('update public.card_printing_truth_reviews set active=false where id=$1',[registry.targets[0].review.id]);},/exact_physical_review_required/],
 ]){
  const wrapped={query:async(...args)=>{const result=await c.query(...args);if(args[0]==='begin isolation level serializable')await inject(c);return result;}};
  await assert.rejects(run({client:wrapped}),expected);assert.deepEqual(await snapshot(independent),before);report.negativeCases.push({name,rejected:true,allRelationsRolledBack:true});
 }
 const forged=structuredClone(plan);forged.code_binding.files[0].sha256='0'.repeat(64);forged.code_binding.fingerprint=hash(forged.code_binding.files);
 const {fingerprint,...forgedBody}=forged;forged.fingerprint=hash(forgedBody);
 await assert.rejects(run({changedPlan:forged}),/complete_programme_source_changed/);assert.deepEqual(await snapshot(independent),before);
 report.negativeCases.push({name:'rehash_changed_producer',rejected:true});
 for(const fault of ['duplicate_ninth_mapping','failure_after_nine_mappings']){
  let mappingsActuallyInserted=0;
  const wrapped={query:async(sql,args)=>{
   if(/^insert into public.external_mappings/.test(sql)) {
    if(fault==='duplicate_ninth_mapping'){const rows=JSON.parse(args[0]);rows[8].id=rows[0].id;return c.query(sql,[JSON.stringify(rows)]);}
    const result=await c.query(sql,args);mappingsActuallyInserted=result.rowCount;return result;
   }
   if(fault==='failure_after_nine_mappings'&&/^insert into public.raw_imports/.test(sql))return c.query('select 1/0');
   return c.query(sql,args);
  }};
  await assert.rejects(run({client:wrapped}));if(fault==='failure_after_nine_mappings')assert.equal(mappingsActuallyInserted,9);
  assert.deepEqual(await snapshot(independent),before);report.negativeCases.push({name:fault,rejected:true,allRelationsRolledBack:true,mappingsActuallyInserted});
 }
 const rollback=await run();assert.equal(rollback.mappings,9);assert.equal(rollback.audits,1);assert.equal(rollback.committed,false);
 assert.deepEqual(await snapshot(independent),before);save('rollback.json',rollback);report.phases.push(rollback);
 // A genuine nine-link COMMIT reaches PostgreSQL; only its acknowledgement is
 // lost. Do not retry the insert: independently classify the committed state.
 const lostAck={query:async(...args)=>{const result=await c.query(...args);if(args[0]==='commit')throw Error('Synthetic lost actual nine-link COMMIT acknowledgement');return result;}};
 let uncertain;try{await run({client:lostAck,commit:true});}catch(e){uncertain=e;}assert.equal(uncertain?.commit_uncertain,true);
 const after=await snapshot(independent),changed=Object.keys(before.tables).filter(t=>hash(before.tables[t])!==hash(after.tables[t]));
 assert.deepEqual(changed.sort(),['public.external_mappings','public.raw_imports']);
 assert.equal(after.tables['public.external_mappings'].count,before.tables['public.external_mappings'].count+9);
 assert.equal(after.tables['public.raw_imports'].count,before.tables['public.raw_imports'].count+1);assert.deepEqual(after.sequences,before.sequences);
 const readback=await run({client:independent});assert.equal(readback.state,'already_applied');assert.equal(readback.mappings,0);assert.equal(readback.audits,0);
 assert.deepEqual(await snapshot(independent),after);save('independent-readback.json',readback);
 report.actualNineLinkCommitAckLossIndependentlyResolved=true;report.zeroWriteReplay=true;
 // Exercise the unchanged actual SQL assignment/view path, then the new worker
 // policy, using the retained current public source rows. Qualification only:
 // assignments roll back and no publication pointer is written.
 await c.query('begin isolation level serializable');
 const assignment=(await c.query('select public.prepare_tcgplayer_market_variant_assignments_v1($1) n',[source.run.id])).rows[0].n;assert.equal(assignment,9);
 const candidates=(await c.query(`select candidate.*,source_group.name as source_group_name,${REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V3}
   from public.v_tcgplayer_market_qualification_candidates_v8 candidate
   left join public.tcgcsv_source_groups source_group on source_group.group_id=candidate.group_id
   ${REVIEWED_SPECIAL_CANDIDATE_JOINS_V3} where candidate.source_product_id=any($1::int[])order by candidate.source_product_id`,[registry.targets.map(t=>t.product_id)])).rows;
 assert.equal(candidates.length,9);report.actualSqlDecisions=[];
 for(const row of candidates){const result=qualify(row,{now:new Date(),freshnessHours:36}),target=registry.targets.find(t=>t.product_id===row.source_product_id);
  assert.equal(row.card_print_id,target.parent.id);assert.equal(row.card_printing_id,target.printing.id);
  assert.equal(Number(row.market_price),Number(source.observations.find(q=>q.product_id===target.product_id).market_price));
  assert.equal(result.decision,'publish',JSON.stringify({product:row.source_product_id,reasons:result.reason_codes}));
  report.actualSqlDecisions.push({product:row.source_product_id,card:row.card_print_id,printing:row.card_printing_id,market:row.market_price,currency:row.currency,decision:result.decision});}
 await c.query('rollback');assert.deepEqual(await snapshot(independent),after);
 report.protectedRelations=relations.length;report.actualLocalMappingInserts=9;report.actualLocalAuditInserts=1;report.actualAssignmentAndWorkerQualification=9;report.productionPublicationWrites=0;report.pass=true;
}catch(e){await c.query('rollback').catch(()=>{});await independent.query('rollback').catch(()=>{});report.error={message:e.message,code:e.code,stack:e.stack};process.exitCode=1;}
finally{await c.end().catch(()=>{});await independent.end().catch(()=>{});report.finishedAt=new Date().toISOString();save('result.json',report);
 console.log(JSON.stringify({pass:report.pass,negativeCases:report.negativeCases.length,protectedRelations:report.protectedRelations,actualLocalMappingInserts:report.actualLocalMappingInserts,
  qualifiedActualSqlCandidates:report.actualAssignmentAndWorkerQualification,commitAckLossResolved:report.actualNineLinkCommitAckLossIndependentlyResolved,productionWrites:0,error:report.error}));}
