import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { gunzipSync } from 'node:zlib';

import {
  buildMtgSealedDurableImagePlanV1,
  classifyMtgSealedDurableImageCollisionV1,
  hashMtgSealedDurableImagePlanV1,
  validateMtgSealedDurableImagePlanV1,
} from '../../backend/pricing/mtg_sealed_durable_image_plan_v1.mjs';
import {
  finalizeMtgSealedImageCoverageV1,
} from '../../backend/pricing/mtg_sealed_image_coverage_v1.mjs';

function image(sha, overrides = {}) {
  return {
    valid_image: true,
    placeholder_suspected: false,
    format: 'jpeg',
    content_type: 'image/jpeg',
    width: 500,
    height: 700,
    size_bytes: 10_000,
    sha256: sha,
    diagnostics: [],
    ...overrides,
  };
}

function row(index, overrides = {}) {
  const sha = overrides.sha ?? hashMtgSealedDurableImagePlanV1(`image-${index}`);
  const classification = overrides.classification ?? 'exact_image_ready';
  const observed = overrides.image === undefined
    ? image(sha, overrides.imageOverrides)
    : overrides.image;
  return {
    selected_index: index,
    release_id: '25626032-7d72-5542-a8e0-7a6532c2f776',
    release_member_id: `00000000-0000-0000-0001-${String(index).padStart(12, '0')}`,
    member_fingerprint: hashMtgSealedDurableImagePlanV1(`member-${index}`),
    game_key: 'mtg',
    family_id: `00000000-0000-0000-0002-${String(index).padStart(12, '0')}`,
    variant_id: `00000000-0000-0000-0003-${String(index).padStart(12, '0')}`,
    source_mapping_id: `00000000-0000-0000-0004-${String(index).padStart(12, '0')}`,
    source_product_id: 1000 + index,
    canonical_name: `Fixture ${index}`,
    package_form: 'box',
    language_code: 'en',
    classification,
    retrieval: {
      selected_source_url:
        `https://tcgplayer-cdn.tcgplayer.com/product/${1000 + index}_in_1000x1000.jpg`,
      selected_role: 'tcgplayer_source_high_resolution',
      attempted_urls: [],
    },
    image: observed,
    proposed_storage_path: observed?.sha256
      ? `sealed/mtg/sha256/${observed.sha256.slice(0, 2)}/` +
        `${observed.sha256}.jpg`
      : null,
    ...overrides,
  };
}

function fixture() {
  const sharedSha = hashMtgSealedDurableImagePlanV1('shared');
  const rows = [
    row(1),
    row(2, { sha: sharedSha, classification: 'shared_bytes_exact_variant' }),
    row(3, { sha: sharedSha, classification: 'shared_bytes_exact_variant' }),
    row(4),
    row(5, {
      classification: 'placeholder',
      imageOverrides: { placeholder_suspected: true, width: 50, height: 50 },
    }),
    row(6, { classification: 'invalid_image', image: null }),
  ];
  const expectations = {
    selected_members: 6,
    eligible_variants: 4,
    eligible_objects: 3,
    exclusions: 2,
    source_reported_unique_valid_images: 4,
    excluded_placeholder_images: 1,
  };
  return buildMtgSealedDurableImagePlanV1(rows, {
    coverageFingerprint: 'a'.repeat(64),
    producerCommitSha: 'b'.repeat(40),
    sourceReportedUniqueValidImages: 4,
    expectations,
    shardSize: 2,
  });
}

test('durable plan partitions variants, deduplicates exact bytes, and preserves gaps', () => {
  const bundle = fixture();
  assert.equal(bundle.objects.length, 3);
  assert.equal(bundle.exclusions.length, 2);
  assert.equal(bundle.shards.length, 2);
  assert.equal(bundle.plan.reconciliation.eligible_variants, 4);
  assert.equal(bundle.plan.reconciliation.shared_content_deduplication_count, 1);
  assert.equal(bundle.plan.reconciliation.source_reported_unique_valid_images, 4);
  assert.equal(bundle.plan.reconciliation.excluded_valid_placeholder_hashes, 1);
  assert.equal(bundle.plan.reconciliation.source_accounting_correction,
    'source_summary_count_included_excluded_placeholder_hashes');
  assert.deepEqual(validateMtgSealedDurableImagePlanV1(bundle, {
    coverageFingerprint: 'a'.repeat(64),
    expectations: {
      selected_members: 6,
      eligible_variants: 4,
      eligible_objects: 3,
      exclusions: 2,
      source_reported_unique_valid_images: 4,
      excluded_placeholder_images: 1,
    },
  }), { valid: true, findings: [] });
});

test('every eligible variant and excluded member appears exactly once', () => {
  const bundle = fixture();
  const eligible = bundle.objects.flatMap((object) =>
    object.supporting_variants.map((variant) => variant.release_member_id));
  const excluded = bundle.exclusions.map((row) => row.release_member_id);
  assert.equal(new Set(eligible).size, 4);
  assert.equal(new Set(excluded).size, 2);
  assert.equal(new Set([...eligible, ...excluded]).size, 6);
});

