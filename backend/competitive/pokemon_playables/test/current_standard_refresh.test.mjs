import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {AS_OF} from './fixtures.mjs';
import {setupCurrentSampleFixture} from './current_sample_fixtures.mjs';
import {createCurrentSampleGameplayTemplate} from '../current_gameplay_template_v1.mjs';
import {limitlessPublishedReceipt} from '../adapters/limitless_published_decklists_v1.mjs';
import {ArtifactStore} from '../store.mjs';
import {digest, EngineError, sha256} from '../common.mjs';
import {buildCurrentStandardUsage} from '../current_standard_usage_v1.mjs';
import {STANDARD_USAGE_PUBLIC_KEY} from '../current_standard_worker_v1.mjs';
import {collectCurrentStandardUsage, createStandardUsageRefreshSeed, REFRESH_SEED_KEY, refreshCurrentStandardUsage, sourceRateDelay} from '../current_standard_refresh_v1.mjs';

class MemoryStore extends ArtifactStore {
  constructor() {super(); this.local = true; this.values = new Map();}
  async get(key) {return structuredClone(this.values.get(key) ?? null);}
  async put(key, value, {immutable = false} = {}) {
    if (immutable && this.values.has(key)) throw new EngineError('ARTIFACT_EXISTS');
    this.values.set(key, structuredClone(value));
  }
  async remove(key) {this.values.delete(key);}
  async list(prefix) {return [...this.values.keys()].filter(key => key.startsWith(`${prefix}/`)).sort();}
}

function setup() {
  const f = setupCurrentSampleFixture();
  const capture = f.native_proposals[0].capture;
  const original = capture.originals.details.receipt;
  const details = {...JSON.parse(original.body_text), date: '2026-11-10T12:00:00.000Z'};
  original.body_text = JSON.stringify(details); original.body_sha256 = sha256(original.body_text);
  f.native_proposals[0].receipt = limitlessPublishedReceipt(capture, f.native_source.id);
  f.retention_bounds[f.native_proposals[0].receipt.id] = capture.retain_until;
  const template = createCurrentSampleGameplayTemplate(f, AS_OF);
  const input = {version: 'pokemon_current_standard_usage_input:v1', current_bindings: f.current_bindings,
    context: {packet: template.packet, sources: template.sources, receipts: template.receipts, retain_until: template.retain_until}};
  const seed = createStandardUsageRefreshSeed(input, AS_OF);
  const policy = JSON.parse(fs.readFileSync(new URL('../policy_current_standard_v1.json', import.meta.url)));
  Object.assign(policy, {minimum_events: 2, minimum_lists: 4});
  const id2 = '000000000000000000000002', requests = [], preserved = [];
  const fetchImpl = async url => {
    requests.push(url); const parsed = new URL(url);
    if (parsed.pathname === '/api/tournaments') return Response.json([details, {...details, id: id2}]);
    if (parsed.origin === 'https://api.tcgdex.net') {
      const receipt = seed.metadata_receipts.find(receipt => receipt.url === url);
      assert(receipt); return new Response(receipt.body_text);
    }
    if (parsed.pathname.endsWith('/details')) return Response.json({...details, id: parsed.pathname.split('/')[3]});
    return new Response(parsed.pathname.startsWith('/api/') ? capture.originals.standings.receipt.body_text : capture.originals.standings_page.receipt.body_text);
  };
  return {seed, policy, bindings: f.current_bindings, requests, preserved, options: {seed,
    bindingsLoader: async () => structuredClone(f.current_bindings), clock: () => AS_OF, sleepImpl: async () => {}, fetchImpl,
    onReceipt: async receipt => {preserved.push(receipt);}}};
}

test('daily collection discovers fresh events, rebuilds exact aliases and recomputes support', async () => {
  const f = setup(), before = digest(f.seed), result = await collectCurrentStandardUsage(f.options);
  assert.equal(digest(f.seed), before);
  assert.equal(result.collection.included_events, 2);
  assert.equal(result.collection.checked_events, 2);
  assert.equal(result.collection.metadata_renewed, false);
  assert.equal(result.next_seed.event_ids.length, 2);
  const snapshot = buildCurrentStandardUsage(result.input, f.policy, {asOf: result.as_of});
  assert.equal(snapshot.coverage.lists, 4);
  assert.equal(snapshot.coverage.qualified_members, 4);
  assert(f.requests.every(url => !url.includes('pairings') && !url.includes('games/decks')));
  assert(f.preserved.some(receipt => receipt.url.includes('/details')));
});

