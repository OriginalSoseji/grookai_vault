import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sellerRecoveryReleaseCandidate, validateSellerRecoveryReleaseInvocation, validateSellerRecoveryReleaseInventory }
  from '../../scripts/schema/verify_ebay_seller_recovery_release_v1.mjs';
import { validateSellerReleaseInventory } from '../../scripts/schema/verify_ebay_seller_release_v1.mjs';
const out = 'C:/gv_intake_recovery_private_20261027/ebay-seller-recovery-release-gate-fixture';
const read = relative => fs.readFileSync(new URL('../../' + relative,import.meta.url));
const history = JSON.parse(read('docs/audits/reviewed_intake_date_release_20261028/release-manifest.json'));
const release = JSON.parse(read('docs/audits/ebay_seller_publisher_20261028/recovery-release-manifest.json'));
const old = JSON.parse(read('docs/audits/ebay_seller_publisher_20261028/release-manifest.json'));
const publisher = '20261028112000_ebay_seller_publisher_v1.sql';
const files = Object.fromEntries([...Object.keys(history.migrationSources),publisher,sellerRecoveryReleaseCandidate]
  .map(name => [name,read('supabase/migrations/' + name)]));

test('recovery scope accepts only read-only qualification phases and a new bounded private output', () => {
  for (const phase of ['AuditLinkedSchema','PrePush']) assert.deepEqual(
    validateSellerRecoveryReleaseInvocation([phase,'--out-dir=' + out]),{phase,out});
  for (const args of [['Apply','--out-dir=' + out],['PrePush'],['PrePush','--out-dir=' + out,'--apply'],
    ['PrePush','--out-dir=C:/grookai_vault'],['PrePush','--out-dir=' + out + '/../outside'],
    ['PrePush','--out-dir=' + out + '/child']]) assert.throws(() => validateSellerRecoveryReleaseInvocation(args));
});

test('recovery preserves 479 historical sources and frozen480 with exactly one forward recovery file', () => {
  assert.equal(validateSellerRecoveryReleaseInventory(files,history.migrationSources,release.candidateSha256).length,481);
  for (const name of [Object.keys(history.migrationSources).at(-1),publisher,sellerRecoveryReleaseCandidate]) {
    assert.throws(() => validateSellerRecoveryReleaseInventory({...files,[name]:Buffer.from('changed')},history.migrationSources,release.candidateSha256));
    const missing = {...files}; delete missing[name];
    assert.throws(() => validateSellerRecoveryReleaseInventory(missing,history.migrationSources,release.candidateSha256));
  }
  assert.throws(() => validateSellerRecoveryReleaseInventory({...files,'20261028180000_unreviewed.sql':Buffer.from('select 1;')},history.migrationSources,release.candidateSha256));
  assert.throws(() => validateSellerReleaseInventory(files,history.migrationSources,old.candidateSha256));
});

test('recovery PowerShell rejects partial IDs, duplicates, combined scopes and overrides before network access', () => {
  const script = fileURLToPath(new URL('../../scripts/migration_preflight_strict.ps1',import.meta.url));
  const exact='20261028112000,20261028174000';
  for (const [expected,extras] of [['20261028112000',[]],['20261028174000',[]],
    [exact+',20261028174000',[]],[exact,['-EbaySellerPublisherReleaseV1']],
    [exact,['-EbaySellerPublisherBaselineV1']],[exact,['-AuditEnvFile','other.env']],
    [exact,['-CollectorReviewedIntakeDateReleaseV1']]]) {
    assert.throws(() => execFileSync('pwsh',['-NoProfile','-File',script,'-Phase','PrePush',
      '-EbaySellerPublisherRecoveryReleaseV1','-ExpectedLocalOnlyIds',expected,'-AuditOutDir',out,...extras],
    {stdio:'pipe',timeout:10000,windowsHide:true}),error => /Seller publisher recovery release permits only/.test(String(error.stderr)));
  }
});
