import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const gate = new URL('../../scripts/migration_preflight_strict.ps1', import.meta.url);
const script = fs.readFileSync(gate, 'utf8');
const verifier = fs.readFileSync(new URL('../../scripts/schema/verify_collector_cameo_replay_v1.mjs', import.meta.url), 'utf8');

for (const args of [[], ['-ExpectedLocalOnlyIds', '20260912050000,20260912060000'],
  ['-ExpectedLocalOnlyIds', '20260912050000', '-ReconciledReplayAudit']]) {
  test(`collector gate rejects invalid scope before any external command: ${args.join(' ')}`, () => {
    const result = spawnSync('pwsh', ['-NoProfile', '-File', gate.pathname.replace(/^\//, ''),
      '-Phase', 'PrePush', '-CollectorCameoIsolatedReplay', ...args], {encoding:'utf8',windowsHide:true});
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /requires only 20260912050000/);
    assert.doesNotMatch(result.stdout, /step \d+ start:/);
  });
}

test('existing strict checks precede isolated reset and normal replay remains default', () => {
  const reset = script.lastIndexOf('scripts/schema/verify_collector_cameo_replay_v1.mjs');
  for (const check of ['FAIL - Remote-Only Migration IDs', 'FAIL - Unexpected Local-Only Pending Set',
    'FAIL - Duplicate Index Names In Pending Migrations', 'FAIL - Duplicate View Names In Pending Migrations',
    'FAIL - Duplicate Function Signatures In Pending Migrations']) {
    assert.ok(script.indexOf(check) > 0 && script.indexOf(check) < reset);
  }
  assert.match(script, /if \(\$CollectorCameoIsolatedReplay\) \{[\s\S]*verify_collector_cameo_replay_v1\.mjs[\s\S]*\} else \{\s*\$resetResult = Invoke-SupabaseCommand/);
});

test('isolated verifier binds real path, config, inventory, bytes, port, empty data and reset success', () => {
  for (const requirement of ['fs.realpath(out)', 'plan.configSha256', 'HostPort', "'56530'",
    "'0|0|0'", "'Migration inventory changed'", "'Source changed'", "'Replay copy changed'",
    "'No arbitrary target or operation'", 'assert.equal(run.status,0', 'assert.deepEqual(ledger,']) {
    assert.ok(verifier.includes(requirement), requirement);
  }
  assert.match(verifier, /supabase db reset --workdir '\$\{out\}' --local --yes/);
  assert.ok(verifier.indexOf("'0|0|0'") < verifier.indexOf("const run=spawnSync"));
  assert.ok(verifier.indexOf("'Migration inventory changed'") < verifier.indexOf("const run=spawnSync"));
});
