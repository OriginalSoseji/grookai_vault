import test from 'node:test';
import assert from 'node:assert/strict';
import {loadReviewedStampedReverseAuthorityV1,assertReviewedStampedReverseAuthorityV1,
  assertReviewedStampedReverseTargetV1} from '../../backend/warehouse/reviewed_stamped_reverse_authority_v1.mjs';
const source=loadReviewedStampedReverseAuthorityV1();
const clone=()=>({index:structuredClone(source.index),manifests:structuredClone(source.manifests),
  artifactsBySet:new Map([...source.artifactsBySet].map(([code,artifacts])=>
    [code,new Map([...artifacts].map(([ref,bytes])=>[ref,Buffer.from(bytes)]))]))});
const live=t=>({parent:{...t.parent,game:'pokemon',language:'en',set_code:t.set_code},
  printing:{...t.printing,is_provisional:false,provenance_source:'retained_original_producer',provenance_ref:'retained:original'}});

test('all54 existing identities bind23 reviewed Master scopes and original physical bytes',()=>{
  assert.equal(source.index.targets.length,54);assert.equal(source.manifests.size,23);
  for(const target of source.index.targets)assert.equal(assertReviewedStampedReverseTargetV1({authority:source,...live(target)}),target);
  assert.equal(source.production_execution_authority,false);
});
test('one changed front byte fails without changing repository evidence',()=>{
  const changed=clone(),code=changed.index.targets[0].set_code,artifacts=changed.artifactsBySet.get(code);
  const ref=[...artifacts.keys()].find(k=>k.startsWith('stamped-front-')),b=Buffer.from(artifacts.get(ref));b[0]^=1;artifacts.set(ref,b);
  assert.throws(()=>assertReviewedStampedReverseAuthorityV1(changed),/artifact_hash_mismatch|front_changed/);
});
test('wrong parent, child, finish, issued version, public identity and provisional state all reject',()=>{
  const target=source.index.targets[0];
  for(const [side,key,value]of [['parent','id','00000000-0000-4000-a000-000000000001'],['parent','variant_key','ordinary_base'],
    ['parent','printed_identity_modifier','different_stamp'],['parent','printed_coordinate','different_number'],
    ['printing','finish_key','normal'],['printing','printing_gv_id','wrong-public-id'],['printing','is_provisional',true]]){
    const pair=live(target);pair[side][key]=value;assert.throws(()=>assertReviewedStampedReverseTargetV1({authority:source,...pair}));
  }
});
test('unknown targets and blank original provenance cannot be grandfathered',()=>{
  const unknown=live(source.index.targets[0]);unknown.printing.id='00000000-0000-4000-a000-000000000002';
  assert.throws(()=>assertReviewedStampedReverseTargetV1({authority:source,...unknown}),/outside_scope/);
  const blank=live(source.index.targets[0]);blank.printing.provenance_ref='';
  assert.throws(()=>assertReviewedStampedReverseTargetV1({authority:source,...blank}));
});
test('source decisions, extra/missing evidence and scope counts remain bound',()=>{
  const count=clone();count.index.existing_positive_reverse_facts=55;assert.throws(()=>assertReviewedStampedReverseAuthorityV1(count));
  const missing=clone();missing.artifactsBySet.get(missing.index.targets[0].set_code).delete('stamped-front-'+missing.index.targets[0].printing.id);
  assert.throws(()=>assertReviewedStampedReverseAuthorityV1(missing));
  const extra=clone();extra.artifactsBySet.get(extra.index.targets[0].set_code).set('unreviewed',Buffer.from('extra'));
  assert.throws(()=>assertReviewedStampedReverseAuthorityV1(extra),/extra_or_missing_artifact/);
});
test('the independent Cinderace photo retains its actual capture time and source correction',()=>{
  const t=source.index.targets.find(t=>t.parent.gv_id==='GV-PK-SWSH1-34-LEAGUE-STAMP');
  assert.equal(t.observation.source_retrieved_at,'2026-11-25T03:52:06.925Z');
  assert.equal(source.index.source_provenance_corrections.length,1);
  assert.equal(t.card_front_sha256,'b5dc83d9b2091a986a6ec916b64641ee7abe305e76ff0ec381bdd7d227620e4f');
});
