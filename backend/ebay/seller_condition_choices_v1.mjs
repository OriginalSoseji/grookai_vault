import { EbaySellerApiError } from './seller_client_v1.mjs';

// Inventory API1.18.8 ConditionEnum explicitly assigns LIKE_NEW /2750 to
// graded trading cards and USED_VERY_GOOD /4000 to ungraded trading cards.
// These are eBay's category semantics, not a physical Near Mint/LP judgment.
const mappingSource = 'https://developer.ebay.com/develop/api/spec/inventory_api.json';
const cardConditions = Object.freeze({ '2750': 'LIKE_NEW', '4000': 'USED_VERY_GOOD' });
const cardCategories = Object.freeze({
  '183050': ['400010', '400011', '400012', '400013'],
  '183454': ['400010', '400015', '400016', '400017'],
  '261328': ['400010', '400011', '400012', '400013'],
});
const identifier = value => typeof value === 'string' && /^\d{1,20}$/.test(value);
const fail = () => { throw new EbaySellerApiError('category_condition_policy_unavailable'); };

export function qualifyTradingCardConditionChoices({ categoryId, categoryTreeId, isGraded, response }) {
  if (!identifier(categoryId) || !identifier(categoryTreeId) || typeof isGraded !== 'boolean'
      || !Object.hasOwn(cardCategories, categoryId)
      || !Array.isArray(response?.itemConditionPolicies)) fail();
  const matching = response.itemConditionPolicies.filter(policy =>
    policy?.categoryId === categoryId && policy.categoryTreeId === categoryTreeId);
  if (matching.length !== 1 || matching[0].itemConditionRequired !== true
      || !Array.isArray(matching[0].itemConditions)) fail();
  const requiredId = isGraded ? '2750' : '4000';
  const choices = matching[0].itemConditions.filter(condition => condition?.conditionId === requiredId);
  if (choices.length !== 1 || choices[0].usage === 'RESTRICTED'
      || typeof choices[0].conditionDescription !== 'string'
      || !choices[0].conditionDescription.trim()
      || (choices[0].conditionDescriptors !== undefined && !Array.isArray(choices[0].conditionDescriptors))) fail();
  const descriptorIds = new Set((choices[0].conditionDescriptors ?? []).map(value => value?.conditionDescriptorId));
  const requiredDescriptors = isGraded ? ['27501', '27502'] : ['40001'];
  if (!requiredDescriptors.every(id => descriptorIds.has(id))) fail();
  if (!isGraded) {
    const conditionDescriptor = choices[0].conditionDescriptors.find(value => value.conditionDescriptorId === '40001');
    const offeredValues = new Set((conditionDescriptor?.conditionDescriptorValues ?? [])
      .map(value => value?.conditionDescriptorValueId));
    if (!cardCategories[categoryId].every(id => offeredValues.has(id))) fail();
  }
  return [{ ...structuredClone(choices[0]), inventoryCondition: cardConditions[requiredId], mappingSource }];
}
