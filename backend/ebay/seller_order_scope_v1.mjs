// Fulfillment API v1.20.6, GET /order, official OpenAPI security scopes.
const orderScopes = new Set([
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
]);
// Apply before pagination so listing-only accounts cannot occupy the legacy
// order worker's entire seller page. The values are fixed provider scopes.
export const sellerOrderScopeFilter = 'scopes.is.null,scopes.ov.{'
  + [...orderScopes].map(scope => '"' + scope + '"').join(',') + '}';

export function canSyncSellerOrders(scopes) {
  // Preserve explicitly legacy records with no recorded scope receipt. Newly
  // linked listing-only accounts always carry the four granted seller scopes.
  if (scopes === null || scopes === undefined) return true;
  return Array.isArray(scopes) && scopes.some(scope => orderScopes.has(scope));
}
