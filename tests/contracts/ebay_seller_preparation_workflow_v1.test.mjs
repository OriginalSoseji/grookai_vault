import test from 'node:test';
import assert from 'node:assert/strict';
import { EbaySellerPreparationWorkflow } from '../../backend/ebay/seller_preparation_workflow_v1.mjs';
import { sellerReviewHash } from '../../backend/ebay/seller_review_payload_v1.mjs';
import { EbaySellerApiError } from '../../backend/ebay/seller_client_v1.mjs';

const ids = [1, 2, 3, 4, 5, 6].map(n => `ec000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const input = { actorId: ids[0], draftId: ids[1], requestId: ids[2], revision: 3 };
const now = Date.parse('2026-10-28T12:00:00Z');
function harness({ stage = 'claimed', recovered = false, existingOffer = false,
  lostReceipt, providerError, wrongOwner = false } = {}) {
  const calls = [];
  const snapshot = { actorId: ids[0], draftId: ids[1], revision: 3, sellerAccountId: ids[4],
    inventory: { fixture: 'physical-copy' }, offer: { sku: 'gv-' + ids[1], availableQuantity: 1 } };
  const context = { draft: { id: ids[1], user_id: wrongOwner ? ids[5] : ids[0],
    account_id: ids[4], revision: 3, state: 'preparing', input: {} }, copy: {},
    photos: [{ id: ids[5], user_id: ids[0], draft_id: ids[1], state: 'awaiting_upload' }] };
  const listing = {
    putInventoryItem: async (sku, body) => { calls.push({ name: 'put_inventory', sku, body }); },
    createOffer: async body => { calls.push({ name: 'create_offer', body }); if (providerError) throw providerError;
      return { offerId: 'fixture-offer' }; },
    updateOffer: async (offerId, body) => { calls.push({ name: 'update_offer', offerId, body }); },
    getListingFees: async offerId => { calls.push({ name: 'get_fees', offerId }); return {
      feeSummaries: [{ marketplaceId: 'EBAY_US', fees: [{ feeType: 'InsertionFee', amount: { currency: 'USD', value: '0.35' } }] }],
    }; },
  };
  const media = {
    uploadCopyPhoto: async bytes => { calls.push({ name: 'upload_photo', bytes });
      return { imageId: 'fixture-image', image: null, sourceSha256: 'e'.repeat(64) }; },
    getImage: async imageId => { calls.push({ name: 'get_image', imageId });
      return { imageUrl: 'https://i.ebayimg.com/images/fixture.jpg', expiresAt: '2026-11-28T00:00:00Z' }; },
  };
  const workflow = new EbaySellerPreparationWorkflow({ now: () => now,
    db: { rpc: async (name, payload) => {
      calls.push({ name, payload });
      if (name.includes('operation_claim') || name.includes('operation_resume')) return { data: {
        operationId: ids[3], status: 'running', claimGranted: !recovered, stage,
        accountId: ids[4], sku: 'gv-' + ids[1], offerId: existingOffer || stage === 'offer_created' ? 'fixture-offer' : null,
        snapshot: { preparation: snapshot, preparationHash: sellerReviewHash(snapshot) },
      } };
      if (lostReceipt !== undefined && (lostReceipt === payload.p_transition || lostReceipt === name)) return { error: { message: 'private-upstream-body' } };
      if (name.includes('checkpoint')) return { data: { status: 'running', advanced: true, stage: payload.p_next_stage } };
      if (name.includes('photo_receipt')) return { data: { status: 'running', advanced: true } };
      if (name.includes('operation_yield')) return { data: { status: 'running', continuationReady: true } };
      if (name.includes('operation_complete')) return { data: { status: 'succeeded', state: 'prepared' } };
      return { data: { status: 'uncertain' } };
    } },
    loadContext: async owner => { calls.push({ name: 'load_private_context', owner }); return context; },
    clientsForAccount: async owner => { calls.push({ name: 'private_clients', owner }); return { listing, media }; },
    evidenceForCopy: async () => { throw Error('not used in these stages'); },
    downloadPhoto: async owner => { calls.push({ name: 'download_private_photo', owner }); return new Uint8Array([1, 2]); },
  });
  return { workflow, calls, context };
}

test('one photo step persists upload intent and EPS identity before fetching its hosted receipt', async () => {
  const { workflow, calls } = harness();
  assert.equal((await workflow.step(input)).continuationReady, true);
  assert.deepEqual(calls.map(c => c.name), ['ebay_seller_operation_claim_v1', 'load_private_context',
    'private_clients', 'download_private_photo', 'ebay_seller_photo_receipt_v1', 'upload_photo',
    'ebay_seller_photo_receipt_v1', 'get_image', 'ebay_seller_photo_receipt_v1', 'ebay_seller_operation_yield_v1']);
  assert.deepEqual(calls.filter(c => c.name.includes('photo_receipt')).map(c => c.payload.p_transition), ['start_upload', 'uploaded', 'hosted']);
  assert.equal(calls.some(c => ['put_inventory', 'create_offer', 'get_fees'].includes(c.name)), false);
});
test('lost EPS identity acknowledgement stops before a later provider GET or another upload', async () => {
  const { workflow, calls } = harness({ lostReceipt: 'uploaded' });
  await assert.rejects(workflow.step(input), e => e.code === 'seller_state_unavailable');
  assert.equal(calls.filter(c => c.name === 'upload_photo').length, 1);
  assert.equal(calls.some(c => c.name === 'get_image'), false);
  assert.equal(calls.at(-1).name, 'ebay_seller_operation_fail_v1');
});
test('a lost safe handoff acknowledgement cannot replay the completed photo step', async () => {
  const { workflow, calls } = harness({ lostReceipt: 'ebay_seller_operation_yield_v1' });
  await assert.rejects(workflow.step(input));
  assert.equal(calls.filter(c => c.name === 'upload_photo').length, 1);
  assert.equal(calls.at(-1).name, 'ebay_seller_operation_fail_v1');
});
test('a repeated request without a new claim returns before private reads or provider clients', async () => {
  const { workflow, calls } = harness({ recovered: true });
  assert.equal((await workflow.step(input)).recovered, true);
  assert.equal(calls.length, 1);
});
test('resumed inventory step uses the frozen payload once and yields after its receipt', async () => {
  const { workflow, calls } = harness({ stage: 'photos_ready' });
  await workflow.step({ ...input, operationId: ids[3] });
  assert.equal(calls[0].name, 'ebay_seller_operation_resume_v1');
  const mutation = calls.findIndex(c => c.name === 'put_inventory');
  assert.equal(calls[mutation - 1].payload.p_next_stage, 'inventory_started');
  assert.equal(calls[mutation + 1].payload.p_next_stage, 'inventory_written');
  assert.equal(calls.at(-1).name, 'ebay_seller_operation_yield_v1');
});
test('offer preparation creates once or updates its existing known ID without creating a replacement', async () => {
  for (const existingOffer of [false, true]) {
    const { workflow, calls } = harness({ stage: 'inventory_written', existingOffer });
    await workflow.step({ ...input, operationId: ids[3] });
    assert.equal(calls.filter(c => c.name === 'create_offer').length, existingOffer ? 0 : 1);
    assert.equal(calls.filter(c => c.name === 'update_offer').length, existingOffer ? 1 : 0);
    assert.equal(calls.at(-2).payload.p_receipt.offerId, 'fixture-offer');
  }
});
test('ambiguous offer creation persists failure and never creates another offer', async () => {
  const { workflow, calls } = harness({ stage: 'inventory_written', providerError:
    new EbaySellerApiError('provider_result_uncertain', { uncertain: true }) });
  await assert.rejects(workflow.step({ ...input, operationId: ids[3] }));
  assert.equal(calls.filter(c => c.name === 'create_offer').length, 1);
  assert.equal(calls.at(-1).payload.p_uncertain, true);
});
test('the fee step binds its actual response to the frozen preparation and persists the exact review hash', async () => {
  const { workflow, calls } = harness({ stage: 'offer_created' });
  assert.equal((await workflow.step({ ...input, operationId: ids[3] })).state, 'prepared');
  const completion = calls.at(-1);
  assert.equal(completion.name, 'ebay_seller_operation_complete_v1');
  const reviewed = JSON.parse(completion.payload.p_review_json);
  assert.equal(reviewed.feeQuote.fees[0].amount.cents, 35);
  assert.equal(completion.payload.p_receipt.reviewHash, sellerReviewHash(reviewed));
  assert.equal(calls.some(c => c.name === 'ebay_seller_operation_yield_v1'), false);
});
test('mismatched owner context or an in-flight mutation stage cannot trigger provider calls', async () => {
  for (const options of [{ wrongOwner: true }, { stage: 'offer_started' }, { stage: 'publish_started' }]) {
    const { workflow, calls } = harness(options);
    await assert.rejects(workflow.step({ ...input, operationId: ids[3] }));
    assert.equal(calls.some(c => ['upload_photo', 'create_offer', 'update_offer', 'put_inventory', 'get_fees'].includes(c.name)), false);
  }
});
