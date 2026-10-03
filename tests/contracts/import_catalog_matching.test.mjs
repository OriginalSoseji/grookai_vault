import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
const web = path.resolve('apps/web/src');
const set = { id: 'set-151-en', name: '151', code: 'sv3pt5' };
const print = (id, number, overrides = {}) => ({
  id, gv_id: `GV-PK-TEST-${id}`, name: 'Alakazam ex', number,
  set_id: set.id, set_code: set.code, sets: { name: set.name }, ...overrides,
});

// A read-only PostgREST adapter with filtering, ordering and server row caps.
// The real CSV parser, normalization, matching action and report code run below.
function harness({ cards = [], sets = [set], cap = 1000, signedIn = true, fail, ignoreCursor = false, owned = new Map(), ownershipError = false, editionResponse } = {}) {
  const calls = [];
  const ownershipReads = [];
  const client = {
    rpc: async (name, args) => {
      assert.equal(name, 'get_jungle_edition_resolution_v1');
      calls.push({rpc: name, parent: args.p_card_print_id});
      assert.ok(editionResponse, 'Unexpected edition lookup');
      return editionResponse;
    },
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'fixture-owner' } : null } }) },
    from(table) {
      assert.ok(['sets', 'card_prints'].includes(table), `unexpected table: ${table}`);
      let filters = [], order, limit = Infinity, cursor;
      const query = {
        select() { return query; },
        in(column, values) { filters.push(row => values.includes(row[column])); return query; },
        order(column) { order = column; return query; },
        limit(count) { limit = count; return query; },
        gt(column, value) {
          cursor = value;
          if (!ignoreCursor) filters.push(row => row[column] > value);
          return query;
        },
        then(resolve, reject) {
          calls.push({ table, cursor, order, limit });
          if (fail?.({ table, cursor })) return Promise.resolve({ data: null, error: { message: 'fixture read failed' } }).then(resolve, reject);
          let data = (table === 'sets' ? sets : cards).filter(row => filters.every(filter => filter(row)));
          if (order) data = [...data].sort((a, b) => a[order] < b[order] ? -1 : a[order] > b[order] ? 1 : 0);
          return Promise.resolve({ data: data.slice(0, Math.min(cap, limit)), error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const mocks = {
    '@/lib/supabase/server': { createServerComponentClient: async () => client },
    '@/lib/vault/getOwnedCountsByCardPrintIds': {
      getOwnedCountsByCardPrintIds: async (userId, ids) => {
        assert.equal(userId, 'fixture-owner');
        ownershipReads.push({ userId, ids: Array.from(ids) });
        if (ownershipError) throw new Error('fixture ownership read failed');
        return new Map(ids.map(id => [id, owned.get(id) ?? 0]));
      },
    },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
      module, exports: module.exports, Error, console: { info() {} },
      require(id) {
        if (Object.hasOwn(mocks, id)) return mocks[id];
        const target = id.startsWith('@/') ? path.join(web, id.slice(2)) : path.resolve(path.dirname(file), id);
        return load(`${target}.ts`);
      },
    }, { filename: file });
    return module.exports;
  }
  const { normalizeRow } = load(path.join(web, 'lib/import/normalizeRow.ts'));
  const { parseCollectrCSV } = load(path.join(web, 'lib/import/parseCollectrCSV.ts'));
  const { matchCardPrints } = load(path.join(web, 'lib/import/matchCardPrints.ts'));
  return {
    calls,
    ownershipReads,
    async previewCsv(csv) {
      return matchCardPrints(parseCollectrCSV(csv).map(normalizeRow));
    },
    async preview(number, name = 'Alakazam ex', setName = '151') {
      const parsed = parseCollectrCSV(`Product Name,Set,Card Number,Quantity\n${name},${setName},${number},2`);
      return matchCardPrints(parsed.map(normalizeRow));
    },
  };
}

const editionFixture = JSON.parse(fs.readFileSync('tests/fixtures/jungle_edition_resolution_v1.json'));
const jungleSet = {id: 'jungle', name: 'Jungle', code: 'base2'};
function junglePrint(id = editionFixture.legacy_card_print_id) {
  return print(id, '1', {name: 'Clefable', gv_id: 'GV-PK-JU-1', set_id: jungleSet.id,
    set_code: 'base2', sets: {name: 'Jungle'}});
}
for (const status of ['selection_required', 'ready', 'unavailable']) {
  test(`Jungle ${status} stays in review even when saved quantities meet the target`, async () => {
    const c = junglePrint();
    const h = harness({cards: [c], sets: [jungleSet], owned: new Map([[c.id, 10]]),
      editionResponse: {data: {...editionFixture, status}, error: null}});
    const result = await h.preview('1', 'Clefable', 'Jungle');
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].status, 'review');
    assert.equal(result.rows[0].row.quantity, 2);
    assert.equal(result.rows[0].match, undefined);
    assert.match(result.rows[0].reviewReason, /review/);
    assert.equal(result.summary.matchedRows, 0);
    assert.equal(result.summary.unmatchedRows, 1);
    assert.equal(h.calls.filter(c => c.rpc).length, 1);
  });
}
test('Jungle lookup failure holds that row while unrelated exact matches stay ready', async () => {
  const h = harness({cards: [junglePrint(), print('other', '65')], sets: [jungleSet, set],
    editionResponse: {error: {code: '57014', message: 'private detail'}}});
  const result = await h.previewCsv('Product Name,Set,Card Number,Quantity\nClefable,Jungle,1,2\nAlakazam ex,151,65,1');
  assert.equal(result.rows[0].status, 'review');
  assert.match(result.rows[0].reviewReason, /could not be checked/);
  assert.doesNotMatch(result.rows[0].reviewReason, /private detail/);
  assert.equal(result.rows[1].status, 'matched');
});
for (const response of [
  {data: {version: 1, status: 'not_applicable', options: []}},
  {error: {code: 'PGRST202', message: 'get_jungle_edition_resolution_v1 missing'}}
]) test('non-governed Jungle and exact pre-migration compatibility retain existing matching', async () => {
  const h = harness({cards: [junglePrint()], sets: [jungleSet], editionResponse: response});
  assert.equal((await h.preview('1', 'Clefable', 'Jungle')).rows[0].status, 'matched');
});

