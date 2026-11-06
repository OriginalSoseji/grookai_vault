import { createHash } from 'node:crypto';
import { EbaySellerApiError } from './seller_client_v1.mjs';
import { bindListingConditionToCopy } from './seller_copy_condition_v1.mjs';
import { sellerReviewDetails } from './seller_review_details_v1.mjs';

// These inputs are assembled by the worker from verified owner/provider reads.
// This module never accepts client ownership, policy, photo or fee attestations.
const invalid = code => { throw new EbaySellerApiError(code); };
const record = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const identifier = value => typeof value === 'string'
  && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const uuid = value => typeof value === 'string'
  && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
const text = (value, max, code) => {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()
      || [...value].length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) invalid(code);
  return value;
};
const escapeHtml = value => value.replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonical);
  if (!record(value)) invalid('review_evidence_invalid');
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

export const sellerReviewHash = value => createHash('sha256')
  .update(JSON.stringify(canonical(value))).digest('hex');
export const serializeSellerReview = value => JSON.stringify(canonical(value));

const inventoryConditions = new Set([
  'NEW', 'LIKE_NEW', 'NEW_OTHER', 'NEW_WITH_DEFECTS', 'MANUFACTURER_REFURBISHED',
  'CERTIFIED_REFURBISHED', 'EXCELLENT_REFURBISHED', 'VERY_GOOD_REFURBISHED',
  'GOOD_REFURBISHED', 'SELLER_REFURBISHED', 'USED_EXCELLENT', 'USED_VERY_GOOD',
  'USED_GOOD', 'USED_ACCEPTABLE', 'FOR_PARTS_OR_NOT_WORKING',
  'PRE_OWNED_EXCELLENT', 'PRE_OWNED_FAIR',
]);

function validateAspects(selected, metadata) {
  if (!record(selected) || !Array.isArray(metadata) || metadata.length > 300) invalid('category_aspects_unavailable');
  const definitions = new Map();
  for (const aspect of metadata) {
    if (!record(aspect) || typeof aspect.localizedAspectName !== 'string'
        || definitions.has(aspect.localizedAspectName)) invalid('category_aspects_unavailable');
    definitions.set(aspect.localizedAspectName, aspect);
  }
  for (const name of Object.keys(selected)) {
    if (!definitions.has(name)) invalid('category_aspect_invalid');
  }
  const result = [];
  for (const [name, definition] of definitions) {
    const constraint = definition.aspectConstraint;
    if (!record(constraint) || typeof constraint.aspectRequired !== 'boolean') invalid('category_aspects_unavailable');
    const values = selected[name];
    if (values === undefined) {
      if (constraint.aspectRequired) invalid('required_category_aspect_missing');
      continue;
    }
    if (!Array.isArray(values) || values.length < 1 || values.length > 30
        || new Set(values).size !== values.length) invalid('category_aspect_invalid');
    if (!['SINGLE', 'MULTI'].includes(constraint.itemToAspectCardinality)
        || (constraint.itemToAspectCardinality === 'SINGLE' && values.length !== 1)) invalid('category_aspect_invalid');
    // Non-string/date/range and conditional aspect rules need a qualified UI.
    // Stop rather than silently omitting an unsupported provider requirement.
    if (constraint.aspectDataType !== 'STRING'
        || !['FREE_TEXT', 'SELECTION_ONLY'].includes(constraint.aspectMode)
        || definition.aspectValues?.some(v => v.valueConstraints?.length)) invalid('category_aspect_rule_unsupported');
    const allowed = new Set((definition.aspectValues ?? []).map(v => v.localizedValue));
    for (const value of values) {
      text(value, Math.min(constraint.aspectMaxLength ?? 65, 1000), 'category_aspect_invalid');
      if (constraint.aspectMode === 'SELECTION_ONLY' && !allowed.has(value)) invalid('category_aspect_invalid');
    }
    result.push([name, [...values].sort()]);
  }
  return Object.fromEntries(result.sort(([a], [b]) => a.localeCompare(b, 'en')));
}

