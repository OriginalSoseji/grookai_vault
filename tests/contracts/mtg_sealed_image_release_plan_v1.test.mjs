import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { gunzipSync } from 'node:zlib';

import {
  buildMtgSealedImageReleasePlanV1,
  hashMtgSealedImageReleasePlanV1,
  imageReleaseManifestFingerprintV1,
  postgresJsonbArrayTextV1,
  validateMtgSealedImageReleasePlanV1,
} from '../../backend/pricing/mtg_sealed_image_release_plan_v1.mjs';

function coverage(index, overrides = {}) {
  const sha = overrides.sha ?? hashMtgSealedImageReleasePlanV1(`image-${index}`);
  const eligible = overrides.classification !== 'invalid_image';
  const productId = 1000 + index;
  return {
    release_member_id: `00000000-0000-0000-0001-${String(index).padStart(12, '0')}`,
    member_fingerprint: hashMtgSealedImageReleasePlanV1(`member-${index}`),
    game_key: 'mtg',
    variant_id: `00000000-0000-0000-0002-${String(index).padStart(12, '0')}`,
    source_mapping_id: `00000000-0000-0000-0003-${String(index).padStart(12, '0')}`,
    source_provider: 'tcgplayer',
    source_category_id: 1,
    source_group_id: 10,
    source_product_id: productId,
    source_image_url:
      `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_200w.jpg`,
    classification: eligible ? 'exact_image_ready' : 'invalid_image',
    retrieval: {
      retrieved_at: '2026-09-04T00:00:00.000Z',
      selected_role: eligible ? 'tcgplayer_source_high_resolution' : null,
      selected_source_url: eligible
        ? `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_1000x1000.jpg`
        : null,
      http_status: eligible ? 200 : null,
    },
    image: eligible ? {
      valid_image: true,
      placeholder_suspected: false,
      format: 'jpeg',
      content_type: 'image/jpeg',
      width: 500,
      height: 700,
      size_bytes: 10_000,
      sha256: sha,
    } : null,
    ...overrides,
  };
}

function fixture() {
  const sharedSha = hashMtgSealedImageReleasePlanV1('shared-image');
  const coverageRows = [
    coverage(1, { sha: sharedSha, classification: 'shared_bytes_exact_variant' }),
    coverage(2, { sha: sharedSha, classification: 'shared_bytes_exact_variant' }),
    coverage(3, { classification: 'invalid_image', image: null }),
  ];
  const objectPath = `sealed/mtg/sha256/${sharedSha.slice(0, 2)}/${sharedSha}.jpg`;
  const durableObjects = [{
    content_sha256: sharedSha,
    target_storage_bucket: 'user-card-images',
    durable_object_path: objectPath,
    expected_image: {
      content_sha256: sharedSha,
      content_type: 'image/jpeg',
      format: 'jpeg',
      width: 500,
      height: 700,
      size_bytes: 10_000,
    },
  }];
  const durableResults = [{
    object_path: objectPath,
    status: 'uploaded_and_exact_readback_verified',
    exact_readback: {
      valid_image: true,
      placeholder_suspected: false,
      content_type: 'image/jpeg',
      format: 'jpeg',
      width: 500,
      height: 700,
      size_bytes: 10_000,
      sha256: sharedSha,
    },
  }];
  return buildMtgSealedImageReleasePlanV1({
    coverageRows,
    coverageSummary: {
      release_id: '11111111-1111-5111-8111-111111111111',
      source_plan_fingerprint_sha256: 'a'.repeat(64),
      coverage_fingerprint_sha256: 'b'.repeat(64),
      repository: { commit_sha: 'c'.repeat(40) },
    },
    coverageManifest: { workflow: { producer_sha: 'c'.repeat(40) } },
    durableObjects,
    durablePlan: { plan_fingerprint_sha256: 'd'.repeat(64) },
    durableResults,
    durableSummary: { execution_fingerprint_sha256: 'e'.repeat(64) },
    verifiedAtByObjectPath: new Map([[objectPath, '2026-09-05T00:00:00.000Z']]),
    repositoryCommitSha: 'f'.repeat(40),
    productionSnapshot: { valid: true, current_image_release_id: null },
  });
}

const fixtureCounts = {
  source_members: 3,
  evidence: 3,
  eligible_variants: 2,
  exclusions: 1,
  objects: 1,
  assertions: 2,
  releases: 1,
  release_members: 2,
};

test('builds one traceable evidence backbone with shared object bytes', () => {
  const bundle = fixture();
  assert.equal(bundle.payload.evidence.length, 3);
  assert.equal(bundle.payload.objects.length, 1);
  assert.equal(bundle.payload.assertions.length, 2);
  assert.equal(bundle.payload.release_members.length, 2);
  assert.equal(bundle.exclusions.length, 1);
  assert.equal(validateMtgSealedImageReleasePlanV1(bundle, fixtureCounts).valid, true);
  for (const assertion of bundle.payload.assertions) {
    assert.ok(bundle.payload.evidence.some((row) =>
      row.id === assertion.image_evidence_id));
    assert.ok(bundle.payload.objects.some((row) =>
      row.id === assertion.image_object_id));
  }
});

