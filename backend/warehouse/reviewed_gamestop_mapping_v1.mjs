import assert from 'node:assert/strict';
import {assertMasterPrintingAuthority} from '../catalog/master_index_printing_authority_v1.mjs';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {assertExecuteCanonWriteV1} from '../lib/contracts/execute_canon_write_v1.mjs';
import {assertMappingPricingAdjudication,assertMappingPricingGuards,assertRejectedMappingPriceWithdrawn} from './reviewed_mapping_pricing_adjudication_v1.mjs';

export const VERSION='REVIEWED_GAMESTOP_MAPPING_V1';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const rows=async(db,sql,args)=>(await db.query(sql,args)).rows.map(r=>r.row);
const identifier=s=>'"'+s.replaceAll('"','""')+'"';

export async function readGameStopMappingDependencies(db,bundle){
 // Discover FK columns plus application-level card/printing/mapping references.
 // Store only counts/digests, never collector content, in the operator package.
 const columns=(await db.query(`select distinct c.relname relation,a.attname field,t.typname type
  from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid
  join pg_type t on t.oid=a.atttypid
  where n.nspname='public' and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped
   and c.relname not in ('external_mappings','canon_warehouse_candidates','canon_warehouse_candidate_events')
   and ((t.typname='uuid' and a.attname in ('card_print_id','card_printing_id','card_id','print_id','snapshot_card_print_id','snapshot_card_printing_id','cover_card_print_id','owned_card_print_id','wanted_card_print_id'))
    or (t.typname in ('int8','int4') and a.attname in ('source_mapping_id','canonical_external_mapping_id','preserved_from_mapping_id'))
    or exists(select 1 from pg_constraint f where f.contype='f' and f.conrelid=c.oid and a.attnum=any(f.conkey)
      and f.confrelid in ('public.card_prints'::regclass,'public.card_printings'::regclass,'public.external_mappings'::regclass)))
  order by 1,2`)).rows;
 const parentIds=[bundle.target.card_print_id],childIds=bundle.before.children.map(c=>c.id),mappingIds=bundle.before.mappings.map(m=>String(m.id));
 // Scan a relation once even when it references parent, child and mapping.
 // Per-column filters retain exactly the original counts and full-row digests.
 const results=new Map(),groups=new Map();
 for(const c of columns){assert.ok(['uuid','int8','int4'].includes(c.type),'unsupported_dependency_type');const ids=c.type==='uuid'?[...parentIds,...childIds]:mappingIds;
  if(!ids.length){results.set(c,{count:0,digest:'d41d8cd98f00b204e9800998ecf8427e'});continue;}
  if(!groups.has(c.relation))groups.set(c.relation,[]);groups.get(c.relation).push({c,ids});
 }
 for(const [relation,group]of groups){
  const conditions=group.map(({c},i)=>`${identifier(c.field)}=any($${i+1}::${c.type}[])`);
  const selections=conditions.flatMap((condition,i)=>[`count(*) filter(where ${condition})::int c${i}`,`md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)) filter(where ${condition}),'')) d${i}`]);
  const result=(await db.query(`select ${selections.join(',')} from public.${identifier(relation)} r where ${conditions.join(' or ')}`,group.map(g=>g.ids))).rows[0];
  group.forEach(({c},i)=>results.set(c,{count:result['c'+i],digest:result['d'+i]}));
 }
 const footprints=columns.map(c=>({...c,...results.get(c)}));
 const triggers=(await db.query("select tgname,pg_get_triggerdef(oid) definition from pg_trigger where tgrelid='public.external_mappings'::regclass and not tgisinternal order by tgname")).rows;
 assert.equal(triggers.length,0,'mapping_triggers_require_separate_review');
 return {columns,footprints,triggers};
}

