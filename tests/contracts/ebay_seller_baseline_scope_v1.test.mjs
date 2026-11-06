import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateEbaySellerBaselineInvocation, validateEbaySellerBaselineInventory }
  from '../../scripts/schema/verify_ebay_seller_baseline_v1.mjs';

const out = 'C:/gv_intake_recovery_private_20261027/ebay-seller-baseline-fixture';
const manifest = JSON.parse(fs.readFileSync(new URL(
  '../../docs/audits/reviewed_intake_date_release_20261028/release-manifest.json', import.meta.url)));
const files = Object.fromEntries(Object.keys(manifest.migrationSources).map(name => [name,
  fs.readFileSync(new URL('../../supabase/migrations/' + name, import.meta.url))]));

test('seller baseline is read-only and accepts only a bounded new evidence directory', () => {
  assert.deepEqual(validateEbaySellerBaselineInvocation(['AuditLinkedSchema', '--out-dir=' + out]), { out });
  for (const args of [
    ['PrePush', '--out-dir=' + out], ['AuditLinkedSchema'],
    ['AuditLinkedSchema', '--out-dir=' + out, '--apply'],
    ['AuditLinkedSchema', '--out-dir=C:/grookai_vault'],
    ['AuditLinkedSchema', '--out-dir=' + out + '/../outside'],
    ['AuditLinkedSchema', '--out-dir=' + out + '/child'],
  ]) assert.throws(() => validateEbaySellerBaselineInvocation(args));
});

test('479 baseline preserves every frozen migration byte and rejects a forward candidate', () => {
  assert.equal(validateEbaySellerBaselineInventory(files, manifest.migrationSources).length, 479);
  const name = Object.keys(files).at(-1);
  assert.throws(() => validateEbaySellerBaselineInventory({ ...files, [name]: Buffer.from('changed') }, manifest.migrationSources));
  assert.throws(() => validateEbaySellerBaselineInventory({ ...files,
    '20261028120000_ebay_seller_publisher_v1.sql': Buffer.from('select 1;') }, manifest.migrationSources));
});

test('PowerShell baseline rejects apply, combined scopes and target overrides before network use', () => {
  const script = new URL('../../scripts/migration_preflight_strict.ps1', import.meta.url);
  for (const extra of [
    ['-Phase', 'PrePush'],
    ['-Phase', 'AuditLinkedSchema', '-CollectorReviewedIntakeDateReleaseV1'],
    ['-Phase', 'AuditLinkedSchema', '-ExpectedLocalOnlyIds', '20261028120000'],
    ['-Phase', 'AuditLinkedSchema', '-AuditEnvFile', 'other.env'],
  ]) {
    assert.throws(() => execFileSync('pwsh', ['-NoProfile', '-File', fileURLToPath(script),
      '-EbaySellerPublisherBaselineV1', '-AuditOutDir', out, ...extra],
    { stdio: 'pipe', timeout: 10000, windowsHide: true }),
    error => /Seller publisher baseline permits only/.test(String(error.stderr)));
  }
});
