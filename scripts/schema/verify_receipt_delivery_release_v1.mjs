// Read-only qualification for the forward receipt-delivery reconciliation.
// This gate inspects the live ledger and schema; it never applies SQL or enables sending.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export const receiptRelease = Object.freeze({
  migration: '20261015090000_vendor_receipt_delivery_reconcile_v1.sql',
  migrationSha256: '28712c17f17c088d8ea4f4cd0d396bc7d4d5d8d6105659f28b1cb650f1d88387',
  target: 'ycdxbpibncqcchqiihfz',
  previousProductionMigrations: 447,
});

export function validateReceiptReleaseArguments(args) {
  assert.equal(args.length, 1, 'Use AuditLinkedSchema or PrePush only');
  assert.ok(['AuditLinkedSchema', 'PrePush'].includes(args[0]), 'No apply operation or target override');
  return args[0];
}

export function validateReceiptMigrationSources(sources, baseline) {
  const names = Object.keys(sources).sort();
  const prior = Object.keys(baseline).sort();
  assert.equal(new Set(names.map(name => name.split('_')[0])).size, names.length, 'Duplicate migration timestamp');
  for (const name of prior) assert.equal(sources[name], baseline[name], name);
  const pending = names.filter(name => !Object.hasOwn(baseline, name));
  assert.deepEqual(pending, [receiptRelease.migration]);
  assert.equal(sources[receiptRelease.migration], receiptRelease.migrationSha256);
}

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = process.env.GROOKAI_RECEIPT_RELEASE_ROOT ?? process.cwd();
const evidenceRoot = process.env.GROOKAI_RECEIPT_RELEASE_EVIDENCE ?? 'C:/grookai_vault_operator_artifacts/receipt_delivery_20261015';
const activeMigrationNames = () => fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(name => name.endsWith('.sql'))
  .sort();
const sourceHashes = () => Object.fromEntries(activeMigrationNames().map(name => [name, hash(fs.readFileSync(path.join(root, 'supabase/migrations', name)))]));
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', windowsHide: true}).trim();

async function readProductionState() {
  const {query} = await import('../release/storefront_production_live_common_v1.mjs');
  const rows = await query(`select json_build_object(
    'migration_count',(select count(*) from supabase_migrations.schema_migrations),
    'latest',(select max(version) from supabase_migrations.schema_migrations),
    'has_candidate',(select exists(select 1 from supabase_migrations.schema_migrations where version='20261015090000')),
    'has_deferred',(select exists(select 1 from supabase_migrations.schema_migrations where version='20261005150000')),
    'receipt_tables',(select count(*) from information_schema.tables where table_schema='public' and table_name in ('vendor_receipt_delivery_control','vendor_receipt_deliveries')),
    'cost_applied',(select exists(select 1 from supabase_migrations.schema_migrations where version='20261007180000'))
  ) as state;`);
  return rows[0].state;
}

export async function verifyReceiptDeliveryRelease(phase) {
  validateReceiptReleaseArguments([phase]);
  assert.ok(fs.existsSync(path.join(root, 'supabase/migrations', receiptRelease.migration)), 'Forward receipt migration is missing');
  const sources = sourceHashes();
  assert.equal(sources[receiptRelease.migration], receiptRelease.migrationSha256, 'Forward receipt migration hash changed');
  const production = await readProductionState();
  assert.equal(production.has_deferred, false, 'Deferred receipt migration unexpectedly appears in production ledger');
  assert.equal(production.cost_applied, true, 'Vendor cost migration is not present in production ledger');
  assert.ok(Number(production.migration_count) >= receiptRelease.previousProductionMigrations);
  assert.match(String(production.latest), /^20261014|^20261015/);
  if (phase === 'PrePush') {
    assert.equal(git('status', '--porcelain'), '', 'Committed clean source required');
    const main = git('ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0];
    assert.match(main, /^[a-f0-9]{40}$/);
    execFileSync('git', ['merge-base', '--is-ancestor', main, 'HEAD'], {cwd: root, windowsHide: true});
  }
  fs.mkdirSync(evidenceRoot, {recursive: true});
  const out = path.join(evidenceRoot, `release-gate-${phase}-${Date.now()}`);
  fs.mkdirSync(out, {recursive: true});
  const pending = production.has_candidate ? [] : [receiptRelease.migration.split('_')[0]];
  const result = {
    version: 'RECEIPT_DELIVERY_FORWARD_RELEASE_GATE_V1',
    status: 'passed', at: new Date().toISOString(), phase, target: receiptRelease.target,
    production, pending, sourceHashes: sources, sourceTree: git('write-tree'), commit: git('rev-parse', 'HEAD'),
    productionWrites: 0, actualMessagesSent: 0, applyAuthority: false, out,
  };
  fs.writeFileSync(path.join(out, 'receipt.json'), JSON.stringify(result, null, 2), {flag: 'wx'});
  fs.writeFileSync(path.join(evidenceRoot, `Release-${phase}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  return result;
}

if (process.argv[1]?.endsWith('verify_receipt_delivery_release_v1.mjs')) {
  await verifyReceiptDeliveryRelease(validateReceiptReleaseArguments(process.argv.slice(2)));
}
