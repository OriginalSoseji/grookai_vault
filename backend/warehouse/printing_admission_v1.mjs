import assert from 'node:assert/strict';
import {assertWarehousePrintingAuthority} from './printing_authority_v1.mjs';
import {buildPrintingAdmissionPlan, printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {readExecutionSchema} from '../catalog/master_index_printing_execution_v1.mjs';

export const WAREHOUSE_PRINTING_ADMISSION_VERSION = 'WAREHOUSE_PRINTING_ADMISSION_V1';
const languageByDomain = Object.freeze({pokemon_eng_standard:'en',pokemon_jpn:'ja',mtg_eng_paper_print:'en',one_piece_eng_print:'en'});
const uuid = value => {const h=hash(value);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const text = value => typeof value==='string' && value.trim().length>0;
const childFields = ['id','card_print_id','finish_key','printing_gv_id','is_provisional','provenance_source','provenance_ref','created_by'];
const reviewFields = ['id','card_printing_id','review_status','public_visibility','active','confidence','reason',
  'evidence_sources_checked','evidence_sources_for_finish','expected_finish_keys','evidence','source_report_path','reviewed_by','reviewed_at'];
const project = (row,fields) => Object.fromEntries(fields.map(field=>[field,row[field]]));

function expectedRows(bundle) {
  const manifest=bundle.manifest, target=bundle.target;
  const child=buildPrintingAdmissionPlan(manifest,[]).inserts.find(row=>row.card_print_id===target.card_print_id&&row.finish_key===target.finish_key);
  assert.ok(child,'warehouse_target_not_in_admission_plan');
  const rawId=`-${BigInt('0x'+hash({version:WAREHOUSE_PRINTING_ADMISSION_VERSION,bundle:bundle.fingerprint}).slice(0,15))}`;
  const ref=`raw_imports:${rawId}|master-index:${manifest.fingerprint}`;
  const provenance={provenance_source:WAREHOUSE_PRINTING_ADMISSION_VERSION,provenance_ref:ref,created_by:WAREHOUSE_PRINTING_ADMISSION_VERSION};
  const admitted={...project(child,['id','card_print_id','finish_key','printing_gv_id']),is_provisional:false,...provenance};
  const review={id:uuid({version:WAREHOUSE_PRINTING_ADMISSION_VERSION,child:child.id,bundle:bundle.fingerprint}),
    card_printing_id:child.id,review_status:'verified',public_visibility:'visible',active:true,confidence:'high',
    reason:'Exact printing supported by the reviewed Master Index; admission does not assert whole-set readiness.',
    evidence_sources_checked:manifest.authority.source_artifacts.map(source=>source.url_or_identifier),
    evidence_sources_for_finish:manifest.printings.find(row=>row.card_print_id===target.card_print_id&&row.finish_key===target.finish_key).evidence.map(e=>e.source_ref),
    expected_finish_keys:manifest.printings.filter(row=>row.card_print_id===target.card_print_id).map(row=>row.finish_key).sort(),
    evidence:{manifest_fingerprint:manifest.fingerprint,master_index_sha256:manifest.master_index_sha256,
      review_sha256:manifest.authority.review.sha256,card_print_id:target.card_print_id,finish_key:target.finish_key,
      raw_import_id:rawId,warehouse_authority_fingerprint:bundle.fingerprint},
    source_report_path:ref,reviewed_by:WAREHOUSE_PRINTING_ADMISSION_VERSION,
    reviewed_at:new Date(JSON.parse(Buffer.from(bundle.artifacts.find(row=>row.ref===manifest.authority.review.ref).base64,'base64')).reviewed_at).toISOString()};
  const raw={id:rawId,source:WAREHOUSE_PRINTING_ADMISSION_VERSION,status:'processed',
    notes:'Exact warehouse printing evidence; no parent, existing printing, image, ownership or pricing mutation.',payload:bundle};
  return {child:admitted,review,raw};
}

export async function readWarehousePrintingParent(client,parentId,{lock=false}={}) {
  const result=await client.query(`select to_jsonb(p) parent, g.code game, s.code canonical_set_code, s.game set_game
    from public.card_prints p join public.sets s on s.id=p.set_id join public.games g on g.id=p.game_id
    where p.id=$1 ${lock?'for update of p for share of s,g':''}`,[parentId]);
  assert.equal(result.rows.length,1,'warehouse_exact_parent_required');
  const row=result.rows[0],parent=row.parent;
  assert.equal(parent.set_code,row.canonical_set_code,'warehouse_parent_set_code_drift');
  assert.equal(row.game,row.set_game,'warehouse_parent_set_game_drift');
  const language=languageByDomain[parent.identity_domain];
  assert.ok(language,'warehouse_parent_language_unresolved');
  return {...parent,game:row.game,language,printed_coordinate:parent.number};
}

export async function prepareWarehousePrintingAdmission(client,bundle,target,{lock=false}={}) {
  assert.ok(bundle,'warehouse_printing_authority_required');
  const parent=await readWarehousePrintingParent(client,target.card_print_id,{lock});
  const authority=assertWarehousePrintingAuthority(bundle,{target,parent});
  const expected=expectedRows(bundle);
  const rows=async(sql,args)=>(await client.query(sql,args)).rows.map(row=>row.row);
  const siblings=await rows(`select to_jsonb(p) row from public.card_printings p
    where card_print_id=$1 or id=$2 or printing_gv_id=$3 order by id ${lock?'for update':''}`,
  [target.card_print_id,expected.child.id,target.printing_gv_id]);
  assert.ok(siblings.every(row=>row.card_print_id===target.card_print_id),'warehouse_printing_identity_collision');
  const existing=siblings.filter(row=>row.finish_key===target.finish_key);
  assert.ok(existing.length<=1,'warehouse_duplicate_printing');
  assert.ok(siblings.every(row=>row.finish_key===target.finish_key||
    (row.id!==expected.child.id&&row.printing_gv_id!==target.printing_gv_id)),'warehouse_printing_identity_collision');
  for (const fact of [...bundle.manifest.authority.forbidden_facts,...bundle.manifest.suppressed_printing_facts]) {
    assert.ok(!siblings.some(row=>row.card_print_id===fact.card_print_id&&row.finish_key===fact.finish_key),'warehouse_forbidden_printing_present');
  }
  const childIds=[...new Set([...siblings.map(row=>row.id),expected.child.id])];
  const reviews=await rows(`select to_jsonb(r) row from public.card_printing_truth_reviews r
    where card_printing_id=any($1::uuid[]) or id=$2 order by id ${lock?'for update':''}`,[childIds,expected.review.id]);
  const raw=await rows(`select (to_jsonb(r)-'id')||jsonb_build_object('id',r.id::text) row
    from public.raw_imports r where id=$1::bigint ${lock?'for update':''}`,[expected.raw.id]);
  const finishes=(await client.query('select key from public.finish_keys where key=$1 and is_active',[target.finish_key])).rows;
  assert.equal(finishes.length,1,'warehouse_finish_inactive');
  if (existing.length) {
    const child=existing[0];
    assert.equal(child.printing_gv_id,target.printing_gv_id,'warehouse_existing_gvid_requires_repair');
    assert.equal(child.is_provisional,false,'warehouse_existing_provisional_requires_review');
    assert.ok(text(child.provenance_source)&&text(child.provenance_ref),'warehouse_existing_provenance_requires_repair');
    const history=reviews.filter(row=>row.card_printing_id===child.id);
    assert.ok(history.every(row=>row.review_status==='verified'),'warehouse_adverse_review_requires_adjudication');
    const active=history.filter(row=>row.active);
    assert.equal(active.length,1,'warehouse_verified_review_required');
    const review=active[0];assert.equal(review.public_visibility,'visible','warehouse_hidden_review');
    for (const field of ['manifest_fingerprint','master_index_sha256','review_sha256','card_print_id','finish_key']) {
      assert.equal(review.evidence?.[field],expected.review.evidence[field],`warehouse_review_binding_mismatch:${field}`);
    }
    // If this package's deterministic receipts exist, they must be exact. Another
    // reviewed producer may own the retained child, but partial receipts cannot pass.
    const ourReview=reviews.filter(row=>row.id===expected.review.id);
    if (raw.length||ourReview.length) {
      assert.equal(child.id,expected.child.id,'warehouse_partial_receipt');
      assert.deepEqual(project(child,childFields),expected.child,'warehouse_partial_receipt');
      for (const field of ['image_source','image_path','image_url','image_alt_url','image_status','image_note']) {
        assert.equal(child[field],null,`warehouse_unexpected_image_write:${field}`);
      }
      assert.equal(raw.length,1,'warehouse_partial_receipt');assert.equal(ourReview.length,1,'warehouse_partial_receipt');
      assert.deepEqual(project(raw[0],['id','source','status','notes','payload']),expected.raw,'warehouse_raw_collision');
      assert.deepEqual({...project(ourReview[0],reviewFields),reviewed_at:new Date(ourReview[0].reviewed_at).toISOString()},expected.review,'warehouse_review_collision');
    }
  } else {
    assert.equal(raw.length,0,'warehouse_raw_partial_state');
    assert.ok(!reviews.some(row=>row.card_printing_id===expected.child.id||row.id===expected.review.id),'warehouse_review_collision');
  }
  const schema=await readExecutionSchema(client);
  assert.equal(schema.rules.length,0,'warehouse_unreviewed_rewrite_rule');
  assert.ok(schema.triggers.every(t=>t.table==='card_printing_truth_reviews'&&t.name==='trg_card_printing_truth_reviews_updated_at_v1'&&/BEFORE UPDATE/.test(t.definition)),
    'warehouse_unreviewed_trigger');
  const footprints=[];
  for (const [table,column,ids] of [['vault_item_instances','card_print_id',[target.card_print_id]],
    ['binder_custom_slots','card_printing_id',childIds],['vault_item_instance_dispositions','card_print_id',[target.card_print_id]],
    ['external_mappings','card_print_id',[target.card_print_id]],['external_printing_mappings','card_printing_id',childIds]]) {
    const receipt=(await client.query(`select count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by t.id),'')) digest
      from public.${table} t where ${column}=any($1::uuid[])`,[ids])).rows[0];
    footprints.push({table,...receipt});
  }
  return {bundle,target,expected,existing:existing[0]??null,parent,siblings,reviews,raw,footprints,
    schema_fingerprint:hash(schema),authority_fingerprint:authority.authority_fingerprint};
}

export async function applyWarehousePrintingAdmission(client,prepared) {
  const isolation=(await client.query("select current_setting('transaction_isolation') isolation, current_setting('transaction_read_only') read_only")).rows[0];
  assert.equal(isolation.isolation,'serializable','warehouse_serializable_transaction_required');
  assert.equal(isolation.read_only,'off','warehouse_write_transaction_required');
  const before=await prepareWarehousePrintingAdmission(client,prepared.bundle,prepared.target,{lock:true});
  assert.deepEqual(before,prepared,'warehouse_plan_drift');
  if (!before.existing) {
    const {raw,child,review}=before.expected;
    assert.equal((await client.query('insert into public.raw_imports(id,source,status,notes,payload) values($1::bigint,$2,$3,$4,$5::jsonb)',
      [raw.id,raw.source,raw.status,raw.notes,JSON.stringify(raw.payload)])).rowCount,1);
    for (const [table,fields,row] of [['card_printings',childFields,child],['card_printing_truth_reviews',reviewFields,review]]) {
      assert.equal((await client.query(`insert into public.${table}(${fields.join(',')}) select ${fields.join(',')}
        from jsonb_populate_record(null::public.${table},$1::jsonb)`,[JSON.stringify(row)])).rowCount,1);
    }
  }
  const after=await prepareWarehousePrintingAdmission(client,prepared.bundle,prepared.target,{lock:true});
  assert.deepEqual(after.parent,before.parent,'warehouse_parent_changed');
  assert.deepEqual(after.footprints,before.footprints,'warehouse_dependencies_changed');
  assert.equal(after.schema_fingerprint,before.schema_fingerprint,'warehouse_schema_drift');
  const oldIds=new Set(before.siblings.map(row=>row.id));
  assert.deepEqual(after.siblings.filter(row=>oldIds.has(row.id)),before.siblings,'warehouse_existing_printings_changed');
  const oldReviewIds=new Set(before.reviews.map(row=>row.id));
  assert.deepEqual(after.reviews.filter(row=>oldReviewIds.has(row.id)),before.reviews,'warehouse_existing_reviews_changed');
  assert.equal(after.siblings.length,before.siblings.length+(before.existing?0:1));
  assert.equal(after.reviews.length,before.reviews.length+(before.existing?0:1));
  const options=(await client.query('select id,card_print_id,finish_key,printing_gv_id,finish_is_active from public.get_public_card_printing_options_v1($1::uuid[],1000,0)',[[prepared.target.card_print_id]])).rows;
  assert.deepEqual(options.filter(row=>row.id===after.existing.id),[{id:after.existing.id,
    card_print_id:prepared.target.card_print_id,finish_key:prepared.target.finish_key,printing_gv_id:prepared.target.printing_gv_id,finish_is_active:true}],
  'warehouse_public_option_mismatch');
  return {id:after.existing.id,created:!before.existing,after};
}

export async function verifyWarehousePrintingAdmissionReadback(client,bundle,target,beforeFingerprint) {
  assert.match(beforeFingerprint ?? '',/^[a-f0-9]{64}$/,'warehouse_frozen_preflight_required');
  const after=await prepareWarehousePrintingAdmission(client,bundle,target);
  assert.ok(after.existing,'warehouse_committed_printing_missing');
  if (hash(after)!==beforeFingerprint) {
    // Reconstruct only this additive transaction's before state; never rebaseline
    // unrelated rows or footprints merely because a later read is self-consistent.
    assert.equal(after.existing.id,after.expected.child.id,'warehouse_committed_identity_drift');
    assert.equal(after.raw.length,1,'warehouse_committed_receipt_missing');
    assert.ok(after.reviews.some(row=>row.id===after.expected.review.id),'warehouse_committed_review_missing');
    const before={...after,existing:null,raw:[],
      siblings:after.siblings.filter(row=>row.id!==after.expected.child.id),
      reviews:after.reviews.filter(row=>row.id!==after.expected.review.id)};
    assert.equal(hash(before),beforeFingerprint,'warehouse_frozen_preflight_drift');
  }
  const options=(await client.query('select id,card_print_id,finish_key,printing_gv_id,finish_is_active from public.get_public_card_printing_options_v1($1::uuid[],1000,0)',[[target.card_print_id]])).rows;
  assert.deepEqual(options.filter(row=>row.id===after.existing.id),[{id:after.existing.id,card_print_id:target.card_print_id,
    finish_key:target.finish_key,printing_gv_id:target.printing_gv_id,finish_is_active:true}],'warehouse_public_option_mismatch');
  return {printing_id:after.existing.id,exact_readback:true,dependencies_preserved:true,authority_fingerprint:bundle.fingerprint};
}
