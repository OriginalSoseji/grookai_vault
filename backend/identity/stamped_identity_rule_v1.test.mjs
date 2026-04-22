import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STAMPED_IDENTITY_RULE_V1,
  STAMPED_IDENTITY_STATUS,
  classifyStampedUnderlyingBaseState,
  deriveStampedIdentity,
  stripStampedModifiersFromName,
} from './stamped_identity_rule_v1.mjs';

test('staff plus prerelease resolves to a deterministic stamped identity', () => {
  const result = deriveStampedIdentity({
    candidateName: 'Kyogre - SM129 (Prerelease) [Staff]',
    sourceExternalId: 'pokemon-sm-promos-kyogre-sm129-prerelease-staff-promo',
    sourceSetId: 'sm-promos-pokemon',
    underlyingBaseState: 'PROVEN',
  });

  assert.equal(result.rule, STAMPED_IDENTITY_RULE_V1);
  assert.equal(result.status, STAMPED_IDENTITY_STATUS.RESOLVED_STAMPED_IDENTITY);
  assert.equal(result.variant_key, 'staff_prerelease_stamp');
  assert.equal(result.stamp_label, 'Staff Prerelease Stamp');
  assert.equal(result.underlying_match_required, true);
});

test('finish-only phrases are not stamped identities', () => {
  const result = deriveStampedIdentity({
    candidateName: 'Luxio - BW34 (Cracked Ice Holo)',
    sourceExternalId: 'pokemon-black-and-white-promos-luxio-bw34-cracked-ice-holo-promo',
    sourceSetId: 'black-and-white-promos-pokemon',
    underlyingBaseState: 'PROVEN',
  });

  assert.equal(result.status, STAMPED_IDENTITY_STATUS.NOT_STAMPED_IDENTITY);
  assert.equal(result.variant_key, null);
});

test('generic prize pack family rows block instead of guessing a stamped label', () => {
  const result = deriveStampedIdentity({
    candidateName: 'Charizard VMAX',
    sourceExternalId: 'pokemon-prize-pack-series-cards-charizard-vmax-ultra-rare',
    sourceSetId: 'prize-pack-series-cards-pokemon',
    underlyingBaseState: 'PROVEN',
  });

  assert.equal(result.status, STAMPED_IDENTITY_STATUS.INSUFFICIENT_EVIDENCE);
  assert.equal(result.variant_key, null);
});

test('battle road trophy rows normalize to an event-specific variant key', () => {
  const result = deriveStampedIdentity({
    candidateName: 'Victory Cup - BW31 (Battle Road Spring 2012) [1st Place]',
    sourceExternalId: 'pokemon-black-and-white-promos-victory-cup-bw31-battle-road-spring-2012-1st-place-promo',
    sourceSetId: 'black-and-white-promos-pokemon',
    underlyingBaseState: 'PROVEN',
  });

  assert.equal(result.status, STAMPED_IDENTITY_STATUS.RESOLVED_STAMPED_IDENTITY);
  assert.equal(result.variant_key, 'battle_road_spring_2012_1st_place_stamp');
  assert.equal(result.stamp_label, 'Battle Road Spring 2012 1st Place Stamp');
});

test('battle academy deck-slot numbers do not affect mascot stamp normalization', () => {
  const result = deriveStampedIdentity({
    candidateName: 'Potion - 127/149 (#40 Pikachu Stamped)',
    sourceExternalId: 'pokemon-battle-academy-potion-127-149-40-pikachu-stamped-promo',
    sourceSetId: 'battle-academy-pokemon',
    underlyingBaseState: 'PROVEN',
  });

  assert.equal(result.status, STAMPED_IDENTITY_STATUS.RESOLVED_STAMPED_IDENTITY);
  assert.equal(result.variant_key, 'pikachu_stamp');
  assert.equal(result.stamp_label, 'Pikachu Stamp');
});

test('resolved stamped rows still block when the underlying base route is missing', () => {
  const result = deriveStampedIdentity({
    candidateName: 'Charizard - SM158 [Staff]',
    sourceExternalId: 'pokemon-sm-promos-charizard-sm158-staff-promo',
    sourceSetId: 'sm-promos-pokemon',
    underlyingBaseState: 'ROUTE_MISSING',
  });

  assert.equal(result.status, STAMPED_IDENTITY_STATUS.UNDERLYING_BASE_MISSING);
  assert.equal(result.variant_key, 'staff_stamp');
});

test('year-only professor program labels are not auto-promoted into stamped identity', () => {
  const result = deriveStampedIdentity({
    candidateName: 'Professor Birch (2006)',
    sourceExternalId: 'pokemon-professor-program-promos-professor-birch-2006-promo',
    sourceSetId: 'professor-program-promos-pokemon',
    underlyingBaseState: 'PROVEN',
  });

  assert.equal(result.status, STAMPED_IDENTITY_STATUS.NOT_STAMPED_IDENTITY);
});

test('audit blocking reasons map to deterministic underlying base states', () => {
  assert.equal(
    classifyStampedUnderlyingBaseState({
      blockingReason: 'same_set_base_match_exists_but_special_identity_row_is_missing',
      evidence: { set_hint: 'smp' },
    }),
    'PROVEN',
  );
  assert.equal(
    classifyStampedUnderlyingBaseState({
      blockingReason: 'unique_underlying_canon_match_supports_missing_special_identity',
      evidence: {},
    }),
    'ROUTE_MISSING',
  );
});

test('stamped modifiers strip away from the base name without mutating the base identity', () => {
  assert.equal(stripStampedModifiersFromName('Kyogre - SM129 (Prerelease) [Staff]'), 'Kyogre');
  assert.equal(stripStampedModifiersFromName('Victory Cup - BW31 (Battle Road Spring 2012) [1st Place]'), 'Victory Cup');
});
