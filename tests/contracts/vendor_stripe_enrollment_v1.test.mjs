import test from 'node:test';
import assert from 'node:assert/strict';
import { readVendorCheckoutEvidence, createVendorBillingCustomer } from '../../apps/web/src/lib/billing/vendorStripeEnrollment.ts';

const now = 1_800_000_000;
const attemptId = '11111111-1111-4111-8111-111111111111';
function fixture() {
  const config = { scope: { accountId: 'acct_fixture', livemode: false },
    catalog: { store_app: 'price_app', store_web: 'price_web' } };
  const attempt = { attemptId, customerId: 'cus_fixture', sessionId: 'cs_test_fixture', plan: 'store_web' };
  const session = { id: attempt.sessionId, object: 'checkout.session', livemode: false,
    mode: 'subscription', customer: attempt.customerId, client_reference_id: attemptId,
    status: 'complete', recovered_from: null, subscription: 'sub_fixture', payment_status: 'unpaid',
    url: null, metadata: { owner: 'deliberately-ignored' } };
  const lines = { has_more: false, data: [{ quantity: 1, price: {
    id: 'price_web', currency: 'usd', unit_amount: 5000, livemode: false, type: 'recurring',
    recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
  } }] };
  const calls = [];
  const stripe = { accounts: { retrieve: async () => { calls.push('account'); return { id: config.scope.accountId }; } },
    checkout: { sessions: {
      retrieve: async id => { assert.equal(id, attempt.sessionId); calls.push('session'); return session; },
      listLineItems: async (id, opts) => { assert.equal(id, attempt.sessionId); assert.deepEqual(opts, { limit: 100 }); calls.push('lines'); return lines; },
    } }, customers: { create: async (...args) => { calls.push(args); return { id: 'cus_new', livemode: false }; } } };
  return { config, attempt, session, lines, calls, stripe };
}

test('retrieved complete checkout binds enrollment but does not grant access', async () => {
  const f = fixture();
  const result = await readVendorCheckoutEvidence(f.stripe, f.config, f.attempt);
  assert.deepEqual(result, { attemptId, customerId: 'cus_fixture', sessionId: 'cs_test_fixture',
    state: 'complete', subscriptionId: 'sub_fixture', checkoutUrl: null });
  assert.deepEqual(f.calls, ['account', 'session', 'lines']);
});

for (const [name, mutate] of [
  ['different session', f => { f.session.id = 'cs_test_other'; }],
  ['different customer', f => { f.session.customer = 'cus_other'; }],
  ['different attempt', f => { f.session.client_reference_id = 'attacker'; }],
  ['metadata without reference', f => { f.session.client_reference_id = null; f.session.metadata.grookai_billing_attempt = attemptId; }],
  ['live session', f => { f.session.livemode = true; }],
  ['payment checkout', f => { f.session.mode = 'payment'; }],
  ['recovered session', f => { f.session.recovered_from = 'cs_test_old'; }],
  ['missing subscription', f => { f.session.subscription = null; }],
  ['partial line list', f => { f.lines.has_more = true; }],
  ['additional item', f => { f.lines.data.push(structuredClone(f.lines.data[0])); }],
  ['wrong quantity', f => { f.lines.data[0].quantity = 2; }],
  ['wrong initial price', f => { f.lines.data[0].price.id = 'price_app'; }],
  ['wrong amount', f => { f.lines.data[0].price.unit_amount = 3000; }],
  ['annual price', f => { f.lines.data[0].price.recurring.interval = 'year'; }],
  ['live price', f => { f.lines.data[0].price.livemode = true; }],
]) test(`enrollment rejects ${name}`, async () => {
  const f = fixture(); mutate(f);
  await assert.rejects(readVendorCheckoutEvidence(f.stripe, f.config, f.attempt));
});

test('open session recovers only the provider-hosted URL, expired session cannot enroll', async () => {
  const f = fixture(); f.session.status = 'open'; f.session.subscription = null;
  f.session.url = 'https://checkout.stripe.com/c/pay/cs_test_fixture';
  assert.equal((await readVendorCheckoutEvidence(f.stripe, f.config, f.attempt)).checkoutUrl, f.session.url);
  f.session.url = 'https://checkout.stripe.com.attacker.example/pay';
  await assert.rejects(readVendorCheckoutEvidence(f.stripe, f.config, f.attempt), /URL/);
  f.session.status = 'expired';
  assert.equal((await readVendorCheckoutEvidence(f.stripe, f.config, f.attempt)).subscriptionId, null);
  f.session.subscription = 'sub_fixture';
  await assert.rejects(readVendorCheckoutEvidence(f.stripe, f.config, f.attempt), /state/);
});

test('account and durable identity are checked before checkout retrieval', async () => {
  const f = fixture(); f.stripe.accounts.retrieve = async () => ({ id: 'acct_foreign' });
  await assert.rejects(readVendorCheckoutEvidence(f.stripe, f.config, f.attempt), /account/);
  assert.deepEqual(f.calls, []);
  f.attempt.attemptId = 'caller-chosen';
  await assert.rejects(readVendorCheckoutEvidence(f.stripe, f.config, f.attempt), /attempt/);
});

test('customer creation uses a stable attempt key, with no email-based ownership', async () => {
  const f = fixture();
  for (let i = 0; i < 2; i++) assert.equal(await createVendorBillingCustomer(f.stripe, f.config,
    { attemptId, createdAt: now - 60 }, now), 'cus_new');
  assert.deepEqual(f.calls[1], f.calls[3]);
  assert.deepEqual(f.calls[1], [{ metadata: { grookai_billing_version: 'vendor-billing-v1', grookai_billing_customer_attempt: attemptId } },
    { idempotencyKey: `grookai-vendor-customer:${attemptId}` }]);
});

test('ambiguous old customer attempts stop before provider creation', async () => {
  const f = fixture();
  for (const createdAt of [now - 23 * 60 * 60, now + 1, -1, Number.NaN])
    await assert.rejects(createVendorBillingCustomer(f.stripe, f.config, { attemptId, createdAt }, now), /recovery/);
  assert.deepEqual(f.calls, []);
  f.stripe.customers.create = async () => ({ id: 'cus_fixture', livemode: true });
  await assert.rejects(createVendorBillingCustomer(f.stripe, f.config, { attemptId, createdAt: now }, now), /scope/);
});
