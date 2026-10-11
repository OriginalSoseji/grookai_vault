export const id = '11111111-1111-4111-8111-111111111111';
export const otherId = '22222222-2222-4222-8222-222222222222';
export const line = (change = {}) => ({description: 'Incoming bundle', valueMinor: 1000, rateBps: 6000, quantity: 1, cardId: null, printingId: null, condition: null, addToVault: false, creditMinor: 650, ...change});
export const recorded = (change = {}) => ({...line(), printingGvId: null, instanceId: null, gvviId: null, ...change});
export const request = () => ({id, cart: {version: 5, storeName: 'Trade store', method: 'Cash',
    items: [{instanceId: otherId, description: 'Outgoing card', quantity: 1, unitMinor: 1000}], taxMinor: 0, note: 'PRIVATE NOTE',
    customer: {name: 'Private buyer', email: 'private@example.invalid', phone: '', wants: 'PRIVATE WANTS', notes: 'PRIVATE CONTACT NOTE'}, customerId: null,
    trades: [line()], payments: [{method: 'Cash', amountMinor: 350, tenderedMinor: 500}]}});
export const receipt = () => ({version: 1, id, number: 'GV-20261008-11111111', createdAt: '2026-10-08T05:00:00.000Z', storeName: 'Trade store', customerName: 'Private buyer', method: 'Cash',
    items: [{description: 'Outgoing card', quantity: 1, unitMinor: 1000, lineMinor: 1000}], subtotalMinor: 1000, discountMinor: 0, taxMinor: 0, totalMinor: 1000,
    note: 'PRIVATE NOTE', sourceDispositionId: '33333333-3333-4333-8333-333333333333',
    tradeIn: {version: 2, items: [recorded()], totalValueMinor: 1000, totalCreditMinor: 650, balanceMinor: 350},
    payments: {version: 1, entries: [{method: 'Cash', amountMinor: 350, tenderedMinor: 500}], balanceMinor: 350, changeMinor: 150}});
