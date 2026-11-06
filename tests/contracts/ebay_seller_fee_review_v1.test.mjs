import test from 'node:test';
import assert from 'node:assert/strict';
import { bindSellerFeeReview } from '../../backend/ebay/seller_fee_review_v1.mjs';
import { sellerReviewHash } from '../../backend/ebay/seller_review_payload_v1.mjs';

const now = Date.parse('2026-10-28T12:00:00Z');
function fixture() {
  const snapshot = { sellerAccountId: 'seller-1', draftId: 'draft-1', revision: 2,
    offer: { sku: 'stable-sku', availableQuantity: 1 }, inventory: { condition: 'USED_GOOD' } };
  const preparationHash = sellerReviewHash(snapshot);
  return { now, preparation: { snapshot, offer: structuredClone(snapshot.offer),
    inventory: structuredClone(snapshot.inventory), preparationHash },
  receipt: { offerId: '1234', requestedOfferId: '1234', sellerAccountId: 'seller-1',
    draftId: 'draft-1', draftRevision: 2, preparationHash, requestedAt: now - 1000,
    response: { feeSummaries: [{ marketplaceId: 'EBAY_US', fees: [
      { feeType: 'InsertionFee', amount: { currency: 'USD', value: '0.35' },
        promotionalDiscount: { currency: 'USD', value: '0.10' } },
    ] }] } } };
}
const rejects = (change, code) => { const value = fixture(); change(value);
  assert.throws(() => bindSellerFeeReview(value), e => e.code === code); };

test('actual single-offer listing fees retain discount separately and do not invent proceeds', () => {
  const result = bindSellerFeeReview(fixture());
  assert.equal(result.feeQuote.fees[0].amount.cents, 35);
  assert.equal(result.feeQuote.fees[0].promotionalDiscount.cents, 10);
  assert.equal(result.feeQuote.finalSaleFeesKnown, false);
  assert.equal(result.feeQuote.netProceedsKnown, false);
  assert.equal(result.reviewHash, sellerReviewHash(result.snapshot));
  assert.equal('netProceeds' in result.feeQuote, false);
});
test('a missing/empty fee response cannot silently become a zero-cost quote', () => {
  rejects(v => { v.receipt.response = {}; }, 'listing_fee_response_invalid');
  rejects(v => { v.receipt.response.feeSummaries[0].fees = []; }, 'listing_fee_response_invalid');
});
test('fee evidence binds the exact offer, seller, draft, revision and prepared payload', () => {
  for (const [key, value] of Object.entries({ requestedOfferId: 'other', sellerAccountId: 'other',
    draftId: 'other', draftRevision: 3, preparationHash: 'other' })) rejects(v => { v.receipt[key] = value; }, 'listing_fee_receipt_stale');
  rejects(v => { v.preparation.inventory.condition = 'LIKE_NEW'; }, 'listing_review_changed');
  rejects(v => { v.preparation.offer.availableQuantity = 2; }, 'listing_review_changed');
});
test('stale quotes, foreign currencies and unqualified warnings stop review', () => {
  rejects(v => { v.receipt.requestedAt = now - 120001; }, 'listing_fee_receipt_stale');
  rejects(v => { v.receipt.requestedAt = now + 1; }, 'listing_fee_receipt_stale');
  rejects(v => { v.receipt.response.feeSummaries[0].fees[0].amount.currency = 'EUR'; }, 'listing_fee_response_invalid');
  rejects(v => { v.receipt.response.feeSummaries[0].warnings = [{ errorId: 123, message: 'provider-private' }]; }, 'listing_fee_warning_requires_review');
});
test('unparseable amounts and impossible discounts cannot produce a plausible fee', () => {
  for (const value of ['1e3', '-1', '01.50', '1.234', 'Infinity', 0.35]) rejects(v => { v.receipt.response.feeSummaries[0].fees[0].amount.value = value; }, 'listing_fee_response_invalid');
  rejects(v => { v.receipt.response.feeSummaries[0].fees[0].promotionalDiscount.value = '0.36'; }, 'listing_fee_response_invalid');
});
test('a changed fee receipt invalidates the final publication review', () => {
  const first = bindSellerFeeReview(fixture());
  const value = fixture(); value.receipt.response.feeSummaries[0].fees[0].amount.value = '0.45';
  assert.notEqual(bindSellerFeeReview(value).reviewHash, first.reviewHash);
});
