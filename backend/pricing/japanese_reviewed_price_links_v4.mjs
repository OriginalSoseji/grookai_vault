import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {readRepairSchemaV1,assertRepairSchemaV1,readOperatorReleaseGateV1,REGISTRY as regular29,RAW_ID as regular29Raw,VERSION as regular29Version} from './regular_product_mapping_correction_524_v1.mjs';
import {priceLinkCodeBindingV3 as predecessorBinding,PRODUCTS as firstProducts} from './japanese_reviewed_price_links_v3.mjs';
import {gunzipSync} from 'node:zlib';
import * as baseline from './japanese_reviewed_price_links_v2.mjs';
import {deriveJapaneseCurrentRegistryV1,assertJapaneseCurrentSourceEvidenceV1,currentJapaneseQuoteV1,currentJapaneseQuoteStatusV1,currentJapanesePublicationHoldV1,currentJapaneseQuoteIndexV1,assertJapaneseFrozenPhysicalEvidenceV1} from './japanese_current_source_evidence_v1.mjs';

export const VERSION='JAPANESE_REVIEWED_PRICE_LINKS_V4';
export const PROJECT='ycdxbpibncqcchqiihfz';
export const CONTEXT='EXISTING_JAPANESE_4916_CURRENT_PLAN_SOURCE_LINKS_SCHEMA524_V4';
export const QUALIFICATION_DATABASE='japanese_reviewed_price_links_qualification_524_v4_1';
const root=fileURLToPath(new URL('../../',import.meta.url)),folder='docs/catalog/japanese_reviewed_price_links_v2';
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
export const SNAPSHOT=baseline.SNAPSHOT;
export const REGISTRY=freeze(deriveJapaneseCurrentRegistryV1(baseline,{version:VERSION,context:CONTEXT}));
assert.equal(REGISTRY.targets.length,4916);
const fingerprint=REGISTRY.fingerprint;
assert.ok(REGISTRY.targets.every(t=>!firstProducts.includes(t.product_id)));
export const PRODUCTS=Object.freeze(REGISTRY.targets.map(t=>t.product_id));
export const PARENTS=Object.freeze(REGISTRY.targets.map(t=>t.parent_id));
export const PRINTINGS=Object.freeze(REGISTRY.targets.map(t=>t.printing_id));
export const MAPPING_IDS=Object.freeze(REGISTRY.targets.map(t=>t.mapping_id));
for(const list of[PRODUCTS,PARENTS,PRINTINGS,MAPPING_IDS])assert.equal(new Set(list).size,4916);
export const RAW_ID='-'+BigInt('0x'+hash({version:VERSION,registry:fingerprint}).slice(0,15));
export const EXPECTED=Object.freeze({printing_mapping_inserts:4916,raw_inserts:1});
export const BOUNDARIES=Object.freeze({existing_row_updates:0,deletes:0,parent_writes:0,printing_writes:0,identity_writes:0,review_writes:0,alias_writes:0,owner_writes:0,image_writes:0,parent_mapping_writes:0,price_writes:0,assignment_writes:0,publication_writes:0,source_writes:0,schema_writes:0,sequence_calls:0});
export const PRINTING_MAPPING_STATE_SQL_V4="with product_ids as materialized(select distinct unnest($3::text[]) product_id)select to_jsonb(t)row from public.external_printing_mappings t where t.id=any($1::uuid[])or t.card_printing_id=any($2::uuid[])or(t.source in('tcgplayer','tcgplayer_market')and exists(select 1 from product_ids p where split_part(t.external_id,':',1)=p.product_id))order by t.id";
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

export function priceLinkCodeBindingV4(){
 const files=[...predecessorBinding().files];
 for(const file of['backend/pricing/japanese_reviewed_price_links_v4.mjs','scripts/audits/japanese_reviewed_price_links_v4.mjs','docs/contracts/JAPANESE_REVIEWED_PRICE_LINKS_V4.md','tests/contracts/japanese_reviewed_price_links_v4.test.mjs'])files.push({file,sha256:sha(fs.readFileSync(path.join(root,file)))});
 assert.equal(new Set(files.map(x=>x.file)).size,files.length);return{files,fingerprint:hash(files)};
}

