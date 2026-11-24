import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {readRepairSchemaV1,assertRepairSchemaV1,readOperatorReleaseGateV1,REGISTRY as regular29,RAW_ID as regular29Raw,VERSION as regular29Version} from './regular_product_mapping_correction_524_v1.mjs';
import {priceLinkCodeBindingV1 as predecessorBinding,PRODUCTS as firstProducts} from './japanese_reviewed_price_links_v1.mjs';
import {gunzipSync} from 'node:zlib';
import {assertStampSource7da8RunV1} from './stamp_source_7da8_context_v1.mjs';

export const VERSION='JAPANESE_REVIEWED_PRICE_LINKS_V2';
export const PROJECT='ycdxbpibncqcchqiihfz';
export const CONTEXT='EXISTING_JAPANESE_4916_REVIEWED_LINKS_SCHEMA524_SOURCE7DA8_V2';
export const QUALIFICATION_DATABASE='japanese_reviewed_price_links_qualification_524_v2_1';
const root=fileURLToPath(new URL('../../',import.meta.url)),folder='docs/catalog/japanese_reviewed_price_links_v2';
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
export const REGISTRY=freeze(JSON.parse(fs.readFileSync(path.join(root,folder,'index.json'))));
const snapshotBytes=fs.readFileSync(path.join(root,folder,'snapshot.public.json.gz'));assert.equal(createHash('sha256').update(snapshotBytes).digest('hex'),REGISTRY.snapshot_file_sha256);
export const SNAPSHOT=freeze(JSON.parse(gunzipSync(snapshotBytes)));
assert.deepEqual(REGISTRY.excluded_frozen_v1_product_ids,[...firstProducts].sort((a,b)=>a-b));assert.ok(REGISTRY.targets.every(t=>!firstProducts.includes(t.product_id)));
const {fingerprint,...registryBody}=REGISTRY;
assert.equal(fingerprint,'b6d02a9e4bd3edb7afe825c3a2ebfc9862aba7e1d16ba8fa5212d47f8134a35b');
assert.equal(hash(registryBody),fingerprint);assert.equal(hash(SNAPSHOT),REGISTRY.snapshot_fingerprint);
assert.equal(REGISTRY.context,CONTEXT);assert.equal(REGISTRY.project_ref,PROJECT);assert.equal(REGISTRY.targets.length,4916);
export const PRODUCTS=Object.freeze(REGISTRY.targets.map(t=>t.product_id));
export const PARENTS=Object.freeze(REGISTRY.targets.map(t=>t.parent_id));
export const PRINTINGS=Object.freeze(REGISTRY.targets.map(t=>t.printing_id));
export const MAPPING_IDS=Object.freeze(REGISTRY.targets.map(t=>t.mapping_id));
for(const list of[PRODUCTS,PARENTS,PRINTINGS,MAPPING_IDS])assert.equal(new Set(list).size,4916);
export const RAW_ID='-'+BigInt('0x'+hash({version:VERSION,registry:fingerprint}).slice(0,15));
export const EXPECTED=Object.freeze({printing_mapping_inserts:4916,raw_inserts:1});
export const BOUNDARIES=Object.freeze({existing_row_updates:0,deletes:0,parent_writes:0,printing_writes:0,identity_writes:0,review_writes:0,alias_writes:0,owner_writes:0,image_writes:0,parent_mapping_writes:0,price_writes:0,assignment_writes:0,publication_writes:0,source_writes:0,schema_writes:0,sequence_calls:0});
const sha=x=>createHash('sha256').update(x).digest('hex');
const same=(a,b,why)=>assert.equal(hash({value:a}),hash({value:b}),why);
const project=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]]));
const rows=async(c,sql,args=[])=>(await c.query(sql,args)).rows;
const jsonRows=async(c,sql,args=[])=>(await rows(c,sql,args)).map(x=>x.row);
const rawFields=['id','source','status','notes','payload'];
const parentFields=['id','game_id','set_id','gv_id','identity_domain','set_code','number','name','variant_key','printed_identity_modifier','print_identity_key','set_identity_model'];
const printingFields=['id','card_print_id','printing_gv_id','finish_key','is_provisional','provenance_source','provenance_ref','created_by'];
function mappingTimestamp(value){const m=/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00(?::00)?)$/.exec(value??'');assert.ok(m&&Number.isFinite(Date.parse(value)),'Invalid UTC mapping timestamp');return m[1]+'.'+(m[2]??'').padEnd(6,'0')+'Z';}
const normalizeMappings=list=>list.map(x=>({...x,synced_at:mappingTimestamp(x.synced_at)})).sort((a,b)=>a.id.localeCompare(b.id));

