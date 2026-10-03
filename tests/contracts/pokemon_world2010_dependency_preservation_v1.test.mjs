import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { projectionHash as hash } from '../../backend/catalog/pokemon_world2010_identity_projection_v1.mjs';
import { VERSION, WRITE_TABLES, world2010DependencyScopes, assertWorld2010DependenciesPreserved } from '../../backend/catalog/pokemon_world2010_dependency_preservation_v1.mjs';
const root = process.env.CLASSIC_PROOF_INPUT_ROOT;
const seal = body => ({ ...body, fingerprint: hash(body) });
const reseal = value => { delete value.fingerprint; return seal(value); };
function fixture() {
  const plan = JSON.parse(fs.readFileSync(root + '/world2010-relationship-execution-plan-v1/plan.json'));
  const pending = JSON.parse(fs.readFileSync(root + '/world2010-relationship-sql-proof-v7/pending.json'));
  const rows = WRITE_TABLES.map(target_table => ({ source_schema: 'audit', source_table: target_table + '_outside', constraint_name: 'ref',
    source_columns: ['ref_id'], target_schema: 'public', target_table, target_columns: ['id'], validated: false }));
  return { plan, pending, catalog: seal({ version: VERSION, write_tables: WRITE_TABLES, rows }) };
}
test('whole92 scope retains all90 historical/group raw IDs and tracks exact generated IDs', { skip: !root }, () => {
  const { plan, pending, catalog } = fixture();
  const before = world2010DependencyScopes(plan, catalog), after = world2010DependencyScopes(plan, catalog, pending);
  assert.equal(before.filter(r => r.pending_generated_ids).length, 3);
  assert.equal(after.filter(r => r.pending_generated_ids).length, 0);
  assert.equal(after.find(r => r.target_table === 'raw_imports').existing.length, 90);
  assert.ok(after.find(r => r.target_table === 'raw_imports').existing.some(id => id.startsWith('-')));
  assert.equal(after.find(r => r.target_table === 'raw_imports').fresh.length, 83);
  assert.equal(after.find(r => r.target_table === 'external_mappings').fresh.length, 92);
  assert.equal(after.find(r => r.target_table === 'ingestion_jobs').fresh.length, 2);
  assert.ok(after.every(r => !r.validated));
});
for (const [label, mutate, error] of [
  ['lossy bigint', f => f.pending.mappings[0].id = 9007199254740992, /lossless/],
  ['duplicate mapping ID', f => f.pending.mappings[1].id = f.pending.mappings[0].id, /duplicate_dependency/],
  ['reused raw ID', f => f.pending.ingress.rows[0].raw_import_id = f.plan.input.ingress.input.ingress_snapshot.group_raw[0].id, /new_retained/],
  ['other plan', f => f.pending.plan_fingerprint = 'x', /generated_plan/],
  ['other product', f => f.pending.ingress.rows[0].product_id = '1', /generated_raw_scope/],
  ['other external ID', f => f.pending.mappings[0].external_id = '1', /generated_mapping_scope/],
  ['duplicate journal', f => f.pending.ledger_id = f.pending.ingress.ledger_id, /duplicate_dependency/],
  ['oversize bigint', f => f.pending.mappings[0].id = '9223372036854775808', /overflow/],
]) test(label + ' rejects generated scope', { skip: !root }, () => {
  const f = fixture(); mutate(f); assert.throws(() => world2010DependencyScopes(f.plan, f.catalog, f.pending), error);
});
for (const [label, mutate, error] of [
  ['unknown target', c => c.rows[0].target_table = 'sets', /unexpected_dependency/],
  ['composite key', c => c.rows[0].source_columns.push('second'), /unqualified_dependency/],
  ['non-ID target', c => c.rows[0].target_columns = ['other'], /unqualified_dependency/],
  ['duplicate constraint', c => c.rows.push(c.rows[0]), /duplicate_dependency_constraint/],
]) test(label + ' fails closed even after rehash', { skip: !root }, () => {
  const f = fixture(); mutate(f.catalog); assert.throws(() => world2010DependencyScopes(f.plan, reseal(f.catalog)), error);
});
test('changed catalog cannot be accepted with its old fingerprint', { skip: !root }, () => {
  const f = fixture(); f.catalog.rows.pop(); assert.throws(() => world2010DependencyScopes(f.plan, f.catalog), /tamper/);
});
const observation = () => seal({ version: VERSION, plan_fingerprint: 'plan', catalog_fingerprint: 'catalog', generated_fingerprint: 'generated', rows: [
  { key: 'a.b.c', target: 'raw_imports', fixed_scope: 'fixed', existing_scope: 'retained', pending_generated_ids: false, fresh_references: '0', retained: { count: '1', digest: 'original' } },
] });
for (const [label, mutate, error] of [
  ['changed retained payload', r => r.rows[0].retained.digest = 'changed', /retained_dependency_changed/],
  ['changed retained scope', r => r.rows[0].existing_scope = 'changed', /retained_dependency_scope/],
  ['changed fixed scope', r => r.rows[0].fixed_scope = 'changed', /fixed_dependency_scope/],
  ['missing generated proof', r => r.generated_fingerprint = null, /postwrite_generated/],
  ['pending ID', r => r.rows[0].pending_generated_ids = true, /generated_dependency_gap/],
  ['missing constraint', r => r.rows = [], /dependency_inventory/],
  ['new inbound reference', r => r.rows[0].fresh_references = '1', /strictly equal/],
]) test(label + ' rejects preservation', () => {
  const before = observation(), after = observation(); mutate(after);
  assert.throws(() => assertWorld2010DependenciesPreserved(before, reseal(after)), error);
});
for (const args of [['--apply=true'], ['--out-dir=a', '--out-dir=b'], []]) test('readonly CLI rejects unsupported/incomplete arguments ' + args.join(' '), () => {
  const r = spawnSync(process.execPath, ['scripts/workers/pokemon_world2010_dependency_observation_v1.mjs', ...args], { encoding: 'utf8' });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /unique_readonly_arguments_required|three_explicit_readonly_arguments_required/);
});
