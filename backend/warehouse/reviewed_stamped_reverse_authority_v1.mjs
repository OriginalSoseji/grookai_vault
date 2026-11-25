import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {assertMasterPrintingAuthority} from '../catalog/master_index_printing_authority_v1.mjs';

export const REVIEWED_STAMPED_REVERSE_AUTHORITY_V1 = 'REVIEWED_STAMPED_REVERSE_AUTHORITY_V1';
export const REVIEWED_STAMPED_REVERSE_SOURCE_FINGERPRINT_V1 = '42cec699adcae7fff6fdc3cf1e364aebccb5f08d27f6bbeb4a051d7a600ed94f';
const root = fileURLToPath(new URL('../../', import.meta.url));
const scope = 'docs/catalog/reviewed_stamped_reverse_supported_v1';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a,b,reason) => assert.equal(hash(a),hash(b),reason);

function bytes(relative) {
  assert.ok(typeof relative==='string' && relative.startsWith(scope+'/'));
  assert.ok(!relative.includes('..') && !relative.includes('\\'),'reviewed_reverse_source_path');
  const file=path.resolve(root,relative);
  assert.equal(fs.realpathSync(file),file,'reviewed_reverse_source_symlink');
  return fs.readFileSync(file);
}
const json = relative => JSON.parse(bytes(relative));

// Pure validation supports adversarial tests without changing the retained
// evidence files. Mutation callers load the actual checked-in files below.
export function assertReviewedStampedReverseAuthorityV1({index,manifests,artifactsBySet}) {
  const {fingerprint,...body}=index;
  assert.equal(fingerprint,REVIEWED_STAMPED_REVERSE_SOURCE_FINGERPRINT_V1,'reviewed_reverse_index_changed');
  assert.equal(hash(body),fingerprint,'reviewed_reverse_index_bytes_changed');
  assert.equal(index.version,'REVIEWED_STAMPED_REVERSE_SUPPORTED_V1');
  assert.equal(index.production_execution_authority,false);
  assert.equal(index.price_authority,false);
  assert.equal(index.whole_set_completion,false);
  assert.equal(index.existing_positive_reverse_facts,54);
  assert.equal(index.original134_nonpositive_cases,80);
  assert.equal(index.held149_pairs_preserved,true);
  assert.equal(index.targets.length,54);
  for(const get of [t=>t.parent.id,t=>t.parent.gv_id,t=>t.printing.id,t=>t.printing.printing_gv_id])
    assert.equal(new Set(index.targets.map(get)).size,54,'reviewed_reverse_duplicate_identity');
  assert.equal(Object.keys(index.set_counts).length,23);
  same([...manifests.keys()].sort(),Object.keys(index.set_counts).sort(),'reviewed_reverse_set_scope_changed');
  same([...artifactsBySet.keys()].sort(),[...manifests.keys()].sort(),'reviewed_reverse_artifact_scope_changed');
  for(const [code,count]of Object.entries(index.set_counts)) {
    const selected=index.targets.filter(t=>t.set_code===code),manifest=manifests.get(code),artifacts=artifactsBySet.get(code);
    assert.equal(selected.length,count);
    assert.equal(manifest.set_code,code);
    assert.equal(manifest.scope,'verified_parent_families');
    same(manifest.expected,{parents:count,printings:count,finishes:{reverse:count}},'reviewed_reverse_counts_changed');
    same(manifest.parents,selected.map(t=>t.parent),'reviewed_reverse_parent_projection_changed');
    assertMasterPrintingAuthority(manifest,artifacts);
    const expectedRefs=new Set([manifest.master_index_ref,manifest.authority.review.ref]);
    for(const t of selected) {
      assert.equal(t.existing_rows_are_retained_not_new_proposals,true);
      assert.equal(t.printing.card_print_id,t.parent.id);
      assert.equal(t.printing.finish_key,'reverse');
      assert.equal(t.parent.identity_domain,'pokemon_eng_standard');
      const ref='stamped-front-'+t.printing.id,source=manifest.authority.source_artifacts.find(s=>s.ref===ref);
      assert.ok(source,'reviewed_reverse_front_unbound');expectedRefs.add(ref);
      assert.equal(source.kind,'image_confirmed');
      assert.equal(source.evidence_role,'exact_printed_identity_and_individually_reviewed_reverse_surface');
      assert.equal(source.sha256,t.card_front_sha256);
      assert.equal(sha(artifacts.get(ref)),t.card_front_sha256,'reviewed_reverse_front_changed');
      assert.equal(source.retrieved_at,t.observation.source_retrieved_at);
      const fact=manifest.printings.find(p=>p.card_print_id===t.parent.id&&p.finish_key==='reverse');
      assert.ok(fact);assert.equal(fact.printing_gv_id,t.printing.printing_gv_id);
      same(fact.evidence,[{kind:'image_confirmed',source_ref:ref,sha256:t.card_front_sha256,card_print_id:t.parent.id,finish_key:'reverse'}],
        'reviewed_reverse_physical_evidence_changed');
    }
    same([...artifacts.keys()].sort(),[...expectedRefs].sort(),'reviewed_reverse_extra_or_missing_artifact');
  }
  return {index,manifests,artifactsBySet,production_execution_authority:false};
}

export function loadReviewedStampedReverseAuthorityV1() {
  const index=json(scope+'/index.json'),manifests=new Map(),artifactsBySet=new Map();
  // Bound the file inventory before following any value from the index.
  assert.equal(index.fingerprint,REVIEWED_STAMPED_REVERSE_SOURCE_FINGERPRINT_V1);
  const {fingerprint,...body}=index;assert.equal(hash(body),fingerprint);
  for(const code of Object.keys(index.set_counts).sort()) {
    assert.match(code,/^[a-z0-9.]+$/);
    const manifest=json(`${scope}/sets/${code}.manifest.json`),artifacts=new Map();
    for(const ref of [manifest.master_index_ref,manifest.authority.review.ref]) {
      assert.ok(ref.startsWith(`repo:${scope}/sets/`));artifacts.set(ref,bytes(ref.slice(5)));
    }
    for(const source of manifest.authority.source_artifacts) {
      const target=index.targets.find(t=>'stamped-front-'+t.printing.id===source.ref);
      assert.ok(target,'reviewed_reverse_unknown_source');artifacts.set(source.ref,bytes(target.card_front_file));
    }
    manifests.set(code,manifest);artifactsBySet.set(code,artifacts);
  }
  return assertReviewedStampedReverseAuthorityV1({index,manifests,artifactsBySet});
}

export function assertReviewedStampedReverseTargetV1({authority,parent,printing}) {
  assertReviewedStampedReverseAuthorityV1(authority);
  const target=authority.index.targets.find(t=>t.printing.id===printing?.id);
  assert.ok(target,'reviewed_reverse_target_outside_scope');
  for(const [field,value]of Object.entries(target.parent)) {
    assert.ok(Object.hasOwn(parent,field),'reviewed_reverse_parent_field_missing:'+field);
    same(parent[field],value,'reviewed_reverse_parent_changed:'+field);
  }
  for(const [field,value]of Object.entries(target.printing))same(printing[field],value,'reviewed_reverse_printing_changed:'+field);
  assert.equal(parent.game,'pokemon');assert.equal(parent.language,'en');assert.equal(parent.set_code,target.set_code);
  assert.equal(printing.is_provisional,false,'reviewed_reverse_provisional_requires_adjudication');
  assert.ok(typeof printing.provenance_source==='string'&&printing.provenance_source.trim());
  assert.ok(typeof printing.provenance_ref==='string'&&printing.provenance_ref.trim());
  return target;
}
