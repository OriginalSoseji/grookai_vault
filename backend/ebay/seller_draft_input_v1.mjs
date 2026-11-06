import { EbaySellerApiError } from './seller_client_v1.mjs';
const fail = () => { throw new EbaySellerApiError('seller_draft_input_invalid'); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v, limit) => {
  if (typeof v !== 'string' || v.length > limit || v.includes('\0')) fail();
  return v;
};
// Incomplete fields can be saved. Validate recovery shapes without claiming
// that their category, condition or policies have passed provider review.
export function validateSellerDraftInput(v) {
  if (!object(v) || !object(v.policies) || !object(v.condition) || !object(v.aspects)
      || !Array.isArray(v.condition.descriptors) || v.condition.descriptors.length > 20
      || Object.keys(v.aspects).length > 100 || !Number.isSafeInteger(v.priceCents)
      || v.priceCents < 0 || v.priceCents > 100000000) fail();
  const aspects = Object.fromEntries(Object.entries(v.aspects).map(([key, values]) => {
    text(key, 100);
    if (!Array.isArray(values) || values.length > 100) fail();
    return [key, values.map(item => text(item, 500))];
  }));
  const condition = { conditionId: text(v.condition.conditionId, 80),
    description: text(v.condition.description, 1000),
    descriptors: v.condition.descriptors.map(d => {
      if (!object(d) || (d.values !== undefined && (!Array.isArray(d.values) || d.values.length > 100))) fail();
      return { id: text(d.id, 80), ...(d.values !== undefined ? { values: d.values.map(item => text(item, 500)) } : {}),
        ...(d.additionalInfo !== undefined ? { additionalInfo: text(d.additionalInfo, 1000) } : {}) };
    }) };
  if (v.condition.damagedDisclosureConfirmed !== undefined) {
    if (typeof v.condition.damagedDisclosureConfirmed !== 'boolean') fail();
    condition.damagedDisclosureConfirmed = v.condition.damagedDisclosureConfirmed;
  }
  return { title: text(v.title, 80), description: text(v.description, 5000),
    categoryId: text(v.categoryId, 80), priceCents: v.priceCents,
    locationKey: text(v.locationKey, 100), aspects, condition,
    policies: Object.fromEntries(['fulfillment', 'payment', 'return'].map(k => [k, text(v.policies[k], 80)])) };
}