// This manual review lane does not broaden the base-only pricing mapper.
// The caller owns SERIALIZABLE transaction control and uncertain-COMMIT recovery.
export function assertReviewedGameStopMapping(bundle){
 const {fingerprint,...body}=bundle;assert.equal(hash(body),fingerprint,'mapping_bundle_hash');
 assert.equal(bundle.version,VERSION);assert.equal(bundle.purpose,'evidence_binding_not_execution_authorization');
 const {manifest,target,before}=bundle;
 const artifacts=new Map();for(const a of bundle.artifacts){assert.ok(!artifacts.has(a.ref));const b=Buffer.from(a.base64,'base64');assert.equal(b.toString('base64'),a.base64);artifacts.set(a.ref,b);}
 assertMasterPrintingAuthority(manifest,artifacts);
 assert.deepEqual([...artifacts.keys()].sort(),[...new Set([manifest.master_index_ref,manifest.authority.review.ref,...manifest.authority.source_artifacts.map(s=>s.ref),...(manifest.pricing_dependency_adjudication?[manifest.pricing_dependency_adjudication.ref]:[])])].sort());
 assert.equal(manifest.game,'pokemon');assert.equal(manifest.language,'en');assert.equal(manifest.identity_policy_version,'POKEMON_EN_PHYSICAL_V1');
 assert.equal(manifest.parents.length,1);assert.equal(manifest.printings.length,1);
 const p=manifest.parents[0],printing=manifest.printings[0];
 assert.equal(p.variant_key,'gamestop_stamp');assert.equal(p.identity_domain,'pokemon_eng_standard');
 assert.ok(p.printed_identity_modifier===null||p.printed_identity_modifier==='gamestop_stamp');
 assert.match(target.candidate_id,uuid);assert.match(target.external_id,/^[1-9][0-9]*$/);assert.equal(target.source,'tcgplayer');assert.equal(target.card_print_id,p.id);
 assert.equal(before.parent.id,p.id);for(const [key,value] of Object.entries(p))assert.deepEqual(before.parent[key==='printed_coordinate'?'number':key],value,'frozen_parent_identity');
 assert.equal(before.parent.tcgplayer_id,null,'existing_direct_product_requires_review');
 assert.equal(before.children.length,1);const child=before.children[0];assert.equal(child.card_print_id,p.id);assert.equal(child.finish_key,printing.finish_key);assert.equal(child.printing_gv_id,printing.printing_gv_id);assert.equal(child.is_provisional,false);
 assert.ok(before.reviews.every(r=>r.review_status==='verified'),'adverse_printing_review');
 assert.equal(String(before.source.product_id),target.external_id);assert.equal(before.source.category_id,3);
 const positive=manifest.external_mapping_assertions;assert.equal(positive?.length,1);assert.deepEqual(positive[0].target,target);
 assert.equal(positive[0].source_snapshot_sha256,hash(before.source));assert.equal(positive[0].parent_snapshot_sha256,hash(before.parent));
 const source=manifest.authority.source_artifacts.find(s=>s.ref===positive[0].source_ref);assert.equal(source?.kind,'exact_printing_mapping');assert.equal(source.sha256,positive[0].source_sha256);
 assert.deepEqual(JSON.parse(artifacts.get(source.ref)),before.source,'source_artifact_payload_mismatch');
 assert.ok(!before.mappings.some(m=>m.source===target.source&&m.external_id===target.external_id),'product_already_mapped');
 const rejected=manifest.rejected_external_mapping_assertions;assert.ok(Array.isArray(rejected)&&rejected.length<=1);
 for(const rejection of rejected){
  assert.equal(rejection.reason_code,'PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT');
  const m=before.mappings.find(m=>m.id===rejection.mapping_id);assert.ok(m);assert.equal(m.source,'tcgplayer');assert.equal(m.card_print_id,p.id);assert.equal(m.active,true);assert.notEqual(m.external_id,target.external_id);assert.equal(hash(m),rejection.before_sha256);
  const s=manifest.authority.source_artifacts.find(s=>s.ref===rejection.source_ref);assert.equal(s?.kind,'exact_printing_mapping');assert.equal(s.sha256,rejection.source_sha256);
  assert.equal(String(JSON.parse(artifacts.get(s.ref)).product_id),m.external_id);
 }
 assert.deepEqual(before.mappings.filter(m=>m.source==='tcgplayer'&&m.active).map(m=>m.id).sort(),rejected.map(r=>r.mapping_id).sort(),'unreviewed_existing_owner');
 assert.equal(before.discovery.tcgplayer_id,target.external_id);assert.equal(before.discovery.raw_import_id,before.raw.id);assert.ok(before.raw.payload,'preserved_raw_source_required');
 assert.equal(positive[0].discovery_snapshot_sha256,hash(before.discovery));assert.equal(positive[0].raw_snapshot_sha256,hash(before.raw));
 assert.ok(bundle.dependencies&&Array.isArray(bundle.dependencies.footprints),'dependency_inventory_required');
 assert.equal(positive[0].dependencies_sha256,hash(bundle.dependencies));
 const pricingReview=manifest.pricing_dependency_adjudication?assertMappingPricingAdjudication(bundle,artifacts):null;
 if(!pricingReview)for(const f of bundle.dependencies.footprints.filter(f=>f.type!=='uuid'))assert.equal(f.count,0,'referenced_mapping_requires_separate_adjudication');
 return {manifest,target,before,rejected,pricingReview};
}

