import assert from 'node:assert/strict';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';

// Only these three already-reviewed SKU identities lost usable Market quotes in
// the actual 2509 generation. This permits an identity join, never publication.
export const CURRENT_JAPANESE_UNQUOTED_PRODUCTS_V1=Object.freeze([570051,571943,630237]);
const unquoted=new Set(CURRENT_JAPANESE_UNQUOTED_PRODUCTS_V1);
const same=(a,b,why)=>assert.equal(hash({value:a}),hash({value:b}),why);
export function currentJapaneseQuoteIndexV1(source){
 const index=new Map();for(const q of source.current_quotes){assert.ok(!index.has(q.product_id),'Ambiguous current product/subtype');index.set(q.product_id,q);}return index;
}
export function currentJapaneseQuoteV1(source,target,index=null){
 const rows=index?(index.has(target.product_id)?[index.get(target.product_id)]:[]):source.current_quotes.filter(q=>q.product_id===target.product_id);
 assert.ok(rows.length<=1,'Ambiguous current product/subtype');
 if(rows.length)assert.equal(rows[0].subtype_name,target.source_subtype);
 return rows[0]??null;
}
export function currentJapaneseQuoteStatusV1(source,target,index=null){
 const q=currentJapaneseQuoteV1(source,target,index);
 return !q?'missing':q.market_price==null?'unpriced':'available';
}
export function currentJapanesePublicationHoldV1(source,target,index=null){
 return target.publication_hold_reason??(currentJapaneseQuoteStatusV1(source,target,index)==='available'?null:'current_source_quote_unavailable');
}
const parentFields=['id','game_id','set_id','gv_id','identity_domain','set_code','number','name','variant_key','printed_identity_modifier','print_identity_key','set_identity_model'];
const childFields=['id','card_print_id','printing_gv_id','finish_key','is_provisional','provenance_source','provenance_ref','created_by'];
const project=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]]));
const baselineIndexes=new WeakMap();
function immutableBaselineIndex(baseline){
 if(!baselineIndexes.has(baseline))baselineIndexes.set(baseline,{parents:new Map(baseline.SNAPSHOT.parents.map(p=>[p.id,p])),children:new Map(baseline.SNAPSHOT.printings.map(p=>[p.id,p])),identities:new Map(baseline.SNAPSHOT.identities.map(p=>[p.id,p]))});
 return baselineIndexes.get(baseline);
}
export function assertJapaneseFrozenPhysicalEvidenceV1(state,baseline,registry){
 same(Object.keys(state).sort(),['parents','identities','printings','reviews','aliases','parent_mappings','printing_mappings','raw','source','prerequisite'].sort(),'Unexpected state scope');
 same(state.parents.map(p=>p.id).sort(),[...baseline.PARENTS].sort(),'Parent scope changed');same(state.printings.map(p=>p.id).sort(),[...baseline.PRINTINGS].sort(),'Existing printing family changed');
 same(state.aliases,baseline.SNAPSHOT.aliases,'Approved inbound alias resolution changed');assert.equal(state.aliases.length,registry.approved_inbound_alias_count);
 assert.equal(state.parent_mappings.length,0,'Existing parent-provider mapping requires review');assert.equal(state.prerequisite.regular29_correct,29);assert.equal(state.prerequisite.regular29_audit_present,true);
 const old=immutableBaselineIndex(baseline),parents=new Map(state.parents.map(p=>[p.id,p])),children=new Map(state.printings.map(p=>[p.id,p])),identities=new Map(),reviews=new Map();
 for(const i of state.identities)if(i.is_active)identities.set(i.card_print_id,[...(identities.get(i.card_print_id)??[]),i]);
 for(const r of state.reviews)if(r.active)reviews.set(r.card_printing_id,[...(reviews.get(r.card_printing_id)??[]),r]);
 for(const t of registry.targets){const p=parents.get(t.parent_id),ch=children.get(t.printing_id),ii=identities.get(t.parent_id)??[],rr=reviews.get(t.printing_id)??[];
  assert.ok(p&&ch);same(project(p,parentFields),project(old.parents.get(p.id),parentFields),'Reviewed parent identity changed');same(project(ch,childFields),project(old.children.get(ch.id),childFields),'Reviewed physical printing changed');
  assert.equal(p.identity_domain,'pokemon_jpn');assert.equal(p.variant_key,'');assert.equal(p.printed_identity_modifier,null);assert.equal(ch.is_provisional,false);assert.equal(ch.finish_key,t.finish_key);
  assert.equal(ii.length,1);assert.equal(ii[0].id,t.identity_id);assert.equal(ii[0].identity_key_hash,t.identity_key_hash);same(ii[0],old.identities.get(t.identity_id),'Active identity evidence changed');
  assert.equal(rr.length,1);const r=rr[0];assert.equal(r.id,t.review_id);assert.equal(hash(r),t.review_fingerprint,'Physical review changed');assert.equal(r.review_status,'verified');assert.equal(r.public_visibility,'visible');same(r.expected_finish_keys,[t.finish_key]);assert.equal(r.evidence.card_print_id,p.id);assert.equal(r.evidence.finish_key,ch.finish_key);assert.equal(r.evidence.source_observation_id,t.prior_observation_id);assert.ok(r.evidence.official_assertion_keys.length>0);
 }
 return {existing_printings:registry.targets.length,normal:registry.targets.filter(t=>t.finish_key==='normal').length,holo:registry.targets.filter(t=>t.finish_key==='holo').length,prior_reviewed_provider_quotes:registry.targets.length,approved_inbound_aliases:state.aliases.length,physical_writes:0};
}
export function deriveJapaneseCurrentRegistryV1(baseline,{version,context}){
 const targets=baseline.REGISTRY.targets.map(({current_observation_id,current_market_usd,...t})=>({...t,archived_qualified_observation_id:current_observation_id}));
 const body={version,context,project_ref:baseline.PROJECT,original_registry_fingerprint:baseline.REGISTRY.fingerprint,
  schema_fingerprint:baseline.REGISTRY.schema_fingerprint,snapshot_fingerprint:baseline.REGISTRY.snapshot_fingerprint,
  source_mode:'latest_completed_full_generation_frozen_in_each_exact_plan',
  approved_inbound_alias_count:baseline.REGISTRY.approved_inbound_alias_count,targets,
  permitted_unquoted_products:CURRENT_JAPANESE_UNQUOTED_PRODUCTS_V1.filter(p=>targets.some(t=>t.product_id===p))};
 return {...body,fingerprint:hash(body)};
}
export function assertJapaneseCurrentSourceEvidenceV1(state,baseline,registry,{now=Date.now(),fresh=true}={}){
 const source=state.source,run=source.run;assert.ok(run);
 assert.equal(run.status,'completed');assert.equal(run.sync_mode,'current_full_sync');assert.equal(run.failed_count,0);
 assert.match(run.id,/^[a-f0-9-]{36}$/);assert.match(run.artifact_hash,/^[a-f0-9]{64}$/);assert.match(run.observed_on,/^\d{4}-\d{2}-\d{2}$/);
 assert.ok(Number.isInteger(run.category_count)&&run.category_count>=4);
 assert.ok(Number.isInteger(run.price_row_count)&&run.price_row_count>=5343);
 if(fresh){const age=now-Date.parse(run.finished_at);assert.ok(Number.isFinite(age)&&age>=0&&age<36*3600000,'Source stale or future');}
 same(source.prior_quotes,baseline.SNAPSHOT.source.prior_quotes,'Archived physical-review quote lineage changed');
 const priorIds=new Set(source.prior_quotes.map(q=>q.source_artifact_id));
 const byId=a=>[...a].sort((x,y)=>x.id.localeCompare(y.id));
 same(byId(source.artifacts.filter(a=>priorIds.has(a.id))),byId(baseline.SNAPSHOT.source.artifacts.filter(a=>priorIds.has(a.id))),'Archived original evidence bytes or receipt changed');
 assert.equal(source.categories.length,1);assert.equal(source.categories[0].category_id,85);
 const products=new Map(source.products.map(p=>[p.product_id,p])),groups=new Map(source.groups.map(g=>[g.group_id,g])),artifacts=new Map(source.artifacts.map(a=>[a.id,a])),targets=new Map(registry.targets.map(t=>[t.product_id,t]));
 assert.equal(products.size,registry.targets.length);assert.equal(source.products.length,products.size);
 assert.equal(source.current_quotes.length,new Set(source.current_quotes.map(q=>q.product_id)).size,'Duplicate current product quote');
 assert.ok(source.current_quotes.every(q=>targets.has(q.product_id)),'Foreign quote in bounded source frame');
 const held=[],quoteIndex=currentJapaneseQuoteIndexV1(source);
 for(const target of registry.targets){
  const p=products.get(target.product_id),g=groups.get(target.group_id);assert.ok(p&&g);
  assert.equal(p.category_id,85);assert.equal(p.group_id,target.group_id);assert.equal(p.source_active,true);assert.equal(p.catalog_metadata_status,'current');assert.equal(p.name,target.source_name);
  assert.equal(hash(p.raw_payload),p.payload_hash,'Current product payload hash changed');
  same(p.extended_data.filter(x=>x.name==='Number').map(x=>x.value),[target.source_number],'Exact source printed number changed');
  assert.equal(g.category_id,85);assert.equal(g.source_active,true);assert.equal(g.catalog_metadata_status,'current');
  assert.equal(hash(g.raw_payload),g.payload_hash,'Current group payload hash changed');
  const q=currentJapaneseQuoteV1(source,target,quoteIndex),status=currentJapaneseQuoteStatusV1(source,target,quoteIndex);
  if(status!=='available'){assert.ok(unquoted.has(target.product_id),'Unreviewed current quote loss');held.push({product_id:target.product_id,status,market_publication_authorized:false});}
  if(!q)continue;
  assert.equal(q.category_id,85);assert.equal(q.group_id,target.group_id);assert.equal(q.currency,'USD');assert.equal(q.observed_on,run.observed_on);assert.equal(q.last_seen_run_id,run.id);assert.match(q.payload_hash,/^[a-f0-9]{64}$/);
  assert.equal(q.raw_payload.productId,target.product_id);assert.equal(q.raw_payload.subTypeName,target.source_subtype);
  assert.equal(hash(q.raw_payload),q.payload_hash,'Current quote payload hash changed');
  if(status==='available'){assert.ok(Number(q.market_price)>0);assert.equal(Number(q.market_price),Number(q.raw_payload.marketPrice),'Current Market differs from its original provider field');}
  else{assert.equal(q.market_price,null);assert.equal(q.raw_payload.marketPrice,null);}
  const artifact=artifacts.get(q.source_artifact_id);assert.ok(artifact);assert.equal(artifact.http_status,200);assert.equal(artifact.category_id,85);assert.equal(artifact.group_id,target.group_id);assert.equal(artifact.artifact_kind,'prices');assert.match(artifact.sha256,/^[a-f0-9]{64}$/);
 }
 return {current_source_run_id:run.id,current_source_bundle_sha256:run.artifact_hash,
  available_current_quotes:registry.targets.length-held.length,unavailable_current_quotes:held,
  source_freshness_hours:36,price_or_publication_writes:0};
}
