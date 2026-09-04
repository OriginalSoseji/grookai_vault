import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { gunzipSync } from 'node:zlib';

import {
  buildMtgSealedTransientImageCanaryPlanV1,
  validateMtgSealedCoverageArtifactBundleV1,
  validateMtgSealedTransientImageCanaryPlanV1,
} from '../../backend/pricing/mtg_sealed_image_canary_plan_v1.mjs';

const candidatePath =
  'docs/sql/mtg_sealed_image_evidence_and_release_v1_migration_candidate.sql';
const sql = fs.readFileSync(candidatePath, 'utf8');
const auditRoot =
  'docs/audits/pricing/mtg_sealed_image_schema_candidate_v1/2026-09-04_offline';
const coverageRoot =
  'docs/audits/pricing/mtg_sealed_image_coverage_v1/2026-09-04_live_33841181449';

function row(index, overrides = {}) {
  const hash = index.toString(16).padStart(64, '0');
  return {
    release_id: '25626032-7d72-5542-a8e0-7a6532c2f776',
    release_member_id: `00000000-0000-0000-0001-${String(index).padStart(12, '0')}`,
    variant_id: `00000000-0000-0000-0002-${String(index).padStart(12, '0')}`,
    source_mapping_id: `00000000-0000-0000-0003-${String(index).padStart(12, '0')}`,
    game_key: 'mtg',
    canonical_name: `Fixture ${index}`,
    package_form: ['pack', 'box', 'deck', 'kit'][index % 4],
    source_product_id: index,
    classification: index === 1
      ? 'shared_bytes_exact_variant' : 'exact_image_ready',
    retrieval: {
      selected_source_url: `https://tcgplayer-cdn.tcgplayer.com/product/${index}.jpg`,
      selected_role: 'tcgplayer_source_high_resolution',
    },
    image: {
      valid_image: true, placeholder_suspected: false, format: 'jpeg',
      content_type: 'image/jpeg', width: 600, height: 1000,
      size_bytes: 10000 + index, sha256: hash,
    },
    proposed_storage_path: `sealed/mtg/sha256/${hash.slice(0, 2)}/${hash}.jpg`,
    ...overrides,
  };
}

test('candidate remains outside the active migration directory', () => {
  assert.equal(fs.existsSync(candidatePath), true);
  assert.equal(fs.existsSync(
    'supabase/migrations/20260904000000_mtg_sealed_image_evidence_and_release_v1.sql'),
  false);
  assert.match(sql, /Review artifact only/);
});

test('candidate and offline canary artifacts retain frozen hashes', () => {
  const manifest = JSON.parse(fs.readFileSync(
    `${auditRoot}/candidate_manifest.json`, 'utf8'));
  const hashes = JSON.parse(fs.readFileSync(
    `${auditRoot}/artifact_hashes.json`, 'utf8'));
  assert.equal(crypto.createHash('sha256').update(sql).digest('hex'),
    manifest.migration_candidate.sha256);
  assert.equal(manifest.migration_candidate.active_migration, false);
  assert.equal(manifest.migration_candidate.applied, false);
  assert.equal(manifest.transient_canary.executed, false);
  for (const [name, evidence] of Object.entries(hashes.artifacts)) {
    const bytes = fs.readFileSync(`${auditRoot}/${name}`);
    assert.equal(bytes.length, evidence.bytes, `${name} byte count`);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
      evidence.sha256, `${name} SHA-256`);
  }
});

