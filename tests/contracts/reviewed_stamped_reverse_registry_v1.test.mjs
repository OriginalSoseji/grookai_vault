import test from 'node:test';
import assert from 'node:assert/strict';
import {REVIEWED_STAMPED_REVERSE_REGISTRY_V1 as registry,
  REVIEWED_STAMPED_REVERSE_PRODUCT_IDS_V1 as productIds,
  reviewedStampedReverseMappingMetadataV1 as metadata} from '../../backend/pricing/reviewed_stamped_reverse_registry_v1.mjs';
const targets=registry.targets;
const identity=t=>({id:t.retained_projection.identity_id,card_print_id:t.parent.id,
  is_active:true,identity_domain:t.parent.identity_domain});

test('physical review scope exceeds product scope without inventing a Europe Staff product',()=>{
  assert.equal(targets.length,54);assert.equal(productIds.length,53);
  assert.equal(new Set(productIds).size,53);
  const unmapped=targets.filter(t=>!t.source_product);assert.equal(unmapped.length,1);
  assert.equal(unmapped[0].parent.gv_id,'GV-PK-SUM-135-EUROPE-CHAMPIONSHIPS-84A0874');
  assert.throws(()=>metadata(unmapped[0],identity(unmapped[0])));
  assert.equal(new Set(targets.map(t=>t.review.id)).size,54);
  assert.equal(new Set(targets.map(t=>t.physical_raw_id)).size,23);
});

test('only the two reviewed wrong ordinary product links are correction candidates',()=>{
  assert.deepEqual(targets.filter(t=>t.expected_wrong_product_id).map(t=>[t.parent.gv_id,
    t.expected_wrong_product_id,t.source_product.product_id]).sort(),[
    ['GV-PK-XY11-104-STAFF-STAMP','121228',174494],
    ['GV-PK-XY8-101-LEAGUE-STAMP','107220',153305],
  ].sort());
});

test('mapping metadata binds exact physical child, review, Master and active identity',()=>{
  for(const t of targets.filter(t=>t.source_product)){
    const m=metadata(t,identity(t));assert.equal(m.approved_printing_id,t.printing.id);
    assert.equal(m.approved_review_id,t.review.id);assert.equal(m.approved_finish_key,'reverse');
    assert.equal(m.printing_evidence_raw_id,t.physical_raw_id);
    assert.equal(m.printing_manifest_fingerprint,t.manifest_fingerprint);
    assert.equal(m.source_product_id,t.source_product.product_id);
    for(const patch of[{is_active:false},{card_print_id:'00000000-0000-4000-a000-000000000902'},
      {identity_domain:'pokemon_jpn_standard'},{id:'invalid'}])
      assert.throws(()=>metadata(t,{...identity(t),...patch}));
    const changed=structuredClone(t);changed.printing.finish_key='normal';
    assert.throws(()=>metadata(changed,identity(t)));
  }
});

test('provider title discrepancy and absent images remain explicit; no quote is fabricated',()=>{
  const pichu=targets.find(t=>t.source_product?.product_id===188126);
  assert.equal(pichu.source_product.number,'045/100');
  assert.equal(metadata(pichu,identity(pichu)).source_title_coordinate_disagreement.physical_front_literal,'45/100');
  assert.deepEqual(targets.filter(t=>t.source_product&&!t.source_product.primary_image)
    .map(t=>t.source_product.product_id).sort((a,b)=>a-b),[180461,233306]);
  const friends=targets.find(t=>t.source_product?.product_id===557102);assert.ok(friends);
  assert.ok(!('market_price' in metadata(friends,identity(friends))));
  assert.equal(registry.canonical_or_price_execution_authority,false);
  assert.throws(()=>{friends.source_product.product_id=557103;});
});
