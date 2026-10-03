import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dependencyLookupQuery, inspectDependencyLookup, measureDependencyLookup, qualifyDependencyLookup, EMPTY, LIMITS } from '../../backend/catalog/pokemon_dependency_lookup_v1.mjs';

const scope = { source_schema: 'public', source_table: 'dependencies', source_columns: ['mapping_id'], type: 'bigint' };
const index = { name: 'mapping_idx', valid: true, ready: true, live: true, method: 'btree', leading_column: 'mapping_id', partial: false, expression: false };
const metadata = () => ({ relkind: 'r', table_bytes: '2000000', indexes: [{ ...index }] });
const plan = () => [{ Plan: { 'Node Type': 'Aggregate', 'Total Cost': 90, 'Plan Rows': 1, Plans: [
  { 'Node Type': 'Index Scan', 'Total Cost': 80, 'Plan Rows': 102, 'Relation Name': 'dependencies', Schema: 'public', 'Index Name': 'mapping_idx', 'Index Cond': '(mapping_id = ANY ($1))' },
] } }];
test('whole102 and whole92 nonempty plans qualify only as estimates', () => {
  for (const n of [102, 92]) assert.ok(dependencyLookupQuery(scope, Array.from({ length: n }, (_, i) => String(i + 1))).includes('$1::bigint[]'));
  assert.deepEqual(qualifyDependencyLookup(scope, metadata(), plan()), { qualified: true, classification: 'indexed_plan_within_bounds', reasons: [], limits: LIMITS, runtime_qualified: false });
});
test('exact catalog null-rejecting predicate qualifies unchanged bigint and UUID lookups', () => {
  for (const type of ['bigint', 'uuid']) for (const predicate of ['(mapping_id IS NOT NULL)', '("mapping_id" IS NOT NULL)']) {
    const m = metadata(); Object.assign(m.indexes[0], { partial: true, predicate });
    assert.equal(qualifyDependencyLookup({ ...scope, type }, m, plan()).qualified, true);
  }
});
for (const predicate of [null, '', '(other_id IS NOT NULL)', '(mapping_id IS NULL)',
  '((mapping_id IS NOT NULL) AND active)', '((mapping_id IS NOT NULL) OR active)',
  'active', '(mapping_id > 0)', '(COALESCE(mapping_id, 0) IS NOT NULL)',
  '(mapping_id IS NOT NULL); SELECT 1', 'NOT (mapping_id IS NULL)']) {
  test('nonexact partial predicate remains rejected: ' + predicate, () => {
    const m = metadata(); Object.assign(m.indexes[0], { partial: true, predicate });
    assert.equal(qualifyDependencyLookup(scope, m, plan()).qualified, false);
  });
}
for (const flag of ['valid', 'ready', 'live']) test('nonnull partial index still requires ' + flag, () => {
  const m = metadata(); Object.assign(m.indexes[0], { partial: true, predicate: '(mapping_id IS NOT NULL)', [flag]: false });
  assert.equal(qualifyDependencyLookup(scope, m, plan()).qualified, false);
});
test('contradictory full-index predicate metadata fails closed', () => {
  const m = metadata(); m.indexes[0].predicate = 'active';
  assert.equal(qualifyDependencyLookup(scope, m, plan()).qualified, false);
});
for (const [label, mutate, expected] of [
  ['missing index', m => m.indexes = [], 'missing_valid_leading_btree_index'],
  ['invalid index', m => m.indexes[0].valid = false, 'missing_valid_leading_btree_index'],
  ['not ready', m => m.indexes[0].ready = false, 'missing_valid_leading_btree_index'],
  ['not live', m => m.indexes[0].live = false, 'missing_valid_leading_btree_index'],
  ['second key', m => m.indexes[0].leading_column = 'run_id', 'missing_valid_leading_btree_index'],
  ['partial index', m => m.indexes[0].partial = true, 'missing_valid_leading_btree_index'],
  ['expression index', m => m.indexes[0].expression = true, 'missing_valid_leading_btree_index'],
  ['hash method', m => m.indexes[0].method = 'hash', 'missing_valid_leading_btree_index'],
  ['partitioned parent', m => m.relkind = 'p', 'ordinary_table_required'],
]) test(label + ' cannot authorize a large lookup', () => { const m = metadata(); mutate(m); assert.ok(qualifyDependencyLookup(scope, m, plan()).reasons.includes(expected)); });
for (const [label, mutate, expected] of [
  ['sequential scan', p => p[0].Plan.Plans[0]['Node Type'] = 'Seq Scan', 'large_sequential_scan'],
  ['wrong schema', p => p[0].Plan.Plans[0].Schema = 'other', 'unexpected_plan_relation'],
  ['wrong index', p => p[0].Plan.Plans[0]['Index Name'] = 'other', 'unqualified_index_access'],
  ['full index scan', p => delete p[0].Plan.Plans[0]['Index Cond'], 'indexed_predicate_required'],
  ['high root cost', p => p[0].Plan['Total Cost'] = 900000, 'plan_cost_exceeds_bound'],
  ['high nested rows', p => p[0].Plan.Plans[0]['Plan Rows'] = 1000000, 'estimated_rows_exceed_bound'],
  ['unknown node', p => p[0].Plan.Plans[0]['Node Type'] = 'Foreign Scan', 'unsupported_plan_node:Foreign Scan'],
]) test(label + ' fails closed', () => { const p = plan(); mutate(p); assert.ok(qualifyDependencyLookup(scope, metadata(), p).reasons.includes(expected)); });
test('small unindexed table is explicitly limited; stale planner stats cannot permit large table', () => {
  const m = { ...metadata(), table_bytes: '1024', indexes: [] }, p = plan(); p[0].Plan.Plans[0]['Node Type'] = 'Seq Scan';
  const small = qualifyDependencyLookup(scope, m, p); assert.equal(small.qualified, true); assert.equal(small.classification, 'bounded_small_relation_only');
  m.table_bytes = '9000000'; m.relpages = 0; assert.equal(qualifyDependencyLookup(scope, m, p).qualified, false);
});
test('lossless signed bigint extremes and UUIDs bind through parameters', () => {
  dependencyLookupQuery(scope, ['-9223372036854775808', '9223372036854775807', '0']);
  dependencyLookupQuery({ ...scope, type: 'uuid' }, ['11111111-1111-1111-1111-111111111111']);
  for (const ids of [[1], ['9223372036854775808'], ['-9223372036854775809'], ['1', '1'], ['01'], ['1);select 1'], Array(1025).fill('1')]) assert.throws(() => dependencyLookupQuery(scope, ids));
  assert.throws(() => dependencyLookupQuery({ ...scope, type: 'text' }, ['1']));
  assert.throws(() => dependencyLookupQuery({ ...scope, source_table: 'x;drop table y' }, ['1']));
});
test('empty aggregate uses no SQL and cannot stand in for nonempty qualification', async () => {
  const db = { query() { throw Error('unexpected SQL'); } };
  assert.deepEqual(await measureDependencyLookup(db, scope, []), EMPTY);
  await assert.rejects(() => inspectDependencyLookup(db, scope, []), /nonempty/);
});
test('unqualified plan never executes aggregate; fresh catalog checked on each execution', async () => {
  const calls = [], m = metadata(), p = plan();
  const db = { async query(sql) { calls.push(sql); if (sql.startsWith('select c.relkind')) return { rows: [m] }; if (sql.startsWith('explain')) return { rows: [{ 'QUERY PLAN': p }] }; return { rows: [{ count: '1', digest: 'digest' }] }; } };
  assert.deepEqual(await measureDependencyLookup(db, scope, ['1']), { count: '1', digest: 'digest' });
  assert.equal(calls.length, 3); assert.ok(calls[1].startsWith('explain (format json, verbose true)'));
  m.indexes = []; await assert.rejects(() => measureDependencyLookup(db, scope, ['1']), /dependency_lookup_unqualified/);
  assert.equal(calls.length, 5); assert.ok(calls.every(s => !/explain\s*\([^)]*analyze/i.test(s)));
});
for (const args of [[], ['--apply=true'], ['--out-dir=a', '--out-dir=b']]) test('inventory CLI rejects unsupported arguments ' + args.join(' '), () => {
  const result = spawnSync(process.execPath, ['scripts/workers/pokemon_dependency_lookup_observation_v1.mjs', ...args], { encoding: 'utf8' });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /unique_readonly_arguments_required|four_explicit_readonly_arguments_required/);
});
