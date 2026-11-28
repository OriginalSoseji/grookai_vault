import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { printingManifestHash } from '../catalog/printing_completeness_gate_v1.mjs';

export const REVIEWED_CARD_PLANE_ASSET_V1 = 'REVIEWED_CARD_PLANE_ASSET_V1';
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const sha = value => createHash('sha256').update(value).digest('hex');
const PREFIX = 'warehouse-derived/self-hosted-images-v1/reviewed-card-plane-v1/';
const plain = value => JSON.parse(JSON.stringify(value));

function assertPrivatePath(path) {
  assert.equal(typeof path, 'string', 'private_evidence_path_required');
  assert.ok(path.startsWith('warehouse-evidence/'), 'original_evidence_prefix_required');
  assert.ok(!/[\\?#\s]/.test(path) && !path.split('/').some(p => !p || p === '.' || p === '..'),
    'invalid_private_evidence_path');
}

async function inspectOriginal(buffer, expected) {
  assert.ok(Buffer.isBuffer(buffer), 'original_buffer_required');
  assert.match(expected?.sha256 ?? '', /^[a-f0-9]{64}$/, 'original_hash_required');
  assert.equal(sha(buffer), expected.sha256, 'original_hash_changed');
  assert.equal(buffer.length, expected.bytes, 'original_size_changed');
  assert.equal(expected.mime_type, 'image/jpeg', 'reviewed_jpeg_required');
  const metadata = await sharp(buffer, { failOn: 'warning', limitInputPixels: 40_000_000 }).metadata();
  assert.equal(metadata.format, 'jpeg', 'actual_jpeg_required');
  assert.equal(metadata.width, expected.width, 'original_width_changed');
  assert.equal(metadata.height, expected.height, 'original_height_changed');
  assert.ok(!metadata.orientation || metadata.orientation === 1, 'upright_pixels_required');
  assert.ok(!metadata.pages || metadata.pages === 1, 'single_front_required');
  assert.ok(metadata.width >= 250 && metadata.height >= 350 && metadata.width < metadata.height,
    'legible_portrait_front_required');
  // Metadata alone does not prove that the JPEG can be fully decoded.
  await sharp(buffer, { failOn: 'warning', limitInputPixels: 40_000_000 }).stats();
}

/**
 * Offline asset preparation. This neither identifies a card nor uploads it.
 * A technical frame assessment is distinct from a founder identity decision.
 * The caller retains both, and supplies the domain's existing interpretation.
 */
export async function prepareReviewedCardPlaneAssetV1({
  candidateId, printingId, frontEvidence, originalBuffer, expectedOriginal, frameReview,
}) {
  assert.match(candidateId ?? '', uuid, 'candidate_uuid_required');
  assert.match(printingId ?? '', uuid, 'printing_uuid_required');
  assert.match(frontEvidence?.id ?? '', uuid, 'front_evidence_uuid_required');
  assert.equal(frontEvidence.candidate_id, candidateId, 'evidence_candidate_changed');
  assert.equal(frontEvidence.evidence_slot, 'front', 'front_evidence_required');
  const evidenceOriginal = frontEvidence.metadata_payload?.original_image;
  assert.equal(evidenceOriginal?.bucket, 'user-card-images', 'private_bucket_required');
  assert.equal(evidenceOriginal?.path, frontEvidence.storage_path, 'original_evidence_path_changed');
  for (const field of ['sha256', 'bytes', 'width', 'height']) {
    assert.equal(evidenceOriginal?.[field], expectedOriginal?.[field], `evidence_original_changed:${field}`);
  }
  assert.equal(evidenceOriginal?.mimeType, expectedOriginal?.mime_type, 'evidence_original_mime_changed');
  assertPrivatePath(frontEvidence.storage_path);
  await inspectOriginal(originalBuffer, expectedOriginal);
  assert.equal(frameReview?.version, REVIEWED_CARD_PLANE_ASSET_V1, 'technical_frame_review_required');
  assert.equal(frameReview.candidate_id, candidateId, 'frame_candidate_changed');
  assert.equal(frameReview.printing_id, printingId, 'frame_printing_changed');
  assert.equal(frameReview.original_sha256, expectedOriginal.sha256, 'frame_pixels_changed');
  assert.equal(frameReview.width, expectedOriginal.width, 'frame_width_changed');
  assert.equal(frameReview.height, expectedOriginal.height, 'frame_height_changed');
  assert.equal(frameReview.assessment_kind, 'operator_technical_frame_review', 'frame_is_not_identity_approval');
  assert.ok(typeof frameReview.reviewed_at === 'string' && Number.isFinite(Date.parse(frameReview.reviewed_at)),
    'frame_review_time_required');
  for (const field of ['upright', 'full_card_plane', 'surroundings_excluded', 'number_preserved',
    'stamp_preserved', 'set_evidence_preserved']) {
    assert.equal(frameReview[field], true, `frame_review_required:${field}`);
  }
  assert.equal(frameReview.requires_pixel_transform, false, 'transformed_assets_require_separate_qualification');
  const storagePath = `${PREFIX}${printingId}/${expectedOriginal.sha256}/front.jpg`;
  const prepared = {
    version: REVIEWED_CARD_PLANE_ASSET_V1,
    status: 'PREPARED',
    candidate_id: candidateId,
    printing_id: printingId,
    source_refs: { front_evidence_id: frontEvidence.id, back_evidence_id: null,
      front_storage_path: frontEvidence.storage_path, back_storage_path: null },
    asset: { bucket: 'user-card-images', storage_path: storagePath,
      sha256: expectedOriginal.sha256, bytes: expectedOriginal.bytes, width: expectedOriginal.width,
      height: expectedOriginal.height, mime_type: expectedOriginal.mime_type },
    frame_review: plain(frameReview),
    method: { pixel_transform: 'none', warp_used: false, openai_tunnel_used: false,
      ai_service_used: false, pipeline_version: REVIEWED_CARD_PLANE_ASSET_V1 },
    canonical_writes_authorized: false,
  };
  return { ...prepared, preparation_fingerprint: printingManifestHash(prepared),
    // Return a copy so a caller cannot mutate the original through this result.
    buffer: Buffer.from(originalBuffer) };
}

/** A READY package requires actual immutable storage readback, not a planned path. */
export async function finalizeReviewedCardPlaneAssetV1({ prepared, downloadedBuffer, storageReceipt }) {
  assert.equal(prepared?.version, REVIEWED_CARD_PLANE_ASSET_V1, 'prepared_asset_required');
  assert.equal(prepared.status, 'PREPARED', 'prepared_asset_required');
  const {buffer:unusedBuffer,preparation_fingerprint:fingerprint,...body}=prepared;
  assert.equal(printingManifestHash(body),fingerprint,'prepared_asset_fingerprint_changed');
  const rebuilt = await prepareReviewedCardPlaneAssetV1({
    candidateId: prepared.candidate_id, printingId: prepared.printing_id,
    frontEvidence: { id: prepared.source_refs.front_evidence_id, candidate_id: prepared.candidate_id,
      evidence_slot: 'front', storage_path: prepared.source_refs.front_storage_path,
      metadata_payload: { original_image: { ...prepared.asset, bucket: 'user-card-images',
        path: prepared.source_refs.front_storage_path, mimeType: prepared.asset.mime_type } } },
    originalBuffer: prepared.buffer, expectedOriginal: prepared.asset, frameReview: prepared.frame_review,
  });
  assert.deepEqual(prepared.asset, rebuilt.asset, 'derived_asset_plan_changed');
  assert.deepEqual(prepared.method, rebuilt.method, 'derived_method_changed');
  assert.equal(fingerprint,rebuilt.preparation_fingerprint,'prepared_provenance_changed');
  assert.equal(storageReceipt?.bucket, rebuilt.asset.bucket, 'derived_bucket_changed');
  assert.equal(storageReceipt?.storage_path, rebuilt.asset.storage_path, 'derived_path_changed');
  assert.equal(storageReceipt?.upsert, false, 'immutable_storage_required');
  assert.ok(['created', 'existing_exact'].includes(storageReceipt?.disposition), 'verified_storage_disposition_required');
  await inspectOriginal(downloadedBuffer, rebuilt.asset);
  assert.ok(downloadedBuffer.equals(rebuilt.buffer), 'identity_pixels_changed');
  return {
    version: 'V1', status: 'READY', candidate_id: rebuilt.candidate_id,
    source_refs: rebuilt.source_refs,
    outputs: { normalized_front_storage_path: rebuilt.asset.storage_path, normalized_back_storage_path: null },
    method: rebuilt.method,
    quality: { front_confidence: null, back_confidence: null,
      assessment_kind: 'operator_technical_frame_review', original_dimensions_retained: true },
    identity_preservation: { method: 'byte_identity', original_sha256: rebuilt.asset.sha256,
      derived_sha256: sha(downloadedBuffer), bytes: downloadedBuffer.length,
      width: rebuilt.asset.width, height: rebuilt.asset.height },
    frame_review: rebuilt.frame_review,
    missing_fields: [], evidence_gaps: [], next_actions: [], errors: [],
  };
}
