import test from 'node:test';
import assert from 'node:assert/strict';
import {SquareClient, SquareApiError} from '../client_v1.mjs';
import {sealSquareCredential, openSquareCredential} from '../credential_envelope_v1.mjs';
import {SquareCatalogService, squareEnvironmentConfig} from '../service_v1.mjs';
import {squareQrSku} from '../catalog_plan_v1.mjs';

const key = Buffer.alloc(32, 7).toString('base64');
const owner = 'ab000000-0000-4000-8000-000000000001', connectionId = 'ab000000-0000-4000-8000-000000000002';
const targetId = 'ab000000-0000-4000-8000-000000000003', requestId = 'ab000000-0000-4000-8000-000000000004';
const gvvi = 'GVVI-DEMO0000-000001';
const context = {purpose: 'tokens', environment: 'sandbox', ownerId: owner, connectionId, bindingId: 'fixture-merchant'};
const config = {environment: 'sandbox', appId: 'fixture-app', appSecret: 'fixture-secret', encryptionKey: key,
  callbackUrl: 'https://example.org/api/square/oauth/callback', linkingEnabled: true, catalogEnabled: true};
const tokens = {merchantId: 'fixture-merchant', accessToken: 'fixture-access-token', refreshToken: 'fixture-refresh-token', expiresAt: '2030-01-01T00:00:00.000Z'};
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {status, headers});

test('credential envelopes bind ciphertext to purpose, owner, connection, merchant and environment', () => {
  const value = sealSquareCredential(tokens, key, context);
  assert.deepEqual(openSquareCredential(value, key, context), tokens);
  assert.notEqual(value, sealSquareCredential(tokens, key, context));
  for (const change of [{ownerId: 'other-owner'}, {connectionId: 'other-connection'}, {bindingId: 'other-merchant'},
    {environment: 'production'}, {purpose: 'launch'}]) assert.throws(() => openSquareCredential(value, key, {...context, ...change}));
  assert.throws(() => openSquareCredential(value + '.extra', key, context));
  assert.throws(() => openSquareCredential(value, Buffer.alloc(32, 9).toString('base64'), context));
  assert.throws(() => sealSquareCredential(tokens, 'weak-key', context));
  assert.equal(value.includes(tokens.accessToken), false);
});

test('provider origin/version are fixed, redirects rejected, OAuth requests omit bearer authentication', async () => {
  const calls = [];
  const client = new SquareClient({environment: 'sandbox', fetchImpl: async (url, init) => {
    calls.push({url: String(url), init});
    return json({access_token: tokens.accessToken, refresh_token: tokens.refreshToken, merchant_id: tokens.merchantId,
      token_type: 'bearer', expires_at: tokens.expiresAt});
  }});
  const got = await client.obtainToken({appId: config.appId, appSecret: config.appSecret, code: 'fixture-code', redirectUri: config.callbackUrl});
  assert.deepEqual(got, tokens);
  assert.equal(calls[0].url, 'https://connect.squareupsandbox.com/oauth2/token');
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(calls[0].init.headers['Square-Version'], '2026-09-16');
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.equal(JSON.parse(calls[0].init.body).grant_type, 'authorization_code');
  const authorization = new URL(client.authorizationUrl({appId: config.appId, redirectUri: config.callbackUrl, state: 'fixture-state'}));
  assert.equal(authorization.searchParams.get('scope'), 'ITEMS_READ ITEMS_WRITE MERCHANT_PROFILE_READ');
  assert.equal(authorization.searchParams.get('session'), 'false');
  assert.throws(() => client.authorizationUrl({appId: config.appId, redirectUri: 'http://example.org/api/square/oauth/callback', state: 'state'}));
  assert.throws(() => new SquareClient({environment: 'https://attacker.invalid'}));
});

