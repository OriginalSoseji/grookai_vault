import { EbaySellerApiError } from './seller_client_v1.mjs';

const fail = code => { throw new EbaySellerApiError(code); };
const id = value => typeof value === 'string' && /^\d{1,20}$/.test(value);

export function qualifySellerCategorySuggestions(response) {
  const rows = response?.categorySuggestions;
  if (!Array.isArray(rows) || rows.length > 50) fail('seller_category_suggestions_unavailable');
  const seen = new Set();
  const categories = [];
  for (const row of rows) {
    const category = row?.category;
    const categoryId = category?.categoryId;
    const categoryName = category?.categoryName;
    if (!id(categoryId) || typeof categoryName !== 'string'
        || !categoryName.trim() || categoryName.trim().length > 200) continue;
    if (seen.has(categoryId)) continue;
    seen.add(categoryId);
    categories.push({ categoryId, categoryName: categoryName.trim() });
  }
  if (categories.length === 0) fail('seller_category_suggestions_unavailable');
  return categories;
}

export function selectSellerCategory(categories, requestedCategoryId) {
  if (!Array.isArray(categories) || categories.length === 0) fail('seller_category_suggestions_unavailable');
  if (requestedCategoryId === undefined || requestedCategoryId === null || requestedCategoryId === '') {
    return categories.find(category => /trading card|collectible card game/i.test(category.categoryName))
      ?? categories[0];
  }
  if (!id(requestedCategoryId)) fail('seller_category_not_suggested');
  const selected = categories.find(category => category.categoryId === requestedCategoryId);
  if (!selected) fail('seller_category_not_suggested');
  return selected;
}

export function requireTradingCardCategory(aspects) {
  if (!Array.isArray(aspects?.aspects) || !aspects.aspects.some(aspect =>
    typeof aspect?.localizedAspectName === 'string'
    && aspect.localizedAspectName.trim().toLowerCase() === 'game')) {
    fail('seller_category_not_supported');
  }
  return aspects;
}
