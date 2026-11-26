// One complete transaction proof in a new owned database, never a lab reset.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import pg from 'pg';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {REVIEWED_PLAY_NORMAL_PROGRAMME_V1 as VERSION,PROGRAMME_QUALIFICATION_DATABASE_V1,PROGRAMME_QUALIFICATION_DATABASES_V1,
  prepareReviewedPlayNormalProgrammePlanV1,runReviewedPlayNormalProgrammeV1 as run}
  from '../../backend/warehouse/reviewed_play_normal_programme_v1.mjs';
import {REVIEWED_PLAY_NORMAL_NINE_REGISTRY_V1 as registry} from '../../backend/pricing/reviewed_play_normal_nine_registry_v1.mjs';
import {REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V4 as REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V3,REVIEWED_SPECIAL_CANDIDATE_JOINS_V4 as REVIEWED_SPECIAL_CANDIDATE_JOINS_V3} from '../../backend/pricing/tcgplayer_reviewed_special_candidate_evidence_v4.mjs';
import {evaluateTcgplayerMarketQualificationV3_5 as qualify} from '../../backend/pricing/tcgplayer_market_publication_policy_v3_5.mjs';
const out=path.resolve(process.argv[2]??'');assert.ok(process.argv[2]);assert.equal(fs.existsSync(out),false);fs.mkdirSync(out,{recursive:true});
const database=process.argv[3]??PROGRAMME_QUALIFICATION_DATABASE_V1;assert.ok(PROGRAMME_QUALIFICATION_DATABASES_V1.includes(database));
const portArg=process.argv[4]??'--port=56230';assert.match(portArg,/^--port=[1-9][0-9]{3,4}$/);assert.ok(process.argv.length<=5);
const port=Number(portArg.slice('--port='.length));assert.ok(port>=1024&&port<=65535);
const config={host:'127.0.0.1',port,user:'postgres',password:'postgres',database,connectionTimeoutMillis:10000,statement_timeout:45000,query_timeout:50000};
const c=new pg.Client(config),independent=new pg.Client(config),actor='00000000-0000-4000-a000-000000000901';
const report={version:VERSION,startedAt:new Date().toISOString(),pass:false,database,localEndpoint:{host:'127.0.0.1',port},productionWrites:0,actualOwnerApproval:false,negativeCases:[]};
const save=(name,value)=>{const file=path.join(out,name),fd=fs.openSync(file,'wx');try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
let httpCalls=0;globalThis.fetch=async()=>{httpCalls++;throw Error('HTTP prohibited during complete source-backed local programme');};
const quote=s=>'"'+s.replaceAll('"','""')+'"';let relations;
const snapshot=async client=>{
 const sql=relations.map((r,i)=>`select ${i}::int relation_index,count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n'order by to_jsonb(t)::text),''))digest from ${quote(r.schema)}.${quote(r.table)} t`).join(' union all ');
 const tables=Object.fromEntries((await client.query(sql)).rows.sort((a,b)=>a.relation_index-b.relation_index).map(r=>[relations[r.relation_index].schema+'.'+relations[r.relation_index].table,{count:r.count,digest:r.digest}]));
 const sequences=(await client.query("select schemaname,sequencename,last_value::text from pg_sequences where schemaname=any($1::text[])order by 1,2",[['public','auth','grookai_square','grookai_inventory','grookai_vendor_pricing']])).rows;
 return {tables,sequences};
};
const proxy=query=>({connection:c.connection,connectionParameters:c.connectionParameters,query});
try{
 await c.connect();await independent.connect();assert.equal((await c.query('select current_database()name')).rows[0].name,database);
 assert.equal((await c.query('select count(*)::int n from auth.users')).rows[0].n,1);assert.equal((await c.query('select count(*)::int n from auth.sessions')).rows[0].n,0);
 relations=(await c.query("select n.nspname schema,cl.relname\"table\"from pg_class cl join pg_namespace n on n.oid=cl.relnamespace where n.nspname=any($1::text[])and cl.relkind in('r','p')order by 1,2",[['public','auth','grookai_square','grookai_inventory','grookai_vendor_pricing']])).rows;
 const before=await snapshot(independent);assert.equal(before.tables['public.card_prints'].count,18);assert.equal(before.tables['public.canon_warehouse_candidates'].count,2);save('before.private.json',before);
 await c.query('begin isolation level repeatable read read only');const plan=await prepareReviewedPlayNormalProgrammePlanV1(c);await c.query('rollback');save('plan.private.json',plan);
 const decision={version:'REVIEWED_PLAY_NORMAL_PROGRAMME_OWNER_DECISION_V1',decision:'approved',programme_plan_fingerprint:plan.fingerprint,code_fingerprint:plan.code_fingerprint,
  actor_user_id:actor,approved_at:new Date().toISOString(),expires_at:new Date(Date.now()+4*3600000).toISOString(),owner_evidence_sha256:hash({local_synthetic_only:true,plan:plan.fingerprint}),actual_owner_decision:false};
 save('synthetic-local-decision.private.json',decision);report.planFingerprint=plan.fingerprint;report.codeFingerprint=plan.code_fingerprint;
 const options={client:c,plan,decision,qualification:true};
 const preflight=await run(options);assert.equal(preflight.write_count,0);save('preflight.json',preflight);
 await assert.rejects(run({...options,mode:'rollback',qualification:false}),/explicit_real_owner_programme_decision_required/);
 assert.deepEqual(await snapshot(independent),before);report.negativeCases.push({name:'synthetic_decision_cannot_authorize_production',rejected:true});
 await assert.rejects(run({...options,mode:'rollback',decision:{...decision,programme_plan_fingerprint:'0'.repeat(64)}}));
 assert.deepEqual(await snapshot(independent),before);report.negativeCases.push({name:'different_programme_decision',rejected:true});
 await independent.query('begin');await independent.query("select pg_advisory_xact_lock(hashtext('tcgplayer_market_publication_v1'))");
 await assert.rejects(run({...options,mode:'rollback'}),/programme_competing_writer/);await independent.query('rollback');
 assert.deepEqual(await snapshot(independent),before);report.negativeCases.push({name:'active_publication_writer',rejected:true});
 for(const [name,pattern,ordinal]of [
  ['ninth_parent_failure',/insert\s+into\s+public\.card_prints\s*\(/i,9],
  ['ninth_active_identity_failure',/insert\s+into\s+public\.card_print_identity\s*\(/i,9],
  ['ninth_printing_failure',/insert\s+into\s+public\.card_printings\s*\(/i,9],
  ['ninth_printing_review_failure',/insert\s+into\s+public\.card_printing_truth_reviews\s*\(/i,9],
  ['final_programme_receipt_failure',/^insert into public\.raw_imports/i,11],
 ]){
  let hits=0,caught;const wrapped=proxy(async(...args)=>{if(pattern.test(args[0])&&++hits===ordinal)return c.query('select 1/0');return c.query(...args);});
  try{await run({...options,client:wrapped,mode:'rollback'});}catch(e){caught=e;}
  assert.ok(caught,name+' unexpectedly passed');assert.equal(hits,ordinal,name+' did not reach the intended actual SQL statement');
  assert.equal(caught.commit_uncertain,false);assert.equal(caught.rollback_uncertain,false);assert.deepEqual(await snapshot(independent),before);
  const evidence={name,actualFailureOrdinal:ordinal,all449RelationsRolledBack:true,error:caught.message};report.negativeCases.push(evidence);save(name+'.json',evidence);
 }
 const rollback=await run({...options,mode:'rollback'});assert.equal(rollback.rollback_proven,true);assert.equal(rollback.committed,false);
 assert.deepEqual(await snapshot(independent),before);save('rollback.private.json',rollback);
 let proposed;const lostAck=proxy(async(...args)=>{const result=await c.query(...args);if(args[0]==='commit')throw Error('Synthetic lost actual whole-programme COMMIT acknowledgement');return result;});
 let uncertain;try{await run({...options,client:lostAck,mode:'apply',rollbackReceipt:rollback,beforeCommit:async receipt=>{proposed=receipt;save('proposed-before-commit.private.json',receipt);}});}catch(e){uncertain=e;}
 assert.equal(uncertain?.commit_uncertain,true);assert.equal(uncertain.automatic_retry_allowed,false);assert.ok(proposed);
 const after=await snapshot(independent),changed=Object.keys(before.tables).filter(table=>hash(before.tables[table])!==hash(after.tables[table]));
 assert.deepEqual(changed.sort(),['public.card_prints','public.card_print_identity','public.card_printings','public.card_printing_truth_reviews',
  'public.external_mappings','public.raw_imports','public.canon_warehouse_candidates','public.canon_warehouse_candidate_events','public.canon_warehouse_promotion_staging'].sort());
 const additions={'card_prints':9,'card_print_identity':9,'card_printings':9,'card_printing_truth_reviews':9,'external_mappings':9,
  'raw_imports':11,'canon_warehouse_candidates':18,'canon_warehouse_candidate_events':144,'canon_warehouse_promotion_staging':18};
 for(const [table,n]of Object.entries(additions))assert.equal(after.tables['public.'+table].count,before.tables['public.'+table].count+n);
 assert.deepEqual(after.sequences,before.sequences);save('after.private.json',after);
 const readback=await run({client:independent,plan,mode:'readback',committedReceipt:proposed});assert.equal(readback.write_count,0);save('independent-readback.private.json',readback);
 const replay=await run({client:c,plan,mode:'apply',committedReceipt:proposed});assert.equal(replay.write_count,0);assert.deepEqual(await snapshot(independent),after);save('replay.private.json',replay);
 await c.query('begin isolation level serializable');
 assert.equal((await c.query('select public.prepare_tcgplayer_market_variant_assignments_v1($1)n',[plan.price_links.source_snapshot.run.id])).rows[0].n,9);
 const candidates=(await c.query(`select candidate.*,source_group.name as source_group_name,${REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V3}
  from public.v_tcgplayer_market_qualification_candidates_v8 candidate left join public.tcgcsv_source_groups source_group on source_group.group_id=candidate.group_id
  ${REVIEWED_SPECIAL_CANDIDATE_JOINS_V3} where candidate.source_product_id=any($1::int[])order by candidate.source_product_id`,[registry.targets.map(t=>t.product_id)])).rows;
 assert.equal(candidates.length,9);report.actualSqlPriceQualification=[];
 for(const candidate of candidates){const target=registry.targets.find(t=>t.product_id===candidate.source_product_id),result=qualify(candidate,{now:new Date(),freshnessHours:36});
  assert.equal(candidate.card_print_id,target.parent.id);assert.equal(candidate.card_printing_id,target.printing.id);assert.equal(result.decision,'publish');
  assert.equal(result.policy_version,'TCGPLAYER_MARKET_PUBLICATION_POLICY_V3');
  assert.equal(Number(candidate.market_price),Number(plan.price_links.source_snapshot.observations.find(o=>o.product_id===target.product_id).market_price));
  report.actualSqlPriceQualification.push({product:target.product_id,market:candidate.market_price,currency:candidate.currency,decision:result.decision,policy:result.policy_version});}
 await c.query('rollback');assert.deepEqual(await snapshot(independent),after);
 assert.equal(httpCalls,0);report.completeAtomicAdditions=additions;report.protectedRelations=relations.length;report.oneRealWholeTransaction=true;
 report.trueWholeCommitAckLossIndependentlyResolved=true;report.zeroWriteReplay=true;report.httpCalls=0;report.pass=true;
}catch(e){await c.query('rollback').catch(()=>{});await independent.query('rollback').catch(()=>{});report.error={message:e.message,code:e.code,stack:e.stack};process.exitCode=1;}
finally{await c.end().catch(()=>{});await independent.end().catch(()=>{});report.httpCalls=httpCalls;report.finishedAt=new Date().toISOString();save('result.json',report);
 console.log(JSON.stringify({pass:report.pass,negativeCases:report.negativeCases.length,protectedRelations:report.protectedRelations,wholeTransaction:report.oneRealWholeTransaction,
  trueCommitAckLossResolved:report.trueWholeCommitAckLossIndependentlyResolved,productionWrites:0,error:report.error}));}