test('timeouts and malformed successful mutation replies are uncertain; raw provider errors are not exposed', async () => {
  for (const fetchImpl of [async () => {throw Error('raw token secret');}, async () => new Response('not-json')]) {
    const client = new SquareClient({environment: 'sandbox', accessToken: tokens.accessToken, fetchImpl});
    await assert.rejects(client.upsert({idempotency_key: 'fixture-key', object: {type: 'ITEM', item_data: {name: 'Fixture',
      variations: [{type: 'ITEM_VARIATION', item_variation_data: {sku: squareQrSku(gvvi)}}]}}}, squareQrSku(gvvi)), error => error.uncertain === true && !error.message.includes('raw token'));
  }
  const rejected = new SquareClient({environment: 'sandbox', accessToken: tokens.accessToken,
    fetchImpl: async () => json({errors: [{detail: 'private credential'}]}, 401)});
  await assert.rejects(rejected.item('item'), error => error.code === 'square_authorization_required' && !error.message.includes('credential'));
});

test('provider response size and repeated cursor bounds prevent incomplete catalog reads from becoming empty success', async () => {
  const large = new SquareClient({environment: 'sandbox', accessToken: tokens.accessToken,
    fetchImpl: async () => new Response('x'.repeat(2 * 1024 * 1024 + 1))});
  await assert.rejects(large.item('item'), error => error.code === 'square_response_invalid');
  let calls = 0;
  const repeating = new SquareClient({environment: 'sandbox', accessToken: tokens.accessToken,
    fetchImpl: async () => {calls++; return json({objects: [], cursor: 'same-cursor'});}});
  await assert.rejects(repeating.itemsForExactSku(squareQrSku(gvvi)), error => error.code === 'square_catalog_incomplete');
  assert.equal(calls, 2);
});

test('exact-SKU searches are read operations and retrieve complete parents; merchant/location identity is verified', async () => {
  const calls = [];
  const client = new SquareClient({environment: 'production', accessToken: tokens.accessToken,
    fetchImpl: async (url, init) => {
      calls.push({url: String(url), init});
      if (url.pathname === '/v2/catalog/search') return json({objects: [{type: 'ITEM_VARIATION', item_variation_data: {sku: squareQrSku(gvvi), item_id: 'item'}}]});
      if (url.pathname === '/v2/catalog/object/item') return json({object: {id: 'item', type: 'ITEM'}});
      if (url.pathname === '/v2/merchants/merchant') return json({merchant: {id: 'other-merchant'}});
      return json({locations: [{id: 'location', name: 'Fixture', status: 'ACTIVE', merchant_id: 'merchant', currency: 'USD'},
        {id: 'foreign', status: 'ACTIVE', merchant_id: 'other-merchant', currency: 'USD'}]});
    }});
  assert.equal((await client.itemsForExactSku(squareQrSku(gvvi))).length, 1);
  assert.equal(JSON.parse(calls[0].init.body).query.exact_query.attribute_value, squareQrSku(gvvi));
  assert.deepEqual((await client.locations('merchant')).map(row => row.id), ['location']);
  await assert.rejects(client.merchant('merchant'), error => error.code === 'square_merchant_mismatch');
  assert.ok(calls.every(call => call.url.startsWith('https://connect.squareup.com/')));
});

test('test-account discovery requires exactly one active merchant and a complete response', async () => {
  for (const value of [{merchant: []}, {merchant: [{id: 'one', status: 'ACTIVE'}, {id: 'two', status: 'ACTIVE'}]},
    {merchant: [{id: 'one', status: 'INACTIVE'}]}, {merchant: [{id: 'one', status: 'ACTIVE'}], cursor: 1}]) {
    const client = new SquareClient({environment: 'sandbox', accessToken: tokens.accessToken, fetchImpl: async () => json(value)});
    await assert.rejects(client.currentMerchant(), error => error.code === 'square_merchant_unconfirmed');
  }
  const client = new SquareClient({environment: 'sandbox', accessToken: tokens.accessToken, fetchImpl: async (url, init) => {
    assert.equal(String(url), 'https://connect.squareupsandbox.com/v2/merchants'); assert.equal(init.method, 'GET');
    return json({merchant: [{id: 'one', status: 'ACTIVE'}]});
  }});
  assert.deepEqual(await client.currentMerchant(), {id: 'one'});
});

