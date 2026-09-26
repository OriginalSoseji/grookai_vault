import test from 'node:test';
import assert from 'node:assert/strict';
import { projectSellerReadiness } from '../../apps/web/src/lib/payments/vendorSellerPolicy.ts';

const ownerId = '11111111-1111-4111-8111-111111111111';
function sellerFixture() {
  return { ownerId, checkedAt: 1_800_000_000, scope: { accountId: 'acct_platform', livemode: false },
    binding: { id: '22222222-2222-4222-8222-222222222222', ownerId,
      storeId: '33333333-3333-4333-8333-333333333333', platformAccountId: 'acct_platform',
      connectedAccountId: 'acct_seller', livemode: false,
      controller: { feesPayer: 'account', paymentLosses: 'stripe', requirementCollection: 'stripe', dashboard: 'full' } },
    account: { object: 'account', id: 'acct_seller', charges_enabled: true, payouts_enabled: true,
      details_submitted: true, capabilities: { card_payments: 'active', transfers: 'active' },
      controller: { type: 'application', is_controller: true, fees: { payer: 'account' },
        losses: { payments: 'stripe' }, requirement_collection: 'stripe', stripe_dashboard: { type: 'full' } },
      requirements: { currently_due: [], past_due: [], pending_verification: [], eventually_due: [], disabled_reason: null },
      metadata: { owner: 'ignored', ready: 'true' }, email: 'fixture-private@example.invalid',
      external_accounts: { data: [{ bank_account: 'private-fixture-bank' }] } },
    balance: { object: 'balance', livemode: false, available: [{ amount: 12345, currency: 'usd' }] } };
}

test('ready provider evidence contains only scoped readiness and aggregate requirement counts', () => {
  const f = sellerFixture();
  assert.deepEqual(projectSellerReadiness(f), {
    version: 'vendor-seller-readiness-v1', bindingId: f.binding.id, storeId: f.binding.storeId,
    connectedAccountId: 'acct_seller', platformAccountId: 'acct_platform', livemode: false,
    checkedAt: f.checkedAt, capabilitiesReady: true, reasons: [],
    requirements: { currentlyDue: 0, pastDue: 0, pendingVerification: 0, eventuallyDue: 0 },
  });
});

for (const [name, mutate] of [
  ['foreign owner', f => { f.ownerId = '44444444-4444-4444-8444-444444444444'; }],
  ['invalid owner', f => { f.ownerId = 'caller'; }],
  ['foreign platform', f => { f.binding.platformAccountId = 'acct_other'; }],
  ['foreign mode', f => { f.binding.livemode = true; }],
  ['missing mode', f => { delete f.binding.livemode; }],
  ['platform as seller', f => { f.binding.connectedAccountId = 'acct_platform'; }],
  ['invalid account ID', f => { f.binding.connectedAccountId = '../accounts'; }],
  ['invalid store', f => { f.binding.storeId = 'store'; }],
  ['missing binding', f => { f.binding = null; }],
  ['invalid scope', f => { f.scope.accountId = ''; }],
  ['missing expected controller', f => { delete f.binding.controller; }],
  ['unknown expected fee payer', f => { f.binding.controller.feesPayer = 'caller'; }],
  ['different returned seller', f => { f.account.id = 'acct_other'; }],
  ['deleted seller', f => { f.account.deleted = true; }],
  ['absent seller', f => { f.account = null; }],
  ['wrong provider object', f => { f.account.object = 'customer'; }],
  ['missing balance', f => { f.balance = null; }],
  ['wrong balance object', f => { f.balance.object = 'account'; }],
  ['balance mode mismatch', f => { f.balance.livemode = true; }],
  ['missing balance mode', f => { delete f.balance.livemode; f.account.livemode = false; }],
  ['invalid timestamp', f => { f.checkedAt = NaN; }],
]) test(`provider evidence rejects ${name}`, () => {
  const f = sellerFixture(); mutate(f); assert.throws(() => projectSellerReadiness(f));
});