export function priceLinkCodeBindingV2(){
 const files=[...predecessorBinding().files];
 for(const file of['backend/pricing/japanese_reviewed_price_links_v2.mjs','scripts/audits/japanese_reviewed_price_links_v2.mjs',folder+'/index.json',folder+'/snapshot.public.json.gz',folder+'/schema524.json','docs/contracts/JAPANESE_REVIEWED_PRICE_LINKS_V2.md'])files.push({file,sha256:sha(fs.readFileSync(path.join(root,file)))});
 assert.equal(new Set(files.map(x=>x.file)).size,files.length);return{files,fingerprint:hash(files)};
}

export async function readPriceLinkSchemaV2(c){
 const schema={base:await readRepairSchemaV1(c)};
 schema.printing_mapping={columns:await rows(c,"select ordinal_position,column_name,data_type,udt_schema,udt_name,is_nullable,column_default,is_identity,identity_generation,is_generated,generation_expression from information_schema.columns where table_schema='public'and table_name='external_printing_mappings'order by ordinal_position"),constraints:await rows(c,"select conname name,contype type,condeferrable deferrable,condeferred deferred,convalidated validated,pg_get_constraintdef(oid,true)definition from pg_constraint where conrelid='public.external_printing_mappings'::regclass order by conname"),indexes:await rows(c,"select indexname name,indexdef definition from pg_indexes where schemaname='public'and tablename='external_printing_mappings'order by indexname"),security:await rows(c,"select pg_get_userbyid(c.relowner)owner,c.relrowsecurity rls,c.relforcerowsecurity force_rls,c.relacl::text acl from pg_class c where c.oid='public.external_printing_mappings'::regclass"),policies:await rows(c,"select policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public'and tablename='external_printing_mappings'order by policyname"),triggers:await rows(c,"select tgname name,pg_get_triggerdef(oid,true)definition from pg_trigger where tgrelid='public.external_printing_mappings'::regclass and not tgisinternal order by tgname"),rules:await rows(c,"select rulename name,definition from pg_rules where schemaname='public'and tablename='external_printing_mappings'order by rulename"),inbound:await rows(c,"select n.nspname schema,c.relname relation,k.conname name,pg_get_constraintdef(k.oid,true)definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where k.contype='f'and k.confrelid='public.external_printing_mappings'::regclass order by n.nspname,c.relname,k.conname")};
 schema.views=await rows(c,"select c.relname name,pg_get_viewdef(c.oid,true)definition,c.reloptions options,pg_get_userbyid(c.relowner)owner,c.relacl::text acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'and c.relname=any($1::text[])order by c.relname",[['v_cross_tcg_market_targets_v2','v_cross_tcg_market_candidates_v2']]);
 schema.subtype_function=await rows(c,"select p.oid::regprocedure::text signature,pg_get_functiondef(p.oid)definition,p.prosecdef security_definer,p.proconfig config,pg_get_userbyid(p.proowner)owner,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname='normalize_tcgplayer_market_subtype_v1'order by signature");
 return schema;
}