for (const [input, stored] of [['065', '065'], ['65', '065'], ['00065/165', '65'], ['#065', '000065'], ['65', '065/165'], ['188', '188']]) {
  test(`CSV ${input} finds stored ${stored} without changing the catalog identifier`, async () => {
    const result = await harness({ cards: [print('card-1', stored)] }).preview(input);
    assert.equal(result.rows[0].status, 'matched');
    assert.equal(result.rows[0].match.card_id, 'card-1');
    assert.equal(result.rows[0].match.number, stored);
    assert.equal(result.rows[0].row.quantity, 2);
  });
}

test('suffixes and prefixed collector numbers remain distinct', async () => {
  const h = harness({ cards: [print('1', '65'), print('2', '65a'), print('3', 'TG05')] });
  assert.equal((await h.preview('65a')).rows[0].match.card_id, '2');
  assert.equal((await h.preview('TG05/TG30')).rows[0].match.card_id, '3');
  assert.equal((await h.preview('TG5')).rows[0].status, 'missing');
});

test('a number match cannot substitute a different name or set', async () => {
  const h = harness({ cards: [print('wrong-name', '065', { name: 'Abra' }), print('wrong-set', '065', { set_id: 'other', sets: { name: 'Other' } })] });
  assert.equal((await h.preview('65')).rows[0].status, 'missing');
});

test('different printings and duplicate set names/languages remain explicit choices', async () => {
  const jp = { ...set, id: 'set-151-jp', code: 'sv2a' };
  const cards = [print('a', '065'), print('b', '65'), print('c', '065', { set_id: jp.id, set_code: jp.code })];
  const result = await harness({ cards, sets: [set, jp], cap: 1 }).preview('65');
  assert.equal(result.rows[0].status, 'multiple');
  assert.deepEqual(Array.from(result.rows[0].matches, value => value.card_id).sort(), ['a', 'b', 'c']);
});

test('matching cards beyond a page and sets beyond a server cap remain discoverable', async () => {
  const sets = Array.from({ length: 6 }, (_, index) => ({ id: `aaa-${index}`, name: `Other ${index}`, code: `OTHER${index}` })).concat(set);
  const cards = Array.from({ length: 1100 }, (_, index) => print(`a-${String(index).padStart(4, '0')}`, '1', { name: 'Other' })).concat(print('z-match', '065'));
  const h = harness({ cards, sets, cap: 137 });
  const result = await h.preview('65');
  assert.equal(result.rows[0].match.card_id, 'z-match');
  assert.ok(h.calls.filter(call => call.table === 'card_prints').length > 8);
  const cappedSets = harness({ cards: [print('match', '065')], sets, cap: 2 });
  assert.equal((await cappedSets.preview('65')).rows[0].status, 'matched');
});

