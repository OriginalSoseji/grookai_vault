import { EbaySellerApiError } from './seller_client_v1.mjs';
import { buildSellerListingPreparation, sellerReviewHash } from './seller_review_payload_v1.mjs';
import { observeEbayOffer } from './seller_offer_observation_v1.mjs';

const fail = code => { throw new EbaySellerApiError(code); };
function samePayload(expected, actual, path = '') {
  if (expected === null || typeof expected !== 'object') {
    // eBay Amount.value may lose insignificant trailing decimal zeroes.
    if (path.endsWith('.price.value') && typeof expected === 'string' && typeof actual === 'string') {
      return /^\d+(?:\.\d{1,2})?$/.test(actual) && Number(expected) === Number(actual);
    }
    return expected === actual;
  }
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length
    && expected.every((item, index) => samePayload(item, actual[index], path + '.' + index));
  return actual !== null && typeof actual === 'object' && !Array.isArray(actual)
    && Object.keys(expected).every(key => samePayload(expected[key], actual[key], path + '.' + key));
}

// All arguments are server-owned SDK/provider evidence. A pre-call rejection
// here cannot be bypassed by a client-supplied hash or confirmation checkbox.
export function verifySellerPublicationReview({ actorId, draftId, revision, accountId,
  reviewHash, snapshot, context, evidence, observedOffer, observedInventory, now = Date.now() }) {
  if (!snapshot || snapshot.actorId !== actorId || snapshot.draftId !== draftId
      || snapshot.sellerAccountId !== accountId || snapshot.revision !== revision
      || sellerReviewHash(snapshot) !== reviewHash || context.draft.id !== draftId
      || context.draft.account_id !== accountId || context.draft.user_id !== actorId) fail('seller_review_changed_or_expired');
  const observation = observeEbayOffer(observedOffer, { sku: 'gv-' + draftId, offerId: snapshot.offerId });
  if (observation.state !== 'unpublished') {
    // An unexpected live provider listing is not a pre-call non-publication
    // proof. Keep the copy held so its identity can be reconciled safely.
    throw new EbaySellerApiError('seller_existing_listing_requires_reconciliation', { uncertain: true });
  }
  const rebuilt = buildSellerListingPreparation({ actorId, draftId, revision,
    sellerAccountId: accountId, copy: context.copy, input: context.draft.input, evidence,
    photos: context.photos.map(p => ({ id: p.id, ownerId: p.user_id, draftId: p.draft_id,
      sha256: p.source_sha256, imageUrl: p.image_url, expiresAt: p.expires_at })), now });
  const { offerId, feeQuote, ...prepared } = snapshot;
  if (offerId !== observation.offerId || sellerReviewHash(prepared) !== rebuilt.preparationHash
      || !samePayload(rebuilt.offer, observedOffer) || !samePayload(rebuilt.inventory, observedInventory)
      || !Number.isFinite(now) || !Number.isFinite(feeQuote?.requestedAt)
      || feeQuote.requestedAt > now || now - feeQuote.requestedAt > 120000) fail('seller_review_changed_or_expired');
  return true;
}
