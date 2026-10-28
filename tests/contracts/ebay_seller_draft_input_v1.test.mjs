import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSellerDraftInput as validate } from '../../backend/ebay/seller_draft_input_v1.mjs';
const draft = () => ({ title: '', description: '', categoryId: '', priceCents: 0, locationKey: '',
  aspects: {}, policies: { fulfillment: '', payment: '', return: '' },
  condition: { conditionId: '', description: '', descriptors: [] } });
test('an incomplete recoverable draft saves without invented condition or policy values', () => {
  const value = draft();
  assert.deepEqual(validate(value), value);
});
test('malformed nested input cannot become a saved draft that crashes either client', () => {
  for (const change of [v => { v.priceCents = '12.34'; }, v => { v.condition.descriptors = [null]; },
    v => { v.condition = null; }, v => { v.policies = []; }, v => { v.aspects.Game = 'Pokemon'; },
    v => { v.title = 'x'.repeat(81); }, v => { v.condition.damagedDisclosureConfirmed = 'true'; }]) {
    const value = draft(); change(value);
    assert.throws(() => validate(value), e => e.code === 'seller_draft_input_invalid');
  }
});
test('saving retains only listing fields and cannot persist caller authority or private copy metadata', () => {
  const value = draft();
  value.ownerId = 'untrusted'; value.accessToken = 'private-fixture'; value.notes = 'private-note';
  assert.deepEqual(validate(value), draft());
});