export async function readGameStopMappingState(db,bundle,{lock=false}={}){
 const {target,before}=assertReviewedGameStopMapping(bundle),suffix=lock?' for update':'';
 const parent=(await rows(db,'select to_jsonb(p) row from public.card_prints p where id=$1'+suffix,[target.card_print_id]))[0];
 const children=await rows(db,'select to_jsonb(p) row from public.card_printings p where card_print_id=$1 order by id'+suffix,[target.card_print_id]);
 const reviews=await rows(db,'select to_jsonb(p) row from public.card_printing_truth_reviews p where card_printing_id=any($1::uuid[]) order by id'+suffix,[children.map(c=>c.id)]);
 const mappings=await rows(db,"select to_jsonb(p) row from public.external_mappings p where (card_print_id=$1 and source in ('tcgplayer','tcgcsv')) or (source in ('tcgplayer','tcgcsv') and external_id=$2) order by id"+suffix,[target.card_print_id,target.external_id]);
 assert.ok(mappings.every(m=>m.card_print_id===target.card_print_id),'source_owner_collision');
 const direct=(await db.query("select id from public.card_prints where tcgplayer_id=$1 or external_ids->>'tcgplayer'=$1 or external_ids->>'tcgplayer_id'=$1",[target.external_id])).rows;
 assert.equal(direct.length,0,'direct_product_owner_requires_separate_review');
 const source=(await rows(db,'select to_jsonb(p) row from public.tcgcsv_source_products p where category_id=3 and product_id=$1'+suffix,[target.external_id]))[0];
 const discovery=(await rows(db,'select to_jsonb(p) row from public.external_discovery_candidates p where id=$1'+suffix,[before.discovery.id]))[0];
 const raw=(await rows(db,'select to_jsonb(p) row from public.raw_imports p where id=$1'+suffix,[before.raw.id]))[0];
 return {parent,children,reviews,mappings,source,discovery,raw};
}

export function assertGameStopMappingReadback(bundle,state){
 const {target,before,rejected}=assertReviewedGameStopMapping(bundle);
 for(const key of ['parent','children','reviews','source','discovery','raw'])assert.deepEqual(state[key],before[key],`mapping_preservation:${key}`);
 const created=state.mappings.filter(m=>m.source===target.source&&m.external_id===target.external_id);assert.equal(created.length,1,'exact_mapping_readback');
 const m=created[0];assert.equal(m.card_print_id,target.card_print_id);assert.equal(m.active,true);assert.equal(m.meta?.reviewed_mapping_fingerprint,bundle.fingerprint);assert.equal(m.meta?.master_manifest_fingerprint,bundle.manifest.fingerprint);assert.equal(m.meta?.warehouse_candidate_id,target.candidate_id);
 assert.equal(state.mappings.length,before.mappings.length+1);
 for(const old of before.mappings){const actual=state.mappings.find(m=>m.id===old.id);assert.ok(actual);const rejection=rejected.find(r=>r.mapping_id===old.id);
  if(rejection){assert.equal(actual.active,false);assert.deepEqual({...actual,active:old.active,meta:old.meta},old);assert.deepEqual(actual.meta,{...old.meta,reviewed_invalidation:{version:VERSION,authority_fingerprint:bundle.fingerprint,reason_code:rejection.reason_code,prior_row_sha256:hash(old)}});}
  else assert.deepEqual(actual,old);
 }
 return created[0];
}

