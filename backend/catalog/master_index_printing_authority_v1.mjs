import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertPrintingManifest, printingManifestHash} from './printing_completeness_gate_v1.mjs';
import {assertMe04FinishTruthV1} from '../../scripts/audits/me04_finish_truth_v1.mjs';

export const MASTER_PRINTING_AUTHORITY_VERSION = 'MASTER_INDEX_PRINTING_AUTHORITY_V1';
export const RECONCILIATION_VERSION = 'MASTER_INDEX_PRINTING_RECONCILIATION_V1';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const tuple = row => `${row.card_print_id}|${row.finish_key}`;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const evidenceKinds = new Set(['checked_checklist', 'official_printing', 'image_confirmed', 'exact_printing_mapping']);

// Policies isolate identity domains. They do not infer or authorize a finish.
export const MASTER_PRINTING_POLICIES = Object.freeze({
  POKEMON_EN_PHYSICAL_V1: {games:['pokemon'], language:'en', domains:['pokemon_eng_standard','pokemon']},
  POKEMON_JA_PHYSICAL_V1: {games:['pokemon','pokemon_jpn'], language:'ja', domains:['pokemon_jpn']},
  MTG_EN_PAPER_V1: {games:['mtg'], language:'en', domains:['mtg_eng_paper_print']},
  ONE_PIECE_EN_V1: {games:['one_piece'], language:'en', domains:['one_piece_eng_print']},
});

function unique(rows, key, message) {
  assert.equal(new Set(rows.map(key)).size, rows.length, message);
}

export function assertMasterPrintingAuthority(manifest, artifacts) {
  assertPrintingManifest(manifest);
  const authority = manifest.authority;
  assert.equal(authority?.version, MASTER_PRINTING_AUTHORITY_VERSION, 'master_authority_required');
  assert.equal(authority.status, 'verified_scope', 'master_scope_not_verified');
  assert.match(authority.set_id, uuid, 'exact_set_id_required');
  const policy = MASTER_PRINTING_POLICIES[manifest.identity_policy_version];
  assert.ok(policy && policy.games.includes(manifest.game) && policy.language === manifest.language, 'unknown_or_cross_domain_policy');
  assert.ok(Array.isArray(authority.source_artifacts) && authority.source_artifacts.length, 'source_artifacts_required');
  unique(authority.source_artifacts, s => s.ref, 'duplicate_source_ref');
  const sources = new Map(authority.source_artifacts.map(s => [s.ref,s]));
  assert.ok(artifacts instanceof Map, 'artifact_bytes_required');
  const checkArtifact = (ref, hash) => {
    assert.ok(nonempty(ref) && /^[a-f0-9]{64}$/.test(hash), 'invalid_artifact_binding');
    assert.ok(artifacts.has(ref), `artifact_not_loaded:${ref}`);
    assert.equal(sha256(artifacts.get(ref)), hash, `artifact_hash_mismatch:${ref}`);
  };
  checkArtifact(manifest.master_index_ref, manifest.master_index_sha256);
  for (const source of sources.values()) {
    assert.ok(evidenceKinds.has(source.kind), 'non_authoritative_source_kind');
    assert.ok(nonempty(source.url_or_identifier) && Number.isFinite(Date.parse(source.retrieved_at)), 'source_provenance_required');
    checkArtifact(source.ref, source.sha256);
  }
  const review = authority.review;
  assert.ok(review && nonempty(review.ref), 'review_record_required');
  checkArtifact(review.ref, review.sha256);
  const admission = JSON.parse(String(artifacts.get(review.ref)));
  assert.equal(admission.status, 'verified_scope', 'review_not_verified');
  assert.equal(admission.master_index_sha256, manifest.master_index_sha256, 'review_master_binding_mismatch');
  assert.equal(admission.game, manifest.game);
  assert.equal(admission.language, manifest.language);
  assert.equal(admission.set_code, manifest.set_code);
  assert.equal(admission.scope, manifest.scope);
  assert.ok(nonempty(admission.reviewer) && Number.isFinite(Date.parse(admission.reviewed_at)), 'review_attribution_required');
  // The reviewed projection binds all identity, exception and source decisions,
  // not merely the name of a master file that might describe a different scope.
  const projection = {...manifest};
  delete projection.fingerprint;
  projection.authority = {...authority};
  delete projection.authority.review;
  assert.equal(admission.projection_sha256, printingManifestHash(projection), 'review_projection_mismatch');
  for (const parent of manifest.parents) {
    assert.match(parent.id, uuid);
    assert.equal(parent.set_id, authority.set_id, 'parent_set_mismatch');
    assert.ok(policy.domains.includes(parent.identity_domain), 'parent_domain_mismatch');
    assert.ok(Object.hasOwn(parent, 'variant_key') && Object.hasOwn(parent, 'printed_identity_modifier'), 'parent_variant_dimensions_required');
  }
  for (const printing of manifest.printings) for (const evidence of printing.evidence) {
    const source = sources.get(evidence.source_ref);
    assert.ok(source && source.kind === evidence.kind && source.sha256 === evidence.sha256, 'printing_source_not_bound');
  }
  const expected = new Set(manifest.printings.map(tuple));
  for (const name of ['protected_facts','forbidden_facts']) {
    assert.ok(Array.isArray(authority[name]), `${name}_required`);
    unique(authority[name], tuple, `duplicate_${name}`);
    for (const fact of authority[name]) {
      assert.ok(manifest.parents.some(p => p.id === fact.card_print_id) && nonempty(fact.finish_key), `invalid_${name}`);
      assert.equal(expected.has(tuple(fact)), name === 'protected_facts', `${name}_violation`);
    }
  }
  assert.ok(Array.isArray(authority.conflicts) && authority.conflicts.length === 0, 'unresolved_master_conflicts');
  if (manifest.game === 'pokemon' && manifest.language === 'en' && ['me04','me4'].includes(manifest.set_code.toLowerCase())) {
    const parents = new Map(manifest.parents.map(p => [p.id,p]));
    assertMe04FinishTruthV1(manifest.printings.map(p => ({set_key:manifest.set_code,
      card_number:parents.get(p.card_print_id).printed_coordinate,
      card_name:parents.get(p.card_print_id).name,finish_key:p.finish_key})), 'Master authority ME04');
  }
  return manifest;
}

