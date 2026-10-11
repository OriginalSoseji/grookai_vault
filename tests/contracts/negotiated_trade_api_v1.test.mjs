import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import * as trade from '../../apps/web/src/lib/sales/negotiatedTrade.mjs';
import * as purchase from '../../apps/web/src/lib/sales/salesPurchase.mjs';
import * as policies from '../../apps/web/src/lib/sales/offerPolicies.mjs';
import {request, acknowledgement} from '../fixtures/negotiated_trade_cases_v1.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const routeSource = fs.readFileSync(new URL('../../apps/web/src/app/api/sales/desk/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(routeSource, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
function harness(options = {}) {
    const calls = [], exports = {};
    const client = {auth: {getUser: async () => ({data: {user: options.signedOut ? null : {id: owner}}})}, rpc: async (name, params) => {
        calls.push({name, params});
        if (name === 'vendor_sales_negotiated_trade_available_v1') return options.capabilityError ? {data: null, error: {code: options.capabilityError}} : {data: options.enabled ?? true};
        if (name.endsWith('available_v1')) return {data: true};
        if (options.rpcError) return {data: null, error: {code: options.rpcError}};
        return {data: Object.hasOwn(options, 'result') ? options.result : acknowledgement()};
    }};
    vm.runInNewContext(compiled, {exports, URL, require: name => {
        if (name === 'next/server') return {NextResponse: {json: (body, init) => ({body: JSON.parse(JSON.stringify(body)), ...init})}, NextRequest: class {}};
        if (name === '@/lib/supabase/server') return {createServerComponentClient: async () => client};
        if (name === '@/lib/getSiteOrigin') return {getSiteOrigin: () => 'http://127.0.0.1:33620'};
        if (name.endsWith('/negotiatedTrade.mjs')) return trade;
        if (name.endsWith('/salesPurchase.mjs')) return purchase;
        if (name.endsWith('/offerPolicies.mjs')) return policies;
        return {};
    }});
    return {calls, post: async (change = {}, headers = {origin: 'http://127.0.0.1:33620'}) => exports.POST({headers: {get: name => headers[name] ?? null},
        text: async () => JSON.stringify({action: 'trade', owner, ...request(), ...change})}),
    session: async () => exports.GET({nextUrl: new URL('http://127.0.0.1:33620/api/sales/desk')})};
}
for (const action of ['trade', 'recover-trade']) test(`actual route dispatches ${action} with private exact cart`, async () => {
    const h = harness(), result = await h.post({action});
    assert.equal(result.status, 200); assert.equal(result.body.owner, owner);
    assert.deepEqual(result.body.result, acknowledgement());
    assert.equal(h.calls.length, 1); assert.equal(h.calls[0].name, action === 'trade' ? 'vendor_sales_cart_complete_v5' : 'vendor_sales_cart_read_v2');
    assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].params)), {p_request_id: request().id, p_cart: request().cart});
    assert.equal(result.headers['Cache-Control'], 'private, no-store');
});
test('null bound recovery is unresolved, not permission to replace', async () => {
    const h = harness({result: null}); const response = await h.post({action: 'recover-trade'});
    assert.equal(response.status, 200); assert.equal(response.body.result, null); assert.equal(h.calls.length, 1);
});
test('null completion cannot masquerade as success', async () => {
    const response = await harness({result: null}).post(); assert.equal(response.status, 503); assert.equal(response.body.rejected, false);
});
for (const code of ['22023', 'PT409', '23514', '23505', '42501', '22P02', 'P0002', 'XX000']) test(`v5 ${code} preserves pending even if legacy classifies rejection`, async () => {
    const h = harness({rpcError: code}), result = await h.post(); assert.equal(result.body.rejected, false); assert.equal(result.status, 409); assert.equal(h.calls.length, 1);
});
for (const mismatch of ['copy', 'note', 'receipt', 'version']) test(`route rejects mismatched ${mismatch} acknowledgement`, async () => {
    const result = acknowledgement();
    if (mismatch === 'copy') result.request.cart.items[0].instanceId = owner;
    if (mismatch === 'note') result.request.cart.note = 'changed';
    if (mismatch === 'receipt') result.receipt.totalMinor = 999;
    if (mismatch === 'version') result.version = 2;
    const response = await harness({result}).post(); assert.equal(response.status, 503); assert.equal(response.body.rejected, false);
});
test('wrong owner, origin and signed-out requests never reach RPC', async () => {
    for (const kind of ['owner', 'origin', 'signed-out']) {
        const h = harness({signedOut: kind === 'signed-out'});
        const response = await h.post(kind === 'owner' ? {owner: request().id} : {}, {origin: kind === 'origin' ? 'https://wrong.invalid' : 'http://127.0.0.1:33620'});
        assert.ok([401, 403, 409].includes(response.status)); assert.equal(h.calls.length, 0);
    }
});
test('invalid trade body never reaches a writer or clears pending', async () => {
    const h = harness(), cart = request().cart; cart.trades[0].creditMinor = -1;
    const result = await h.post({cart}); assert.equal(result.status, 400); assert.equal(result.body.rejected, false); assert.equal(h.calls.length, 0);
});
test('capability is default-off when missing but operational errors remain errors', async () => {
    assert.equal((await harness({enabled: false}).session()).body.negotiatedTrades, false);
    assert.equal((await harness({capabilityError: 'PGRST202'}).session()).body.negotiatedTrades, false);
    assert.equal((await harness().session()).body.negotiatedTrades, true);
    assert.equal((await harness({capabilityError: 'XX000'}).session()).status, 503);
});
test('legacy sale routes keep their original writers', async () => {
    for (const version of [1, 2, 3]) {
        const h = harness(); await h.post({action: 'sale', cart: {...request().cart, version}});
        assert.equal(h.calls[0].name, 'vendor_sales_cart_complete_v' + version);
    }
});
