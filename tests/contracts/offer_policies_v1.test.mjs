import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../../apps/web/src/lib/sales/offerPolicies.mjs';
import {cases, policy, context, reference} from '../fixtures/offer_policy_cases_v1.mjs';
import {offerPresetStore} from '../../apps/web/src/lib/sales/offerPresets.mjs';
for (const row of cases) test(`offer policy: ${row.name}`, () => {
    const before = JSON.stringify(row.args);
    if (row.rejects) assert.throws(() => model[row.fn](...row.args));
    else {
        const value = model[row.fn](...row.args);
        for (const [path, expected] of Object.entries(row.expected)) assert.deepEqual(path.split('.').reduce((value, key) => value[key], value), expected, path);
        assert.ok(Object.isFrozen(value));
    }
    assert.equal(JSON.stringify(row.args), before, 'caller evidence must remain unchanged');
});
test('policy projections are deeply immutable and never include negotiated amounts', () => {
    const value = model.validateOfferPolicies({version: 1, revision: 0, presets: [{id: policy.id, name: policy.name, rateBps: 6500}]});
    assert.throws(() => {value.presets[0].rounding.mode = 'down';});
    assert.throws(() => {value.defaults.cash = policy.id;});
    const quote = model.quoteOfferPolicy(policy, context, reference, 0);
    assert.equal(Object.hasOwn(quote, 'agreedMinor'), false);
    assert.throws(() => {quote.rounding.incrementMinor = 100;});
});
function harness() {
    const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; let active = owner, queue = Promise.resolve();
    const data = new Map();
    const storage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => {data.set(key, value);}};
    const lock = (_key, run) => {const operation = queue.then(run); queue = operation.catch(() => {}); return operation;};
    return {owner, data, storage, lock, repo: model.offerPolicyStore(storage, owner, lock, () => active),
        old: offerPresetStore(storage, owner, lock, () => active), changeOwner: () => {active = null;}};
}
test('reading legacy settings never writes or invents a default; first explicit save upgrades', async () => {
    const h = harness(); const raw = JSON.stringify({version: 1, revision: 9, presets: [{id: policy.id, name: 'Old', rateBps: 6000}]});
    h.data.set(h.repo.key, raw); const book = h.repo.read(); assert.equal(h.data.get(h.repo.key), raw);
    const saved = await h.repo.save(book.revision, book.presets, {cash: policy.id, trade: null});
    assert.equal(saved.version, 2); assert.equal(saved.revision, 10); assert.equal(saved.defaults.cash, policy.id);
    assert.throws(() => h.old.read(), 'older client must not silently discard policy fields');
});
test('legacy write racing policy upgrade loses its stale revision without overwriting either representation', async () => {
    const h = harness(); const value = {id: policy.id, name: 'Legacy writer', rateBps: 5000};
    const results = await Promise.allSettled([h.old.save(0, [value]), h.repo.save(0, [policy], {cash: policy.id, trade: null})]);
    assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'rejected');
    assert.equal(h.repo.read().presets[0].rateBps, 5000); assert.equal(JSON.parse(h.data.get(h.repo.key)).version, 1);
});
test('policy upgrade racing legacy write makes older writer fail closed', async () => {
    const h = harness();
    const results = await Promise.allSettled([h.repo.save(0, [policy], {cash: policy.id, trade: null}), h.old.save(0, [{id: policy.id, name: 'Old', rateBps: 5000}])]);
    assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'rejected');
    assert.equal(h.repo.read().presets[0].rateBps, 6500); assert.equal(h.repo.read().defaults.cash, policy.id);
});
test('captured defaults and policies cannot change while waiting for storage lock', async () => {
    const h = harness(), p = structuredClone(policy), defaults = {cash: policy.id, trade: null};
    const saved = h.repo.save(0, [p], defaults); p.rounding.incrementMinor = 100; defaults.cash = null;
    await saved; assert.equal(h.repo.read().presets[0].rounding.incrementMinor, 1); assert.equal(h.repo.read().defaults.cash, policy.id);
});
test('policy settings never mutate draft or pending journal keys', async () => {
    const h = harness(); h.data.set('grookai.sales-desk.v2.' + h.owner, 'existing held and pending deal');
    await h.repo.save(0, [policy], {cash: null, trade: null});
    assert.equal(h.data.get('grookai.sales-desk.v2.' + h.owner), 'existing held and pending deal');
    assert.equal(h.data.size, 2);
});
test('malformed or future settings remain intact after a failed save', async () => {
    for (const raw of ['{broken', '{"version":3}', '']) {
        const h = harness(); h.data.set(h.repo.key, raw);
        await assert.rejects(h.repo.save(0, [policy], {cash: null, trade: null})); assert.equal(h.data.get(h.repo.key), raw);
    }
});
test('owner changes before queued save prevent all preference writes', async () => {
    const h = harness(); const pending = h.repo.save(0, [policy], {cash: policy.id, trade: null}); h.changeOwner();
    await assert.rejects(pending, /account changed/); assert.equal(h.data.size, 0);
});
test('false storage success cannot confirm a policy', async () => {
    const h = harness(); h.storage.setItem = () => {};
    await assert.rejects(h.repo.save(0, [policy], {cash: null, trade: null}), /verified/);
});
