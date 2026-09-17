import assert from 'node:assert/strict';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';
import {assertMasterPrintingAuthority} from './master_index_printing_authority_v1.mjs';
import {PRINTING_REPAIR_PLAN_VERSION} from './master_index_printing_repair_plan_v1.mjs';

export const EXECUTION_VERSION='MASTER_INDEX_PRINTING_EXECUTION_V1';
export const PROJECT='ycdxbpibncqcchqiihfz';
const tables=['card_printings','card_printing_truth_reviews','raw_imports'];
const childFields=['id','card_print_id','finish_key','printing_gv_id','is_provisional','provenance_source','provenance_ref','created_by'];
const reviewFields=['id','card_printing_id','review_status','public_visibility','active','confidence','reason','evidence_sources_checked','evidence_sources_for_finish','expected_finish_keys','evidence','source_report_path','reviewed_by','reviewed_at'];
const rawFields=['id','source','status','notes','payload'];
const sorted=rows=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
const project=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]]));
const uuid=value=>{const h=hash({version:EXECUTION_VERSION,value});return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};

export function freezePrintingExecution({candidate,manifest,artifacts,parents,schema,protectedFootprints}) {
  assertMasterPrintingAuthority(manifest,artifacts);
  const {fingerprint,...body}=candidate;
  assert.equal(hash(body),fingerprint,'Candidate fingerprint drift');
  assert.equal(candidate.version,PRINTING_REPAIR_PLAN_VERSION);
  assert.equal(candidate.manifest_fingerprint,manifest.fingerprint);
  // The first execution lane is deliberately limited to the reviewed base-release repair.
  assert.equal(manifest.game,'pokemon');assert.equal(manifest.language,'en');assert.equal(manifest.set_code,'mcd21');
  assert.equal(manifest.authority.set_id,'05b97782-d4b8-49eb-8030-7f990cdd6776');
  assert.deepEqual(candidate.expected_mutation_counts,{raw_evidence_inserts:1,printing_inserts:25,provenance_updates:25,review_inserts:50});
  assert.equal(parents.length,25);
  for(const expected of manifest.parents) {
    const actual=parents.find(p=>p.id===expected.id);assert.ok(actual);
    for(const key of ['id','set_id','gv_id','name','identity_domain','variant_key','printed_identity_modifier'])assert.equal(actual[key],expected[key]);
    assert.equal(String(actual.number),expected.printed_coordinate);
  }
  const review=JSON.parse(artifacts.get(manifest.authority.review.ref).toString());
  const rawId=`-${BigInt('0x'+hash({candidate:fingerprint,version:EXECUTION_VERSION}).slice(0,15))}`;
  const ref=`raw_imports:${rawId}|master-index:${manifest.fingerprint}`;
  const children=sorted(candidate.printing_inserts.map(p=>({...p,provenance_source:EXECUTION_VERSION,provenance_ref:ref,created_by:EXECUTION_VERSION})));
  const updates=candidate.provenance_updates.map(p=>({...p,patch:{provenance_source:EXECUTION_VERSION,provenance_ref:ref}}));
  const reviews=sorted(candidate.review_inserts.map(r=>({...r,id:uuid(`review:${manifest.fingerprint}:${r.card_printing_id}`),
    evidence:{...r.evidence,raw_import_id:rawId},source_report_path:ref,reviewed_by:EXECUTION_VERSION,reviewed_at:new Date(review.reviewed_at).toISOString()})));
  const raw={id:rawId,source:EXECUTION_VERSION,status:'processed',notes:'Reviewed McDonalds 2021 English base printings; preserve all existing identities and images.',
    payload:{version:EXECUTION_VERSION,master_manifest:manifest,review,source_artifact_bindings:manifest.authority.source_artifacts,candidate_fingerprint:fingerprint}};
  const plan={version:EXECUTION_VERSION,project_ref:PROJECT,set_id:manifest.authority.set_id,set_code:'mcd21',candidate_fingerprint:fingerprint,
    manifest_fingerprint:manifest.fingerprint,parents_before:sorted(parents),parents_sha256:hash(sorted(parents)),
    children_before:sorted(updates.map(p=>p.before)),schema,schema_sha256:hash(schema),protected_footprints:protectedFootprints,
    children,reviews,updates,raw,expected:{parents:25,printings:50,normal:25,holo:25,reverse:0,printing_inserts:25,provenance_updates:25,reviews:50,raw:1},
    boundaries:{parent_writes:0,ownership_writes:0,mapping_writes:0,pricing_writes:0,image_writes:0,deletes:0,other_set_writes:0}};
  plan.fingerprint=hash(plan);assertPrintingExecution(plan,plan.fingerprint);return plan;
}

