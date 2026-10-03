import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pokemonWarehouseMappingKey} from './pokemon_warehouse_coverage_v1.mjs';

export const VERSION='POKEMON_WAREHOUSE_GROUP_INTAKE_V1';
export const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>String(value??'');
const uuid=value=>{const h=hash(value);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const stableProduct=p=>JSON.parse(JSON.stringify(Object.fromEntries(['product_id','category_id','group_id','name','clean_name','image_url','source_url','source_modified_on','image_count','presale_info','extended_data','raw_payload','payload_hash','source_active','catalog_metadata_status'].map(k=>[k,p[k]??null]))));

export function discoveryEntry(product,coverage){
 assert.ok(['untracked_card_candidate','existing_identity_mapping_review'].includes(coverage.status),'review_only_intake_status_required');assert.equal(coverage.product_id,id(product.product_id));
 assert.ok([3,85].includes(Number(product.category_id)));assert.equal(product.source_active,true);
 assert.ok(product.raw_payload&&typeof product.raw_payload==='object'&&!Array.isArray(product.raw_payload));
 assert.equal(id(product.raw_payload.productId),id(product.product_id),'upstream_product_mismatch');
 assert.match(product.payload_hash,/^[a-f0-9]{64}$/i);assert.match(product.image_url??'',/^https:\/\//);
 assert.equal(Number(product.raw_payload.groupId),Number(product.group_id),'upstream_group_mismatch');
 assert.equal(Number(product.raw_payload.categoryId),Number(product.category_id),'upstream_category_mismatch');
 assert.equal(Number(coverage.group_id),Number(product.group_id),'coverage_group_mismatch');
 assert.equal(coverage.source_payload_hash,product.payload_hash,'coverage_source_drift');
 assert.ok(product.name?.trim());assert.ok(product.source_url?.startsWith('https://'));
 const numbers=product.extended_data.filter(e=>e.name==='Number').map(e=>String(e.value??'').trim());
 assert.equal(numbers.length,1,'single_printed_number_required');
 const match=numbers[0].match(/^([a-z]*\d+[a-z]*)(?:\s*\/\s*([a-z]*\d+[a-z]*))?$/i);assert.ok(match,'unsupported_printed_coordinate');
 const source=stableProduct(product),upstream=`tcgcsv:${product.category_id}:${product.product_id}`;
 const normalization={name:product.name.normalize('NFKC').trim(),number_left:match[1],number_plain:match[1].replace(/^0+(?=\d)/,''),printed_total:match[2]??null,language:Number(product.category_id)===85?'ja':'en'};
 const entry={source,source_sha256:hash(source),upstream_id:upstream,candidate_id:uuid({version:VERSION,upstream}),normalization,
  comparison:{coverage_status:coverage.status,canonical_parent_ids:coverage.canonical_parent_ids,discovery_candidates:coverage.discovery_candidates,warehouse_candidates:coverage.promotion_candidates??[],suggested_existing_parents:coverage.suggested_existing_parents??[],hint_authority:'review_lead_only_not_a_source_relationship'},
  gate:{match_status:'AMBIGUOUS',candidate_bucket:'PRINTED_IDENTITY_REVIEW',reason:'Preserved numbered warehouse product has no exact canonical relationship or prior discovery. Set, physical identity and finish require source-backed review.',canonical_set_code:null,canonical_parent_id:null,finish_key:null},retailer:coverage.retailer};
 assert.equal(entry.comparison.canonical_parent_ids.length,0);assert.equal(entry.comparison.discovery_candidates.length,0);assert.equal(entry.comparison.warehouse_candidates.length,0);
 return {...entry,fingerprint:hash(entry)};
}

// Whole-group input is frozen as evidence, never interpreted as canonical approval.
export function rawProductIds(row) {
 const p=row.payload??{};
 return [...new Set([p.tcgplayerId,p.tcgplayer_id,p.productId,p.card?.tcgplayerId,
  p._source_warehouse_snapshot?.product_id,pokemonWarehouseMappingKey({source:row.source,external_id:p._external_id})?.product_id,
  (row.source==='tcgcsv')&&/^tcgcsv:(?:3|85):([0-9]+)$/.exec(p._external_id??'')?.[1]].filter(v=>/^\d+$/.test(String(v??''))).map(String))];
}
const plain=value=>JSON.parse(JSON.stringify(value));
const sortRows=rows=>[...rows].sort((a,b)=>id(a.id).localeCompare(id(b.id)));
export function buildGroupDiscoveryIntakePlan(input) {
 const {observed_at,category_id,group_id,expected_product_ids,products,coverage_rows,raw_receipts,discovery}=plain(input);
 assert.ok(Number.isFinite(Date.parse(observed_at)));assert.ok([3,85].includes(category_id));assert.ok(Number.isSafeInteger(group_id)&&group_id>0);
 const ids=expected_product_ids.map(String).sort();assert.ok(ids.length>0&&ids.length<=500,'bounded_whole_group_required');
 assert.equal(new Set(ids).size,ids.length,'duplicate_scope_product');
 assert.deepEqual(products.map(p=>id(p.product_id)).sort(),ids,'complete_source_group_required');
 assert.deepEqual(coverage_rows.map(p=>id(p.product_id)).sort(),ids,'complete_coverage_group_required');
 assert.ok(products.every(p=>Number(p.category_id)===category_id&&Number(p.group_id)===group_id),'source_group_scope_mismatch');
 assert.ok(coverage_rows.every(p=>Number(p.category_id)===category_id&&Number(p.group_id)===group_id),'coverage_group_scope_mismatch');
 const entries=[],retained=[],held=[];const byId=new Map(products.map(p=>[id(p.product_id),p]));
 assert.equal(new Set(raw_receipts.map(r=>id(r.id))).size,raw_receipts.length,'duplicate_raw_receipt');
 assert.equal(new Set(discovery.map(r=>id(r.id))).size,discovery.length,'duplicate_discovery_receipt');
 for(const row of coverage_rows){
  const product=byId.get(row.product_id);assert.equal(row.source_payload_hash,product.payload_hash,'coverage_source_drift');
  const d=discovery.filter(d=>id(d.tcgplayer_id)===row.product_id);
  assert.deepEqual(d.map(d=>d.id).sort(),row.discovery_candidates.map(d=>d.id).sort(),'discovery_inventory_drift');
  const raws=raw_receipts.filter(r=>rawProductIds(r).includes(row.product_id)||d.some(c=>id(c.raw_import_id)===id(r.id)));
  if(d.length){
   for(const candidate of d){const receipt=raws.find(r=>id(r.id)===id(candidate.raw_import_id));assert.ok(receipt,'existing_discovery_raw_lineage_missing');
    assert.equal(receipt.source,candidate.source,'existing_raw_source_mismatch');assert.deepEqual(rawProductIds(receipt),[row.product_id],'existing_raw_product_mismatch');}
   retained.push({product_id:row.product_id,discovery_ids:d.map(r=>r.id),raw_ids:raws.map(r=>id(r.id))});continue;
  }
  if(raws.length){held.push({product_id:row.product_id,reason:'existing_raw_requires_reconciliation',raw_ids:raws.map(r=>id(r.id))});continue;}
  if(!['untracked_card_candidate','existing_identity_mapping_review'].includes(row.status)){
   held.push({product_id:row.product_id,reason:row.status,canonical_parent_ids:row.canonical_parent_ids});continue;
  }
  try{entries.push(discoveryEntry(product,row));}catch(e){held.push({product_id:row.product_id,reason:e.message});}
 }
 entries.sort((a,b)=>Number(a.source.product_id)-Number(b.source.product_id));
 const body={version:VERSION,observed_at,purpose:'review_only_raw_and_discovery_intake',canonical_writes:0,pricing_writes:0,warehouse_promotion_writes:0,
  qualification_policy:'whole_source_group_relationships_and_raw_lineage_v1',group_input:plain(input),entries,retained,held};
 return {...body,fingerprint:hash(body)};
}
export function assertIntakePlan(plan){
 assert.equal(plan.version,VERSION,'fresh_group_package_required');
 assert.deepEqual(plan,buildGroupDiscoveryIntakePlan(plan.group_input),'group_plan_semantics_or_fingerprint_drift');return plan;
}
export async function readGroupRawReceipts(db,products,discovery,{lock=false}={}){
 const ids=products.map(p=>id(p.product_id)),external=products.flatMap(p=>[id(p.product_id),`tcgcsv:${p.category_id}:${p.product_id}`,`tcgcsv:${p.group_id}:${p.product_id}`]);
 return (await db.query(`select id::text,source,status,payload from public.raw_imports where
  id=any($3::bigint[]) or (source in ('tcgcsv','tcgplayer','justtcg') and
  (payload->>'tcgplayerId'=any($1::text[]) or payload->>'tcgplayer_id'=any($1::text[]) or payload->>'productId'=any($1::text[])
  or payload->>'_external_id'=any($2::text[]) or payload->'card'->>'tcgplayerId'=any($1::text[])
  or payload->'_source_warehouse_snapshot'->>'product_id'=any($1::text[]))) order by id${lock?' for share':''}`,[ids,external,discovery.map(d=>id(d.raw_import_id))])).rows;
}
export async function verifyGroupPreservation(db,plan,{lock=false}={}){
 const g=plan.group_input;
 const products=(await db.query('select * from public.tcgcsv_source_products where category_id=$1 and group_id=$2 order by product_id'+(lock?' for share':''),[g.category_id,g.group_id])).rows;
 assert.deepEqual(products.map(stableProduct),g.products.map(stableProduct),'whole_group_source_drift');
 const candidateIds=plan.entries.map(e=>e.candidate_id);
 const discovery=(await db.query('select * from public.external_discovery_candidates where tcgplayer_id=any($1::text[]) order by id'+(lock?' for share':''),[g.expected_product_ids])).rows;
 const retained=discovery.filter(d=>!candidateIds.includes(d.id));
 assert.deepEqual(plain(sortRows(retained)),plain(sortRows(g.discovery)),'retained_discovery_drift');
 const newRawIds=discovery.filter(d=>candidateIds.includes(d.id)).map(d=>id(d.raw_import_id));
 const raws=(await readGroupRawReceipts(db,products,discovery,{lock})).filter(r=>!newRawIds.includes(id(r.id)));
 assert.deepEqual(plain(sortRows(raws)),plain(sortRows(g.raw_receipts)),'whole_group_raw_drift');
}

export function rawPayload(entry,planFingerprint){
 return {_kind:'card',_external_id:entry.upstream_id,_set_external_id:`tcgcsv:${entry.source.category_id}:group:${entry.source.group_id}`,tcgplayerId:id(entry.source.product_id),
  name:entry.source.name,number:entry.source.extended_data.find(e=>e.name==='Number').value,
  _source_warehouse_snapshot:entry.source,_source_warehouse_snapshot_sha256:entry.source_sha256,
  _grookai_discovery_intake:{version:VERSION,plan_fingerprint:planFingerprint,entry_fingerprint:entry.fingerprint,normalization:entry.normalization,comparison:entry.comparison,gate:entry.gate}};
}

// Caller supplies a SERIALIZABLE transaction. No canonical, mapping, price,
// warehouse-candidate or source-product writer exists in this module.
export async function applyDiscoveryIntakeBatch(db,plan,entries,{authorization}={}){
 assertIntakePlan(plan);assert.ok(entries.length>0&&entries.length<=500,'bounded_batch_required');assert.equal(new Set(entries.map(e=>e.upstream_id)).size,entries.length,'duplicate_batch_entry');
 assert.equal(authorization?.approved,true);assert.equal(authorization.plan_fingerprint,plan.fingerprint);assert.ok(authorization.operator&&authorization.request);
 assert.equal((await db.query('show transaction_isolation')).rows[0].transaction_isolation,'serializable');assert.equal((await db.query('show transaction_read_only')).rows[0].transaction_read_only,'off');
 await db.query("select pg_advisory_xact_lock(hashtext('pokemon_warehouse_discovery_intake_v1'))");
 await db.query("select pg_advisory_xact_lock(hashtext('pokemon_warehouse_group_intake_v1'))");
 // Row locks cannot freeze an absent product. A short transaction-level SHARE
 // lock also excludes source inserts/deletes while preserving ordinary readers.
 // The CLI bounds lock/statement waits; no network acquisition occurs here.
 await db.query('lock table public.tcgcsv_source_products in share mode');
 await verifyGroupPreservation(db,plan,{lock:true});
 assert.deepEqual(entries,plan.entries,'whole_group_atomic_batch_required');
 const planned=new Map(plan.entries.map(e=>[e.upstream_id,e]));for(const e of entries)assert.deepEqual(e,planned.get(e.upstream_id),'entry_outside_frozen_scope');
 const existing=(await db.query('select id from public.external_discovery_candidates where id=any($1::uuid[]) for update',[entries.map(e=>e.candidate_id)])).rows;
 const existingIds=new Set(existing.map(c=>c.id)),fresh=entries.filter(e=>!existingIds.has(e.candidate_id));
 if(fresh.length){
  const productIds=fresh.map(e=>id(e.source.product_id));
  const live=(await db.query('select * from public.tcgcsv_source_products where product_id=any($1::bigint[]) order by product_id for share',[productIds])).rows;
  assert.equal(live.length,fresh.length,'source_scope_drift');const liveMap=new Map(live.map(p=>[id(p.product_id),p]));for(const e of fresh)assert.deepEqual(stableProduct(liveMap.get(id(e.source.product_id))),e.source,'source_snapshot_drift');
  const conflicts=(await db.query(`select 'discovery' kind from public.external_discovery_candidates where tcgplayer_id=any($1::text[]) union all
   select 'warehouse' from public.canon_warehouse_candidates where tcgplayer_id=any($1::text[]) union all
   select 'mapping' from public.external_mappings where active and source in ('tcgplayer','tcgcsv') and (external_id=any($1::text[]) or (source='tcgcsv' and external_id=any($2::text[]))) union all
   select 'parent' from public.card_prints where tcgplayer_id=any($1::text[]) or external_ids->>'tcgplayer'=any($1::text[]) or external_ids->>'tcgplayer_id'=any($1::text[]) union all
   select 'sealed' from public.sealed_product_source_mappings where source_provider='tcgplayer' and source_product_id::text=any($1::text[]) and source_category_id in (3,85) and mapping_status='exact_reviewed' and promotion_authorized`,[productIds,fresh.map(e=>`tcgcsv:${e.source.group_id}:${e.source.product_id}`)])).rows;
  assert.equal(conflicts.length,0,'new_relationship_requires_fresh_plan');
  const raws=(await db.query("select id from public.raw_imports where source='tcgcsv' and payload->>'_external_id'=any($1::text[])",[fresh.map(e=>e.upstream_id)])).rows;assert.equal(raws.length,0,'existing_raw_requires_reconciliation');
  const input=fresh.map(e=>({payload:rawPayload(e,plan.fingerprint)}));
  const created=(await db.query(`insert into public.raw_imports(source,status,notes,payload)
   select 'tcgcsv','processed','Preserved TCGCSV warehouse product copied into shared raw ingress for review-only discovery; no canonical identity or finish asserted.',r.payload
   from jsonb_to_recordset($1::jsonb) as r(payload jsonb) returning id,payload->>'_external_id' upstream_id`,[JSON.stringify(input)])).rows;
  assert.equal(created.length,fresh.length);const rawById=new Map(created.map(r=>[r.upstream_id,r.id]));
  const normalized=fresh.map(e=>({id:e.candidate_id,raw_import_id:rawById.get(e.upstream_id),upstream_id:e.upstream_id,tcgplayer_id:id(e.source.product_id),set_id:`tcgcsv:${e.source.category_id}:group:${e.source.group_id}`,name_raw:e.source.name,number_raw:rawPayload(e,plan.fingerprint).number,normalized_name:e.normalization.name,normalized_number_left:e.normalization.number_left,normalized_number_plain:e.normalization.number_plain,normalized_printed_total:e.normalization.printed_total,has_slash_number:Boolean(e.normalization.printed_total),has_alpha_suffix_number:/[a-z]$/i.test(e.normalization.number_left),has_parenthetical_modifier:/\([^)]*\)/.test(e.source.name),payload:rawPayload(e,plan.fingerprint)}));
  const inserted=await db.query(`insert into public.external_discovery_candidates(id,source,raw_import_id,upstream_id,tcgplayer_id,set_id,name_raw,number_raw,normalized_name,normalized_number_left,normalized_number_plain,normalized_printed_total,has_slash_number,has_alpha_suffix_number,has_parenthetical_modifier,match_status,candidate_bucket,classifier_version,payload,resolved_set_code,card_print_id)
   select r.id,'tcgcsv',r.raw_import_id,r.upstream_id,r.tcgplayer_id,r.set_id,r.name_raw,r.number_raw,r.normalized_name,r.normalized_number_left,r.normalized_number_plain,r.normalized_printed_total,r.has_slash_number,r.has_alpha_suffix_number,r.has_parenthetical_modifier,'AMBIGUOUS','PRINTED_IDENTITY_REVIEW',$2,r.payload,null,null
   from jsonb_to_recordset($1::jsonb) as r(id uuid,raw_import_id bigint,upstream_id text,tcgplayer_id text,set_id text,name_raw text,number_raw text,normalized_name text,normalized_number_left text,normalized_number_plain text,normalized_printed_total text,has_slash_number boolean,has_alpha_suffix_number boolean,has_parenthetical_modifier boolean,payload jsonb)`,[JSON.stringify(normalized),VERSION]);assert.equal(inserted.rowCount,fresh.length);
 }
 const verified=await verifyDiscoveryIntakeBatch(db,plan,entries);
 return verified.map(r=>({...r,status:existingIds.has(r.candidate_id)?'already_succeeded':'inserted_review_only'}));
}

export async function verifyDiscoveryIntakeBatch(db,plan,entries){
 const found=(await db.query(`select to_jsonb(c)||jsonb_build_object('raw_import_id',c.raw_import_id::text) candidate,r.source raw_source,r.status raw_status,r.payload raw_payload from public.external_discovery_candidates c join public.raw_imports r on r.id=c.raw_import_id where c.id=any($1::uuid[]) order by c.id`,[entries.map(e=>e.candidate_id)])).rows;
 assert.equal(found.length,entries.length,'discovery_batch_readback_count');const byId=new Map(found.map(r=>[r.candidate.id,r]));
 return entries.map(e=>{const r=byId.get(e.candidate_id);assert.ok(r);const c=r.candidate;
  const expected={source:'tcgcsv',upstream_id:e.upstream_id,tcgplayer_id:id(e.source.product_id),set_id:`tcgcsv:${e.source.category_id}:group:${e.source.group_id}`,name_raw:e.source.name,number_raw:rawPayload(e,plan.fingerprint).number,normalized_name:e.normalization.name,normalized_number_left:e.normalization.number_left,normalized_number_plain:e.normalization.number_plain,normalized_printed_total:e.normalization.printed_total,has_slash_number:Boolean(e.normalization.printed_total),has_alpha_suffix_number:/[a-z]$/i.test(e.normalization.number_left),has_parenthetical_modifier:/\([^)]*\)/.test(e.source.name),match_status:'AMBIGUOUS',candidate_bucket:'PRINTED_IDENTITY_REVIEW',classifier_version:VERSION,resolved_set_code:null,card_print_id:null};
  for(const [key,value]of Object.entries(expected))assert.deepEqual(c[key],value,`discovery_readback:${key}`);
  assert.equal(r.raw_source,'tcgcsv');assert.equal(r.raw_status,'processed');assert.deepEqual(c.payload,rawPayload(e,plan.fingerprint),'discovery_payload_drift');assert.deepEqual(r.raw_payload,c.payload,'raw_lineage_drift');
  return {product_id:id(e.source.product_id),candidate_id:c.id,raw_import_id:id(c.raw_import_id)};
 });
}

export async function verifyDiscoveryIntakeEntry(db,plan,e){
 return (await verifyDiscoveryIntakeBatch(db,plan,[e]))[0];
}

// Operational job ledger only; never creates a pending job for another worker.
export async function persistDiscoveryIntakeRun(db,{jobId=null,status,payload}){
 assert.ok(['running','succeeded','failed'].includes(status));assert.equal(payload.version,VERSION);assert.ok(payload.run_id&&payload.plan_fingerprint);
 const result=jobId===null
  ?await db.query('insert into public.ingestion_jobs(job_type,status,attempts,last_attempt_at,payload) values($1,$2,1,now(),$3::jsonb) returning id',[VERSION,status,JSON.stringify(payload)])
  :await db.query('update public.ingestion_jobs set status=$2,last_attempt_at=now(),payload=$3::jsonb where id=$1 and job_type=$4 returning id',[jobId,status,JSON.stringify(payload),VERSION]);
 assert.equal(result.rowCount,1,'ingestion_job_receipt_missing');return id(result.rows[0].id);
}
