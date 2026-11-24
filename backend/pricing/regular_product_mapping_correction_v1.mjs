import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {repairCodeBindingV1 as predecessorBinding,readRepairSchemaV1,readOperatorReleaseGateV1} from './fighting_regular_mapping_repair_v1.mjs';
import {exInsertEffectProofV1} from '../catalog/ex_intrinsic_printing_execution_v1.mjs';
import {assertStampSource7da8RunV1} from './stamp_source_7da8_context_v1.mjs';

export {readRepairSchemaV1,readOperatorReleaseGateV1};
export const VERSION='REGULAR_PRODUCT_MAPPING_CORRECTION_V1';
export const PROJECT='ycdxbpibncqcchqiihfz';
export const CONTEXT='REGULAR_PRODUCT_29_SCHEMA523_SOURCE7DA8_V1';
export const QUALIFICATION_DATABASE='regular_product_mapping_29_qualification_523_v1';
export const MAPPING_METHOD='reviewed_regular_product_coordinate_v1';
const root=fileURLToPath(new URL('../../',import.meta.url)),folder='docs/catalog/regular_product_mapping_correction_v1';
const freeze=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;};
export const REGISTRY=freeze(JSON.parse(fs.readFileSync(path.join(root,folder,'index.json'))));
const {fingerprint,...registryBody}=REGISTRY;
assert.equal(hash(registryBody),fingerprint);
assert.equal(fingerprint,'765fd5b92d99a906ac969ac2dd042e711f6caa51325cc420ab567c4f3003429b');
assert.equal(REGISTRY.targets.length,29);
export const PARENTS=REGISTRY.parents;
export const MAPPING_IDS=Object.freeze(REGISTRY.targets.map(t=>t.mapping_id));
export const PRODUCTS=Object.freeze(REGISTRY.targets.map(t=>t.product_id));
const stampProducts=REGISTRY.targets.map(t=>t.stamp.tcgplayer_id).filter(Boolean);
const allProducts=[...new Set([...PRODUCTS.map(String),...stampProducts.map(String)])];
export const RAW_ID='-'+BigInt('0x'+hash({version:VERSION,mappings:MAPPING_IDS}).slice(0,15));
export const EXPECTED=Object.freeze({raw_inserts:1,mapping_updates:29});
export const BOUNDARIES=Object.freeze({other_existing_row_updates:0,deletes:0,parent_writes:0,printing_writes:0,identity_writes:0,alias_writes:0,owner_writes:0,price_writes:0,assignment_writes:0,source_observation_writes:0,schema_writes:0});
const sha=b=>createHash('sha256').update(b).digest('hex');
const same=(a,b,message)=>assert.equal(hash({value:a}),hash({value:b}),message);
const project=(r,keys)=>Object.fromEntries(keys.map(k=>[k,r[k]]));
const rows=async(c,sql,args=[])=>(await c.query(sql,args)).rows;
const jsonRows=async(c,sql,args=[])=>(await rows(c,sql,args)).map(r=>r.row);
const identifier=s=>{assert.match(s,/^[a-z0-9_]+$/);return '"'+s+'"';};
const target=m=>MAPPING_IDS.includes(String(m.id));
const rawFields=['id','source','status','notes','payload'];

