import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { qualifyWorld2010Relationships } from './pokemon_world2010_relationship_review_v1.mjs';
import { discoveryEntry, readGroupRawReceipts, rawProductIds } from './pokemon_warehouse_group_intake_v1.mjs';

export const VERSION = 'POKEMON_WORLD2010_SUBSET_INGRESS_V1';
const plain = v => JSON.parse(JSON.stringify(v));
const hash = v => createHash('sha256').update(JSON.stringify(v, (_, x) => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x)).digest('hex');
const sorted = (rows, key = 'id') => plain(rows).sort((a,b) => String(a[key]).localeCompare(String(b[key])));
const ids = rows => rows.map(r => String(r.product_id)).sort();
const unique = (rows, key) => assert.equal(new Set(rows.map(r => String(r[key]))).size, rows.length, 'duplicate_inventory_' + key);

// This policy is deliberately separate from whole-group V1. The entire source
// group is fenced; only the original four-deck subset can enter review ingress.
export function buildWorld2010SubsetIngress(input, originals) {
  const i = plain(input), s = i.ingress_snapshot, w = i.relationship_snapshot;
  assert.ok(Number.isFinite(Date.parse(i.observed_at)), 'observation_time_required');
  assert.ok(s.sanity.cards >= 40000 && s.sanity.sets >= 150 && s.sanity.traits >= 5000);
  assert.deepEqual(s.sanity, w.sanity, 'independent_environment_drift');
  const review = qualifyWorld2010Relationships(w, originals, i.observed_at);
  for (const [rows,key] of [[s.group_products,'product_id'],[s.products,'product_id'],[s.rows,'product_id'],
    [s.group_discovery,'id'],[s.group_raw,'id'],[s.discovery,'id'],[s.raw,'id']]) unique(rows,key);
  assert.equal(s.group_products.length, 2001, 'complete2001_source_group_required');
  assert.equal(s.group_discovery.length,77,'complete77_group_discovery_required');
  assert.equal(s.group_raw.length,77,'complete77_group_raw_required');
  assert.ok(s.group_products.every(p => p.category_id === 3 && p.group_id === 2282), 'source_group_mismatch');
  assert.deepEqual(sorted(s.products,'product_id'), sorted(w.products,'product_id'), 'independent_selected_source_drift');
  const selected = new Set(ids(s.products));
  assert.deepEqual(sorted(s.group_products.filter(p => selected.has(String(p.product_id))),'product_id'), sorted(s.products,'product_id'), 'selected_source_not_in_complete_group');
  assert.deepEqual(ids(s.rows), ids(s.products), 'whole109_coverage_required');
  const groupIds = new Set(ids(s.group_products));
  assert.ok(s.group_discovery.every(d => groupIds.has(String(d.tcgplayer_id))), 'discovery_outside_group');
  assert.deepEqual(sorted(s.group_discovery.filter(d => selected.has(String(d.tcgplayer_id)))), sorted(s.discovery), 'selected_discovery_inventory_drift');
  assert.deepEqual(sorted(s.group_raw.filter(r => rawProductIds(r).some(id => selected.has(id)) || s.discovery.some(d => String(d.raw_import_id) === String(r.id)))), sorted(s.raw), 'selected_raw_inventory_drift');
  assert.deepEqual(sorted(s.raw), sorted(w.raw_receipts), 'independent_raw_drift');
  for (const d of w.discovery) {
    const live = s.discovery.find(r => r.id === d.id); assert.ok(live, 'retained_discovery_missing');
    for (const key of Object.keys(d)) assert.deepEqual(live[key], d[key], 'independent_discovery_drift:' + key);
  }
  const entries = [], retained = [];
  for (const q of review.qualified) {
    const p = s.products.find(p => String(p.product_id) === q.product_id), row = s.rows.find(r => r.product_id === q.product_id);
    assert.equal(row.category_id,3); assert.equal(Number(row.group_id),2282);
    assert.equal(row.source_payload_hash,p.payload_hash,'coverage_source_drift');
    assert.equal(row.canonical_parent_ids.length,0,'new_exact_relationship_requires_reconciliation');
    assert.equal((row.promotion_candidates ?? []).length,0,'new_promotion_requires_reconciliation');
    const ds = s.discovery.filter(d => String(d.tcgplayer_id) === q.product_id);
    assert.deepEqual(ds.map(d=>d.id).sort(), row.discovery_candidates.map(d=>d.id).sort(), 'coverage_discovery_drift');
    const rs = s.raw.filter(r => rawProductIds(r).includes(q.product_id));
    if (q.lineage) {
      assert.equal(ds.length,1); assert.equal(rs.length,1); assert.deepEqual(rawProductIds(rs[0]),[q.product_id]);
      assert.equal(String(rs[0].id),q.lineage.raw_import_id); assert.equal(ds[0].id,q.lineage.discovery_id);
      retained.push({ product_id:q.product_id, discovery_id:ds[0].id, raw_import_id:String(rs[0].id) });
    } else {
      assert.equal(ds.length,0); assert.equal(rs.length,0,'unbound_raw_requires_reconciliation');
      entries.push(discoveryEntry(p,row));
    }
  }
  assert.equal(entries.length,83); assert.equal(retained.length,9);
  const outside = s.group_products.filter(p => !selected.has(String(p.product_id)));
  assert.equal(outside.length,1892);
  const body = { version:VERSION, actor:review.actor, actor_type:'automated_agent', human_signature:null,
    purpose:'whole109_review_ingress_with_complete2001_source_fence', input:i,
    relationship_review_fingerprint:review.fingerprint, entries, retained, held:review.held,
    outside_product_ids:ids(outside), source_fence_sha256:hash(sorted(s.group_products,'product_id')),
    counts:{ source_group:2001, selected:109, outside:1892, new_raw:83, retained:9, held:17 },
    canonical_writes:0, mapping_writes:0, finish_writes:0, production_execution_authorized:false };
  return { ...body, fingerprint:hash(body) };
}

