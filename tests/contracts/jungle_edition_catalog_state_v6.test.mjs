import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {jungleHistoryCursorClientV6, readJungleCatalogStateV6, JUNGLE_HISTORY_AGGREGATE_V6 as aggregate, JUNGLE_HISTORY_CURSOR_SQL_V6 as declare} from '../../backend/catalog/jungle_edition_catalog_state_v6.mjs';
const ids = Array.from({length: 83}, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
const md5 = value => createHash('md5').update(value).digest('hex');
function fixture(batches, {fetchError, closeError, declareError} = {}) {
  const calls = [];
  const client = {query: async (sql, args) => {
    calls.push({sql, args});
    if (sql === declare) { if (declareError) throw declareError; return {}; }
    if (sql.startsWith('fetch ')) { if (fetchError) throw fetchError; return {rows: batches.shift() ?? []}; }
    if (sql.startsWith('close ')) { if (closeError) throw closeError; return {}; }
    return {rows: [{original: true}]};
  }};
  return {client, calls, read: jungleHistoryCursorClientV6(client)};
}
test('all pages, duplicates and empty final fetch preserve the PostgreSQL digest contract', async () => {
  const hashes = Array.from({length: 2007}, (_, i) => md5(String(i % 1900))).reverse();
  const f = fixture([hashes.slice(0, 2000).map(digest => ({digest})), hashes.slice(2000).map(digest => ({digest}))]);
  const result = await f.read.query(aggregate, [ids]);
  assert.deepEqual(result.rows, [{rows: '2007', digest: md5([...hashes].sort().join(''))}]);
  assert.deepEqual(f.calls[0], {sql: declare, args: [ids]});
  assert.equal(f.calls.filter(c => c.sql.startsWith('fetch ')).length, 3);
  assert.equal(f.calls.at(-1).sql, 'close jungle_history_v6');
});
test('empty history uses the original empty aggregate', async () => {
  assert.deepEqual((await fixture([]).read.query(aggregate, [ids])).rows, [{rows: '0', digest: md5('')}]);
});
test('unrelated SQL is passed through exactly', async () => {
  const f = fixture([]), args = ['unchanged'];
  assert.deepEqual(await f.read.query('select $1', args), {rows: [{original: true}]});
  assert.deepEqual(f.calls, [{sql: 'select $1', args}]);
});
for (const [name, values] of [['short scope', ids.slice(1)], ['duplicate scope', [...ids.slice(1), ids[1]]], ['invalid ID', [...ids.slice(1), 'injected']]]) {
  test(name + ' rejects before a cursor opens', async () => {
    const f = fixture([]); await assert.rejects(f.read.query(aggregate, [values])); assert.equal(f.calls.length, 0);
  });
}
for (const [name, row] of [['invalid hash', {digest: 'bad'}], ['unexpected field', {digest: md5('a'), extra: 1}]]) {
  test(name + ' rejects and closes the cursor', async () => {
    const f = fixture([[row]]); await assert.rejects(f.read.query(aggregate, [ids])); assert.equal(f.calls.at(-1).sql, 'close jungle_history_v6');
  });
}
test('oversized page rejects', async () => {
  await assert.rejects(fixture([Array.from({length: 2001}, () => ({digest: md5('a')}))]).read.query(aggregate, [ids]), /history_batch_bound/);
});
test('unending rows stop at the memory bound', async () => {
  const page = Array.from({length: 2000}, () => ({digest: md5('a')}));
  const f = fixture(Array.from({length: 126}, () => page));
  await assert.rejects(f.read.query(aggregate, [ids]), /history_inspection_row_bound/);
  assert.equal(f.calls.at(-1).sql, 'close jungle_history_v6');
});
test('cleanup failure preserves the original database timeout', async () => {
  const timeout = Object.assign(new Error('original timeout'), {code: '57014'});
  const f = fixture([], {fetchError: timeout, closeError: new Error('transaction aborted')});
  await assert.rejects(f.read.query(aggregate, [ids]), e => e === timeout && e.code === '57014' && e.cursorCloseError === 'transaction aborted');
});
test('standalone close failure is not reported as success', async () => {
  await assert.rejects(fixture([], {closeError: new Error('close failed')}).read.query(aggregate, [ids]), /close failed/);
});
test('failed declaration does not close an unrelated cursor', async () => {
  const f = fixture([], {declareError: new Error('already exists')});
  await assert.rejects(f.read.query(aggregate, [ids]), /already exists/); assert.equal(f.calls.length, 1);
});
test('batch callback failure closes its cursor', async () => {
  const f = fixture([]), read = jungleHistoryCursorClientV6(f.client, {onBatch: () => {throw new Error('observer failed');}});
  await assert.rejects(read.query(aggregate, [ids]), /observer failed/); assert.equal(f.calls.at(-1).sql, 'close jungle_history_v6');
});
test('read committed cannot inspect protected rows across snapshots', async () => {
  const calls = [], client = {query: async sql => {calls.push(sql); return {rows: [{transaction_isolation: 'read committed'}]};}};
  await assert.rejects(readJungleCatalogStateV6(client, {}, {}), /stable_inspection_transaction_required/);
  assert.deepEqual(calls, ['show transaction_isolation']);
});
