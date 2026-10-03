// Local qualification lane only. Production execution/activation requires a later release gate.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertJungleEditionMasterV1} from './jungle_edition_master_authority_v1.mjs';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';

export const JUNGLE_EXECUTION_V1='JUNGLE_EDITION_CATALOG_EXECUTION_V1';
export const JUNGLE_LOCAL_PORT=64740;
const tables=['raw_imports','card_prints','card_printings','card_printing_truth_reviews','card_print_species','jungle_edition_identity_links_v1'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const sorted=rows=>[...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
const identifier=s=>'"'+s.replaceAll('"','""')+'"';
const normalize=rows=>sorted(rows).map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,k.endsWith('_at')&&v?new Date(v).toISOString():v])));
const idFor=value=>{const s=hash({version:JUNGLE_EXECUTION_V1,value});return `${s.slice(0,8)}-${s.slice(8,12)}-5${s.slice(13,16)}-a${s.slice(17,20)}-${s.slice(20,32)}`;};

export function buildJungleExecutionRows(manifest,artifacts,{asOf,gameId}={}){
 assertJungleEditionMasterV1(manifest,artifacts,{asOf});
 const snapshot=JSON.parse(String(artifacts.get('jungle:production-snapshot')));
 const review=JSON.parse(String(artifacts.get(manifest.authority.review.ref)));
 const at=new Date(review.reviewed_at).toISOString(),ref='master-index:'+manifest.fingerprint;
 const rawId='-'+BigInt('0x'+hash({version:JUNGLE_EXECUTION_V1,manifest:manifest.fingerprint}).slice(0,15));
 const provenance={manifest_fingerprint:manifest.fingerprint,review_sha256:manifest.authority.review.sha256,raw_import_id:rawId};
 const refs=[manifest.master_index_ref,manifest.authority.review.ref,...manifest.authority.source_artifacts.map(a=>a.ref)];
 // The private snapshot remains a hash-bound preparation input; collector records
 // are never copied into the persisted source-evidence document.
 const sourceBytes=[...new Set(refs)].sort().map(ref=>({ref,sha256:sha(artifacts.get(ref)),base64:Buffer.from(artifacts.get(ref)).toString('base64')}));
 const rows={
  raw_imports:[{id:rawId,source:JUNGLE_EXECUTION_V1,status:'processed',notes:'Reviewed Jungle base editions; local qualification only; no activation or copy reassignment.',
   ingested_at:at,processed_at:at,payload:{version:JUNGLE_EXECUTION_V1,manifest,review,source_bytes:sourceBytes}}],
  card_prints:manifest.parents.map(p=>({id:p.id,game_id:gameId??snapshot.cards[0].game_id,set_id:p.set_id,name:p.name,number:p.printed_coordinate,number_plain:p.printed_coordinate,
   gv_id:p.gv_id,set_code:'base2',variant_key:'',printed_identity_modifier:p.printed_identity_modifier,identity_domain:p.identity_domain,set_identity_model:'standard',
   external_ids:{},image_status:'missing',created_at:at,updated_at:at})),
  card_printings:manifest.printings.map(p=>({id:p.id,card_print_id:p.card_print_id,finish_key:p.finish_key,printing_gv_id:p.printing_gv_id,is_provisional:false,
   provenance_source:'MASTER_INDEX_ADDITIVE_PRINTING_REPAIR_V1',provenance_ref:ref,created_by:JUNGLE_EXECUTION_V1,created_at:at})),
  card_printing_truth_reviews:manifest.printings.map(p=>({id:idFor('review:'+p.id),card_printing_id:p.id,review_status:'verified',public_visibility:'visible',active:true,
   confidence:'high',reason:'Materialized from the preserved, reviewed Jungle base-edition Master scope; staged identity link, no activation.',
   evidence_sources_checked:p.evidence.map(e=>e.source_ref),evidence_sources_for_finish:p.evidence.map(e=>e.source_ref),expected_finish_keys:[p.finish_key],
   evidence:{...provenance,card_print_id:p.card_print_id,finish_key:p.finish_key,evidence:p.evidence},source_report_path:ref,reviewed_by:review.reviewer,reviewed_at:at,created_at:at,updated_at:at})),
  card_print_species:manifest.species_memberships.map(p=>({id:idFor('species:'+p.card_print_id),card_print_id:p.card_print_id,species_id:p.species_id,role:'primary',
   counts_for_completion:true,source:JUNGLE_EXECUTION_V1,confidence:1,evidence:{...provenance,national_dex_number:p.national_dex_number,evidence_refs:p.evidence_refs},active:true,created_at:at,updated_at:at})),
  jungle_edition_identity_links_v1:manifest.parents.map(p=>{const c=manifest.printings.find(c=>c.card_print_id===p.id);return {id:idFor('link:'+p.id),legacy_card_print_id:p.legacy_card_print_id,
   card_print_id:p.id,card_printing_id:c.id,edition:p.printed_identity_modifier.slice(8),finish_key:c.finish_key,state:'staged',manifest_sha256:manifest.fingerprint,review_ref:ref,created_at:at};}),
 };
 return Object.fromEntries(tables.map(t=>[t,sorted(rows[t])]));
}

