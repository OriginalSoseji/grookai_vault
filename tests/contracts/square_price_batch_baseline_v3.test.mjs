import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {assertSquareForwardSourceV4} from './helpers/square_forward_source_v4.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = name => JSON.parse(fs.readFileSync(root + '/scripts/schema/' + name));

test('Square V3 extends the unchanged canonical523 prefix with forward-only copies of the qualified six payloads', () => {
  const catalog = read('best_of_game_discovery_candidate_v17.json');
  const current = read('square_price_batch_candidate_v3.json');
  const previous = read('square_price_batch_candidate_v2.json');
  assertSquareForwardSourceV4(root, {...catalog.history, ...catalog.candidates});
  assert.deepEqual(Object.values(current.candidates), Object.values(previous.candidates));
  const lastCanonical = Object.keys(current.history).sort().at(-1).slice(0, 14);
  for (const [file, hash] of Object.entries(current.candidates)) {
    assert.ok(file.slice(0, 14) > lastCanonical);
    assert.equal(createHash('sha256').update(fs.readFileSync(root + '/supabase/migrations/' + file)).digest('hex'), hash);
  }
});

const rejected = 'C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/bulk-authority-v1/current-main-523-v1/rejected-v3-contract-tests';
for (const [label, args] of [
  ['PrePush', ['-Phase', 'PrePush']],
  ['expected-ID override', ['-Phase', 'AuditLinkedSchema', '-ExpectedLocalOnlyIds', '20261124230000']],
  ['environment override', ['-Phase', 'AuditLinkedSchema', '-AuditEnvFile', 'C:/unapproved-target.env']],
  ['mixed V2 scope', ['-Phase', 'AuditLinkedSchema', '-SquarePriceBatchBaselineV2']],
  ['mixed catalog scope', ['-Phase', 'AuditLinkedSchema', '-BestOfGameDiscoveryReleaseV17']],
]) {
  test('Square audit-only V3 rejects ' + label + ' before creating output or opening a database', () => {
    assert.equal(fs.existsSync(rejected), false);
    const result = spawnSync('pwsh', ['-NoProfile', '-File', root + '/scripts/migration_preflight_strict.ps1',
      '-SquarePriceBatchBaselineV3', ...args, '-AuditOutDir', rejected],
    {cwd: root, encoding: 'utf8', windowsHide: true, timeout: 15000});
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, label === 'mixed catalog scope'
      ? /no mixed scopes/ : /Square.*V3|SQUARE.*V3|SquarePriceBatchBaselineV3/);
    assert.equal(fs.existsSync(rejected), false);
  });
}
