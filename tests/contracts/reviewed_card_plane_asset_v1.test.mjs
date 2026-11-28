import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { prepareReviewedCardPlaneAssetV1, finalizeReviewedCardPlaneAssetV1, REVIEWED_CARD_PLANE_ASSET_V1 }
  from '../../backend/warehouse/reviewed_card_plane_asset_v1.mjs';
const sharp = createRequire(new URL('../../backend/package.json', import.meta.url))('sharp');

const candidateId = '11111111-1111-4111-8111-111111111111';
const printingId = '22222222-2222-4222-8222-222222222222';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const original = await sharp({create:{width:320,height:450,channels:3,background:'#345678'}}).jpeg().toBuffer();
function fixture() {
  const expectedOriginal = {sha256:sha(original),bytes:original.length,width:320,height:450,mime_type:'image/jpeg'};
  const path = 'warehouse-evidence/reviewed-test/front.jpg';
  return { candidateId, printingId, originalBuffer:Buffer.from(original), expectedOriginal,
    frontEvidence:{id:'33333333-3333-4333-8333-333333333333',candidate_id:candidateId,evidence_slot:'front',
      storage_path:path,metadata_payload:{original_image:{...expectedOriginal,bucket:'user-card-images',path,mimeType:'image/jpeg'}}},
    frameReview:{version:REVIEWED_CARD_PLANE_ASSET_V1,candidate_id:candidateId,printing_id:printingId,
      original_sha256:expectedOriginal.sha256,width:320,height:450,assessment_kind:'operator_technical_frame_review',
      reviewed_at:'2026-11-27T22:00:00.000Z',upright:true,full_card_plane:true,surroundings_excluded:true,
      number_preserved:true,stamp_preserved:true,set_evidence_preserved:true,requires_pixel_transform:false} };
}
function receipt(prepared) {
  return {bucket:prepared.asset.bucket,storage_path:prepared.asset.storage_path,upsert:false,disposition:'created'};
}
test('prepares unchanged bytes without declaring storage, identity approval, or publication', async()=>{
  const f = fixture(), before = Buffer.from(f.originalBuffer);
  const p = await prepareReviewedCardPlaneAssetV1(f);
  assert.equal(p.status,'PREPARED'); assert.equal(p.canonical_writes_authorized,false);
  assert.ok(p.buffer.equals(before)); assert.notEqual(p.buffer,f.originalBuffer);
  assert.equal(p.asset.sha256,f.expectedOriginal.sha256);
  assert.ok(p.asset.storage_path.startsWith('warehouse-derived/self-hosted-images-v1/'));
  assert.notEqual(p.asset.storage_path,f.frontEvidence.storage_path);
  assert.equal(p.method.pixel_transform,'none');
  assert.equal(p.method.ai_service_used,false); assert.equal(p.method.openai_tunnel_used,false);
  assert.equal(p.outputs,undefined);
  p.buffer[0] ^= 1; assert.ok(f.originalBuffer.equals(before));
});
test('only an exact independent storage readback finalizes READY with null machine confidence', async()=>{
  const p = await prepareReviewedCardPlaneAssetV1(fixture());
  const result = await finalizeReviewedCardPlaneAssetV1({prepared:p,downloadedBuffer:Buffer.from(original),storageReceipt:receipt(p)});
  assert.equal(result.status,'READY');
  assert.equal(result.identity_preservation.original_sha256,result.identity_preservation.derived_sha256);
  assert.equal(result.quality.front_confidence,null); assert.equal(result.outputs.normalized_back_storage_path,null);
  assert.equal(result.outputs.normalized_front_storage_path,p.asset.storage_path);
});
for (const [name, change, error] of [
  ['changed source bytes',f=>{f.originalBuffer[40]^=1;},/original_hash_changed/],
  ['wrong evidence owner',f=>{f.frontEvidence.candidate_id=printingId;},/evidence_candidate_changed/],
  ['wrong face',f=>{f.frontEvidence.evidence_slot='back';},/front_evidence_required/],
  ['public bucket',f=>{f.frontEvidence.metadata_payload.original_image.bucket='public';},/private_bucket_required/],
  ['changed evidence hash',f=>{f.frontEvidence.metadata_payload.original_image.sha256='a'.repeat(64);},/evidence_original_changed/],
  ['surrounding background',f=>{f.frameReview.surroundings_excluded=false;},/frame_review_required/],
  ['cut off stamp',f=>{f.frameReview.stamp_preserved=false;},/frame_review_required/],
  ['cut off number',f=>{f.frameReview.number_preserved=false;},/frame_review_required/],
  ['changed frame hash',f=>{f.frameReview.original_sha256='a'.repeat(64);},/frame_pixels_changed/],
  ['pixel editing',f=>{f.frameReview.requires_pixel_transform=true;},/separate_qualification/],
  ['identity approval substituted for technical assessment',f=>{f.frameReview.assessment_kind='founder_approval';},/frame_is_not_identity_approval/],
  ['wrong dimensions',f=>{f.expectedOriginal.width=321;f.frontEvidence.metadata_payload.original_image.width=321;},/original_width_changed/],
  ['traversal',f=>{f.frontEvidence.storage_path='warehouse-evidence/../front.jpg';f.frontEvidence.metadata_payload.original_image.path=f.frontEvidence.storage_path;},/invalid_private_evidence_path/],
  ['remote URL',f=>{f.frontEvidence.storage_path='https://example.com/front.jpg';f.frontEvidence.metadata_payload.original_image.path=f.frontEvidence.storage_path;},/original_evidence_prefix_required/],
]) test(`rejects ${name}`,async()=>{const f=fixture();change(f);await assert.rejects(prepareReviewedCardPlaneAssetV1(f),error);});
test('a malformed JPEG that only retains header dimensions fails full decode',async()=>{
  const f=fixture();f.originalBuffer=f.originalBuffer.subarray(0,Math.floor(f.originalBuffer.length*0.8));
  f.expectedOriginal.sha256=sha(f.originalBuffer);f.expectedOriginal.bytes=f.originalBuffer.length;
  Object.assign(f.frontEvidence.metadata_payload.original_image,f.expectedOriginal);
  f.frameReview.original_sha256=f.expectedOriginal.sha256;
  await assert.rejects(prepareReviewedCardPlaneAssetV1(f));
});
for (const field of ['bucket','storage_path','upsert','disposition']) test(`rejects storage receipt drift: ${field}`,async()=>{
  const p=await prepareReviewedCardPlaneAssetV1(fixture()),r=receipt(p);r[field]=field==='upsert'?true:'wrong';
  await assert.rejects(finalizeReviewedCardPlaneAssetV1({prepared:p,downloadedBuffer:original,storageReceipt:r}));
});
test('rejects same-size changed derived bytes',async()=>{
  const p=await prepareReviewedCardPlaneAssetV1(fixture()),bytes=Buffer.from(original);bytes[100]^=1;
  await assert.rejects(finalizeReviewedCardPlaneAssetV1({prepared:p,downloadedBuffer:bytes,storageReceipt:receipt(p)}),/original_hash_changed/);
});
test('rejects tampered prepared destination and method',async()=>{
  for(const field of ['asset','method','source_refs','frame_review','printing_id']) {
    const p=await prepareReviewedCardPlaneAssetV1(fixture());
    if(field==='asset')p.asset.storage_path='warehouse-evidence/overwrite.jpg';
    else if(field==='method')p.method.warp_used=true;
    else if(field==='source_refs')p.source_refs.front_evidence_id=printingId;
    else if(field==='frame_review')p.frame_review.reviewed_at='2026-12-01T00:00:00Z';
    else p.printing_id=candidateId;
    await assert.rejects(finalizeReviewedCardPlaneAssetV1({prepared:p,downloadedBuffer:original,storageReceipt:receipt(p)}),/changed/);
  }
});
