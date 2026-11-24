import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {readExPrintingSchema,exInsertEffectProofV1} from '../catalog/ex_intrinsic_printing_execution_v1.mjs';
import {readMappingSchema} from './play_stamp_normal_recovery_market_mapping_v2.mjs';
import {assertStampSchema522FrameV1} from '../catalog/stamp_schema_522_continuity_v1.mjs';
import {assertStampSource7da8RunV1} from './stamp_source_7da8_context_v1.mjs';
import {playRecoveryMarketMappingCodeBindingV2} from '../../scripts/audits/play_stamp_normal_recovery_market_mapping_v2.mjs';

export const VERSION='FIGHTING_REGULAR_MAPPING_REPAIR_V1';
export const PROJECT='ycdxbpibncqcchqiihfz';
export const CONTEXT='FIGHTING_REGULAR_MAPPING_SCHEMA522_SOURCE7DA8_V1';
export const QUALIFICATION_DATABASE='fighting_regular_mapping_qualification_522_v2';
export const MAPPING_METHOD='reviewed_fighting_regular_coordinate_v1';
export const REGULAR='54d35e3d-2e91-4ef9-8804-c810559d3f45';
export const STAMP='94037abf-99a9-4f69-b4ed-7f39801dac95';
export const LEGACY='008b6314-3e64-4f26-b16a-b30d7bd1f000';
export const PARENTS=Object.freeze([LEGACY,REGULAR,STAMP]);
export const PRINTINGS=Object.freeze(['59bba297-e127-46ad-bd57-ab553b4219a6','6ce9db48-296f-46e7-adab-b2a7e241f94d','8e80aba4-c2b1-441c-931f-f94c052638c7']);
export const RAW_ID='-'+BigInt('0x'+hash({version:VERSION,mapping:132361}).slice(0,15));
export const EXPECTED=Object.freeze({raw_inserts:1,mapping_updates:1});
export const BOUNDARIES=Object.freeze({other_existing_row_updates:0,deletes:0,parent_writes:0,printing_writes:0,identity_writes:0,alias_writes:0,owner_writes:0,price_writes:0,assignment_writes:0,source_observation_writes:0,schema_writes:0});
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const same=(a,b,message)=>assert.equal(hash({value:a}),hash({value:b}),message);
const project=(row,keys)=>Object.fromEntries(keys.map(k=>[k,row[k]]));
const rows=async(c,sql,args=[])=>(await c.query(sql,args)).rows;
const jsonRows=async(c,sql,args=[]) => (await rows(c,sql,args)).map(r=>r.row);
const identifier=s=>{assert.match(s,/^[a-z0-9_]+$/);return '"'+s+'"';};
const rawFields=['id','source','status','notes','payload'];
const target=m=>String(m.id)==='132361';

export function repairCodeBindingV1(){
 const files=[...playRecoveryMarketMappingCodeBindingV2().files];
 for(const file of ['backend/pricing/fighting_regular_mapping_repair_v1.mjs','scripts/audits/fighting_regular_mapping_repair_v1.mjs','docs/contracts/FIGHTING_REGULAR_MAPPING_REPAIR_V1.md'])files.push({file,sha256:sha(fs.readFileSync(path.join(root,file)))});
 assert.equal(new Set(files.map(f=>f.file)).size,files.length);
 return {files,fingerprint:hash(files)};
}

