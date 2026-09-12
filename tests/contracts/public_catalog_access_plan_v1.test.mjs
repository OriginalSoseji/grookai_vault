import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicCatalogAccessPlan } from '../../scripts/catalog/public_catalog_access_plan_v1.mjs';
const controls = ['mtg','one_piece'].map(game_code => ({ game_code, release_status: 'signed_in' }));
test('only existing signed-in MTG and One Piece controls are planned for public access', () => {
  const plan = buildPublicCatalogAccessPlan({ controls, setOverrides: [] });
  assert.equal(plan.mutations.length, 2);
  assert.equal(plan.mode, 'plan_only');
  assert.ok(plan.preserves.includes('pricing authorization'));
  assert.ok(plan.preserves.includes('ownership authorization'));
});
test('hidden/missing/duplicated catalogs cannot silently become public', () => {
  for (const rows of [[], [...controls, controls[0]], [{ ...controls[0], release_status: 'hidden' }, controls[1]]]) {
    assert.throws(() => buildPublicCatalogAccessPlan({ controls: rows, setOverrides: [] }));
  }
});
test('unexpected set overrides stop planning and hidden sets are preserved', () => {
  assert.throws(() => buildPublicCatalogAccessPlan({ controls, setOverrides: [{ game: 'one_piece', code: 'OP99', release_status: 'signed_in' }] }));
  assert.equal(buildPublicCatalogAccessPlan({ controls, setOverrides: [{ game: 'one_piece', code: 'OP99', release_status: 'hidden' }] }).mutations.length, 2);
});
test('an already-public catalog produces no repeat mutations', () => {
  assert.equal(buildPublicCatalogAccessPlan({ controls: controls.map(c => ({ ...c, release_status: 'public' })), setOverrides: [] }).mutations.length, 0);
});