test('candidate defines exact evidence, objects, assertions, releases, and pointer', () => {
  for (const table of [
    'sealed_product_image_evidence', 'sealed_product_image_objects',
    'sealed_product_variant_image_assertions',
    'sealed_product_image_releases', 'sealed_product_image_release_members',
    'sealed_product_image_release_pointer',
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`, 'i'));
    assert.match(sql, new RegExp(
      `alter table public\\.${table} force row level security`, 'i'));
  }
  assert.match(sql, /shared_bytes_exact_variant/);
  assert.match(sql, /content_sha256/);
  assert.match(sql, /storage_readback_sha256 = content_sha256/);
  assert.match(sql, /source_release_member_id, variant_id, source_mapping_id/);
  assert.match(sql, /object\.content_sha256 = evidence\.content_sha256/);
  assert.match(sql, /object\.image_mime = evidence\.image_mime/);
  assert.match(sql, /object\.image_width = evidence\.image_width/);
  assert.match(sql, /object\.image_height = evidence\.image_height/);
  assert.match(sql, /object\.image_bytes = evidence\.image_bytes/);
  assert.match(sql, /image release source price release must be frozen/);
  assert.match(sql, /price_release\.release_state = 'frozen'/);
});

test('candidate is append-only, service-owned, and has compare-and-swap activation', () => {
  for (const trigger of [
    'sealed_product_image_evidence_append_only',
    'sealed_product_image_objects_append_only',
    'sealed_product_variant_image_assertions_append_only',
    'sealed_product_image_release_members_append_only',
  ]) assert.match(sql, new RegExp(`create trigger ${trigger}`, 'i'));
  assert.match(sql, /active image release changed concurrently/);
  assert.match(sql, /p_expected_current_image_release_id/);
  assert.match(sql, /revoke all on public\.sealed_product_image_evidence[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(sql, /grant select, insert on public\.sealed_product_image_evidence to service_role/i);
  assert.doesNotMatch(sql, /grant [^;]+ to anon|grant [^;]+ to authenticated/i);
  assert.doesNotMatch(sql, /create (?:or replace )?function public\.get_/i);
});

test('17-object canary plan is deterministic, diverse, and zero-call', () => {
  const rows = Array.from({ length: 30 }, (_, index) => row(index + 1));
  const left = buildMtgSealedTransientImageCanaryPlanV1(rows, { count: 17 });
  const right = buildMtgSealedTransientImageCanaryPlanV1(rows.reverse(), {
    count: 17,
  });
  assert.equal(left.plan_fingerprint_sha256, right.plan_fingerprint_sha256);
  assert.equal(left.rows.length, 17);
  assert.equal(new Set(left.rows.map((item) => item.expected_image.content_sha256)).size,
    17);
  assert.ok(new Set(left.rows.map((item) => item.package_form)).size >= 4);
  assert.ok(left.rows.some((item) =>
    item.classification === 'shared_bytes_exact_variant'));
  assert.ok(Object.values(left.boundaries).every((value) => value === 0));
  assert.deepEqual(validateMtgSealedTransientImageCanaryPlanV1(left), {
    valid: true, findings: [],
  });
});

test('canary validation rejects unsafe upload and rollback semantics', () => {
  const plan = buildMtgSealedTransientImageCanaryPlanV1(
    Array.from({ length: 20 }, (_, index) => row(index + 1)), { count: 17 });
  plan.rows[0].upload_upsert = true;
  assert.equal(validateMtgSealedTransientImageCanaryPlanV1(plan).valid, false);
});

test('canary source bundle validates preserved bytes and coverage fingerprint', () => {
  const coverageCompressedBytes = fs.readFileSync(
    `${coverageRoot}/coverage.jsonl.gz`);
  const coverageUncompressedBytes = gunzipSync(coverageCompressedBytes);
  const summaryBytes = fs.readFileSync(`${coverageRoot}/summary.json`);
  const bundle = {
    rows: coverageUncompressedBytes.toString('utf8').split(/\r?\n/)
      .filter(Boolean).map((line) => JSON.parse(line)),
    summary: JSON.parse(summaryBytes.toString('utf8')),
    manifest: JSON.parse(fs.readFileSync(
      `${coverageRoot}/permanent_manifest.json`, 'utf8')),
    coverageCompressedBytes,
    coverageUncompressedBytes,
    summaryBytes,
  };
  assert.deepEqual(validateMtgSealedCoverageArtifactBundleV1(bundle), {
    valid: true,
    findings: [],
  });
  const tampered = structuredClone(bundle.rows);
  tampered[0].canonical_name = 'Tampered';
  const result = validateMtgSealedCoverageArtifactBundleV1({
    ...bundle,
    rows: tampered,
  });
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes('coverage_rows_fingerprint_mismatch'));
});
