// Whole transaction proof against a separately created, owned schema fixture.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import pg from'pg';
import{printingManifestHash as hash}from'../../backend/catalog/printing_completeness_gate_v1.mjs';
import{REVIEWED_STAMPED_REVERSE_PROGRAMME_V1 as VERSION,REVIEWED_STAMPED_REVERSE_QUALIFICATION_DB_V1,
 REVIEWED_STAMPED_REVERSE_QUALIFICATION_DATABASES_V1,
 prepareReviewedStampedReverseProgrammePlanV1 as prepare,runReviewedStampedReverseProgrammeV1 as run}from'../../backend/warehouse/reviewed_stamped_reverse_programme_v1.mjs';
import{REVIEWED_STAMPED_REVERSE_REGISTRY_V1 as registry}from'../../backend/pricing/reviewed_stamped_reverse_registry_v1.mjs';
import{REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V4,REVIEWED_SPECIAL_CANDIDATE_JOINS_V4}from'../../backend/pricing/tcgplayer_reviewed_special_candidate_evidence_v4.mjs';
import{evaluateTcgplayerMarketQualificationV3_5 as qualify}from'../../backend/pricing/tcgplayer_market_publication_policy_v3_5.mjs';
const out=path.resolve(process.argv[2]??'');assert.ok(process.argv[2]);assert.equal(fs.existsSync(out),false);fs.mkdirSync(out,{recursive:true});
const rollbackOnly=process.argv[3]==='--rollback-only';assert.ok(!process.argv[3]||rollbackOnly||process.argv[3]==='--complete');
const database=process.argv[4]??REVIEWED_STAMPED_REVERSE_QUALIFICATION_DB_V1;assert.ok(REVIEWED_STAMPED_REVERSE_QUALIFICATION_DATABASES_V1.includes(database));
const portArg=process.argv[5]??'--port=56230';assert.match(portArg,/^--port=[1-9][0-9]{3,4}$/);assert.ok(process.argv.length<=6);
const port=Number(portArg.slice('--port='.length));assert.ok(port>=1024&&port<=65535);
const config={host:'127.0.0.1',port,user:'postgres',password:'postgres',database,connectionTimeoutMillis:10000,statement_timeout:45000,query_timeout:50000};
const c=new pg.Client(config),independent=new pg.Client(config),actor='00000000-0000-4000-a000-000000000901';
const report={version:VERSION,startedAt:new Date().toISOString(),pass:false,database,localEndpoint:{host:'127.0.0.1',port},productionWrites:0,actualOwnerDecision:false,negativeCases:[]};
const save=(name,value)=>{const fd=fs.openSync(path.join(out,name),'wx');try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
let httpCalls=0;globalThis.fetch=async()=>{httpCalls++;throw Error('HTTP prohibited in source-backed local qualification');};
const quote=s=>'"'+s.replaceAll('"','""')+'"';let relations;
const snapshot=async client=>{
 const sql=relations.map((r,i)=>`select ${i}::int relation_index,count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n'order by to_jsonb(t)::text),''))digest from ${quote(r.schema)}.${quote(r.table)} t`).join(' union all ');
 const tables=Object.fromEntries((await client.query(sql)).rows.sort((a,b)=>a.relation_index-b.relation_index).map(r=>[relations[r.relation_index].schema+'.'+relations[r.relation_index].table,{count:r.count,digest:r.digest}]));
 const sequences=(await client.query("select schemaname,sequencename,last_value::text from pg_sequences where schemaname=any($1::text[])order by 1,2",[['public','auth','grookai_square','grookai_inventory','grookai_vendor_pricing']])).rows;
 return{tables,sequences};
};
const proxy=query=>({connection:c.connection,connectionParameters:c.connectionParameters,query});
try{
 await c.connect();await independent.connect();assert.equal((await c.query('select current_database()name')).rows[0].name,database);
 assert.equal((await c.query('select count(*)::int n from auth.users')).rows[0].n,1);assert.equal((await c.query('select count(*)::int n from auth.sessions')).rows[0].n,0);
 relations=(await c.query("select n.nspname schema,cl.relname\"table\"from pg_class cl join pg_namespace n on n.oid=cl.relnamespace where n.nspname=any($1::text[])and cl.relkind in('r','p')order by 1,2",[['public','auth','grookai_square','grookai_inventory','grookai_vendor_pricing']])).rows;
 assert.equal(relations.length,449);const before=await snapshot(independent);assert.equal(before.tables['public.card_prints'].count,54);save('before.private.json',before);
 await c.query('begin isolation level repeatable read read only');const plan=await prepare(c);await c.query('rollback');save('plan.private.json',plan);
 const decision={version:'REVIEWED_STAMPED_REVERSE_PROGRAMME_OWNER_DECISION_V1',decision:'approved',programme_plan_fingerprint:plan.fingerprint,code_fingerprint:plan.code_fingerprint,
  actor_user_id:actor,approved_at:new Date().toISOString(),expires_at:new Date(Date.now()+4*3600000).toISOString(),owner_evidence_sha256:hash({local_synthetic_only:true,plan:plan.fingerprint}),actual_owner_decision:false};
 save('synthetic-local-decision.private.json',decision);report.planFingerprint=plan.fingerprint;report.codeFingerprint=plan.code_fingerprint;
 const options={client:c,plan,decision,qualification:true};
 assert.equal((await run(options)).write_count,0);
 await assert.rejects(run({...options,mode:'rollback',qualification:false}));assert.deepEqual(await snapshot(independent),before);
 report.negativeCases.push({name:'synthetic_decision_cannot_authorize_production',rejected:true});
 await assert.rejects(run({...options,mode:'rollback',decision:{...decision,programme_plan_fingerprint:'0'.repeat(64)}}));assert.deepEqual(await snapshot(independent),before);
 report.negativeCases.push({name:'different_plan_decision',rejected:true});
 await independent.query('begin');await independent.query("select pg_advisory_xact_lock(hashtext('tcgplayer_market_publication_v1'))");
 await assert.rejects(run({...options,mode:'rollback'}),/reviewed_reverse_competing_writer/);await independent.query('rollback');assert.deepEqual(await snapshot(independent),before);
 report.negativeCases.push({name:'active_publication_writer',rejected:true});
 for(const[name,pattern,ordinal]of[
  ['last_physical_raw_failure',/^insert into public\.raw_imports/i,24],
  ['whole_review_insert_failure',/insert into public\.card_printing_truth_reviews/i,1],
  ['second_mapping_correction_failure',/update public\.external_mappings/i,2],
  ['final_mapping_insert_failure',/insert into public\.external_mappings/i,1],
 ]){
  let hits=0,caught;const sqlErrors=[];const wrapped=proxy(async(...args)=>{try{if(pattern.test(args[0])&&++hits===ordinal)return await c.query('select 1/0');return await c.query(...args);}
   catch(e){sqlErrors.push({sql:String(args[0]).slice(0,500),message:e.message,code:e.code,detail:e.detail});throw e;}});
  try{await run({...options,client:wrapped,mode:'rollback'});}catch(e){caught=e;}
  save(name+'.json',{hits,intendedOrdinal:ordinal,error:caught?.message,sqlErrors});
  assert.ok(caught,name+' unexpectedly passed');assert.equal(hits,ordinal,name+' did not reach intended real SQL');
  assert.equal(caught.commit_uncertain,false);assert.equal(caught.rollback_uncertain,false);assert.deepEqual(await snapshot(independent),before);
  report.negativeCases.push({name,actualFailureOrdinal:ordinal,all449RelationsRolledBack:true,error:caught.message});
 }
 const rollback=await run({...options,mode:'rollback'});assert.equal(rollback.rollback_proven,true);assert.deepEqual(await snapshot(independent),before);save('rollback.private.json',rollback);
 report.wholeRollbackProven=true;
 if(!rollbackOnly){
  let proposed;const lostAck=proxy(async(...args)=>{const result=await c.query(...args);if(args[0]==='commit')throw Error('Synthetic loss of actual complete COMMIT acknowledgement');return result;});
  let uncertain;try{await run({...options,client:lostAck,mode:'apply',rollbackReceipt:rollback,beforeCommit:async receipt=>{proposed=receipt;save('proposed-before-commit.private.json',receipt);}});}catch(e){uncertain=e;}
  assert.equal(uncertain?.commit_uncertain,true);assert.equal(uncertain.automatic_retry_allowed,false);assert.ok(proposed);
  const after=await snapshot(independent),changed=Object.keys(before.tables).filter(table=>hash(before.tables[table])!==hash(after.tables[table]));
  assert.deepEqual(changed.sort(),['public.card_printing_truth_reviews','public.external_mappings','public.raw_imports'].sort());
  assert.equal(after.tables['public.card_printing_truth_reviews'].count-before.tables['public.card_printing_truth_reviews'].count,54);
  assert.equal(after.tables['public.external_mappings'].count-before.tables['public.external_mappings'].count,51);
  assert.equal(after.tables['public.raw_imports'].count-before.tables['public.raw_imports'].count,24);
  assert.deepEqual(after.sequences,before.sequences);save('after.private.json',after);
  assert.equal((await run({client:independent,plan,mode:'readback',committedReceipt:proposed})).write_count,0);
  assert.equal((await run({client:c,plan,mode:'apply',committedReceipt:proposed})).write_count,0);assert.deepEqual(await snapshot(independent),after);
  report.trueWholeCommitAckLossIndependentlyResolved=true;report.zeroWriteReplay=true;report.changedRelations=changed;
  await c.query('begin isolation level serializable');await c.query('select public.prepare_tcgplayer_market_variant_assignments_v1($1)',[plan.source_snapshot.run.id]);
  const candidates=(await c.query(`select candidate.*,source_group.name as source_group_name,${REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V4}
   from public.v_tcgplayer_market_qualification_candidates_v8 candidate left join public.tcgcsv_source_groups source_group on source_group.group_id=candidate.group_id
   ${REVIEWED_SPECIAL_CANDIDATE_JOINS_V4}where candidate.source_product_id=any($1::int[])order by candidate.source_product_id`,[registry.targets.filter(t=>t.source_product).map(t=>t.source_product.product_id)])).rows;
  report.actualSqlPriceQualification=[];
  for(const candidate of candidates){const target=registry.targets.find(t=>t.source_product?.product_id===candidate.source_product_id),result=qualify(candidate,{now:new Date(),freshnessHours:36});
   if(candidate.source_subtype_name!=='Reverse Holofoil')continue;
   assert.equal(candidate.card_print_id,target.parent.id);assert.equal(candidate.card_printing_id,target.printing.id);
   const observation=plan.source_snapshot.observations.find(o=>o.product_id===candidate.source_product_id&&o.subtype_name==='Reverse Holofoil');
   assert.equal(candidate.market_price===null?null:Number(candidate.market_price),observation.market_price===null?null:Number(observation.market_price));
   if(Number(observation.market_price)>0)assert.equal(result.decision,'publish',JSON.stringify({product:candidate.source_product_id,reasons:result.reason_codes}));
   if(observation.market_price===null)assert.equal(result.eligible,false);
   report.actualSqlPriceQualification.push({product:candidate.source_product_id,market:candidate.market_price,currency:candidate.currency,decision:result.decision});
  }
  assert.equal(report.actualSqlPriceQualification.length,53);assert.equal(report.actualSqlPriceQualification.filter(r=>r.decision==='publish').length,52);await c.query('rollback');
 }
 assert.equal(httpCalls,0);report.pass=true;report.completeQualification=!rollbackOnly;
}catch(e){await c.query('rollback').catch(()=>{});await independent.query('rollback').catch(()=>{});report.error={message:e.message,code:e.code,stack:e.stack};process.exitCode=1;}
finally{await c.end().catch(()=>{});await independent.end().catch(()=>{});report.finishedAt=new Date().toISOString();report.httpCalls=httpCalls;save('result.json',report);console.log(JSON.stringify(report));}
