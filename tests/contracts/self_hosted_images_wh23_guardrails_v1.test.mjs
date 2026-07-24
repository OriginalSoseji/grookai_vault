import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ALLOWED_APPLY_COLUMNS,
  HOSTED_CONVENTION_SAMPLES,
  POINTER_MUTATION_CONTRACT,
  assetDefinitions,
  observeImageBuffer,
  rowDefinitions,
} from '../../scripts/audits/self_hosted_images_wh23_common.mjs';

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('WH23 has the exact contiguous Pocket gap and preserves its namespace/domain', () => {
  const assets = assetDefinitions();
  const rows = rowDefinitions();
  assert.equal(assets.length, 27);
  assert.equal(rows.length, 27);
  assert.deepEqual(rows.map((row) => row.gv_id), Array.from({ length: 27 }, (_, index) => `GV-TCGP-P-A-${index + 74}`));
  assert.equal(new Set(rows.map((row) => row.gv_id)).size, 27);
  assert.ok(assets.every((row) => row.identity_domain === 'tcg_pocket_excluded'));
  assert.ok(assets.every((row) => row.set_code === null));
  assert.ok(assets.every((row) => row.owner_gv_id.startsWith('GV-TCGP-P-A-')));
});

test('WH23 pins one exact untransformed WebP and one functioning independent fallback per row', () => {
  for (const asset of assetDefinitions()) {
    assert.equal(new URL(asset.source_url).hostname, 'assets.pokemon-zone.com');
    assert.equal(new URL(asset.fallback_url).hostname, 'www.serebii.net');
    assert.deepEqual({ width: asset.source_expected.width, height: asset.source_expected.height, format: asset.source_expected.format }, { width: 367, height: 512, format: 'webp' });
    assert.deepEqual({ width: asset.fallback_expected.width, height: asset.fallback_expected.height, format: asset.fallback_expected.format }, { width: 367, height: 512, format: 'jpg' });
    assert.match(asset.source_expected.sha256, /^[a-f0-9]{64}$/);
    assert.match(asset.fallback_expected.sha256, /^[a-f0-9]{64}$/);
    assert.equal(asset.transformation, 'none_exact_primary_source_bytes');
    assert.equal(asset.quality_claim, 'highest_directly_verified_untransformed_full_card_source_available_at_acquisition_time');
  }
});

test('WH23 target paths match the existing Pocket content-addressed convention', () => {
  assert.equal(HOSTED_CONVENTION_SAMPLES.length, 4);
  assert.ok(HOSTED_CONVENTION_SAMPLES.every((row) => row.path.includes('/card_prints/unknown/gv-tcgp-p-a-')));
  for (const asset of assetDefinitions()) {
    assert.equal(asset.target_storage_path, `warehouse-derived/self-hosted-images-v1/card_prints/unknown/${asset.owner_gv_id.toLowerCase()}/${asset.source_expected.sha256.slice(0, 24)}.webp`);
    assert.equal(asset.overwrite_allowed, false);
  }
});

test('WH23 parses the Pocket WebP VP8X dimensions used by its source contract', () => {
  const fixture = Buffer.alloc(30);
  fixture.write('RIFF', 0, 'ascii');
  fixture.write('WEBP', 8, 'ascii');
  fixture.write('VP8X', 12, 'ascii');
  fixture.writeUIntLE(366, 24, 3);
  fixture.writeUIntLE(511, 27, 3);
  const observed = observeImageBuffer(fixture, 'image/webp');
  assert.equal(observed.width, 367);
  assert.equal(observed.height, 512);
  assert.equal(observed.format, 'webp');
});