export function assertWorld2010SubsetIngress(plan, originals) {
  assert.equal(plan.version,VERSION,'new_subset_package_required');
  assert.deepEqual(plan,buildWorld2010SubsetIngress(plan.input, originals),'subset_plan_replay_drift'); return plan;
}
export function world2010SubsetRawPayload(entry, fingerprint) {
  return { _kind:'card', _external_id:entry.upstream_id, _set_external_id:'tcgcsv:3:group:2282',
    tcgplayerId:String(entry.source.product_id), name:entry.source.name,
    number:entry.source.extended_data.find(e=>e.name==='Number').value,
    _source_warehouse_snapshot:entry.source, _source_warehouse_snapshot_sha256:entry.source_sha256,
    _grookai_discovery_intake:{ version:VERSION, plan_fingerprint:fingerprint, entry_fingerprint:entry.fingerprint,
      normalization:entry.normalization, comparison:entry.comparison, gate:entry.gate } };
}

export async function verifyWorld2010SubsetPreservation(db, plan, {lock=false}={}) {
  const s=plan.input.ingress_snapshot, suffix=lock?' for share':'';
  const products=(await db.query('select * from public.tcgcsv_source_products where category_id=3 and group_id=2282 order by product_id'+suffix)).rows;
  assert.deepEqual(sorted(products,'product_id'),sorted(s.group_products,'product_id'),'complete_group_source_drift');
  const discovery=(await db.query('select * from public.external_discovery_candidates where tcgplayer_id=any($1::text[]) order by id'+suffix,[ids(products)])).rows;
  const generatedIds=new Set(plan.entries.map(e=>e.candidate_id)), created=discovery.filter(d=>generatedIds.has(d.id));
  assert.deepEqual(sorted(discovery.filter(d=>!generatedIds.has(d.id))),sorted(s.group_discovery),'whole_group_retained_discovery_drift');
  const createdRawIds=new Set(created.map(d=>String(d.raw_import_id)));
  const raw=await readGroupRawReceipts(db,products,discovery,{lock});
  assert.deepEqual(sorted(raw.filter(r=>!createdRawIds.has(String(r.id)))),sorted(s.group_raw),'whole_group_retained_raw_drift');
  return {created};
}