export function reconcileMasterPrintings(manifest, snapshot, {artifacts, asOf, maxAgeHours=24}={}) {
  assertMasterPrintingAuthority(manifest, artifacts);
  assert.equal(snapshot.version, 'MASTER_PRINTING_DB_SNAPSHOT_V1');
  assert.equal(snapshot.project_ref, 'ycdxbpibncqcchqiihfz');
  assert.ok(Number.isFinite(Date.parse(asOf)), 'explicit_as_of_required');
  const age = Date.parse(asOf) - Date.parse(snapshot.observed_at);
  assert.ok(Number.isFinite(maxAgeHours) && maxAgeHours > 0 && Number.isFinite(age) && age >= 0 && age <= maxAgeHours*3600000, 'snapshot_stale_or_future');
  assert.equal(snapshot.set_id, manifest.authority.set_id);
  for (const field of ['game','language','set_code']) assert.equal(snapshot[field],manifest[field],`snapshot_${field}_mismatch`);
  for (const field of ['parents','printings','public_options','global_printing_identities']) {
    assert.ok(Array.isArray(snapshot[field]) && snapshot.coverage?.[field] === true, `incomplete_snapshot:${field}`);
  }
  const {fingerprint,...snapshotBody} = snapshot;
  assert.equal(fingerprint, printingManifestHash(snapshotBody), 'snapshot_fingerprint_mismatch');
  unique(snapshot.parents,p=>p.id,'duplicate_parent_snapshot');
  unique(snapshot.printings,p=>p.id,'duplicate_printing_snapshot');
  unique(snapshot.printings,tuple,'duplicate_printing_tuple');
  unique(snapshot.global_printing_identities,p=>p.id,'duplicate_global_id');
  unique(snapshot.global_printing_identities.filter(p=>p.printing_gv_id),p=>p.printing_gv_id,'duplicate_global_gvid');
  const globalIds = new Map(snapshot.global_printing_identities.map(p=>[p.id,p]));
  for (const p of snapshot.printings) {
    const global = globalIds.get(p.id);
    assert.ok(global && global.card_print_id===p.card_print_id && global.finish_key===p.finish_key && global.printing_gv_id===p.printing_gv_id, 'global_inventory_mismatch');
  }
  const findings=[],proposals=[],retained=[];
  const add = (classification, details) => findings.push({classification,...details});
  const parents = new Map(snapshot.parents.map(p=>[p.id,p]));
  const expectedParents = new Map(manifest.parents.map(p=>[p.id,p]));
  const invalidParents = new Set();
  for (const wanted of manifest.parents) {
    const actual = parents.get(wanted.id);
    const fields=['gv_id','set_id','name','printed_coordinate','identity_domain','variant_key','printed_identity_modifier'];
    if (!actual || fields.some(k=>actual[k]!==wanted[k])) {
      invalidParents.add(wanted.id);
      add(actual?'parent_identity_conflict':'parent_missing',{parent_id:wanted.id,expected:wanted,actual:actual??null});
    }
  }
  for (const actual of snapshot.parents) if (!expectedParents.has(actual.id)) add('parent_outside_master_scope',{parent_id:actual.id});
  const children = new Map(snapshot.printings.map(p=>[tuple(p),p]));
  const expected = new Set(manifest.printings.map(tuple));
  for (const wanted of manifest.printings) {
    if (invalidParents.has(wanted.card_print_id)) continue;
    const actual = children.get(tuple(wanted));
    const collision = snapshot.global_printing_identities.find(p=>p.printing_gv_id===wanted.printing_gv_id && p.id!==actual?.id);
    if (collision) {add('printing_gvid_collision',{expected:wanted,collision});continue;}
    if (!actual) {
      add('expected_printing_missing',{expected:wanted});
      proposals.push({action:'insert_printing_candidate',expected:wanted,requires:['fresh_collision_preflight','bounded_apply_contract','dependency_inventory','rollback_proof']});
      continue;
    }
    if (!actual.printing_gv_id?.trim()) {
      add('printing_gvid_missing',{printing_id:actual.id,expected_gv_id:wanted.printing_gv_id});
      proposals.push({action:'assign_missing_gvid_candidate',printing_id:actual.id,expected_gv_id:wanted.printing_gv_id,
        preserve_printing_id:true,requires:['dependency_inventory','fresh_collision_preflight','compare_and_swap','bounded_apply_contract','rollback_proof']});
    } else if (actual.printing_gv_id!==wanted.printing_gv_id) {
      add('printing_identity_conflict',{printing_id:actual.id,actual_gv_id:actual.printing_gv_id,expected_gv_id:wanted.printing_gv_id});
    } else retained.push({printing_id:actual.id,printing_gv_id:actual.printing_gv_id});
    if (!nonempty(actual.provenance_source)||!nonempty(actual.provenance_ref)) add('provenance_recovery_required',{printing_id:actual.id});
    if (actual.is_provisional!==false || actual.review_status!=='verified' || actual.public_visibility!=='visible' || actual.active!==true) add('truth_review_required',{printing_id:actual.id});
    const options=snapshot.public_options.filter(p=>p.id===actual.id);
    if (options.length!==1 || options[0].card_print_id!==wanted.card_print_id || options[0].finish_key!==wanted.finish_key ||
        options[0].printing_gv_id!==wanted.printing_gv_id || options[0].finish_is_active!==true) add('public_option_mismatch',{printing_id:actual.id});
  }
  const forbidden = new Set([...manifest.authority.forbidden_facts,...manifest.suppressed_printing_facts].map(tuple));
  for (const actual of snapshot.printings) {
    if (forbidden.has(tuple(actual))) add('forbidden_printing_present',{printing_id:actual.id,finish_key:actual.finish_key});
    else if (!expected.has(tuple(actual))) add('unexpected_printing_review_only',{printing_id:actual.id,finish_key:actual.finish_key});
  }
  const actualIds = new Set(snapshot.printings.map(p=>p.id));
  for (const option of snapshot.public_options) if (!actualIds.has(option.id)) add('orphan_public_option',{printing_id:option.id});
  const result={version:RECONCILIATION_VERSION,master_fingerprint:manifest.fingerprint,snapshot_fingerprint:fingerprint,
    status:findings.length?'needs_reconciliation':'printing_ready',collector_ready:false,write_ready:false,
    findings,proposals,retained,unresolved_variants:manifest.unresolved_variants,
    boundaries:{database_writes:0,storage_writes:0,ownership_writes:0,deletes:0,automatic_renames:0}};
  return {...result,fingerprint:printingManifestHash(result)};
}

