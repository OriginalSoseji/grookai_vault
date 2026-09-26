import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readSellerStripeConfig, readVerifiedSellerReadiness, verifySellerAccountSignal } from '../../apps/web/src/lib/payments/vendorSellerStripeGateway.ts';
import { STRIPE_BILLING_API_VERSION } from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const Stripe = require('stripe');
const now = 1_800_000_000;
const ownerId = '11111111-1111-4111-8111-111111111111';
const config = { secretKey: ['sk', 'test', 'syntheticOnly'].join('_'),
  webhookSecret: ['whsec', 'syntheticOnlyNeverRealSecret'].join('_'),
  scope: { accountId: 'acct_platform', livemode: false } };
function fixture() {
  const binding = { id: '22222222-2222-4222-8222-222222222222', ownerId,
    storeId: '33333333-3333-4333-8333-333333333333', platformAccountId: 'acct_platform',
    connectedAccountId: 'acct_seller', livemode: false,
    controller: { feesPayer: 'account', paymentLosses: 'stripe', requirementCollection: 'stripe', dashboard: 'full' } };
  const responses = [
    { object: 'account', id: 'acct_platform' },
    { object: 'account', id: 'acct_seller', charges_enabled: true, payouts_enabled: true, details_submitted: true,
      capabilities: { card_payments: 'active', transfers: 'active' },
      controller: { type: 'application', is_controller: true, fees: { payer: 'account' }, losses: { payments: 'stripe' },
        requirement_collection: 'stripe', stripe_dashboard: { type: 'full' } },
      requirements: { currently_due: [], past_due: [], pending_verification: [], eventually_due: [], disabled_reason: null } },
    { object: 'balance', livemode: false, available: [], pending: [] },
  ];
  const calls = [];
  const stripe = new Stripe(config.secretKey, { apiVersion: STRIPE_BILLING_API_VERSION,
    maxNetworkRetries: 0, telemetry: false,
    httpClient: Stripe.createFetchHttpClient(async (url, options) => {
      // Entire transport is replaced; any unexpected path fails without network.
      const index = calls.length;
      const expected = ['/v1/account', '/v1/accounts/acct_seller', '/v1/balance'][index];
      assert.equal(String(url), `https://api.stripe.com${expected}`);
      assert.equal(options.method, 'GET');
      const headers = new Headers(options.headers);
      assert.equal(headers.get('stripe-version'), STRIPE_BILLING_API_VERSION);
      assert.equal(headers.get('stripe-account'), index === 2 ? 'acct_seller' : null);
      calls.push({ path: expected, method: options.method });
      const body = responses[index];
      return new Response(JSON.stringify(body), { status: body.error ? 403 : 200,
        headers: { 'content-type': 'application/json' } });
    }),
  });
  return { binding, responses, calls, stripe };
}

test('real SDK read binds platform, seller and balance scope without writes', async () => {
  const f = fixture();
  const result = await readVerifiedSellerReadiness(f.stripe, config, f.binding, ownerId, () => now);
  assert.equal(result.capabilitiesReady, true);
  assert.deepEqual(f.calls.map(call => call.path), ['/v1/account', '/v1/accounts/acct_seller', '/v1/balance']);
});
for (const [name, mutate, count] of [
  ['owner mismatch', f => { f.binding.ownerId = '44444444-4444-4444-8444-444444444444'; }, 0],
  ['stored platform mismatch', f => { f.binding.platformAccountId = 'acct_other'; }, 0],
  ['stored mode mismatch', f => { f.binding.livemode = true; }, 0],
  ['platform key mismatch', f => { f.responses[0].id = 'acct_other'; }, 1],
  ['seller response mismatch', f => { f.responses[1].id = 'acct_other'; }, 2],
  ['revoked provider access', f => { f.responses[1] = { error: { type: 'invalid_request_error', message: 'fixture denied' } }; }, 2],
  ['balance mode mismatch', f => { f.responses[2].livemode = true; }, 3],
]) test(`SDK stops on ${name}`, async () => {
  const f = fixture(); mutate(f);
  await assert.rejects(readVerifiedSellerReadiness(f.stripe, config, f.binding, ownerId, () => now));
  assert.equal(f.calls.length, count);
});
for (const elapsed of [-1, 60, 61]) test(`readiness rejects elapsed clock interval ${elapsed}`, async () => {
  const f = fixture(); let times = 0;
  await assert.rejects(readVerifiedSellerReadiness(f.stripe, config, f.binding, ownerId,
    () => now + (times++ ? elapsed : 0)), /expired/);
});
test('observation records request start, not an artificially newer finish time', async () => {
  const f = fixture(); let times = 0;
  assert.equal((await readVerifiedSellerReadiness(f.stripe, config, f.binding, ownerId,
    () => now + (times++ ? 59 : 0))).checkedAt, now);
});

