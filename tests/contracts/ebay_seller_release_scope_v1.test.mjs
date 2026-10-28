import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sellerReleaseCandidate, validateSellerReleaseInvocation, validateSellerReleaseInventory }
  from '../../scripts/schema/verify_ebay_seller_release_v1.mjs';
const out = 'C:/gv_intake_recovery_private_20261027/ebay-seller-release-gate-fixture';
const read = relative => fs.readFileSync(new URL('../../' + relative,import.meta.url));
const history = JSON.parse(read('docs/audits/reviewed_intake_date_release_20261028/release-manifest.json'));
const release = JSON.parse(read('docs/audits/ebay_seller_publisher_20261028/release-manifest.json'));
const files = Object.fromEntries([...Object.keys(history.migrationSources),sellerReleaseCandidate]
  .map(name => [name,read('supabase/migrations/' + name)]));
test('seller release scope accepts only its two read-only gate phases and a bounded new output path', () => {
  for (const phase of ['AuditLinkedSchema','PrePush']) assert.deepEqual(
    validateSellerReleaseInvocation([phase,'--out-dir=' + out]),{phase,out});
  for (const args of [['Apply','--out-dir=' + out],['PrePush'],['PrePush','--out-dir=' + out,'--apply'],
    ['PrePush','--out-dir=C:/grookai_vault'],['PrePush','--out-dir=' + out + '/../outside'],
    ['PrePush','--out-dir=' + out + '/child']]) assert.throws(() => validateSellerReleaseInvocation(args));
});
test('seller release preserves all 479 historical files and exactly its reviewed 480th payload', () => {
  assert.equal(validateSellerReleaseInventory(files,history.migrationSources,release.candidateSha256).length,480);
  for (const name of [Object.keys(history.migrationSources).at(-1),sellerReleaseCandidate]) {
    assert.throws(() => validateSellerReleaseInventory({...files,[name]:Buffer.from('changed')},history.migrationSources,release.candidateSha256));
  }
  const missing = {...files}; delete missing[sellerReleaseCandidate];
  assert.throws(() => validateSellerReleaseInventory(missing,history.migrationSources,release.candidateSha256));
  assert.throws(() => validateSellerReleaseInventory({...files,'20261028120000_unreviewed.sql':Buffer.from('select 1;')},history.migrationSources,release.candidateSha256));
});
test('PowerShell rejects combined scopes, unrelated pending IDs and environment overrides before network access', () => {
  const script = fileURLToPath(new URL('../../scripts/migration_preflight_strict.ps1',import.meta.url));
  for (const [expected,extras] of [['20261028112000',['-EbaySellerPublisherBaselineV1']],
    ['20261028120000',[]],['20261028112000',['-AuditEnvFile','other.env']],
    ['20261028112000',['-CollectorReviewedIntakeDateReleaseV1']]]) {
    assert.throws(() => execFileSync('pwsh',['-NoProfile','-File',script,'-Phase','PrePush',
      '-EbaySellerPublisherReleaseV1','-ExpectedLocalOnlyIds',expected,'-AuditOutDir',out,...extras],
    {stdio:'pipe',timeout:10000,windowsHide:true}),error => /Seller publisher release permits only/.test(String(error.stderr)));
  }
});
