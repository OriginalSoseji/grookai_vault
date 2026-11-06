import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifyTradingCardConditionChoices as qualify } from '../../backend/ebay/seller_condition_choices_v1.mjs';

const fixture = () => ({ categoryId: '100', categoryTreeId: '0', isGraded: false,
  response: { itemConditionPolicies: [{ categoryId: '100', categoryTreeId: '0',
    itemConditionRequired: true, itemConditions: [
      { conditionId: '2750', conditionDescription: 'Graded', conditionDescriptors: [] },
      { conditionId: '4000', conditionDescription: 'Ungraded', conditionDescriptors: [] },
    ] }] } });

test('eBay trading-card condition mapping retains its Ungraded label without inventing a physical grade', () => {
  const choices = qualify(fixture());
  assert.equal(choices.length, 1);
  assert.equal(choices[0].conditionId, '4000');
  assert.equal(choices[0].inventoryCondition, 'USED_VERY_GOOD');
  assert.equal(choices[0].conditionDescription, 'Ungraded');
  assert.equal('physicalCondition' in choices[0], false);
});
test('a graded owned copy uses the official Graded mapping and requires explicit descriptors later', () => {
  const input = fixture(); input.isGraded = true;
  const [choice] = qualify(input);
  assert.equal(choice.conditionId, '2750');
  assert.equal(choice.inventoryCondition, 'LIKE_NEW');
  assert.equal(choice.conditionDescription, 'Graded');
});
test('foreign category/tree, duplicate policies and restricted conditions cannot qualify', () => {
  for (const change of [v => { v.response.itemConditionPolicies[0].categoryId = 'other'; },
    v => { v.response.itemConditionPolicies[0].categoryTreeId = 'other'; },
    v => { v.response.itemConditionPolicies.push(structuredClone(v.response.itemConditionPolicies[0])); },
    v => { v.response.itemConditionPolicies[0].itemConditions[1].usage = 'RESTRICTED'; }]) {
    const value = fixture(); change(value);
    assert.throws(() => qualify(value), e => e.code === 'category_condition_policy_unavailable');
  }
});
test('missing Ungraded support and an unknown owned-copy grade state never fall back to New', () => {
  const value = fixture(); value.response.itemConditionPolicies[0].itemConditions = [{ conditionId: '1000', conditionDescription: 'New' }];
  assert.throws(() => qualify(value));
  const unknown = fixture(); unknown.isGraded = undefined;
  assert.throws(() => qualify(unknown));
});