export function buildCatalogPrintingWorklist(setRows, authorityEntries=[]) {
  unique(setRows,row=>row.id,'duplicate_catalog_set');
  const authorities=new Map();
  for (const {manifest,artifacts} of authorityEntries) {
    assertMasterPrintingAuthority(manifest,artifacts);
    const id=manifest.authority.set_id;
    assert.ok(!authorities.has(id),'duplicate_set_authority');
    const set=setRows.find(row=>row.id===id);
    assert.ok(set && set.game===manifest.game && set.code===manifest.set_code,'authority_catalog_scope_mismatch');
    authorities.set(id,manifest);
  }
  const rows=setRows.map(set=>{
    for(const field of ['parents','no_children','public_missing_gvid','public_wrong_parent_gvid']) {
      assert.ok(Number.isSafeInteger(Number(set[field])) && Number(set[field])>=0,`invalid_inventory_count:${field}`);
    }
    assert.ok(Number(set.no_children)<=Number(set.parents),'invalid_missing_parent_count');
    const authority=authorities.get(set.id);
    const gaps=[];
    if(Number(set.no_children))gaps.push('missing_child_coverage');
    if(Number(set.public_missing_gvid))gaps.push('missing_printing_gvid');
    if(Number(set.public_wrong_parent_gvid))gaps.push('identity_alias_review');
    if(Number(set.public_provisional))gaps.push('provisional_printing_review');
    if(Number(set.public_missing_provenance))gaps.push('provenance_recovery_review');
    return {set_id:set.id,game:set.game,set_code:set.code,set_name:set.name,parents:Number(set.parents),
      master_status:authority?(authority.scope==='complete_set'?'verified_complete_scope':'verified_base_scope'):
        Number(set.parents)?'authority_manifest_required':'discovery_or_empty_scope',
      master_fingerprint:authority?.fingerprint??null,structural_gaps:gaps,
      priority:gaps.includes('missing_printing_gvid')||gaps.includes('identity_alias_review')?1:gaps.length?2:3,
      database_reconciled:false,write_ready:false,
      next_step:authority?'exact_snapshot_reconciliation':Number(set.parents)?'source_adjudication_and_manifest_freeze':'confirm_discovery_scope'};
  }).sort((a,b)=>a.priority-b.priority||a.game.localeCompare(b.game)||a.set_code.localeCompare(b.set_code)||a.set_id.localeCompare(b.set_id));
  const result={version:MASTER_PRINTING_AUTHORITY_VERSION,status:'preparation_only',database_writes:0,
    counts:{sets:rows.length,parents:rows.reduce((n,r)=>n+r.parents,0),
      authority_required:rows.filter(r=>r.master_status==='authority_manifest_required').length,
      verified_scopes:authorities.size,structural_gap_sets:rows.filter(r=>r.structural_gaps.length).length},rows};
  return {...result,fingerprint:printingManifestHash(result)};
}