for (const [name, mutate, reason] of [
  ['no charges', f => { f.account.charges_enabled = false; }, 'charges_disabled'],
  ['no payouts', f => { f.account.payouts_enabled = false; }, 'payouts_disabled'],
  ['onboarding not submitted', f => { f.account.details_submitted = false; }, 'details_required'],
  ['pending card capability', f => { f.account.capabilities.card_payments = 'pending'; }, 'card_payments_inactive'],
  ['inactive transfers', f => { f.account.capabilities.transfers = 'inactive'; }, 'transfers_inactive'],
  ['unknown capability', f => { f.account.capabilities.card_payments = 'new_status'; }, 'card_payments_inactive'],
  ['current requirements in grace', f => { f.account.requirements.currently_due = ['company.tax_id']; }, 'requirements_due'],
  ['overdue requirements', f => { f.account.requirements.past_due = ['external_account']; }, 'requirements_due'],
  ['pending verification', f => { f.account.requirements.pending_verification = ['person.verification']; }, 'verification_pending'],
  ['provider restriction', f => { f.account.requirements.disabled_reason = 'platform_paused'; }, 'account_restricted'],
  ['unknown restriction', f => { f.account.requirements.disabled_reason = 'future_provider_restriction'; }, 'account_restricted'],
  ['missing requirements', f => { delete f.account.requirements; }, 'incomplete_evidence'],
  ['null requirement list', f => { f.account.requirements.currently_due = null; }, 'incomplete_evidence'],
  ['malformed requirement', f => { f.account.requirements.past_due = [1]; }, 'incomplete_evidence'],
  ['missing disabled reason', f => { delete f.account.requirements.disabled_reason; }, 'incomplete_evidence'],
  ['truthy flag', f => { f.account.payouts_enabled = 'true'; }, 'incomplete_evidence'],
  ['missing controller', f => { delete f.account.controller; }, 'controller_mismatch'],
  ['no platform control', f => { f.account.controller.is_controller = false; }, 'controller_mismatch'],
  ['self-controlled seller', f => { f.account.controller.type = 'account'; }, 'controller_mismatch'],
  ['changed fee responsibility', f => { f.account.controller.fees.payer = 'application'; }, 'controller_mismatch'],
  ['changed loss responsibility', f => { f.account.controller.losses.payments = 'application'; }, 'controller_mismatch'],
  ['changed requirement collection', f => { f.account.controller.requirement_collection = 'application'; }, 'controller_mismatch'],
  ['changed dashboard', f => { f.account.controller.stripe_dashboard.type = 'express'; }, 'controller_mismatch'],
]) test(`seller capabilities fail closed for ${name}`, () => {
  const f = sellerFixture(); mutate(f);
  const result = projectSellerReadiness(f);
  assert.equal(result.capabilitiesReady, false); assert.ok(result.reasons.includes(reason));
  const serialized = JSON.stringify(result);
  for (const privateValue of ['fixture-private', 'private-fixture-bank', '12345', 'company.tax_id', 'person.verification'])
    assert.equal(serialized.includes(privateValue), false);
});

test('future threshold requirements are advisory until they become current', () => {
  const f = sellerFixture();
  f.account.requirements.eventually_due = ['company.tax_id'];
  f.account.future_requirements = { currently_due: ['company.tax_id'] };
  assert.equal(projectSellerReadiness(f).capabilitiesReady, true);
  assert.equal(projectSellerReadiness(f).requirements.eventuallyDue, 1);
  f.account.requirements.currently_due = ['company.tax_id'];
  assert.equal(projectSellerReadiness(f).capabilitiesReady, false);
});

test('fee/loss policy must match the bound model and is never chosen from provider metadata', () => {
  const f = sellerFixture();
  f.binding.controller = { feesPayer: 'application', paymentLosses: 'application', requirementCollection: 'stripe', dashboard: 'express' };
  assert.equal(projectSellerReadiness(f).capabilitiesReady, false);
  f.account.controller.fees.payer = 'application'; f.account.controller.losses.payments = 'application';
  f.account.controller.stripe_dashboard.type = 'express';
  assert.equal(projectSellerReadiness(f).capabilitiesReady, true);
});

test('a fresh restricted read does not inherit a previous ready result', () => {
  const f = sellerFixture(); assert.equal(projectSellerReadiness(f).capabilitiesReady, true);
  f.account.payouts_enabled = false;
  assert.equal(projectSellerReadiness(f).capabilitiesReady, false);
});
