import assert from 'node:assert/strict';
import { projectionHash as hash, assertWorld2010IdentityProjection } from './pokemon_world2010_identity_projection_v1.mjs';
import { assertWorld2010SubsetIngress, applyWorld2010SubsetLocal, reconcileWorld2010Subset, verifyWorld2010SubsetPreservation } from './pokemon_world2010_subset_ingress_v1.mjs';

export const VERSION = 'POKEMON_WORLD2010_RELATIONSHIP_EXECUTION_V1';
const plain = v => JSON.parse(JSON.stringify(v));
const sorted = rows => plain(rows).sort((a,b) => String(a.id).localeCompare(String(b.id)));
const tables = ['card_print_identity', 'card_print_identity_source_evidence', 'external_mappings'];

// New automated authority, derived from original sources and the integrated
// Master. Historical printing approvals and raw-only journals are not authority.
export function buildWorld2010RelationshipExecution(input, originals) {
  const { projection, projection_inputs: pi, ingress, active_cards, sql_hashes, intent_id } = input;
  assert.match(intent_id ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,'fresh_execution_intent_required');
  assertWorld2010IdentityProjection(projection, { ...pi, originals });
  assertWorld2010SubsetIngress(ingress, originals);
  assert.deepEqual(pi.snapshot, ingress.input.relationship_snapshot, 'relationship_snapshot_drift');
  assert.deepEqual(projection.held, ingress.held, 'held_scope_drift');
  assert.equal(active_cards.length,92,'whole92_active_master_required');
  assert.deepEqual([...active_cards].sort((a,b)=>a.key.localeCompare(b.key)), [...projection.cards].sort((a,b)=>a.key.localeCompare(b.key)), 'active_master_drift');
  assert.equal(sql_hashes.length,92); assert.equal(new Set(sql_hashes.map(r=>r.id)).size,92);
  assert.equal(new Set(sql_hashes.map(r=>r.hash)).size,92,'sql_hash_collision');
  const identities = projection.tables.card_print_identity.map(r=>{
    const h=sql_hashes.find(h=>h.id===r.id);assert.ok(h,'missing_sql_hash');assert.match(h.hash,/^[a-f0-9]{64}$/);
    assert.equal(h.normalized,r.normalized_printed_name,'sql_normalization_drift');return {...r,identity_key_hash:h.hash};
  });
  const mappings=pi.review.qualified.map(q=>({source:'tcgcsv',external_id:q.external_id,card_print_id:q.parent_id,active:true,
    meta:{version:VERSION,intent_id,product_id:q.product_id,source_payload_hash:q.source_payload_hash,
      relationship_review_fingerprint:pi.review.fingerprint,master_identity_key:active_cards.find(c=>c.existing_parent.card_print_id===q.parent_id).key,
      identity_id:identities.find(i=>i.card_print_id===q.parent_id).id,finish_authority:false}}));
  assert.equal(new Set(mappings.map(m=>m.external_id)).size,92);
  assert.ok(mappings.every(m=>/^tcgcsv:2282:\d+$/.test(m.external_id)),'tcgcsv_namespace_required');
  const body={version:VERSION,input:plain(input),actor:projection.actor,actor_type:'automated_agent',human_signature:null,
    tables:{card_print_identity:identities,card_print_identity_source_evidence:projection.tables.card_print_identity_source_evidence,external_mappings:mappings},
    held:projection.held,discovery_policy:'preserve_review_rows_and_payloads; exact_tcgcsv_mapping_resolves_coverage',
    counts:{identities:92,evidence:184,mappings:92,new_raw:83,new_discovery:83,retained_lineages:9,held:17,journals:2},
    production_execution_authorized:false};
  return {...body,fingerprint:hash(body)};
}
export function assertWorld2010RelationshipExecution(plan, originals) {
  assert.equal(plan.version,VERSION,'new_relationship_package_required');
  assert.deepEqual(plan,buildWorld2010RelationshipExecution(plan.input,originals),'relationship_package_replay_drift');
}

export async function verifyWorld2010CanonicalPreservation(db,plan,{lock=false}={}) {
  const s=plan.input.projection_inputs.snapshot,suffix=lock?' for share':'';
  const query=async(sql,args)=>(await db.query(sql+suffix,args)).rows;
  const sets=await query('select id,code,name,printed_total,identity_model,identity_domain_default,source from public.sets where game=\'pokemon\' and code=any($1::text[]) order by code',[s.sets.map(r=>r.code)]);
  const parents=await query('select id,set_id,gv_id,name,number,number_plain,variant_key,identity_domain,printed_identity_modifier,external_ids,tcgplayer_id,printed_total from public.card_prints where set_id=any($1::uuid[]) order by id',[s.sets.map(r=>r.id)]);
  const printings=await query('select id,card_print_id,finish_key,printing_gv_id,is_provisional,provenance_source,provenance_ref from public.card_printings where card_print_id=any($1::uuid[]) order by id',[s.parents.map(r=>r.id)]);
  const reviews=await query('select id,card_printing_id,review_status,public_visibility,active,reason,confidence,evidence_sources_checked,evidence_sources_for_finish,expected_finish_keys,evidence from public.card_printing_truth_reviews where card_printing_id=any($1::uuid[]) order by id',[s.printings.map(r=>r.id)]);
  for(const [k,rows] of Object.entries({sets,parents,printings,reviews}))assert.deepEqual(sorted(rows),sorted(s[k]),'retained_canonical_drift:'+k);
  const historical=await query('select id::text,source,status,payload from public.raw_imports where id=any($1::bigint[]) order by id',[s.historical_printing_raw.map(r=>r.id)]);
  assert.deepEqual(sorted(historical),sorted(s.historical_printing_raw),'retained_historical_raw_drift');
}

