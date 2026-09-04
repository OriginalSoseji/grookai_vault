import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  MTG_SEALED_IMAGE_COVERAGE_V1,
  buildMtgSealedImageSourcePlanV1,
  finalizeMtgSealedImageCoverageV1,
  inspectMtgSealedImageBytesV1,
  proposedMtgSealedStoragePathV1,
  validateMtgSealedImageCoverageV1,
} from '../../backend/pricing/mtg_sealed_image_coverage_v1.mjs';

function png(width = 400, height = 500, size = 3000) {
  const buffer = Buffer.alloc(size);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function sourceRow(index, overrides = {}) {
  return {
    release_id: '00000000-0000-0000-0000-000000000001',
    release_member_id: `00000000-0000-0000-0001-${String(index).padStart(12, '0')}`,
    member_fingerprint: String(index).padStart(64, 'a').slice(-64),
    family_id: `00000000-0000-0000-0002-${String(index).padStart(12, '0')}`,
    game_key: 'mtg',
    variant_id: `00000000-0000-0000-0003-${String(index).padStart(12, '0')}`,
    canonical_name: `Fixture Box ${index}`,
    package_form: 'booster_box',
    language_code: 'en',
    source_mapping_id: `00000000-0000-0000-0004-${String(index).padStart(12, '0')}`,
    source_provider: 'tcgplayer',
    source_category_id: 1,
    source_group_id: 10 + index,
    source_product_id: 100 + index,
    source_product_name: `Fixture Box ${index}`,
    mapping_source_payload_hash: 'b'.repeat(64),
    current_source_product_id: 100 + index,
    current_source_category_id: 1,
    current_source_group_id: 10 + index,
    current_source_product_name: `Fixture Box ${index}`,
    current_source_payload_hash: 'c'.repeat(64),
    source_image_url:
      `https://tcgplayer-cdn.tcgplayer.com/product/${100 + index}_200w.jpg`,
    source_image_count: 1,
    source_active: true,
    catalog_metadata_status: 'current',
    ...overrides,
  };
}

test('valid signatures produce exact content evidence and deterministic paths', () => {
  const image = inspectMtgSealedImageBytesV1(png(), 'image/png');
  assert.equal(image.valid_image, true);
  assert.equal(image.width, 400);
  assert.equal(image.height, 500);
  assert.equal(image.placeholder_suspected, false);
  const imagePath = proposedMtgSealedStoragePathV1(image);
  assert.match(imagePath,
    /^sealed\/mtg\/sha256\/[0-9a-f]{2}\/[0-9a-f]{64}\.png$/);
  assert.equal(proposedMtgSealedStoragePathV1(image), imagePath);
});

test('non-image and placeholder bytes cannot qualify as exact', () => {
  const invalid = inspectMtgSealedImageBytesV1(Buffer.from('<html>no</html>'),
    'text/html');
  assert.equal(invalid.valid_image, false);
  const placeholder = inspectMtgSealedImageBytesV1(png(40, 40), 'image/png');
  assert.equal(placeholder.valid_image, true);
  assert.equal(placeholder.placeholder_suspected, true);
});

test('source plan binds every unique release member to exact private source identity', () => {
  const plan = buildMtgSealedImageSourcePlanV1([sourceRow(1), sourceRow(2)], {
    expectedMemberCount: 2,
  });
  assert.equal(plan.valid, true);
  assert.equal(plan.version, MTG_SEALED_IMAGE_COVERAGE_V1);
  assert.equal(plan.rows.length, 2);
  assert.equal(plan.rows[0].candidate_urls[0].role,
    'tcgplayer_source_high_resolution');
  assert.deepEqual(plan.boundaries, {
    database_writes: 0,
    storage_writes: 0,
    image_pointer_writes: 0,
    pricing_writes: 0,
    release_pointer_writes: 0,
    visibility_writes: 0,
    vault_writes: 0,
  });
});

test('duplicate members and cross-source identity drift fail the source plan', () => {
  const duplicate = sourceRow(1);
  const plan = buildMtgSealedImageSourcePlanV1([
    duplicate,
    sourceRow(2, {
      release_member_id: duplicate.release_member_id,
      current_source_product_name: 'Different product',
    }),
  ], { expectedMemberCount: 2 });
  assert.equal(plan.valid, false);
  assert.ok(plan.findings.includes('duplicate_or_missing_release_member_id'));
  assert.equal(plan.rows[1].identity_conflict, true);
});

test('shared bytes deduplicate storage while preserving per-variant evidence', () => {
  const plan = buildMtgSealedImageSourcePlanV1([sourceRow(1), sourceRow(2)], {
    expectedMemberCount: 2,
  });
  const image = inspectMtgSealedImageBytesV1(png(), 'image/png');
  const coverage = finalizeMtgSealedImageCoverageV1(plan, [
    { status: 'image_retrieved', image, selected_role: 'fixture' },
    { status: 'image_retrieved', image, selected_role: 'fixture' },
  ], '2026-09-03T00:00:00.000Z');
  assert.equal(coverage.rows.length, 2);
  assert.equal(coverage.unique_image_count, 1);
  assert.equal(coverage.classification_counts.shared_bytes_exact_variant, 2);
  assert.equal(coverage.rows[0].proposed_storage_path,
    coverage.rows[1].proposed_storage_path);
  assert.notEqual(coverage.rows[0].variant_id, coverage.rows[1].variant_id);
  assert.deepEqual(validateMtgSealedImageCoverageV1(coverage), {
    valid: true, findings: [],
  });
});

test('coverage preserves explicit exclusions and exact member reconciliation', () => {
  const plan = buildMtgSealedImageSourcePlanV1([sourceRow(1), sourceRow(2)], {
    expectedMemberCount: 2,
  });
  const image = inspectMtgSealedImageBytesV1(png(), 'image/png');
  const coverage = finalizeMtgSealedImageCoverageV1(plan, [
    { status: 'image_retrieved', image },
    { status: 'missing_source_image', error_codes: ['http_404'] },
  ]);
  assert.equal(coverage.image_eligible_member_count, 1);
  assert.equal(coverage.excluded_member_count, 1);
  assert.equal(coverage.classification_counts.missing_source_image, 1);
  assert.equal(validateMtgSealedImageCoverageV1(coverage).valid, true);
});

test('operator and workflow are read-only and preserve artifacts', () => {
  const operator = fs.readFileSync(
    'scripts/audits/mtg_sealed_image_coverage_v1.mjs', 'utf8');
  const workflow = fs.readFileSync(
    '.github/workflows/mtg-sealed-image-coverage-v1.yml', 'utf8');
  assert.match(operator, /begin read only/i);
  assert.doesNotMatch(operator, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /retention-days: 90/);
  assert.match(workflow, /expected-member-count=2182/);
});
