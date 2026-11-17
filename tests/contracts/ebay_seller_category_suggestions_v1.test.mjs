import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { qualifySellerCategorySuggestions, requireTradingCardCategory, selectSellerCategory } from '../../backend/ebay/seller_category_suggestions_v1.mjs';

test('eBay category suggestions are normalized from the live taxonomy response', () => {
  const categories = qualifySellerCategorySuggestions({ categorySuggestions: [
    { category: { categoryId: '183454', categoryName: 'Trading Card Singles' } },
    { category: { categoryId: '183454', categoryName: 'Duplicate' } },
    { category: { categoryId: '999', categoryName: 'Collectible Card Games' } },
    { category: { categoryId: 'not-a-category', categoryName: 'Invalid' } },
  ] });
  assert.deepEqual(categories, [
    { categoryId: '183454', categoryName: 'Trading Card Singles' },
    { categoryId: '999', categoryName: 'Collectible Card Games' },
  ]);
});

test('eBay suggestions must contain usable current categories', () => {
  for (const response of [null, {}, { categorySuggestions: [] },
    { categorySuggestions: [{ category: { categoryId: '1', categoryName: ' ' } }] },
    { categorySuggestions: Array(51).fill({ category: { categoryId: '1', categoryName: 'Trading Cards' } }) }]) {
    assert.throws(() => qualifySellerCategorySuggestions(response), e => e.code === 'seller_category_suggestions_unavailable');
  }
});

test('default category favors trading cards and explicit selection stays inside eBay suggestions', () => {
  const options = [{ categoryId: '333', categoryName: 'Card Accessories' },
    { categoryId: '183454', categoryName: 'Trading Card Singles' },
    { categoryId: '999', categoryName: 'Collectible Card Games' }];
  assert.deepEqual(selectSellerCategory(options), options[1]);
  assert.deepEqual(selectSellerCategory(options, '999'), options[2]);
  assert.throws(() => selectSellerCategory(options, '888'), e => e.code === 'seller_category_not_suggested');
  assert.throws(() => selectSellerCategory(options, 'invented'), e => e.code === 'seller_category_not_suggested');
});

test('selected categories need the live Game aspect before they can list trading cards', () => {
  assert.doesNotThrow(() => requireTradingCardCategory({ aspects: [
    { localizedAspectName: 'Game', aspectConstraint: { aspectRequired: true } },
  ] }));
  for (const aspects of [null, {}, { aspects: [] }, { aspects: [{ localizedAspectName: 'Brand' }] }]) {
    assert.throws(() => requireTradingCardCategory(aspects), e => e.code === 'seller_category_not_supported');
  }
});

test('native, web, and backend all expose the same live category selection contract', () => {
  const backend = readFileSync(new URL('../../backend/ebay/seller_backend_service_v1.mjs', import.meta.url), 'utf8');
  const native = readFileSync(new URL('../../lib/screens/ebay/ebay_seller_fields.dart', import.meta.url), 'utf8');
  const nativeController = readFileSync(new URL('../../lib/services/ebay/ebay_seller_controller.dart', import.meta.url), 'utf8');
  const web = readFileSync(new URL('../../apps/web/src/components/ebay/SellerWorkspace.tsx', import.meta.url), 'utf8');
  assert.match(backend, /getCategorySuggestions\(/);
  assert.match(backend, /requireTradingCardCategory\(aspects\)/);
  assert.doesNotMatch(backend, /input\.categoryId\s*!==\s*'183454'/);
  assert.match(native, /'eBay category'/);
  assert.match(nativeController, /'categoryOptions'/);
  assert.match(web, /aria-label="eBay category"/);
  assert.match(web, /categoryOptions\.map/);
});