export async function executeReviewedGameStopMapping(db,bundle,{authorization}={}){
 const {target,before,rejected,pricingReview}=assertReviewedGameStopMapping(bundle);
 assert.equal(authorization?.approved,true,'explicit_execution_authorization_required');assert.equal(authorization?.authority_fingerprint,bundle.fingerprint);assert.ok(authorization.operator&&authorization.request);
 assert.equal((await db.query('show transaction_isolation')).rows[0].transaction_isolation,'serializable','serializable_transaction_required');
 if(pricingReview){await db.query("select pg_advisory_xact_lock(hashtext('tcgplayer_market_publication_v1'))");await assertMappingPricingGuards(db,pricingReview);}
 assert.deepEqual(await readGameStopMappingDependencies(db,bundle),bundle.dependencies,'dependency_preflight_drift');
 const state=await readGameStopMappingState(db,bundle,{lock:true});
 const candidate=(await rows(db,'select to_jsonb(c) row from public.canon_warehouse_candidates c where id=$1 for update',[target.candidate_id]))[0];assert.ok(candidate,'review_candidate_required');
 if(candidate.state==='ARCHIVED'){
  const mapping=assertGameStopMappingReadback(bundle,state);assert.equal(candidate.reference_hints_payload?.authority_fingerprint,bundle.fingerprint);if(pricingReview)await assertRejectedMappingPriceWithdrawn(db,bundle);return {status:'already_succeeded',mapping};
 }
 assert.equal(candidate.state,'APPROVED_BY_FOUNDER');assert.ok(candidate.founder_approved_by_user_id&&candidate.founder_approved_at);assert.equal(candidate.tcgplayer_id,target.external_id);
 assert.equal(candidate.reference_hints_payload?.authority_fingerprint,bundle.fingerprint);assert.equal(candidate.claimed_identity_payload?.source_raw_import_id,before.raw.id);assert.equal(candidate.claimed_identity_payload?.source_discovery_candidate_id,before.discovery.id);
 assert.deepEqual(state,before,'mapping_preflight_drift');
 let mapping;
 await assertExecuteCanonWriteV1({execution_name:'reviewed_gamestop_mapping_v1',transaction_control:'external',write_target:db,audit_target:db,ledger_target:db,actor_type:'system_worker',actor_id:candidate.founder_approved_by_user_id,source_worker:VERSION,source_system:'warehouse',payload_snapshot:{target,authority_fingerprint:bundle.fingerprint,authorization},
  contract_assertions:[{ok:true,contract_name:'EXTERNAL_SOURCE_INGESTION_MODEL_V1',reason:'Exact source, reviewed Master identity and preserved raw lineage verified in the locked transaction.'}],
  proofs:[{name:'reviewed_mapping_and_preservation',contract_name:'IDENTITY_PRECEDENCE_RULE_V1',async run(){mapping=assertGameStopMappingReadback(bundle,await readGameStopMappingState(db,bundle));assert.deepEqual(await readGameStopMappingDependencies(db,bundle),bundle.dependencies,'dependency_postwrite_drift');if(pricingReview){await assertMappingPricingGuards(db,pricingReview);await assertRejectedMappingPriceWithdrawn(db,bundle);}return {ok:true};}}],
  async write(connection){
   for(const rejection of rejected){const old=before.mappings.find(m=>m.id===rejection.mapping_id);const meta={...old.meta,reviewed_invalidation:{version:VERSION,authority_fingerprint:bundle.fingerprint,reason_code:rejection.reason_code,prior_row_sha256:hash(old)}};
    assert.equal((await connection.query('update public.external_mappings set active=false,meta=$2::jsonb where id=$1 and active=true and to_jsonb(external_mappings)=$3::jsonb',[old.id,JSON.stringify(meta),JSON.stringify(old)])).rowCount,1,'invalidation_compare_and_swap');
   }
   const meta={version:VERSION,reviewed_mapping_fingerprint:bundle.fingerprint,master_manifest_fingerprint:bundle.manifest.fingerprint,review_sha256:bundle.manifest.authority.review.sha256,source_payload_hash:before.source.payload_hash,source_snapshot_sha256:hash(before.source),source_raw_import_id:before.raw.id,source_discovery_candidate_id:before.discovery.id,warehouse_candidate_id:target.candidate_id,source_url:before.source.source_url,product_name:before.source.name,pricing_activation:false};
   await connection.query('insert into public.external_mappings(card_print_id,source,external_id,meta,active) values($1,$2,$3,$4::jsonb,true)',[target.card_print_id,target.source,target.external_id,JSON.stringify(meta)]);
   assert.equal((await connection.query("update public.canon_warehouse_candidates set state='ARCHIVED',current_staging_id=null,current_review_hold_reason=null,archived_by_user_id=$2,archived_at=now(),archive_notes=$3 where id=$1 and state='APPROVED_BY_FOUNDER'",[target.candidate_id,candidate.founder_approved_by_user_id,'Reviewed exact product mapping completed; existing parent and child identities preserved.'])).rowCount,1);
   await connection.query("insert into public.canon_warehouse_candidate_events(candidate_id,event_type,action,previous_state,next_state,actor_type,metadata) values($1,'REVIEWED_MAPPING_SUCCEEDED','MAP_ALIAS','APPROVED_BY_FOUNDER','ARCHIVED','EXECUTOR',$2::jsonb)",[target.candidate_id,JSON.stringify({version:VERSION,target,authority_fingerprint:bundle.fingerprint,authorization,invalidated_mapping_ids:rejected.map(r=>r.mapping_id)})]);
  }
 });
 return {status:'applied',mapping};
}
