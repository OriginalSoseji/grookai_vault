import { EbaySellerApiError } from './seller_client_v1.mjs';
import { sellerReviewHash } from './seller_review_payload_v1.mjs';

const fail = code => { throw new EbaySellerApiError(code); };
function amount(value) {
  if (value?.currency !== 'USD' || typeof value.value !== 'string'
      || !/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(value.value)) fail('listing_fee_response_invalid');
  const [whole, fraction = ''] = value.value.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > 100_000_000) fail('listing_fee_response_invalid');
  return { currency: 'USD', cents, value: (cents / 100).toFixed(2) };
}

// The worker creates this receipt around a single-offer getListingFees call.
// Never accept this receipt, its timestamp or the provider body from a client.
export function bindSellerFeeReview({ preparation, receipt, now = Date.now() }) {
  const snapshot = preparation?.snapshot;
  if (!snapshot || preparation.preparationHash !== sellerReviewHash(snapshot)
      || sellerReviewHash(preparation.offer) !== sellerReviewHash(snapshot.offer)
      || sellerReviewHash(preparation.inventory) !== sellerReviewHash(snapshot.inventory)) fail('listing_review_changed');
  if (!receipt || typeof receipt.offerId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(receipt.offerId)
      || receipt.requestedOfferId !== receipt.offerId || receipt.sellerAccountId !== snapshot.sellerAccountId
      || receipt.draftId !== snapshot.draftId || receipt.draftRevision !== snapshot.revision
      || receipt.preparationHash !== preparation.preparationHash
      || !Number.isFinite(now) || !Number.isFinite(receipt.requestedAt)
      || receipt.requestedAt > now || now - receipt.requestedAt > 120_000) fail('listing_fee_receipt_stale');
  const summaries = receipt.response?.feeSummaries;
  if (!Array.isArray(summaries) || summaries.length !== 1
      || summaries[0]?.marketplaceId !== 'EBAY_US'
      || !Array.isArray(summaries[0].fees) || !summaries[0].fees.length
      || summaries[0].fees.length > 50) fail('listing_fee_response_invalid');
  // Unqualified provider warnings require intervention. They cannot silently
  // become a clean quote, zero fees, or a forecast of the eventual sale payout.
  if (summaries[0].warnings !== undefined
      && (!Array.isArray(summaries[0].warnings) || summaries[0].warnings.length)) fail('listing_fee_warning_requires_review');
  const fees = summaries[0].fees.map(fee => {
    if (typeof fee?.feeType !== 'string' || !/^[A-Za-z][A-Za-z0-9 _-]{0,79}$/.test(fee.feeType)) fail('listing_fee_response_invalid');
    const quoted = amount(fee.amount);
    const discount = fee.promotionalDiscount === undefined ? null : amount(fee.promotionalDiscount);
    if (discount && discount.cents > quoted.cents) fail('listing_fee_response_invalid');
    return { type: fee.feeType, amount: quoted, ...(discount ? { promotionalDiscount: discount } : {}) };
  });
  const feeQuote = { version: 'ebay_listing_fee_quote_v1', offerId: receipt.offerId,
    marketplaceId: 'EBAY_US', currency: 'USD', requestedAt: receipt.requestedAt,
    fees, scope: 'provider_estimated_listing_fees', finalSaleFeesKnown: false,
    netProceedsKnown: false };
  const reviewed = { ...snapshot, offerId: receipt.offerId, feeQuote };
  return { snapshot: reviewed, feeQuote, reviewHash: sellerReviewHash(reviewed) };
}
