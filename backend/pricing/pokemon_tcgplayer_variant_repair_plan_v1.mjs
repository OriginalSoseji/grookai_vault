import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const POKEMON_TCGPLAYER_VARIANT_REPAIR_PLAN_V1 =
  'POKEMON_TCGPLAYER_VARIANT_REPAIR_PLAN_V1';

const sha256 = value => createHash('sha256')
  .update(JSON.stringify(value)).digest('hex');

export function pokemonTcgplayerVariantRepairFingerprintV1(plan) {
  return sha256(plan);
}

export function assertPokemonTcgplayerVariantRepairPlanV1(authority) {
  assert.equal(authority?.version, POKEMON_TCGPLAYER_VARIANT_REPAIR_PLAN_V1);
  assert.equal(authority.status, 'reviewed_plan_only');
  assert.equal(authority.execution_authorized, false);
  assert.equal(authority.database_writes, 0);
  assert.equal(authority.pricing_publication_writes, 0);

  const plan = authority.plan;
  assert.ok(plan && typeof plan === 'object');
  assert.equal(authority.plan_fingerprint,
    pokemonTcgplayerVariantRepairFingerprintV1(plan));

  const gym = plan.gym_challenge_edition_identity;
  assert.equal(gym.operation, 'create_exact_edition_identities_then_bind_current_observations');
  assert.equal(gym.set_code, 'gym2');
  assert.equal(gym.set_id, 'bb258610-a859-4f71-b54a-21a8591a5fad');
  assert.equal(gym.source_group_id, 1440);
  assert.deepEqual(gym.write_scope, {
    card_prints: 4,
    card_print_identities: 4,
    card_printings: 4,
    source_binding_templates: 4,
    price_publications: 0,
  });
  assert.equal(gym.rows.length, 4);
  const expectedGym = new Map([
    ['85720:1st Edition', ['75', 'first_edition', 'GV-PK-G2-75-FIRST-EDITION']],
    ['85720:Unlimited', ['75', 'unlimited', 'GV-PK-G2-75-UNLIMITED']],
    ['85721:1st Edition', ['76', 'first_edition', 'GV-PK-G2-76-FIRST-EDITION']],
    ['85721:Unlimited', ['76', 'unlimited', 'GV-PK-G2-76-UNLIMITED']],
  ]);
  for (const row of gym.rows) {
    const key = `${row.source_product_id}:${row.source_subtype_name}`;
    const expected = expectedGym.get(key);
    assert.ok(expected, `unexpected Gym row ${key}`);
    assert.equal(row.card_number, expected[0]);
    assert.equal(row.edition, expected[1]);
    assert.equal(row.gv_id, expected[2]);
    assert.equal(row.printed_identity_modifier, `edition:${expected[1]}`);
    assert.equal(row.finish_key, 'normal');
    assert.equal(row.printing_gv_id, `${expected[2]}-NORMAL`);
    assert.equal(row.card_print_id, null);
    assert.equal(row.card_printing_id, null);
    assert.equal(row.allocation_required, true);
    expectedGym.delete(key);
  }
  assert.equal(expectedGym.size, 0);

  const mep = plan.mega_evolution_promo_finish_override;
  assert.equal(mep.operation, 'append_exact_reviewed_finish_override_assignments');
  assert.equal(mep.set_code, 'mep');
  assert.equal(mep.set_id, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf');
  assert.equal(mep.source_group_id, 24451);
  assert.deepEqual(mep.write_scope, {
    append_only_variant_assignments_per_current_run: 2,
    catalog_rows: 0,
    mapping_rows: 0,
    price_publications: 0,
  });
  assert.equal(mep.rows.length, 2);
  const expectedMep = new Map([
    [654596, ['002', '95dca2c2-c3e7-43b4-bc02-227fddc4910d',
      '42918a6d-7aeb-42fe-9163-9489ea3070c5', 'GV-PK-MEP-002-HOLO']],
    [654598, ['004', 'cddc521f-ebbe-4460-85d5-d78278672f95',
      '6f650737-4528-4b75-9b85-3037ce800dc2', 'GV-PK-MEP-004-HOLO']],
  ]);
  for (const row of mep.rows) {
    const expected = expectedMep.get(row.source_product_id);
    assert.ok(expected, `unexpected MEP row ${row.source_product_id}`);
    assert.equal(row.source_subtype_name, 'Normal');
    assert.equal(row.source_normalized_finish_key, 'normal');
    assert.equal(row.assigned_finish_key, 'holo');
    assert.equal(row.card_number, expected[0]);
    assert.equal(row.card_print_id, expected[1]);
    assert.equal(row.card_printing_id, expected[2]);
    assert.equal(row.printing_gv_id, expected[3]);
    assert.equal(row.create_normal_child, false);
    expectedMep.delete(row.source_product_id);
  }
  assert.equal(expectedMep.size, 0);

  assert.deepEqual(plan.sequence, [
    'gym_catalog_identity_dry_run',
    'gym_runtime_binding_dry_run',
    'mep_finish_override_schema_rehearsal',
    'combined_read_only_pricing_evaluation',
    'separate_explicit_approval_before_any_production_write',
  ]);
  assert.deepEqual(plan.boundaries, {
    invent_normal_mep_children: false,
    reuse_deleted_gym_rows_without_review: false,
    infer_edition_from_generic_mapping: false,
    publish_prices: false,
    mutate_customer_state: false,
  });
  return {
    status: 'verified_plan_only',
    plan_fingerprint: authority.plan_fingerprint,
    gym_rows: gym.rows.length,
    mep_rows: mep.rows.length,
    covered_price_observations: gym.rows.length + mep.rows.length,
    execution_authorized: false,
  };
}
