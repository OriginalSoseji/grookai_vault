import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
const source = fs.readFileSync('apps/web/src/lib/explore/getExploreRows.ts', 'utf8');
const parsed = ts.createSourceFile('getExploreRows.ts', source, ts.ScriptTarget.Latest, true);
const fn = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'fetchSpeciesFamilyRows');
assert.ok(fn);
const code = ts.transpileModule(`${fn.getText(parsed)}\nexports.fetchSpeciesFamilyRows = fetchSpeciesFamilyRows;`, {
  compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022},
}).outputText;

function load(client) {
  const module = {exports:{}};
  vm.runInNewContext(code, {module, exports:module.exports,
    getSpeciesSearchTokens: () => ['pika'], sanitizeSpeciesSearchToken: x => x,
    createServerComponentClient: async () => client, SPECIES_FAMILY_SEARCH_LIMIT:360,
    applyLanguageScopeQuery: x => x, buildTrustedPrintedNameAliasesBySlug: () => new Map(),
    rowMatchesTrustedPrintedNameAlias: () => false, isReliableSpeciesSearchMapping: () => true,
    uniqueValues: xs => [...new Set(xs)], buildSpeciesFamilyTokens: () => [],
    chunkArray: xs => [xs], applyLanguageScopeRows: rows => rows,
  });
  return module.exports.fetchSpeciesFamilyRows;
}

for (const held of ['v_grookai_dex_species_v1', 'v_grookai_dex_card_prints_v1', 'v_card_prints_discovery_v1']) {
  test(`canceling species-family search aborts ${held} and prevents later reads`, async () => {
    const controller = new AbortController();
    const calls = []; let attached;
    const fixture = {
      v_grookai_dex_species_v1: [{slug:'pikachu',display_name:'Pikachu'}],
      v_grookai_dex_card_prints_v1: [{card_print_id:'card-1',species_slug:'pikachu',name:'Pikachu'}],
      v_card_prints_discovery_v1: [{id:'card-1',name:'Pikachu'}],
    };
    const client = {from(table) {
      calls.push(table);
      const request = {select(){return this;}, eq(){return this;}, or(){return this;}, limit(){return this;}, in(){return this;},
        abortSignal(signal) {
          if (table === held) {
            attached = signal;
            return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), {once:true}));
          }
          return Promise.resolve({data:fixture[table],error:null});
        }};
      return request;
    }};
    const pending = load(client)({}, 'all', 'id,name', controller.signal);
    const deadline = Date.now() + 3000;
    while (!attached) {
      if (Date.now() > deadline) throw new Error(`No cancellation signal attached to ${held}`);
      await new Promise(resolve => setImmediate(resolve));
    }
    controller.abort();
    await assert.rejects(pending, {name:'AbortError'});
    assert.equal(attached, controller.signal);
    assert.equal(calls.at(-1), held);
  });
}

test('species-family search stops before starting if already canceled', async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  await assert.rejects(load({from(){calls++;}})({}, 'all', 'id', controller.signal), {name:'AbortError'});
  assert.equal(calls, 0);
});

test('species-family search stops if cancellation arrives as a request resolves', async () => {
  const controller = new AbortController(); let calls = 0;
  const client = {from() {
    calls++;
    return {select(){return this;},eq(){return this;},or(){return this;},limit(){return this;},
      abortSignal() { controller.abort(); return Promise.resolve({data:[{slug:'pikachu'}],error:null}); }};
  }};
  await assert.rejects(load(client)({}, 'all', 'id', controller.signal), {name:'AbortError'});
  assert.equal(calls, 1);
});

test('species-family search supports callers without a signal', async () => {
  const fixture = {
    v_grookai_dex_species_v1: [{slug:'pikachu',display_name:'Pikachu'}],
    v_grookai_dex_card_prints_v1: [{card_print_id:'card-1',species_slug:'pikachu',name:'Pikachu'}],
    v_card_prints_discovery_v1: [{id:'card-1',name:'Pikachu'}],
  };
  const calls = [];
  const client = {from(table) {
    calls.push(table);
    return {select(){return this;},eq(){return this;},or(){return this;},limit(){return this;},in(){return this;},
      then(resolve, reject){return Promise.resolve({data:fixture[table],error:null}).then(resolve,reject);}};
  }};
  const rows = await load(client)({}, 'all', 'id,name');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'card-1');
  assert.equal(calls.length, 3);
});