export async function verifyWorld2010SubsetRows(db,plan) {
  const rows=(await db.query(`select to_jsonb(c)||jsonb_build_object('raw_import_id',c.raw_import_id::text) candidate,
    r.source raw_source,r.status raw_status,r.payload raw_payload from public.external_discovery_candidates c
    join public.raw_imports r on r.id=c.raw_import_id where c.id=any($1::uuid[]) order by c.id`,[plan.entries.map(e=>e.candidate_id)])).rows;
  assert.equal(rows.length,83,'whole83_readback_required');
  return plan.entries.map(e=>{
    const r=rows.find(r=>r.candidate.id===e.candidate_id); assert.ok(r,'candidate_id_drift'); const c=r.candidate;
    const expected={source:'tcgcsv',upstream_id:e.upstream_id,tcgplayer_id:String(e.source.product_id),set_id:'tcgcsv:3:group:2282',
      name_raw:e.source.name,number_raw:world2010SubsetRawPayload(e,plan.fingerprint).number,
      normalized_name:e.normalization.name,normalized_number_left:e.normalization.number_left,
      normalized_number_plain:e.normalization.number_plain,normalized_printed_total:e.normalization.printed_total,
      has_slash_number:Boolean(e.normalization.printed_total),has_alpha_suffix_number:/[a-z]$/i.test(e.normalization.number_left),
      has_parenthetical_modifier:/\([^)]*\)/.test(e.source.name),match_status:'AMBIGUOUS',candidate_bucket:'PRINTED_IDENTITY_REVIEW',
      classifier_version:VERSION,resolved_set_code:null,card_print_id:null};
    for(const [k,v] of Object.entries(expected)) assert.deepEqual(c[k],v,'candidate_readback:'+k);
    assert.equal(r.raw_source,'tcgcsv'); assert.equal(r.raw_status,'processed');
    assert.deepEqual(c.payload,world2010SubsetRawPayload(e,plan.fingerprint),'candidate_payload_drift');
    assert.deepEqual(r.raw_payload,c.payload,'raw_payload_drift');
    return {product_id:String(e.source.product_id),candidate_id:c.id,raw_import_id:String(c.raw_import_id)};
  });
}

export async function reconcileWorld2010Subset(db,plan) {
  await verifyWorld2010SubsetPreservation(db,plan);
  const found=(await db.query('select id::text,status,payload from public.ingestion_jobs where job_type=$1 and payload->>\'plan_fingerprint\'=$2 order by id',[VERSION,plan.fingerprint])).rows;
  const n=(await db.query('select count(*)::int n from public.external_discovery_candidates where id=any($1::uuid[])',[plan.entries.map(e=>e.candidate_id)])).rows[0].n;
  if (!found.length) { assert.equal(n,0,'unjournaled_ingress_requires_reconciliation'); return {status:'absent',production_execution_authorized:false}; }
  assert.equal(found.length,1,'ambiguous_subset_journal'); const job=found[0]; assert.equal(job.status,'succeeded');
  const rows=await verifyWorld2010SubsetRows(db,plan);
  assert.deepEqual(job.payload,{version:VERSION,plan_fingerprint:plan.fingerprint,generated_rows:rows},'generated_row_journal_drift');
  return {status:'verified',ledger_id:job.id,rows};
}

export function assertWorld2010SubsetPending(pending, readback) {
  assert.equal(pending.status,'verified');assert.equal(readback.status,'verified');
  assert.equal(readback.ledger_id,pending.ledger_id,'pending_ledger_identity_drift');
  assert.deepEqual(readback.rows,pending.rows,'pending_generated_identity_drift');
  assert.equal(readback.rows.length,83);return readback;
}

