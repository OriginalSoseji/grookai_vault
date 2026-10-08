import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNegotiatedTradeLine, negotiatedTradeTotals, validateNegotiatedTradeReceipt} from '../../apps/web/src/lib/sales/negotiatedTrade.mjs';
import * as models from '../../apps/web/src/lib/sales/negotiatedTrade.mjs';
import {cases, receipt as completeReceipt, request as completeRequest, acknowledgement} from '../fixtures/negotiated_trade_cases_v1.mjs';
for (const row of cases) test(`shared negotiated trade: ${row.name}`, () => {
    if (row.valid) assert.doesNotThrow(() => models[row.fn](...row.args));
    else assert.throws(() => models[row.fn](...row.args));
});
test('private acknowledgement and customer handoff have different projections', () => {
    const ack = acknowledgement(), pending = completeRequest();
    const confirmed = models.confirmedNegotiatedTrade(ack, pending);
    assert.equal(confirmed.note, 'PRIVATE NOTE');
    const view = JSON.stringify(models.negotiatedTradeCustomerView(confirmed));
    const share = models.negotiatedTradeReceiptText(completeReceipt(), n => 'USD ' + (n / 100).toFixed(2));
    for (const privateText of ['PRIVATE', 'private@example.invalid', 'Private buyer', 'valueMinor', 'rateBps', 'sourceDispositionId', 'instanceId', 'gvviId']) {
        assert.ok(!view.includes(privateText)); assert.ok(!share.includes(privateText));
    }
    assert.match(share, /USD 6.50 agreed credit/);
    assert.match(share, /Cash change: USD 1.50/);
    ack.request.cart.note = 'edited later';
    assert.equal(confirmed.note, 'PRIVATE NOTE');
    assert.equal(pending.cart.note, 'PRIVATE NOTE');
});
const id = '11111111-1111-4111-8111-111111111111';
const line = (changes = {}) => ({description: 'Agreed bundle', valueMinor: 1000, rateBps: 6000, quantity: 1, cardId: null, printingId: null, condition: null, addToVault: false, creditMinor: 650, ...changes});
const recorded = (changes = {}) => ({...line(), printingGvId: null, instanceId: null, gvviId: null, ...changes});
const snapshot = (items = [recorded()]) => ({version: 2, ...negotiatedTradeTotals(items, true), balanceMinor: 1000 - items.reduce((sum, item) => sum + item.creditMinor, 0)});

for (const creditMinor of [0, 1, 599, 600, 650, 2000, 100000000]) test(`agreed credit ${creditMinor} is retained independently`, () => {
    assert.equal(validateNegotiatedTradeLine(line({creditMinor})).creditMinor, creditMinor);
});
test('whole-line credit is not multiplied by quantity', () => {
    assert.deepEqual(negotiatedTradeTotals([line({quantity: 3})]), {items: [line({quantity: 3})], totalValueMinor: 3000, totalCreditMinor: 650});
});
test('missing reference remains null including mixed known and unknown lines', () => {
    const items = [recorded(), recorded({valueMinor: null, rateBps: null, creditMinor: 0})];
    assert.equal(validateNegotiatedTradeReceipt(snapshot(items), 1000).totalValueMinor, null);
    assert.throws(() => validateNegotiatedTradeReceipt({...snapshot(items), totalValueMinor: 1000}, 1000));
    assert.throws(() => validateNegotiatedTradeReceipt({...snapshot(items), totalValueMinor: 0}, 1000));
});
for (const changes of [
    {valueMinor: null}, {rateBps: null}, {valueMinor: 0}, {rateBps: 0}, {rateBps: 10001},
    {quantity: 0}, {quantity: 1000}, {quantity: 1.5}, {creditMinor: -1}, {creditMinor: 0.5},
    {creditMinor: '650'}, {creditMinor: 100000001}, {valueMinor: 100000000, quantity: 2},
    {addToVault: true}, {printingId: id}, {condition: 'NM'}, {description: ' '},
    {description: 'bad\ntext'}, {unexpected: true},
]) test(`strict agreed line rejects ${JSON.stringify(changes)}`, () => assert.throws(() => validateNegotiatedTradeLine(line(changes))));
test('canonical intake requires one exact printing and a condition', () => {
    const item = recorded({cardId: id, printingId: id, condition: 'NM', addToVault: true, printingGvId: 'GVP-TEST', instanceId: id, gvviId: 'GVVI-TEST-000001'});
    assert.deepEqual(validateNegotiatedTradeReceipt(snapshot([item]), 1000).items[0], item);
    for (const changes of [{quantity: 2}, {printingId: null}, {condition: null}, {instanceId: null}, {gvviId: 'wrong'}, {printingGvId: null}]) assert.throws(() => validateNegotiatedTradeLine({...item, ...changes}, true));
    assert.throws(() => negotiatedTradeTotals([item, {...item, instanceId: id.toUpperCase()}], true));
    assert.throws(() => negotiatedTradeTotals([item, {...item, instanceId: '22222222-2222-4222-8222-222222222222'}], true));
});
test('receipt totals, version and fields must reconcile exactly', () => {
    const value = snapshot();
    assert.deepEqual(validateNegotiatedTradeReceipt(value, 1000), value);
    for (const change of [{version: 1}, {version: 3}, {balanceMinor: 351}, {totalCreditMinor: 600}, {totalValueMinor: null}, {extra: 1}]) assert.throws(() => validateNegotiatedTradeReceipt({...value, ...change}, 1000));
    for (const saleTotal of [null, 0, 100000001, '1000']) assert.throws(() => validateNegotiatedTradeReceipt(value, saleTotal));
});
test('credit and known reference totals remain bounded even with missing references', () => {
    assert.throws(() => negotiatedTradeTotals([line({creditMinor: 100000000}), line({creditMinor: 1})]));
    assert.throws(() => negotiatedTradeTotals([line({valueMinor: null, rateBps: null}), line({valueMinor: 100000000}), line()]));
    assert.throws(() => negotiatedTradeTotals([]));
    assert.throws(() => negotiatedTradeTotals(Array.from({length: 51}, () => line())));
});
test('receipt output is immutable without freezing caller input', () => {
    const value = snapshot();
    const input = structuredClone(value);
    const actual = validateNegotiatedTradeReceipt(input, 1000);
    input.items[0].creditMinor = 900;
    assert.equal(actual.items[0].creditMinor, 650);
    assert.ok(Object.isFrozen(actual) && Object.isFrozen(actual.items) && Object.isFrozen(actual.items[0]));
});
