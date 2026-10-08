import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import * as policies from '../../apps/web/src/lib/sales/offerPolicies.mjs';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
const source = fs.readFileSync(new URL('../../apps/web/src/app/api/sales/desk/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', card = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', printing = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
function harness() {
    const h = {signedIn: true, calls: [], options: [{id: printing, card_print_id: card, printing_gv_id: 'GV-P-TEST', finish_is_active: true}],
        rows: [{pricing_scope: 'card_printing', card_print_id: card, card_printing_id: printing, status: 'available', currency: 'USD', market_close: 0.29,
            source_name: 'tcgplayer', source_label: 'TCGPlayer Market', freshness: 'fresh', is_from_price: false, unavailable_reason: null,
            observed_at: new Date(Date.now() - 60000).toISOString(), published_at: new Date(Date.now() - 30000).toISOString(), provenance_id: owner}], error: null};
    const client = {auth: {getUser: async () => ({data: {user: h.signedIn ? {id: owner} : null}, error: null})},
        rpc: async (name, args) => {h.calls.push({name, args}); assert.equal(name, 'get_market_pricing_read_model_v1'); return {data: h.rows, error: h.error};}};
    const exports = {};
    const deps = {
        'next/server': {NextResponse: {json: (body, options) => ({body, ...options})}},
        '@/lib/supabase/server': {createServerComponentClient: async () => client},
        '@/lib/getSiteOrigin': {}, '@/app/api/resolver/search/route': {},
        '@/lib/cards/getPublicCardPrintingOptions': {getPublicCardPrintingOptions: async (received, ids) => {assert.equal(received, client); h.calls.push({name: 'printings', args: ids}); return h.options;}},
        '@/lib/canon/resolveCardImageFieldsV1': {}, '@/lib/cards/resolveDisplayIdentity': {},
        '@/lib/sales/salesScanner.mjs': {}, '@/lib/sales/salesPurchase.mjs': {}, '@/lib/sales/offerPolicies.mjs': policies,
    };
    vm.runInNewContext(compiled, {exports, Date, require: name => {assert.ok(name in deps, name); return deps[name];}});
    h.read = (changes = {}) => exports.GET({nextUrl: new URL('http://fixture.test/api/sales/desk?' + new URLSearchParams({action: 'offer-reference', owner, cardId: card, printingId: printing, ...changes}))});
    return h;
}
test('signed-in exact reference uses governed reads and private no-store response', async () => {
    const h = harness(), result = await h.read();
    assert.equal(result.status, 200); assert.equal(result.body.owner, owner); assert.equal(result.body.reference.amountMinor, 29);
    assert.equal(result.body.reference.condition, null); assert.equal(result.headers['Cache-Control'], 'private, no-store');
    assert.equal(result.headers.Vary, 'Cookie, Authorization');
    assert.deepEqual(JSON.parse(JSON.stringify(h.calls)), [{name: 'printings', args: [card]}, {name: 'get_market_pricing_read_model_v1', args: {p_card_print_ids: null, p_card_printing_ids: [printing]}}]);
});
test('signed-out reference never reaches pricing', async () => {const h = harness(); h.signedIn = false; assert.equal((await h.read()).status, 401); assert.equal(h.calls.length, 0);});
test('changed or omitted owner never reaches pricing', async () => {
    for (const value of ['', card]) {const h = harness(); assert.equal((await h.read({owner: value})).status, 409); assert.equal(h.calls.length, 0);}
});
test('invalid identities never reach governed reads', async () => {
    for (const changes of [{cardId: 'bad'}, {printingId: ''}]) {const h = harness(); assert.equal((await h.read(changes)).status, 400); assert.equal(h.calls.length, 0);}
});
test('uppercase identities normalize before exact reads', async () => {const h = harness(); assert.equal((await h.read({cardId: card.toUpperCase(), printingId: printing.toUpperCase()})).body.status, 'available');});
for (const failure of ['missing', 'duplicate', 'wrong-parent', 'inactive', 'unidentified']) test(`ineligible printing ${failure} never reads market`, async () => {
    const h = harness();
    if (failure === 'missing') h.options = [];
    if (failure === 'duplicate') h.options.push({...h.options[0]});
    if (failure === 'wrong-parent') h.options[0].card_print_id = owner;
    if (failure === 'inactive') h.options[0].finish_is_active = false;
    if (failure === 'unidentified') h.options[0].printing_gv_id = null;
    const result = await h.read(); assert.equal(result.body.reason, 'printing_unavailable'); assert.equal(h.calls.length, 1);
});
test('RPC failure is an unavailable request, never a fabricated reference', async () => {const h = harness(); h.error = {code: 'PGRST202'}; const result = await h.read(); assert.equal(result.status, 503); assert.equal(result.body.reference, undefined);});
test('ambiguous pricing does not pick the first row', async () => {const h = harness(); h.rows.push({...h.rows[0], market_close: 99}); assert.equal((await h.read()).body.reason, 'reference_missing_or_ambiguous');});
test('fresh flag cannot hide an expired observation', async () => {const h = harness(); h.rows[0].observed_at = new Date(Date.now() - 37 * 3600000).toISOString(); assert.equal((await h.read()).body.reason, 'reference_stale');});
