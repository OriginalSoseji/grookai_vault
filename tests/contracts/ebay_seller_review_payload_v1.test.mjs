import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSellerListingPreparation as build, sellerReviewHash } from '../../backend/ebay/seller_review_payload_v1.mjs';
import { bindSellerFeeReview } from '../../backend/ebay/seller_fee_review_v1.mjs';
import { verifySellerPublicationReview } from '../../backend/ebay/seller_publication_review_v1.mjs';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = Date.parse('2026-10-28T12:00:00Z');
function fixture() {
  return {
    actorId: id(1), draftId: id(2), revision: 4, sellerAccountId: id(3), now,
    copy: { id: id(4), user_id: id(1), archived_at: null, card_print_id: id(5),
      card_printing_id: id(6), condition_label: null, is_graded: false,
      notes: 'PRIVATE copy note', acquisition_cost: 77, intent: 'hold' },
    input: { title: 'Eevee exact physical copy', description: 'My <physical> copy\n& condition photo',
      categoryId: '183454', priceCents: 1234, locationKey: 'home',
      policies: { fulfillment: '20', payment: '21', return: '22' },
      aspects: { Game: ['Pokemon'], Language: ['English'] },
      condition: { conditionId: '4000', description: 'Surface wear visible in photographs',
        descriptors: [{ id: '40001', values: ['400010'] }] },
      user_id: id(99), quantity: 200, format: 'AUCTION', currency: 'EUR' },
    evidence: { sellerAccountId: id(3), marketplaceId: 'EBAY_US', categoryId: '183454', fetchedAt: now - 1000,
      policies: Object.fromEntries(['fulfillment', 'payment', 'return'].map((kind, i) => [kind, [{ [kind + 'PolicyId']: String(20 + i), marketplaceId: 'EBAY_US', description: kind + ' terms' }]])),
      locations: [{ merchantLocationKey: 'home', merchantLocationStatus: 'ENABLED' }],
      aspects: ['Game', 'Language'].map(name => ({ localizedAspectName: name,
        aspectConstraint: { aspectRequired: true, aspectDataType: 'STRING',
          aspectMode: 'SELECTION_ONLY', itemToAspectCardinality: 'SINGLE' },
        aspectValues: [{ localizedValue: name === 'Game' ? 'Pokemon' : 'English' }] })),
      conditionChoices: [{ conditionId: '4000', inventoryCondition: 'USED_VERY_GOOD',
        mappingSource: 'https://developer.ebay.com/qualified-fixture',
        conditionDescriptors: [{ conditionDescriptorId: '40001',
          conditionDescriptorConstraint: { usage: 'REQUIRED', mode: 'SELECTION_ONLY', cardinality: 'SINGLE' },
          conditionDescriptorValues: [{ conditionDescriptorValueId: '400010' }] }] }] },
    photos: [{ id: id(7), ownerId: id(1), draftId: id(2), sha256: 'a'.repeat(64),
      imageUrl: 'https://i.ebayimg.com/images/g/physical/s-l1600.jpg', expiresAt: '2026-11-28T12:00:00Z' }],
  };
}
const rejects = (change, code) => {
  const value = fixture(); change(value);
  assert.throws(() => build(value), e => e.code === code);
};

test('exact-copy preparation escapes HTML and cannot inherit private notes or caller ownership/quantity', () => {
  const result = build(fixture());
  assert.equal(result.offer.pricingSummary.price.value, '12.34');
  assert.equal(result.offer.pricingSummary.price.currency, 'USD');
  assert.equal(result.offer.availableQuantity, 1);
  assert.equal(result.offer.format, 'FIXED_PRICE');
  assert.equal(result.offer.includeCatalogProductDetails, false);
  assert.equal(result.offer.listingDescription, '<p>My &lt;physical&gt; copy<br>&amp; condition photo</p>');
  assert.equal(result.inventory.condition, 'USED_VERY_GOOD');
  assert.equal(result.snapshot.copyIdentity.condition_label, null);
  assert.ok(!JSON.stringify(result).includes('PRIVATE copy note'));
  assert.ok(!JSON.stringify(result).includes('acquisition_cost'));
});

test('condition and required descriptors never default from an unknown owned-copy condition', () => {
  rejects(v => { delete v.input.condition; }, 'listing_condition_required');
  rejects(v => { v.input.condition.descriptors = []; }, 'required_condition_descriptor_missing');
  rejects(v => { v.input.condition.descriptors[0].values = ['invented']; }, 'condition_descriptor_invalid');
  rejects(v => { v.evidence.conditionChoices[0].usage = 'RESTRICTED'; }, 'listing_condition_invalid');
  rejects(v => { v.evidence.conditionChoices[0].inventoryCondition = 'NM'; }, 'listing_condition_invalid');
});