export function assertPriceLinkSchemaV2(schema){
 const expected=JSON.parse(fs.readFileSync(path.join(root,folder,'schema524.json')));
 assert.equal(hash(expected),REGISTRY.schema_fingerprint);same(schema,expected,'Unreviewed mapping/schema/security/view effects');assertRepairSchemaV1(schema.base);
 assert.equal(schema.printing_mapping.triggers.length,0);assert.equal(schema.printing_mapping.rules.length,0);
 same(schema.printing_mapping.columns.map(x=>x.column_name),['id','card_printing_id','source','external_id','active','synced_at','meta'],'Insert column effects changed');
 assert.ok(schema.printing_mapping.columns.every(x=>x.is_identity==='NO'&&x.is_generated==='NEVER'));
 assert.equal(schema.printing_mapping.constraints.length,3);assert.equal(schema.views.length,2);assert.equal(schema.subtype_function.length,1);
 return{version:VERSION,schema_fingerprint:hash(schema),tables:['external_printing_mappings','raw_imports'],existing_row_updates:0,indirect_owner_or_json_writes:0,sequence_calls:0};
}

export async function readPriceLinkStateV2(c,schema){
 assertPriceLinkSchemaV2(schema);
 const state={parents:await jsonRows(c,'select to_jsonb(t)row from public.card_prints t where id=any($1::uuid[])order by id',[PARENTS]),identities:await jsonRows(c,'select to_jsonb(t)row from public.card_print_identity t where card_print_id=any($1::uuid[])order by id',[PARENTS]),printings:await jsonRows(c,'select to_jsonb(t)row from public.card_printings t where card_print_id=any($1::uuid[])order by id',[PARENTS]),reviews:await jsonRows(c,'select to_jsonb(t)row from public.card_printing_truth_reviews t where card_printing_id=any($1::uuid[])order by id',[PRINTINGS]),aliases:await jsonRows(c,'select to_jsonb(t)row from public.card_print_identity_aliases t where legacy_card_print_id=any($1::uuid[])or canonical_card_print_id=any($1::uuid[])order by id',[PARENTS]),parent_mappings:await jsonRows(c,"select to_jsonb(t)row from public.external_mappings t where source='tcgplayer'and(card_print_id=any($1::uuid[])or external_id=any($2::text[]))order by id",[PARENTS,PRODUCTS.map(String)]),printing_mappings:await jsonRows(c,"select to_jsonb(t)row from public.external_printing_mappings t where id=any($1::uuid[])or card_printing_id=any($2::uuid[])or(source in('tcgplayer','tcgplayer_market')and split_part(external_id,':',1)=any($3::text[]))order by id",[MAPPING_IDS,PRINTINGS,PRODUCTS.map(String)]),raw:await jsonRows(c,"select (to_jsonb(t)-'id')||jsonb_build_object('id',id::text)row from public.raw_imports t where id=$1::bigint",[RAW_ID])};
 const source={run:(await jsonRows(c,"select to_jsonb(t)row from public.tcgcsv_source_sync_runs t where status='completed'and sync_mode='current_full_sync'and failed_count=0 order by finished_at desc,created_at desc,id desc limit 1"))[0]};
 source.categories=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_categories t where category_id=85');
 source.products=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_products t where product_id=any($1::int[])order by product_id',[PRODUCTS]);
 source.groups=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_groups t where category_id=85 and group_id=any($1::int[])order by group_id',[[...new Set(REGISTRY.targets.map(t=>t.group_id))]]);
 source.current_quotes=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_price_daily_observations t where category_id=85 and observed_on=$3::date and product_id=any($1::int[])and last_seen_run_id=$2::uuid order by product_id,subtype_name',[PRODUCTS,source.run?.id,source.run?.observed_on]);
 source.prior_quotes=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_price_daily_observations t where id=any($1::uuid[])order by id',[REGISTRY.targets.map(t=>t.prior_observation_id)]);
 source.artifacts=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_artifacts t where id=any($1::uuid[])order by id',[[...new Set([...source.current_quotes,...source.prior_quotes].map(x=>x.source_artifact_id))]]);
 state.source=source;
 const links=await rows(c,'select id::text,card_print_id,source,external_id,active,meta from public.external_mappings where id=any($1::bigint[])order by id',[regular29.targets.map(t=>t.mapping_id)]);
 state.prerequisite={regular29_correct:regular29.targets.filter(t=>links.some(m=>m.id===t.mapping_id&&m.card_print_id===t.regular.id&&m.source==='tcgplayer'&&m.external_id===String(t.product_id)&&m.active&&m.meta?.mapping_correction_version===regular29Version)).length,regular29_audit_present:(await rows(c,'select exists(select 1 from public.raw_imports where id=$1::bigint and source=$2 and status=\'processed\')present',[regular29Raw,regular29Version]))[0].present};
 return state;
}

