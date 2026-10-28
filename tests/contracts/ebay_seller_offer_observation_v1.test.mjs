import test from 'node:test';
import assert from 'node:assert/strict';
import { observeEbayOffer } from '../../backend/ebay/seller_offer_observation_v1.mjs';

const expected = { sku: 'gv_owned_copy', offerId: '12345', listingId: '99999' };
const offer = (status = 'ACTIVE', extra = {}) => ({
  sku: expected.sku, offerId: expected.offerId, marketplaceId: 'EBAY_US',
  format: 'FIXED_PRICE', status: 'PUBLISHED',
  listing: { listingId: '99999', listingStatus: status, soldQuantity: 0, ...extra },
});

test('out-of-stock listings are still active provider commitments', () => {
  const result = observeEbayOffer(offer('OUT_OF_STOCK'), expected);
  assert.equal(result.state, 'out_of_stock');
  assert.equal(result.providerEnded, false);
  assert.equal(result.releasesReservation, false);
});

test('inactive and not-yet-listed do not prove that a listing ended', () => {
  for (const status of ['INACTIVE', 'NOT_LISTED']) {
    const result = observeEbayOffer(offer(status), expected);
    assert.equal(result.providerEnded, false);
    assert.equal(result.releasesReservation, false);
  }
});

test('on-hold listing cannot silently return the copy to available inventory', () => {
  const result = observeEbayOffer(offer('ACTIVE', { listingOnHold: true }), expected);
  assert.equal(result.state, 'on_hold');
  assert.equal(result.releasesReservation, false);
});

test('ended evidence identifies the same listing without granting an inventory write', () => {
  for (const status of ['ENDED', 'EBAY_ENDED']) {
    const result = observeEbayOffer(offer(status), expected);
    assert.equal(result.providerEnded, true);
    assert.equal(result.listingId, expected.listingId);
    assert.equal(result.releasesReservation, false);
  }
});

test('provider sale evidence never invents proceeds or releases the sold copy', () => {
  const result = observeEbayOffer(offer('ENDED', { soldQuantity: 1 }), expected);
  assert.equal(result.state, 'sale_reported');
  assert.equal(result.soldQuantity, 1);
  assert.equal(result.releasesReservation, false);
  assert.equal('salePrice' in result, false);
});

test('unpublished read cannot resolve an ambiguous earlier publish on its own', () => {
  const value = { ...offer(), status: 'UNPUBLISHED' };
  delete value.listing;
  const result = observeEbayOffer(value, expected);
  assert.equal(result.state, 'unpublished');
  assert.equal(result.releasesReservation, false);
  assert.equal(result.soldQuantity, null);
});

test('mismatched seller offer, SKU, listing or marketplace fails closed', () => {
  for (const changes of [
    { sku: 'another_copy' }, { offerId: '54321' },
    { marketplaceId: 'EBAY_GB' }, { format: 'AUCTION' },
    { listing: { ...offer().listing, listingId: '88888' } },
  ]) assert.throws(() => observeEbayOffer({ ...offer(), ...changes }, expected),
    error => error.code === 'provider_response_invalid');
});

test('unknown status and inconsistent single-copy quantities require reconciliation', () => {
  for (const value of [
    offer('FUTURE_PROVIDER_STATE'), offer('ACTIVE', { soldQuantity: 2 }),
    offer('ENDED', { soldQuantity: null }),
    { ...offer(), status: 'FUTURE_OFFER_STATE' },
    { ...offer(), status: 'UNPUBLISHED' },
  ]) assert.throws(() => observeEbayOffer(value, expected));
});