test('PostgreSQL jsonb array serialization and release manifest are deterministic', () => {
  assert.equal(postgresJsonbArrayTextV1(['a', 2, ['b', null]]),
    '["a", 2, ["b", null]]');
  const left = fixture();
  const right = fixture();
  assert.equal(left.plan.plan_fingerprint_sha256,
    right.plan.plan_fingerprint_sha256);
  assert.equal(left.payload.releases[0].manifest_fingerprint,
    imageReleaseManifestFingerprintV1(left.payload.releases[0],
      left.payload.release_members));
});

test('eligible evidence without an exact durable object fails closed', () => {
  const bundle = fixture();
  const inputs = {
    coverageRows: bundle.payload.evidence,
  };
  assert.ok(inputs.coverageRows.length > 0);
  const original = fixture();
  original.payload.objects.length = 0;
  const validation = validateMtgSealedImageReleasePlanV1(original, fixtureCounts);
  assert.equal(validation.valid, false);
  assert.ok(validation.findings.includes('object_count_mismatch'));
  assert.ok(validation.findings.some((finding) =>
    finding.startsWith('assertion_reference_missing:')));
});

test('fingerprint, release, and pointer drift cannot validate', () => {
  const bundle = fixture();
  bundle.payload.release_members[0].member_fingerprint = '0'.repeat(64);
  bundle.plan.pointer_transition.included_in_current_apply_gate = true;
  bundle.plan.production_snapshot.valid = false;
  const validation = validateMtgSealedImageReleasePlanV1(bundle, fixtureCounts);
  assert.equal(validation.valid, false);
  assert.ok(validation.findings.includes('plan_fingerprint_mismatch'));
  assert.ok(validation.findings.some((finding) =>
    finding.startsWith('release_member_fingerprint_mismatch:')));
  assert.ok(validation.findings.includes('release_manifest_mismatch'));
  assert.ok(validation.findings.includes('pointer_included_in_apply_gate'));
  assert.ok(validation.findings.includes('production_snapshot_invalid'));
});

test('planning gate includes no mutation client, provider, or Storage operation', () => {
  const source = fs.readFileSync(
    'scripts/audits/mtg_sealed_image_release_plan_v1.mjs', 'utf8');
  assert.doesNotMatch(source, /\.storage\b|\.upload\s*\(|\.remove\s*\(|\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(insert|update|delete|truncate|alter|create)\s+(?:into|table|from)?\s*public\./i);
  assert.match(source, /withReadOnlyClient/);
  assert.match(source, /assertAuditOnlyArgs/);
});

test('preserved durable corpus builds exact 2182/2141/2149 release shape', () => {
  const coverageRoot =
    'docs/audits/pricing/mtg_sealed_image_coverage_v1/2026-09-04_live_33841181449';
  const planRoot =
    'docs/audits/pricing/mtg_sealed_durable_image_plan_v1/2026-09-04T22-07-02Z_offline';
  const executionRoot =
    'docs/audits/pricing/mtg_sealed_durable_image_storage_v1/2026-09-05T00-34-15Z_passed';
  const coverageRows = gunzipSync(fs.readFileSync(`${coverageRoot}/coverage.jsonl.gz`))
    .toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const durableObjects = gunzipSync(fs.readFileSync(`${planRoot}/objects.jsonl.gz`))
    .toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const durableResults = gunzipSync(fs.readFileSync(
    `${executionRoot}/object_results.jsonl.gz`)).toString('utf8')
    .split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const verifiedAtByObjectPath = new Map((fs.readFileSync(
    `${executionRoot}/execution_journal.jsonl`, 'utf8')).split(/\r?\n/)
    .filter(Boolean).map(JSON.parse).filter((row) => row.event === 'object_terminal')
    .map((row) => [row.object_path, row.recorded_at]));
  const bundle = buildMtgSealedImageReleasePlanV1({
    coverageRows,
    coverageSummary: JSON.parse(fs.readFileSync(`${coverageRoot}/summary.json`)),
    coverageManifest: JSON.parse(fs.readFileSync(
      `${coverageRoot}/permanent_manifest.json`)),
    durableObjects,
    durablePlan: JSON.parse(fs.readFileSync(`${planRoot}/run_plan.json`)),
    durableResults,
    durableSummary: JSON.parse(fs.readFileSync(`${executionRoot}/summary.json`)),
    verifiedAtByObjectPath,
    repositoryCommitSha: 'f'.repeat(40),
    productionSnapshot: { valid: true, current_image_release_id: null },
  });
  assert.equal(bundle.payload.evidence.length, 2182);
  assert.equal(bundle.payload.objects.length, 2141);
  assert.equal(bundle.payload.assertions.length, 2149);
  assert.equal(bundle.payload.release_members.length, 2149);
  assert.equal(bundle.exclusions.length, 33);
  assert.equal(validateMtgSealedImageReleasePlanV1(bundle).valid, true);
});
