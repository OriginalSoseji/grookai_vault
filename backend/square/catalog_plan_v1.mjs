// Pure, offline preparation only. This module has no credentials, SDK, network,
// database or mutation entry point. A qualified server must supply owner/public
// eligibility and explicit selection; these records are NOT authentication.
import { createHash } from 'node:crypto';

export const SQUARE_CATALOG_PLAN_VERSION = 'grookai-square-catalog-plan-v1';
export const SQUARE_API_VERSION = '2026-09-16';
const siteOrigin = 'https://grookaivault.com';
const gvviPattern = /^GVVI-[A-Z0-9]+-[0-9]{6}$/;
const providerId = /^[A-Za-z0-9_-]{1,100}$/;

export class SquareCatalogPlanError extends Error {
  constructor(code) { super(code); this.name = 'SquareCatalogPlanError'; this.code = code; }
}
const fail = code => { throw new SquareCatalogPlanError(code); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = value => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (!plain(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])]));
}
const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
const text = (value, max = 255) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value)) fail('invalid_text');
  return value.trim();
};
const id = value => {
  if (typeof value !== 'string' || !providerId.test(value)) fail('invalid_provider_identifier');
  return value;
};

// Exact USD conversion. Never round a third decimal or silently infer currency.
export function squareUsdCents(amount, currency) {
  if (currency !== 'USD') fail('unsupported_currency');
  if (typeof amount !== 'string' && typeof amount !== 'number') fail('invalid_price');
  const raw = String(amount);
  if (!/^(0|[1-9][0-9]{0,9})(\.[0-9]{1,2})?$/.test(raw)) fail('invalid_price');
  const [whole, fraction = ''] = raw.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents <= 0n || cents > BigInt(Number.MAX_SAFE_INTEGER)) fail('invalid_price');
  return Number(cents);
}

export function squareQrSku(gvviId) {
  if (typeof gvviId !== 'string' || !gvviPattern.test(gvviId)) fail('invalid_gvvi');
  return `${siteOrigin}/q/${gvviId}`;
}

function scopeKey(scope) {
  if (!plain(scope) || !['sandbox', 'production'].includes(scope.environment)) fail('invalid_scope');
  return canonical({ownerId: id(scope.ownerId), merchantId: id(scope.merchantId),
    locationId: id(scope.locationId), environment: scope.environment});
}

export function squareManagedProjection(item, variation) {
  return {name: item.item_data?.name, variationName: variation.item_variation_data?.name,
    sku: variation.item_variation_data?.sku,
    pricingType: variation.item_variation_data?.pricing_type,
    price: variation.item_variation_data?.price_money};
}

export function squareDesiredProjection(offer) {
  return {
    name: text(offer.name),
    variationName: text(offer.variationName),
    sku: squareQrSku(offer.gvviId),
    pricingType: 'FIXED_PRICING',
    price: {amount: squareUsdCents(offer.askingPriceAmount, offer.currency), currency: 'USD'},
  };
}

function createObject(desired, key, locationId) {
  const itemId = `#grookai-item-${key.slice(0, 24)}`;
  return {type: 'ITEM', id: itemId, present_at_all_locations: false,
    present_at_location_ids: [locationId], item_data: {name: desired.name, variations: [{
      type: 'ITEM_VARIATION', id: `#grookai-variation-${key.slice(0, 24)}`,
      present_at_all_locations: false, present_at_location_ids: [locationId],
      item_variation_data: {item_id: itemId, name: desired.variationName, sku: desired.sku,
        pricing_type: desired.pricingType, price_money: desired.price, track_inventory: true},
    }]}};
}

function updateObject(item, variationId, desired) {
  // Square upsert is full replacement. Retain taxes, modifiers, siblings, stock
  // settings and all other observed fields. Versions protect concurrent edits.
  const result = structuredClone(item);
  result.item_data.name = desired.name;
  const data = result.item_data.variations.find(row => row.id === variationId).item_variation_data;
  Object.assign(data, {name: desired.variationName, sku: desired.sku,
    pricing_type: desired.pricingType, price_money: desired.price});
  return result;
}

/**
 * Input is an explicitly selected, server-qualified exact-copy snapshot and a
 * COMPLETE provider catalog snapshot from the SAME owner/merchant/environment.
 * This function prepares review data, never permission to execute it. Snapshot
 * completeness and eligibility must be reproved by a future durable worker.
 */