export function assertPrintingExecution(plan,expectedFingerprint) {
  const {fingerprint,...body}=plan;assert.equal(fingerprint,expectedFingerprint);assert.equal(hash(body),fingerprint,'Execution fingerprint drift');
  assert.equal(plan.version,EXECUTION_VERSION);assert.equal(plan.project_ref,PROJECT);assert.equal(plan.set_code,'mcd21');
  assert.equal(plan.set_id,'05b97782-d4b8-49eb-8030-7f990cdd6776');
  assert.equal(hash(plan.schema),plan.schema_sha256);assert.equal(hash(plan.parents_before),plan.parents_sha256);
  assert.deepEqual(plan.expected,{parents:25,printings:50,normal:25,holo:25,reverse:0,printing_inserts:25,provenance_updates:25,reviews:50,raw:1});
  assert.deepEqual(plan.boundaries,{parent_writes:0,ownership_writes:0,mapping_writes:0,pricing_writes:0,image_writes:0,deletes:0,other_set_writes:0});
  assert.equal(plan.parents_before.length,25);assert.equal(new Set(plan.parents_before.map(p=>p.id)).size,25);
  assert.equal(plan.children_before.length,25);assert.equal(plan.updates.length,25);assert.equal(plan.children.length,25);assert.equal(plan.reviews.length,50);
  const parents=new Map(plan.parents_before.map(p=>[p.id,p]));
  const ref=`raw_imports:${plan.raw.id}|master-index:${plan.manifest_fingerprint}`;
  assert.match(plan.raw.id,/^-\d+$/);assert.equal(plan.raw.source,EXECUTION_VERSION);assert.equal(plan.raw.status,'processed');
  assert.equal(plan.raw.payload.master_manifest.fingerprint,plan.manifest_fingerprint);
  for(const child of plan.children) {
    assert.deepEqual(Object.keys(child).sort(),[...childFields].sort());
    assert.equal(child.finish_key,'holo');assert.equal(child.is_provisional,false);
    assert.equal(child.printing_gv_id,`${parents.get(child.card_print_id)?.gv_id}-HOLO`);
    assert.equal(child.provenance_ref,ref);assert.equal(child.provenance_source,EXECUTION_VERSION);assert.equal(child.created_by,EXECUTION_VERSION);
  }
  for(const update of plan.updates) {
    const before=plan.children_before.find(p=>p.id===update.printing_id);assert.deepEqual(before,update.before);
    assert.equal(hash(before),update.before_sha256);assert.equal(before.finish_key,'normal');assert.equal(before.is_provisional,false);
    assert.equal(before.printing_gv_id,`${parents.get(before.card_print_id)?.gv_id}-STD`);
    assert.ok(before.provenance_source==null||before.provenance_source==='');assert.ok(before.provenance_ref==null||before.provenance_ref==='');
    assert.deepEqual(update.patch,{provenance_source:EXECUTION_VERSION,provenance_ref:ref});
  }
  const all=[...plan.children_before,...plan.children];
  assert.equal(new Set(all.map(p=>p.id)).size,50);assert.equal(new Set(all.map(p=>`${p.card_print_id}|${p.finish_key}`)).size,50);
  for(const p of parents.values())assert.equal(all.filter(c=>c.card_print_id===p.id).length,2);
  assert.equal(new Set(plan.reviews.map(r=>r.id)).size,50);
  for(const p of all) {
    const matching=plan.reviews.filter(r=>r.card_printing_id===p.id);assert.equal(matching.length,1);
    const r=matching[0];assert.deepEqual(Object.keys(r).sort(),[...reviewFields].sort());
    assert.equal(r.review_status,'verified');assert.equal(r.active,true);assert.equal(r.public_visibility,'visible');
    assert.equal(r.evidence.card_print_id,p.card_print_id);assert.equal(r.evidence.finish_key,p.finish_key);assert.equal(r.evidence.raw_import_id,plan.raw.id);
    assert.deepEqual(r.expected_finish_keys,['holo','normal']);
  }
}