test('WH23 limits the database mutation to hosted primary plus exact fallback state', () => {
  assert.deepEqual(ALLOWED_APPLY_COLUMNS, ['image_path', 'image_source', 'image_status', 'image_url']);
  assert.equal(POINTER_MUTATION_CONTRACT.atomicity, 'single_27_row_transaction');
  assert.equal(POINTER_MUTATION_CONTRACT.compare_and_swap, 'complete_to_jsonb_card_prints_row');
  assert.equal(POINTER_MUTATION_CONTRACT.storage_precondition, 'all_27_objects_sha256_and_dimensions_reverified_before_begin');
  assert.ok(!ALLOWED_APPLY_COLUMNS.includes('gv_id'));
  assert.ok(!ALLOWED_APPLY_COLUMNS.includes('set_id'));
  assert.ok(!ALLOWED_APPLY_COLUMNS.includes('set_code'));
  assert.ok(!ALLOWED_APPLY_COLUMNS.includes('identity_domain'));
  assert.ok(!ALLOWED_APPLY_COLUMNS.includes('image_alt_url'));
});

test('WH23 storage apply is opt-in, immutable, staged, and read-back verified', () => {
  const storageApply = source('scripts/audits/self_hosted_images_wh23b_pocket_native_storage_upload_apply.mjs');
  assert.match(storageApply, /if \(arg === '--apply'\) args\.apply = true/);
  assert.match(storageApply, /args\.fingerprint !== plan\.fingerprint/);
  assert.match(storageApply, /args\.planHash !== plan\.storage_plan_hash/);
  assert.match(storageApply, /stageAllAssets/);
  assert.match(storageApply, /upsert: false/);
  assert.match(storageApply, /downloadStorageImage/);
  assert.doesNotMatch(source('scripts/audits/self_hosted_images_wh23a_pocket_native_upload_dry_run.mjs'), /\.upload\(/);
});

test('WH23 database apply requires approvals and one complete-row CAS transaction', () => {
  const pointerApply = source('scripts/audits/self_hosted_images_wh23d_pocket_native_db_pointer_apply.mjs');
  assert.match(pointerApply, /if \(arg === '--apply'\) args\.apply = true/);
  assert.match(pointerApply, /args\.fingerprint !== plan\.fingerprint/);
  assert.match(pointerApply, /args\.pointerPlanHash !== plan\.pointer_plan_hash/);
  assert.match(pointerApply, /args\.mutationContractHash !== plan\.mutation_contract_hash/);
  assert.match(pointerApply, /verifyAllStorageAssets/);
  assert.match(pointerApply, /await client\.query\('begin'\)/);
  assert.match(pointerApply, /for update/);
  assert.match(pointerApply, /to_jsonb\(cp\) = \$\$\{beforeParam\}::jsonb/);
  assert.match(pointerApply, /Post-apply full readback mismatch/);
  assert.match(pointerApply, /await client\.query\('commit'\)/);
  assert.match(pointerApply, /await client\.query\('rollback'\)/);
});

test('WH23 pins the inherited Supabase TLS target implementation in its code bundle', () => {
  const common = source('scripts/audits/self_hosted_images_wh23_common.mjs');
  const inherited = source('scripts/audits/self_hosted_images_wh22_common.mjs');
  assert.match(common, /self_hosted_images_wh22_common\.mjs/);
  assert.match(common, /targetBindingFromEnvironment/);
  assert.match(common, /connectVerifiedDbClient/);
  assert.match(inherited, /807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa/);
  assert.match(inherited, /303b0a59bbc8d77e967fbed20b3fe68ec5d7d391c3081ece9936efceef0a55ea/);
  assert.match(inherited, /rejectUnauthorized: true/);
});

test('WH23 creates no migration and models storage as a mandatory preceding phase', () => {
  const pointerDryRun = source('scripts/audits/self_hosted_images_wh23c_pocket_native_db_pointer_dry_run.mjs');
  const pointerApply = source('scripts/audits/self_hosted_images_wh23d_pocket_native_db_pointer_apply.mjs');
  assert.match(pointerDryRun, /ready_for_db_apply_after_storage_phase/);
  assert.match(pointerDryRun, /ready_for_db_apply_now/);
  assert.match(pointerApply, /ready_for_apply_after_storage_phase/);
  assert.match(pointerApply, /storage_reverified_before_transaction: true/);
  assert.doesNotMatch(pointerApply, /create table|alter table|drop table/i);
});
