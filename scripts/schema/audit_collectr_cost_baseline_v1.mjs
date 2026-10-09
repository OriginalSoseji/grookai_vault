// Fixed, read-only production429 baseline; no apply or release authority.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export function validateCostBaselineArguments(args) {
  assert.deepEqual(args, ['AuditLinkedSchema'], 'Read-only AuditLinkedSchema only; no overrides');
}
export function validateCostBaselineSources(sources, baseline) {
  assert.equal(Object.keys(baseline).length, 429);
  assert.equal(new Set(Object.keys(sources).map(n => n.split('_')[0])).size, Object.keys(sources).length);
  for (const [name, digest] of Object.entries(baseline)) assert.equal(sources[name], digest, name);
  const deferred = '20261005150000_vendor_receipt_delivery_v1.sql';
  const candidate = '20261008100000_collectr_sealed_cost_precision_v1.sql';
  const pending = Object.keys(sources).filter(n => !Object.hasOwn(baseline, n)).sort();
  assert.ok(JSON.stringify(pending) === JSON.stringify([deferred]) ||
    JSON.stringify(pending) === JSON.stringify([deferred, candidate]), 'Unexpected pending SQL');
  assert.equal(sources[deferred], 'b23a47b9892a5a2ccfc65f9fb81b350496ba560baaaab0ac8cd961d6eb2da84d');
  return pending;
}
export async function auditCostBaseline(args) {
  validateCostBaselineArguments(args);
  const root = fileURLToPath(new URL('../../', import.meta.url));
  assert.equal(fs.realpathSync(root).replaceAll('\\', '/').toLowerCase(), 'c:/gv_collectr_adventure_20261001');
  const prior = 'C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1';
  const read = n => JSON.parse(fs.readFileSync(prior + '/' + n));
  const freeze = read('freeze.json'), proof = read('replay-result.json');
  assert.equal(proof.status, 'passed'); assert.equal(proof.migrations, 429);
  assert.ok(proof.fullReplay && proof.noOpPush);
  const hash = b => createHash('sha256').update(b).digest('hex');
  const sources = Object.fromEntries(fs.readdirSync(root + 'supabase/migrations').filter(n => n.endsWith('.sql')).sort()
    .map(n => [n, hash(fs.readFileSync(root + 'supabase/migrations/' + n))]));
  const pending = validateCostBaselineSources(sources, freeze.sourceHashes);
  const {snapshotSql, compareSnapshots} = await import('./vendor_billing_schema_v1.mjs');
  const {query, ref, dbUrl} = await import('../release/storefront_production_live_common_v1.mjs');
  assert.equal(ref, 'ycdxbpibncqcchqiihfz'); assert.equal(new URL(dbUrl).hostname, ref + '.supabase.co');
  assert.ok(fs.readFileSync(root + 'supabase/config.toml', 'utf8').includes('project_id = "' + ref + '"'));
  const local = read('replayed.private.json'), remote = (await query(snapshotSql))[0].receipt;
  assert.equal(remote.read_only, 'on');
  assert.deepEqual(remote.LEDGER, Object.keys(freeze.sourceHashes).map(n => ({version: n.split('_')[0]})));
  assert.deepEqual(local.LEDGER, remote.LEDGER);
  assert.ok(remote.sanity.cards >= 40000 && remote.sanity.sets >= 150 && remote.sanity.traits >= 5000);
  const evidence = 'C:/grookai_vault_operator_artifacts/collectr_cost_precision_20261008';
  const out = evidence + '/baseline-' + Date.now(); fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(out + '/remote.private.json', JSON.stringify(remote), {flag: 'wx'});
  const comparison = await compareSnapshots(local, remote, {reconcile: true, output: out + '/comparison'});
  const receipt = {at: new Date().toISOString(), status: 'passed', migrations: 429, pending, comparison,
    sanity: remote.sanity, sourceHashes: sources, productionWrites: 0, applyAuthority: false, out};
  fs.writeFileSync(out + '/receipt.json', JSON.stringify(receipt, null, 2), {flag: 'wx'});
  fs.writeFileSync(evidence + '/BASELINE_429.json', JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({status: receipt.status, migrations: 429, comparison, sanity: remote.sanity, out}));
}
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  await auditCostBaseline(process.argv.slice(2));
}
