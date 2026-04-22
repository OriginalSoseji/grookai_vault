import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PERFECT_ORDER_VARIANT_IDENTITY_FIXTURES,
  PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1,
  PERFECT_ORDER_VARIANT_IDENTITY_SET_ID,
  derivePerfectOrderVariantIdentity,
  validatePerfectOrderVariantIdentityForPromotion,
} from './perfect_order_variant_identity_rule_v1.mjs';

function normalizeNameKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function buildCreateIdentityPayload(fixture, variantIdentity) {
  return {
    set_id: PERFECT_ORDER_VARIANT_IDENTITY_SET_ID,
    name: fixture.name,
    number_plain: fixture.number_plain,
    variant_key: variantIdentity?.variant_key ?? null,
    illustration_category: variantIdentity?.illustration_category ?? null,
  };
}

for (const fixture of PERFECT_ORDER_VARIANT_IDENTITY_FIXTURES) {
  test(`${fixture.name} ${fixture.number_plain} keeps two distinct canonical candidates`, () => {
    const [left, right] = fixture.rows.map((row) =>
      derivePerfectOrderVariantIdentity({
        sourceSetId: PERFECT_ORDER_VARIANT_IDENTITY_SET_ID,
        numberPlain: fixture.number_plain,
        normalizedNameKey: normalizeNameKey(fixture.name),
        rawRarity: row.raw_rarity,
        upstreamId: row.upstream_id,
      }),
    );

    assert.ok(left?.applies);
    assert.ok(right?.applies);
    assert.equal(left?.rule, PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1);
    assert.equal(right?.rule, PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1);
    assert.equal(left?.status, 'RESOLVED_BY_VARIANT_KEY');
    assert.equal(right?.status, 'RESOLVED_BY_VARIANT_KEY');
    assert.equal(left?.collision_group_key, right?.collision_group_key);
    assert.notEqual(left?.variant_key, right?.variant_key);
    assert.equal(left?.illustration_category, fixture.rows[0].raw_rarity);
    assert.equal(right?.illustration_category, fixture.rows[1].raw_rarity);
    assert.equal(validatePerfectOrderVariantIdentityForPromotion(left, left?.variant_key ?? null).ok, true);
    assert.equal(validatePerfectOrderVariantIdentityForPromotion(right, right?.variant_key ?? null).ok, true);

    const leftPayload = buildCreateIdentityPayload(fixture, left);
    const rightPayload = buildCreateIdentityPayload(fixture, right);
    assert.equal(leftPayload.name, rightPayload.name);
    assert.equal(leftPayload.number_plain, rightPayload.number_plain);
    assert.notEqual(leftPayload.variant_key, rightPayload.variant_key);
    assert.notEqual(leftPayload.illustration_category, rightPayload.illustration_category);

    const leftIdentity = `${PERFECT_ORDER_VARIANT_IDENTITY_SET_ID}::${fixture.number_plain}::${left?.variant_key}`;
    const rightIdentity = `${PERFECT_ORDER_VARIANT_IDENTITY_SET_ID}::${fixture.number_plain}::${right?.variant_key}`;
    assert.notEqual(leftIdentity, rightIdentity);
  });
}

test('missing variant key blocks promotion for collision-resolved Perfect Order rows', () => {
  const variantIdentity = derivePerfectOrderVariantIdentity({
    sourceSetId: PERFECT_ORDER_VARIANT_IDENTITY_SET_ID,
    numberPlain: '89',
    normalizedNameKey: 'spewpa',
    rawRarity: 'Illustration Rare',
    upstreamId: 'spewpa-089-088-illustration-rare',
  });

  const blocked = validatePerfectOrderVariantIdentityForPromotion(variantIdentity, '');
  assert.equal(blocked.ok, false);
  assert.deepEqual(blocked.missing_requirements, ['variant_key']);
});

test('unsupported Perfect Order collision label blocks instead of guessing', () => {
  const variantIdentity = derivePerfectOrderVariantIdentity({
    sourceSetId: PERFECT_ORDER_VARIANT_IDENTITY_SET_ID,
    numberPlain: '89',
    normalizedNameKey: 'spewpa',
    rawRarity: 'Secret Rare',
    upstreamId: 'spewpa-089-088-secret-rare',
  });

  assert.ok(variantIdentity?.applies);
  assert.equal(variantIdentity?.status, 'BLOCKED_UNLABELED_COLLISION');

  const blocked = validatePerfectOrderVariantIdentityForPromotion(variantIdentity, null);
  assert.equal(blocked.ok, false);
  assert.deepEqual(blocked.missing_requirements, ['deterministic variant_key', 'illustration_category']);
});

test('non-Perfect-Order collision groups do not trigger Perfect Order promotion guard', () => {
  const stampedVariantIdentity = {
    rule: 'STAMPED_IDENTITY_RULE_V1',
    status: 'RESOLVED_STAMPED_IDENTITY',
    collision_group_key: 'bwp::Arcanine::12/99::prerelease_stamp',
    variant_key: 'prerelease_stamp',
    illustration_category: null,
    source_evidence: {
      source_set_id: 'black-and-white-promos-pokemon',
      upstream_id: 'pokemon-black-and-white-promos-arcanine-12-99-prerelease-promo',
    },
  };

  const result = validatePerfectOrderVariantIdentityForPromotion(
    stampedVariantIdentity,
    stampedVariantIdentity.variant_key,
  );

  assert.equal(result.ok, true);
  assert.equal(result.reason, null);
  assert.deepEqual(result.missing_requirements, []);
});
