import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { projectVendorSubscription, billingEventTarget } from '../../apps/web/src/lib/billing/vendorSubscriptionPolicy.ts';
import { readVendorBillingConfig, verifyVendorBillingEvent, createVendorSubscriptionCheckout, readVerifiedVendorSubscription, STRIPE_BILLING_API_VERSION } from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const Stripe = require('stripe');
const scope = { accountId: 'acct_fixture', livemode: false };
const catalog = { store_app: 'price_app', store_web: 'price_web' };
const now = 1_800_000_000;
const dummyKey = ['sk', 'test', 'fixtureOnly'].join('_');
const dummyWebhook = ['whsec', 'fixtureOnlyNotARealSecret'].join('_');
const config = { scope, catalog, secretKey: dummyKey, webhookSecret: dummyWebhook, siteOrigin: 'http://127.0.0.1:15440' };
function fixture(plan = 'store_web') {
  const subscription = {
    id: 'sub_fixture', customer: 'cus_fixture', livemode: false, status: 'active',
    collection_method: 'charge_automatically', pause_collection: null, cancel_at: null,
    cancel_at_period_end: false, latest_invoice: 'in_fixture',
    items: { has_more: false, data: [{ id: 'si_fixture', quantity: 1,
      current_period_start: now - 100, current_period_end: now + 100,
      price: { id: catalog[plan], currency: 'usd', unit_amount: plan === 'store_app' ? 3000 : 5000,
        livemode: false, type: 'recurring', recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' } },
    }] },
  };
  const invoice = { id: 'in_fixture', customer: 'cus_fixture', livemode: false, status: 'paid',
    status_transitions: { paid_at: now - 99 },
    collection_method: 'charge_automatically', currency: 'usd',
    parent: { subscription_details: { subscription: 'sub_fixture' } },
    lines: { has_more: false, data: [{ quantity: 1, period: { start: now - 100, end: now + 100 },
      pricing: { price_details: { price: catalog[plan] } },
      parent: { subscription_item_details: { subscription_item: 'si_fixture', subscription: 'sub_fixture' } },
    }] },
  };
  return { subscription, invoice, customerId: 'cus_fixture', catalog, scope, now };
}
function event(type = 'customer.subscription.updated') {
  return { id: 'evt_fixture', object: 'event', api_version: STRIPE_BILLING_API_VERSION,
    created: now, livemode: false, type, data: { object: { object: 'subscription', id: 'sub_fixture', customer: 'cus_fixture' } } };
}
test('verified $30 and $50 monthly prices produce only their explicit capabilities', () => {
  assert.deepEqual(projectVendorSubscription(fixture('store_app')).features, { store_app: true, store_web: false });
  assert.deepEqual(projectVendorSubscription(fixture()).features, { store_app: true, store_web: true });
});
for (const status of ['trialing', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused', 'canceled']) {
  test(`${status} subscription cannot grant access despite an old paid invoice`, () => {
    const f = fixture(); f.subscription.status = status;
    assert.deepEqual(projectVendorSubscription(f).features, { store_app: false, store_web: false });
  });
}
for (const [name, mutate] of [
  ['unknown price', f => { f.subscription.items.data[0].price.id = 'price_foreign'; }],
  ['wrong amount', f => { f.subscription.items.data[0].price.unit_amount = 1; }],
  ['annual price', f => { f.subscription.items.data[0].price.recurring.interval = 'year'; }],
  ['metered price', f => { f.subscription.items.data[0].price.recurring.usage_type = 'metered'; }],
  ['multiple seats', f => { f.subscription.items.data[0].quantity = 2; }],
  ['extra item', f => { f.subscription.items.data.push(structuredClone(f.subscription.items.data[0])); }],
  ['partial item list', f => { f.subscription.items.has_more = true; }],
  ['foreign price mode', f => { f.subscription.items.data[0].price.livemode = true; }],
  ['paused collection', f => { f.subscription.pause_collection = { behavior: 'void' }; }],
  ['unpaid invoice', f => { f.invoice.status = 'open'; }],
  ['missing payment time', f => { f.invoice.status_transitions.paid_at = null; }],
  ['future payment time', f => { f.invoice.status_transitions.paid_at = now + 1; }],
  ['missing invoice', f => { f.invoice = null; }],
  ['old invoice', f => { f.invoice.id = 'in_old'; }],
  ['foreign customer invoice', f => { f.invoice.customer = 'cus_other'; }],
  ['foreign subscription invoice', f => { f.invoice.parent.subscription_details.subscription = 'sub_other'; }],
  ['wrong invoice mode', f => { f.invoice.livemode = true; }],
  ['truncated invoice lines', f => { f.invoice.lines.has_more = true; }],
  ['unpaid upgrade', f => { f.invoice.lines.data[0].pricing.price_details.price = catalog.store_app; }],
  ['wrong invoice item', f => { f.invoice.lines.data[0].parent.subscription_item_details.subscription_item = 'si_other'; }],
  ['uncovered period', f => { f.invoice.lines.data[0].period.end = now - 1; }],
  ['future period', f => { f.invoice.lines.data[0].period.start = now + 1; }],
]) test(`${name} fails closed`, () => {
  const f = fixture(); mutate(f);
  assert.deepEqual(projectVendorSubscription(f).features, { store_app: false, store_web: false });
});
test('scheduled cancellation retains only the remaining paid period, with exact expiry', () => {
  const f = fixture(); f.subscription.cancel_at_period_end = true; f.subscription.cancel_at = now + 50;
  assert.equal(projectVendorSubscription(f).paidThrough, now + 50);
  f.now += 50;
  assert.equal(projectVendorSubscription(f).features.store_app, false);
});
test('late payment carries the access gap into the database projection', () => {
  const f = fixture(); f.invoice.status_transitions.paid_at = now - 1;
  assert.equal(projectVendorSubscription(f).paidFrom, now - 1);
  assert.equal(projectVendorSubscription(f).paidThrough, now + 100);
});

test('portal timestamp cancellation is shown even when Stripe legacy flag is false', () => {
  const f = fixture(); f.subscription.cancel_at = f.subscription.items.data[0].current_period_end;
  const scheduled = projectVendorSubscription(f);
  assert.equal(scheduled.cancelAtPeriodEnd, true);
  assert.equal(scheduled.paidThrough, f.subscription.cancel_at);
  assert.equal(scheduled.features.store_web, true);
  f.now = f.subscription.cancel_at;
  assert.equal(projectVendorSubscription(f).features.store_app, false);
  f.now = now; f.subscription.cancel_at = null;
  assert.equal(projectVendorSubscription(f).cancelAtPeriodEnd, false);
});

test('a different cancellation date is not mislabeled as current-period cancellation', () => {
  const f = fixture(); f.subscription.cancel_at = now + 200;
  assert.equal(projectVendorSubscription(f).cancelAtPeriodEnd, false);
  assert.equal(projectVendorSubscription(f).paidThrough, now + 100);
});
test('price replacement cannot use a prior paid lower-tier invoice to upgrade', () => {
  const f = fixture('store_app'); f.subscription.items.data[0].price = fixture().subscription.items.data[0].price;
  assert.equal(projectVendorSubscription(f).reason, 'unverified_invoice');
});
test('ownership and environment are checked before policy resolution', () => {
  const f = fixture(); f.customerId = 'cus_attacker'; assert.throws(() => projectVendorSubscription(f), /ownership/);
  const live = fixture(); live.subscription.livemode = true; assert.throws(() => projectVendorSubscription(live), /mode/);
});
test('billing route ignores checkout completion, metadata and one-off invoices', () => {
  assert.equal(billingEventTarget(event('checkout.session.completed'), scope), null);
  const e = event('invoice.paid'); e.data.object = { object: 'invoice', customer: 'cus_fixture', metadata: { vendor: 'victim' } };
  assert.equal(billingEventTarget(e, scope), null);
  e.data.object.parent = { subscription_details: { subscription: 'sub_fixture' } };
  assert.deepEqual(billingEventTarget(e, scope), { customerId: 'cus_fixture', subscriptionId: 'sub_fixture' });
});
test('Connect and wrong-mode events cannot affect subscription authority', () => {
  assert.throws(() => billingEventTarget({ ...event(), account: 'acct_seller' }, scope), /scope/);
  assert.throws(() => billingEventTarget({ ...event(), context: 'acct_seller' }, scope), /scope/);
  assert.throws(() => billingEventTarget({ ...event(), livemode: true }, scope), /scope/);
});
test('official Stripe SDK verifies exact raw body and rejects replay/tampering/version drift', () => {
  const stripe = new Stripe(dummyKey);
  const payload = JSON.stringify(event());
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: dummyWebhook, timestamp: now });
  assert.equal(verifyVendorBillingEvent(stripe, config, payload, header, now * 1000).id, 'evt_fixture');
  assert.throws(() => verifyVendorBillingEvent(stripe, config, payload + ' ', header, now * 1000));
  assert.throws(() => verifyVendorBillingEvent(stripe, config, payload, header, (now + 301) * 1000));
  const old = JSON.stringify({ ...event(), api_version: '2020-08-27' });
  const oldHeader = stripe.webhooks.generateTestHeaderString({ payload: old, secret: dummyWebhook, timestamp: now });
  assert.throws(() => verifyVendorBillingEvent(stripe, config, old, oldHeader, now * 1000), /version/);
});
test('billing is off by default and configuration never mixes live/test resources', () => {
  assert.equal(readVendorBillingConfig({}), null);
  const env = { GROOKAI_VENDOR_BILLING_ENABLED: 'true', STRIPE_BILLING_MODE: 'test', STRIPE_SECRET_KEY: dummyKey,
    STRIPE_BILLING_WEBHOOK_SECRET: dummyWebhook, STRIPE_ACCOUNT_ID: scope.accountId,
    STRIPE_STORE_APP_PRICE_ID: catalog.store_app, STRIPE_STORE_WEB_PRICE_ID: catalog.store_web, SITE_URL: config.siteOrigin };
  assert.deepEqual(readVendorBillingConfig(env), config);
  assert.throws(() => readVendorBillingConfig({ ...env, STRIPE_BILLING_MODE: 'live' }), /mode/);
  assert.throws(() => readVendorBillingConfig({ ...env, SITE_URL: 'http://untrusted.example' }), /origin/);
  assert.throws(() => readVendorBillingConfig({ ...env, STRIPE_STORE_WEB_PRICE_ID: catalog.store_app }), /catalog/);
});
test('checkout sends a fixed server price and stable idempotency key, with no capability grant', async () => {
  const calls = [];
  const price = { ...fixture().subscription.items.data[0].price, active: true };
  const stripe = { accounts: { retrieve: async () => ({ id: scope.accountId }) }, prices: { retrieve: async () => price },
    checkout: { sessions: { create: async (...args) => { calls.push(args); return { id: 'cs_fixture' }; } } } };
  const input = { customerId: 'cus_fixture', plan: 'store_web', attemptId: '11111111-1111-4111-8111-111111111111', createdAt: now };
  await createVendorSubscriptionCheckout(stripe, config, input, now);
  assert.deepEqual(calls[0][0].line_items, [{ price: catalog.store_web, quantity: 1 }]);
  assert.equal(calls[0][0].mode, 'subscription');
  assert.equal(calls[0][0].success_url, `${config.siteOrigin}/account/store/billing?checkout=returned`);
  assert.equal(calls[0][1].idempotencyKey, `grookai-vendor-subscription:${input.attemptId}`);
  price.unit_amount = 1;
  await assert.rejects(createVendorSubscriptionCheckout(stripe, config, input, now), /package/);
  assert.equal(calls.length, 1);
  stripe.accounts.retrieve = async () => ({ id: 'acct_wrong' });
  await assert.rejects(createVendorSubscriptionCheckout(stripe, config, input, now), /account mismatch/);
  await assert.rejects(createVendorSubscriptionCheckout(stripe, config, input, now + 23 * 60 * 60), /recovery/);
  assert.equal(calls.length, 1);
});
test('delayed paid notification reads current canceled Stripe state', async () => {
  const f = fixture(); f.subscription.status = 'canceled';
  const stripe = { accounts: { retrieve: async () => ({ id: scope.accountId }) },
    subscriptions: { retrieve: async () => f.subscription }, invoices: { retrieve: async () => { throw new Error('Should not read invoice'); } } };
  assert.equal((await readVerifiedVendorSubscription(stripe, config, 'cus_fixture', 'sub_fixture', now)).features.store_app, false);
});
