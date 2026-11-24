import assert from 'node:assert/strict';
import manifest from '../../docs/catalog/gamestop_registry_fifteen_v1/index.json' with {type:'json'};
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';

export const VERSION='GAMESTOP_REGISTRY_FIFTEEN_V1';
export const QUALIFICATION_DATABASE='gamestop_registry_fifteen_qualification_v1';
export const PROJECT='ycdxbpibncqcchqiihfz';
const REVIEWED_MANIFEST='4aedb835926e964265fec75e81c110c01086ac6048a81b3ba908f3871d4967fe';
const identifier=s=>'"'+s.replaceAll('"','""')+'"';
const same=(a,b,message)=>assert.equal(hash({value:a}),hash({value:b}),message);
const seal=body=>({...body,fingerprint:hash(body)});
const identityFields=['id','card_print_id','identity_domain','set_code_identity','printed_number','normalized_printed_name','source_name_raw','identity_payload','identity_key_version','identity_key_hash','is_active'];
const project=row=>Object.fromEntries(identityFields.map(k=>[k,row[k]]));
const deepFreeze=value=>{
 if(value&&typeof value==='object'){
  for(const child of Object.values(value))deepFreeze(child);
  Object.freeze(value);
 }
 return value;
};
deepFreeze(manifest);

export function assertGameStopRegistryManifest(value=manifest){
 const {fingerprint,...body}=value;assert.equal(hash(body),fingerprint,'Registry manifest fingerprint mismatch');
 assert.equal(fingerprint,REVIEWED_MANIFEST,'Unreviewed registry manifest');
 assert.equal(value.version,VERSION);assert.equal(value.project_ref,PROJECT);
 assert.equal(value.targets.length,15);assert.equal(new Set(value.targets.map(t=>t.parentId)).size,15);
 assert.equal(new Set(value.targets.map(t=>t.identity.id)).size,15);assert.equal(new Set(value.targets.map(t=>t.identity.identity_key_hash)).size,15);
 for(const t of value.targets){
  const p=JSON.parse(t.parentRow),c=JSON.parse(t.childRow),r=JSON.parse(t.reviewRow),i=t.identity;
  assert.equal(p.id,t.parentId);assert.equal(p.variant_key,'gamestop_stamp');assert.equal(p.printed_identity_modifier,'gamestop_stamp');
  assert.equal(p.identity_domain,'pokemon_eng_standard');assert.equal(c.card_print_id,p.id);assert.equal(r.card_printing_id,c.id);
  assert.equal(r.active,true);assert.equal(r.review_status,'verified');assert.equal(r.public_visibility,'visible');
  assert.deepEqual(Object.keys(i).sort(),[...identityFields].sort());assert.equal(i.card_print_id,p.id);
  assert.equal(i.identity_domain,'pokemon_eng_standard');assert.equal(i.identity_key_version,'pokemon_eng_standard:v1');
  assert.equal(i.identity_payload.variant_key_current,'gamestop_stamp');assert.equal(i.source_name_raw,null);assert.equal(i.is_active,true);
 }
 return value;
}
assertGameStopRegistryManifest();
export const MANIFEST_FINGERPRINT=manifest.fingerprint;
export const TARGETS=Object.freeze(manifest.targets.map(t=>Object.freeze({...t})));
const parentIds=()=>TARGETS.map(t=>t.parentId);
const childIds=()=>TARGETS.map(t=>JSON.parse(t.childRow).id);
const proposedIds=()=>TARGETS.map(t=>t.identity.id);