export async function readRepairSchemaV1(c){
 return {
  canonical:await readExPrintingSchema(c),mapping:await readMappingSchema(c),
  triggers:await rows(c,"select tgrelid::regclass::text relation,tgname,pg_get_triggerdef(oid)definition,pg_get_functiondef(tgfoid)function from pg_trigger where tgrelid=any(array['public.external_mappings'::regclass,'public.raw_imports'::regclass])and not tgisinternal order by 1,2"),
  rules:await rows(c,"select ev_class::regclass::text relation,rulename,pg_get_ruledef(oid)definition from pg_rewrite where ev_class=any(array['public.external_mappings'::regclass,'public.raw_imports'::regclass])and rulename<>'_RETURN'order by 1,2"),
  mapping_inbound:await rows(c,"select n.nspname schema,t.relname relation,k.conname name,array(select a.attname::text from unnest(k.confkey)with ordinality x(attnum,pos)join pg_attribute a on a.attrelid=k.confrelid and a.attnum=x.attnum order by x.pos)target_columns,pg_get_constraintdef(k.oid)definition from pg_constraint k join pg_class t on t.oid=k.conrelid join pg_namespace n on n.oid=t.relnamespace where k.contype='f'and k.confrelid='public.external_mappings'::regclass order by 1,2,3"),
 };
}
export function assertRepairSchemaV1(schema){
 assertStampSchema522FrameV1(schema.canonical,'canonical28');
 assertStampSchema522FrameV1(schema.mapping,'mapping28');
 exInsertEffectProofV1(schema.canonical);
 assert.equal(schema.triggers.length,0,'Unreviewed mutation trigger');
 assert.equal(schema.rules.length,0,'Unreviewed rewrite rule');
 for(const fk of schema.mapping_inbound)assert.ok(fk.target_columns.every(k=>!['card_print_id','meta'].includes(k)),'Mutable mapping column has inbound dependency');
 return {version:VERSION,schema_fingerprint:hash(schema),updated_table:'public.external_mappings',updated_id:'132361',updated_columns:['card_print_id','meta'],insert_table:'public.raw_imports',insert_id:RAW_ID,owner_row_writes:0,owner_json_writes:0,indirect_writes:0,unprovided_sequence_calls:0};
}

export async function readRepairStateV1(c,schema){
 const effect=assertRepairSchemaV1(schema),state={effect_proof:effect};
 state.parents=await jsonRows(c,'select to_jsonb(t)row from public.card_prints t where id=any($1::uuid[])order by id',[PARENTS]);
 state.identities=await jsonRows(c,'select to_jsonb(t)row from public.card_print_identity t where card_print_id=any($1::uuid[])order by id',[PARENTS]);
 state.printings=await jsonRows(c,'select to_jsonb(t)row from public.card_printings t where card_print_id=any($1::uuid[])or id=any($2::uuid[])order by id',[PARENTS,PRINTINGS]);
 state.reviews=await jsonRows(c,'select to_jsonb(t)row from public.card_printing_truth_reviews t where card_printing_id=any($1::uuid[])order by id',[state.printings.map(v=>v.id)]);
 state.aliases=await jsonRows(c,'select to_jsonb(t)row from public.card_print_identity_aliases t where legacy_card_print_id=any($1::uuid[])or canonical_card_print_id=any($1::uuid[])order by id',[PARENTS]);
 state.mapping_aliases=await jsonRows(c,'select to_jsonb(t)row from public.external_mapping_aliases t where canonical_external_mapping_id=132361 or preserved_from_mapping_id=132361 order by id');
 state.printing_assertions=await jsonRows(c,"select to_jsonb(t)row from public.external_printing_mappings t where source in('tcgplayer','tcgplayer_market')and(card_printing_id=any($1::uuid[])or split_part(external_id,':',1)=any($2::text[]))order by id",[PRINTINGS,['497553','538759']]);
 state.mappings=await jsonRows(c,"select to_jsonb(t)row from public.external_mappings t where card_print_id=any($1::uuid[])or(source='tcgplayer'and external_id=any($2::text[]))order by id",[PARENTS,['497553','538759']]);
 state.raw=await jsonRows(c,"select (to_jsonb(t)-'id')||jsonb_build_object('id',id::text)row from public.raw_imports t where id=$1::bigint",[RAW_ID]);
 const source={run:(await jsonRows(c,"select to_jsonb(t)row from public.tcgcsv_source_sync_runs t where status='completed'and sync_mode='current_full_sync'and failed_count=0 order by finished_at desc,created_at desc,id desc limit 1"))[0]};
 source.categories=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_categories t where category_id=3');
 source.groups=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_groups t where group_id=any($1::int[])order by group_id',[[22880,23120]]);
 source.products=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_products t where product_id=any($1::int[])order by product_id',[[497553,538759]]);
 source.observations=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_price_daily_observations t where product_id=any($1::int[])and last_seen_run_id=$2::uuid order by product_id,subtype_name',[[497553,538759],source.run?.id]);
 source.artifacts=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_artifacts t where id=any($1::uuid[])order by id',[[...new Set(source.observations.map(o=>o.source_artifact_id))]]);state.source=source;
 const groups=new Map();for(const key of schema.canonical.foreign_keys){const name=key.schema+'.'+key.relation;if(!groups.has(name))groups.set(name,[]);groups.get(name).push(key);}
 state.foreign_footprints=[];
 for(const keys of groups.values()){
  const {schema:s,relation}=keys[0],args=keys.map(k=>k.target==='card_prints'?PARENTS:PRINTINGS);
  let where='('+keys.map((k,i)=>`t.${identifier(k.column_name)}=any($${i+1}::uuid[])`).join(' or ')+')';
  if(s==='public'&&relation==='external_mappings'){args.push('132361');where+=`and t.id<>$${args.length}::bigint`;}
  const value=(await rows(c,`select count(*)::int rows,encode(sha256(convert_to(coalesce(string_agg(md5(to_jsonb(t)::text),''order by md5(to_jsonb(t)::text)),''),'UTF8')),'hex')digest from ${identifier(s)}.${identifier(relation)} t where ${where}`,args))[0];
  state.foreign_footprints.push({schema:s,relation,...value});
 }
 // The fixed two SQL mutations cannot touch an owner table or owner JSON. Both
 // tables have zero user triggers/rules; no changed mapping column is referenced.
 // No scan of unrelated private JSON, or absence-of-ownership claim, is made.
 state.owner_json_effect_proof={mode:'preserved_by_reviewed_bounded_update_effects',effect_fingerprint:hash(effect),owner_row_writes:0,owner_json_writes:0,global_json_scan_performed:false};
 return state;
}