export async function assertJungleLocalTarget(client){
 const c=client.connectionParameters;
 assert.equal(c?.host,'127.0.0.1','local_qualification_only');assert.equal(Number(c.port),JUNGLE_LOCAL_PORT,'local_qualification_only');
 assert.equal(c.database,'postgres');assert.equal(c.user,'postgres');
 const row=(await client.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
 assert.match(row.address,/^10\.248\.3\.\d+$/,'wrong_local_network');assert.equal(row.workers,'0');assert.equal(row.migrations,413);
}

export async function readJungleExecutionSchema(client){
 const columns=(await client.query("select table_name,column_name,data_type,is_nullable,column_default,is_generated,generation_expression from information_schema.columns where table_schema='public' and table_name=any($1::text[]) order by table_name,ordinal_position",[tables])).rows;
 const triggers=(await client.query("select c.relname table_name,t.tgname name,t.tgenabled enabled,pg_get_triggerdef(t.oid) definition,pg_get_functiondef(t.tgfoid) body from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal order by c.relname,t.tgname")).rows;
 const constraints=(await client.query("select c.relname table_name,k.conname name,pg_get_constraintdef(k.oid) definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by c.relname,k.conname")).rows;
 const indexes=(await client.query("select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname")).rows;
 const functions=(await client.query("select p.oid::regprocedure::text name,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' order by name")).rows;
 const rules=(await client.query("select tablename,rulename,definition from pg_rules where schemaname='public' order by tablename,rulename")).rows;
 const relations=(await client.query("select c.relname name,c.relkind kind,c.relrowsecurity rls,c.relforcerowsecurity forced_rls,c.relowner::regrole::text owner,c.relacl::text acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') order by c.relname")).rows;
 return {columns,triggers,constraints,indexes,functions,rules,relations};
}

export async function readJungleExecutionState(client,rows,schema){
 const ids=t=>rows[t].map(r=>r.id),parents=ids('card_prints'),children=ids('card_printings');
 const get=async(q,args)=>(await client.query(q,args)).rows.map(r=>r.row);
 const selected={
  raw_imports:await get("select (to_jsonb(t)-'id')||jsonb_build_object('id',id::text) row from raw_imports t where id=$1::bigint",ids('raw_imports')),
  card_prints:await get('select to_jsonb(t) row from card_prints t where id=any($1::uuid[]) or gv_id=any($2::text[])',[parents,rows.card_prints.map(r=>r.gv_id)]),
  card_printings:await get('select to_jsonb(t) row from card_printings t where id=any($1::uuid[]) or card_print_id=any($2::uuid[]) or printing_gv_id=any($3::text[])',[children,parents,rows.card_printings.map(r=>r.printing_gv_id)]),
  card_printing_truth_reviews:await get('select to_jsonb(t) row from card_printing_truth_reviews t where id=any($1::uuid[]) or card_printing_id=any($2::uuid[])',[ids('card_printing_truth_reviews'),children]),
  card_print_species:await get('select to_jsonb(t) row from card_print_species t where id=any($1::uuid[]) or card_print_id=any($2::uuid[])',[ids('card_print_species'),parents]),
  jungle_edition_identity_links_v1:await get('select to_jsonb(t) row from jungle_edition_identity_links_v1 t where id=any($1::uuid[]) or card_print_id=any($2::uuid[]) or legacy_card_print_id=any($3::uuid[])',[ids('jungle_edition_identity_links_v1'),parents,[...new Set(rows.jungle_edition_identity_links_v1.map(r=>r.legacy_card_print_id))]]),
 };
 // Whole public-table footprints cover indirect/application/JSON references as
 // well as declared FKs in this bounded local rehearsal. No private row leaves PG.
 const args=[],queries=schema.relations.map(({name})=>{
  let where='';if(tables.includes(name)){args.push(ids(name));where=` where id::text<>all($${args.length}::text[])`;}
  return `select '${name.replaceAll("'","''")}' table_name,count(*)::int rows,encode(extensions.digest(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),''),'sha256'),'hex') digest from public.${identifier(name)} t${where}`;
 });
 const footprints=(await client.query(queries.join(' union all ')+' order by table_name',args)).rows;
 return {selected:Object.fromEntries(tables.map(t=>[t,normalize(selected[t])])),footprints};
}

function expectedFullRows(rows,schema){
 return Object.fromEntries(tables.map(t=>[t,normalize(rows[t].map(row=>Object.fromEntries(schema.columns.filter(c=>c.table_name===t).map(c=>[c.column_name,Object.hasOwn(row,c.column_name)?row[c.column_name]:null]))))]));
}

export async function freezeJungleExecution({client,manifest,artifacts}){
 await assertJungleLocalTarget(client);
 const games=(await client.query("select id from games where code='pokemon'")).rows;assert.equal(games.length,1);
 const localGameId=games[0].id,asOf=new Date().toISOString(),rows=buildJungleExecutionRows(manifest,artifacts,{asOf,gameId:localGameId});
 await client.query('begin isolation level repeatable read read only');
 try{
  const schema=await readJungleExecutionSchema(client),before=await readJungleExecutionState(client,rows,schema);
  assert.ok(tables.every(t=>before.selected[t].length===0),'initial_collision_or_partial_state');
  const snapshot=JSON.parse(String(artifacts.get('jungle:production-snapshot')));
  const legacy=(await client.query('select to_jsonb(t) row from card_prints t where set_id=$1 order by id',[manifest.authority.set_id])).rows.map(r=>r.row);
  // The replay seeds games with environment-specific UUIDs. This sole fixture
  // translation is explicit; production targets cannot enter this executor.
  assert.deepEqual(normalize(legacy),normalize(snapshot.cards.map(p=>({...p,game_id:localGameId}))),'legacy_scope_drift');
  const species=(await client.query('select to_jsonb(t) row from pokemon_species t where id=any($1::uuid[]) order by id',[[...new Set(rows.card_print_species.map(r=>r.species_id))]])).rows.map(r=>r.row);
  assert.deepEqual(normalize(species),normalize(snapshot.species.filter(s=>rows.card_print_species.some(r=>r.species_id===s.id))),'species_authority_drift');
  const set=(await client.query('select id,code,game,identity_model from sets where id=$1',[manifest.authority.set_id])).rows;
  assert.deepEqual(set,[{id:manifest.authority.set_id,code:'base2',game:'pokemon',identity_model:'standard'}]);
  const plan={version:JUNGLE_EXECUTION_V1,qualification_only:true,production_execution_authorized:false,activation:false,asOf,localGameId,manifest_fingerprint:manifest.fingerprint,
   rows,schema,schema_sha256:hash(schema),before,expected:expectedFullRows(rows,schema),boundaries:{updates:0,deletes:0,ownedCopyWrites:0,sourceMappingWrites:0,pricingWrites:0,activeLinks:0}};
  plan.fingerprint=hash(plan);await client.query('rollback');return plan;
 }catch(e){await client.query('rollback');throw e;}
}

export function assertJungleExecution(plan,expectedFingerprint,manifest,artifacts){
 const {fingerprint,...body}=plan;assert.equal(fingerprint,expectedFingerprint);assert.equal(hash(body),fingerprint,'execution_plan_drift');
 assert.equal(plan.version,JUNGLE_EXECUTION_V1);assert.equal(plan.qualification_only,true);assert.equal(plan.production_execution_authorized,false);assert.equal(plan.activation,false);
 assert.ok(Date.now()-Date.parse(plan.asOf)>=0&&Date.now()-Date.parse(plan.asOf)<3600000,'local_plan_stale');
 assert.equal(plan.manifest_fingerprint,manifest.fingerprint);assert.equal(hash(plan.schema),plan.schema_sha256);
 assert.deepEqual(plan.rows,buildJungleExecutionRows(manifest,artifacts,{asOf:new Date().toISOString(),gameId:plan.localGameId}));
 assert.deepEqual(plan.expected,expectedFullRows(plan.rows,plan.schema));
 assert.deepEqual(plan.boundaries,{updates:0,deletes:0,ownedCopyWrites:0,sourceMappingWrites:0,pricingWrites:0,activeLinks:0});
}

function classify(plan,state){
 assert.deepEqual(state.footprints,plan.before.footprints,'protected_records_drift');
 if(tables.every(t=>state.selected[t].length===0))return 'before';
 assert.deepEqual(state.selected,plan.expected,'partial_or_conflicting_execution');return 'exact';
}

export async function executeJungleLocal({client,plan,expectedFingerprint,manifest,artifacts,mode,onPhase=async()=>{}}){
 assert.ok(['preflight','rollback','apply','readback'].includes(mode));
 assertJungleExecution(plan,expectedFingerprint,manifest,artifacts);await assertJungleLocalTarget(client);
 let commitAttempted=false,committed=false;
 try{
  await client.query('begin isolation level serializable'+(['preflight','readback'].includes(mode)?' read only':''));
  await client.query("set local lock_timeout='3s'");await client.query("set local statement_timeout='45s'");
  if(['rollback','apply'].includes(mode)){
   await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[JUNGLE_EXECUTION_V1]);
   await client.query('lock table '+tables.map(t=>'public.'+identifier(t)).join(',')+' in share row exclusive mode');
   await client.query('select id from card_prints where set_id=$1 order by id for update',[manifest.authority.set_id]);
  }
  assert.equal(hash(await readJungleExecutionSchema(client)),plan.schema_sha256,'schema_or_side_effect_drift');
  assert.deepEqual((await client.query("select id from games where code='pokemon'")).rows,[{id:plan.localGameId}],'game_registry_drift');
  const before=await readJungleExecutionState(client,plan.rows,plan.schema),classification=classify(plan,before);
  if(mode==='readback')assert.equal(classification,'exact');
  const writes=Object.fromEntries(tables.map(t=>[t,0]));
  if(classification==='before'&&['rollback','apply'].includes(mode)){
   for(const t of tables){
    const fields=Object.keys(plan.rows[t][0]).filter(k=>plan.schema.columns.find(c=>c.table_name===t&&c.column_name===k)?.is_generated==='NEVER').map(identifier).join(',');
    writes[t]=(await client.query(`insert into public.${identifier(t)}(${fields}) select ${fields} from jsonb_populate_recordset(null::public.${identifier(t)},$1::jsonb)`,[JSON.stringify(plan.rows[t])])).rowCount;
    assert.equal(writes[t],plan.rows[t].length);await onPhase(t);
   }
  }
  assertJungleExecution(plan,expectedFingerprint,manifest,artifacts);
  const after=await readJungleExecutionState(client,plan.rows,plan.schema),afterClass=classify(plan,after);
  if(mode!=='preflight'||classification==='exact')assert.equal(afterClass,'exact');
  const result={mode,before:classification,after:afterClass,writes,fingerprint:plan.fingerprint,productionWrites:0,activation:false,dependenciesPreserved:true};
  if(mode==='apply'){
   await onPhase('before_commit');
   assertJungleExecution(plan,expectedFingerprint,manifest,artifacts);
   assert.equal(classify(plan,await readJungleExecutionState(client,plan.rows,plan.schema)),'exact');
   commitAttempted=true;await client.query('commit');committed=true;
  }
  else await client.query('rollback');
  if(mode==='rollback'){assert.deepEqual(await readJungleExecutionState(client,plan.rows,plan.schema),before,'rollback_readback_mismatch');result.rollbackProven=true;}
  if(mode==='apply')assert.equal(classify(plan,await readJungleExecutionState(client,plan.rows,plan.schema)),'exact');
  return {...result,committed,commitUncertain:false};
 }catch(e){await client.query('rollback').catch(()=>{});e.commitUncertain=commitAttempted&&!committed;e.committed=committed;throw e;}
}