export async function readPriceLinkSchemaV4(c){
 const schema={base:await readRepairSchemaV1(c)};
 schema.printing_mapping={columns:await rows(c,"select ordinal_position,column_name,data_type,udt_schema,udt_name,is_nullable,column_default,is_identity,identity_generation,is_generated,generation_expression from information_schema.columns where table_schema='public'and table_name='external_printing_mappings'order by ordinal_position"),constraints:await rows(c,"select conname name,contype type,condeferrable deferrable,condeferred deferred,convalidated validated,pg_get_constraintdef(oid,true)definition from pg_constraint where conrelid='public.external_printing_mappings'::regclass order by conname"),indexes:await rows(c,"select indexname name,indexdef definition from pg_indexes where schemaname='public'and tablename='external_printing_mappings'order by indexname"),security:await rows(c,"select pg_get_userbyid(c.relowner)owner,c.relrowsecurity rls,c.relforcerowsecurity force_rls,c.relacl::text acl from pg_class c where c.oid='public.external_printing_mappings'::regclass"),policies:await rows(c,"select policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public'and tablename='external_printing_mappings'order by policyname"),triggers:await rows(c,"select tgname name,pg_get_triggerdef(oid,true)definition from pg_trigger where tgrelid='public.external_printing_mappings'::regclass and not tgisinternal order by tgname"),rules:await rows(c,"select rulename name,definition from pg_rules where schemaname='public'and tablename='external_printing_mappings'order by rulename"),inbound:await rows(c,"select n.nspname schema,c.relname relation,k.conname name,pg_get_constraintdef(k.oid,true)definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where k.contype='f'and k.confrelid='public.external_printing_mappings'::regclass order by n.nspname,c.relname,k.conname")};
 schema.views=await rows(c,"select c.relname name,pg_get_viewdef(c.oid,true)definition,c.reloptions options,pg_get_userbyid(c.relowner)owner,c.relacl::text acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'and c.relname=any($1::text[])order by c.relname",[['v_cross_tcg_market_targets_v2','v_cross_tcg_market_candidates_v2']]);
 schema.subtype_function=await rows(c,"select p.oid::regprocedure::text signature,pg_get_functiondef(p.oid)definition,p.prosecdef security_definer,p.proconfig config,pg_get_userbyid(p.proowner)owner,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname='normalize_tcgplayer_market_subtype_v1'order by signature");
 return schema;
}

export function assertPriceLinkSchemaV4(schema){
 const expected=JSON.parse(fs.readFileSync(path.join(root,folder,'schema524.json')));
 assert.equal(hash(expected),REGISTRY.schema_fingerprint);same(schema,expected,'Unreviewed mapping/schema/security/view effects');assertRepairSchemaV1(schema.base);
 assert.equal(schema.printing_mapping.triggers.length,0);assert.equal(schema.printing_mapping.rules.length,0);
 same(schema.printing_mapping.columns.map(x=>x.column_name),['id','card_printing_id','source','external_id','active','synced_at','meta'],'Insert column effects changed');
 assert.ok(schema.printing_mapping.columns.every(x=>x.is_identity==='NO'&&x.is_generated==='NEVER'));
 assert.equal(schema.printing_mapping.constraints.length,3);assert.equal(schema.views.length,2);assert.equal(schema.subtype_function.length,1);
 return{version:VERSION,schema_fingerprint:hash(schema),tables:['external_printing_mappings','raw_imports'],existing_row_updates:0,indirect_owner_or_json_writes:0,sequence_calls:0};
}

export async function readPriceLinkStateV4(c,schema){
 assertPriceLinkSchemaV4(schema);
 const state={parents:await jsonRows(c,'select to_jsonb(t)row from public.card_prints t where id=any($1::uuid[])order by id',[PARENTS]),identities:await jsonRows(c,'select to_jsonb(t)row from public.card_print_identity t where card_print_id=any($1::uuid[])order by id',[PARENTS]),printings:await jsonRows(c,'select to_jsonb(t)row from public.card_printings t where card_print_id=any($1::uuid[])order by id',[PARENTS]),reviews:await jsonRows(c,'select to_jsonb(t)row from public.card_printing_truth_reviews t where card_printing_id=any($1::uuid[])order by id',[PRINTINGS]),aliases:await jsonRows(c,'select to_jsonb(t)row from public.card_print_identity_aliases t where legacy_card_print_id=any($1::uuid[])or canonical_card_print_id=any($1::uuid[])order by id',[PARENTS]),parent_mappings:await jsonRows(c,"select to_jsonb(t)row from public.external_mappings t where source='tcgplayer'and(card_print_id=any($1::uuid[])or external_id=any($2::text[]))order by id",[PARENTS,PRODUCTS.map(String)]),printing_mappings:await jsonRows(c,PRINTING_MAPPING_STATE_SQL_V4,[MAPPING_IDS,PRINTINGS,PRODUCTS.map(String)]),raw:await jsonRows(c,"select (to_jsonb(t)-'id')||jsonb_build_object('id',id::text)row from public.raw_imports t where id=$1::bigint",[RAW_ID])};
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
 state.prerequisite.predecessor_audit_absent=!(await rows(c,'select exists(select 1 from public.raw_imports where id=$1::bigint)present',[baseline.RAW_ID]))[0].present;
 return state;
}