// Qualification-only boundary. There is intentionally no production apply CLI.
// The next canonical executor must bind this journal into its own fresh package.
export async function applyWorld2010SubsetLocal(db,plan,originals) {
  assertWorld2010SubsetIngress(plan,originals);
  const target=(await db.query('select current_database() name,host(inet_server_addr()) address')).rows[0];
  assert.match(target.name,/^grookai_world2010_subset_[a-z0-9_]+$/,'isolated_subset_lab_required');
  assert.ok(['127.0.0.1','::1'].includes(target.address),'loopback_subset_lab_required');
  assert.equal((await db.query('show transaction_isolation')).rows[0].transaction_isolation,'serializable');
  assert.equal((await db.query('show transaction_read_only')).rows[0].transaction_read_only,'off');
  await db.query("select pg_advisory_xact_lock(hashtext('pokemon_warehouse_discovery_intake_v1'))");
  await db.query("select pg_advisory_xact_lock(hashtext('pokemon_warehouse_group_intake_v1'))");
  await db.query("select pg_advisory_xact_lock(hashtext('pokemon_world2010_subset_ingress_v1'))");
  await db.query('lock table public.tcgcsv_source_products in share mode');
  await verifyWorld2010SubsetPreservation(db,plan,{lock:true});
  const prior=await reconcileWorld2010Subset(db,plan); if(prior.status==='verified')return {...prior,inserted:0};
  const productIds=plan.entries.map(e=>String(e.source.product_id));
  const conflicts=(await db.query(`select 'discovery' kind from public.external_discovery_candidates where id=any($3::uuid[]) or tcgplayer_id=any($1::text[])
    union all select 'warehouse' from public.canon_warehouse_candidates where tcgplayer_id=any($1::text[])
    union all select 'mapping' from public.external_mappings where source in ('tcgcsv','tcgplayer') and (external_id=any($1::text[]) or external_id=any($2::text[]))
    union all select 'parent' from public.card_prints where tcgplayer_id=any($1::text[]) or external_ids->>'tcgplayer'=any($1::text[]) or external_ids->>'tcgplayer_id'=any($1::text[])
    union all select 'sealed' from public.sealed_product_source_mappings where source_provider='tcgplayer' and source_product_id::text=any($1::text[]) and source_category_id in (3,85) and mapping_status='exact_reviewed' and promotion_authorized`,
    [productIds,plan.entries.flatMap(e=>[e.upstream_id,`tcgcsv:2282:${e.source.product_id}`]),plan.entries.map(e=>e.candidate_id)])).rows;
  assert.equal(conflicts.length,0,'new_relationship_requires_reconciliation');
  const raws=(await db.query(`insert into public.raw_imports(source,status,notes,payload)
    select 'tcgcsv','processed','World2010 subset review ingress; no canonical or finish authority.',r.payload
    from jsonb_to_recordset($1::jsonb) r(payload jsonb) returning id::text,payload->>'_external_id' upstream_id`,
    [JSON.stringify(plan.entries.map(e=>({payload:world2010SubsetRawPayload(e,plan.fingerprint)})))])).rows;
  assert.equal(raws.length,83);
  const normalized=plan.entries.map(e=>({id:e.candidate_id,raw_import_id:raws.find(r=>r.upstream_id===e.upstream_id).id,
    upstream_id:e.upstream_id,tcgplayer_id:String(e.source.product_id),name_raw:e.source.name,
    number_raw:world2010SubsetRawPayload(e,plan.fingerprint).number,normalized_name:e.normalization.name,
    normalized_number_left:e.normalization.number_left,normalized_number_plain:e.normalization.number_plain,
    normalized_printed_total:e.normalization.printed_total,has_slash_number:Boolean(e.normalization.printed_total),
    has_alpha_suffix_number:/[a-z]$/i.test(e.normalization.number_left),has_parenthetical_modifier:/\([^)]*\)/.test(e.source.name),
    payload:world2010SubsetRawPayload(e,plan.fingerprint)}));
  const inserted=await db.query(`insert into public.external_discovery_candidates(id,source,raw_import_id,upstream_id,tcgplayer_id,set_id,name_raw,number_raw,normalized_name,normalized_number_left,normalized_number_plain,normalized_printed_total,has_slash_number,has_alpha_suffix_number,has_parenthetical_modifier,match_status,candidate_bucket,classifier_version,payload,resolved_set_code,card_print_id)
    select r.id,'tcgcsv',r.raw_import_id,r.upstream_id,r.tcgplayer_id,'tcgcsv:3:group:2282',r.name_raw,r.number_raw,r.normalized_name,r.normalized_number_left,r.normalized_number_plain,r.normalized_printed_total,r.has_slash_number,r.has_alpha_suffix_number,r.has_parenthetical_modifier,'AMBIGUOUS','PRINTED_IDENTITY_REVIEW',$2,r.payload,null,null
    from jsonb_to_recordset($1::jsonb) r(id uuid,raw_import_id bigint,upstream_id text,tcgplayer_id text,name_raw text,number_raw text,normalized_name text,normalized_number_left text,normalized_number_plain text,normalized_printed_total text,has_slash_number boolean,has_alpha_suffix_number boolean,has_parenthetical_modifier boolean,payload jsonb)`,[JSON.stringify(normalized),VERSION]);
  assert.equal(inserted.rowCount,83);
  const rows=await verifyWorld2010SubsetRows(db,plan);
  await db.query(`insert into public.ingestion_jobs(job_type,status,attempts,last_attempt_at,payload) values($1,'succeeded',1,now(),$2::jsonb)`,[VERSION,JSON.stringify({version:VERSION,plan_fingerprint:plan.fingerprint,generated_rows:rows})]);
  return {...await reconcileWorld2010Subset(db,plan),inserted:83};
}
