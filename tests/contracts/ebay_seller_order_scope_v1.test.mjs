import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canSyncSellerOrders } from '../../backend/ebay/seller_order_scope_v1.mjs';
import { sellerScopes } from '../../backend/ebay/seller_oauth_v1.mjs';

test('listing consent never implicitly authorizes order reading', () => {
  assert.equal(canSyncSellerOrders(sellerScopes), false);
  assert.equal(canSyncSellerOrders([]), false);
  assert.equal(canSyncSellerOrders('https://api.ebay.com/oauth/api_scope/sell.fulfillment'), false);
});
test('recorded fulfillment permissions and legacy scope-less records retain their existing path', () => {
  for (const scope of ['sell.fulfillment', 'sell.fulfillment.readonly']) {
    assert.equal(canSyncSellerOrders(['https://api.ebay.com/oauth/api_scope/' + scope]), true);
  }
  assert.equal(canSyncSellerOrders(null), true);
});
test('order synchronization filters consent before requesting a token or reading orders', () => {
  const source = fs.readFileSync(new URL('../../backend/ebay/ebay_sellers_sync_worker.mjs', import.meta.url), 'utf8');
  const loop = source.indexOf('for (const seller of sellers)');
  assert.ok(source.indexOf('if (!canSyncSellerOrders(seller.scopes)) continue;', loop)
    < source.indexOf('await syncSeller(', loop));
});