export function assertPriceLinkFactsV2(state,{now=Date.now(),fresh=true}={}){
 same(Object.keys(state).sort(),['parents','identities','printings','reviews','aliases','parent_mappings','printing_mappings','raw','source','prerequisite'].sort(),'Unexpected state scope');
 same(state.parents.map(x=>x.id).sort(),[...PARENTS].sort(),'Parent scope changed');same(state.printings.map(x=>x.id).sort(),[...PRINTINGS].sort(),'Existing printing family changed');
 same(state.aliases,SNAPSHOT.aliases,'Approved inbound alias resolution changed');assert.equal(state.aliases.length,30);assert.equal(REGISTRY.approved_inbound_alias_count,30);
 for(const a of state.aliases){assert.equal(a.active,true);assert.equal(a.authority_status,'approved');assert.ok(PARENTS.includes(a.canonical_card_print_id));assert.ok(!PARENTS.includes(a.legacy_card_print_id),'Never select a legacy alias parent');const p=state.parents.find(x=>x.id===a.canonical_card_print_id);assert.equal(a.canonical_set_code,p.set_code);assert.equal(a.authority_decision.official_printed_number.replace(/^0+/,''),String(p.number).replace(/^0+/,''));}
 assert.equal(state.parent_mappings.length,0,'Existing parent-provider mapping requires review');
 assert.equal(state.prerequisite.regular29_correct,29,'Regular29 prerequisite not applied');assert.equal(state.prerequisite.regular29_audit_present,true);
 same(state.source,SNAPSHOT.source,'Exact archived/current provider evidence changed');assertStampSource7da8RunV1(state.source.run);
 if(fresh){const age=now-Date.parse(state.source.run.finished_at);assert.ok(Number.isFinite(age)&&age>=0&&age<36*3600000,'Source stale or future');}
 assert.equal(state.source.current_quotes.length,4916);assert.equal(state.source.prior_quotes.length,4916);
 for(const t of REGISTRY.targets){
  const p=state.parents.find(x=>x.id===t.parent_id),oldParent=SNAPSHOT.parents.find(x=>x.id===t.parent_id),ch=state.printings.find(x=>x.id===t.printing_id),oldChild=SNAPSHOT.printings.find(x=>x.id===t.printing_id),identities=state.identities.filter(x=>x.card_print_id===p.id&&x.is_active),reviews=state.reviews.filter(x=>x.card_printing_id===ch.id&&x.active);
  same(project(p,parentFields),project(oldParent,parentFields),'Reviewed parent identity changed');same(project(ch,printingFields),project(oldChild,printingFields),'Reviewed physical printing changed');
  assert.equal(p.identity_domain,'pokemon_jpn');assert.equal(p.variant_key,'');assert.equal(p.printed_identity_modifier,null);assert.equal(ch.is_provisional,false);assert.equal(ch.finish_key,t.finish_key);
  assert.equal(identities.length,1);assert.equal(identities[0].id,t.identity_id);assert.equal(identities[0].identity_key_hash,t.identity_key_hash);same(identities[0],SNAPSHOT.identities.find(x=>x.id===t.identity_id),'Active identity evidence changed');
  assert.equal(reviews.length,1);const r=reviews[0];assert.equal(r.id,t.review_id);assert.equal(hash(r),t.review_fingerprint,'Physical review changed');assert.equal(r.review_status,'verified');assert.equal(r.public_visibility,'visible');same(r.expected_finish_keys,[t.finish_key]);
  const q=state.source.current_quotes.find(x=>x.id===t.current_observation_id),prior=state.source.prior_quotes.find(x=>x.id===t.prior_observation_id),product=state.source.products.find(x=>x.product_id===t.product_id);assert.ok(q&&prior&&product);
  for(const o of[q,prior]){assert.equal(o.product_id,t.product_id);assert.equal(o.category_id,85);assert.equal(o.group_id,t.group_id);assert.equal(o.subtype_name,t.source_subtype);assert.match(o.payload_hash,/^[a-f0-9]{64}$/);}
  assert.equal(q.currency,'USD');assert.equal(q.last_seen_run_id,REGISTRY.source_run_id);assert.equal(q.market_price,t.current_market_usd);assert.ok(Number(q.market_price)>0);assert.equal(product.source_active,true);assert.equal(product.catalog_metadata_status,'current');assert.equal(product.name,t.source_name);same(product.extended_data.filter(x=>x.name==='Number').map(x=>x.value),[t.source_number]);
  assert.equal(r.evidence.card_print_id,p.id);assert.equal(r.evidence.finish_key,ch.finish_key);assert.equal(r.evidence.source_observation_id,prior.id);assert.equal(r.evidence.source_artifact_id,prior.source_artifact_id);const artifact=state.source.artifacts.find(x=>x.id===prior.source_artifact_id);assert.ok(artifact);assert.equal(artifact.sha256,r.evidence.source_artifact_sha256);assert.equal(artifact.http_status,200);assert.ok(r.evidence.official_assertion_keys.length>0);
 }
 return{existing_printings:4916,normal:2911,holo:2005,current_quotes:4916,prior_reviewed_provider_quotes:4916,approved_inbound_aliases:30,physical_writes:0};
}

