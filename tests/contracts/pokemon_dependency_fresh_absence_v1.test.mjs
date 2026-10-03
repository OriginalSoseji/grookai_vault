import test from 'node:test';
import assert from 'node:assert/strict';
import { freshAbsenceQuery, qualifyFreshAbsence, assertFreshDependencyAbsence } from '../../backend/catalog/pokemon_dependency_fresh_absence_v1.mjs';
import { EMPTY } from '../../backend/catalog/pokemon_dependency_lookup_v1.mjs';

const scope = () => ({ source_schema: 'public', source_table: 'refs', source_columns: ['parent_id'], type: 'bigint', existing: [], fresh: ['-9223372036854775808', '9223372036854775807'], pending_generated_ids: false });
const metadata = () => ({ relkind: 'r', indexes: [{ name: 'refs_idx', valid: true, ready: true, live: true, method: 'btree', leading_column: 'parent_id', expression: false, partial: false }] });
const plan = () => [{ Plan: { 'Node Type': 'Limit', 'Plan Rows': 1, 'Startup Cost': 0.1, 'Total Cost': 0.8, Plans: [{ 'Node Type': 'Index Only Scan', 'Startup Cost': 0.1, 'Total Cost': 900000, 'Plan Rows': 150000, 'Relation Name': 'refs', Schema: 'public', 'Index Name': 'refs_idx', 'Index Cond': 'parent_id = ANY ($1)' }] } }];
test('whole scope uses exact ANY with no active filter; streaming child may have high complete-stream estimate', () => {
  assert.match(freshAbsenceQuery(scope()), /where "parent_id"=any\(\$1::bigint\[\]\) limit 1$/);
  assert.equal(qualifyFreshAbsence(scope(), metadata(), plan()).qualified, true);
});
for (const [label, mutate] of [
  ['retained', s => s.existing = ['1']], ['pending', s => s.pending_generated_ids = true],
  ['unspecified pending', s => delete s.pending_generated_ids], ['empty', s => s.fresh = []],
  ['duplicate', s => s.fresh = ['1', '1']], ['overflow', s => s.fresh = ['9223372036854775808']],
  ['injection', s => s.source_table = 'refs;select 1'], ['numeric bigint', s => s.fresh = [1]],
]) test('scope rejects ' + label, () => { const s = scope(); mutate(s); assert.throws(() => freshAbsenceQuery(s)); });
for (const kind of ['Sort', 'Bitmap Heap Scan', 'Bitmap Index Scan', 'Gather', 'Seq Scan', 'Materialize', 'Append']) {
  test('nonstreaming scan rejects ' + kind, () => { const p = plan(); p[0].Plan.Plans[0]['Node Type'] = kind; assert.equal(qualifyFreshAbsence(scope(), metadata(), p).qualified, false); });
}
for (const [label, mutate] of [
  ['wrong relation', p => p[0].Plan.Plans[0]['Relation Name'] = 'other'],
  ['wrong schema', p => p[0].Plan.Plans[0].Schema = 'other'],
  ['wrong index', p => p[0].Plan.Plans[0]['Index Name'] = 'other'],
  ['filter', p => p[0].Plan.Plans[0].Filter = 'active'],
  ['subplan', p => p[0].Plan.Plans[0].Plans = [{ 'Node Type': 'Result' }]],
  ['missing condition', p => delete p[0].Plan.Plans[0]['Index Cond']],
  ['high startup', p => p[0].Plan.Plans[0]['Startup Cost'] = 30000],
  ['high root cost', p => p[0].Plan['Total Cost'] = 30000],
  ['wrong limit', p => p[0].Plan['Plan Rows'] = 2],
]) test('plan rejects ' + label, () => { const p = plan(); mutate(p); assert.equal(qualifyFreshAbsence(scope(), metadata(), p).qualified, false); });
for (const flag of ['valid', 'ready', 'live']) test('index requires ' + flag, () => { const m = metadata(); m.indexes[0][flag] = false; assert.equal(qualifyFreshAbsence(scope(), m, plan()).qualified, false); });
test('only exact same-column nonnull partial predicates qualify', () => {
  for (const predicate of ['(parent_id IS NOT NULL)', '("parent_id" IS NOT NULL)', 'active', '(other IS NOT NULL)', '((parent_id IS NOT NULL) AND active)']) {
    const m = metadata(); Object.assign(m.indexes[0], { partial: true, predicate });
    assert.equal(qualifyFreshAbsence(scope(), m, plan()).qualified, predicate === '(parent_id IS NOT NULL)' || predicate === '("parent_id" IS NOT NULL)');
  }
});
function mock({ unrestricted = true, statement_ms = '10000', lock_ms = '3000', rows = [], m = metadata() } = {}) {
  const calls = [];
  return { calls, async query(sql, params) {
    calls.push({ sql, params });
    if (sql.startsWith('select (rolsuper')) return { rows: [{ unrestricted, statement_ms, lock_ms }] };
    if (sql.startsWith('select c.relkind')) return { rows: [m] };
    if (sql.startsWith('explain')) return { rows: [{ 'QUERY PLAN': plan() }] };
    return { rows, rowCount: rows.length };
  } };
}
test('EMPTY requires actual absence; any present row aborts, never sampled digest', async () => {
  const db = mock(); assert.deepEqual(await assertFreshDependencyAbsence(db, scope()), EMPTY);
  assert.equal(db.calls.length, 4); assert.deepEqual(db.calls.at(-1).params, [scope().fresh]);
  await assert.rejects(() => assertFreshDependencyAbsence(mock({ rows: [{ present: 1 }] }), scope()), /unexpected_fresh_dependency/);
});
for (const options of [{ unrestricted: false }, { statement_ms: '0' }, { statement_ms: '30001' }, { lock_ms: '0' }, { lock_ms: '5001' }]) {
  test('reader/runtime guard rejects ' + JSON.stringify(options), async () => {
    const db = mock(options); await assert.rejects(() => assertFreshDependencyAbsence(db, scope())); assert.equal(db.calls.length, 1);
  });
}
test('index is freshly inspected before every execution; rejection never executes data query', async () => {
  const m = metadata(), db = mock({ m }); await assertFreshDependencyAbsence(db, scope());
  m.indexes = []; await assert.rejects(() => assertFreshDependencyAbsence(db, scope()), /fresh_absence_unqualified/);
  assert.equal(db.calls.length, 7);
});
