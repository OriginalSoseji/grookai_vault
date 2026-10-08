import {test, expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {randomUUID} from 'node:crypto';
import {paymentSnapshot, paymentMethod} from '../../src/lib/sales/salesPayments.mjs';
import type {PurchaseRequest, PurchaseReceipt} from '../../src/lib/sales/salesPurchase.mjs';

const owner = '00000000-0000-4000-8000-000000000001';
const user = {id: owner, aud: 'authenticated', email: 'buyer@fixture.invalid', created_at: '2026-10-07T00:00:00Z'};
const key = 'grookai.sales-desk.v2.' + owner;
const card = {id: '00000000-0000-4000-8000-000000000020', name: 'Fixture incoming card', gv_id: 'GV-FIXTURE', number: '1', set_code: 'SAMPLE',
    printings: [{id: '00000000-0000-4000-8000-000000000021', finish_label: 'Holo', printing_gv_id: 'GVP-FIXTURE-HOLO'}]};
function receipt(request: PurchaseRequest): PurchaseReceipt {
    const {id, cart} = request, purchaseMinor = cart.items.reduce((n, line) => n + line.unitMinor * line.quantity, 0);
    return {version: 2, kind: 'purchase', id, number: 'GVB-20261008-' + id.slice(0, 8).toUpperCase(), createdAt: '2026-10-08T03:00:00.000Z',
        storeName: cart.storeName, customerName: cart.customer.name, currency: 'USD', note: cart.note, purchaseMinor,
        method: paymentMethod([...cart.payments]), payments: paymentSnapshot([...cart.payments], -purchaseMinor),
        items: cart.items.map(line => ({...line, lineMinor: line.unitMinor * line.quantity,
            printingGvId: line.cardId ? 'GVP-FIXTURE-HOLO' : null, instanceId: line.addToVault ? randomUUID() : null,
            gvviId: line.addToVault ? 'GVVI-FIXTURE-' + randomUUID().toUpperCase() : null}))};
}
async function fixture(page: Page, options: {loseReply?: boolean; mismatch?: boolean; holdReply?: boolean} = {}) {
    const state = {enabled: true, posts: [] as PurchaseRequest[], records: new Map<string, PurchaseReceipt>(), release: () => {}};
    const held = new Promise<void>(resolve => {state.release = resolve;});
    await page.route('http://127.0.0.1:54321/**', route => route.fulfill({json: new URL(route.request().url()).pathname.endsWith('/user') ? user : {}}));
    await page.route('**/api/sales/desk?**', async route => {
        if (route.request().method() === 'POST') {
            const body = route.request().postDataJSON();
            expect(body.action).toBe('purchase'); expect(body.owner).toBe(owner); expect(body.cart.version).toBe(4);
            const request = {id: body.id, cart: body.cart} as PurchaseRequest;
            state.posts.push(request);
            if (!state.records.has(request.id)) state.records.set(request.id, receipt(request));
            if (options.loseReply && state.posts.length === 1) return route.abort('failed');
            if (options.holdReply) await held;
            const saved = state.records.get(request.id)!;
            return route.fulfill({json: {result: options.mismatch ? {...saved, note: 'Changed acknowledgement'} : saved}});
        }
        const params = new URL(route.request().url()).searchParams, action = params.get('action') ?? 'session';
        if (action === 'session') return route.fulfill({json: {owner, available: state.enabled, purchases: state.enabled, payments: true, trades: true}});
        if (action === 'book') return route.fulfill({json: {ownerId: owner, book: {storeName: 'Fixture shop', customers: [], receipts: []}}});
        if (action === 'recover') return route.fulfill({json: {receipt: state.records.get(params.get('id')!) ?? null}});
        return route.fulfill({json: {cards: action === 'catalog' ? [card] : [], next: null}});
    });
    return state;
}
async function openBuy(page: Page) {
    await page.goto('/visual-fixtures/vendor-workspace');
    await expect(page.getByLabel('Store name', {exact: true})).toHaveValue('Fixture shop');
    await page.getByRole('button', {name: 'New buy', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Your purchase', exact: true})).toBeVisible();
}
async function quick(page: Page, name = 'Manual item', amount = '6.50') {
    await page.getByRole('button', {name: 'Quick purchase', exact: true}).click();
    await page.getByLabel('Item description', {exact: true}).fill(name);
    await page.getByLabel('Agreed price per item (USD)', {exact: true}).fill(amount);
    await page.getByRole('button', {name: 'Add to purchase', exact: true}).click();
    await expect(page.getByRole('region', {name: 'Purchase item details'})).toHaveCount(0);
}
for (const width of [384, 1440]) test(`buy offer holds manual override and zero cost at ${width}px`, async ({page}, info) => {
    await page.setViewportSize({width, height: 900}); const proof = await fixture(page); await openBuy(page);
    await page.getByRole('button', {name: 'Quick purchase', exact: true}).click();
    await page.getByLabel('Item description').fill('Negotiated card');
    await page.getByText('Calculate an offer · optional', {exact: true}).click();
    await page.getByLabel('Reference value per item (USD)').fill('10.00'); await page.getByLabel('Buy percentage').fill('60');
    await page.getByRole('button', {name: 'Use suggested offer'}).click();
    await expect(page.getByLabel('Agreed price per item (USD)')).toHaveValue('6.00');
    await page.getByLabel('Agreed price per item (USD)').fill('6.50'); await page.getByLabel('Reference value per item (USD)').fill('20.00');
    await expect(page.getByLabel('Agreed price per item (USD)')).toHaveValue('6.50');
    await page.getByRole('button', {name: 'Add to purchase', exact: true}).click(); await quick(page, 'Included item', '0.00');
    await page.getByText('Store & private note', {exact: true}).click(); await page.getByLabel('Private purchase note').fill('PRIVATE NOTE');
    await page.getByRole('button', {name: 'Seller view'}).click();
    const seller = page.getByRole('dialog', {name: 'Seller offer'});
    expect(await seller.evaluate(element => getComputedStyle(element, '::backdrop').backgroundColor)).toBe('rgb(6, 18, 11)');
    await seller.screenshot({path: info.outputPath(`seller-${width}.png`)});
    await expect(seller).toContainText('You receive $6.50'); await expect(seller).not.toContainText('PRIVATE'); await expect(seller).not.toContainText('Reference');
    await page.getByRole('button', {name: 'Close seller view', exact: true}).click();
    await page.reload(); await expect(page.getByRole('heading', {name: 'Your purchase', exact: true})).toBeVisible();
    await expect(page.getByLabel('Agreed price for Negotiated card')).toHaveValue('6.50'); await expect(page.getByLabel('Agreed price for Included item')).toHaveValue('0.00');
    expect(proof.posts).toHaveLength(0);
    const book = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key); expect(book.version).toBe(3); expect(book.drafts).toHaveLength(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: info.outputPath(`purchase-${width}.png`), fullPage: true});
    const axe = await new AxeBuilder({page}).include('[data-vendor-workspace-fixture]').analyze();
    expect(axe.violations.filter(value => ['serious', 'critical'].includes(value.impact ?? ''))).toEqual([]);
});
test('canonical printing and intake decision are saved without an early inventory writer', async ({page}) => {
    const proof = await fixture(page); await openBuy(page); await page.getByRole('textbox', {name: 'Find incoming card', exact: true}).fill('Fixture');
    await page.getByRole('button', {name: 'Choose printing', exact: true}).click();
    await page.getByLabel('Agreed price per item (USD)').fill('8.00'); await page.getByRole('button', {name: 'Add to purchase', exact: true}).click();
    await expect(page.getByRole('alert').filter({hasText: 'Choose the exact printing first.'})).toBeVisible();
    await page.getByRole('combobox', {name: 'Exact printing', exact: true}).selectOption(card.printings[0].id); await page.getByRole('combobox', {name: 'Condition', exact: true}).selectOption('LP');
    await page.getByLabel('Add this copy to my Vault when the purchase completes').check(); await page.getByRole('button', {name: 'Add to purchase', exact: true}).click();
    await page.reload(); await expect(page.getByText('Adds one Vault copy on completion', {exact: true})).toBeVisible(); expect(proof.posts).toHaveLength(0);
    await page.getByRole('button', {name: 'Review purchase', exact: true}).click(); await page.getByRole('button', {name: 'Exchange completed · Record purchase'}).click();
    await expect(page.getByText(/Purchase recorded · GVB-/)).toBeVisible(); expect(proof.posts).toHaveLength(1);
    expect(proof.posts[0].cart.items[0]).toMatchObject({cardId: card.id, printingId: card.printings[0].id, condition: 'LP', addToVault: true});
});
test('lost completion reply survives reload and feature-off without creating a second purchase', async ({page}) => {
    const proof = await fixture(page, {loseReply: true}); await openBuy(page); await quick(page);
    await page.getByRole('button', {name: 'Review purchase', exact: true}).click(); await page.getByRole('button', {name: 'Exchange completed · Record purchase'}).click();
    await expect(page.getByRole('button', {name: 'Recover this purchase', exact: true})).toBeVisible();
    const pending = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).pending, key);
    proof.enabled = false; await page.reload(); await expect(page.getByText(/Purchase recorded · GVB-/)).toBeVisible();
    expect(proof.posts).toHaveLength(1); expect(proof.records.size).toBe(1);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).pending, key)).toEqual(pending);
    await expect(page.getByRole('button', {name: 'New buy', exact: true})).toBeDisabled();
});
test('mismatched acknowledgement keeps exact pending request for recovery', async ({page}) => {
    const proof = await fixture(page, {mismatch: true}); await openBuy(page); await quick(page);
    await page.getByRole('button', {name: 'Review purchase', exact: true}).click(); await page.getByRole('button', {name: 'Exchange completed · Record purchase'}).click();
    await expect(page.getByText(/acknowledgement does not match/)).toBeVisible(); await expect(page.getByRole('button', {name: 'Recover this purchase', exact: true})).toBeVisible();
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).pending, key); expect(saved).toEqual(proof.posts[0]);
    await page.getByRole('button', {name: 'Fixture sign out', exact: true}).press('Enter'); await expect(page.getByRole('heading', {name: 'Reopen your sales desk'})).toBeVisible();
    await expect(page.getByText('Manual item', {exact: true})).toHaveCount(0); expect(proof.posts).toHaveLength(1);
});
test('retry sends the identical saved purchase after an interrupted response', async ({page}) => {
    const proof = await fixture(page, {loseReply: true}); await openBuy(page); await quick(page);
    await page.getByRole('button', {name: 'Review purchase', exact: true}).click(); await page.getByRole('button', {name: 'Exchange completed · Record purchase'}).click();
    await page.getByRole('button', {name: 'Recover this purchase', exact: true}).click(); await expect(page.getByText(/Purchase recorded · GVB-/)).toBeVisible();
    expect(proof.posts).toHaveLength(2); expect(proof.posts[1]).toEqual(proof.posts[0]); expect(proof.records.size).toBe(1);
});
test('owner change closes a pending purchase and hides a late response', async ({page}) => {
    const proof = await fixture(page, {holdReply: true}); await openBuy(page); await quick(page);
    await page.getByRole('button', {name: 'Review purchase', exact: true}).click(); await page.getByRole('button', {name: 'Exchange completed · Record purchase'}).click();
    await expect.poll(() => proof.posts.length).toBe(1);
    await page.getByRole('button', {name: 'Fixture sign out', exact: true}).press('Enter'); await expect(page.getByRole('heading', {name: 'Reopen your sales desk'})).toBeVisible();
    proof.release(); await expect(page.getByText(/Purchase recorded/)).toHaveCount(0);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).pending, key)).toEqual(proof.posts[0]);
});
test('a failed durable stage sends no purchase and preserves the held offer', async ({page}) => {
    const proof = await fixture(page); await openBuy(page); await quick(page);
    await page.getByRole('button', {name: 'Review purchase', exact: true}).click();
    await page.evaluate(() => {
        const request = navigator.locks.request.bind(navigator.locks);
        navigator.locks.request = (() => {navigator.locks.request = request; return Promise.reject(new Error('Synthetic purchase storage failure'));}) as typeof request;
    });
    await page.getByRole('button', {name: 'Exchange completed · Record purchase'}).click();
    await expect(page.getByText('Synthetic purchase storage failure', {exact: true})).toBeVisible(); expect(proof.posts).toHaveLength(0);
    const book = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
    expect(book.pending).toBeNull(); expect(book.drafts.find((value: {id: string}) => value.id === book.active).items[0].unitMinor).toBe(650);
});
test('held purchase and existing sale remain independently resumable', async ({page}) => {
    const proof = await fixture(page); await openBuy(page); await quick(page);
    await page.getByRole('button', {name: /Held deals/}).click();
    await page.getByRole('region', {name: 'Held deals'}).getByRole('button', {name: /Walk-up customer Sale/}).click();
    await expect(page.getByRole('heading', {name: 'Your deal', exact: true})).toBeVisible();
    await page.getByRole('button', {name: /Held deals/}).click();
    await page.getByRole('region', {name: 'Held deals'}).getByRole('button', {name: /Walk-up seller Buy/}).click();
    await expect(page.getByLabel('Agreed price for Manual item')).toHaveValue('6.50'); expect(proof.posts).toHaveLength(0);
});
test('split payout must reconcile exactly and uses seller wording', async ({page}) => {
    const proof = await fixture(page); await openBuy(page); await quick(page);
    await page.getByRole('button', {name: 'Review purchase', exact: true}).click(); await page.getByLabel('Split payout', {exact: true}).click();
    await expect(page.getByLabel('Split payout', {exact: true})).toBeChecked();
    await expect(page.getByText('Record how you paid the seller.', {exact: true})).toBeVisible();
    await page.getByLabel('Amount paid (USD)', {exact: true}).fill('4.00');
    await expect(page.getByRole('button', {name: 'Exchange completed · Record purchase'})).toBeDisabled();
    await page.getByRole('button', {name: 'Add payment method', exact: true}).click();
    await expect(page.getByText('Balance covered', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Exchange completed · Record purchase'}).click(); await expect(page.getByText(/Purchase recorded · GVB-/)).toBeVisible();
    expect(proof.posts[0].cart.payments).toEqual([{method: 'Cash', amountMinor: 400, tenderedMinor: 400}, {method: 'Card (external terminal)', amountMinor: 250, tenderedMinor: 250}]);
});
test('each supported single payout method records the explicit choice', async ({page}) => {
    const proof = await fixture(page); await openBuy(page);
    const methods = ['Cash', 'Card (external terminal)', 'Bank / payment app', 'Other'];
    for (const [index, method] of methods.entries()) {
        if (index) await page.getByRole('button', {name: 'Next purchase', exact: true}).click();
        await quick(page); await page.getByRole('button', {name: 'Review purchase', exact: true}).click();
        await page.getByRole('combobox', {name: 'Payout method', exact: true}).selectOption(method);
        await page.getByRole('button', {name: 'Exchange completed · Record purchase'}).click(); await expect(page.getByText(/Purchase recorded · GVB-/)).toBeVisible();
        expect(proof.posts[index].cart.payments).toEqual([{method, amountMinor: 650, tenderedMinor: 650}]);
    }
    expect(proof.records.size).toBe(4);
});