test('provider rate headers pace the next request and Retry-After is honored', async () => {
  assert.equal(sourceRateDelay(new Headers({'ratelimit': '"50-in-5min"; r=7; t=85'}), Date.parse(AS_OF)), 10875);
  assert.equal(sourceRateDelay(new Headers({'ratelimit': '"50-in-5min"; r=0; t=60'}), Date.parse(AS_OF)), 60250);
  assert.equal(sourceRateDelay(new Headers({'retry-after': '120'}), Date.parse(AS_OF)), 120000);
  assert.equal(sourceRateDelay(new Headers({'retry-after': new Date(Date.parse(AS_OF) + 45000).toUTCString()}), Date.parse(AS_OF)), 45000);
  const f = setup(), original = f.options.fetchImpl, pauses = [];
  f.options.sleepImpl = async milliseconds => {pauses.push(milliseconds);};
  f.options.fetchImpl = async url => {const response = await original(url); response.headers.set('ratelimit', '"50-in-5min"; r=0; t=60'); return response;};
  await collectCurrentStandardUsage(f.options);
  assert(pauses.some(value => value === 60000));
  assert(pauses.every(value => value <= 60000));
});

test('metadata nearing retention is actually refetched and raw originals precede parsing', async () => {
  const f = setup(); f.seed.retain_until = '2026-11-13T00:00:00.000Z';
  const result = await collectCurrentStandardUsage(f.options);
  assert.equal(result.collection.metadata_renewed, true);
  assert(f.requests.some(url => url.startsWith('https://api.tcgdex.net/')));
  assert(result.next_seed.metadata_receipts.every(receipt => receipt.observed_at === AS_OF));
  assert.notEqual(result.next_seed.members[0].profile_receipt_id, f.seed.members[0].profile_receipt_id);
  assert.equal(buildCurrentStandardUsage(result.input, f.policy, {asOf: result.as_of}).state, 'ready');
  const malformed = setup(); malformed.seed.retain_until = '2026-11-13T00:00:00.000Z';
  malformed.options.fetchImpl = async () => new Response('invalid source body');
  await assert.rejects(collectCurrentStandardUsage(malformed.options));
  assert.equal(malformed.preserved[0].body_text, 'invalid source body');
});

test('repository renewal retains the pinned commit, original Git blob proofs and license', async () => {
  const f = setup(); f.seed.retain_until = '2026-11-13T00:00:00.000Z';
  const old = f.seed.metadata_receipts.find(receipt => receipt.id === f.seed.members.find(member => member.provider_card_id === 'test-001').profile_receipt_id);
  const profile = JSON.parse(old.body_text), commit = 'a'.repeat(40), name = 'Synthetic Set';
  const cardPath = `data/Mega Evolution/${name}/001.ts`, setPath = `data/Mega Evolution/${name}.ts`;
  const bodies = {[cardPath]: `import { Card } from '../../../interfaces'\nimport Set from '../Synthetic Set'\nconst card: Card = {set:Set,name:{en:${JSON.stringify(profile.name)}},category:'Pokemon',hp:60,stage:'Basic',types:['Colorless'],attacks:[{name:{en:'Synthetic attack'},damage:10}]}\nexport default card`,
    [setPath]: `import { Set } from '../../interfaces'\nimport serie from '../Mega Evolution'\nconst set: Set = {id:'test',name:{en:'Synthetic Set'},serie:serie,cardCount:{official:200}}\nexport default set`,
    LICENSE: 'MIT License\nSynthetic license fixture.'};
  const blob = body => createHash('sha1').update(`blob ${Buffer.byteLength(body)}\0`).update(body).digest('hex');
  const scope = {repository: 'tcgdex/cards-database', commit_sha: commit, sets: [{id: 'test', name}],
    blobs: Object.fromEntries(Object.entries(bodies).map(([file, body]) => [file, blob(body)])), license_sha256: sha256(bodies.LICENSE)};
  const source = {id: 'repo-refresh-fixture', adapter: 'tcgdex_repository_card_v1', allow_ingest: true, retention_days: 7,
    allowed_origins: ['https://raw.githubusercontent.com'], repository: scope, review: {repository_scope_hash: digest(scope)}};
  const base = `https://raw.githubusercontent.com/tcgdex/cards-database/${commit}/`;
  const url = file => base + file.split('/').map(encodeURIComponent).join('/');
  const value = {version: 'tcgdex_repository_capture:v1', repository: scope.repository, commit_sha: commit, set_id: 'test', local_id: '001',
    snapshots: Object.entries(bodies).map(([file, body_text]) => ({url: url(file), observed_at: old.observed_at, body_text, body_sha256: sha256(body_text)}))};
  Object.assign(old, {source_id: source.id, url: url(cardPath), body_text: JSON.stringify(value)}); old.body_sha256 = sha256(old.body_text);
  f.seed.sources.push(source);
  const original = f.options.fetchImpl;
  f.options.fetchImpl = async address => address.startsWith(base)
    ? new Response(bodies[decodeURIComponent(address.slice(base.length))]) : original(address);
  const result = await collectCurrentStandardUsage(f.options);
  assert.equal(buildCurrentStandardUsage(result.input, f.policy, {asOf: result.as_of}).coverage.qualified_members, 4);
  assert(f.requests.every(address => !address.includes('/main/')));
  assert(f.preserved.some(receipt => receipt.url.endsWith('/LICENSE')));
  f.options.fetchImpl = async address => address.startsWith(base) ? new Response('altered pinned source') : original(address);
  await assert.rejects(collectCurrentStandardUsage(f.options), /REPOSITORY_ORIGINAL_HASH/);
});

