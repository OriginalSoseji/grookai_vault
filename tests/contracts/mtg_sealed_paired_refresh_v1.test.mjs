import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMtgSealedRefreshV1 as build} from '../../backend/pricing/mtg_sealed_paired_refresh_v1.mjs';
import {deterministicUuidV5 as uuid} from '../../backend/pricing/one_piece_canonical_import_staging_v1.mjs';
function fixture(){
  const sha='d'.repeat(64),object={id:uuid('object'),game_key:'mtg',storage_bucket:'user-card-images',
    object_path:`sealed/mtg/sha256/dd/${sha}.jpg`,content_sha256:sha,storage_readback_sha256:sha,
    image_mime:'image/jpeg',image_width:500,image_height:500,image_bytes:5000,object_fingerprint:'e'.repeat(64)};
  const baseline=Array.from({length:20},(_,index)=>{
    const product=index+1,variant=uuid(`variant${product}`),mapping=uuid(`mapping${product}`);
    return{variant_id:variant,source_mapping_id:mapping,source_product_id:product,source_category_id:1,
      source_payload_hash:'a'.repeat(64),source_group_id:7,source_provider:'tcgplayer',language_code:'en',game_key:'mtg',previous_market_price:50,image_object:object,
      image_evidence:{game_key:'mtg',variant_id:variant,source_mapping_id:mapping,source_provider:'tcgplayer',source_category_id:1,
        source_group_id:7,source_product_id:product,source_image_url:`https://tcgplayer-cdn.tcgplayer.com/product/${product}_200w.jpg`,
        selected_source_role:'exact_source_product_package',retrieved_at:'2026-09-07T00:00:00+00:00',http_status:200,
        image_mime:'image/jpeg',image_width:500,image_height:500,image_bytes:5000,content_sha256:sha,classification:'exact_image_ready',evidence_fingerprint:'f'.repeat(64)}};
  });
  return{baseline,source:baseline.map(r=>({product_id:r.source_product_id,category_id:1,group_id:7,source_active:true,payload_hash:'a'.repeat(64)})),
    prices:baseline.map(r=>({product_id:r.source_product_id,source_price_row_identity:`price:${r.source_product_id}`,subtype_name_normalized:'normal',
      observed_on:'2026-09-07',currency:'USD',market_price:55,low_price:50,payload_hash:'b'.repeat(64)})),
    sync:{id:'sync',status:'completed',observed_on:'2026-09-07'},today:'2026-09-07',producerCommit:'c'.repeat(40),pointers:[]};
}
test('refresh is deterministic and binds every image to the new exact price member',()=>{
  const input=fixture(),p=build(input);assert.deepEqual(p,build(input));assert.equal(p.prices.members.length,20);
  const members=new Map(p.prices.members.map(m=>[m.id,m]));
  for(const e of p.images.evidence){assert.equal(e.variant_id,members.get(e.source_release_member_id).variant_id);assert.equal(e.retrieved_at,input.baseline[0].image_evidence.retrieved_at);}
  assert.equal(p.images.releases[0].source_price_release_id,p.prices.releases[0].id);
  assert.equal(p.boundaries.storage_writes,0);assert.equal(p.boundaries.identity_writes,0);assert.equal(p.images.objects,undefined);
});
test('wrong game, duplicate identity, wrong bytes and large price swings stop',()=>{
  const mutations=[i=>i.baseline[0].game_key='pokemon',i=>i.baseline.push(i.baseline[0]),
    i=>i.baseline[0].image_object={...i.baseline[0].image_object,storage_readback_sha256:'0'.repeat(64)},i=>i.prices[0].market_price=999];
  for(const mutate of mutations){const i=fixture();mutate(i);assert.throws(()=>build(i));}
});

test('changed, missing, inactive and cross-category source rows are excluded from both releases',()=>{
  for(const mutate of [i=>i.source[0].payload_hash='0'.repeat(64),i=>i.source.shift(),
    i=>i.source[0].source_active=false,i=>i.source[0].category_id=3]){
    const i=fixture();mutate(i);const original=structuredClone(i),p=build(i),id=i.baseline[0].variant_id;
    assert.equal(p.prices.members.length,19);assert.equal(p.images.release_members.length,19);
    assert.equal(p.exclusions[0].reason,'source_identity_not_currently_verified');
    assert.equal(p.exclusions[0].expected_source_payload_hash,'a'.repeat(64));
    assert.equal(p.exclusions[0].observed_source_payload_hash,i.source.find(s=>s.product_id===1)?.payload_hash??null);
    assert.equal(p.source_containment_policy,p.exclusions[0].policy);
    for(const rows of [p.prices.qualifications,p.prices.members,p.images.evidence,p.images.assertions,p.images.release_members]){
      assert.ok(rows.every(r=>r.variant_id!==id));
    }
    assert.deepEqual(i,original);assert.deepEqual(p,build(i));
  }
});

