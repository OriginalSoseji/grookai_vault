import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {newPurchaseDraft, addPurchaseItem, purchaseDraftRequest, purchaseDraftTotal, purchaseOfferView, validatePurchaseDraft} from '../../apps/web/src/lib/sales/purchaseDraft.mjs';
import {draftJournal, newDraft, saleRequest, addLine} from '../../apps/web/src/lib/sales/salesDesk.mjs';

const line = (extra = {}) => ({description: 'Incoming card', quantity: 1, unitMinor: 650,
    referenceMinor: 1000, rateBps: 6000, cardId: null, printingId: null, condition: null, addToVault: false, ...extra});
const draft = () => addPurchaseItem(newPurchaseDraft(randomUUID(), 'Shop'), line());
function repository(owner = randomUUID()) {
    const values = new Map(), storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
    const lock = (_, task) => task();
    return {values, storage, owner, lock, journal: draftJournal(storage, owner, lock)};
}

test('purchase draft is distinct and may be empty while editing', () => {
    const value = newPurchaseDraft(randomUUID());
    assert.equal(value.kind, 'purchase'); assert.equal(purchaseDraftTotal(value), 0);
    assert.equal(Object.hasOwn(value, 'taxMinor'), false); assert.equal(Object.hasOwn(value, 'trades'), false);
    assert.throws(() => purchaseDraftRequest(value, randomUUID(), true));
    assert.throws(() => saleRequest(value, randomUUID()));
});
test('offer references never replace the agreed manual price', () => {
    const value = draft(); value.items[0] = {...value.items[0], referenceMinor: 2000, rateBps: 5000};
    const request = purchaseDraftRequest(value, randomUUID(), true);
    assert.equal(request.cart.items[0].unitMinor, 650); assert.equal(request.cart.payments[0].amountMinor, 650);
    assert.equal(value.items[0].referenceMinor, 2000);
});
test('zero-cost item is retained beside a positive purchase and canonical copies stay distinct', () => {
    const incoming = line({unitMinor: 0, cardId: randomUUID(), printingId: randomUUID(), condition: 'LP', addToVault: true});
    const value = addPurchaseItem(addPurchaseItem(draft(), incoming), incoming);
    assert.equal(value.items.length, 3); assert.equal(purchaseDraftTotal(value), 650);
    assert.equal(purchaseDraftRequest(value, randomUUID(), true).cart.items[1].unitMinor, 0);
});
test('completion requires an explicit exchange confirmation and exact payouts', () => {
    const value = draft(); assert.throws(() => purchaseDraftRequest(value, randomUUID(), false), /Confirm/);
    value.payments = [{method: 'Cash', amountMinor: 400, tenderedMinor: 400}, {method: 'Other', amountMinor: 250, tenderedMinor: 250}];
    assert.equal(purchaseDraftRequest(value, randomUUID(), true).cart.payments.length, 2);
    value.payments[0].amountMinor = 399;
    assert.doesNotThrow(() => validatePurchaseDraft(value));
    assert.throws(() => purchaseDraftRequest(value, randomUUID(), true));
});
test('incomplete seller email can be held but cannot be recorded', () => {
    const value = draft(); value.customer.email = 'seller@';
    assert.doesNotThrow(() => validatePurchaseDraft(value)); assert.throws(() => purchaseDraftRequest(value, randomUUID(), true), /contact/);
});
test('seller offer is a private-safe preview rather than invented receipt evidence', () => {
    const value = draft(); value.note = 'PRIVATE'; value.customer.name = 'PRIVATE'; value.customer.notes = 'PRIVATE';
    const view = purchaseOfferView(value);
    assert.deepEqual(Object.keys(view).sort(), ['items', 'kind', 'purchaseMinor', 'storeName']);
    assert.deepEqual(Object.keys(view.items[0]).sort(), ['description', 'quantity', 'unitMinor']);
    assert.doesNotMatch(JSON.stringify(view), /PRIVATE|referenceMinor|rateBps|cardId|number|createdAt/);
    view.items[0].unitMinor = 1; assert.equal(value.items[0].unitMinor, 650);
});
test('adding a purchase upgrades the existing owner journal and preserves a held sale', async () => {
    const {journal, storage, owner, lock} = repository();
    const sale = newDraft(randomUUID(), 'Old shop');
    const old = await journal.update(0, book => ({...book, drafts: [sale], active: sale.id}));
    assert.equal(old.version, 2);
    const purchase = draft();
    const updated = await journal.update(old.revision, book => ({...book, drafts: [...book.drafts, purchase], active: purchase.id}));
    assert.equal(updated.version, 3); assert.deepEqual(updated.drafts[0], sale);
    assert.deepEqual(draftJournal(storage, owner, lock).read(), updated);
    const removed = await journal.update(updated.revision, book => ({...book, version: 2, drafts: [sale], active: sale.id}));
    assert.equal(removed.version, 3, 'never downgrade a journal that an older client must reject');
});
test('purchase kind in a legacy journal rejects instead of silently becoming a sale', () => {
    const {journal, values} = repository(), value = draft();
    values.set(journal.key, JSON.stringify({version: 2, revision: 0, drafts: [value], active: value.id, pending: null, catalog: null}));
    assert.throws(() => journal.read(), /Saved deals/);
});
test('purchase draft rejects outgoing fields and unknown kind is not a sale', async () => {
    assert.throws(() => validatePurchaseDraft({...draft(), taxMinor: 0}));
    const {journal} = repository(), value = {...newDraft(randomUUID()), kind: 'unexpected'};
    await assert.rejects(journal.update(0, book => ({...book, drafts: [value], active: value.id})), /Saved deals/);
});
test('reload retains exact pending purchase, blocks edits and forbids changed request reuse', async () => {
    const {journal, storage, owner, lock} = repository(), value = draft(), pending = purchaseDraftRequest(value, randomUUID(), true);
    const staged = await journal.update(0, book => ({...book, drafts: [value], active: value.id, pending}));
    assert.deepEqual(draftJournal(storage, owner, lock).read().pending, pending);
    await assert.rejects(journal.update(staged.revision, book => ({...book, drafts: [{...value, note: 'changed'}]})), /Recover/);
    await assert.rejects(journal.update(staged.revision, book => ({...book, pending: {...pending, id: randomUUID()}})), /Recover/);
    assert.deepEqual(journal.read().pending, pending);
});
test('existing pending sale survives a format upgrade byte for byte', async () => {
    const {journal} = repository();
    const value = addLine(newDraft(randomUUID(), 'Shop'), {description: 'Outgoing', quantity: 1, unitMinor: 300});
    const pending = saleRequest(value, randomUUID());
    const saved = await journal.update(0, book => ({...book, drafts: [value], active: value.id, pending}));
    const upgraded = await journal.update(saved.revision, book => ({...book, version: 3}));
    assert.deepEqual(upgraded.pending, pending); assert.deepEqual(upgraded.drafts, saved.drafts);
});
test('purchase cannot coexist with catalog intake and catalog must target a sale draft', async () => {
    const {journal} = repository(), value = draft(), pending = purchaseDraftRequest(value, randomUUID(), true);
    const catalog = {id: randomUUID(), draftId: value.id, card: {cardId: randomUUID(), printingId: randomUUID(), condition: 'NM', intent: 'hold', priceMinor: null}, line: {description: 'Outgoing', quantity: 1, unitMinor: 300}};
    await assert.rejects(journal.update(0, book => ({...book, drafts: [value], active: value.id, catalog, pending})), /Saved deals/);
    await assert.rejects(journal.update(0, book => ({...book, drafts: [value], active: value.id, catalog})), /Saved deals/);
});
test('purchase pending rejects malformed payload before recovery can reinterpret it', async () => {
    const {journal} = repository(), value = draft(), pending = structuredClone(purchaseDraftRequest(value, randomUUID(), true));
    pending.cart.items[0].unitMinor = 649;
    await assert.rejects(journal.update(0, book => ({...book, drafts: [value], active: value.id, pending}))); assert.equal(journal.read().pending, null);
});
test('held purchases retain owner isolation and optimistic revision conflict', async () => {
    const {journal, storage, owner, lock} = repository(), value = draft();
    const second = draftJournal(storage, owner, lock);
    await journal.update(0, book => ({...book, drafts: [value], active: value.id}));
    await assert.rejects(second.update(0, book => book), /another tab/);
    assert.equal(draftJournal(storage, randomUUID(), lock).read().drafts.length, 0);
});
test('purchase draft limits apply to total lines and aggregate cents', () => {
    const value = {...draft(), items: Array.from({length: 50}, () => line())};
    assert.doesNotThrow(() => validatePurchaseDraft(value)); assert.throws(() => addPurchaseItem(value, line()));
    assert.throws(() => validatePurchaseDraft({...draft(), items: [line({unitMinor: 100000000}), line()]}));
});
