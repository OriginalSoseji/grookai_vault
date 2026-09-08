import test from 'node:test';
import assert from 'node:assert/strict';
import { isSealedPhotoPath, sealedPhotoPath, parseSealedCopy, parseSealedTotals, combineUsdTotal, sealedIdentity, verifySealedAddition } from './ownedSealedV1.ts';
const id = '11111111-1111-4111-8111-111111111111', variant = '22222222-2222-4222-8222-222222222222';
const fixture = () => ({ object_kind: 'sealed', instance_id: id, owner_id: id, sealed_product_variant_id: variant,
  gv_vi_id: 'GVVI-fixture', name: 'Box', package_form: 'booster_box', language_code: 'ja', section_ids: [],
  owned_market_price: null, reference_market_price: null, asking_price_amount: null });

test('revision paths bind owner, instance and side without losing legacy reads', () => {
  const path = sealedPhotoPath(id, variant, 'front', 'a'.repeat(32));
  assert.ok(isSealedPhotoPath(path, id, variant, 'front'));
  for (const value of [path + '/extra', path.replace('revisions', '..'), null, 'https://example.invalid/photo'])
    assert.equal(isSealedPhotoPath(value, id, variant, 'front'), false);
  assert.equal(isSealedPhotoPath(path, variant, variant, 'front'), false);
  assert.equal(isSealedPhotoPath(path, id, id, 'front'), false);
  assert.equal(isSealedPhotoPath(path, id, variant, 'back'), false);
  assert.ok(isSealedPhotoPath(`${id}/vault-instances/${variant}/front/current`, id, variant, 'front'));
  assert.throws(() => sealedPhotoPath(id, variant, 'front', '../current'));
});
test('typed identity preserves package and language without a fake card field', () => {
  const row = parseSealedCopy(fixture()); assert.match(sealedIdentity(row), /booster box - JA/); assert.equal(Object.hasOwn(row, 'card_print_id'), false);
  assert.throws(() => parseSealedCopy({ ...fixture(), object_kind: 'card' }));
  assert.throws(() => parseSealedCopy({ ...fixture(), owned_market_price: 'unknown' }));
});
test('mixed totals use minor units and never combine currencies or invent a zero price', () => {
  const totals = parseSealedTotals({ active_copy_count: 3, priced_copy_count: 2, unpriced_copy_count: 1, totals_by_currency: { USD: 0.2, EUR: 30 } });
  assert.equal(combineUsdTotal(0.1, totals), 0.3); assert.equal(combineUsdTotal(null, null), null);
  assert.equal(combineUsdTotal(10, null), 10);
  assert.equal(combineUsdTotal(null, { ...totals, totals_by_currency: { EUR: 30 } }), null);
  assert.throws(() => parseSealedTotals({ ...totals, active_copy_count: 2 }));
});
test('add verifies every exact copy and variant', async () => {
  await verifySealedAddition(async () => [fixture()], { instance_ids: [id], created_count: 1 }, variant, 1);
  await assert.rejects(verifySealedAddition(async () => [], { instance_ids: [id], created_count: 1 }, variant, 1));
  await assert.rejects(verifySealedAddition(async () => [fixture()], { instance_ids: [id], created_count: 1 }, id, 1));
  await assert.rejects(verifySealedAddition(async () => [fixture(), fixture()], { instance_ids: [id, id], created_count: 2 }, variant, 2));
});