export function repairCodeBindingV1(){
 const files=[...predecessorBinding().files];
 for(const file of ['backend/pricing/regular_product_mapping_correction_v1.mjs','scripts/audits/regular_product_mapping_correction_v1.mjs',folder+'/index.json',folder+'/schema523.json','docs/contracts/REGULAR_PRODUCT_MAPPING_CORRECTION_V1.md'])files.push({file,sha256:sha(fs.readFileSync(path.join(root,file)))});
 assert.equal(new Set(files.map(f=>f.file)).size,files.length);
 return {files,fingerprint:hash(files)};
}
export function assertRepairSchemaV1(schema){
 const expected=JSON.parse(fs.readFileSync(path.join(root,folder,'schema523.json')));
 assert.equal(hash(expected),REGISTRY.schema_fingerprint,'Frozen523 metadata changed');
 same(schema,expected,'Unreviewed schema/security/effect change');
 assert.equal(schema.canonical.ledger.length,523);
 assert.equal(schema.canonical.ledger.at(-1),'20261124040000');
 exInsertEffectProofV1(schema.canonical);
 assert.equal(schema.triggers.length,0,'Unreviewed mutation trigger');
 assert.equal(schema.rules.length,0,'Unreviewed rewrite rule');
 for(const fk of schema.mapping_inbound)assert.ok(fk.target_columns.every(k=>!['card_print_id','meta'].includes(k)),'Mutable mapping column has inbound dependency');
 return {version:VERSION,schema_fingerprint:hash(schema),updated_table:'public.external_mappings',updated_ids:MAPPING_IDS,updated_columns:['card_print_id','meta'],insert_table:'public.raw_imports',insert_id:RAW_ID,owner_row_writes:0,owner_json_writes:0,indirect_writes:0,unprovided_sequence_calls:0};
}
export async function readRepairStateV1(c,schema){
 const state={effect_proof:assertRepairSchemaV1(schema)};
 state.parents=await jsonRows(c,'select to_jsonb(t)row from public.card_prints t where id=any($1::uuid[])order by id',[PARENTS]);
 state.identities=await jsonRows(c,'select to_jsonb(t)row from public.card_print_identity t where card_print_id=any($1::uuid[])order by id',[PARENTS]);
 state.printings=await jsonRows(c,'select to_jsonb(t)row from public.card_printings t where card_print_id=any($1::uuid[])order by id',[PARENTS]);
 const printings=state.printings.map(p=>p.id);
 state.reviews=await jsonRows(c,'select to_jsonb(t)row from public.card_printing_truth_reviews t where card_printing_id=any($1::uuid[])order by id',[printings]);
 state.aliases=await jsonRows(c,'select to_jsonb(t)row from public.card_print_identity_aliases t where legacy_card_print_id=any($1::uuid[])or canonical_card_print_id=any($1::uuid[])order by id',[PARENTS]);
 state.mapping_aliases=await jsonRows(c,'select to_jsonb(t)row from public.external_mapping_aliases t where canonical_external_mapping_id=any($1::bigint[])or preserved_from_mapping_id=any($1::bigint[])order by id',[MAPPING_IDS]);
 state.printing_assertions=await jsonRows(c,"select to_jsonb(t)row from public.external_printing_mappings t where source in('tcgplayer','tcgplayer_market')and(card_printing_id=any($1::uuid[])or split_part(external_id,':',1)=any($2::text[]))order by id",[printings,allProducts]);
 state.mappings=await jsonRows(c,"select to_jsonb(t)row from public.external_mappings t where card_print_id=any($1::uuid[])or(source='tcgplayer'and external_id=any($2::text[]))order by id",[PARENTS,allProducts]);
 state.raw=await jsonRows(c,"select (to_jsonb(t)-'id')||jsonb_build_object('id',id::text)row from public.raw_imports t where id=$1::bigint",[RAW_ID]);
 const source={run:(await jsonRows(c,"select to_jsonb(t)row from public.tcgcsv_source_sync_runs t where status='completed'and sync_mode='current_full_sync'and failed_count=0 order by finished_at desc,created_at desc,id desc limit 1"))[0]};
 source.categories=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_categories t where category_id=3');
 source.groups=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_groups t where group_id=any($1::int[])order by group_id',[[...new Set(REGISTRY.targets.map(t=>t.group_id))]]);
 source.products=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_products t where product_id=any($1::int[])order by product_id',[PRODUCTS]);
 source.observations=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_price_daily_observations t where product_id=any($1::int[])and last_seen_run_id=$2::uuid order by product_id,subtype_name',[PRODUCTS,source.run?.id]);
 source.artifacts=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_artifacts t where id=any($1::uuid[])order by id',[[...new Set(source.observations.map(o=>o.source_artifact_id))]]);
 state.source=source;state.foreign_footprints=[];
 for(const key of schema.canonical.foreign_keys){
  assert.equal(key.keys,1);assert.equal(key.target_column,'id');
  const ids=key.target==='card_prints'?PARENTS:printings;
  const batches=/price|snapshot|evidence|observation/.test(key.relation)?Array.from({length:Math.ceil(ids.length/8)},(_,i)=>ids.slice(i*8,i*8+8)):[ids],found=[];
  let sql='select t.'+identifier(key.column_name)+'::text referenced_id,count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),\'\'order by md5(to_jsonb(t)::text)),\'\'))digest from '+identifier(key.schema)+'.'+identifier(key.relation)+' t where t.'+identifier(key.column_name)+'=any($1::uuid[])';
  if(key.schema==='public'&&key.relation==='external_mappings')sql+='and t.id<>all($2::bigint[])';
  sql+='group by t.'+identifier(key.column_name)+' order by t.'+identifier(key.column_name);
  for(const batch of batches)found.push(...await rows(c,sql,key.schema==='public'&&key.relation==='external_mappings'?[batch,MAPPING_IDS]:[batch]));
  found.sort((a,b)=>a.referenced_id.localeCompare(b.referenced_id));
  assert.equal(new Set(found.map(r=>r.referenced_id)).size,found.length);
  state.foreign_footprints.push({...key,rows:found});
 }
 state.owner_json_effect_proof={mode:'preserved_by_reviewed_bounded_update_effects',effect_fingerprint:hash(state.effect_proof),owner_row_writes:0,owner_json_writes:0,global_json_scan_performed:false};
 return state;
}
export function assertRepairSourceV1(source,{now=Date.now()}={}){
 assertStampSource7da8RunV1(source.run);
 const age=now-Date.parse(source.run.finished_at);assert.ok(Number.isFinite(age)&&age>=0&&age<36*3600000,'Source stale or future');
 assert.equal(source.categories.length,1);assert.equal(source.categories[0].name,'Pokemon');assert.equal(source.categories[0].category_id,3);
 assert.equal(source.products.length,29);assert.equal(source.observations.length,41);
 assert.equal(new Set(source.products.map(p=>p.product_id)).size,29);
 assert.equal(new Set(source.observations.map(o=>o.id)).size,41);
 assert.equal(new Set(source.observations.map(o=>o.product_id+':'+o.subtype_name)).size,41);
 const groups=[...new Set(REGISTRY.targets.map(t=>t.group_id))];same(source.groups.map(g=>g.group_id).sort((a,b)=>a-b),groups.sort((a,b)=>a-b));
 assert.equal(source.artifacts.length,groups.length);
 assert.equal(new Set(source.artifacts.map(a=>a.id)).size,source.artifacts.length);
 for(const t of REGISTRY.targets){
  const p=source.products.find(p=>p.product_id===t.product_id),g=source.groups.find(g=>g.group_id===t.group_id);assert.ok(p&&g);
  for(const[k,v]of Object.entries({name:t.source_name,category_id:3,group_id:t.group_id,source_active:true,catalog_metadata_status:'current',last_seen_run_id:source.run.id}))assert.equal(p[k],v,'Source product changed: '+k);
  assert.equal(g.category_id,3);same(p.extended_data.filter(f=>f.name==='Number').map(f=>f.value),t.source_number);
  same(source.observations.filter(o=>o.product_id===t.product_id).map(o=>o.subtype_name).sort(),[...t.subtypes].sort());
 }
 for(const o of source.observations){
  const t=REGISTRY.targets.find(t=>t.product_id===o.product_id);assert.ok(t);assert.equal(o.category_id,3);assert.equal(o.group_id,t.group_id);assert.equal(o.currency,'USD');assert.ok(Number.isFinite(Number(o.market_price))&&Number(o.market_price)>0);assert.equal(o.last_seen_run_id,source.run.id);assert.equal(o.observed_on,source.run.observed_on);assert.match(o.payload_hash,/^[a-f0-9]{64}$/);
  const a=source.artifacts.find(a=>a.id===o.source_artifact_id);assert.ok(a);assert.equal(a.sync_run_id,source.run.id);assert.equal(a.artifact_kind,'prices');assert.equal(a.category_id,3);assert.equal(a.group_id,t.group_id);assert.equal(a.http_status,200);assert.ok(Number(a.byte_size)>0);assert.match(a.sha256,/^[a-f0-9]{64}$/);
 }
 same([...new Set(source.observations.map(o=>o.source_artifact_id))].sort(),source.artifacts.map(a=>a.id).sort());
}
function assertBefore(state,schema,observedAt){
 assertRepairSchemaV1(schema);assertRepairSourceV1(state.source,{now:Date.parse(observedAt)});
 same(state.parents.map(p=>p.id).sort(),[...PARENTS].sort());
 assert.equal(state.aliases.length,0,'Identity alias adjudication changed');assert.equal(state.mapping_aliases.length,0,'Mapping alias adjudication changed');assert.equal(state.printing_assertions.length,0,'Competing printing assertion');assert.equal(state.raw.length,0);
 assert.equal(state.mappings.filter(target).length,29);
 const regularPrintings=new Set(REGISTRY.targets.flatMap(t=>t.printings.map(p=>p.id)));
 same(state.printings.filter(p=>REGISTRY.targets.some(t=>t.regular.id===p.card_print_id)).map(p=>p.id).sort(),[...regularPrintings].sort());
 for(const t of REGISTRY.targets){
  for(const wanted of[t.regular,t.stamp]){const actual=state.parents.find(p=>p.id===wanted.id);assert.ok(actual);for(const[k,v]of Object.entries(wanted))assert.equal(actual[k],v,'Parent changed '+k);if(wanted.id===t.regular.id)assert.equal(actual.printed_identity_modifier,null);assert.equal(actual.identity_domain,'pokemon_eng_standard');}
  const identities=state.identities.filter(i=>i.card_print_id===t.regular.id&&i.is_active);assert.equal(identities.length,1);for(const[k,v]of Object.entries(t.identity))assert.equal(identities[0][k],v,'Regular identity changed '+k);
  for(const a of t.anchors){const found=state.mappings.find(m=>String(m.id)===a.id);assert.ok(found&&found.active);for(const[k,v]of Object.entries(a))assert.equal(String(found[k]),String(v));}
  for(const p of t.printings){const found=state.printings.find(v=>v.id===p.id);assert.ok(found);for(const[k,v]of Object.entries(p))assert.equal(found[k],v);}
  const m=state.mappings.find(m=>String(m.id)===t.mapping_id);assert.ok(m);assert.equal(m.source,'tcgplayer');assert.equal(m.external_id,String(t.product_id));assert.equal(m.card_print_id,t.stamp.id);assert.equal(m.active,true);assert.equal(String(m.meta?.tcgcsv_group_id),String(t.group_id));assert.ok(!m.meta?.reviewed_correction&&!m.meta?.mapping_correction_version&&!m.meta?.reviewed_invalidation?.reason_code&&!m.meta?.mapping_method,'Unexpected prior correction');
  assert.equal(state.mappings.filter(m=>m.source==='tcgplayer'&&m.external_id===String(t.product_id)).length,1);
 }
 assert.ok(!state.reviews.some(r=>regularPrintings.has(r.card_printing_id)&&r.active&&['hidden_pending_review','hidden_unsupported'].includes(r.public_visibility)),'Regular printing is hidden');
 same(state.foreign_footprints.map(k=>project(k,Object.keys(schema.canonical.foreign_keys[0]))),schema.canonical.foreign_keys,'Complete foreign-reference census required');
 for(const k of state.foreign_footprints)for(const r of k.rows){assert.ok(Number.isSafeInteger(r.rows)&&r.rows>=0);assert.match(r.digest,/^[a-f0-9]{32}$/);assert.ok((k.target==='card_prints'?PARENTS:state.printings.map(p=>p.id)).includes(r.referenced_id));}
 same(state.effect_proof,assertRepairSchemaV1(schema));same(state.owner_json_effect_proof,{mode:'preserved_by_reviewed_bounded_update_effects',effect_fingerprint:hash(state.effect_proof),owner_row_writes:0,owner_json_writes:0,global_json_scan_performed:false});
}
function makePlan({schema,state,observedAt}){
 assert.ok(Number.isFinite(Date.parse(observedAt)));assertBefore(state,schema,observedAt);
 const before=state.mappings.filter(target),evidence=hash({version:VERSION,registry:REGISTRY.fingerprint,before,source:state.source,protected_state:hash(state)});
 const after=before.map(m=>{const t=REGISTRY.targets.find(t=>t.mapping_id===String(m.id));return{...m,card_print_id:t.regular.id,meta:{...m.meta,mapping_method:MAPPING_METHOD,mapping_correction_version:VERSION,mapping_correction_reason:'Reviewed regular source product; preserve the separate stamped identity and all existing printings.',mapping_correction_prior_card_print_id:m.card_print_id,reviewed_correction:{raw_import_id:RAW_ID,evidence_fingerprint:evidence,reviewed_at:observedAt}}};});
 const raw={id:RAW_ID,source:VERSION,status:'processed',notes:'29 reviewed regular-product mapping corrections; no canonical, printing, owner or price mutation.',payload:{version:VERSION,context:CONTEXT,registry_fingerprint:REGISTRY.fingerprint,evidence_fingerprint:evidence,mapping_before:before,mapping_after:after,source_snapshot_fingerprint:hash(state.source),protected_state_fingerprint:hash(state),schema_fingerprint:hash(schema),expected:EXPECTED,boundaries:BOUNDARIES}};
 const body={version:VERSION,context:CONTEXT,project_ref:PROJECT,observed_at:observedAt,schema,state_before:state,before,after,raw,expected:EXPECTED,boundaries:BOUNDARIES};return{...body,fingerprint:hash(body)};
}
export function freezeRepairPlanV1(input){return makePlan(input);}
export function assertRepairPlanV1(plan,fingerprint){assert.equal(plan.fingerprint,fingerprint);same(plan,makePlan({schema:plan.schema,state:plan.state_before,observedAt:plan.observed_at}),'Frozen correction plan changed');return plan;}
export function classifyRepairStateV1(plan,state){
 for(const key of['parents','identities','printings','reviews','aliases','mapping_aliases','printing_assertions','source','foreign_footprints','effect_proof','owner_json_effect_proof'])same(state[key],plan.state_before[key],'Protected drift: '+key);
 same(state.mappings.filter(m=>!target(m)),plan.state_before.mappings.filter(m=>!target(m)),'Other mappings changed');
 const actual=state.mappings.filter(target);assert.equal(actual.length,29);
 if(hash(actual)===hash(plan.before)&&state.raw.length===0)return'before';
 same(actual,plan.after,'Partial or unexpected correction');assert.equal(state.raw.length,1,'Missing or colliding audit receipt');same(project(state.raw[0],rawFields),plan.raw,'Audit receipt changed');return'exact';
}