test('source containment and stale prices share the existing five percent loss limit',()=>{
  const i=fixture();i.source[0].payload_hash='0'.repeat(64);i.prices[1].market_price=null;
  assert.throws(()=>build(i),/Coverage loss/);
  i.prices[1].market_price=55;i.source[1].source_active=false;
  assert.throws(()=>build(i),/Coverage loss/);
});

test('source containment cannot hide corrupted baseline image evidence',()=>{
  const i=fixture();i.source[0].source_active=false;
  i.baseline[0].image_object={...i.baseline[0].image_object,storage_readback_sha256:'0'.repeat(64)};
  assert.throws(()=>build(i));
});
test('small genuine gaps are excluded, not fabricated; more than five percent stops',()=>{
  const i=fixture();i.prices[0].market_price=null;const p=build(i);assert.equal(p.prices.members.length,19);assert.equal(p.images.release_members.length,19);
  i.prices[1].observed_on='2026-08-01';assert.throws(()=>build(i),/Coverage loss/);
});
test('stale sync, future prices and duplicate Normal prices cannot publish',()=>{
  let i=fixture();i.sync.observed_on='2026-08-01';assert.throws(()=>build(i));
  i=fixture();i.prices.push(i.prices[0]);assert.throws(()=>build(i),/Ambiguous/);
  i=fixture();i.prices[0].observed_on='2026-09-08';assert.equal(build(i).exclusions.length,1);
});
test('unchanged observation qualification stays stable across later syncs',()=>{
  const i=fixture(),a=build(i);i.today='2026-09-08';i.sync={...i.sync,id:'next',observed_on:'2026-09-08'};
  const b=build(i);assert.deepEqual(a.prices.qualifications,b.prices.qualifications);assert.notEqual(a.prices.releases[0].id,b.prices.releases[0].id);
});

test('seven-day quote expires on day eight even when the warehouse sync is fresh',()=>{
  const input=fixture();
  input.prices[0].observed_on='2026-08-31';
  const before=build(input);
  assert.equal(before.prices.members.length,20);
  assert.equal(before.prices.qualifications.find(q=>q.variant_id===input.baseline[0].variant_id).observed_on,'2026-08-31');
  input.today='2026-09-08';
  input.sync={...input.sync,id:'fresh-next-day-sync',observed_on:'2026-09-08'};
  const after=build(input);
  assert.equal(after.prices.members.length,19);
  assert.equal(after.images.release_members.length,19);
  assert.deepEqual(after.exclusions,[{variant_id:input.baseline[0].variant_id,reason:'missing_stale_or_invalid_exact_market_price'}]);
  assert.ok(after.prices.qualifications.every(q=>q.variant_id!==input.baseline[0].variant_id));
  assert.ok(after.images.evidence.every(e=>e.variant_id!==input.baseline[0].variant_id));
  assert.equal(input.prices[0].observed_on,'2026-08-31');
});

test('a genuinely new exact observation restores an expired quote without changing image provenance',()=>{
  const input=fixture();
  input.today='2026-09-08';
  input.sync={...input.sync,observed_on:'2026-09-08'};
  input.prices[0].observed_on='2026-08-31';
  assert.equal(build(input).exclusions.length,1);
  input.prices[0]={...input.prices[0],observed_on:'2026-09-08',payload_hash:'9'.repeat(64)};
  const restored=build(input);
  assert.equal(restored.exclusions.length,0);
  assert.equal(restored.prices.members.length,20);
  assert.equal(restored.images.release_members.length,20);
  assert.equal(restored.images.evidence.find(e=>e.variant_id===input.baseline[0].variant_id).retrieved_at,input.baseline[0].image_evidence.retrieved_at);
});

test('MTG cannot borrow a language, host mapping or group from another product',()=>{
  for(const mutate of [i=>i.baseline[0].language_code='ja',i=>i.baseline[0].image_evidence.source_group_id=8,
    i=>i.baseline[0].image_evidence.variant_id=uuid('other'),i=>i.baseline[1].source_mapping_id=i.baseline[0].source_mapping_id]){
    const input=fixture();mutate(input);assert.throws(()=>build(input));
  }
  const input=fixture();input.source[0].group_id=99;
  assert.equal(build(input).exclusions[0].reason,'source_identity_not_currently_verified');
});
