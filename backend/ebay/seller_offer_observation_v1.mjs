import { EbaySellerApiError } from './seller_client_v1.mjs';

// Inventory API 1.18.8, ListingStatusEnum / OfferStatusEnum.
// This is provider evidence, never permission to release an inventory hold.
const listingStates = new Set([
  'ACTIVE', 'OUT_OF_STOCK', 'INACTIVE', 'ENDED', 'EBAY_ENDED', 'NOT_LISTED',
]);
const identifier = value => typeof value === 'string'
  && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const invalid = () => { throw new EbaySellerApiError('provider_response_invalid'); };

export function observeEbayOffer(value, { sku, offerId, listingId = null }) {
  if (!identifier(sku) || !identifier(offerId)
      || (listingId !== null && !identifier(listingId))) invalid();
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.sku !== sku || value.offerId !== offerId
      || value.marketplaceId !== 'EBAY_US' || value.format !== 'FIXED_PRICE'
      || !['PUBLISHED', 'UNPUBLISHED'].includes(value.status)) invalid();

  if (value.status === 'UNPUBLISHED') {
    if (value.listing !== undefined && value.listing !== null) invalid();
    return {
      offerId, sku, listingId: null, state: 'unpublished',
      providerEnded: false, soldQuantity: null,
      // An earlier timed-out publish may still complete. SQL operation authority
      // must reconcile it; a single unpublished observation cannot release it.
      releasesReservation: false,
    };
  }

  const listing = value.listing;
  if (!listing || !identifier(listing.listingId)
      || (listingId !== null && listing.listingId !== listingId)
      || !listingStates.has(listing.listingStatus)
      || !Number.isSafeInteger(listing.soldQuantity)
      || listing.soldQuantity < 0 || listing.soldQuantity > 1
      || (listing.listingOnHold !== undefined
          && typeof listing.listingOnHold !== 'boolean')) invalid();
  const ended = ['ENDED', 'EBAY_ENDED'].includes(listing.listingStatus);
  return {
    offerId, sku, listingId: listing.listingId,
    state: listing.soldQuantity === 1 ? 'sale_reported'
      : listing.listingOnHold === true ? 'on_hold'
      : listing.listingStatus.toLowerCase(),
    providerStatus: listing.listingStatus,
    providerEnded: ended,
    soldQuantity: listing.soldQuantity,
    // A provider sale still needs the canonical disposition writer, and a
    // terminal listing still needs the matching durable operation/revision.
    releasesReservation: false,
  };
}