test('another owner, archived copy, or missing exact printing cannot prepare', () => {
  rejects(v => { v.copy.user_id = id(99); }, 'exact_active_copy_required');
  rejects(v => { v.copy.archived_at = '2026-10-28T00:00:00Z'; }, 'exact_active_copy_required');
  rejects(v => { v.copy.card_printing_id = null; }, 'exact_active_copy_required');
});

test('seller evidence is bound to account/category/marketplace and a short freshness window', () => {
  for (const key of ['sellerAccountId', 'categoryId', 'marketplaceId']) rejects(v => { v.evidence[key] = 'different'; }, 'seller_evidence_expired');
  rejects(v => { v.evidence.fetchedAt = now + 1; }, 'seller_evidence_expired');
  rejects(v => { v.evidence.fetchedAt = now - 600001; }, 'seller_evidence_expired');
});

test('unowned policies, disabled location, and malformed provider policy responses fail closed', () => {
  rejects(v => { v.input.policies.fulfillment = '999'; }, 'seller_policy_invalid');
  rejects(v => { v.evidence.policies.fulfillment = {}; }, 'seller_policy_invalid');
  rejects(v => { v.evidence.locations[0].merchantLocationStatus = 'DISABLED'; }, 'seller_location_invalid');
});

test('photos must be current EPS receipts for this owner and draft', () => {
  rejects(v => { v.photos = []; }, 'physical_copy_photos_required');
  rejects(v => { v.photos[0].ownerId = id(99); }, 'listing_photo_invalid');
  rejects(v => { v.photos[0].draftId = id(99); }, 'listing_photo_invalid');
  rejects(v => { v.photos[0].imageUrl = 'https://private.supabase.co/storage/catalog.jpg'; }, 'listing_photo_invalid');
  rejects(v => { v.photos[0].imageUrl += '?token=private'; }, 'listing_photo_invalid');
  rejects(v => { v.photos[0].expiresAt = new Date(now + 1000).toISOString(); }, 'listing_photo_invalid');
});

test('required aspects, selection constraints, and unqualified conditional rules cannot be omitted', () => {
  rejects(v => { delete v.input.aspects.Game; }, 'required_category_aspect_missing');
  rejects(v => { v.input.aspects.Game = ['Invented']; }, 'category_aspect_invalid');
  rejects(v => { v.input.aspects.Extra = ['value']; }, 'category_aspect_invalid');
  rejects(v => { v.evidence.aspects[0].aspectValues[0].valueConstraints = [{}]; }, 'category_aspect_rule_unsupported');
});

test('condition descriptor dependencies are enforced across selected provider values', () => {
  const value = fixture();
  value.evidence.conditionChoices[0].conditionDescriptors.push({ conditionDescriptorId: '40002',
    conditionDescriptorConstraint: { mode: 'SELECTION_ONLY', cardinality: 'SINGLE' },
    conditionDescriptorValues: [{ conditionDescriptorValueId: '400020' }] });
  value.evidence.conditionChoices[0].conditionDescriptors[0].conditionDescriptorValues[0].conditionDescriptorValueConstraints = [{ applicableToConditionDescriptorId: '40002', applicableToConditionDescriptorValueIds: ['400020'] }];
  assert.throws(() => build(value), e => e.code === 'condition_descriptor_dependency_invalid');
  value.input.condition.descriptors.push({ id: '40002', values: ['400020'] });
  assert.equal(build(value).inventory.conditionDescriptors.length, 2);
});

test('material copy, policy, photo, price and revision changes all invalidate the review hash', () => {
  const original = build(fixture()).preparationHash;
  for (const change of [v => { v.copy.condition_label = 'NM'; }, v => { v.evidence.policies.fulfillment[0].description = 'Changed shipping'; },
    v => { v.photos[0].sha256 = 'b'.repeat(64); }, v => { v.input.priceCents += 1; }, v => { v.revision += 1; }]) {
    const changed = fixture(); change(changed);
    assert.notEqual(build(changed).preparationHash, original);
  }
  assert.equal(sellerReviewHash({ b: 1, a: [2, 3] }), sellerReviewHash({ a: [2, 3], b: 1 }));
});

test('a known saved-copy condition cannot silently become a different eBay card condition', () => {
  rejects(v => { v.copy.condition_label = 'LP'; }, 'listing_copy_condition_mismatch');
  rejects(v => { v.copy.condition_label = 'DMG'; }, 'listing_damage_disclosure_required');
});

