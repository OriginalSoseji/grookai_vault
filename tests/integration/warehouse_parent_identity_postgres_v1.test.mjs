import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

const enabled=process.env.GV_WAREHOUSE_PARENT_PG_PROOF==='1';
test('isolated PostgreSQL parent stage, rollback, promotion and repeat preserve identity', {skip:!enabled}, async()=>{
  const url=new URL(process.env.GV_WAREHOUSE_PARENT_PG_URL);
  assert.equal(url.hostname,'127.0.0.1');
  assert.equal(url.port,'54330');
  assert.equal(url.pathname,'/grookai_parent_identity_20261001_v1');
  for(const key of Object.keys(process.env)) if(/SUPABASE|DATABASE|^PG|TOKEN|SECRET|API_KEY/.test(key)) delete process.env[key];
  process.env.DOTENV_CONFIG_PATH='C:/grookai_vault_operator_artifacts/gamestop_promotion_20261001/no-environment-file';
  process.env.SUPABASE_DB_URL=url.toString();
  const {runPromotionStageWorkerV1}=await import('../../backend/warehouse/promotion_stage_worker_v1.mjs');
  const {runPromotionExecutorV1,processStage}=await import('../../backend/warehouse/promotion_executor_v1.mjs');
  const client=new pg.Client({connectionString:url.toString(),ssl:false});await client.connect();
  const candidateId=randomUUID(),userId=randomUUID(),setId=randomUUID();
  const setCode='local-parent-'+candidateId.slice(0,8), name='Synthetic warehouse retailer card';
  const report={synthetic_only:true,production_access:false,database:url.pathname.slice(1),candidate_id:candidateId,steps:[]};
  const tables=['card_prints','card_printings','card_printing_truth_reviews','raw_imports','external_mappings'];
  const snapshot=async(names=tables)=>Object.fromEntries(await Promise.all(names.map(async table=>[table,(await client.query(
    `select count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by t.id),'')) digest from public.${table} t`)).rows[0]])));
  try {
    assert.equal((await client.query('select current_database() name')).rows[0].name,url.pathname.slice(1));
    await client.query('begin');
    await client.query('insert into auth.users(id) values($1)',[userId]);
    await client.query(`insert into sets(id,code,name,game,printed_set_abbrev,identity_domain_default,identity_model)
      values($1,$2,'Synthetic parent identity test','pokemon','WPT','pokemon_eng_standard','standard')`,[setId,setCode]);
    await client.query(`insert into card_prints(id,game_id,set_id,set_code,number,name,gv_id,identity_domain)
      values($1,(select id from games where code='pokemon'),$2,$3,'131',$4,$5,'pokemon_eng_standard')`,
    [randomUUID(),setId,setCode,name,'GV-PK-WPT-'+candidateId.slice(0,8)]);
    await client.query(`insert into canon_warehouse_candidates(id,submitted_by_user_id,intake_channel,submission_type,notes,
      submission_intent,state,founder_approved_by_user_id,founder_approved_at,proposed_action_type,interpreter_decision)
      values($1,$2,'MANUAL','LOCAL_SYNTHETIC','Synthetic local test only','MISSING_CARD','APPROVED_BY_FOUNDER',$2,now(),'CREATE_CARD_PRINT','ROW')`,[candidateId,userId]);
    const metadata={normalized_metadata_package:{identity:{set_code:setCode,name,printed_number:'131/195'},
      printed_modifier:{status:'READY',modifier_key:'gamestop_stamp'}},
    interpreter_package:{status:'READY',proposed_action:'CREATE_CARD_PRINT',canon_context:{variant_key:'gamestop_stamp'}},
    promotion_image_normalization_package:{status:'READY',outputs:{}},
    identity_audit_package:{identity_audit_status:'VARIANT_IDENTITY',routing:{variant_key:'gamestop_stamp',proposed_action_type:'CREATE_CARD_PRINT'}}};
    await client.query(`insert into canon_warehouse_candidate_events(candidate_id,event_type,action,actor_type,metadata)
      values($1,'LOCAL_SYNTHETIC','LOCAL_FIXTURE','SYSTEM',$2)`,[candidateId,metadata]);
    await client.query(`insert into canon_warehouse_candidate_events(candidate_id,event_type,action,actor_type,actor_user_id,metadata)
      values($1,'FOUNDER_APPROVED','APPROVE','FOUNDER',$2,'{"synthetic_only":true,"production_authority":false}')`,[candidateId,userId]);
    await client.query('commit');
    const before=await snapshot();report.before=before;
    const dry=await runPromotionStageWorkerV1({candidateId,emitLogs:false});report.steps.push({phase:'stage_dry',result:dry});
    assert.equal(dry.results[0].status,'dry_run');assert.deepEqual(await snapshot(),before);
    const staged=await runPromotionStageWorkerV1({candidateId,apply:true,emitLogs:false});report.steps.push({phase:'stage_apply',result:staged});
    assert.equal(staged.results[0].status,'applied');const stagingId=staged.results[0].staging_id;
    const preview=await runPromotionExecutorV1({stagingId,emitLogs:false});report.steps.push({phase:'executor_dry',result:preview});
    assert.equal(preview.results[0].status,'dry_run');assert.deepEqual(await snapshot(),before);
    const pool=new pg.Pool({connectionString:url.toString(),ssl:false});let inserted=false,injected=false;
    const proxy={async connect(){const c=await pool.connect();return {release(error){c.release(error);},async query(sql,args){
      const result=await c.query(sql,args);
      if(sql.includes('insert into public.card_prints')) inserted=true;
      if(inserted&&!injected&&sql.startsWith('select to_jsonb(p) parent')) {
        injected=true;return {rows:result.rows.map(r=>({parent:{...r.parent,identity_domain:null}}))};
      }
      return result;
    }};}};
    try {const failed=await processStage(proxy,stagingId,{dryRun:false,allowRetryOnFailed:false});
      report.steps.push({phase:'forced_readback_failure',result:failed});assert.ok(injected);assert.equal(failed.status,'failed');
    } finally {await pool.end();}
    assert.deepEqual(await snapshot(),before,'Failed proof must roll back the parent and preserve dependencies');
    const result=await runPromotionExecutorV1({stagingId,apply:true,allowRetryOnFailed:true,emitLogs:false});
    report.steps.push({phase:'executor_apply',result});assert.equal(result.results[0].status,'applied');
    const receipt=result.results[0].summary.parent_identity_readback;
    assert.equal(receipt.identity_domain,'pokemon_eng_standard');assert.equal(receipt.printed_identity_modifier,'gamestop_stamp');
    const parent=(await client.query('select identity_domain,printed_identity_modifier,game_id,set_id from card_prints where id=$1',[receipt.card_print_id])).rows[0];
    assert.equal(parent.set_id,setId);assert.equal(parent.game_id,(await client.query("select id from games where code='pokemon'")).rows[0].id);
    const after=await snapshot();assert.equal(after.card_prints.rows,before.card_prints.rows+1);
    for(const table of tables.filter(t=>t!=='card_prints')) assert.deepEqual(after[table],before[table]);
    const fullTables=[...tables,'canon_warehouse_candidates','canon_warehouse_promotion_staging','canon_warehouse_candidate_events'];
    const beforeRepeat=await snapshot(fullTables),repeat=await runPromotionExecutorV1({stagingId,apply:true,emitLogs:false});
    report.steps.push({phase:'repeat',result:repeat});assert.equal(repeat.results[0].status,'already_succeeded');
    assert.deepEqual(await snapshot(fullTables),beforeRepeat,'Repeat must not write');report.after=after;report.status='passed';
  } catch(error) {report.status='failed';report.error=error.stack;await client.query('rollback').catch(()=>{});throw error;}
  finally {
    if(process.env.GV_WAREHOUSE_PARENT_PG_RECEIPT) fs.writeFileSync(process.env.GV_WAREHOUSE_PARENT_PG_RECEIPT,JSON.stringify(report,null,2),{flag:'wx'});
    await client.end();
  }
});