test('provider errors expose no raw message, request, identity or credential details', async () => {
  const f = fixture();
  f.responses[1] = { error: { type: 'invalid_request_error', message: 'private provider detail',
    request_log_url: 'https://dashboard.stripe.com/private-fixture' } };
  await assert.rejects(readVerifiedSellerReadiness(f.stripe, config, f.binding, ownerId, () => now),
    error => error.message === 'Seller provider verification unavailable' && error.cause === undefined);
});

function environment() { return { GROOKAI_VENDOR_PAYMENTS_ENABLED: 'true', STRIPE_PAYMENTS_MODE: 'test',
  STRIPE_SECRET_KEY: config.secretKey, STRIPE_ACCOUNT_ID: 'acct_platform', STRIPE_CONNECT_WEBHOOK_SECRET: config.webhookSecret }; }
test('seller processing defaults disabled independently of subscription activation', () => {
  assert.equal(readSellerStripeConfig({ GROOKAI_VENDOR_BILLING_ENABLED: 'true' }), null);
  assert.deepEqual(readSellerStripeConfig(environment()), config);
});
for (const [key, value] of [['STRIPE_PAYMENTS_MODE', 'wrong'], ['STRIPE_ACCOUNT_ID', ''],
  ['STRIPE_SECRET_KEY', ['sk', 'live', 'syntheticOnly'].join('_')], ['STRIPE_CONNECT_WEBHOOK_SECRET', ''],
  ['STRIPE_PAYMENTS_MODE', undefined]]) test(`enabled seller config rejects invalid ${key} (${String(value).slice(0, 6)})`, () => {
  assert.throws(() => readSellerStripeConfig({ ...environment(), [key]: value }));
});

function event() { return { object: 'event', id: 'evt_fixture', api_version: STRIPE_BILLING_API_VERSION,
  type: 'account.updated', account: 'acct_seller', livemode: false, created: now,
  data: { object: { object: 'account', id: 'acct_seller', charges_enabled: true, payouts_enabled: true } } }; }
function signed(stripe, value, timestamp = now) {
  const payload = JSON.stringify(value);
  return { payload, signature: stripe.webhooks.generateTestHeaderString({ payload, secret: config.webhookSecret, timestamp }) };
}
function verify(stripe, value, timestamp = now) {
  const s = signed(stripe, value, timestamp);
  return verifySellerAccountSignal(stripe, config, s.payload, s.signature, now * 1000);
}
test('signed update emits only a refresh signal, never grants readiness from its snapshot', () => {
  const f = fixture();
  assert.deepEqual(verify(f.stripe, event()), { eventId: 'evt_fixture', connectedAccountId: 'acct_seller', kind: 'refresh', createdAt: now });
  assert.equal(f.calls.length, 0);
});
test('signed deauthorization has a distinct invalidation signal', () => {
  const f = fixture(); const e = event(); e.type = 'account.application.deauthorized';
  e.data.object = { object: 'application', id: 'ca_fixture' };
  assert.equal(verify(f.stripe, e).kind, 'deauthorized');
});
for (const [name, mutate] of [
  ['platform event', e => { delete e.account; }],
  ['platform as seller', e => { e.account = 'acct_platform'; }],
  ['wrong mode', e => { e.livemode = true; }],
  ['wrong API version', e => { e.api_version = 'old'; }],
  ['organization context', e => { e.context = 'acct_seller'; }],
  ['mismatched account payload', e => { e.data.object.id = 'acct_other'; }],
  ['future event', e => { e.created = now + 1; }],
  ['bad event ID', e => { e.id = 'not-an-event'; }],
  ['wrong deauthorization object', e => { e.type = 'account.application.deauthorized'; }],
]) test(`Connect verifier rejects ${name}`, () => {
  const f = fixture(); const e = event(); mutate(e); assert.throws(() => verify(f.stripe, e));
});
test('expired, tampered, oversized and absent signatures cannot emit signals', () => {
  const f = fixture(); assert.throws(() => verify(f.stripe, event(), now - 301));
  const s = signed(f.stripe, event());
  assert.throws(() => verifySellerAccountSignal(f.stripe, config, `${s.payload} `, s.signature, now * 1000));
  assert.throws(() => verifySellerAccountSignal(f.stripe, config, 'x'.repeat(256 * 1024 + 1), s.signature, now * 1000));
  assert.throws(() => verifySellerAccountSignal(f.stripe, config, s.payload, '', now * 1000));
});
for (const type of ['customer.subscription.updated', 'checkout.session.completed', 'payment_intent.succeeded', 'payout.paid'])
  test(`${type} cannot become a seller readiness signal`, () => {
    const f = fixture(); const e = event(); e.type = type;
    assert.equal(verify(f.stripe, e), null);
  });
