import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import {
  MTG_SEALED_IMAGE_COVERAGE_V1,
  buildMtgSealedImageSourcePlanV1,
  finalizeMtgSealedImageCoverageV1,
  inspectMtgSealedImageBytesV1,
  projectRefFromConnectionStringV1,
  projectRefFromSupabaseUrlV1,
  proposedMtgSealedStoragePathV1,
  validateMtgSealedCanonicalEnvironmentV1,
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

test('canonical environment proof binds database, config, URL, and minimum counts', () => {
  assert.equal(projectRefFromConnectionStringV1(
    'postgresql://postgres:secret@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres'),
  'ycdxbpibncqcchqiihfz');
  assert.equal(projectRefFromConnectionStringV1(
    'postgresql://postgres.ycdxbpibncqcchqiihfz:secret@pooler.supabase.com:5432/postgres'),
  'ycdxbpibncqcchqiihfz');
  assert.equal(projectRefFromSupabaseUrlV1(
    'https://ycdxbpibncqcchqiihfz.supabase.co'), 'ycdxbpibncqcchqiihfz');
  assert.deepEqual(validateMtgSealedCanonicalEnvironmentV1({
    config_project_ref: 'ycdxbpibncqcchqiihfz',
    database_project_ref: 'ycdxbpibncqcchqiihfz',
    supabase_url_project_ref: 'ycdxbpibncqcchqiihfz',
    card_prints: 40_000, sets: 150, card_print_traits: 5_000,
  }), { valid: true, findings: [] });
  assert.equal(validateMtgSealedCanonicalEnvironmentV1({
    config_project_ref: 'wrong', database_project_ref: 'wrong',
    card_prints: 1, sets: 1, card_print_traits: 1,
  }).valid, false);
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

test('invalid image exclusions retain byte-level inspection diagnostics', () => {
  const plan = buildMtgSealedImageSourcePlanV1([sourceRow(1)], {
    expectedMemberCount: 1,
  });
  const inspected = inspectMtgSealedImageBytesV1(Buffer.from('<html>bad</html>'),
    'text/html');
  const coverage = finalizeMtgSealedImageCoverageV1(plan, [{
    status: 'invalid_image', image: inspected, http_status: 200,
    error_codes: ['invalid_image'],
  }]);
  assert.equal(coverage.rows[0].classification, 'invalid_image');
  assert.equal(coverage.rows[0].image.sha256?.length, 64);
  assert.ok(coverage.rows[0].image.diagnostics.includes('unsupported_image_signature'));
});

test('operator and workflow are read-only and preserve artifacts', () => {
  const operator = fs.readFileSync(
    'scripts/audits/mtg_sealed_image_coverage_v1.mjs', 'utf8');
  const workflow = fs.readFileSync(
    '.github/workflows/mtg-sealed-image-coverage-v1.yml', 'utf8');
  assert.match(operator, /begin read only/i);
  assert.match(operator, /Environment mismatch - fix before proceeding/);
  assert.match(operator, /response\.body\.getReader\(\)/);
  assert.doesNotMatch(operator, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /retention-days: 90/);
  assert.match(workflow, /expected-member-count=2182/);
});

test('permanent live evidence reconciles and matches every recorded hash', () => {
  const root =
    'docs/audits/pricing/mtg_sealed_image_coverage_v1/2026-09-04_live_33841181449';
  const manifest = JSON.parse(fs.readFileSync(
    `${root}/permanent_manifest.json`, 'utf8'));
  const summary = JSON.parse(fs.readFileSync(`${root}/summary.json`, 'utf8'));

  assert.equal(manifest.workflow.producer_sha,
    'e616615883cb808ad8c870380d9d52da4a4d80bf');
  assert.equal(summary.selected_member_count, 2182);
  assert.equal(summary.image_eligible_member_count, 2149);
  assert.equal(summary.excluded_member_count, 33);
  assert.equal(summary.zero_reconciliation_mismatches, true);
  assert.ok(Object.values(summary.boundaries).every((value) => value === 0));

  for (const [name, evidence] of
    Object.entries(manifest.preserved_artifacts)) {
    const bytes = fs.readFileSync(`${root}/${name}`);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(bytes.length, evidence.bytes, `${name} byte count`);
    assert.equal(sha256, evidence.sha256, `${name} SHA-256`);
  }
});
