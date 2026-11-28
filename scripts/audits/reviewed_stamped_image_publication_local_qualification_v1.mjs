// Owned synthetic PostgreSQL17 qualification. Never connects to production.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {operationsSha256V1 as hash} from '../../backend/operations/operations_control_plane_v1.mjs';
import {buildFounderOutcomeAgentV1,FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_KEY} from '../../backend/operations/founder_outcome_workflow_v1.mjs';
import {buildReviewedStampedImageOutcomeWorkItemV1,reviewedStampedImageCodeBindingV1} from '../../backend/operations/reviewed_stamped_image_outcome_v1.mjs';
import {prepareReviewedImagePublicationPlanV1,readReviewedImageStateV1,assertReviewedImagePlanBeforeV1,
  prepareReviewedImageStorageV1,runReviewedImagePublicationTransactionV1 as run,
  applyReviewedImagesWithinTransactionV1,reconcileReviewedImageTransactionV1 as reconcile,
  REVIEWED_IMAGE_PUBLICATION_QUALIFICATION_DATABASES_V1 as allowedDbs} from '../../backend/warehouse/reviewed_stamped_image_publication_v1.mjs';
import scope from '../../docs/catalog/reviewed_stamped_image_preparation_v1/index.json' with {type:'json'};
import warehouseEffects from '../../docs/catalog/reviewed_play_normal_nine_v1/warehouse-trigger-functions.json' with {type:'json'};
import {verifyReviewedImagePublicBytesV1,reviewedImageStageFailureSummaryV1} from '../workers/reviewed_stamped_image_outcome_handlers_v1.mjs';