export function planSquareCatalog({scope, offers, catalog, mappings = []}) {
  const scopeIdentity = scopeKey(scope);
  if (!Array.isArray(offers) || offers.length > 1000 || !Array.isArray(mappings) ||
      !plain(catalog) || catalog.complete !== true || !Array.isArray(catalog.items) ||
      scopeKey(catalog.scope) !== scopeIdentity) fail('incomplete_or_wrong_scope_snapshot');
  const byItem = new Map();
  const bySku = new Map();
  const variationIds = new Set();
  for (const item of catalog.items) {
    if (!plain(item) || item.type !== 'ITEM' || item.is_deleted === true || !plain(item.item_data) ||
        !Array.isArray(item.item_data.variations)) fail('invalid_catalog_snapshot');
    id(item.id);
    if (byItem.has(item.id)) fail('duplicate_catalog_item');
    byItem.set(item.id, item);
    for (const variation of item.item_data.variations) {
      if (!plain(variation) || variation.type !== 'ITEM_VARIATION' || variation.is_deleted === true ||
          !plain(variation.item_variation_data) || variation.item_variation_data.item_id !== item.id) fail('invalid_catalog_snapshot');
      id(variation.id);
      if (variationIds.has(variation.id)) fail('duplicate_catalog_variation');
      variationIds.add(variation.id);
      const sku = variation.item_variation_data.sku;
      if (typeof sku === 'string') bySku.set(sku, [...(bySku.get(sku) ?? []), {item, variation}]);
    }
  }
  const byGvvi = new Map();
  const mappedVariations = new Set();
  for (const mapping of mappings) {
    if (!plain(mapping) || scopeKey(mapping.scope) !== scopeIdentity || !gvviPattern.test(mapping.gvviId)) fail('invalid_mapping_scope');
    id(mapping.itemId); id(mapping.variationId);
    if (byGvvi.has(mapping.gvviId) || mappedVariations.has(mapping.variationId)) fail('duplicate_mapping');
    byGvvi.set(mapping.gvviId, mapping); mappedVariations.add(mapping.variationId);
  }
  const seenOffers = new Set();
  const actions = [];
  const excluded = [];
  for (const offer of offers) {
    if (!plain(offer) || !gvviPattern.test(offer.gvviId) || seenOffers.has(offer.gvviId)) fail('invalid_or_duplicate_offer');
    seenOffers.add(offer.gvviId);
    if (offer.ownerId !== scope.ownerId) fail('wrong_offer_owner');
    if (offer.selected !== true || offer.publicVendorOffer !== true || offer.available !== true) {
      excluded.push({gvviId: offer.gvviId, reason: 'not_selected_public_available_stock'}); continue;
    }
    const desired = squareDesiredProjection(offer);
    const candidates = bySku.get(desired.sku) ?? [];
    const mapping = byGvvi.get(offer.gvviId);
    const base = {gvviId: offer.gvviId, sku: desired.sku};
    if (candidates.length > 1) { actions.push({...base, action: 'conflict', reason: 'duplicate_square_sku'}); continue; }
    let object;
    let action;
    if (mapping) {
      const item = byItem.get(mapping.itemId);
      const variation = item?.item_data.variations.find(row => row.id === mapping.variationId);
      if (!variation || variation.item_variation_data.sku !== desired.sku) {
        actions.push({...base, action: 'conflict', reason: 'mapping_target_missing_or_changed'}); continue;
      }
      if (candidates.length !== 1 || candidates[0].variation.id !== mapping.variationId) fail('invalid_catalog_snapshot');
      const observed = squareManagedProjection(item, variation);
      if (canonical(observed) === canonical(desired)) { actions.push({...base, action: 'unchanged'}); continue; }
      if (!plain(mapping.lastSyncedProjection) || canonical(observed) !== canonical(mapping.lastSyncedProjection)) {
        actions.push({...base, action: 'conflict', reason: 'square_managed_fields_changed'}); continue;
      }
      if (!Number.isSafeInteger(item.version) || item.version <= 0 ||
          !Number.isSafeInteger(variation.version) || variation.version <= 0) fail('missing_catalog_version');
      // One item per exact copy. Never rename a manually shared multi-variation item.
      if (item.item_data.variations.length !== 1) {
        actions.push({...base, action: 'conflict', reason: 'shared_square_item_requires_review'}); continue;
      }
      object = updateObject(item, mapping.variationId, desired); action = 'update';
    } else if (candidates.length) {
      // Existing pilot/manual items must be adopted explicitly, not duplicated
      // or silently taken over merely because the SKU happens to match.
      actions.push({...base, action: 'adoption_required', itemId: candidates[0].item.id,
        variationId: candidates[0].variation.id}); continue;
    } else {
      object = createObject(desired, hash({scope: scopeIdentity, sku: desired.sku}), scope.locationId); action = 'create';
    }
    const request = {object};
    const idempotencyKey = `gk-square-v1-${hash({scope: scopeIdentity, request})}`;
    actions.push({...base, action, request: {idempotency_key: idempotencyKey, object}});
  }
  actions.sort((a, b) => a.gvviId.localeCompare(b.gvviId, 'en'));
  excluded.sort((a, b) => a.gvviId.localeCompare(b.gvviId, 'en'));
  const result = {version: SQUARE_CATALOG_PLAN_VERSION, squareApiVersion: SQUARE_API_VERSION,
    executable: false, scope: JSON.parse(scopeIdentity), actions, excluded};
  return {...result, planHash: hash(result)};
}

// Preview for NEW catalog items only. Square's dashboard still needs one reviewed
// bulk import. Existing items are deliberately excluded; this is not retry-safe
// synchronization, inventory allocation, tax configuration or sales reconciliation.
export function squareNewItemsCsv(plan, {locationName} = {}) {
  if (plan?.version !== SQUARE_CATALOG_PLAN_VERSION || plan.executable !== false ||
      !Array.isArray(plan.actions)) fail('invalid_plan');
  const headings = ['Token', 'Item Name', 'Variation Name', 'Description', 'SKU', 'Price'];
  if (locationName !== undefined) headings.push(`Enabled ${text(locationName, 100)}`);
  const cell = value => {
    const raw = String(value);
    // Quoting alone doesn't prevent spreadsheet formula execution.
    const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = plan.actions.filter(row => row.action === 'create').map(row => {
    const item = row.request.object;
    const variation = item.item_data.variations[0].item_variation_data;
    const cents = variation.price_money.amount;
    const values = ['', item.item_data.name, variation.name, '', variation.sku,
      `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`];
    if (locationName !== undefined) values.push('Y');
    return values.map(cell).join(',');
  });
  return `\uFEFF${[headings.map(cell).join(','), ...rows].join('\r\n')}\r\n`;
}