export async function readGameStopRegistrySchema(client){
 const schema={};
 schema.columns=(await client.query(`select a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid) default_expression
 from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid='public.card_print_identity'::regclass and a.attnum>0 and not a.attisdropped order by a.attnum`)).rows;
 schema.constraints=(await client.query(`select conname,contype,convalidated,condeferrable,condeferred,pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.card_print_identity'::regclass order by conname`)).rows;
 schema.indexes=(await client.query(`select indexname,indexdef from pg_indexes where schemaname='public' and tablename='card_print_identity' order by indexname`)).rows;
 schema.table=(await client.query(`select relrowsecurity,relforcerowsecurity,relacl::text,relkind from pg_class where oid='public.card_print_identity'::regclass`)).rows;
 schema.policies=(await client.query(`select * from pg_policies where schemaname='public' and tablename='card_print_identity' order by policyname`)).rows;
 schema.triggers=(await client.query(`select t.tgname,t.tgenabled,(t.tgtype::int&4)<>0 fires_insert,pg_get_triggerdef(t.oid) definition,p.oid::regprocedure::text function_signature,pg_get_functiondef(p.oid) function_definition from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid='public.card_print_identity'::regclass and not t.tgisinternal order by t.tgname`)).rows;
 schema.rules=(await client.query(`select rulename,definition from pg_rules where schemaname='public' and tablename='card_print_identity' order by rulename`)).rows;
 schema.functions=(await client.query(`select p.oid::regprocedure::text signature,p.provolatile,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'card_print_identity_%_v1' order by 1`)).rows;
 schema.foreignKeys=(await client.query(`select k.conname,ns.nspname schema_name,t.relname table_name,t.relkind,nt.nspname target_schema,tt.relname target_table,
 array(select a.attname::text from unnest(k.conkey) with ordinality u(n,i) join pg_attribute a on a.attrelid=k.conrelid and a.attnum=u.n order by u.i) columns,
 array(select a.attname::text from unnest(k.confkey) with ordinality u(n,i) join pg_attribute a on a.attrelid=k.confrelid and a.attnum=u.n order by u.i) target_columns,pg_get_constraintdef(k.oid) definition
 from pg_constraint k join pg_class t on t.oid=k.conrelid join pg_namespace ns on ns.oid=t.relnamespace join pg_class tt on tt.oid=k.confrelid join pg_namespace nt on nt.oid=tt.relnamespace
 where k.contype='f' and k.confrelid in('public.card_prints'::regclass,'public.card_printings'::regclass,'public.card_print_identity'::regclass) order by ns.nspname,t.relname,k.conname`)).rows;
 assert.ok(schema.foreignKeys.every(k=>k.target_schema==='public'&&k.columns.length===1&&k.target_columns.length===1&&k.target_columns[0]==='id'),'Unsupported reference shape');
 const covered=new Set(schema.foreignKeys.map(k=>k.schema_name+'.'+k.table_name+'.'+k.columns[0]));
 schema.otherCanonicalUuidColumns=(await client.query(`select c.table_schema,c.table_name,c.column_name from information_schema.columns c join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name and t.table_type='BASE TABLE'
 where c.table_schema='public' and c.udt_name='uuid' and (c.column_name like '%card_print%id%' or c.column_name like '%printing%id%') order by c.table_schema,c.table_name,c.ordinal_position`)).rows.filter(c=>!covered.has(c.table_schema+'.'+c.table_name+'.'+c.column_name)&&!(['market_price_pipeline_candidates','market_price_publication_snapshots','market_price_qualification_decisions'].includes(c.table_name)&&['mtg_printing_mapping_id','cross_tcg_printing_mapping_id'].includes(c.column_name)));
 return schema;
}

export function assertGameStopRegistryInsertEffects(schema){
 const actual=Object.fromEntries(['columns','constraints','indexes','table','policies','triggers','rules','functions'].map(k=>[k,schema[k]]));
 same(actual,manifest.insertEffects,'Reviewed identity INSERT effects changed');
 assert.equal(schema.rules.length,0);assert.ok(schema.triggers.every(t=>!t.fires_insert));
 assert.ok(schema.constraints.every(c=>c.convalidated));
 // All identity UUIDs are supplied. Only created_at / updated_at use their reviewed now() defaults.
 assert.ok(schema.columns.every(c=>c.attgenerated===''&&c.attidentity===''));
 return {fingerprint:hash(actual),insertTriggers:0,rewriteRules:0,updates:0,otherTableWrites:0};
}

