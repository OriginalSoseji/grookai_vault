// Fixed read-only production413 and retained413 replay comparison. No reset/apply.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { snapshotSql, compareSnapshots } from './vendor_billing_schema_v1.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const base = 'C:/grookai_vault_operator_artifacts/gamestop_duraludon_20261001/full-413-v1';
const out = 'C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const pending = ['20261001050000_jungle_edition_foundation_v1.sql','20261001203000_jungle_edition_price_reader_integration_v1.sql'];
const hash = b => createHash('sha256').update(b).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p));
assert.equal(process.argv.length, 2);
assert.ok(process.execArgv.includes('--use-system-ca'));
assert.equal(fs.realpathSync(root).replaceAll('\\', '/').toLowerCase(), 'c:/gv_jungle_edition_20261001');
assert.match(fs.readFileSync(root + 'supabase/config.toml', 'utf8'), /project_id = "ycdxbpibncqcchqiihfz"/);
const freeze = read(base + '/freeze.json'), proof = read(base + '/replay-result.json');
assert.equal(proof.status, 'passed'); assert.equal(proof.fullReplay, true);
assert.equal(proof.noOpPush, true); assert.equal(proof.migrations, 413);
const sources = Object.fromEntries(fs.readdirSync(root + 'supabase/migrations').filter(n => n.endsWith('.sql')).sort()
  .map(n => [n, hash(fs.readFileSync(root + 'supabase/migrations/' + n))]));
assert.equal(Object.keys(freeze.sourceHashes).length, 413);
for (const [n, h] of Object.entries(freeze.sourceHashes)) {
  assert.equal(sources[n], h, n); assert.equal(hash(fs.readFileSync(base + '/supabase/migrations/' + n)), h, n);
}
assert.ok(Object.keys(sources).filter(n => !freeze.sourceHashes[n]).every(n => pending.includes(n)));
const container = 'supabase_db_mapping-pricing-full-413-v1-20261001';
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 64*1024*1024 });
const db = JSON.parse(docker('inspect', container))[0];
assert.equal(db.State.Running, true); assert.equal(db.Config.Image, 'public.ecr.aws/supabase/postgres:17.6.1.113');
assert.deepEqual(Object.keys(db.NetworkSettings.Networks), ['mapping-pricing-full-413-v1-20261001']);
assert.equal(JSON.parse(docker('network', 'inspect', 'mapping-pricing-full-413-v1-20261001'))[0].Internal, true);
const local = JSON.parse(execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'],
  { input: snapshotSql, encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 64*1024*1024 }));
const ledger = Object.keys(freeze.sourceHashes).sort().map(n => ({ version: n.split('_')[0] }));
assert.deepEqual(local.LEDGER, ledger);
const directory = out + '/baseline-413-' + Date.now(); fs.mkdirSync(directory);
await compareSnapshots(local, read(base + '/replayed.private.json'), { output: directory + '/retained' });
const { query, ref } = await import('../release/storefront_production_live_common_v1.mjs');
assert.equal(ref, 'ycdxbpibncqcchqiihfz');
const remote = (await query(snapshotSql))[0].receipt;
assert.deepEqual(remote.LEDGER, ledger);
assert.ok(remote.sanity.cards >= 40000 && remote.sanity.sets >= 150 && remote.sanity.traits >= 5000);
fs.writeFileSync(directory + '/remote.private.json', JSON.stringify(remote), { flag: 'wx' });
const comparison = await compareSnapshots(local, remote, { reconcile: true, output: directory + '/production' });
const result = { at: new Date().toISOString(), status: 'passed', target: ref, migrations: 413,
  sourceHashes: sources, comparison, output: directory, productionWrites: 0, localWrites: 0, applyAuthority: false,
  qualifiedReplaySha256: hash(fs.readFileSync(base + '/replay-result.json')) };
fs.writeFileSync(directory + '/receipt.json', JSON.stringify(result, null, 2), { flag: 'wx' });
fs.writeFileSync(out + '/jungle-alias-baseline-413-latest.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.status, migrations: 413, comparison, productionWrites: 0, localWrites: 0, output: directory }));