test('a later candidate-page error rejects the preview instead of returning partial matches', async () => {
  const h = harness({ cards: [print('a', '065'), print('b', '65')], cap: 1, fail: ({ table, cursor }) => table === 'card_prints' && Boolean(cursor) });
  await assert.rejects(h.preview('65'), /fixture read failed/);
});

test('a repeated catalog page fails visibly rather than looping or hiding variants', async () => {
  const h = harness({ cards: [print('a', '065')], ignoreCursor: true });
  await assert.rejects(h.preview('65'), /pagination did not advance/);
});

test('authentication is required before catalog queries', async () => {
  const h = harness({ signedIn: false });
  await assert.rejects(h.preview('065'), /Sign in required/);
  assert.equal(h.calls.length, 0);
  assert.equal(h.ownershipReads.length, 0);
});

for (const ownedQuantity of [2, 3]) {
  test(`preview omits a uniquely matched row when ${ownedQuantity} copies already meet its target of two`, async () => {
    const h = harness({ cards: [print('a', '065')], owned: new Map([['a', ownedQuantity]]) });
    const result = await h.preview('65');
    assert.equal(result.rows.length, 0);
    assert.equal(result.summary.totalRows, 0);
    assert.equal(result.report.rowsValid, 1);
    assert.equal(h.ownershipReads.length, 1);
  });
}

test('preview displays only the deficit while preserving the original target for the writer', async () => {
  const h = harness({ cards: [print('a', '065')], owned: new Map([['a', 1]]) });
  const result = await h.preview('65');
  assert.equal(result.rows[0].row.quantity, 1);
  assert.equal(result.rows[0].importMeta.importQuantity, 1);
  assert.equal(result.rows[0].importMeta.desiredQuantity, 2);
  assert.equal(result.rows[0].match.card_id, 'a');
});

test('a repeat preview reads updated owned counts rather than suggesting the same additions', async () => {
  const owned = new Map();
  const h = harness({ cards: [print('a', '065')], owned });
  assert.equal((await h.preview('65')).rows[0].row.quantity, 2);
  // Simulated readback only: this test does not execute an ownership write.
  owned.set('a', 2);
  assert.equal((await h.preview('065')).rows.length, 0);
  assert.equal(h.ownershipReads.length, 2);
});

test('duplicate CSV rows collapse before subtracting existing ownership once', async () => {
  const h = harness({ cards: [print('a', '065')], owned: new Map([['a', 1]]) });
  const result = await h.previewCsv('Product Name,Set,Card Number,Quantity\nAlakazam ex,151,065,2\nAlakazam ex,151,65,1');
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].row.quantity, 2);
  assert.equal(result.rows[0].importMeta.desiredQuantity, 3);
});

test('owned alternate printings do not hide or reduce an ambiguous import row', async () => {
  const h = harness({ cards: [print('a', '065'), print('b', '65')], owned: new Map([['a', 20], ['b', 20]]) });
  const result = await h.preview('65');
  assert.equal(result.rows[0].status, 'multiple');
  assert.equal(result.rows[0].matches.length, 2);
  assert.equal(result.rows[0].row.quantity, 2);
  assert.equal(result.rows[0].importMeta.desiredQuantity, 2);
});

test('ownership across identically named language sets cannot silently resolve ambiguity', async () => {
  const jp = { ...set, id: 'set-151-jp', code: 'sv2a' };
  const h = harness({
    sets: [set, jp],
    cards: [print('en', '065'), print('jp', '065', { set_id: jp.id })],
    owned: new Map([['en', 2]]),
  });
  const result = await h.preview('065');
  assert.equal(result.rows[0].status, 'multiple');
  assert.equal(result.rows[0].row.quantity, 2);
});

test('ownership of another named card with the same number cannot satisfy this card', async () => {
  const h = harness({ cards: [print('a', '065'), print('other', '065', { name: 'Abra' })], owned: new Map([['other', 10]]) });
  const result = await h.preview('65');
  assert.equal(result.rows[0].match.card_id, 'a');
  assert.equal(result.rows[0].row.quantity, 2);
});

test('ownership read failures reject the preview rather than assuming zero owned copies', async () => {
  const h = harness({ cards: [print('a', '065')], ownershipError: true });
  await assert.rejects(h.preview('65'), /fixture ownership read failed/);
});
