import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

export const PRINTING_COMPLETENESS_VERSION = 'PRINTING_COMPLETENESS_GATE_V1';
const proofKinds = new Set(['checked_checklist', 'official_printing', 'image_confirmed', 'exact_printing_mapping']);
const text = v => typeof v === 'string' && v.trim().length > 0;
const key = r => `${r.card_print_id}|${r.finish_key}`;
const sorted = values => [...values].sort();
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k,canonical(v[k])]));
  return v;
}
export const printingManifestHash = v => createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');

// Expected GV-IDs come from the reviewed identity adapter, never a global finish guess.
export function assertPrintingManifest(manifest, scope) {
  assert.ok(manifest, 'printing_manifest_required');
  const {fingerprint,...body} = manifest;
  assert.equal(fingerprint, printingManifestHash(body), 'printing_manifest_fingerprint_mismatch');
  assert.equal(manifest.version, PRINTING_COMPLETENESS_VERSION);
  for (const field of ['game','language','set_code']) {
    assert.ok(text(manifest[field]), `missing_${field}`);
    if (scope) assert.equal(manifest[field], scope[field], `printing_manifest_${field}_mismatch`);
  }
  assert.ok(['base_release','complete_set'].includes(manifest.scope));
  assert.ok(text(manifest.identity_policy_version));
  assert.ok(text(manifest.master_index_ref));
  assert.match(manifest.master_index_sha256,/^[a-f0-9]{64}$/);
  assert.ok(Array.isArray(manifest.parents) && manifest.parents.length > 0);
  assert.ok(Array.isArray(manifest.printings) && manifest.printings.length > 0);
  assert.ok(Array.isArray(manifest.unresolved_variants));
  assert.ok(Array.isArray(manifest.suppressed_printing_facts));
  const parents = new Map(manifest.parents.map(p => [p.id,p]));
  assert.equal(parents.size,manifest.parents.length,'duplicate_parent');
  assert.equal(new Set(manifest.parents.map(p=>p.gv_id)).size,parents.size,'duplicate_parent_gvid');
  for (const p of parents.values()) {
    assert.ok(text(p.id) && text(p.gv_id) && text(p.printed_coordinate) && text(p.name),'incomplete_parent_identity');
  }
  assert.equal(new Set(manifest.printings.map(key)).size,manifest.printings.length,'duplicate_printing');
  assert.equal(new Set(manifest.printings.map(p=>p.printing_gv_id)).size,manifest.printings.length,'duplicate_printing_gvid');
  const counts = {};
  for (const p of manifest.printings) {
    const parent = parents.get(p.card_print_id);
    assert.ok(parent,'orphan_printing');
    assert.ok(text(p.finish_key) && text(p.printing_gv_id));
    assert.ok(p.printing_gv_id.startsWith(`${parent.gv_id}-`),'wrong_parent_gvid');
    assert.equal(p.review_status,'verified');
    assert.ok(Array.isArray(p.evidence) && p.evidence.length > 0,'missing_printing_evidence');
    for (const e of p.evidence) {
      assert.ok(proofKinds.has(e.kind),'price_or_unreviewed_evidence');
      assert.ok(text(e.source_ref),'missing_source_reference');
      assert.match(e.sha256,/^[a-f0-9]{64}$/);
      assert.equal(e.card_print_id,p.card_print_id,'evidence_parent_mismatch');
      assert.equal(e.finish_key,p.finish_key,'evidence_finish_mismatch');
    }
    assert.ok(!manifest.suppressed_printing_facts.some(s=>key(s)===key(p)),'suppressed_printing_in_plan');
    counts[p.finish_key]=(counts[p.finish_key]??0)+1;
  }
  assert.deepEqual(sorted(manifest.printings.map(p=>p.card_print_id).filter((v,i,a)=>a.indexOf(v)===i)),sorted(parents.keys()),'parent_without_verified_printing');
  assert.deepEqual(manifest.expected,{parents:parents.size,printings:manifest.printings.length,finishes:counts},'printing_count_mismatch');
  const reviewKeys=new Set();
  for (const lead of manifest.unresolved_variants) {
    assert.ok(text(lead.key)&&!reviewKeys.has(lead.key),'duplicate_or_missing_review_key');reviewKeys.add(lead.key);
    assert.ok(parents.has(lead.card_print_id)&&text(lead.source_ref)&&text(lead.reason),'untracked_variant');
    assert.equal(lead.status,'needs_review');
    assert.equal(lead.scope,'outside_base_release','unresolved_in_scope_variant');
    assert.equal(manifest.scope,'base_release','complete_set_has_unresolved_variants');
  }
  return manifest;
}

