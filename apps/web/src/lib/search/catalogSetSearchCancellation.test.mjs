import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTestTypeScript} from '../playables/testTypeScriptLoader.mjs';
const {readSearchSets, isCatalogCardNameQuery, isPublishedPlayableCardNameQuery} = loadTestTypeScript('lib/search/catalogSetSearch.ts');
function builder(result, signals, afterRead) {
  return {abortSignal(signal) { signals.push(signal); return this; },
    then(resolve, reject) { return Promise.resolve().then(() => { afterRead?.(); return result; }).then(resolve, reject); }};
}
test('set and card-name requests receive the caller signal', async () => {
  const controller = new AbortController(); const signals = [];
  const client = {rpc(name) { return builder(name === 'get_search_set_catalog_v1'
    ? {data: {complete: true, sets: []}, error: null}
    : {data: [{name: 'Charizard'}], error: null}, signals); }};
  assert.deepEqual(Array.from(await readSearchSets(client, 'pokemon', controller.signal)), []);
  assert.equal(await isCatalogCardNameQuery(client, 'Charizard', 'pokemon', undefined, controller.signal), true);
  assert.deepEqual(signals, [controller.signal, controller.signal]);
});
test('cancellation prevents additional playable name pages', async () => {
  const controller = new AbortController(); const signals = []; let pages = 0;
  const client = {from() { return {select() { return {in() {
    pages++; return builder({data: [], error: null}, signals, () => controller.abort());
  }}; }}; }};
  const members = Array.from({length: 201}, (_, n) => ({card_print_id: String(n), gv_id: String(n)}));
  await assert.rejects(isPublishedPlayableCardNameQuery(client, 'Charizard', members, controller.signal));
  assert.equal(pages, 1); assert.deepEqual(signals, [controller.signal]);
});
test('an already cancelled request does not read the catalog', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(readSearchSets({rpc() { throw Error('unexpected read'); }}, 'pokemon', controller.signal));
});