export async function readGameStopRegistryState(client,schema){
 const state={insertEffects:assertGameStopRegistryInsertEffects(schema)};
 const rows=async(table,column,ids)=>(await client.query(`select to_jsonb(t)::text row_json from public.${identifier(table)} t where ${identifier(column)}=any($1::uuid[]) order by to_jsonb(t)::text`,[ids])).rows.map(r=>r.row_json);
 state.parents=await rows('card_prints','id',parentIds());
 state.sets=(await client.query(`select to_jsonb(s)::text row_json from public.sets s where id in(select set_id from public.card_prints where id=any($1::uuid[])) order by to_jsonb(s)::text`,[parentIds()])).rows.map(r=>r.row_json);
 state.children=await rows('card_printings','card_print_id',parentIds());
 state.reviews=await rows('card_printing_truth_reviews','card_printing_id',childIds());
 state.identities=(await client.query(`select to_jsonb(t)::text row_json from public.card_print_identity t where card_print_id=any($1::uuid[]) or id=any($2::uuid[]) or (is_active and identity_domain='pokemon_eng_standard' and identity_key_version='pokemon_eng_standard:v1' and identity_key_hash=any($3::text[])) order by to_jsonb(t)::text`,[parentIds(),proposedIds(),TARGETS.map(t=>t.identity.identity_key_hash)])).rows.map(r=>r.row_json);
 state.projected=(await client.query(`select p.id card_print_id,public.card_print_identity_backfill_projection_v1(s.source,p.set_code,s.code,p.number,p.number_plain,p.name,p.variant_key,p.printed_total,p.printed_set_abbrev) projection from public.card_prints p join public.sets s on s.id=p.set_id where p.id=any($1::uuid[]) order by p.id`,[parentIds()])).rows;
 state.globalRetainedIdentities=(await client.query(`select count(*)::int rows,encode(extensions.digest(coalesce(string_agg(encode(extensions.digest(to_jsonb(t)::text,'sha256'),'hex'),'' order by id),''),'sha256'),'hex') sha256 from public.card_print_identity t where id<>all($1::uuid[])`,[proposedIds()])).rows[0];
 state.references=[];
 const groups=new Map();for(const k of schema.foreignKeys){const name=k.schema_name+'.'+k.table_name;if(!groups.has(name))groups.set(name,[]);groups.get(name).push(k);}
 for(const [relation,keys] of groups){
  const args=keys.map(k=>k.target_table==='card_prints'?parentIds():k.target_table==='card_printings'?childIds():proposedIds());
  const where=keys.map((k,i)=>`t.${identifier(k.columns[0])}=any($${i+1}::uuid[])`).join(' or ');
  // Registry additions themselves are classified separately; all pre-existing registry rows stay covered globally.
  const exclude=relation==='public.card_print_identity'?` and t.id<>all($${args.push(proposedIds())}::uuid[])`:'';
  const list=(await client.query(`select to_jsonb(t)::text row_json from ${identifier(keys[0].schema_name)}.${identifier(keys[0].table_name)} t where (${where})${exclude} order by to_jsonb(t)::text`,args)).rows.map(r=>r.row_json);
  state.references.push({relation,rows:list.length,fingerprint:hash(list)});
 }
 state.otherReferences=[];
 for(const col of schema.otherCanonicalUuidColumns){const relation=col.table_schema+'.'+col.table_name+'.'+col.column_name;const list=(await client.query(`select to_jsonb(t)::text row_json from ${identifier(col.table_schema)}.${identifier(col.table_name)} t where ${identifier(col.column_name)}=any($1::uuid[]) order by to_jsonb(t)::text`,[[...parentIds(),...childIds(),...proposedIds()]])).rows.map(r=>r.row_json);state.otherReferences.push({relation,rows:list.length,fingerprint:hash(list)});}
 state.options=(await client.query('select id,card_print_id,finish_key,printing_gv_id,finish_is_active from public.get_public_card_printing_options_v1($1::uuid[],1000,0) order by id',[parentIds()])).rows;
 return state;
}

export function assertGameStopRegistryStateInputs(state){
 same(state.parents,[...TARGETS.map(t=>t.parentRow)].sort(),'Exact retained parent drift');
 same(state.children,[...TARGETS.map(t=>t.childRow)].sort(),'Exact retained printing drift');
 same(state.reviews,[...TARGETS.map(t=>t.reviewRow)].sort(),'Exact retained review drift');
 assert.equal(state.projected.length,15);
 for(const row of state.projected){const expected=TARGETS.find(t=>t.parentId===row.card_print_id);assert.ok(expected);const {status,taxonomy_class,...identity}=row.projection;assert.equal(status,'ready');same(identity,Object.fromEntries(Object.entries(expected.identity).filter(([k])=>!['id','card_print_id','is_active'].includes(k))),'Current-law projection drift');}
 same(state.options,TARGETS.map(t=>{const c=JSON.parse(t.childRow);return{id:c.id,card_print_id:c.card_print_id,finish_key:c.finish_key,printing_gv_id:c.printing_gv_id,finish_is_active:true};}).sort((a,b)=>a.id.localeCompare(b.id)),'Public printing option drift');
}

export function freezeGameStopRegistryPlan({schema,state,observedAt}){
 assertGameStopRegistryStateInputs(state);assert.equal(state.identities.length,0,'Existing parent/UUID/hash identity collision');
 assert.ok(Number.isFinite(Date.parse(observedAt)));assert.equal(schema.foreignKeys.length,98);assert.equal(schema.otherCanonicalUuidColumns.length,13);
 return seal({version:VERSION,project_ref:PROJECT,manifest:MANIFEST_FINGERPRINT,observedAt,schema,before:state,identities:TARGETS.map(t=>t.identity),expectedInserts:15});
}

export function assertGameStopRegistryPlan(plan){
 const{fingerprint,...body}=plan;assert.equal(hash(body),fingerprint,'Plan fingerprint mismatch');assert.equal(plan.version,VERSION);assert.equal(plan.project_ref,PROJECT);assert.equal(plan.manifest,MANIFEST_FINGERPRINT);
 assert.equal(plan.expectedInserts,15);same(plan.identities,TARGETS.map(t=>t.identity),'Plan target drift');assertGameStopRegistryStateInputs(plan.before);assert.equal(plan.before.identities.length,0);
 assertGameStopRegistryInsertEffects(plan.schema);
}