test('repository-set renewal refreshes every pinned card, set and license original and rejects changed bytes', async () => {
  const f = setup(); f.seed.retain_until = '2026-11-13T00:00:00.000Z';
  const setReceipt = f.seed.metadata_receipts.find(receipt => receipt.id === f.seed.set_receipt_ids[0]);
  const profiles = f.seed.members.map(member => JSON.parse(f.seed.metadata_receipts
    .find(receipt => receipt.id === member.profile_receipt_id).body_text));
  const commit = 'b'.repeat(40), name = 'Synthetic Set', setPath = `data/Mega Evolution/${name}.ts`;
  const bodies = {[setPath]: `import { Set } from '../../interfaces'\nimport serie from '../Mega Evolution'\nconst set: Set = {id:'test',name:{en:'Synthetic Set'},serie:serie,tcgOnline:'TEST',cardCount:{official:200}}\nexport default set`,
    LICENSE: 'MIT License\nSynthetic set renewal fixture.'};
  for (const {id, localId, set, ...fields} of profiles) {
    bodies[`data/Mega Evolution/${name}/${localId}.ts`] = `import { Card } from '../../../interfaces'\nimport Set from '../Synthetic Set'\nconst card: Card = {set:Set,${JSON.stringify(fields).slice(1, -1)}}\nexport default card`;
  }
  const blob = body => createHash('sha1').update(`blob ${Buffer.byteLength(body)}\0`).update(body).digest('hex');
  const scope = {repository: 'tcgdex/cards-database', commit_sha: commit,
    sets: [{id: 'test', name, local_ids: profiles.map(profile => profile.localId)}],
    blobs: Object.fromEntries(Object.entries(bodies).map(([file, body]) => [file, blob(body)])), license_sha256: sha256(bodies.LICENSE)};
  const source = {id: 'repo-set-renewal', adapter: 'tcgdex_repository_set_v1', allow_ingest: true, retention_days: 7,
    allowed_origins: ['https://raw.githubusercontent.com'], repository: scope, review: {repository_scope_hash: digest(scope)}};
  const base = `https://raw.githubusercontent.com/tcgdex/cards-database/${commit}/`;
  const url = file => base + file.split('/').map(encodeURIComponent).join('/');
  const capture = {version: 'tcgdex_repository_set_capture:v1', repository: scope.repository, commit_sha: commit, set_id: 'test',
    snapshots: Object.entries(bodies).map(([file, body_text]) => ({url: url(file), observed_at: setReceipt.observed_at, body_text, body_sha256: sha256(body_text)}))};
  Object.assign(setReceipt, {source_id: source.id, url: url(setPath), body_text: JSON.stringify(capture)});
  setReceipt.body_sha256 = sha256(setReceipt.body_text); f.seed.sources.push(source);
  const before = digest(f.seed), original = f.options.fetchImpl, fetched = [];
  f.options.fetchImpl = async address => address.startsWith(base)
    ? (fetched.push(address), new Response(bodies[decodeURIComponent(address.slice(base.length))])) : original(address);
  const result = await collectCurrentStandardUsage(f.options);
  const renewed = result.next_seed.metadata_receipts.find(receipt => receipt.source_id === source.id);
  assert.equal(result.collection.metadata_renewed, true);
  assert.equal(new Set(fetched).size, 6);
  assert.equal(JSON.parse(renewed.body_text).snapshots.length, 6);
  assert.equal(renewed.observed_at, AS_OF);
  assert.notEqual(result.next_seed.set_receipt_ids[0], setReceipt.id);
  assert.equal(buildCurrentStandardUsage(result.input, f.policy, {asOf: result.as_of}).coverage.qualified_members, 4);
  assert.equal(digest(f.seed), before);
  for (const tampered of [setPath, 'LICENSE', `data/Mega Evolution/${name}/002.ts`]) {
    f.options.fetchImpl = async address => address.startsWith(base)
      ? new Response(decodeURIComponent(address.slice(base.length)) === tampered ? 'changed pinned original' : bodies[decodeURIComponent(address.slice(base.length))])
      : original(address);
    await assert.rejects(collectCurrentStandardUsage(f.options), /REPOSITORY_ORIGINAL_HASH/);
  }
});