function validateCondition(choice, qualified) {
  // qualified includes the official ID-to-Inventory-enum mapping. Neither
  // copy condition nor a guessed numeric ID can supply that mapping.
  if (!record(choice) || !Array.isArray(qualified)) invalid('listing_condition_required');
  const definition = qualified.find(v => v.conditionId === choice.conditionId);
  if (!definition || definition.usage === 'RESTRICTED'
      || !inventoryConditions.has(definition.inventoryCondition)
      || typeof definition.mappingSource !== 'string' || !definition.mappingSource.startsWith('https://developer.ebay.com/')) invalid('listing_condition_invalid');
  const definitions = new Map((definition.conditionDescriptors ?? []).map(d => [d.conditionDescriptorId, d]));
  const selected = choice.descriptors ?? [];
  if (!Array.isArray(selected) || selected.length > 30) invalid('condition_descriptor_invalid');
  const unique = new Map();
  for (const descriptor of selected) {
    if (!record(descriptor) || unique.has(descriptor.id) || !definitions.has(descriptor.id)) invalid('condition_descriptor_invalid');
    unique.set(descriptor.id, descriptor);
  }
  const result = [];
  for (const [id, definition] of definitions) {
    const constraint = definition.conditionDescriptorConstraint;
    if (!record(constraint) || constraint.applicableToConditionDescriptorIds?.length) invalid('condition_descriptor_rule_unsupported');
    const selected = unique.get(id);
    if (!selected) {
      if (constraint.usage === 'REQUIRED') invalid('required_condition_descriptor_missing');
      continue;
    }
    if (constraint.mode === 'FREE_TEXT') {
      if (selected.values !== undefined || constraint.cardinality !== 'SINGLE') invalid('condition_descriptor_invalid');
      result.push({ name: id, additionalInfo: text(selected.additionalInfo, Math.min(constraint.maxLength ?? 100, 1000), 'condition_descriptor_invalid') });
    } else if (constraint.mode === 'SELECTION_ONLY') {
      const values = selected.values;
      if (selected.additionalInfo !== undefined || !['SINGLE', 'MULTI'].includes(constraint.cardinality)
          || !Array.isArray(values) || !values.length || values.length > 30
          || new Set(values).size !== values.length
          || (constraint.cardinality === 'SINGLE' && values.length !== 1)) invalid('condition_descriptor_invalid');
      for (const value of values) {
        const option = definition.conditionDescriptorValues?.find(v => v.conditionDescriptorValueId === value);
        if (!option) invalid('condition_descriptor_invalid');
        for (const dependency of option.conditionDescriptorValueConstraints ?? []) {
          const other = unique.get(dependency.applicableToConditionDescriptorId);
          if (!Array.isArray(dependency.applicableToConditionDescriptorValueIds)
              || !dependency.applicableToConditionDescriptorValueIds.some(v => other?.values?.includes(v))) invalid('condition_descriptor_dependency_invalid');
        }
      }
      result.push({ name: id, values: [...values].sort() });
    } else invalid('condition_descriptor_rule_unsupported');
  }
  return { condition: definition.inventoryCondition,
    conditionDescription: text(choice.description, 1000, 'condition_description_required'),
    ...(result.length ? { conditionDescriptors: result.sort((a, b) => a.name.localeCompare(b.name, 'en')) } : {}) };
}