function makePlan({schema,state,observedAt}){
 assertPriceLinkSchemaV2(schema);assert.ok(Number.isFinite(Date.parse(observedAt)));assertPriceLinkFactsV2(state,{now:Date.parse(observedAt)});assert.equal(state.printing_mappings.length,0,'Existing active/inactive pricing links must remain intact');assert.equal(state.raw.length,0,'Private audit ID collision');
 const code=priceLinkCodeBindingV2();
 const mappings=normalizeMappings(REGISTRY.targets.map(t=>({id:t.mapping_id,card_printing_id:t.printing_id,source:'tcgplayer',external_id:String(t.product_id),active:true,synced_at:observedAt,meta:{mapping_authority:'reviewed_existing_japanese_printing_price_link_v2',mapping_version:VERSION,registry_fingerprint:REGISTRY.fingerprint,source_subtype:t.source_subtype,publication_hold_reason:t.publication_hold_reason,source_category_id:85,source_group_id:t.group_id,identity_id:t.identity_id,identity_key_hash:t.identity_key_hash,truth_review_id:t.review_id,truth_review_fingerprint:t.review_fingerprint,approved_inbound_alias_ids:t.approved_inbound_alias_ids,prior_source_observation_id:t.prior_observation_id,current_source_observation_id:t.current_observation_id,source_sync_run_id:REGISTRY.source_run_id,raw_import_id:RAW_ID,reviewed_at:observedAt}})));
 const raw={id:RAW_ID,source:VERSION,status:'processed',notes:'4916 exact provider links to existing verified Japanese printings; no physical, owner, source, price or publication mutation.',payload:{version:VERSION,context:CONTEXT,registry_fingerprint:REGISTRY.fingerprint,snapshot_fingerprint:REGISTRY.snapshot_fingerprint,schema_fingerprint:REGISTRY.schema_fingerprint,code_fingerprint:code.fingerprint,source_sync_run_id:REGISTRY.source_run_id,source_bundle_sha256:REGISTRY.source_bundle_sha256,mappings,expected:EXPECTED,boundaries:BOUNDARIES}};
 const body={version:VERSION,context:CONTEXT,project_ref:PROJECT,observed_at:observedAt,schema,state_before:state,mappings,raw,code_fingerprint:code.fingerprint,expected:EXPECTED,boundaries:BOUNDARIES};return{...body,fingerprint:hash(body)};
}
export const freezePriceLinkPlanV2=input=>makePlan(input);
export function assertPriceLinkPlanV2(plan,fingerprint){assert.equal(plan.fingerprint,fingerprint);same(plan,makePlan({schema:plan.schema,state:plan.state_before,observedAt:plan.observed_at}),'Frozen insert plan changed');return plan;}
const protectedState=state=>Object.fromEntries(Object.entries(state).filter(([k])=>!['printing_mappings','raw'].includes(k)));
export function classifyPriceLinkStateV2(plan,state){
 assertPriceLinkFactsV2(state,{fresh:false});
 if(state.printing_mappings.length===0&&state.raw.length===0)return'before';
 same(normalizeMappings(state.printing_mappings),plan.mappings,'Partial, unrelated or changed pricing links');assert.equal(state.raw.length,1,'Partial or colliding private audit');same(project(state.raw[0],rawFields),plan.raw,'Private audit changed');return'exact';
}