export function assertRepairSourceV1(source,{now=Date.now()}={}){
 assertStampSource7da8RunV1(source.run);const age=now-Date.parse(source.run.finished_at);assert.ok(Number.isFinite(age)&&age>=0&&age<36*3600000,'Source stale or future');
 assert.equal(source.categories.length,1);assert.equal(source.categories[0].category_id,3);assert.equal(source.categories[0].name,'Pokemon');
 assert.equal(source.groups.length,2);assert.equal(source.products.length,2);assert.equal(source.observations.length,3);assert.equal(source.artifacts.length,2);assert.equal(new Set(source.artifacts.map(a=>a.id)).size,2);assert.equal(new Set(source.observations.map(o=>o.id)).size,3);
 for(const [id,group,name]of [[497553,23120,'SV02: Paldea Evolved'],[538759,22880,'Prize Pack Series Cards']]){
  const p=source.products.find(v=>v.product_id===id),g=source.groups.find(v=>v.group_id===group);assert.ok(p&&g);assert.equal(g.category_id,3);assert.equal(g.name,name);
  for(const[k,v]of Object.entries({name:id===497553?'Fighting Au Lait':'Fighting Au Lait - 181/193',category_id:3,group_id:group,source_active:true,catalog_metadata_status:'current',last_seen_run_id:source.run.id}))assert.equal(p[k],v,'Source product changed: '+k);
  same(p.extended_data.filter(f=>f.name==='Number').map(f=>f.value),['181/193']);
 }
 same(source.observations.map(o=>[o.product_id,o.subtype_name]),[[497553,'Normal'],[497553,'Reverse Holofoil'],[538759,'Normal']]);
 for(const o of source.observations){assert.equal(o.category_id,3);assert.equal(o.group_id,o.product_id===497553?23120:22880);assert.equal(o.currency,'USD');assert.ok(Number.isFinite(Number(o.market_price))&&Number(o.market_price)>0);assert.equal(o.last_seen_run_id,source.run.id);assert.equal(o.observed_on,source.run.observed_on);assert.match(o.payload_hash,/^[a-f0-9]{64}$/);const a=source.artifacts.find(v=>v.id===o.source_artifact_id);assert.ok(a);assert.equal(a.sync_run_id,source.run.id);assert.equal(a.artifact_kind,'prices');assert.equal(a.category_id,3);assert.equal(a.group_id,o.group_id);assert.equal(a.http_status,200);assert.ok(Number(a.byte_size)>0);assert.match(a.sha256,/^[a-f0-9]{64}$/);}
}
function assertBefore(state,schema,observedAt){
 assertRepairSchemaV1(schema);assertRepairSourceV1(state.source,{now:Date.parse(observedAt)});assert.equal(state.parents.length,3);assert.equal(state.aliases.length,0,'Identity alias adjudication changed');assert.equal(state.mapping_aliases.length,0,'Mapping alias adjudication changed');assert.equal(state.printing_assertions.length,0,'Competing printing assertion');assert.equal(state.raw.length,0);
 for(const[id,gv,variant]of [[REGULAR,'GV-PK-PAL-181',''],[STAMP,'GV-PK-PAL-181-PLAY-POKEMON-STAMP','play_pokemon_stamp'],[LEGACY,'GV-PK-SV02-181-PRIZE-PACK-STAMP','prize_pack_stamp']]){
  const p=state.parents.find(v=>v.id===id);assert.ok(p);assert.equal(p.gv_id,gv);assert.equal(p.variant_key,variant);assert.equal(p.name,'Fighting Au Lait');assert.equal(String(p.number),'181');assert.equal(p.set_id,'5fc35881-b563-4fb7-870b-8d14035f4557');assert.equal(p.set_code,'sv02');assert.equal(p.identity_domain,'pokemon_eng_standard');assert.equal(p.printed_identity_modifier,null);assert.equal(state.identities.filter(v=>v.card_print_id===id&&v.is_active&&v.identity_domain==='pokemon_eng_standard'&&v.printed_number==='181').length,1);
 }
 assert.equal(state.printings.length,3);for(const[id,parent,finish,gv]of [[PRINTINGS[0],LEGACY,'normal','GV-PK-SV02-181-PRIZE-PACK-STAMP-STD'],[PRINTINGS[1],REGULAR,'normal','GV-PK-PAL-181-STD'],[PRINTINGS[2],REGULAR,'reverse','GV-PK-PAL-181-RH']]){const p=state.printings.find(v=>v.id===id);assert.ok(p);assert.equal(p.card_print_id,parent);assert.equal(p.finish_key,finish);assert.equal(p.printing_gv_id,gv);assert.equal(p.is_provisional,false);}
 assert.ok(!state.reviews.some(v=>v.active&&['hidden_pending_review','hidden_unsupported'].includes(v.public_visibility)),'Printing review blocks routing');
 assert.equal(state.mappings.length,5);const before=state.mappings.find(target);assert.ok(before);assert.equal(before.source,'tcgplayer');assert.equal(before.external_id,'497553');assert.equal(before.card_print_id,STAMP);assert.equal(before.active,true);assert.equal(before.meta?.tcgcsv_group_id,'23120');assert.equal(before.meta?.product_number,'181/193');assert.equal(before.meta?.product_name,'Fighting Au Lait');assert.ok(!before.meta?.reviewed_correction&&!before.meta?.mapping_correction_version&&!before.meta?.reviewed_invalidation?.reason_code);assert.ok(!before.meta?.mapping_method,'Unexpected prior reviewed method');
 assert.equal(state.mappings.filter(m=>m.source==='tcgplayer').length,1);
 for(const[id,parent,source,external]of [['24492',REGULAR,'tcgdex','sv02-181'],['28806',REGULAR,'pokemonapi','sv2-181'],['94440',REGULAR,'justtcg','pokemon-sv02-paldea-evolved-fighting-au-lait-uncommon'],['121249',STAMP,'justtcg','pokemon-prize-pack-series-cards-fighting-au-lait-uncommon']]){const m=state.mappings.find(v=>String(v.id)===id);assert.ok(m);assert.equal(m.card_print_id,parent);assert.equal(m.source,source);assert.equal(m.external_id,external);assert.equal(m.active,true);}
 const j=state.mappings.find(v=>String(v.id)==='94440');assert.equal(j.meta.justtcg_number,'181/193');assert.equal(j.meta.justtcg_set_id,'sv02-paldea-evolved-pokemon');assert.equal(j.meta.justtcg_name,'Fighting Au Lait');
 same(state.foreign_footprints.map(f=>f.schema+'.'+f.relation),[...new Set(schema.canonical.foreign_keys.map(k=>k.schema+'.'+k.relation))],'Complete foreign-reference coverage required');for(const f of state.foreign_footprints){assert.ok(Number.isSafeInteger(f.rows)&&f.rows>=0);assert.match(f.digest,/^[a-f0-9]{64}$/);}same(state.effect_proof,assertRepairSchemaV1(schema));same(state.owner_json_effect_proof,{mode:'preserved_by_reviewed_bounded_update_effects',effect_fingerprint:hash(state.effect_proof),owner_row_writes:0,owner_json_writes:0,global_json_scan_performed:false});
}
function makePlan({schema,state,observedAt}){
 assert.ok(Number.isFinite(Date.parse(observedAt)));assertBefore(state,schema,observedAt);const before=state.mappings.find(target),evidence=hash({version:VERSION,context:CONTEXT,before,regular:state.parents.find(p=>p.id===REGULAR),identities:state.identities,source:state.source,protected_state:hash(state)});
 const after={...before,card_print_id:REGULAR,meta:{...before.meta,mapping_method:MAPPING_METHOD,mapping_correction_version:VERSION,mapping_correction_reason:'Regular SV02 181/193 product; stamped Prize Pack product538759 remains separate.',mapping_correction_prior_card_print_id:STAMP,reviewed_correction:{raw_import_id:RAW_ID,evidence_fingerprint:evidence,reviewed_at:observedAt}}};
 const raw={id:RAW_ID,source:VERSION,status:'processed',notes:'One reviewed regular-product ownership correction; no stamped identity or printing mutation.',payload:{version:VERSION,context:CONTEXT,evidence_fingerprint:evidence,mapping_before:before,mapping_after:after,source_snapshot_fingerprint:hash(state.source),protected_state_fingerprint:hash(state),schema_fingerprint:hash(schema),expected:EXPECTED,boundaries:BOUNDARIES}};
 const body={version:VERSION,context:CONTEXT,project_ref:PROJECT,observed_at:observedAt,schema,state_before:state,before,after,raw,expected:EXPECTED,boundaries:BOUNDARIES};return{...body,fingerprint:hash(body)};
}
export function freezeRepairPlanV1(input){return makePlan(input);}
export function assertRepairPlanV1(plan,fingerprint){assert.equal(plan.fingerprint,fingerprint);same(plan,makePlan({schema:plan.schema,state:plan.state_before,observedAt:plan.observed_at}),'Frozen repair plan changed');return plan;}
export function classifyRepairStateV1(plan,state){
 for(const key of ['parents','identities','printings','reviews','aliases','mapping_aliases','printing_assertions','source','foreign_footprints','effect_proof','owner_json_effect_proof'])same(state[key],plan.state_before[key],'Protected drift: '+key);
 same(state.mappings.filter(m=>!target(m)),plan.state_before.mappings.filter(m=>!target(m)),'Other mappings changed');assert.equal(state.mappings.filter(target).length,1);const actual=state.mappings.find(target);
 if(hash(actual)===hash(plan.before)&&state.raw.length===0)return 'before';
 same(actual,plan.after,'Partial or unexpected correction');assert.equal(state.raw.length,1,'Missing or colliding audit receipt');same(project(state.raw[0],rawFields),plan.raw,'Audit receipt changed');return 'exact';
}
export function assertRepairAuthorityV1(a,{plan,codeFingerprint,mode,now=Date.now()}){
 assertRepairPlanV1(plan,plan.fingerprint);assert.ok(a,'Exact owner approval required');const{fingerprint,...body}=a;assert.equal(hash(body),fingerprint);assert.equal(a.version,'FIGHTING_REGULAR_MAPPING_AUTHORITY_V1');assert.equal(a.status,'explicit_founder_approval');assert.equal(a.project_ref,PROJECT);assert.equal(a.plan_fingerprint,plan.fingerprint);assert.equal(a.code_fingerprint,codeFingerprint);assert.match(codeFingerprint,/^[a-f0-9]{64}$/);same(a.expected,EXPECTED);same(a.boundaries,BOUNDARIES);same(a.modes,['rollback','apply']);assert.ok(a.modes.includes(mode));assert.match(a.owner_decision_sha256,/^[a-f0-9]{64}$/);const start=Date.parse(a.issued_at),end=Date.parse(a.expires_at);assert.ok(Number.isFinite(start)&&Number.isFinite(end)&&start<=now&&now<end&&end-start<=24*3600000,'Approval expired or invalid');
}
export function assertRepairRollbackV1(r,{plan,codeFingerprint,now=Date.now()}){
 assert.ok(r&&r.version===VERSION&&r.project_ref===PROJECT&&r.mode==='rollback'&&r.environment==='production'&&r.rollback_proven===true&&r.committed===false&&r.commit_uncertain===false);assert.equal(r.plan_fingerprint,plan.fingerprint);assert.equal(r.code_fingerprint,codeFingerprint);same(r.writes,EXPECTED);assert.equal(r.before_state_fingerprint,r.rollback_state_fingerprint);const age=now-Date.parse(r.finished_at);assert.ok(Number.isFinite(age)&&age>=0&&age<3600000,'Fresh matching production rollback required');
}
export function assertOperatorReleaseGateV1({coordination:g,closure:p},{now=Date.now()}={}){
 assert.equal(g?.active,false,'Shared main-merge hold is active or unknown');assert.equal(g.releaseAccepted,true,'Catalog release not accepted');assert.equal(g.verificationInProgress,false,'Release verification is active or unknown');assert.equal(g.productionLedger,522,'Unreviewed production schema');
 assert.equal(p?.version,'PRICING_DUPLICATE_RELEASE_CLOSURE_VERIFY_V1');assert.equal(p.pass,true);assert.equal(p.project_ref,PROJECT);assert.equal(p.production_ledger,522);assert.equal(p.original_controls_restored,true);assert.equal(p.api_data_security_reliability_verified,true);assert.equal(p.production_pages_verified,25);assert.match(p.main_sha,/^[a-f0-9]{40}$/);assert.equal(p.deployment_sha,p.main_sha);const age=now-Date.parse(p.verified_at);assert.ok(Number.isFinite(age)&&age>=0&&age<3600000,'Fresh independent deployed closure proof required');
 return {coordination_fingerprint:hash(g),closure_fingerprint:hash(p)};
}
export function readOperatorReleaseGateV1(){
 const base='C:/grookai_vault_operator_artifacts/';
 const coordination=JSON.parse(fs.readFileSync(base+'duplicate_set_merge_pause_20261122/status.json'));assert.equal(coordination.active,false,'Shared main-merge hold is active or unknown');
 return assertOperatorReleaseGateV1({coordination,closure:JSON.parse(fs.readFileSync(base+'play_stamp_normal_market_scope_fix_20261123/duplicate-release-independent-closure-v1.json'))});
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
   await c.query('select id from public.external_mappings where id=$1::bigint for update',['132361']);
   const r=plan.raw;proof.writes.raw_inserts=(await c.query('insert into public.raw_imports(id,source,status,notes,payload)values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)])).rowCount;
   proof.writes.mapping_updates=(await c.query('update public.external_mappings t set card_print_id=$2::uuid,meta=$3::jsonb where id=$1::bigint and to_jsonb(t)=$4::jsonb',['132361',REGULAR,JSON.stringify(plan.after.meta),JSON.stringify(plan.before)])).rowCount;same(proof.writes,EXPECTED,'Expected exactly one correction and one receipt');
   if(fault==='duplicate_raw_after_update')await c.query('insert into public.raw_imports(id,source,status,notes,payload)values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)]);
   if(fault==='other_mapping_change')await c.query('update public.external_mappings set active=false where id=$1::bigint',['121249']);
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