function harness(options = {}) {
  const calls = [], providerCalls = [];
  const connection = {id: connectionId, owner_id: owner, environment: 'sandbox', merchant_id: tokens.merchantId,
    location_id: 'fixture-location', lease_fence: 1, refresh_status: 'idle',
    token_ciphertext: sealSquareCredential({...tokens, ...options.tokens}, key, context)};
  const offer = {ownerId: owner, gvviId: gvvi, selected: true, publicVendorOffer: true, available: true,
    name: 'Fixture card', variationName: 'Holo · NM', askingPriceAmount: '20.00', currency: 'USD'};
  const state = {target: {id: targetId, selected: true, item_id: null, variation_id: null, last_synced_projection: null},
    offer, pendingOperation: null, items: [], operation: null};
  let finishFails = options.finishFails ?? false;
  const rpc = async (action, data) => {
    calls.push({action, data: structuredClone(data)});
    if (action === 'claim') return connection;
    if (action === 'target') return {target: structuredClone(state.target), offer: state.offer,
      pendingOperation: state.operation && ['prepared', 'sending', 'uncertain'].includes(state.operation.status) ? structuredClone(state.operation) : null};
    if (action === 'prepare') {
      state.operation = {id: 'ab000000-0000-4000-8000-000000000005', target_id: targetId,
        status: 'prepared', payload: data.payload, source_snapshot: data.sourceSnapshot,
        projection: JSON.parse(JSON.stringify(data.projection, Object.keys(data.projection).sort()))};
      // Preserve nested projection objects while reversing top-level property order,
      // as Postgres JSONB can return keys in a different order than JS objects.
      state.operation.projection = Object.fromEntries(Object.entries(data.projection).reverse());
      return structuredClone(state.operation);
    }
    if (action === 'begin') {state.operation.status = 'sending'; return structuredClone(state.operation);}
    if (action === 'finish' || action === 'recover_finish') {
      if (finishFails) {finishFails = false; throw new SquareApiError('square_state_unavailable');}
      state.operation.status = 'succeeded'; Object.assign(state.target, {item_id: data.itemId, variation_id: data.variationId,
        last_synced_projection: state.operation.projection}); return structuredClone(state.operation);
    }
    if (action === 'fail') {state.operation.status = data.uncertain ? 'uncertain' : 'failed'; return structuredClone(state.operation);}
    return {recorded: true};
  };
  const clientFactory = () => ({
    itemsForExactSku: async () => {providerCalls.push('read'); if(options.lookupError)throw options.lookupError; return structuredClone(state.items);},
    locations: async () => [{id: 'fixture-location'}],
    obtainToken: async () => {providerCalls.push('refresh'); if (options.refreshFails) throw new SquareApiError('square_provider_unavailable', {uncertain: true}); return tokens;},
    upsert: async payload => {
      providerCalls.push('upsert'); assert.equal(calls.at(-1).action, 'begin');
      const item = structuredClone(payload.object); item.id = 'fixture-item'; item.version = 123;
      const variation = item.item_data.variations[0]; variation.id = 'fixture-variation'; variation.version = 123;
      variation.item_variation_data.item_id = item.id; state.items = [item];
      if (options.acceptThenTimeout) throw new SquareApiError('square_provider_unavailable', {uncertain: true});
      return {itemId: item.id, variationId: variation.id};
    },
  });
  return {calls, providerCalls, state, connection, service: new SquareCatalogService({rpc, config, clientFactory, now: () => Date.parse('2026-11-11T00:00:00Z')})};
}

test('catalog sync commits exact request before sending, then saves mapping and reuses it for no-op', async () => {
  const h = harness();
  assert.deepEqual(await h.service.sync(owner, connectionId, targetId, requestId), {status: 'synced'});
  const prepare = h.calls.find(call => call.action === 'prepare');
  assert.equal(prepare.data.payload.object.item_data.variations[0].item_variation_data.sku, squareQrSku(gvvi));
  assert.ok(h.calls.findIndex(call => call.action === 'prepare') < h.calls.findIndex(call => call.action === 'begin'));
  assert.deepEqual(await h.service.sync(owner, connectionId, targetId, requestId), {status: 'unchanged'});
  assert.equal(h.providerCalls.filter(call => call === 'upsert').length, 1);
});

