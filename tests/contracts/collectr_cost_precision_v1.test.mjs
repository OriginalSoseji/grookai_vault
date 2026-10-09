import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateCostBaselineArguments, validateCostBaselineSources} from '../../scripts/schema/audit_collectr_cost_baseline_v1.mjs';

test('precision migration preserves the writer and grants except the four-decimal guard', () => {
  const old = fs.readFileSync(new URL('../../supabase/migrations/20261005080000_collectr_sealed_import_v3.sql', import.meta.url), 'utf8');
  const candidate = fs.readFileSync(new URL('../../supabase/migrations/20261008100000_collectr_sealed_cost_precision_v1.sql', import.meta.url), 'utf8');
  const start = 'create or replace function public.admin_import_vault_collection_v3(';
  const original = old.slice(old.indexOf(start), old.indexOf('create or replace function public.get_collection_import_sealed_copies_v3(')).trim();
  const replacement = candidate.slice(candidate.indexOf(start)).replace(/\s*commit;\s*$/, '').trim();
  assert.equal(replacement, original.replace('round(cost,2)<>cost', 'round(cost,4)<>cost'));
  assert.equal((replacement.match(/round\(cost,4\)/g) ?? []).length, 1);
});

for (const args of [
  ['-Phase', 'PrePush', '-CollectrCostBaselineV1'],
  ['-Phase', 'AuditLinkedSchema', '-CollectrCostBaselineV1', '-SalesSplitPaymentsReleaseV1'],
  ['-Phase', 'AuditLinkedSchema', '-CollectrCostBaselineV1', '-AuditOutDir', 'C:/unexpected'],
]) test('PowerShell cost baseline rejects invalid scope before connecting: ' + args.join(' '), () => {
  const result = spawnSync('pwsh', ['-NoProfile', '-File', 'scripts/migration_preflight_strict.ps1', ...args], {encoding: 'utf8', timeout: 20000, windowsHide: true});
  assert.notEqual(result.status, 0);
  assert.match((result.stdout ?? '') + (result.stderr ?? ''), /Collectr cost baseline permits read-only AuditLinkedSchema only/);
});

test('baseline gate rejects apply, overrides, historical edits and unrelated SQL', () => {
  validateCostBaselineArguments(['AuditLinkedSchema']);
  for (const args of [[], ['PrePush'], ['apply'], ['AuditLinkedSchema', '--target', 'other']]) assert.throws(() => validateCostBaselineArguments(args));
  const baseline = Object.fromEntries(Array.from({length: 429}, (_, i) => [String(20200000000000 + i) + '_fixture.sql', String(i)]));
  const deferred = '20261005150000_vendor_receipt_delivery_v1.sql';
  const sources = {...baseline, [deferred]: 'b23a47b9892a5a2ccfc65f9fb81b350496ba560baaaab0ac8cd961d6eb2da84d'};
  assert.deepEqual(validateCostBaselineSources(sources, baseline), [deferred]);
  const candidate = '20261008100000_collectr_sealed_cost_precision_v1.sql';
  assert.deepEqual(validateCostBaselineSources({...sources, [candidate]: 'local-unqualified'}, baseline), [deferred, candidate]);
  assert.throws(() => validateCostBaselineSources({...sources, [Object.keys(baseline)[0]]: 'changed'}, baseline));
  assert.throws(() => validateCostBaselineSources({...sources, [deferred]: 'changed'}, baseline));
  assert.throws(() => validateCostBaselineSources({...sources, '20261008110000_other.sql': 'other'}, baseline));
  assert.throws(() => validateCostBaselineSources({...sources, '20200000000000_duplicate.sql': 'other'}, baseline));
});