export function assertPriceLinkFactsV4(state,options={}){
 // Validate immutable physical/archived evidence against the original frozen records.
 // The following separate validator checks the ACTUAL current generation.
 const physical=assertJapaneseFrozenPhysicalEvidenceV1(state,baseline,REGISTRY);
 assert.equal(state.prerequisite.predecessor_audit_absent,true,'Historical programme already executed; reconcile, never duplicate');
 const current=assertJapaneseCurrentSourceEvidenceV1(state,baseline,REGISTRY,options);
 return {...physical,...current};
}

function makePlan({schema,state,observedAt}){
 assertPriceLinkSchemaV4(schema);assert.ok(Number.isFinite(Date.parse(observedAt)));assertPriceLinkFactsV4(state,{now:Date.parse(observedAt)});assert.equal(state.printing_mappings.length,0,'Existing active/inactive pricing links must remain intact');assert.equal(state.raw.length,0,'Private audit ID collision');
 const code=priceLinkCodeBindingV4();const sourceEvidenceFingerprint=hash(state.source),quoteIndex=currentJapaneseQuoteIndexV1(state.source);
 const mappings=normalizeMappings(REGISTRY.targets.map(t=>({id:t.mapping_id,card_printing_id:t.printing_id,source:'tcgplayer',external_id:String(t.product_id),active:true,synced_at:observedAt,meta:{mapping_authority:'reviewed_existing_japanese_printing_price_link_v4',mapping_version:VERSION,registry_fingerprint:REGISTRY.fingerprint,source_subtype:t.source_subtype,publication_hold_reason:currentJapanesePublicationHoldV1(state.source,t,quoteIndex),source_category_id:85,source_group_id:t.group_id,identity_id:t.identity_id,identity_key_hash:t.identity_key_hash,truth_review_id:t.review_id,truth_review_fingerprint:t.review_fingerprint,approved_inbound_alias_ids:t.approved_inbound_alias_ids,prior_source_observation_id:t.prior_observation_id,current_source_observation_id:currentJapaneseQuoteV1(state.source,t,quoteIndex)?.id??null,source_sync_run_id:state.source.run.id,raw_import_id:RAW_ID,current_quote_status:currentJapaneseQuoteStatusV1(state.source,t,quoteIndex),current_source_evidence_fingerprint:sourceEvidenceFingerprint,reviewed_at:observedAt}})));
 const raw={id:RAW_ID,source:VERSION,status:'processed',notes:'4916 exact provider links to existing verified Japanese printings; no physical, owner, source, price or publication mutation.',payload:{version:VERSION,context:CONTEXT,registry_fingerprint:REGISTRY.fingerprint,snapshot_fingerprint:REGISTRY.snapshot_fingerprint,schema_fingerprint:REGISTRY.schema_fingerprint,code_fingerprint:code.fingerprint,source_sync_run_id:state.source.run.id,source_bundle_sha256:state.source.run.artifact_hash,mappings,expected:EXPECTED,boundaries:BOUNDARIES}};
 const body={version:VERSION,context:CONTEXT,project_ref:PROJECT,observed_at:observedAt,schema,state_before:state,mappings,raw,code_fingerprint:code.fingerprint,expected:EXPECTED,boundaries:BOUNDARIES};return{...body,fingerprint:hash(body)};
}
export const freezePriceLinkPlanV4=input=>makePlan(input);
export function assertPriceLinkPlanV4(plan,fingerprint){assert.equal(plan.fingerprint,fingerprint);same(plan,makePlan({schema:plan.schema,state:plan.state_before,observedAt:plan.observed_at}),'Frozen insert plan changed');return plan;}
const protectedState=state=>Object.fromEntries(Object.entries(state).filter(([k])=>!['printing_mappings','raw'].includes(k)));
export function classifyPriceLinkStateV4(plan,state){
 assertPriceLinkFactsV4(state,{fresh:false});
 if(state.printing_mappings.length===0&&state.raw.length===0)return'before';
 same(normalizeMappings(state.printing_mappings),plan.mappings,'Partial, unrelated or changed pricing links');assert.equal(state.raw.length,1,'Partial or colliding private audit');same(project(state.raw[0],rawFields),plan.raw,'Private audit changed');return'exact';
}