export function classifyGameStopRegistryState(plan,state){
 assertGameStopRegistryPlan(plan);assertGameStopRegistryStateInputs(state);
 for(const key of ['insertEffects','parents','sets','children','reviews','projected','globalRetainedIdentities','references','otherReferences','options'])same(state[key],plan.before[key],'Protected drift: '+key);
 if(state.identities.length===0)return'before';
 assert.equal(state.identities.length,15,'Partial or colliding identity state');
 const actual=state.identities.map(JSON.parse).sort((a,b)=>a.id.localeCompare(b.id));
 const expected=[...plan.identities].sort((a,b)=>a.id.localeCompare(b.id));
 same(actual.map(project),expected,'Exact identity row mismatch');
 for(const row of actual){assert.ok(Number.isFinite(Date.parse(row.created_at)));assert.equal(row.created_at,row.updated_at);}
 return'exact';
}

// Qualification has an explicit local-only route. This module exposes no production execution entry point.
export async function qualifyGameStopRegistryTransaction({client,plan,mode,committedIdentityRows,beforeCommit=async()=>{}}){
 const p=client.connectionParameters;assert.ok(['127.0.0.1','localhost'].includes(p.host));assert.equal(Number(p.port),5432);
 assert.equal(p.user,'postgres');assert.equal(p.database,QUALIFICATION_DATABASE);
 const route=(await client.query("select current_database() database,current_setting('max_worker_processes') workers,version() version")).rows[0];
 assert.equal(route.database,QUALIFICATION_DATABASE);assert.equal(route.workers,'0');assert.match(route.version,/PostgreSQL 17\./);
 assertGameStopRegistryPlan(plan);assert.ok(['preflight','rollback','apply','readback'].includes(mode));
 let commitAttempted=false,committed=false;
 try{
  await client.query(`begin isolation level serializable${['preflight','readback'].includes(mode)?' read only':''}`);
  await client.query("set local statement_timeout='45s';set local lock_timeout='3s'");
  if(['rollback','apply'].includes(mode)){
   await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[VERSION]);
   await client.query('select id from public.card_prints where id=any($1::uuid[]) order by id for update',[parentIds()]);
   await client.query('select id from public.card_printings where card_print_id=any($1::uuid[]) order by id for update',[parentIds()]);
  }
  same(await readGameStopRegistrySchema(client),plan.schema,'Schema drift');
  const before=await readGameStopRegistryState(client,plan.schema),beforeClass=classifyGameStopRegistryState(plan,before);
  if(beforeClass==='exact')same(before.identities,committedIdentityRows,'Exact committed identity receipt required');
  if(mode==='readback')assert.equal(beforeClass,'exact');
  let inserts=0;
  if(beforeClass==='before'&&['rollback','apply'].includes(mode)){
   const fields=identityFields.map(identifier).join(',');
   inserts=(await client.query(`insert into public.card_print_identity(${fields}) select ${fields} from jsonb_populate_recordset(null::public.card_print_identity,$1::jsonb)`,[JSON.stringify(plan.identities)])).rowCount;
   assert.equal(inserts,15);
  }
  const after=await readGameStopRegistryState(client,plan.schema),afterClass=classifyGameStopRegistryState(plan,after);
  if(mode!=='preflight'||beforeClass==='exact')assert.equal(afterClass,'exact');
  const result={version:VERSION,environment:'local_qualification',mode,planFingerprint:plan.fingerprint,before:beforeClass,after:afterClass,inserts,updates:0,otherTableWrites:0,exactReadback:afterClass==='exact',identityRows:after.identities};
  if(mode==='apply'){
   await beforeCommit(result);same(await readGameStopRegistrySchema(client),plan.schema,'Precommit schema drift');
   const finalState=await readGameStopRegistryState(client,plan.schema);
   assert.equal(classifyGameStopRegistryState(plan,finalState),'exact');same(finalState.identities,after.identities,'New identity metadata changed before commit');
   commitAttempted=true;await client.query('commit');committed=true;
  }else await client.query('rollback');
  if(mode==='rollback'){
   await client.query('begin isolation level repeatable read read only');
   try{same(await readGameStopRegistryState(client,plan.schema),before,'Rollback state drift');result.rollbackProven=true;}finally{await client.query('rollback');}
  }
  return {...result,committed,commitUncertain:false};
 }catch(error){error.rollbackUncertain=false;await client.query('rollback').catch(()=>{error.rollbackUncertain=true;});error.commitUncertain=commitAttempted&&!committed;throw error;}
}