test('plan fingerprint, shard layout, and source ceiling are deterministic', () => {
  const left = fixture();
  const right = fixture();
  assert.equal(left.plan.plan_fingerprint_sha256,
    right.plan.plan_fingerprint_sha256);
  assert.deepEqual(left.shards, right.shards);
  assert.equal(left.plan.execution_policy.maximum_source_request_attempts, 9);
  assert.equal(left.plan.execution_policy.maximum_concurrency, 10);
  assert.equal(left.plan.future_execution_authority
    .current_plan_grants_storage_authority, false);
});

test('validator rejects missing support, unsafe upload, and path drift', () => {
  const bundle = fixture();
  bundle.objects[0].supporting_variants = [];
  bundle.objects[1].operation_policy.upload_upsert = true;
  bundle.objects[2].durable_object_path = 'sealed/mtg/wrong.jpg';
  const validation = validateMtgSealedDurableImagePlanV1(bundle, {
    coverageFingerprint: 'a'.repeat(64),
    expectations: {
      selected_members: 6,
      eligible_variants: 4,
      eligible_objects: 3,
      exclusions: 2,
    },
  });
  assert.equal(validation.valid, false);
  assert.ok(validation.findings.includes('eligible_variant_support_count_mismatch'));
  assert.ok(validation.findings.includes('object_path_mismatch'));
  assert.ok(validation.findings.includes('object_fingerprint_mismatch'));
});

test('collision policy reuses exact bytes and hard-stops mismatches', () => {
  const expected = {
    content_sha256: 'a'.repeat(64),
    content_type: 'image/jpeg',
    format: 'jpeg',
    width: 500,
    height: 700,
    size_bytes: 10_000,
  };
  assert.deepEqual(classifyMtgSealedDurableImageCollisionV1({
    exists: false,
    expectedImage: expected,
  }), { decision: 'upload_absent_object', hard_stop: false });
  assert.deepEqual(classifyMtgSealedDurableImageCollisionV1({
    exists: true,
    observedImage: expected,
    expectedImage: expected,
  }), { decision: 'reuse_preexisting_exact_object', hard_stop: false });
  const mismatch = classifyMtgSealedDurableImageCollisionV1({
    exists: true,
    observedImage: { ...expected, size_bytes: 9_999 },
    expectedImage: expected,
  });
  assert.equal(mismatch.hard_stop, true);
  assert.deepEqual(mismatch.mismatches, ['size_bytes']);
});

test('coverage unique image count excludes valid placeholder bytes', () => {
  const exact = image('a'.repeat(64));
  const placeholder = image('b'.repeat(64), {
    placeholder_suspected: true,
    width: 50,
    height: 50,
  });
  const coverage = finalizeMtgSealedImageCoverageV1({
    valid: true,
    expected_member_count: 2,
    release_id: 'release',
    plan_fingerprint_sha256: 'c'.repeat(64),
    boundaries: {
      database_writes: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      release_pointer_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
    },
    rows: [row(1), row(2)],
  }, [
    { status: 'image_retrieved', image: exact },
    { status: 'image_retrieved', image: placeholder },
  ]);
  assert.equal(coverage.image_eligible_member_count, 1);
  assert.equal(coverage.excluded_member_count, 1);
  assert.equal(coverage.unique_image_count, 1);
});

test('plan operator is offline and contains no network, database, or Storage client', () => {
  const source = fs.readFileSync(
    'scripts/audits/mtg_sealed_durable_image_plan_v1.mjs', 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|createClient\s*\(|new Client\s*\(/);
  assert.doesNotMatch(source, /\.storage\b|\.upload\s*\(|\.download\s*\(|\.rpc\s*\(/);
  assert.match(source, /tracked_worktree_clean/);
  assert.match(source, /offline_plan_only|zero_calls/);
});

test('preserved production coverage derives 2141 eligible objects without placeholders', () => {
  const root =
    'docs/audits/pricing/mtg_sealed_image_coverage_v1/2026-09-04_live_33841181449';
  const summary = JSON.parse(fs.readFileSync(`${root}/summary.json`, 'utf8'));
  const rows = gunzipSync(fs.readFileSync(`${root}/coverage.jsonl.gz`))
    .toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const bundle = buildMtgSealedDurableImagePlanV1(rows, {
    coverageFingerprint: summary.coverage_fingerprint_sha256,
    producerCommitSha: 'c'.repeat(40),
    sourceReportedUniqueValidImages: summary.unique_image_count,
  });
  assert.equal(bundle.objects.length, 2141);
  assert.equal(bundle.objects.flatMap((row) =>
    row.supporting_variants).length, 2149);
  assert.equal(bundle.exclusions.length, 33);
  assert.equal(bundle.shards.length, 22);
  assert.equal(bundle.plan.reconciliation.eligible_expected_bytes, 157_335_339);
  assert.equal(bundle.plan.execution_policy.maximum_source_request_attempts,
    6423);
  assert.ok(bundle.objects.every((row) =>
    row.expected_image.size_bytes > 0 &&
    row.expected_image.content_sha256 === row.content_sha256));
  assert.equal(validateMtgSealedDurableImagePlanV1(bundle).valid, true);
});