export function assertPriceLinkAuthorityV2(a,{plan,codeFingerprint,mode,now=Date.now()}){
 assertPriceLinkPlanV2(plan,plan.fingerprint);assert.ok(a,'Exact ordinary owner decision required');const{fingerprint,...body}=a;assert.equal(hash(body),fingerprint);assert.equal(a.version,'JAPANESE_REVIEWED_PRICE_LINK_AUTHORITY_V2');assert.equal(a.status,'explicit_founder_approval');assert.equal(a.project_ref,PROJECT);assert.equal(a.plan_fingerprint,plan.fingerprint);assert.equal(a.code_fingerprint,codeFingerprint);same(a.expected,EXPECTED);same(a.boundaries,BOUNDARIES);same(a.modes,['rollback','apply']);assert.ok(a.modes.includes(mode));assert.equal(a.preflight_flag_explicitly_authorized,true);assert.match(a.owner_decision_sha256,/^[a-f0-9]{64}$/);const start=Date.parse(a.issued_at),end=Date.parse(a.expires_at);assert.ok(start<=now&&now<end&&end-start<=24*3600000,'Decision expired or invalid');
}
export function assertPriceLinkRollbackV2(r,{plan,codeFingerprint,now=Date.now()}){
 assert.ok(r&&r.version===VERSION&&r.project_ref===PROJECT&&r.environment==='production'&&r.mode==='rollback'&&r.rollback_proven===true&&r.committed===false&&r.commit_uncertain===false);assert.equal(r.plan_fingerprint,plan.fingerprint);assert.equal(r.code_fingerprint,codeFingerprint);same(r.writes,EXPECTED);assert.equal(r.before_state_fingerprint,r.rollback_state_fingerprint);const age=now-Date.parse(r.finished_at);assert.ok(Number.isFinite(age)&&age>=0&&age<3600000,'Actual fresh matching production rollback required');
}
export function readPriceLinkReleaseGateV2(){return readOperatorReleaseGateV1();}
async function assertClient(c,local){const p=c.connectionParameters;if(local){assert.equal(p.host,'127.0.0.1');assert.equal(Number(p.port),55340);assert.equal(p.user,'postgres');assert.equal(p.database,QUALIFICATION_DATABASE);assert.equal((await c.query('select current_database()name')).rows[0].name,QUALIFICATION_DATABASE);}else{assert.equal(p.host,'db.'+PROJECT+'.supabase.co');assert.equal(Number(p.port),5432);assert.equal(p.user,'postgres');assert.equal(p.database,'postgres');assert.equal(p.ssl?.rejectUnauthorized,true);assert.ok(p.ssl?.ca);assert.equal(c.connection.stream.authorized,true);}}