export async function readExecutionSchema(client) {
  const columns=(await client.query(`select table_name,column_name,data_type,is_nullable,column_default,is_generated,generation_expression from information_schema.columns
    where table_schema='public' and table_name=any($1::text[]) order by table_name,ordinal_position`,[tables])).rows;
  const constraints=(await client.query(`select c.relname "table",k.conname name,pg_get_constraintdef(k.oid) definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1::text[]) order by c.relname,k.conname`,[tables])).rows;
  const indexes=(await client.query(`select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename=any($1::text[]) order by tablename,indexname`,[tables])).rows;
  const triggers=(await client.query(`select c.relname "table",t.tgname name,t.tgenabled enabled,pg_get_triggerdef(t.oid) definition,pg_get_functiondef(t.tgfoid) function_definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1::text[]) and not t.tgisinternal order by c.relname,t.tgname`,[tables])).rows;
  const rules=(await client.query("select schemaname,tablename,rulename,definition from pg_rules where schemaname='public' and tablename=any($1::text[]) order by tablename,rulename",[tables])).rows;
  const public_rpc=(await client.query("select pg_get_functiondef('public.get_public_card_printing_options_v1(uuid[],integer,integer)'::regprocedure) definition")).rows;
  return {columns,constraints,indexes,triggers,rules,public_rpc};
}

export async function readPrintingExecutionState(client,plan) {
  const parentIds=plan.parents_before.map(p=>p.id),childIds=[...plan.children_before,...plan.children].map(p=>p.id);
  const rows=async(sql,args)=>(await client.query(sql,args)).rows.map(r=>r.row);
  const parents=await rows('select to_jsonb(p) row from public.card_prints p where set_id=$1 order by id',[plan.set_id]);
  const children=await rows(`select to_jsonb(p) row from public.card_printings p where card_print_id=any($1::uuid[]) or id=any($2::uuid[]) or printing_gv_id=any($3::text[]) order by id`,[parentIds,childIds,plan.children.map(p=>p.printing_gv_id)]);
  const reviews=await rows('select to_jsonb(r) row from public.card_printing_truth_reviews r where card_printing_id=any($1::uuid[]) or id=any($2::uuid[]) order by id',[childIds,plan.reviews.map(r=>r.id)]);
  const raw=await rows("select (to_jsonb(r)-'id')||jsonb_build_object('id',r.id::text) row from public.raw_imports r where id=$1::bigint",[plan.raw.id]);
  const footprints=[];
  // Full row digests stay in Postgres; no collector identifiers leave the database.
  for(const [table,column,ids] of [['vault_item_instances','card_print_id',parentIds],['binder_custom_slots','card_printing_id',childIds],
    ['vault_item_instance_dispositions','card_print_id',parentIds],['external_mappings','card_print_id',parentIds],['external_printing_mappings','card_printing_id',childIds]]) {
    const r=(await client.query(`select count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by t.id),'')) digest from public.${table} t where ${column}=any($1::uuid[])`,[ids])).rows[0];
    footprints.push({table,...r});
  }
  return {parents,children,reviews,raw,footprints};
}

export function classifyPrintingExecution(plan,state) {
  assert.equal(hash(state.parents),plan.parents_sha256,'Parent drift');
  if(state.raw.length===0&&state.reviews.length===0) {
    assert.deepEqual(state.children,plan.children_before,'Existing children drift/collision');return 'before';
  }
  const existing=state.children.filter(p=>plan.children_before.some(b=>b.id===p.id));
  assert.deepEqual(existing,sorted(plan.updates.map(p=>({...p.before,...p.patch}))),'Existing row changed outside provenance');
  const inserted=state.children.filter(p=>!plan.children_before.some(b=>b.id===p.id));
  assert.deepEqual(inserted.map(p=>project(p,childFields)),plan.children,'Inserted child collision or partial state');
  for(const p of inserted)for(const field of ['image_source','image_path','image_url','image_alt_url','image_status','image_note'])assert.equal(p[field],null,'Unexpected inserted image evidence');
  const reviewRows=state.reviews.map(r=>({...project(r,reviewFields),reviewed_at:new Date(r.reviewed_at).toISOString()}));
  assert.deepEqual(reviewRows,plan.reviews,'Review collision or partial state');
  assert.deepEqual(state.raw.map(r=>project(r,rawFields)),[plan.raw],'Raw evidence collision or partial state');
  return 'exact';
}