export const acknowledgement = () => ({version: 1, request: request(), receipt: receipt()});
const changed = (value, edit) => {const result = structuredClone(value); edit(result); return result;};
export const cases = [];
function add(name, fn, args, valid) {cases.push({name, fn, args, valid});}
for (const creditMinor of [0, 1, 599, 600, 650, 2000, 100000000]) add(`explicit credit ${creditMinor}`, 'validateNegotiatedTradeLine', [line({creditMinor})], true);
add('no reference', 'validateNegotiatedTradeLine', [line({valueMinor: null, rateBps: null})], true);
add('whole-line quantity', 'negotiatedTradeTotals', [[line({quantity: 3})]], true);
add('unknown mixed reference total', 'negotiatedTradeTotals', [[line(), line({valueMinor: null, rateBps: null})]], true);
for (const [index, change] of [
    {valueMinor: null}, {rateBps: null}, {valueMinor: 0}, {rateBps: 0}, {rateBps: 10001}, {quantity: 0}, {quantity: 1000}, {quantity: 1.5},
    {creditMinor: -1}, {creditMinor: 0.5}, {creditMinor: '650'}, {creditMinor: 100000001}, {valueMinor: 100000000, quantity: 2},
    {addToVault: true}, {printingId: id}, {condition: 'NM'}, {description: ' '}, {description: 'bad\ntext'}, {unexpected: true},
].entries()) add(`invalid line ${index}`, 'validateNegotiatedTradeLine', [line(change)], false);
add('request', 'validateNegotiatedTradeRequest', [request()], true);
for (const [index, edit] of [
    r => r.cart.version = 3, r => r.cart.kind = 'sale', r => delete r.cart.trades, r => r.cart.trades = [], r => r.cart.items = [],
    r => r.cart.items.push({...r.cart.items[0]}), r => r.cart.items[0].unitMinor = 0, r => r.cart.items[0].instanceId = 'bad',
    r => r.cart.items[0].quantity = 2, r => r.cart.taxMinor = -1, r => r.cart.taxMinor = 100000000,
    r => r.cart.customer.extra = true, r => r.cart.customer.name = 'bad\nname', r => r.cart.customer.email = 'invalid',
    r => r.cart.customerId = 'bad', r => r.cart.payments[0].amountMinor = 349, r => r.cart.method = 'Other',
    r => r.cart.payments[0].tenderedMinor = 300, r => r.cart.note = 'x'.repeat(351), r => delete r.id,
].entries()) add(`invalid request ${index}`, 'validateNegotiatedTradeRequest', [changed(request(), edit)], false);
add('receipt', 'validateNegotiatedSaleReceipt', [receipt()], true);
for (const [index, edit] of [
    r => r.version = 2, r => r.number = 'wrong', r => r.createdAt = '2026-02-30T05:00:00.000Z', r => r.createdAt = '2026-10-08T05:00:00Z',
    r => r.tradeIn.version = 1, r => r.tradeIn.totalCreditMinor = 600, r => r.tradeIn.totalValueMinor = null,
    r => r.items[0].lineMinor = 999, r => r.discountMinor = 1, r => r.items[0].unitMinor = 0, r => r.totalMinor = 999,
    r => r.items[0].instanceId = otherId, r => r.payments.changeMinor = 0, r => r.method = 'Other', r => r.sourceDispositionId = 'bad',
].entries()) add(`invalid receipt ${index}`, 'validateNegotiatedSaleReceipt', [changed(receipt(), edit)], false);
add('confirmed', 'confirmedNegotiatedTrade', [acknowledgement(), request()], true);
add('echo object keys may reorder', 'confirmedNegotiatedTrade', [changed(acknowledgement(), a => a.request.cart.customer = Object.fromEntries(Object.entries(a.request.cart.customer).reverse())), request()], true);
for (const [index, edit] of [
    a => a.version = 2, a => a.extra = true, a => a.request.cart.items[0].instanceId = id,
    a => a.request.cart.note = 'changed', a => a.request.cart.customer.notes = 'changed', a => a.request.id = otherId,
    a => a.receipt.id = otherId, a => a.receipt.note = 'changed', a => a.receipt.customerName = 'changed',
    a => a.receipt.items[0].description = 'changed', a => a.receipt.sourceDispositionId = null,
    a => a.receipt.tradeIn.items[0].rateBps = 5000, a => a.receipt.tradeIn.items[0].description = 'changed',
    a => {a.receipt.tradeIn.items[0].valueMinor = 2000; a.receipt.tradeIn.totalValueMinor = 2000;},
].entries()) add(`mismatched acknowledgement ${index}`, 'confirmedNegotiatedTrade', [changed(acknowledgement(), edit), request()], false);
for (const credit of [1000, 1500]) {
    const req = request(), rec = receipt(), balance = 1000 - credit;
    req.cart.trades[0].creditMinor = credit;
    req.cart.payments = balance === 0 ? [] : [{method: 'Cash', amountMinor: -balance, tenderedMinor: -balance}];
    req.cart.method = balance === 0 ? 'Other' : 'Cash';
    rec.method = req.cart.method; rec.tradeIn.items[0].creditMinor = credit; rec.tradeIn.totalCreditMinor = credit; rec.tradeIn.balanceMinor = balance;
    rec.payments = {version: 1, entries: req.cart.payments, balanceMinor: balance, changeMinor: 0};
    add(`confirmed balance ${balance}`, 'confirmedNegotiatedTrade', [{version: 1, request: req, receipt: rec}, req], true);
}
add('customer projection', 'negotiatedTradeCustomerView', [receipt()], true);
for (const stamp of ['0000-10-08T05:00:00.000Z', '+010000-10-08T05:00:00.000Z']) {
    add('unsupported year ' + stamp, 'validateNegotiatedSaleReceipt', [changed(receipt(), r => {
        r.createdAt = stamp; r.number = 'GV-' + stamp.slice(0, 10).replaceAll('-', '') + '-11111111';
    })], false);
}
{
    const ack = acknowledgement(), pending = request();
    pending.id = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';
    ack.request.id = pending.id.toLowerCase(); ack.receipt.id = ack.request.id; ack.receipt.number = 'GV-20261008-AAAAAAAA';
    add('RPC UUID casing preserves identity with exact cart echo', 'confirmedNegotiatedTrade', [ack, pending], true);
}