async function transaction(options,local){
 const {client:c,plan,mode,authority,rollbackReceipt,fault=null}=options;assert.ok(['preflight','rollback','apply','readback'].includes(mode));assert.ok(!fault||(local&&['duplicate_raw_after_insert','other_printing_change'].includes(fault)),'Faults are local-only');if(!local)readPriceLinkReleaseGateV2();await assertClient(c,local);assertPriceLinkPlanV2(plan,plan.fingerprint);const code=priceLinkCodeBindingV2();assert.equal(code.fingerprint,options.codeFingerprint);assert.equal(plan.code_fingerprint,code.fingerprint);const write=['rollback','apply'].includes(mode);
 if(!local&&write){assertPriceLinkAuthorityV2(authority,{plan,codeFingerprint:code.fingerprint,mode});if(mode==='apply')assertPriceLinkRollbackV2(rollbackReceipt,{plan,codeFingerprint:code.fingerprint});}
 const locks=[],proof={version:VERSION,context:CONTEXT,project_ref:PROJECT,environment:local?'local_qualification':'production',mode,plan_fingerprint:plan.fingerprint,code_fingerprint:code.fingerprint,writes:{printing_mapping_inserts:0,raw_inserts:0},boundaries:BOUNDARIES,committed:false,commit_uncertain:false};let begun=false,commitSent=false;
 try{
  if(write)for(const name of['grookai:tcgcsv:current:v1','tcgplayer_market_publication_v1']){assert.equal((await rows(c,'select pg_try_advisory_lock(hashtext($1))acquired',[name]))[0].acquired,true,'Source/publication writer active');locks.push(name);}
  await c.query('begin isolation level serializable'+(write?'':' read only'));begun=true;await c.query("set local timezone='UTC'");await c.query("set local statement_timeout='45s'");await c.query("set local lock_timeout='5s'");same(await readPriceLinkSchemaV2(c),plan.schema,'Schema changed');const before=await readPriceLinkStateV2(c,plan.schema);assertPriceLinkFactsV2(before,{fresh:mode!=='readback'});proof.before=classifyPriceLinkStateV2(plan,before);proof.before_state_fingerprint=hash(before);
  if(mode==='readback')assert.equal(proof.before,'exact','Links not applied');
  if(write&&proof.before==='before'){
   await c.query('select id from public.card_printings where id=any($1::uuid[])order by id for key share',[PRINTINGS]);
   const r=plan.raw;proof.writes.raw_inserts=(await c.query('insert into public.raw_imports(id,source,status,notes,payload)values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)])).rowCount;
   proof.writes.printing_mapping_inserts=(await c.query('insert into public.external_printing_mappings(id,card_printing_id,source,external_id,active,synced_at,meta)select id,card_printing_id,source,external_id,active,synced_at,meta from jsonb_populate_recordset(null::public.external_printing_mappings,$1::jsonb)',[JSON.stringify(plan.mappings)])).rowCount;same(proof.writes,EXPECTED,'Exact4916+1 insert scope required');
   if(fault==='duplicate_raw_after_insert')await c.query('insert into public.raw_imports(id,source,status,notes,payload)values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)]);
   if(fault==='other_printing_change')await c.query("update public.card_printings set image_note=coalesce(image_note,'')||' LOCAL_FAULT'where id=$1::uuid",[PRINTINGS[0]]);
   const after=await readPriceLinkStateV2(c,plan.schema);assert.equal(classifyPriceLinkStateV2(plan,after),'exact');same(protectedState(after),protectedState(before),'Protected physical/source/mapping state changed');proof.exact_readback=true;proof.protected_state_fingerprint=hash(protectedState(after));
  }
  same(priceLinkCodeBindingV2(),code,'Producer changed');same(await readPriceLinkSchemaV2(c),plan.schema,'Precommit schema changed');if(!local){readPriceLinkReleaseGateV2();if(write)assertPriceLinkAuthorityV2(authority,{plan,codeFingerprint:code.fingerprint,mode});}
  if(mode==='apply'){commitSent=true;await c.query('commit');begun=false;proof.committed=true;}else{await c.query('rollback');begun=false;if(mode==='rollback'){await c.query('begin isolation level repeatable read read only');begun=true;await c.query("set local timezone='UTC'");const restored=await readPriceLinkStateV2(c,plan.schema);same(restored,before,'Rollback did not restore exact current state');proof.rollback_state_fingerprint=hash(restored);proof.rollback_proven=true;await c.query('rollback');begun=false;}}
  proof.finished_at=new Date().toISOString();return proof;
 }catch(e){if(commitSent&&!proof.committed)e.commit_uncertain=true;if(begun){try{await c.query('rollback');}catch{e.rollback_uncertain=true;}}throw e;}
 finally{for(const name of locks.reverse())await c.query('select pg_advisory_unlock(hashtext($1))',[name]).catch(()=>{});}
}
export const executePriceLinksV2=options=>transaction(options,false);
export const qualifyPriceLinksV2=options=>transaction(options,true);