export function assertPriceLinkAuthorityV4(a,{plan,codeFingerprint,mode,now=Date.now()}){
 assertPriceLinkPlanV4(plan,plan.fingerprint);assert.ok(a,'Exact ordinary owner decision required');const{fingerprint,...body}=a;assert.equal(hash(body),fingerprint);assert.equal(a.version,'JAPANESE_REVIEWED_PRICE_LINK_AUTHORITY_V4');assert.equal(a.status,'explicit_founder_approval');assert.equal(a.project_ref,PROJECT);assert.equal(a.plan_fingerprint,plan.fingerprint);assert.equal(a.code_fingerprint,codeFingerprint);same(a.expected,EXPECTED);same(a.boundaries,BOUNDARIES);same(a.modes,['rollback','apply']);assert.ok(a.modes.includes(mode));assert.equal(a.preflight_flag_explicitly_authorized,true);assert.match(a.owner_decision_sha256,/^[a-f0-9]{64}$/);const start=Date.parse(a.issued_at),end=Date.parse(a.expires_at);assert.ok(start<=now&&now<end&&end-start<=24*3600000,'Decision expired or invalid');
}
export function assertPriceLinkRollbackV4(r,{plan,codeFingerprint,now=Date.now()}){
 assert.ok(r&&r.version===VERSION&&r.project_ref===PROJECT&&r.environment==='production'&&r.mode==='rollback'&&r.rollback_proven===true&&r.committed===false&&r.commit_uncertain===false);assert.equal(r.plan_fingerprint,plan.fingerprint);assert.equal(r.code_fingerprint,codeFingerprint);same(r.writes,EXPECTED);assert.equal(r.before_state_fingerprint,r.rollback_state_fingerprint);const age=now-Date.parse(r.finished_at);assert.ok(Number.isFinite(age)&&age>=0&&age<3600000,'Actual fresh matching production rollback required');
}
export function readPriceLinkReleaseGateV4(){return readOperatorReleaseGateV1();}
async function assertClient(c,local){const p=c.connectionParameters;if(local){assert.equal(p.host,'127.0.0.1');assert.equal(Number(p.port),55340);assert.equal(p.user,'postgres');assert.equal(p.database,QUALIFICATION_DATABASE);assert.equal((await c.query('select current_database()name')).rows[0].name,QUALIFICATION_DATABASE);}else{assert.equal(p.host,'db.'+PROJECT+'.supabase.co');assert.equal(Number(p.port),5432);assert.equal(p.user,'postgres');assert.equal(p.database,'postgres');assert.equal(p.ssl?.rejectUnauthorized,true);assert.ok(p.ssl?.ca);assert.equal(c.connection.stream.authorized,true);}}