test('discovery duplicates, online events, future dates and exact-window events do not inflate usage', async () => {
  const f = setup(), original = f.options.fetchImpl;
  f.options.fetchImpl = async url => {
    if (url.includes('/api/tournaments?')) {
      const response = await original(url), rows = await response.json();
      return Response.json([...rows, rows[0], {...rows[1], id: '000000000000000000000003', date: '2026-11-13T12:00:00.000Z'},
        {...rows[1], id: '000000000000000000000004', isOnline: true},
        {...rows[1], id: '000000000000000000000005', date: '2026-10-13T12:00:00.000Z'}]);
    }
    return original(url);
  };
  const result = await collectCurrentStandardUsage(f.options);
  assert.equal(result.collection.included_events, 2);
  assert(!f.requests.some(url => /00000000000000000000000[345]\/details/.test(url)));
});

test('expired seeds and request limits fail without extending old evidence', async () => {
  const expired = setup(); expired.seed.retain_until = AS_OF;
  await assert.rejects(collectCurrentStandardUsage(expired.options), /REFRESH_SEED_EXPIRED/);
  assert.equal(expired.requests.length, 0);
  const bounded = setup(); bounded.seed.collection.maximum_requests = 1;
  await assert.rejects(collectCurrentStandardUsage(bounded.options), /REFRESH_REQUEST_BOUND/);
  assert.equal(bounded.requests.length, 1);
});

test('refresh publishes a new snapshot and retained seed and persists successful run evidence', async () => {
  const f = setup(), store = new MemoryStore(); await store.put(REFRESH_SEED_KEY, f.seed);
  const result = await refreshCurrentStandardUsage({...f.options, store, policy: f.policy});
  assert.equal(result.coverage.qualified_members, 4);
  assert.equal((await store.get(STANDARD_USAGE_PUBLIC_KEY)).snapshot_id, result.snapshot_id);
  assert.equal((await store.get(REFRESH_SEED_KEY)).event_ids.length, 2);
  const runs = await Promise.all((await store.list('runs')).map(key => store.get(key)));
  assert(runs.some(run => run.purpose === 'current_standard_refresh' && run.status === 'succeeded'));
  assert.equal(await store.get('standard-usage/refresh-lock.json'), null);
});

test('a source failure preserves the previous publication and seed, records failure and releases the lock', async () => {
  const f = setup(), store = new MemoryStore(); await store.put(REFRESH_SEED_KEY, f.seed);
  await store.put(STANDARD_USAGE_PUBLIC_KEY, {snapshot_id: 'previous'});
  await assert.rejects(refreshCurrentStandardUsage({...f.options, store, policy: f.policy,
    fetchImpl: async () => new Response('busy', {status: 429})}), /REFRESH_RATE_LIMITED/);
  assert.deepEqual(await store.get(STANDARD_USAGE_PUBLIC_KEY), {snapshot_id: 'previous'});
  assert.deepEqual(await store.get(REFRESH_SEED_KEY), f.seed);
  const runs = await Promise.all((await store.list('runs')).map(key => store.get(key)));
  assert(runs.some(run => run.status === 'failed' && run.error_code === 'REFRESH_RATE_LIMITED'));
  assert.equal(await store.get('standard-usage/refresh-lock.json'), null);
});

test('overlapping refreshes and changed configuration cannot overwrite a current seed', async () => {
  const f = setup(), store = new MemoryStore(); await store.put(REFRESH_SEED_KEY, f.seed);
  await store.put('standard-usage/refresh-lock.json', {token: 'another-worker'});
  await assert.rejects(refreshCurrentStandardUsage({...f.options, store, policy: f.policy}), /ARTIFACT_EXISTS/);
  assert.deepEqual(await store.get('standard-usage/refresh-lock.json'), {token: 'another-worker'});
  await store.remove('standard-usage/refresh-lock.json');
  const original = f.options.fetchImpl;
  await assert.rejects(refreshCurrentStandardUsage({...f.options, store, policy: f.policy, fetchImpl: async url => {
    if (url.includes('/api/tournaments?')) await store.put(REFRESH_SEED_KEY, {...f.seed, event_ids: []});
    return original(url);
  }}), /REFRESH_CONFIGURATION_CHANGED/);
  assert.equal(await store.get(STANDARD_USAGE_PUBLIC_KEY), null);
});