export function evaluatePrintingReadback(manifest, {parents=[], printings=[], public_options=[]}={}) {
  assertPrintingManifest(manifest);
  const issues=[];
  const expectedParents=new Map(manifest.parents.map(p=>[p.id,p]));
  if (parents.length!==expectedParents.size || new Set(parents.map(p=>p.id)).size!==parents.length ||
      parents.some(p=>{
        const expected=expectedParents.get(p.id);
        return !expected || Object.entries(expected).some(([field,value])=>
          !Object.hasOwn(p,field) || !isDeepStrictEqual(p[field],value));
      })) issues.push('parent_readback_mismatch');
  const byKey=new Map();
  for (const p of printings) {
    if(byKey.has(key(p)))issues.push('duplicate_printing_readback');
    byKey.set(key(p),p);
  }
  const requiredIds=[];
  for (const wanted of manifest.printings) {
    const actual=byKey.get(key(wanted));
    if(!actual){issues.push(`missing_printing:${key(wanted)}`);continue;}
    requiredIds.push(actual.id);
    if(!text(actual.id)||actual.printing_gv_id!==wanted.printing_gv_id)issues.push(`printing_gvid_mismatch:${key(wanted)}`);
    if(actual.is_provisional!==false || actual.review_status!=='verified' || actual.public_visibility!=='visible' ||
       actual.active!==true || !text(actual.provenance_source) || !text(actual.provenance_ref))issues.push(`printing_not_verified:${key(wanted)}`);
    const option=public_options.filter(o=>o.id===actual.id);
    if(option.length!==1 || option[0].card_print_id!==wanted.card_print_id || option[0].finish_key!==wanted.finish_key ||
       option[0].printing_gv_id!==wanted.printing_gv_id || option[0].finish_is_active!==true)issues.push(`public_option_mismatch:${key(wanted)}`);
  }
  // Readback is bound to this manifest's scope; callers must not hide unexpected rows.
  if(printings.length!==manifest.printings.length || public_options.length!==manifest.printings.length ||
     new Set(requiredIds).size!==manifest.printings.length)issues.push('printing_readback_count_mismatch');
  return {version:PRINTING_COMPLETENESS_VERSION,manifest_fingerprint:manifest.fingerprint,
    status:issues.length?'blocked':'printing_ready',collector_ready:false,
    issues:[...new Set(issues)],unresolved_variants:manifest.unresolved_variants,
    next_gate:issues.length?'repair_printing_evidence_or_readback':'vault_add_and_client_smoke'};
}

export function assessLivePrintingCoverage(coverage, parentCount) {
  if(!coverage)return ['printing_coverage_not_checked'];
  const fields=['parents_checked','parents_without_printing','missing_printing_gvid','wrong_parent_gvid','provisional_printings','unproven_printings'];
  if(fields.some(k=>!Number.isSafeInteger(coverage[k])||coverage[k]<0)||coverage.parents_checked!==parentCount)return ['printing_coverage_readback_mismatch'];
  return fields.slice(1).filter(k=>coverage[k]>0).map(k=>`printing_gap:${k}:${coverage[k]}`);
}

export function buildPrintingAdmissionPlan(manifest, existingPrintings=[]) {
  assertPrintingManifest(manifest);
  assert.equal(new Set(existingPrintings.map(key)).size,existingPrintings.length,'duplicate_existing_printing');
  const existing=new Map(existingPrintings.map(p=>[key(p),p]));
  const inserts=[], retained=[];
  for(const wanted of manifest.printings) {
    const row=existing.get(key(wanted));
    if(row) {
      assert.equal(row.printing_gv_id,wanted.printing_gv_id,'existing_printing_gvid_conflict');
      assert.ok(text(row.id));
      retained.push({...wanted,id:row.id});
      continue;
    }
    assert.ok(!existingPrintings.some(p=>p.printing_gv_id===wanted.printing_gv_id),'printing_gvid_collision');
    const h=printingManifestHash({version:PRINTING_COMPLETENESS_VERSION,identity:key(wanted)});
    const id=`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
    assert.ok(!existingPrintings.some(p=>p.id===id),'printing_id_collision');
    inserts.push({id,card_print_id:wanted.card_print_id,finish_key:wanted.finish_key,
      printing_gv_id:wanted.printing_gv_id,is_provisional:false,
      provenance_source:PRINTING_COMPLETENESS_VERSION,provenance_ref:`manifest:${manifest.fingerprint}`,
      required_truth_review:{review_status:'verified',public_visibility:'visible',active:true,evidence:wanted.evidence}});
  }
  const plan={version:PRINTING_COMPLETENESS_VERSION,manifest_fingerprint:manifest.fingerprint,
    status:'prepared_requires_bounded_apply',inserts,retained,unresolved_variants:manifest.unresolved_variants,
    boundaries:{database_writes:0,updates:0,deletes:0,pricing_writes:0,ownership_writes:0}};
  return {...plan,fingerprint:printingManifestHash(plan)};
}

// SQL is read-only and shared by scheduled health and the ingestion readback.
export const PRINTING_COVERAGE_SQL = `
select c.set_id, count(*)::int parents_checked,
 count(*) filter(where p.usable=0)::int parents_without_printing,
 coalesce(sum(p.missing_gvid),0)::int missing_printing_gvid,
 coalesce(sum(p.wrong_gvid),0)::int wrong_parent_gvid,
 coalesce(sum(p.provisional),0)::int provisional_printings,
 coalesce(sum(p.unproven),0)::int unproven_printings
from public.card_prints c
cross join lateral (
 select count(*) filter(where not p.is_provisional and f.is_active and
   nullif(p.printing_gv_id,'') is not null and
   left(p.printing_gv_id,length(c.gv_id)+1)=c.gv_id||'-' and
   nullif(p.provenance_source,'') is not null and nullif(p.provenance_ref,'') is not null and
   not exists(select 1 from public.card_printing_truth_reviews r where r.card_printing_id=p.id and r.active
     and (r.review_status<>'verified' or r.public_visibility<>'visible'))) usable,
 count(*) filter(where nullif(p.printing_gv_id,'') is null) missing_gvid,
 count(*) filter(where nullif(p.printing_gv_id,'') is not null and
   left(p.printing_gv_id,length(c.gv_id)+1)<>c.gv_id||'-') wrong_gvid,
 count(*) filter(where p.is_provisional) provisional,
 count(*) filter(where nullif(p.provenance_source,'') is null or nullif(p.provenance_ref,'') is null) unproven
 from public.card_printings p left join public.finish_keys f on f.key=p.finish_key where p.card_print_id=c.id
) p
where c.set_id=any($1::uuid[])
group by c.set_id order by c.set_id`;