export function buildSellerListingPreparation({ actorId, draftId, revision, sellerAccountId,
  copy, input, evidence, photos, now = Date.now() }) {
  if (!uuid(actorId) || !uuid(draftId) || !uuid(sellerAccountId)
      || !Number.isSafeInteger(revision) || revision < 1 || !Number.isFinite(now)) invalid('review_identity_invalid');
  if (!record(copy) || copy.user_id !== actorId || !uuid(copy.id)
      || copy.archived_at !== null || !uuid(copy.card_print_id)
      || !uuid(copy.card_printing_id)) invalid('exact_active_copy_required');
  if (!record(input) || !record(evidence) || !identifier(input.categoryId)
      || evidence.categoryId !== input.categoryId || evidence.sellerAccountId !== sellerAccountId
      || evidence.marketplaceId !== 'EBAY_US' || !Number.isFinite(evidence.fetchedAt)
      || evidence.fetchedAt > now || now - evidence.fetchedAt > 600_000) invalid('seller_evidence_expired');
  if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 1 || input.priceCents > 100_000_000) invalid('listing_price_invalid');
  const title = text(input.title, 80, 'listing_title_invalid');
  if (title.length > 80 || /[\r\n\t]/.test(title)) invalid('listing_title_invalid');
  const description = text(input.description, 5000, 'listing_description_required');
  const policyKinds = ['fulfillment', 'payment', 'return'];
  const policies = {};
  const policyEvidence = {};
  for (const kind of policyKinds) {
    const id = input.policies?.[kind];
    const available = evidence.policies?.[kind];
    if (!Array.isArray(available)) invalid('seller_policy_invalid');
    const selected = available.find(p => p?.[kind + 'PolicyId'] === id && p.marketplaceId === 'EBAY_US');
    if (!identifier(id) || !selected) invalid('seller_policy_invalid');
    policies[kind + 'PolicyId'] = id;
    policyEvidence[kind] = sellerReviewHash(selected);
  }
  if (!Array.isArray(evidence.locations)) invalid('seller_location_invalid');
  const location = evidence.locations.find(l => l?.merchantLocationKey === input.locationKey && l.merchantLocationStatus === 'ENABLED');
  if (!identifier(input.locationKey) || !location) invalid('seller_location_invalid');
  if (!Array.isArray(photos) || photos.length < 1 || photos.length > 12
      || new Set(photos.map(p => p.id)).size !== photos.length) invalid('physical_copy_photos_required');
  const imageUrls = photos.map(photo => {
    if (!uuid(photo.id) || photo.ownerId !== actorId || photo.draftId !== draftId
        || !/^[a-f0-9]{64}$/.test(photo.sha256) || !Number.isFinite(Date.parse(photo.expiresAt))
        || Date.parse(photo.expiresAt) - now < 3600_000) invalid('listing_photo_invalid');
    let url;
    try { url = new URL(photo.imageUrl); } catch { invalid('listing_photo_invalid'); }
    if (url.origin !== 'https://i.ebayimg.com' || url.username || url.password
        || url.search || url.hash || !url.pathname.startsWith('/images/')) invalid('listing_photo_invalid');
    return url.href;
  });
  const inventory = {
    availability: { shipToLocationAvailability: { quantity: 1 } },
    ...bindListingConditionToCopy({ copy, input, slabCert: evidence.slabCert,
      condition: validateCondition(input.condition, evidence.conditionChoices) }),
    product: { title, description, aspects: validateAspects(input.aspects, evidence.aspects), imageUrls },
  };
  const sku = 'gv-' + draftId;
  const offer = { sku, marketplaceId: 'EBAY_US', format: 'FIXED_PRICE',
    availableQuantity: 1, quantityLimitPerBuyer: 1, categoryId: input.categoryId,
    includeCatalogProductDetails: false, listingDuration: 'GTC',
    merchantLocationKey: input.locationKey,
    listingPolicies: { ...policies, bestOfferTerms: { bestOfferEnabled: false } },
    listingDescription: '<p>' + escapeHtml(description).replace(/\r?\n/g, '<br>') + '</p>',
    pricingSummary: { price: { currency: 'USD', value: (input.priceCents / 100).toFixed(2) } } };
  const copyIdentity = Object.fromEntries(['id', 'card_print_id', 'card_printing_id',
    'slab_cert_id', 'condition_label', 'is_graded', 'grade_company', 'grade_value',
    'grade_label', 'gv_vi_id'].map(key => [key, copy[key] ?? null]));
  const snapshot = { version: 'ebay_seller_review_v1', actorId, draftId, revision,
    sellerAccountId, copyIdentity, inventory, offer,
    reviewDetails: sellerReviewDetails({ input, evidence, condition: inventory }),
    slabEvidence: copy.slab_cert_id ? Object.fromEntries(['id', 'grader', 'cert_number',
      'card_print_id', 'grade', 'qualifiers'].map(key => [key, evidence.slabCert[key] ?? null])) : null,
    photos: photos.map(p => ({ id: p.id, sha256: p.sha256, imageUrl: p.imageUrl, expiresAt: p.expiresAt })),
    policyEvidence, locationEvidence: sellerReviewHash(location),
    categoryEvidence: sellerReviewHash({ categoryId: evidence.categoryId,
      aspects: evidence.aspects, conditionChoices: evidence.conditionChoices }) };
  return { sku, inventory, offer, snapshot, preparationHash: sellerReviewHash(snapshot) };
}
