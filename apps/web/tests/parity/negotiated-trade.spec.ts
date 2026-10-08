import {test, expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomUUID} from 'node:crypto';
import {paymentSnapshot} from '../../src/lib/sales/salesPayments.mjs';
import {negotiatedTradeTotals} from '../../src/lib/sales/negotiatedTrade.mjs';
import type {NegotiatedTradeRequest} from '../../src/lib/sales/negotiatedTrade.mjs';

const owner = '00000000-0000-4000-8000-000000000001';
const key = 'grookai.sales-desk.v2.' + owner;
const card = {id: '00000000-0000-4000-8000-000000000020', name: 'Incoming card', gv_id: 'GV-FIXTURE',
    printings: [{id: '00000000-0000-4000-8000-000000000021', finish_label: 'Holo', printing_gv_id: 'GVP-FIXTURE-HOLO'}]};
function acknowledgement(request: NegotiatedTradeRequest) {
    const {id, cart} = request;
    const items = cart.items.map(line => ({description: line.description, quantity: line.quantity, unitMinor: line.unitMinor, lineMinor: line.quantity * line.unitMinor}));
    const subtotalMinor = items.reduce((sum, line) => sum + line.lineMinor, 0), totalMinor = subtotalMinor + cart.taxMinor;
    const trades = cart.trades.map(line => ({...line, printingGvId: line.cardId ? 'GVP-FIXTURE-HOLO' : null,
        instanceId: line.addToVault ? randomUUID() : null, gvviId: line.addToVault ? 'GVVI-FIXTURE-' + randomUUID().toUpperCase() : null}));
    const totals = negotiatedTradeTotals(trades, true), balanceMinor = totalMinor - totals.totalCreditMinor;
    return {version: 1, request: structuredClone(request), receipt: {version: 1, id, number: 'GV-20261008-' + id.slice(0, 8).toUpperCase(),
        createdAt: '2026-10-08T03:00:00.000Z', storeName: cart.storeName, customerName: cart.customer.name, note: cart.note, method: cart.method,
        items, subtotalMinor, discountMinor: 0, taxMinor: cart.taxMinor, totalMinor,
        sourceDispositionId: cart.items.some(line => line.instanceId !== null) ? randomUUID() : null,
        tradeIn: {version: 2, ...totals, balanceMinor}, payments: paymentSnapshot([...cart.payments], balanceMinor)}};
}
async function fixture(page: Page, options: {loseReply?: boolean; mismatch?: boolean; rejected?: boolean} = {}) {
    const state = {enabled: true, referenceMinor: 1001, posts: [] as NegotiatedTradeRequest[], reads: [] as NegotiatedTradeRequest[], records: new Map<string, ReturnType<typeof acknowledgement>>()};
    await page.route('http://127.0.0.1:54321/**', route => route.fulfill({json: new URL(route.request().url()).pathname.endsWith('/user') ?
        {id: owner, aud: 'authenticated', email: 'trade@fixture.invalid', created_at: '2026-10-08T00:00:00Z'} : {}}));
    await page.route('**/api/sales/desk?**', async route => {
        if (route.request().method() === 'POST') {
            const body = route.request().postDataJSON();
            expect(body.owner).toBe(owner); expect(body.cart.version).toBe(5);
            const request = {id: body.id, cart: body.cart} as NegotiatedTradeRequest;
            if (body.action === 'recover-trade') {
                state.reads.push(request); expect(route.request().url()).not.toContain(body.id);
                return route.fulfill({json: {owner, result: state.records.get(body.id) ?? null}});
            }
            expect(body.action).toBe('trade'); state.posts.push(request);
            if (options.rejected) return route.fulfill({status: 409, json: {error: 'Changed request', rejected: true}});
            if (!state.records.has(body.id)) state.records.set(body.id, acknowledgement(request));
            if (options.loseReply && state.posts.length === 1) return route.abort('failed');
            const ack = structuredClone(state.records.get(body.id)!);
            if (options.mismatch) ack.request = {...ack.request, cart: {...ack.request.cart, note: 'Different saved terms'}};
            return route.fulfill({json: {owner, result: ack}});
        }
        const action = new URL(route.request().url()).searchParams.get('action') ?? 'session';
        if (action === 'session') return route.fulfill({json: {owner, available: state.enabled, negotiatedTrades: state.enabled, trades: true, payments: true, purchases: true}});
        if (action === 'book') return route.fulfill({json: {book: {storeName: 'Trade shop', customers: [], receipts: []}}});
        if (action === 'offer-reference') return route.fulfill({json: {owner, status: 'available', reference: {source: 'tcgplayer_market', amountMinor: state.referenceMinor,
            currency: 'USD', cardId: card.id, printingId: card.printings[0].id, condition: null, provenanceId: owner,
            observedAt: new Date(Date.now()-60000).toISOString(), publishedAt: new Date(Date.now()-30000).toISOString()}}});
        expect(action).not.toBe('recover');
        return route.fulfill({json: {cards: action === 'catalog' ? [card] : [], next: null}});
    });
    return state;
}
async function openTrade(page: Page) {
    await page.goto('/visual-fixtures/vendor-workspace');
    await expect(page.getByLabel('Store name', {exact: true})).toHaveValue('Trade shop');
    await page.getByRole('button', {name: 'New trade', exact: true}).click();
    await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).version, key)).toBe(4);
    await page.getByRole('button', {name: 'Quick item', exact: true}).click();
    await page.getByLabel('Description', {exact: true}).fill('Outgoing card');
    await page.getByLabel('Sale price (USD)', {exact: true}).fill('10.00');
    await page.getByRole('button', {name: 'Add to deal', exact: true}).click();
    await expect(page.getByLabel('Price for Outgoing card')).toHaveValue('10.00');
    await page.getByRole('button', {name: 'Trade-in', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Incoming trade cards'})).toBeVisible();
}
async function quick(page: Page, credit = '6.50') {
    await page.getByRole('button', {name: 'Quick trade', exact: true}).click();
    await page.getByLabel('Item description', {exact: true}).fill('Incoming bundle');
    await page.getByLabel('Quantity', {exact: true}).fill('3');
    await page.getByLabel('Agreed credit for this whole line (USD)').fill(credit);
    await page.getByRole('button', {name: 'Add to trade', exact: true}).click();
    await expect(page.getByLabel('Agreed credit for Incoming bundle')).toHaveValue(credit);
}
async function complete(page: Page) {
    await page.getByRole('button', {name: /^Review deal/}).click();
    await page.getByRole('button', {name: 'Exchange completed · Record', exact: true}).click();
}
for (const width of [384, 1440]) test(`agreed whole-line credit survives hold and opaque customer view at ${width}`, async ({page}, info) => {
    await page.setViewportSize({width, height: 900}); const proof = await fixture(page); await openTrade(page); await quick(page);
    await page.getByText('Store, tax & receipt note', {exact: true}).click();
    await page.getByLabel('Private trade note', {exact: true}).fill('PRIVATE NOTE');
    await page.getByRole('button', {name: 'Customer view', exact: true}).click();
    const view = page.getByRole('dialog', {name: 'Customer deal'});
    await expect(view).toContainText('You pay $3.50'); await expect(view).not.toContainText('PRIVATE'); await expect(view).not.toContainText('Reference');
    expect(await view.evaluate(element => getComputedStyle(element, '::backdrop').backgroundColor)).toBe('rgb(6, 18, 11)');
    await view.screenshot({path: info.outputPath(`customer-${width}.png`)});
    await page.getByRole('button', {name: 'Close customer view', exact: true}).click();
    await page.reload(); await expect(page.getByLabel('Agreed credit for Incoming bundle')).toHaveValue('6.50');
    expect(proof.posts).toHaveLength(0); const book = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
    expect(book.drafts).toHaveLength(2); expect(book.drafts[0].kind).toBeUndefined(); expect(book.drafts[1].trades[0]).toMatchObject({quantity: 3, valueMinor: null, rateBps: null, creditMinor: 650});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: info.outputPath(`trade-${width}.png`), fullPage: true});
    const axe = await new AxeBuilder({page}).include('[data-vendor-workspace-fixture]').analyze();
    expect(axe.violations.filter(value => ['serious', 'critical'].includes(value.impact ?? ''))).toEqual([]);
});
test('suggestion is explicit and quantity/reference changes preserve agreement', async ({page}) => {
    await fixture(page); await openTrade(page); await page.getByRole('button', {name: 'Quick trade', exact: true}).click();
    await page.getByLabel('Item description', {exact: true}).fill('Incoming bundle');
    await page.getByLabel('Quantity', {exact: true}).fill('3');
    await page.getByText('Calculate an offer · optional', {exact: true}).click();
    await page.getByLabel('Reference value per item (USD)').fill('10.00'); await page.getByLabel('Trade percentage', {exact: true}).fill('60');
    await page.getByRole('button', {name: 'Use suggested credit'}).click(); await expect(page.getByLabel('Agreed credit for this whole line (USD)')).toHaveValue('18.00');
    await page.getByLabel('Agreed credit for this whole line (USD)').fill('6.50');
    await page.getByLabel('Quantity', {exact: true}).fill('2'); await page.getByLabel('Reference value per item (USD)').fill('20.00');
    await expect(page.getByLabel('Agreed credit for this whole line (USD)')).toHaveValue('6.50');
    await page.getByRole('button', {name: 'Add to trade', exact: true}).click();
    await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).drafts[1].trades[0], key)).toMatchObject({quantity: 2, valueMinor: 2000, rateBps: 6000, creditMinor: 650});
});
test('canonical trade intake is staged with exact printing and zero agreed cost', async ({page}) => {
    const proof = await fixture(page); await openTrade(page);
    await page.getByLabel('Find incoming card', {exact: true}).fill('Incoming'); await page.getByRole('button', {name: 'Choose printing', exact: true}).click();
    await page.getByLabel('Agreed credit for this whole line (USD)').fill('0.00'); await page.getByRole('button', {name: 'Add to trade', exact: true}).click();
    await expect(page.getByRole('alert').filter({hasText: 'Choose the exact printing first.'})).toBeVisible();
    await page.getByRole('combobox', {name: 'Exact printing', exact: true}).selectOption(card.printings[0].id); await page.getByRole('combobox', {name: 'Condition', exact: true}).selectOption('LP');
    await page.getByLabel('Add this copy to my Vault when the trade completes').check(); await page.getByRole('button', {name: 'Add to trade', exact: true}).click();
    expect(proof.posts).toHaveLength(0); await complete(page); await expect(page.getByText(/Trade recorded · GV-/)).toBeVisible();
    expect(proof.posts).toHaveLength(1); expect(proof.posts[0].cart.trades[0]).toMatchObject({creditMinor: 0, cardId: card.id, printingId: card.printings[0].id, condition: 'LP', addToVault: true});
});
test('lost response recovers exact request by POST with controls off and no repeated completion', async ({page}) => {
    const proof = await fixture(page, {loseReply: true}); await openTrade(page); await quick(page); await complete(page);
    await expect(page.getByRole('button', {name: 'Recover this trade'})).toBeVisible(); proof.enabled = false;
    await page.reload(); await expect(page.getByText(/Trade recorded · GV-/)).toBeVisible();
    expect(proof.posts).toHaveLength(1); expect(proof.reads).toEqual(proof.posts);
    await page.getByRole('button', {name: 'Next customer', exact: true}).last().click();
    await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).pending, key)).toBeNull();
});
for (const option of ['mismatch', 'rejected'] as const) test(`${option} response keeps exact pending terms and prevents replacement`, async ({page}) => {
    const proof = await fixture(page, {[option]: true}); await openTrade(page); await quick(page); await complete(page);
    await expect(page.getByRole('button', {name: 'Recover this trade'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'New trade', exact: true})).toBeDisabled();
    await expect(page.getByLabel('Agreed credit for Incoming bundle')).toBeDisabled();
    const book = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key); expect(book.pending).toEqual(proof.posts[0]);
});
for (const credit of ['10.00', '15.00']) test(`exact ${credit === '10.00' ? 'even' : 'payout'} settlement completes`, async ({page}) => {
    const proof = await fixture(page); await openTrade(page); await quick(page, credit); await complete(page);
    await expect(page.getByText(/Trade recorded · GV-/)).toBeVisible();
    expect(proof.posts[0].cart.trades[0].creditMinor).toBe(Number(credit) * 100);
    expect(proof.posts[0].cart.payments).toEqual(credit === '10.00' ? [] : [{method: 'Cash', amountMinor: 500, tenderedMinor: 500}]);
});
async function seedTradePolicy(page: Page, source: 'manual' | 'tcgplayer_market') {
    await page.evaluate(({owner, source}) => localStorage.setItem('grookai.offer-presets.v1.' + owner, JSON.stringify({version: 2, revision: 1,
        defaults: {cash: null, trade: owner}, presets: [{id: owner, name: 'Standard trade', intent: 'trade', rateBps: 6500, source,
            conditionBasis: 'unspecified', rounding: {incrementMinor: 25, mode: 'nearest'}, lowValueTier: {ceilingMinor: 500, rateBps: 4000}}]})), {owner, source});
}
test('trade default applies inclusive unit tier and whole-line rounding without replacing agreement', async ({page}) => {
    await fixture(page); await openTrade(page); await seedTradePolicy(page, 'manual');
    await page.getByRole('button', {name: 'Quick trade', exact: true}).click();
    await page.getByLabel('Item description', {exact: true}).fill('Policy bundle');
    await page.getByLabel('Quantity', {exact: true}).fill('3');
    await page.getByLabel('Agreed credit for this whole line (USD)').fill('6.50');
    await page.getByText('Calculate an offer · optional', {exact: true}).click();
    await expect(page.getByText('Using Standard trade', {exact: false})).toBeVisible();
    await page.getByLabel('Reference value per item (USD)').fill('5.00');
    await expect(page.getByText('Suggested credit $6.00 for this line', {exact: false})).toBeVisible();
    await expect(page.getByLabel('Agreed credit for this whole line (USD)')).toHaveValue('6.50');
    await page.getByLabel('Reference value per item (USD)').fill('10.01');
    await expect(page.getByText('Suggested credit $19.50 for this line', {exact: false})).toBeVisible();
    const comparison = page.getByRole('region', {name: 'Offer comparison'});
    await expect(comparison.getByText(/Agreed credit \$6.50 for this line/)).toBeVisible();
    await expect(comparison.getByText(/Calculated \$/)).toBeHidden();
    await comparison.getByText('Calculation details', {exact: true}).click();
    await expect(comparison.getByText(/3 items · Calculated \$19.52 for this line/)).toBeVisible();
    await comparison.getByText('Calculation details', {exact: true}).click();
    await expect(page.getByLabel('Agreed credit for this whole line (USD)')).toHaveValue('6.50');
    await page.getByRole('button', {name: 'Add to trade', exact: true}).click();
    await page.reload(); await expect(page.getByLabel('Agreed credit for Policy bundle')).toHaveValue('6.50');
});
test('exact market condition review gates suggestion and refresh keeps agreed credit', async ({page}) => {
    const proof = await fixture(page); await openTrade(page); await seedTradePolicy(page, 'tcgplayer_market');
    await page.getByLabel('Find incoming card', {exact: true}).fill('Incoming'); await page.getByRole('button', {name: 'Choose printing', exact: true}).click();
    await page.getByRole('combobox', {name: 'Exact printing', exact: true}).selectOption(card.printings[0].id);
    await page.getByRole('combobox', {name: 'Condition', exact: true}).selectOption('LP');
    await page.getByText('Calculate an offer · optional', {exact: true}).click();
    await expect(page.getByText('Suggested credit $6.50 for this line', {exact: false})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Use suggested credit'})).toBeDisabled();
    await page.getByRole('checkbox', {name: /I reviewed the unspecified reference condition/}).check();
    await page.getByRole('button', {name: 'Use suggested credit'}).click();
    await expect(page.getByLabel('Agreed credit for this whole line (USD)')).toHaveValue('6.50');
    proof.referenceMinor = 2000; await page.getByRole('button', {name: 'Refresh market reference'}).click();
    await expect(page.getByText('Suggested credit $13.00 for this line', {exact: false})).toBeVisible();
    await expect(page.getByLabel('Agreed credit for this whole line (USD)')).toHaveValue('6.50');
    await expect(page.getByRole('button', {name: 'Use suggested credit'})).toBeDisabled();
});
test('storage false success cannot stage a transaction or send it', async ({page}) => {
    const proof = await fixture(page); await openTrade(page); await quick(page);
    await page.getByRole('button', {name: /^Review deal/}).click();
    await page.evaluate(key => {const write = Storage.prototype.setItem; Storage.prototype.setItem = function(name, value) {if(name === key) return; write.call(this, name, value);};}, key);
    await page.getByRole('button', {name: 'Exchange completed · Record', exact: true}).click();
    await expect(page.getByRole('alert').filter({hasText: 'could not be verified'})).toBeVisible(); expect(proof.posts).toHaveLength(0);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).pending, key)).toBeNull();
});