async function rowsInScope(db,plan) {
  const s=plan.input.projection_inputs.snapshot,ids=s.parents.map(r=>r.id),q=async(sql,a)=>(await db.query(sql,a)).rows;
  const external=s.products.flatMap(p=>[String(p.product_id),`tcgcsv:3:${p.product_id}`,`tcgcsv:2282:${p.product_id}`]);
  return {
    card_print_identity:await q('select to_jsonb(t) row from public.card_print_identity t where id=any($1::uuid[]) or card_print_id=any($2::uuid[]) or identity_key_hash=any($3::text[]) or set_code_identity=any($4::text[]) order by id',[plan.tables.card_print_identity.map(r=>r.id),ids,plan.tables.card_print_identity.map(r=>r.identity_key_hash),s.sets.map(r=>r.code)]),
    card_print_identity_source_evidence:await q('select to_jsonb(t) row from public.card_print_identity_source_evidence t where id=any($1::uuid[]) or card_print_id=any($2::uuid[]) or acquisition_key=any($3::text[]) order by id',[plan.tables.card_print_identity_source_evidence.map(r=>r.id),ids,plan.tables.card_print_identity_source_evidence.map(r=>r.acquisition_key)]),
    external_mappings:await q("select to_jsonb(t)||jsonb_build_object('id',id::text) row from public.external_mappings t where card_print_id=any($1::uuid[]) or (source in ('tcgcsv','tcgplayer') and external_id=any($2::text[])) order by id",[ids,external]),
  };
}

async function verifyRows(db,plan,ingress) {
  const found=await rowsInScope(db,plan),lineage=[...plan.input.ingress.retained,...ingress.rows];
  for(const table of tables){
    const expected=plan.tables[table],actual=found[table].map(r=>r.row);assert.equal(actual.length,expected.length,'exact_scope_count:'+table);
    for(const e of expected){
      const r=actual.find(r=>table==='external_mappings'?r.source===e.source&&r.external_id===e.external_id:r.id===e.id);assert.ok(r,'missing_expected_row:'+table);
      for(const [key,value]of Object.entries(e)){
        const wanted=table==='external_mappings'&&key==='meta'?{...value,raw_import_id:lineage.find(l=>l.product_id===value.product_id).raw_import_id,discovery_id:lineage.find(l=>l.product_id===value.product_id).discovery_id??lineage.find(l=>l.product_id===value.product_id).candidate_id}:value;
        assert.deepEqual(r[key],wanted,'canonical_readback_drift:'+table+':'+key);
      }
    }
  }
  return {row_fingerprints:Object.fromEntries(tables.map(t=>[t,hash(sorted(found[t].map(r=>r.row)))])),
    mappings:found.external_mappings.map(r=>({id:r.row.id,external_id:r.row.external_id})).sort((a,b)=>a.external_id.localeCompare(b.external_id))};
}

export async function reconcileWorld2010Relationships(db,plan) {
  await verifyWorld2010CanonicalPreservation(db,plan);
  await verifyWorld2010SubsetPreservation(db,plan.input.ingress);
  const jobs=(await db.query('select id::text,status,payload from public.ingestion_jobs where job_type=$1 and (payload->>\'plan_fingerprint\'=$2 or payload->>\'intent_id\'=$3) order by id',[VERSION,plan.fingerprint,plan.input.intent_id])).rows;
  const ingress=await reconcileWorld2010Subset(db,plan.input.ingress);
  if(!jobs.length){
    const rows=await rowsInScope(db,plan);assert.ok(tables.every(t=>rows[t].length===0),'unjournaled_or_conflicting_relationships');
    assert.equal(ingress.status,'absent','standalone_ingress_is_not_atomic_relationship_execution');
    return {status:'absent',production_execution_authorized:false};
  }
  assert.equal(jobs.length,1,'ambiguous_relationship_journal');assert.equal(jobs[0].status,'succeeded');assert.equal(ingress.status,'verified');
  const verified=await verifyRows(db,plan,ingress);
  const payload={version:VERSION,plan_fingerprint:plan.fingerprint,intent_id:plan.input.intent_id,ingress,...verified};
  assert.deepEqual(jobs[0].payload,payload,'relationship_journal_drift');
  return {status:'verified',ledger_id:jobs[0].id,...payload};
}