const root=path.resolve(import.meta.dirname,'../..'),input=path.resolve(process.argv[2]??''),out=path.resolve(process.argv[3]??'');
const database=process.argv[4]??'reviewed_image_publication_qualification_v1';
const dbs=[database,database+'_commit_loss',database+'_rollback_loss'];assert.ok(dbs.every(db=>allowedDbs.includes(db)));
const resumeDir=process.argv[5]?path.resolve(process.argv[5]):null;
assert.ok(process.argv[2]&&process.argv[3]);assert.equal(fs.existsSync(out),false);fs.mkdirSync(out,{recursive:true});
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>fs.writeFileSync(out+'/'+f,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
for(const key of Object.keys(process.env))assert.ok(!/^(SUPABASE_|PROD_SUPABASE_|DATABASE_URL$|POSTGRES_URL$|PG)/.test(key),'production_credentials_prohibited_in_image_fixture');
const config={host:'127.0.0.1',port:Number(process.env.LOCAL_FIXTURE_PORT),user:'postgres',password:process.env.LOCAL_FIXTURE_PASSWORD,
  connectionTimeoutMillis:10000,statement_timeout:120000,options:'-c TimeZone=UTC'};
assert.ok(config.port>=1024&&config.port<=65535);assert.ok(config.password);
const connect=async database=>{assert.ok(database==='postgres'||dbs.includes(database));const c=new pg.Client({...config,database});await c.connect();return c;};
const q=s=>{assert.match(s,/^[a-z_][a-z0-9_]*$/);return '"'+s+'"';};
const actor='00000000-0000-4000-a000-000000000901';
let networkCalls=0;globalThis.fetch=async()=>{networkCalls++;throw Error('HTTP prohibited during owned image qualification');};
const report={version:'REVIEWED_STAMPED_IMAGE_PUBLICATION_LOCAL_QUALIFICATION_V1',started_at:new Date().toISOString(),pass:false,
  production_writes:0,production_storage_writes:0,actual_founder_approval:false,real_accounts_copied:0,real_collections_copied:0,cases:[],databases:[]};
let admin,c,audit,adversary,relations,plan,head,proposal,command,reviews;
const same=(a,b,why)=>assert.equal(hash(a),hash(b),why);
async function snapshot(client){
  const sql=relations.map((r,i)=>`select ${i}::int n,count(*)::int count,
    md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n'order by to_jsonb(t)::text),''))digest from ${q(r.schema)}.${q(r.table)} t`).join(' union all ');
  const tables=Object.fromEntries((await client.query(sql)).rows.sort((a,b)=>a.n-b.n).map(r=>[relations[r.n].schema+'.'+relations[r.n].table,{count:r.count,digest:r.digest}]));
  const sequences=(await client.query("select schemaname,sequencename,last_value::text from pg_sequences where schemaname=any($1::text[])order by 1,2",[['public','auth','grookai_square','grookai_inventory','grookai_vendor_pricing']])).rows;
  return {tables,sequences};
}
async function insert(client,table,record){
  assert.ok(['games','sets','finish_keys','card_prints','card_printings','card_print_identity','card_printing_truth_reviews',
    'canon_warehouse_candidates','canon_warehouse_candidate_evidence','canon_warehouse_candidate_events',
    'operations_agents','founder_work_items','founder_decisions','operations_commands','operations_outcome_workflow_stage_receipts'].includes(table));
  const definitions=(await client.query("select column_name,is_generated,is_identity from information_schema.columns where table_schema='public'and table_name=$1",[table])).rows;
  const all=definitions.map(r=>r.column_name),virtual=table==='founder_work_items'?['agent_key','evidence']:[];
  assert.ok(Object.keys(record).every(k=>all.includes(k)||virtual.includes(k)),'local_fixture_missing_current_column:'+table);
  const fields=definitions.filter(r=>r.is_generated==='NEVER'&&r.is_identity!=='YES').map(r=>r.column_name);
  const columns=Object.keys(record).filter(k=>fields.includes(k));assert.ok(columns.length);
  return (await client.query(`insert into public.${q(table)}(${columns.map(q).join(',')})
    select ${columns.map(k=>'p.'+q(k)).join(',')}from jsonb_populate_record(null::public.${q(table)},$1::jsonb)p returning to_jsonb(${q(table)})row`,[JSON.stringify(record)])).rows[0].row;
}
async function createDb(database,template){
  assert.ok(dbs.includes(database));assert.ok(template==='stamped_bulk_promotion_registry_qualification_v1'||dbs.includes(template));
  assert.equal((await admin.query('select count(*)::int n from pg_database where datname=$1',[database])).rows[0].n,0,'retain_all_prior_image_labs');
  assert.equal((await admin.query('select count(*)::int n from pg_stat_activity where datname=$1',[template])).rows[0].n,0,'retained_template_must_be_inactive');
  assert.ok(Number((await admin.query('select pg_database_size($1)n',[template])).rows[0].n)<100000000,'fixture_copy_size_ceiling');
  await admin.query('create database '+q(database)+' template '+q(template));report.databases.push(database);
  write('database-'+database+'.json',{database,template,owned_by:'reviewed-stamped-image-publication-qualification-v1',created_at:new Date().toISOString(),retained:true});
}
const loadRelations=async client=>(await client.query("select n.nspname schema,t.relname\"table\"from pg_class t join pg_namespace n on n.oid=t.relnamespace where n.nspname=any($1::text[])and t.relkind in('r','p')order by 1,2",[['public','auth','grookai_square','grookai_inventory','grookai_vendor_pricing']])).rows;
const stageReceipt=async(client,index,status,result)=>insert(client,'operations_outcome_workflow_stage_receipts',{
  command_id:command.id,attempt_number:1,stage_index:index,stage_key:proposal.plan_payload.outcome_workflow.stages[index].stage_key,
  stage_fingerprint:proposal.plan_payload.outcome_workflow.stages[index].stage_fingerprint,status,result:result??{}});

try{
  if(!resumeDir){
  admin=await connect('postgres');await createDb(dbs[0],'stamped_bulk_promotion_registry_qualification_v1');
  c=await connect(dbs[0]);
  assert.equal((await c.query('select count(*)::int n from auth.users')).rows[0].n,1);
  assert.equal((await c.query('select id from auth.users')).rows[0].id,actor);
  assert.equal((await c.query('select count(*)::int n from auth.sessions')).rows[0].n,0);
  relations=await loadRelations(c);
  const inputState=read(input+'/state.private.json'),originalReviews=read(input+'/visual-reviews.private.json'),originalInputs=read(input+'/input.private.json');
  const oldOwner=originalReviews[0].decision.actor_user_id,map=new Map([[oldOwner,actor]]);
  for(const r of originalReviews){map.set(r.task.id,randomUUID());map.set(r.decision.id,randomUUID());}
  const remap=value=>{if(typeof value==='string')return map.get(value)??value;if(Array.isArray(value))return value.map(remap);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v)]));return value;};
  const state=remap(inputState),inputs=remap(originalInputs);reviews=remap(originalReviews);
  await c.query('begin isolation level serializable');
  try{
    // The retained template's PL/pgSQL source uses historical CRLF bodies. The
    // live exact-byte gate correctly rejected it. Install the already reviewed
    // production definitions in this new owned fixture; do not normalize or
    // weaken the comparison, change historical migrations, or modify the template.
    const definitions=[...new Map(warehouseEffects.triggers.map(t=>[t.function_sha256,t.function_definition])).entries()];
    for(const [expected,definition]of definitions){assert.equal(createHash('sha256').update(definition).digest('hex'),expected);await c.query(definition);}
    report.fixture_functions_installed_from_reviewed_bytes=definitions.length;
    await c.query("update auth.users set email='synthetic-reviewed-image-owner@example.invalid'where id=$1",[actor]);
    await c.query("insert into public.user_entitlements(user_id,email,role,is_active)values($1,'synthetic-reviewed-image-owner@example.invalid','founder',true)",[actor]);
    const agentModel=buildFounderOutcomeAgentV1({agentKey:'reviewed-stamped-image-qualification-v1',displayName:'Synthetic reviewed image qualification',domain:'catalog',
      sourceLocator:'scripts/workers/founder_outcome_workflow_executor_v1.mjs',description:'Local synthetic qualification only; no actual founder decision.'});
    const agent=await insert(c,'operations_agents',{...agentModel,allowed_work_item_types:[...new Set(['founder_outcome_workflow',...reviews.map(r=>r.task.work_item_type)])],
      allowed_command_actions:[...new Set([...agentModel.allowed_command_actions,...reviews.map(r=>r.task.action_type)])]});
    await insert(c,'finish_keys',{key:'reverse',label:'Reverse Holo',sort_order:30,is_active:true,meta:{qualification_fixture:true}});
    for(const [table,records]of [['games',state.games],['sets',state.sets],['card_prints',state.parents],['card_printings',state.children],
      ['card_print_identity',state.identities],['card_printing_truth_reviews',state.reviews]])for(const record of records){
      const existing=(await c.query('select to_jsonb(t)row from public.'+q(table)+' t where id=$1',[record.id])).rows[0]?.row;
      if(existing){
        if(table==='games'||table==='sets'){
          for(const key of (table==='games'?['id','code']:['id','code','game','identity_model']))assert.equal(existing[key],record[key],'fixture_existing_set_identity_collision');
        }else same(existing,record,'fixture_existing_id_collision:'+table);
      }else await insert(c,table,record);
    }
    for(const candidate of state.candidates)await insert(c,'canon_warehouse_candidates',candidate);
    for(const evidence of state.evidence)await insert(c,'canon_warehouse_candidate_evidence',evidence);
    for(const event of state.events)await insert(c,'canon_warehouse_candidate_events',event);
    for(const r of reviews){await insert(c,'founder_work_items',{...r.task,agent_id:agent.id,source_run_id:null});await insert(c,'founder_decisions',r.decision);}
    await c.query('commit');
    head=process.env.LOCAL_FIXTURE_SOURCE_HEAD??execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
    assert.match(head,/^[a-f0-9]{40}$/);assert.equal(head,read(input+'/plan.private.json').source_commit_sha,'local_source_base_changed');
    await c.query('begin isolation level repeatable read read only');
    plan=await prepareReviewedImagePublicationPlanV1(c,{sourceCommitSha:head,...inputs});await c.query('commit');
    write('plan.local.private.json',plan);report.plan_fingerprint=plan.fingerprint;report.code_fingerprint=plan.code_binding.fingerprint;
    const releaseEvidence={version:'REVIEWED_STAMPED_IMAGE_SOURCE_RELEASE_V1',source_commit_sha:head,code_fingerprint:plan.code_binding.fingerprint,
      evidence_sha256:hash({synthetic_source_gate_fixture:true}),normal_commit_passed:true,normal_push_passed:true,hosted_checks_passed:true,
      exact_source_review_passed:true,merged_source_checks_passed:true,deployed_readback_passed:true};
    proposal=buildReviewedStampedImageOutcomeWorkItemV1({plan,agentKey:agent.agent_key,releaseEvidence,evidence:[]});
    await c.query('begin');
    const item=await insert(c,'founder_work_items',{...proposal,agent_id:agent.id,version:1,state:'running',
      payload_sha256:hash(proposal),state_reason:'synthetic_qualification_only',decided_at:new Date().toISOString()});
    const decision=await insert(c,'founder_decisions',{work_item_id:item.id,actor_user_id:actor,decision:'approve',expected_version:1,
      expected_fingerprint:item.plan_fingerprint,client_schema_version:'SYNTHETIC_LOCAL_IMAGE_QUALIFICATION_V1',idempotency_key:randomUUID()});
    command=await insert(c,'operations_commands',{command_key:'synthetic-image:'+randomUUID(),work_item_id:item.id,decision_id:decision.id,agent_id:agent.id,
      action_type:item.action_type,status:'running',frozen_scope:{scope:item.scope,exclusions:item.exclusions,plan_payload:item.plan_payload,payload_sha256:item.payload_sha256},
      plan_fingerprint:item.plan_fingerprint,executor_version:item.executor_version,cost_ceiling_usd:0,execution_deadline_at:plan.expires_at,
      lease_token:randomUUID(),leased_by:FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_KEY,lease_expires_at:new Date(Date.now()+1800000).toISOString(),attempt_count:1,max_attempts:1});
    for(const index of [0,1]){await stageReceipt(c,index,'started',{});await stageReceipt(c,index,'succeeded',{reconciled:true,plan_fingerprint:plan.fingerprint,
      verified:33,new_objects:33,maximum_new_bytes:2381453,overwrite:false});}
    await stageReceipt(c,2,'started',{});await c.query('commit');await c.end();c=null;
    for(const database of dbs.slice(1))await createDb(database,dbs[0]);
  }catch(error){await c?.query('rollback').catch(()=>{});throw error;}
  }else{
    // Resume only the proved, untouched setup from the old error-message
    // assertion. No canonical attempt or stage has run. Do not reset a lab,
    // replay a consumed executor, refresh a plan, or change any stored authority.
    const previous=read(resumeDir+'/result.json');assert.equal(previous.pass,false);
    same(previous.databases,dbs,'owned_resume_database_scope_changed');
    same(previous.cases,['actual33_original_bytes_decode_immutable_copy_readback_and_zero_write_storage_replay',
      'real_postgresql_readonly_preflight_all_relations_exact'],'resume_only_before_any_domain_execution');
    assert.match(previous.failure?.message??'',/canonical_image_database_required/);
    plan=read(resumeDir+'/plan.local.private.json');same(plan.code_binding,reviewedStampedImageCodeBindingV1(),'resume_source_changed');
    head=plan.source_commit_sha;report.plan_fingerprint=plan.fingerprint;report.code_fingerprint=plan.code_binding.fingerprint;
    const expected=read(resumeDir+'/before.private.json');
    for(const db of dbs){const verify=await connect(db);try{relations=await loadRelations(verify);same(await snapshot(verify),expected,'unconsumed_fixture_changed:'+db);
      await assertReviewedImagePlanBeforeV1(verify,plan);}finally{await verify.end();}}
    c=await connect(dbs[0]);
    const commands=(await c.query('select to_jsonb(t)row from public.operations_commands t')).rows.map(r=>r.row);assert.equal(commands.length,1);command=commands[0];
    assert.ok(Date.parse(command.lease_expires_at)>Date.now()+120000,'unconsumed_synthetic_lease_must_still_be_live');
    proposal={plan_payload:command.frozen_scope.plan_payload};
    const first=plan.items.find(i=>i.metadata.visual_review_reference.kind==='authenticated_founder_operations_decision').metadata.visual_review_reference;
    reviews=[{decision:(await c.query('select to_jsonb(t)row from public.founder_decisions t where id=$1',[first.decision_id])).rows[0].row}];
    await c.end();c=null;report.databases=[...dbs];report.resumed_unconsumed_fixture=true;report.no_database_reset_or_authority_change=true;
    report.original_failed_evidence=path.basename(resumeDir);write('resumed-plan.local.private.json',plan);
  }
    const originals=new Map(),derived=new Map();
    for(const i of plan.items){const bytes=fs.readFileSync(path.resolve(input,'../reviewed-card-plane-preparation-20261127-v2/derived-assets/'+i.printing_id+'.jpg'));
      originals.set(i.prepared_asset.source_refs.front_storage_path,bytes);}
    let storageWrites=0;const fakeSdk={storage:{getBucket:async()=>({data:{public:false},error:null}),from:()=>({
      async download(p){const bytes=originals.get(p)??derived.get(p);return bytes?{data:new Blob([bytes]),error:null}:{data:null,error:{statusCode:'404',message:'Object not found'}};},
      async upload(p,bytes,options){assert.equal(options.upsert,false);assert.ok(!originals.has(p));assert.ok(!derived.has(p));storageWrites++;derived.set(p,Buffer.from(bytes));return {data:{path:p},error:null};}
    })}};
    const storage=await prepareReviewedImageStorageV1(fakeSdk,plan,{upload:true});assert.equal(storage.created,33);assert.equal(storageWrites,33);
    const storageReplay=await prepareReviewedImageStorageV1(fakeSdk,plan,{upload:true});assert.equal(storageReplay.created,0);assert.equal(storageWrites,33);
    report.cases.push('actual33_original_bytes_decode_immutable_copy_readback_and_zero_write_storage_replay');
    await assert.rejects(prepareReviewedImageStorageV1({storage:{...fakeSdk.storage,getBucket:async()=>({data:{public:true},error:null})}},plan,{upload:true}),/image_bucket_must_remain_private/);
    const first=plan.items[0].prepared_asset.asset.storage_path,wrong=Buffer.from(derived.get(first));wrong[100]^=1;
    const corruptSdk={storage:{...fakeSdk.storage,from:()=>({...fakeSdk.storage.from(),download:async p=>p===first?{data:new Blob([wrong]),error:null}:fakeSdk.storage.from().download(p)})}};
    await assert.rejects(prepareReviewedImageStorageV1(corruptSdk,plan,{upload:true}),/original_hash_changed/);assert.equal(storageWrites,33);
    const unavailableSdk={storage:{...fakeSdk.storage,from:()=>({...fakeSdk.storage.from(),download:async p=>p===first?{data:null,error:{statusCode:'500'}}:fakeSdk.storage.from().download(p)})}};
    await assert.rejects(prepareReviewedImageStorageV1(unavailableSdk,plan,{upload:true}),/image_storage_error_requires_reconciliation/);assert.equal(storageWrites,33);
    report.cases.push('private_bucket_and_contradictory_or_uncertain_object_checks_never_overwrite');
    const ambiguousObjects=new Map();let ambiguousWrites=0;
    const ambiguousSdk={storage:{getBucket:fakeSdk.storage.getBucket,from:()=>({
      async download(p){const bytes=originals.get(p)??ambiguousObjects.get(p);return bytes?{data:new Blob([bytes]),error:null}:{data:null,error:{statusCode:'404'}};},
      async upload(p,bytes,options){assert.equal(options.upsert,false);assert.ok(!ambiguousObjects.has(p));ambiguousWrites++;ambiguousObjects.set(p,Buffer.from(bytes));return {data:null,error:{statusCode:'500',message:'Synthetic acknowledgement loss after actual immutable copy'}};}
    })}};
    const ambiguous=await prepareReviewedImageStorageV1(ambiguousSdk,plan,{upload:true});assert.equal(ambiguousWrites,33);
    assert.equal(ambiguous.ambiguous_uploads_reconciled,33);assert.equal(ambiguous.upload_attempts,33);assert.equal(ambiguous.created,0);
    report.cases.push('ambiguous_uploads_reconcile_exact_bytes_without_a_second_write');
    let simulatedPublicReads=0;
    const publicResult=await verifyReviewedImagePublicBytesV1(plan,{fetchImpl:async(url,options)=>{
      assert.equal(url.origin,'https://grookaivault.com');assert.equal(options.headers,undefined);simulatedPublicReads++;
      const gv=decodeURIComponent(url.pathname.split('/').at(-2)),t=scope.targets.find(t=>t.printing_gv_id===gv);assert.ok(t);
      return new Response(originals.get(plan.items.find(i=>i.printing_id===t.printing_id).prepared_asset.source_refs.front_storage_path),{status:200,headers:{'content-type':'image/jpeg'}});
    }});assert.equal(publicResult.public_byte_verified,33);assert.equal(simulatedPublicReads,33);
    report.simulated_public_route_reads=simulatedPublicReads;report.cases.push('public_verifier_accepts_all33_exact_originals_without_service_headers_in_owned_fixture');
    const authority={commandId:command.id,leaseToken:command.lease_token,headSha:head};
    c=await connect(dbs[0]);audit=await connect(dbs[0]);adversary=await connect(dbs[0]);
    const before=await snapshot(audit);write('before.private.json',before);
    const opts={c,audit,plan,authority,normalizationPackages:storage.packages,qualification:true};
    await run(opts);same(await snapshot(audit),before,'preflight_wrote_rows');report.cases.push('real_postgresql_readonly_preflight_all_relations_exact');
    await assert.rejects(run({...opts,mode:'rollback',apply:true,qualification:false}),error=>
      error instanceof assert.AssertionError&&error.actual===database&&error.expected==='postgres');
    same(await snapshot(audit),before);report.cases.push('synthetic_target_cannot_enter_production_path');
    await assert.rejects(run({...opts,mode:'rollback',apply:true,authority:{...authority,leaseToken:randomUUID()}}));
    same(await snapshot(audit),before);report.cases.push('wrong_actual_lease_stops_before_domain_writes');
    await c.query('begin isolation level serializable');
    await stageReceipt(c,3,'started',{});
    await assert.rejects(applyReviewedImagesWithinTransactionV1(c,{...opts,qualification:true}),/previous_image_stage_not_completed/);
    await c.query('rollback');report.cases.push('apply_requires_actual_successful_full_rollback_stage');
    const baseline=await snapshot(audit);
    await c.query('begin');await c.query("update public.card_printings set image_note='synthetic unexpected drift'where id=$1",[scope.targets[0].printing_id]);
    await assert.rejects(assertReviewedImagePlanBeforeV1(c,plan),/image_before_state_changed/);await c.query('rollback');
    same(await snapshot(audit),baseline);report.cases.push('current_full_row_drift_blocks_preparation');
    await c.query('begin');
    const sample=reviews[0];await insert(c,'founder_decisions',{...sample.decision,id:randomUUID(),decision:'add_note',note:'Synthetic contradictory number',idempotency_key:randomUUID()});
    await assert.rejects(assertReviewedImagePlanBeforeV1(c,plan),/original_visual_decision_history_changed/);await c.query('rollback');
    report.cases.push('later_review_note_is_not_silently_consumed');
    await c.query('begin');
    await c.query("create function public.qualification_image_guard_probe_v1()returns trigger language plpgsql as $fn$begin return new;end;$fn$");
    await c.query('create trigger qualification_image_guard_probe_v1 before update on public.card_printings for each row execute function public.qualification_image_guard_probe_v1()');
    await assert.rejects(assertReviewedImagePlanBeforeV1(c,plan),/warehouse_recursive_trigger_effects_changed/);await c.query('rollback');report.cases.push('unreviewed_real_trigger_blocks_before_any_image_mutation');
    const postSetup=await snapshot(audit);
    await adversary.query('begin');await adversary.query('select pg_advisory_xact_lock(hashtext($1))',['REVIEWED_STAMPED_IMAGE_PUBLICATION_V1']);
    await assert.rejects(run({...opts,mode:'rollback',apply:true}),/competing_image_publication/);await adversary.query('rollback');
    same(await snapshot(audit),postSetup);report.cases.push('competing_programme_lock_blocks_domain_writes');
    const proxy=fn=>({connection:c.connection,connectionParameters:c.connectionParameters,query:fn});
    for(const [name,match,ordinal]of [
      ['seventeenth_image_SQL_failure',sql=>/update\s+public\.card_printings\s+set/i.test(sql),17],
      ['final_durable_receipt_SQL_failure',(sql,args)=>/^insert into public\.canon_warehouse_candidate_events/i.test(sql.trim())&&args?.[1]==='REVIEWED_STAMPED_IMAGE_PUBLICATION_RECEIPT_V1',1],
    ]){let hits=0;const wrapped=proxy(async(...args)=>{if(match(args[0],args[1])&&++hits===ordinal)return c.query('select 1/0');return c.query(...args);});
      await assert.rejects(run({...opts,c:wrapped,mode:'rollback',apply:true}));assert.equal(hits,ordinal);same(await snapshot(audit),postSetup,name+' left a partial effect');report.cases.push(name+'_rolls_back_every_protected_relation');}
    const rollback=await run({...opts,mode:'rollback',apply:true});assert.equal(rollback.images_exercised,33);same(await snapshot(audit),postSetup);write('rollback.private.json',rollback);
    report.cases.push('complete33_staging_execution_and166_events_rollback_exactly');
    await stageReceipt(c,2,'succeeded',rollback);await stageReceipt(c,3,'started',{});
    const applyBefore=await snapshot(audit);let uncertain;
    const lost=proxy(async(...args)=>{const result=await c.query(...args);if(args[0]==='commit')throw Error('Synthetic lost actual image COMMIT acknowledgement');return result;});
    try{await run({...opts,c:lost,mode:'apply',apply:true});}catch(error){uncertain=error;}
    assert.equal(uncertain?.commit_uncertain,true);assert.equal(uncertain?.automatic_retry_allowed,false);
    const recovered=await reconcile({audit,plan,authority,mode:'apply',error:uncertain,qualification:true});assert.equal(recovered.unknown_commit_reconciled,true);write('unknown-commit-recovered.json',recovered);
    const after=await snapshot(audit),changed=Object.keys(after.tables).filter(t=>hash(after.tables[t])!==hash(applyBefore.tables[t]));
    same(changed.sort(),['public.card_printings','public.canon_warehouse_candidates','public.canon_warehouse_candidate_events','public.canon_warehouse_promotion_staging'].sort(),'only_four_domain_relations_may_change');
    same(after.sequences,applyBefore.sequences,'image_mutation_must_not_advance_sequences');write('after.private.json',after);
    for(let count=0;count<2;count++){const result=await run({...opts,c:audit,mode:'readback'});assert.equal(result.write_count,0);same(await snapshot(audit),after);}
    report.cases.push('actual_commit_unknown_ack_recovers_independently_with_zero_write_receipt_replay');
    let publicFailure,failedPublicReads=0;
    try{await verifyReviewedImagePublicBytesV1(plan,{fetchImpl:async()=>{failedPublicReads++;return new Response(null,{status:503});}});}
    catch(error){publicFailure=error;}
    assert.ok(publicFailure);assert.equal(failedPublicReads,3);
    const failedPublic=reviewedImageStageFailureSummaryV1({error:publicFailure,knownCommitted:true,planFingerprint:plan.fingerprint});
    assert.equal(failedPublic.committed,true);assert.equal(failedPublic.commit_uncertain,false);assert.equal(failedPublic.automatic_retry_allowed,false);
    same(await snapshot(audit),after);write('committed-public-verification-failure.json',failedPublic);
    report.cases.push('failed_public_readback_preserves_known_commit_and_every_relation_without_apply_retry');
    await assert.rejects(run({...opts,mode:'apply',apply:true}),/image_before_state_changed/);same(await snapshot(audit),after);report.cases.push('consumed_publication_cannot_apply_again');
    for(const database of dbs.slice(1)){
      const local=await connect(database),independent=await connect(database),base=await snapshot(independent);
      try{
        const options={...opts,c:local,audit:independent};
        if(database.endsWith('_rollback_loss')){
          const wrapped={connection:local.connection,connectionParameters:local.connectionParameters,async query(...args){const r=await local.query(...args);if(args[0]==='rollback')throw Error('Synthetic lost real ROLLBACK acknowledgement');return r;}};
          let error;try{await run({...options,c:wrapped,mode:'rollback',apply:true});}catch(e){error=e;}
          assert.equal(error?.rollback_uncertain,true);const result=await reconcile({audit:independent,plan,authority,mode:'rollback',error,qualification:true});
          assert.equal(result.rollback_acknowledgement_reconciled,true);same(await snapshot(independent),base);write('unknown-rollback-recovered.json',result);
          report.cases.push('lost_real_rollback_acknowledgement_reconciles_complete_rollback_without_reexecution');
        }else{
          const proof=await run({...options,mode:'rollback',apply:true});await stageReceipt(local,2,'succeeded',proof);await stageReceipt(local,3,'started',{});
          const current=await snapshot(independent);let error;
          const wrapped={connection:local.connection,connectionParameters:local.connectionParameters,async query(...args){if(args[0]==='commit')throw Error('Synthetic COMMIT never reached PostgreSQL');return local.query(...args);}};
          try{await run({...options,c:wrapped,mode:'apply',apply:true});}catch(e){error=e;}
          assert.equal(error?.commit_uncertain,true);await assert.rejects(reconcile({audit:independent,plan,authority,mode:'apply',error,qualification:true}),/one_durable_image_receipt_required/);
          same(await snapshot(independent),current);report.cases.push('missing_commit_receipt_stops_without_any_apply_retry');
        }
      }finally{await local.end();await independent.end();}
    }
    report.relations_verified=relations.length;report.changed_domain_tables=changed;report.images_committed_in_owned_fixture=33;
    report.local_storage_objects=storageWrites;report.HTTP_requests=networkCalls;assert.equal(networkCalls,0);
    same(reviewedStampedImageCodeBindingV1(),plan.code_binding,'source_changed_during_whole_qualification');report.pass=true;
}catch(error){report.failure={message:error.message,stack:error.stack};throw error;}
finally{report.finished_at=new Date().toISOString();write('result.json',report);for(const client of [c,audit,adversary,admin])await client?.end().catch(()=>{});
  console.log(JSON.stringify({pass:report.pass,cases:report.cases.length,relations:report.relations_verified,databases:report.databases,production_writes:0,actual_founder_approval:false,out}));}