async function transaction(options,local){
 const {client:c,plan,mode,authority,rollbackReceipt,fault=null}=options;assert.ok(['preflight','rollback','apply','readback'].includes(mode));assert.ok(!fault||(local&&['duplicate_raw_after_insert','other_printing_change'].includes(fault)),'Faults are local-only');if(!local)readPriceLinkReleaseGateV4();await assertClient(c,local);assertPriceLinkPlanV4(plan,plan.fingerprint);const code=priceLinkCodeBindingV4();assert.equal(code.fingerprint,options.codeFingerprint);assert.equal(plan.code_fingerprint,code.fingerprint);const write=['rollback','apply'].includes(mode);
 if(!local&&write){assertPriceLinkAuthorityV4(authority,{plan,codeFingerprint:code.fingerprint,mode});if(mode==='apply')assertPriceLinkRollbackV4(rollbackReceipt,{plan,codeFingerprint:code.fingerprint});}
 const locks=[],proof={version:VERSION,context:CONTEXT,project_ref:PROJECT,environment:local?'local_qualification':'production',mode,plan_fingerprint:plan.fingerprint,code_fingerprint:code.fingerprint,writes:{printing_mapping_inserts:0,raw_inserts:0},boundaries:BOUNDARIES,committed:false,commit_uncertain:false};let begun=false,commitSent=false;
 try{
  if(write)for(const name of['grookai:tcgcsv:current:v1','tcgplayer_market_publication_v1']){assert.equal((await rows(c,'select pg_try_advisory_lock(hashtext($1))acquired',[name]))[0].acquired,true,'Source/publication writer active');locks.push(name);}
  await c.query('begin isolation level serializable'+(write?'':' read only'));begun=true;await c.query("set local timezone='UTC'");await c.query("set local statement_timeout='45s'");await c.query("set local lock_timeout='5s'");same(await readPriceLinkSchemaV4(c),plan.schema,'Schema changed');const before=await readPriceLinkStateV4(c,plan.schema);assertPriceLinkFactsV4(before,{fresh:mode!=='readback'});if(mode!=='readback')same(before.source,plan.state_before.source,'Latest current source changed since this exact plan; prepare a new plan, never silently refresh');proof.before=classifyPriceLinkStateV4(plan,before);proof.before_state_fingerprint=hash(before);
  if(mode==='readback')assert.equal(proof.before,'exact','Links not applied');
  if(write&&proof.before==='before'){
   await c.query('select id from public.card_printings where id=any($1::uuid[])order by id for key share',[PRINTINGS]);
   const r=plan.raw;proof.writes.raw_inserts=(await c.query('insert into public.raw_imports(id,source,status,notes,payload)values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)])).rowCount;
   proof.writes.printing_mapping_inserts=(await c.query('insert into public.external_printing_mappings(id,card_printing_id,source,external_id,active,synced_at,meta)select id,card_printing_id,source,external_id,active,synced_at,meta from jsonb_populate_recordset(null::public.external_printing_mappings,$1::jsonb)',[JSON.stringify(plan.mappings)])).rowCount;same(proof.writes,EXPECTED,'Exact4916+1 insert scope required');
   if(fault==='duplicate_raw_after_insert')await c.query('insert into public.raw_imports(id,source,status,notes,payload)values($1::bigint,$2,$3,$4,$5::jsonb)',[r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)]);
   if(fault==='other_printing_change')await c.query("update public.card_printings set image_note=coalesce(image_note,'')||' LOCAL_FAULT'where id=$1::uuid",[PRINTINGS[0]]);
   const after=await readPriceLinkStateV4(c,plan.schema);assert.equal(classifyPriceLinkStateV4(plan,after),'exact');same(protectedState(after),protectedState(before),'Protected physical/source/mapping state changed');proof.exact_readback=true;proof.protected_state_fingerprint=hash(protectedState(after));
  }
  same(priceLinkCodeBindingV4(),code,'Producer changed');same(await readPriceLinkSchemaV4(c),plan.schema,'Precommit schema changed');if(!local){readPriceLinkReleaseGateV4();if(write)assertPriceLinkAuthorityV4(authority,{plan,codeFingerprint:code.fingerprint,mode});}
  if(mode==='apply'){commitSent=true;await c.query('commit');begun=false;proof.committed=true;}else{await c.query('rollback');begun=false;if(mode==='rollback'){await c.query('begin isolation level repeatable read read only');begun=true;await c.query("set local timezone='UTC'");const restored=await readPriceLinkStateV4(c,plan.schema);same(restored,before,'Rollback did not restore exact current state');proof.rollback_state_fingerprint=hash(restored);proof.rollback_proven=true;await c.query('rollback');begun=false;}}
  proof.finished_at=new Date().toISOString();return proof;
 }catch(e){if(commitSent&&!proof.committed)e.commit_uncertain=true;if(begun){try{await c.query('rollback');}catch{e.rollback_uncertain=true;}}throw e;}
 finally{for(const name of locks.reverse())await c.query('select pg_advisory_unlock(hashtext($1))',[name]).catch(()=>{});}
}
export const executePriceLinksV4=options=>transaction(options,false);
export const qualifyPriceLinksV4=options=>transaction(options,true);
