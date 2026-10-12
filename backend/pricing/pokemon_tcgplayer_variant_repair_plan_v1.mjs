import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const POKEMON_TCGPLAYER_VARIANT_REPAIR_PLAN_V1 =
  'POKEMON_TCGPLAYER_VARIANT_REPAIR_PLAN_V1';

const sha256 = value => createHash('sha256')
  .update(JSON.stringify(value)).digest('hex');

export function pokemonTcgplayerVariantRepairFingerprintV1({ evidence, plan }) {
  return sha256({ evidence, plan });
}

export function assertPokemonTcgplayerVariantRepairPlanV1(authority) {
  assert.equal(authority?.version, POKEMON_TCGPLAYER_VARIANT_REPAIR_PLAN_V1);
  assert.equal(authority.status, 'reviewed_plan_only');
  assert.equal(authority.execution_authorized, false);
  assert.equal(authority.database_writes, 0);
  assert.equal(authority.pricing_publication_writes, 0);

  const expectedEvidence = [
    {
      path: 'docs/audits/pricing/pokemon_tcgplayer_identity_repair_20261012/batch_01/authority/gym2/manifest.json',
      sha256: '417e0991d1c7fb83ad78cec665f69a300d26cfb04b3dfd8f9c75592853a02b33',
    },
    {
      path: 'docs/audits/english_master_index_publishable_v1/sets/gym2/printings.json',
      sha256: '9c6b3a79441525fd748f2719cec0840720e126d8d7b6c938fca8abf645bb7393',
    },
    {
      path: 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg10bb_first_edition_parent_identity_bulk_real_apply_v1.json',
      sha256: 'f645b7912cc6e50ffd63ceda64b0f672911091696c3b403e51dbdea28bd06af6',
      use: 'historical lineage only; it is not authority to resurrect deleted rows',
    },
    {
      path: 'docs/audits/pricing/pokemon_tcgplayer_identity_repair_20261012/batch_01/authority/mep/manifest.json',
      sha256: '878092b02bd1db4db702d918228cc6ca5007ca664f5058c7a55888fede9d6d40',
    },
    {
      path: 'docs/audits/pricing/pokemon_tcgplayer_variant_repair_20261012/batch_02/reviewed_mep_source_rows.json',
      sha256: 'd8dc9e34c3a40b5c36d631069b95b28ef6830c14287fd57de675a34f05703b68',
    },
    {
      path: 'docs/audits/english_master_index_publishable_v1/sets/mep/printings.json',
      sha256: '4154a8907928b41850b3f74bfa2eb12acb7607fc1217f432dd2c1851ab65e31b',
    },
    {
      path: 'artifacts/pokemon_tcgplayer_identity_repair_20261012/batch_01/next_variant_structure_readonly.json',
      sha256: 'a6bb2ca0b31aa805a7cb31b6188c2545ea03f2b194b1b15c9282e9c5eb1c607b',
      use: 'verified-TLS production read-only snapshot; intentionally untracked operator evidence',
    },
  ];
  assert.deepEqual(authority.evidence, expectedEvidence);

  const plan = authority.plan;
  assert.ok(plan && typeof plan === 'object');
  assert.equal(authority.plan_fingerprint,
    pokemonTcgplayerVariantRepairFingerprintV1({
      evidence: authority.evidence,
      plan,
    }));

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
    [654596, {
      card_number: '002',
      card_print_id: '95dca2c2-c3e7-43b4-bc02-227fddc4910d',
      card_printing_id: '42918a6d-7aeb-42fe-9163-9489ea3070c5',
      printing_gv_id: 'GV-PK-MEP-002-HOLO',
      source_candidate_fingerprint:
        'd1509f19057ae377d983ea6640fd02e47487deea1732278179aadcf248a54b59',
      reviewed_source_product_sha256:
        '65988cf3a595e676cc5ac8417d261f93330742ac1a612c4f155e3eec1d42457d',
      mapping_gap_observation_id: '9360612f-a90c-4236-a5b9-29de21a8b875',
      source_observation_id: '2664dc1d-4e03-43cb-8346-0ca5f10c4b19',
      source_row_hash: '805ec6c5626b16379810d29c22f426f994c90f580e8b9f63997c9d15aa8140a0',
    }],
    [654598, {
      card_number: '004',
      card_print_id: 'cddc521f-ebbe-4460-85d5-d78278672f95',
      card_printing_id: '6f650737-4528-4b75-9b85-3037ce800dc2',
      printing_gv_id: 'GV-PK-MEP-004-HOLO',
      source_candidate_fingerprint:
        '790628b1719919a066b06fca06b9d7e5b90f015843f1fca05914663ba535f2ce',
      reviewed_source_product_sha256:
        'da3644e729758eb2cb8e978b83bd8e4b315823ed4791725a0d5ba772ac814f73',
      mapping_gap_observation_id: '47ff952e-ee35-445e-98bd-adb69949c42a',
      source_observation_id: 'e626cae7-60cf-4f41-a30f-531ccb3f3432',
      source_row_hash: '7e71d9924a5d2fe4ad97f84430070b723270e487deb64af2861442ee72c98207',
    }],
  ]);
  for (const row of mep.rows) {
    const expected = expectedMep.get(row.source_product_id);
    assert.ok(expected, `unexpected MEP row ${row.source_product_id}`);
    assert.equal(row.source_subtype_name, 'Normal');
    assert.equal(row.source_normalized_finish_key, 'normal');
    assert.equal(row.assigned_finish_key, 'holo');
    assert.equal(row.card_number, expected.card_number);
    assert.equal(row.card_print_id, expected.card_print_id);
    assert.equal(row.card_printing_id, expected.card_printing_id);
    assert.equal(row.printing_gv_id, expected.printing_gv_id);
    assert.equal(row.reviewed_source_products_payload_sha256,
      '0d15963655e06bddfba508af38ac21f64a0bfd0cec20011cb09e72d3d8ffb957');
    assert.equal(row.reviewed_source_product_sha256,
      expected.reviewed_source_product_sha256);
    assert.equal(row.source_candidate_fingerprint,
      expected.source_candidate_fingerprint);
    assert.equal(row.mapping_gap_observation_id,
      expected.mapping_gap_observation_id);
    assert.equal(row.source_observation_id, expected.source_observation_id);
    assert.equal(row.source_sync_run_id,
      'e429784c-55f2-4922-94dc-0cc560acda8d');
    assert.equal(row.source_artifact_id,
      '2d2e6471-7b21-4748-b843-f6a70821039c');
    assert.equal(row.source_artifact_hash,
      '368ce87a576166ae265ddecaa1289ed4f0bd233523c3a717ae2a626721a62697');
    assert.equal(row.source_price_row_identity,
      `tcgplayer:${row.source_product_id}:normal`);
    assert.equal(row.source_row_hash, expected.source_row_hash);
    assert.equal(row.source_observed_on, '2026-10-12T06:00:00.000Z');
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