export function assertWorld2010RelationshipPending(pending,readback) {
  assert.equal(pending.status,'verified');assert.equal(readback.status,'verified');
  assert.deepEqual(readback,pending,'pending_relationship_identity_drift');return readback;
}

// Intentionally local-only until full dependencies, producer and production CLI
// are qualified. Both ledgers are committed by the caller in ONE transaction.
export async function applyWorld2010RelationshipsLocal(db,plan,originals) {
  assertWorld2010RelationshipExecution(plan,originals);
  const target=(await db.query('select current_database() name,host(inet_server_addr()) address')).rows[0];
  assert.match(target.name,/^grookai_world2010_subset_canonical_[a-z0-9_]+$/,'isolated_relationship_lab_required');
  assert.ok(['127.0.0.1','::1'].includes(target.address),'loopback_relationship_lab_required');
  assert.equal((await db.query('show transaction_isolation')).rows[0].transaction_isolation,'serializable');
  assert.equal((await db.query('show transaction_read_only')).rows[0].transaction_read_only,'off');
  for(const lock of ['pokemon_warehouse_discovery_intake_v1','pokemon_warehouse_group_intake_v1','pokemon_world2010_subset_ingress_v1','pokemon_world2010_relationship_execution_v1'])await db.query('select pg_advisory_xact_lock(hashtext($1))',[lock]);
  // Local proof fences include potential phantom parents/children and mappings.
  // This is not a qualified production locking strategy.
  await db.query('lock table public.tcgcsv_source_products,public.sets,public.card_prints,public.card_printings,public.card_printing_truth_reviews in share mode');
  await db.query('lock table public.card_print_identity,public.card_print_identity_source_evidence,public.external_mappings,public.raw_imports,public.external_discovery_candidates,public.ingestion_jobs in share row exclusive mode');
  await verifyWorld2010CanonicalPreservation(db,plan,{lock:true});
  const prior=await reconcileWorld2010Relationships(db,plan);if(prior.status==='verified')return prior;
  const productIds=plan.input.projection_inputs.snapshot.products.map(p=>String(p.product_id));
  const competing=(await db.query(`select 'promotion' kind from public.canon_warehouse_candidates where tcgplayer_id=any($1::text[])
    union all select 'direct_parent' from public.card_prints where tcgplayer_id=any($1::text[]) or external_ids->>'tcgplayer'=any($1::text[]) or external_ids->>'tcgplayer_id'=any($1::text[])
    union all select 'sealed' from public.sealed_product_source_mappings where source_provider='tcgplayer' and source_product_id::text=any($1::text[]) and source_category_id in (3,85) and mapping_status='exact_reviewed' and promotion_authorized`,[productIds])).rows;
  assert.equal(competing.length,0,'competing_whole109_relationship_requires_reconciliation');
  const hashes=(await db.query(`select r.id,public.card_print_identity_hash_v1(r.identity_domain,r.identity_key_version,r.set_code_identity,r.printed_number,r.normalized_printed_name,r.source_name_raw,r.identity_payload) hash from jsonb_populate_recordset(null::public.card_print_identity,$1::jsonb) r order by r.id`,[JSON.stringify(plan.tables.card_print_identity)])).rows;
  for(const r of hashes)assert.equal(r.hash,plan.tables.card_print_identity.find(i=>i.id===r.id).identity_key_hash,'actual_sql_hash_drift');
  assert.equal(hashes.length,92);
  await applyWorld2010SubsetLocal(db,plan.input.ingress,originals);
  const ingress=await reconcileWorld2010Subset(db,plan.input.ingress);
  for(const table of tables.slice(0,2)){
    const rows=plan.tables[table],cols=Object.keys(rows[0]);assert.ok(cols.every(c=>/^[a-z_]+$/.test(c)));
    const written=await db.query(`insert into public.${table} (${cols.join(',')}) select ${cols.join(',')} from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,[JSON.stringify(rows)]);assert.equal(written.rowCount,rows.length);
  }
  const lineage=[...plan.input.ingress.retained,...ingress.rows];
  const mappings=plan.tables.external_mappings.map(m=>{const l=lineage.find(l=>l.product_id===m.meta.product_id);assert.ok(l);return {...m,meta:{...m.meta,raw_import_id:l.raw_import_id,discovery_id:l.discovery_id??l.candidate_id}};});
  const inserted=await db.query('insert into public.external_mappings(source,external_id,card_print_id,active,meta) select source,external_id,card_print_id,active,meta from jsonb_populate_recordset(null::public.external_mappings,$1::jsonb)',[JSON.stringify(mappings)]);assert.equal(inserted.rowCount,92);
  const verified=await verifyRows(db,plan,ingress);
  await db.query('insert into public.ingestion_jobs(job_type,status,attempts,last_attempt_at,payload) values($1,\'succeeded\',1,now(),$2::jsonb)',[VERSION,JSON.stringify({version:VERSION,plan_fingerprint:plan.fingerprint,intent_id:plan.input.intent_id,ingress,...verified})]);
  return reconcileWorld2010Relationships(db,plan);
}