export function assertRepairAuthorityV1(a,{plan,codeFingerprint,mode,now=Date.now()}){
 assertRepairPlanV1(plan,plan.fingerprint);assert.ok(a,'Exact owner approval required');const{fingerprint,...body}=a;assert.equal(hash(body),fingerprint);assert.equal(a.version,'REGULAR_PRODUCT_MAPPING_AUTHORITY_V1');assert.equal(a.status,'explicit_founder_approval');assert.equal(a.project_ref,PROJECT);assert.equal(a.plan_fingerprint,plan.fingerprint);assert.equal(a.code_fingerprint,codeFingerprint);assert.match(codeFingerprint,/^[a-f0-9]{64}$/);same(a.expected,EXPECTED);same(a.boundaries,BOUNDARIES);same(a.modes,['rollback','apply']);assert.ok(a.modes.includes(mode));assert.match(a.owner_decision_sha256,/^[a-f0-9]{64}$/);const start=Date.parse(a.issued_at),end=Date.parse(a.expires_at);assert.ok(Number.isFinite(start)&&Number.isFinite(end)&&start<=now&&now<end&&end-start<=24*3600000,'Approval expired or invalid');
}
export function assertRepairRollbackV1(r,{plan,codeFingerprint,now=Date.now()}){
 assert.ok(r&&r.version===VERSION&&r.project_ref===PROJECT&&r.mode==='rollback'&&r.environment==='production'&&r.rollback_proven===true&&r.committed===false&&r.commit_uncertain===false);assert.equal(r.plan_fingerprint,plan.fingerprint);assert.equal(r.code_fingerprint,codeFingerprint);same(r.writes,EXPECTED);assert.equal(r.before_state_fingerprint,r.rollback_state_fingerprint);const age=now-Date.parse(r.finished_at);assert.ok(Number.isFinite(age)&&age>=0&&age<3600000,'Fresh matching production rollback required');
}
async function assertClient(c,local){const p=c.connectionParameters;if(local){assert.equal(p.host,'127.0.0.1');assert.equal(Number(p.port),55340);assert.equal(p.user,'postgres');assert.equal(p.database,QUALIFICATION_DATABASE);assert.equal((await c.query('select current_database() name')).rows[0].name,QUALIFICATION_DATABASE);}else{assert.equal(p.host,'db.'+PROJECT+'.supabase.co');assert.equal(Number(p.port),5432);assert.equal(p.database,'postgres');assert.equal(p.user,'postgres');assert.equal(p.ssl?.rejectUnauthorized,true);assert.ok(p.ssl?.ca);assert.equal(c.connection.stream.authorized,true);}}
async function transaction(options,local){
 const{client:c,plan,mode,authority,rollbackReceipt,fault=null}=options;assert.ok(['preflight','rollback','apply','readback'].includes(mode));assert.ok(!fault||(local&&['duplicate_raw_after_update','other_mapping_change'].includes(fault)),'Faults are local qualification only');if(!local)readOperatorReleaseGateV1();await assertClient(c,local);assertRepairPlanV1(plan,plan.fingerprint);const code=repairCodeBindingV1();assert.equal(options.codeFingerprint,code.fingerprint);if(!local&&['rollback','apply'].includes(mode)){assertRepairAuthorityV1(authority,{plan,codeFingerprint:code.fingerprint,mode});if(mode==='apply')assertRepairRollbackV1(rollbackReceipt,{plan,codeFingerprint:code.fingerprint});}
 const write=['rollback','apply'].includes(mode),locks=[],proof={version:VERSION,context:CONTEXT,project_ref:PROJECT,environment:local?'local_qualification':'production',mode,plan_fingerprint:plan.fingerprint,code_fingerprint:code.fingerprint,writes:{raw_inserts:0,mapping_updates:0},boundaries:BOUNDARIES,committed:false,commit_uncertain:false};let begun=false,commitSent=false;
 try{
  if(write)for(const name of ['grookai:tcgcsv:current:v1','tcgplayer_market_publication_v1']){assert.equal((await rows(c,'select pg_try_advisory_lock(hashtext($1))acquired',[name]))[0].acquired,true,'Source/publication writer active');locks.push(name);}
  await c.query('begin isolation level serializable'+(write?'':' read only'));begun=true;await c.query("set local timezone='UTC'");await c.query("set local statement_timeout='45s'");await c.query("set local lock_timeout='5s'");same(await readRepairSchemaV1(c),plan.schema,'Schema changed');const before=await readRepairStateV1(c,plan.schema);assertRepairSourceV1(before.source);proof.before=classifyRepairStateV1(plan,before);proof.before_state_fingerprint=hash(before);
  if(mode==='readback')assert.equal(proof.before,'exact','Correction has not been applied');
  if(write&&proof.before==='before'){
   await c.query('select id from public.external_mappings where id=any($1::bigint[])order by id for update',[MAPPING_IDS]);
   const r=plan.raw;proof.writes.raw_inserts=(await c.query('insert into public.raw_imports(id,source,status,notes,payload)values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)])).rowCount;
   for(const before of plan.before){const after=plan.after.find(m=>String(m.id)===String(before.id));assert.ok(after);proof.writes.mapping_updates+=(await c.query('update public.external_mappings t set card_print_id=$2::uuid,meta=$3::jsonb where id=$1::bigint and to_jsonb(t)=$4::jsonb',[String(before.id),after.card_print_id,JSON.stringify(after.meta),JSON.stringify(before)])).rowCount;}same(proof.writes,EXPECTED,'Expected exactly one correction and one receipt');
   if(fault==='duplicate_raw_after_update')await c.query('insert into public.raw_imports(id,source,status,notes,payload)values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)]);
   if(fault==='other_mapping_change')await c.query('update public.external_mappings set active=false where id=$1::bigint',[REGISTRY.targets[0].anchors[0].id]);
   assert.equal(classifyRepairStateV1(plan,await readRepairStateV1(c,plan.schema)),'exact');proof.exact_readback=true;
  }
  same(repairCodeBindingV1(),code,'Producer changed');if(!local){readOperatorReleaseGateV1();if(write)assertRepairAuthorityV1(authority,{plan,codeFingerprint:code.fingerprint,mode});}same(await readRepairSchemaV1(c),plan.schema,'Precommit schema changed');
  if(mode==='apply'){commitSent=true;await c.query('commit');begun=false;proof.committed=true;}
  else {await c.query('rollback');begun=false;if(mode==='rollback'){await c.query('begin isolation level repeatable read read only');begun=true;await c.query("set local timezone='UTC'");const restored=await readRepairStateV1(c,plan.schema);same(restored,before,'Rollback did not restore exact before state');proof.rollback_state_fingerprint=hash(restored);proof.rollback_proven=true;await c.query('rollback');begun=false;}}
  proof.finished_at=new Date().toISOString();return proof;
 }catch(e){if(commitSent&&!proof.committed)e.commit_uncertain=true;if(begun){try{await c.query('rollback');}catch{e.rollback_uncertain=true;}}throw e;}
 finally{for(const name of locks.reverse())await c.query('select pg_advisory_unlock(hashtext($1))',[name]).catch(()=>{});}
}
export const executeRepairV1=options=>transaction(options,false);
export const qualifyRepairV1=options=>transaction(options,true);