export async function executePrintingRepair({client,plan,expectedFingerprint,mode,beforeCommit=async()=>{}}) {
  assertPrintingExecution(plan,expectedFingerprint);assert.ok(['preflight','rollback','apply','readback'].includes(mode));
  let commitAttempted=false,committed=false;
  try {
    await client.query(`begin isolation level serializable${['preflight','readback'].includes(mode)?' read only':''}`);
    await client.query("set local lock_timeout='3s'");await client.query("set local statement_timeout='45s'");
    if(['rollback','apply'].includes(mode)) {
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`${EXECUTION_VERSION}:${plan.set_id}`]);
      await client.query('select id from public.card_prints where set_id=$1 order by id for update',[plan.set_id]);
      await client.query('select id from public.card_printings where card_print_id=any($1::uuid[]) order by id for update',[plan.parents_before.map(p=>p.id)]);
    }
    assert.equal(hash(await readExecutionSchema(client)),plan.schema_sha256,'Schema/side-effect drift');
    assert.equal(plan.schema.rules.length,0,'Rewrite rules require separate review');
    assert.ok(plan.schema.triggers.every(t=>t.table==='card_printing_truth_reviews'&&t.name==='trg_card_printing_truth_reviews_updated_at_v1'&&/BEFORE UPDATE/.test(t.definition)),'Unreviewed trigger side effect');
    const before=await readPrintingExecutionState(client,plan),classification=classifyPrintingExecution(plan,before);
    if(classification==='before')assert.deepEqual(before.footprints,plan.protected_footprints,'Dependency footprint drift');
    if(mode==='readback')assert.equal(classification,'exact');
    const writes={raw:0,printing_inserts:0,provenance_updates:0,reviews:0};
    if(classification==='before'&&['rollback','apply'].includes(mode)) {
      const finishes=(await client.query("select key from public.finish_keys where key in ('normal','holo') and is_active order by key")).rows;
      assert.deepEqual(finishes.map(f=>f.key),['holo','normal']);
      const r=plan.raw;
      writes.raw=(await client.query('insert into public.raw_imports(id,source,status,notes,payload) values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)])).rowCount;
      for(const update of plan.updates) {
        const r=await client.query('update public.card_printings p set provenance_source=$2,provenance_ref=$3 where id=$1 and to_jsonb(p)=$4::jsonb',[update.printing_id,update.patch.provenance_source,update.patch.provenance_ref,JSON.stringify(update.before)]);
        assert.equal(r.rowCount,1,'Compare-and-swap drift');writes.provenance_updates+=r.rowCount;
      }
      for(const [table,fields,rows,key] of [['card_printings',childFields,plan.children,'printing_inserts'],['card_printing_truth_reviews',reviewFields,plan.reviews,'reviews']]) {
        writes[key]=(await client.query(`insert into public.${table}(${fields.join(',')}) select ${fields.join(',')} from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,[JSON.stringify(rows)])).rowCount;
      }
      assert.deepEqual(writes,{raw:1,printing_inserts:25,provenance_updates:25,reviews:50});
    }
    const after=await readPrintingExecutionState(client,plan),afterClass=classifyPrintingExecution(plan,after);
    assert.deepEqual(after.footprints,before.footprints,'Dependent records changed');
    if(mode!=='preflight'||classification==='exact') {
      assert.equal(afterClass,'exact');
      const options=(await client.query('select id,card_print_id,finish_key,printing_gv_id,finish_is_active from public.get_public_card_printing_options_v1($1::uuid[],1000,0) order by id',[plan.parents_before.map(p=>p.id)])).rows;
      const expected=sorted([...plan.children_before,...plan.children]).map(p=>({id:p.id,card_print_id:p.card_print_id,finish_key:p.finish_key,printing_gv_id:p.printing_gv_id,finish_is_active:true}));
      assert.deepEqual(options,expected,'Public printing option mismatch');
    }
    const result={version:EXECUTION_VERSION,mode,fingerprint:plan.fingerprint,before:classification,after:afterClass,writes,exact_readback:afterClass==='exact',dependencies_preserved:true};
    if(mode==='apply') {await beforeCommit(result);commitAttempted=true;await client.query('commit');committed=true;}
    else await client.query('rollback');
    if(mode==='rollback') {assert.deepEqual(await readPrintingExecutionState(client,plan),before,'Rollback verification mismatch');result.rollback_proven=true;}
    return {...result,committed,commit_uncertain:false};
  } catch(error) {
    error.rollback_uncertain=false;
    await client.query('rollback').catch(()=>{error.rollback_uncertain=true;});
    error.commit_uncertain=commitAttempted&&!committed;throw error;
  }
}