for (const scenario of [{acceptThenTimeout: true}, {finishFails: true}]) {
  test('provider acceptance with ' + Object.keys(scenario)[0] + ' is recovered by read without another create/key', async () => {
    const h = harness(scenario);
    await assert.rejects(h.service.sync(owner, connectionId, targetId, requestId));
    assert.equal(h.state.operation.status, 'uncertain');
    const payload = structuredClone(h.state.operation.payload);
    assert.deepEqual(await h.service.sync(owner, connectionId, targetId, requestId), {status: 'reconciled'});
    assert.deepEqual(h.state.operation.payload, payload);
    assert.equal(h.providerCalls.filter(call => call === 'upsert').length, 1);
  });
}

test('uncertain publication cannot be resent after deselection/source change; unresolved evidence is retained', async () => {
  const h = harness({acceptThenTimeout: true});
  await assert.rejects(h.service.sync(owner, connectionId, targetId, requestId));
  h.state.items = []; h.state.target.selected = false;
  await assert.rejects(h.service.sync(owner, connectionId, targetId, requestId), error => error.code === 'square_reconciliation_required');
  assert.equal(h.state.operation.status, 'uncertain');
  assert.equal(h.providerCalls.filter(call => call === 'upsert').length, 1);
});

test('existing manual item produces an adoption review with no provider update', async () => {
  const h = harness(); await h.service.sync(owner, connectionId, targetId, requestId);
  Object.assign(h.state.target, {item_id: null, variation_id: null, last_synced_projection: null});
  const review = await h.service.sync(owner, connectionId, targetId, requestId);
  assert.equal(review.status, 'adoption_required'); assert.equal(review.reviewHash.length, 64);
  await assert.rejects(h.service.adopt(owner, connectionId, targetId, {...review, expectedReviewHash: 'stale', requestId, confirmed: true}));
  assert.equal(h.providerCalls.filter(call => call === 'upsert').length, 1);
});

test('refresh preparation is durable before network; ambiguous refresh stops catalog writes', async () => {
  const h = harness({tokens: {expiresAt: '2026-11-10T00:00:00Z'}, refreshFails: true});
  await assert.rejects(h.service.sync(owner, connectionId, targetId, requestId));
  assert.ok(h.calls.some(call => call.action === 'refresh_prepare'));
  assert.ok(h.calls.some(call => call.action === 'refresh_fail'));
  assert.equal(h.providerCalls.includes('upsert'), false);
});

test('configuration controls default off; pause/disconnect require no provider credentials', async () => {
  assert.equal(squareEnvironmentConfig({}).linkingEnabled, false);
  assert.equal(squareEnvironmentConfig({}).catalogEnabled, false);
  const calls = []; const service = new SquareCatalogService({config: {}, rpc: async action => {calls.push(action); return {status: 'disconnected'};}});
  await assert.rejects(service.start(owner), error => error.code === 'square_configuration_unavailable');
  await service.pause(owner, connectionId); await service.disconnect(owner, connectionId);
  assert.deepEqual(calls, ['pause', 'disconnect']);
});

test('rate limits persist provider backoff; future retry timestamps stop IO after process restart',async()=>{
  const h=harness({lookupError:new SquareApiError('square_rate_limited',{status:429,retryAfterSeconds:3600})});
  await assert.rejects(h.service.sync(owner,connectionId,targetId,requestId));
  assert.equal(h.calls.find(row=>row.action==='defer').data.seconds,3600);
  const later=harness();later.connection.retry_after='2030-01-01T00:00:00Z';
  await assert.rejects(later.service.sync(owner,connectionId,targetId,requestId),error=>error.code==='square_rate_limited');
  assert.equal(later.providerCalls.length,0);
});
test('revoked provider permission pauses the connection instead of retrying item creation',async()=>{
  const h=harness({lookupError:new SquareApiError('square_authorization_required',{status:401})});
  await assert.rejects(h.service.sync(owner,connectionId,targetId,requestId));
  assert.ok(h.calls.some(row=>row.action==='authorization_failed'));
  assert.equal(h.providerCalls.includes('upsert'),false);
});
