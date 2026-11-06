import test from 'node:test';
import assert from 'node:assert/strict';
import { EbaySellerPublicationWorkflow } from '../../backend/ebay/seller_publication_workflow_v1.mjs';
import { EbaySellerApiError } from '../../backend/ebay/seller_client_v1.mjs';

const ids = [1, 2, 3, 4, 5].map(n => `eb000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const input = { actorId: ids[0], draftId: ids[1], requestId: ids[2], revision: 3,
  kind: 'publish', reviewHash: 'a'.repeat(64) };
function harness({ recovered = false, providerError, lostIntent, lostCompletion,
  wrongWithdrawal = false, expiredCompletion = false, missingOffer = false, discoveredOffers } = {}) {
  const calls = [];
  const workflow = new EbaySellerPublicationWorkflow({
    verifyPublicationReview: async () => { calls.push({ name: 'verify_current_review' }); },
    db: { rpc: async (name, payload) => {
    calls.push({ name, payload });
    if (name === 'ebay_seller_operation_claim_v1') return { data: {
      operationId: ids[3], status: recovered ? 'succeeded' : 'running', stage: 'claimed',
      claimGranted: !recovered, recovered, accountId: ids[4], sku: 'gv-' + ids[1],
      offerId: missingOffer ? null : 'fixture-offer', listingId: missingOffer ? null : 'fixture-listing', snapshot: { private: true },
    } };
    if (name === 'ebay_seller_operation_checkpoint_v1') return lostIntent
      ? { error: { message: 'private-provider-body' } }
      : { data: { status: 'running', advanced: true, stage: payload.p_next_stage } };
    if (name === 'ebay_seller_operation_complete_v1') return lostCompletion
      ? { error: { message: 'private-provider-body' } }
      : { data: { status: expiredCompletion ? 'uncertain' : 'succeeded', state: 'live' } };
    return { data: { status: 'uncertain' } };
  } }, clientForAccount: async account => {
    calls.push({ name: 'private_client', account });
    return {
      publishOffer: async offer => { calls.push({ name: 'publish', offer }); if (providerError) throw providerError;
        return { listingId: 'fixture-listing' }; },
      getOffersForSku: async sku => { calls.push({ name: 'discover_offers', sku }); return discoveredOffers; },
      withdrawOffer: async offer => { calls.push({ name: 'withdraw', offer });
        return { listingId: wrongWithdrawal ? 'different-listing' : 'fixture-listing' }; },
      getOffer: async offer => { calls.push({ name: 'get_offer', offer }); return {
        offerId: offer, sku: 'gv-' + ids[1], marketplaceId: 'EBAY_US', format: 'FIXED_PRICE', status: 'PUBLISHED',
        listing: { listingId: 'fixture-listing', listingStatus: 'ENDED', soldQuantity: 0 },
      }; },
    };
  } });
  return { workflow, calls };
}

test('publication persists claim and intent before one provider call and persists its receipt before success', async () => {
  const { workflow, calls } = harness();
  assert.deepEqual(await workflow.execute(input), { operationId: ids[3], status: 'succeeded', state: 'live', recovered: false });
  assert.deepEqual(calls.map(c => c.name), ['ebay_seller_operation_claim_v1', 'private_client', 'verify_current_review',
    'ebay_seller_operation_checkpoint_v1', 'publish', 'ebay_seller_operation_complete_v1']);
  const claim = calls[0].payload;
  assert.equal(claim.p_actor, input.actorId);
  assert.equal(claim.p_expected_hash, input.reviewHash);
  assert.equal(calls[5].payload.p_claim_nonce, claim.p_claim_nonce);
  assert.deepEqual(calls[5].payload.p_receipt, { offerId: 'fixture-offer', listingId: 'fixture-listing' });
});
test('a repeated request never obtains a provider client or exposes the private snapshot', async () => {
  const { workflow, calls } = harness({ recovered: true });
  const result = await workflow.execute(input);
  assert.equal(result.recovered, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(result).sort(), ['operationId', 'recovered', 'status']);
});
test('a lost intent acknowledgement prevents any provider mutation', async () => {
  const { workflow, calls } = harness({ lostIntent: true });
  await assert.rejects(workflow.execute(input), e => e.code === 'seller_state_unavailable');
  assert.equal(calls.some(c => c.name === 'publish'), false);
  assert.equal(calls.at(-1).payload.p_uncertain, true);
});
test('an ambiguous provider mutation is recorded once and never automatically replayed', async () => {
  const { workflow, calls } = harness({ providerError: new EbaySellerApiError('provider_result_uncertain', { uncertain: true }) });
  await assert.rejects(workflow.execute(input), e => e.uncertain);
  assert.equal(calls.filter(c => c.name === 'publish').length, 1);
  assert.equal(calls.at(-1).name, 'ebay_seller_operation_fail_v1');
  assert.equal(calls.at(-1).payload.p_uncertain, true);
});
test('a lost completion acknowledgement cannot become a second publication or expose an upstream body', async () => {
  const { workflow, calls } = harness({ lostCompletion: true });
  await assert.rejects(workflow.execute(input), e => e.code === 'seller_state_unavailable' && !e.message.includes('private-provider'));
  assert.equal(calls.filter(c => c.name === 'publish').length, 1);
  assert.equal(calls.at(-1).payload.p_uncertain, true);
});
test('an expired completion reports uncertainty rather than listing success', async () => {
  const { workflow } = harness({ expiredCompletion: true });
  assert.equal((await workflow.execute(input)).status, 'uncertain');
});
test('withdrawal requires a receipt for the same known listing', async () => {
  const { workflow, calls } = harness({ wrongWithdrawal: true });
  await assert.rejects(workflow.execute({ ...input, kind: 'withdraw', reviewHash: null }), e => e.uncertain);
  assert.equal(calls.some(c => c.name === 'ebay_seller_operation_complete_v1'), false);
  assert.equal(calls.filter(c => c.name === 'withdraw').length, 1);
});
test('an ended-offer observation is persisted as read evidence without releasing the copy', async () => {
  const { workflow, calls } = harness();
  await workflow.execute({ ...input, kind: 'reconcile', reviewHash: null });
  const receipt = calls.at(-1).payload.p_receipt;
  assert.equal(receipt.providerEnded, true);
  assert.equal(receipt.releasesReservation, false);
  assert.equal(calls.some(c => ['publish', 'withdraw'].includes(c.name)), false);
});
test('malformed IDs, absent review and unsupported operations fail before any database call', async () => {
  for (const changes of [{ actorId: 'client-owner' }, { requestId: null }, { reviewHash: null },
    { revision: 0 }, { kind: 'prepare' }, { kind: 'withdraw' }]) {
    const { workflow, calls } = harness();
    await assert.rejects(workflow.execute({ ...input, ...changes }), e => e.code === 'seller_request_invalid');
    assert.equal(calls.length, 0);
  }
});

test('a lost create receipt is reconciled by its unique SKU offer without a replacement write', async () => {
  const { workflow, calls } = harness({ missingOffer: true,
    discoveredOffers: { total: 1, offers: [{ offerId: 'discovered-offer' }] } });
  await workflow.execute({ ...input, kind: 'reconcile', reviewHash: null });
  assert.equal(calls.find(c => c.name === 'get_offer').offer, 'discovered-offer');
  assert.equal(calls.at(-1).payload.p_receipt.offerId, 'discovered-offer');
  assert.equal(calls.some(c => ['publish', 'withdraw'].includes(c.name)), false);
});
test('missing, ambiguous or partial SKU discovery cannot replace an uncertain offer', async () => {
  for (const [discoveredOffers, code] of [
    [{ total: 0, offers: [] }, 'seller_offer_not_observed_yet'],
    [{ total: 2, offers: [{ offerId: 'first' }, { offerId: 'second' }] }, 'seller_multiple_offers_require_review'],
    [{ total: 2, offers: [{ offerId: 'first' }] }, 'seller_offer_discovery_incomplete'],
  ]) {
    const { workflow, calls } = harness({ missingOffer: true, discoveredOffers });
    await assert.rejects(workflow.execute({ ...input, kind: 'reconcile', reviewHash: null }), e => e.code === code);
    assert.equal(calls.some(c => ['publish', 'withdraw', 'get_offer', 'ebay_seller_operation_complete_v1'].includes(c.name)), false);
  }
});
