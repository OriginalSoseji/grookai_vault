import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateSquareBaselineArgs, validateSquareBaselineSources, validateSquareBaselineSnapshots} from '../../scripts/schema/verify_square_baseline_v1.mjs';

const out = '--out-dir=C:/grookai_vault_operator_artifacts/square_sync_20261110/baseline-fixture';
test('baseline invocation rejects apply, target overrides, traversal and unbounded outputs', () => {
  assert.ok(validateSquareBaselineArgs(['AuditLinkedSchema', out]));
  for (const args of [['PrePush', out], ['AuditLinkedSchema', out, '--expected-pending=1'],
    ['AuditLinkedSchema', '--out-dir=C:/tmp/baseline-fixture'],
    ['AuditLinkedSchema', out + '/../other'], ['AuditLinkedSchema', out + '/nested']]) {
    assert.throws(() => validateSquareBaselineArgs(args));
  }
});

function inventory() {
  const files = Object.fromEntries(Array.from({length: 482}, (_, i) => [`${20250101000000n + BigInt(i)}_fixture.sql`, Buffer.from('fixture-' + i)]));
  files['20261110090000_fixture.sql'] = Buffer.from('last-fixture');
  const expected = Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, createHash('sha256').update(bytes).digest('hex')]));
  return {files, expected};
}
test('483 historical bytes must match; changed files, missing source and added candidates fail', () => {
  const {files, expected} = inventory();
  assert.equal(validateSquareBaselineSources(files, expected).length, 483);
  const first = Object.keys(files)[0];
  assert.throws(() => validateSquareBaselineSources({...files, [first]: Buffer.from('changed')}, expected));
  assert.throws(() => validateSquareBaselineSources({...files, '20261110190000_square.sql': Buffer.from('candidate')}, expected));
  delete files[first]; assert.throws(() => validateSquareBaselineSources(files, expected));
});

test('snapshot verification rejects failed read-only mode, ledger/security drift and wrong environment counts', () => {
  const versions = Array.from({length: 483}, (_, i) => String(i));
  const snapshot = {read_only: 'on', LEDGER: versions.map(version => ({version})),
    SECURITY: Array.from({length: 1395}, (_, i) => ({name: 'object-' + i, acl: ['owner']})),
    sanity: {cards: 172427, sets: 3412, traits: 47409}};
  validateSquareBaselineSnapshots(snapshot, structuredClone(snapshot), versions);
  for (const change of [remote => {remote.read_only = 'off';}, remote => {remote.LEDGER.pop();},
    remote => {remote.SECURITY[0].acl = ['public'];}, remote => {remote.SECURITY.pop();},
    remote => {remote.sanity.cards = 0;}]) {
    const remote = structuredClone(snapshot); change(remote);
    assert.throws(() => validateSquareBaselineSnapshots(snapshot, remote, versions));
  }
});

test('PowerShell dispatch rejects mixed/PrePush/pending scopes before launching the verifier', () => {
  const script = fileURLToPath(new URL('../../scripts/migration_preflight_strict.ps1', import.meta.url));
  for (const flags of [['-Phase', 'PrePush'], ['-Phase', 'AuditLinkedSchema', '-ExpectedLocalOnlyIds', '20261110190000'],
    ['-Phase', 'AuditLinkedSchema', '-EbaySellerPublisherBaselineV1']]) {
    const result = spawnSync('pwsh', ['-NoProfile', '-File', script, '-SquareBaselineV1',
      '-AuditOutDir', out.slice('--out-dir='.length), ...flags], {encoding: 'utf8', windowsHide: true});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Square baseline permits only read-only/);
    assert.equal((result.stdout + result.stderr).includes('REMOTE read-only:'), false);
  }
});