test('listing price is an explicit bounded integer cent amount and title is a single line', () => {
  for (const value of [0, -1, 2.5, NaN, '12.34', 100000001]) rejects(v => { v.input.priceCents = value; }, 'listing_price_invalid');
  rejects(v => { v.input.title = 'Title\nInjected'; }, 'listing_title_invalid');
  rejects(v => { v.input.title = 'x'.repeat(81); }, 'listing_title_invalid');
});

function publicationFixture() {
  const value = fixture(); const preparation = build(value);
  const reviewed = bindSellerFeeReview({ preparation, now, receipt: {
    offerId: 'fixture-offer', requestedOfferId: 'fixture-offer', sellerAccountId: value.sellerAccountId,
    draftId: value.draftId, draftRevision: value.revision, preparationHash: preparation.preparationHash,
    requestedAt: now - 1000, response: { feeSummaries: [{ marketplaceId: 'EBAY_US',
      fees: [{ feeType: 'InsertionFee', amount: { currency: 'USD', value: '0.35' } }] }] },
  } });
  return { actorId: value.actorId, draftId: value.draftId, revision: value.revision,
    accountId: value.sellerAccountId, reviewHash: reviewed.reviewHash, snapshot: reviewed.snapshot,
    context: { draft: { id: value.draftId, user_id: value.actorId, account_id: value.sellerAccountId,
      input: value.input }, copy: value.copy, photos: value.photos.map(p => ({ id: p.id,
      user_id: p.ownerId, draft_id: p.draftId, source_sha256: p.sha256, image_url: p.imageUrl, expires_at: p.expiresAt })) },
    evidence: value.evidence, observedOffer: { ...structuredClone(preparation.offer),
      offerId: 'fixture-offer', status: 'UNPUBLISHED' }, observedInventory: structuredClone(preparation.inventory), now };
}

test('publication rechecks the reviewed exact-copy payload against fresh metadata and provider reads', () => {
  const args = publicationFixture();
  assert.equal(verifySellerPublicationReview(args), true);
  args.observedOffer.pricingSummary.price.value = '12.340';
  assert.throws(() => verifySellerPublicationReview(args), e => e.code === 'seller_review_changed_or_expired');
  args.observedOffer.pricingSummary.price.value = '12.34';
  assert.equal(verifySellerPublicationReview(args), true);
});
test('external offer price or photo changes cannot inherit a previous publish confirmation', () => {
  for (const change of [v => { v.observedOffer.pricingSummary.price.value = '1.00'; },
    v => { v.observedOffer.listingPolicies.bestOfferTerms.bestOfferEnabled = true; },
    v => { v.observedInventory.product.imageUrls[0] = 'https://i.ebayimg.com/images/different.jpg'; }]) {
    const args = publicationFixture(); change(args);
    assert.throws(() => verifySellerPublicationReview(args), e => e.code === 'seller_review_changed_or_expired');
  }
});
test('changed live policies or current photo receipts invalidate publication before its provider intent', () => {
  for (const change of [v => { v.evidence.policies.fulfillment[0].description = 'Changed policy terms'; },
    v => { v.context.photos[0].source_sha256 = 'f'.repeat(64); }]) {
    const args = publicationFixture(); change(args);
    assert.throws(() => verifySellerPublicationReview(args), e => e.code === 'seller_review_changed_or_expired');
  }
});
test('a quote that expires while metadata is being rechecked cannot reach publication', () => {
  const args = publicationFixture(); args.now += 120001;
  assert.throws(() => verifySellerPublicationReview(args), e => e.code === 'seller_review_changed_or_expired');
});
test('an unexpected existing provider listing keeps uncertainty instead of claiming definitive non-publication', () => {
  const args = publicationFixture(); args.observedOffer.status = 'PUBLISHED';
  args.observedOffer.listing = { listingId: 'fixture-listing', listingStatus: 'ACTIVE', soldQuantity: 0 };
  assert.throws(() => verifySellerPublicationReview(args), e =>
    e.code === 'seller_existing_listing_requires_reconciliation' && e.uncertain === true);
});
test('a different verified owner, account or review hash cannot reuse a prepared snapshot', () => {
  for (const changes of [{ actorId: id(99) }, { accountId: id(99) }, { reviewHash: 'f'.repeat(64) }]) {
    assert.throws(() => verifySellerPublicationReview({ ...publicationFixture(), ...changes }), e => e.code === 'seller_review_changed_or_expired');
  }
});
