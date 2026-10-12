import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { deterministicUuidV5, stableJson } from
  './one_piece_canonical_import_staging_v1.mjs';
import { assertPokemonTcgplayerVariantRepairPlanV1 } from
  './pokemon_tcgplayer_variant_repair_plan_v1.mjs';

export const POKEMON_TCGPLAYER_VARIANT_REPAIR_REHEARSAL_V1 =
  'POKEMON_TCGPLAYER_VARIANT_REPAIR_REHEARSAL_V1';
export const MEP_REVIEWED_FINISH_OVERRIDE_V1 =
  'MEE_TCGPLAYER_REVIEWED_FINISH_OVERRIDE_V1';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);
const byKey = rows => [...rows].sort((a, b) =>
  `${a.product_id ?? a.source_product_id}:${a.subtype_name ?? a.source_subtype_name}`
    .localeCompare(`${b.product_id ?? b.source_product_id}:${b.subtype_name ?? b.source_subtype_name}`));

const GYM_OBSERVATIONS = new Map([
  ['85720:1st Edition', {
    source_observation_id: 'd24b4d1e-a73f-4a44-984d-cc94e1f05f28',
    payload_hash: '54428d2fa2aeb3f0140d3297bd2a6ad1f2347b9b81e305c96c26f117a2b5fa71',
    market_price: '2.73',
  }],
  ['85720:Unlimited', {
    source_observation_id: 'b208701e-5378-4a72-915f-403db492e011',
    payload_hash: '39c210469441c8222090c823b30749d0ac79574788b79fe477e8c46e33d1defe',
    market_price: '1.16',
  }],
  ['85721:1st Edition', {
    source_observation_id: 'ce7b33ab-299d-4ee3-914b-161100ab1aa6',
    payload_hash: 'b0831080d3cb31ea7a271f731edd102b2236f2eb8848b638e45144e7a59a6598',
    market_price: '3.98',
  }],
  ['85721:Unlimited', {
    source_observation_id: '6febacee-1bcd-4592-aedf-f478a7a94d97',
    payload_hash: 'f62a49c7d5a69efd1bb4c634438779ecaa92a0a82e6c95b689f56fe33361f80a',
    market_price: '1.36',
  }],
]);
const GYM_PRODUCT_HASHES = new Map([
  [85720, 'f9a6fefadabb32a1ba9cb5b357fa73603f58ce2444fb074d6878fa63df2f8589'],
  [85721, 'f4ce84f6a2a327a11c1bcd223601e5681770d154aa2e51574ec47c67cfdf7511'],
]);
const HISTORICAL_GYM_IDS = [
  '03208d73-8206-4780-aa45-c3735677cf99',
  '47425cf5-146f-41e0-a770-e37c761ce1ef',
  '895970ba-ed4c-4d00-91ce-db650563e126',
  'a8c17fda-b5a7-46ab-a7c9-32284dfec54f',
];

function rehearsalId(planFingerprint, kind, key) {
  return deterministicUuidV5(
    `${POKEMON_TCGPLAYER_VARIANT_REPAIR_REHEARSAL_V1}:${planFingerprint}:${kind}:${key}`,
  );
}

function exactRow(rows, predicate, label) {
  const matches = rows.filter(predicate);
  assert.equal(matches.length, 1, `${label} drift`);
  return matches[0];
}

function assertSnapshot(authority, snapshot) {
  assert.equal(snapshot?.read_only, true);
  assert.equal(snapshot.version, 'POKEMON_TCGPLAYER_VARIANT_STRUCTURE_READONLY_V1');
  assert.equal(snapshot.gym_existing_links.length, 0, 'Gym edition links now exist; refresh plan');
  assert.equal(snapshot.current_observations.length, 6, 'held observation scope drift');

  const gym = authority.plan.gym_challenge_edition_identity;
  for (const row of gym.rows) {
    const key = `${row.source_product_id}:${row.source_subtype_name}`;
    const expected = GYM_OBSERVATIONS.get(key);
    assert.ok(expected, `unexpected Gym observation ${key}`);
    const observation = exactRow(snapshot.current_observations,
      item => item.product_id === row.source_product_id &&
        item.subtype_name === row.source_subtype_name, key);
    assert.deepEqual(observation, {
      source_observation_id: expected.source_observation_id,
      product_id: row.source_product_id,
      group_id: gym.source_group_id,
      subtype_name: row.source_subtype_name,
      market_price: expected.market_price,
      payload_hash: expected.payload_hash,
      last_seen_run_id: 'e429784c-55f2-4922-94dc-0cc560acda8d',
    });
    const parent = exactRow(snapshot.gym_parents_and_children,
      item => item.number === row.card_number, `Gym parent ${row.card_number}`);
    assert.equal(parent.name, row.card_name);
    assert.equal(parent.set_code, gym.set_code);
    assert.equal(parent.variant_key, '');
    assert.equal(parent.printed_identity_modifier, null);
    assert.equal(parent.finish_key, 'normal');
    const identity = exactRow(snapshot.gym_active_identities,
      item => item.card_print_id === parent.card_print_id,
      `Gym active identity ${row.card_number}`);
    assert.equal(identity.identity_domain, 'pokemon_eng_standard');
    assert.equal(identity.identity_key_version, 'pokemon_eng_standard:v1');
    assert.equal(identity.is_active, true);
    const mapping = exactRow(snapshot.gym_mappings,
      item => Number(item.mapping?.external_id) === row.source_product_id,
      `Gym mapping ${row.source_product_id}`).mapping;
    assert.equal(mapping.active, true);
    assert.equal(mapping.card_print_id, parent.card_print_id);
  }

  const mep = authority.plan.mega_evolution_promo_finish_override;
  for (const row of mep.rows) {
    const target = exactRow(snapshot.mep_targets,
      item => item.card_print_id === row.card_print_id,
      `MEP target ${row.source_product_id}`);
    for (const field of ['gv_id', 'card_printing_id', 'printing_gv_id', 'finish_key']) {
      const planned = field === 'finish_key' ? row.assigned_finish_key : row[field];
      assert.equal(target[field], planned, `MEP target drift ${row.source_product_id}:${field}`);
    }
    assert.deepEqual(target.active_reviews, []);
    const observation = exactRow(snapshot.current_observations,
      item => item.source_observation_id === row.source_observation_id,
      `MEP observation ${row.source_product_id}`);
    assert.deepEqual(observation, {
      source_observation_id: row.source_observation_id,
      product_id: row.source_product_id,
      group_id: mep.source_group_id,
      subtype_name: row.source_subtype_name,
      market_price: row.source_product_id === 654596 ? '12.21' : '18.2',
      payload_hash: row.source_row_hash,
      last_seen_run_id: row.source_sync_run_id,
    });
  }
}

export function buildPokemonTcgplayerVariantRepairRehearsalV1({
  authority,
  snapshot,
  snapshotSha256,
  gymProducts,
  historicalGymIds,
}) {
  const verified = assertPokemonTcgplayerVariantRepairPlanV1(authority);
  assert.match(snapshotSha256, /^[a-f0-9]{64}$/);
  const snapshotEvidence = authority.evidence.find(row =>
    row.path.endsWith('next_variant_structure_readonly.json'));
  assert.equal(snapshotSha256, snapshotEvidence.sha256, 'production snapshot hash drift');
  assertSnapshot(authority, snapshot);
  assert.equal(gymProducts?.source_payload_sha256,
    'f2a97bb05a14091116a78d469b9282abbc58aa024a537d47391983312e3cdc59');
  assert.equal(gymProducts.rows.length, 2);
  assert.ok(Array.isArray(historicalGymIds) && historicalGymIds.length === 4);
  assert.deepEqual([...historicalGymIds].sort(), HISTORICAL_GYM_IDS);

  const currentIds = new Set([
    ...snapshot.gym_parents_and_children.flatMap(row =>
      [row.card_print_id, row.card_printing_id]),
    ...snapshot.gym_active_identities.map(row => row.identity_id),
    ...snapshot.mep_targets.flatMap(row => [row.card_print_id, row.card_printing_id]),
  ]);

  const gymPlan = authority.plan.gym_challenge_edition_identity;
  const gymRows = [];
  for (const planned of gymPlan.rows) {
    const key = `${planned.source_product_id}:${planned.source_subtype_name}`;
    const base = exactRow(snapshot.gym_parents_and_children,
      row => row.number === planned.card_number, `base Gym parent ${planned.card_number}`);
    const observation = exactRow(snapshot.current_observations,
      row => row.product_id === planned.source_product_id &&
        row.subtype_name === planned.source_subtype_name, `Gym observation ${key}`);
    const product = exactRow(gymProducts.rows,
      row => row.product_id === planned.source_product_id,
      `Gym source product ${planned.source_product_id}`);
    assert.equal(product.product_sha256, GYM_PRODUCT_HASHES.get(planned.source_product_id),
      `Gym source product drift ${planned.source_product_id}`);
    const cardPrintId = rehearsalId(authority.plan_fingerprint, 'card_print', key);
    const identityId = rehearsalId(authority.plan_fingerprint, 'card_print_identity', key);
    const cardPrintingId = rehearsalId(authority.plan_fingerprint, 'card_printing', key);
    const bindingId = rehearsalId(authority.plan_fingerprint, 'source_binding', key);
    for (const id of [cardPrintId, identityId, cardPrintingId, bindingId]) {
      assert.ok(!historicalGymIds.includes(id), `historical Gym ID reuse ${id}`);
      assert.ok(!currentIds.has(id), `current canonical ID collision ${id}`);
    }
    const identityPayload = {
      printed_total: 132,
      printed_set_abbrev: 'G2',
      variant_key_current: planned.printed_identity_modifier,
    };
    gymRows.push({
      key,
      source_observation: clone(observation),
      card_print: {
        id: cardPrintId,
        set_id: gymPlan.set_id,
        set_code: gymPlan.set_code,
        name: planned.card_name,
        number: planned.card_number,
        number_plain: planned.card_number,
        gv_id: planned.gv_id,
        variant_key: '',
        printed_identity_modifier: planned.printed_identity_modifier,
        identity_domain: 'pokemon_eng_standard',
        set_identity_model: 'standard',
        external_ids: {},
        image_status: 'missing',
      },
      card_print_identity: {
        id: identityId,
        card_print_id: cardPrintId,
        identity_domain: 'pokemon_eng_standard',
        set_code_identity: gymPlan.set_code,
        printed_number: planned.card_number,
        normalized_printed_name: planned.card_name.toLowerCase(),
        source_name_raw: planned.card_name,
        identity_payload: identityPayload,
        identity_key_version: 'pokemon_eng_standard:v1',
        identity_key_hash: null,
        identity_hash_function: 'public.card_print_identity_hash_v1',
        is_active: true,
      },
      card_printing: {
        id: cardPrintingId,
        card_print_id: cardPrintId,
        finish_key: planned.finish_key,
        printing_gv_id: planned.printing_gv_id,
        is_provisional: false,
        provenance_source: POKEMON_TCGPLAYER_VARIANT_REPAIR_REHEARSAL_V1,
        provenance_ref: `plan:${authority.plan_fingerprint}`,
        created_by: POKEMON_TCGPLAYER_VARIANT_REPAIR_REHEARSAL_V1,
      },
      source_binding_template: {
        id: bindingId,
        contract_version: 'TCGPLAYER_EXACT_EDITION_BINDING_TEMPLATE_V1',
        state: 'staged',
        source: 'tcgplayer',
        category_id: 3,
        group_id: gymPlan.source_group_id,
        product_id: planned.source_product_id,
        source_subtype: planned.source_subtype_name,
        source_product_payload_sha256: gymProducts.source_payload_sha256,
        source_product_sha256: product.product_sha256,
        source_observation_id: observation.source_observation_id,
        source_price_row_hash: observation.payload_hash,
        source_sync_run_id: observation.last_seen_run_id,
        card_print_id: cardPrintId,
        card_printing_id: cardPrintingId,
        assigned_edition: planned.edition,
        assigned_finish_key: planned.finish_key,
        publishable: false,
        app_visible: false,
        market_truth: false,
      },
    });
  }

  const mepRows = authority.plan.mega_evolution_promo_finish_override.rows.map(planned => ({
    id: rehearsalId(authority.plan_fingerprint, 'mep_assignment',
      `${planned.source_product_id}:${planned.source_observation_id}`),
    contract_version: 'MARKET_EVIDENCE_VARIANT_ASSIGNMENT_V1',
    source_family: 'tcgcsv_market_close',
    source_table: 'tcgcsv_source_price_daily_observations',
    source_row_id: planned.source_observation_id,
    observation_id: planned.source_observation_id,
    raw_snapshot_id: planned.source_artifact_id,
    card_print_id: planned.card_print_id,
    gv_id: planned.gv_id,
    card_printing_id: planned.card_printing_id,
    printing_gv_id: planned.printing_gv_id,
    source_finish_hint: planned.source_subtype_name,
    normalized_finish_key: planned.source_normalized_finish_key,
    assigned_finish_key: planned.assigned_finish_key,
    variant_assignment_status: 'exact_child_finish',
    variant_assignment_confidence: '1.0000',
    variant_assignment_version: MEP_REVIEWED_FINISH_OVERRIDE_V1,
    variant_assignment_reason:
      'exact reviewed TCGPlayer product and price lineage assigns source Normal to the existing canonical holo child',
    variant_assignment_flags: ['reviewed_source_finish_override'],
    assignment_payload: {
      source_product_id: planned.source_product_id,
      source_subtype_name: planned.source_subtype_name,
      source_product_sha256: planned.reviewed_source_product_sha256,
      reviewed_source_products_payload_sha256:
        planned.reviewed_source_products_payload_sha256,
      source_candidate_fingerprint: planned.source_candidate_fingerprint,
      mapping_gap_observation_id: planned.mapping_gap_observation_id,
      source_sync_run_id: planned.source_sync_run_id,
      source_artifact_id: planned.source_artifact_id,
      source_artifact_hash: planned.source_artifact_hash,
      source_price_row_identity: planned.source_price_row_identity,
      source_row_hash: planned.source_row_hash,
      source_observed_on: planned.source_observed_on,
      authority_plan_fingerprint: authority.plan_fingerprint,
    },
    needs_review: false,
    publishable: false,
    app_visible: false,
    market_truth: false,
  }));

  const priceEvaluation = [
    ...gymRows.map(row => ({
      source_observation_id: row.source_observation.source_observation_id,
      source_product_id: row.source_observation.product_id,
      source_subtype_name: row.source_observation.subtype_name,
      market_price_usd: row.source_observation.market_price,
      target_card_printing_id: row.card_printing.id,
      target_printing_gv_id: row.card_printing.printing_gv_id,
      resolution: 'exact_edition_binding_rehearsed',
      publish_ready_after_schema_rehearsal: true,
    })),
    ...authority.plan.mega_evolution_promo_finish_override.rows.map(row => ({
      source_observation_id: row.source_observation_id,
      source_product_id: row.source_product_id,
      source_subtype_name: row.source_subtype_name,
      market_price_usd: row.source_product_id === 654596 ? '12.21' : '18.2',
      target_card_printing_id: row.card_printing_id,
      target_printing_gv_id: row.printing_gv_id,
      resolution: 'reviewed_finish_override_rehearsed',
      publish_ready_after_schema_rehearsal: true,
    })),
  ];

  const result = {
    version: POKEMON_TCGPLAYER_VARIANT_REPAIR_REHEARSAL_V1,
    status: 'local_rehearsal_plan_ready',
    execution_authorized: false,
    production_database_writes: 0,
    pricing_publication_writes: 0,
    authority_plan_fingerprint: verified.plan_fingerprint,
    evidence: {
      production_snapshot_sha256: snapshotSha256,
      gym_source_products_sha256: gymProducts.source_payload_sha256,
      historical_gym_ids_forbidden: [...historicalGymIds].sort(),
    },
    snapshot_extract: {
      version: snapshot.version,
      read_only: snapshot.read_only,
      gym_parents_and_children: clone(snapshot.gym_parents_and_children),
      gym_active_identities: clone(snapshot.gym_active_identities),
      gym_existing_links: clone(snapshot.gym_existing_links),
      gym_mappings: clone(snapshot.gym_mappings),
      mep_targets: clone(snapshot.mep_targets),
      current_observations: byKey(snapshot.current_observations),
    },
    local_rollback_write_scope: {
      card_prints: gymRows.length,
      card_print_identity: gymRows.length,
      card_printings: gymRows.length,
      gym_source_binding_templates: gymRows.length,
      market_evidence_variant_assignments: mepRows.length,
      price_publications: 0,
      customer_state_writes: 0,
    },
    gym_rows: gymRows,
    mep_assignment_rows: mepRows,
    combined_read_only_price_evaluation: byKey(priceEvaluation),
    remaining_gate: 'local_schema_rollback_rehearsal',
  };
  result.rehearsal_fingerprint = sha256(stableJson(result));
  return result;
}

export function assertPokemonTcgplayerVariantRepairRehearsalV1(result) {
  assert.equal(result?.version, POKEMON_TCGPLAYER_VARIANT_REPAIR_REHEARSAL_V1);
  assert.equal(result.status, 'local_rehearsal_plan_ready');
  assert.equal(result.execution_authorized, false);
  assert.equal(result.production_database_writes, 0);
  assert.equal(result.pricing_publication_writes, 0);
  assert.deepEqual(result.local_rollback_write_scope, {
    card_prints: 4,
    card_print_identity: 4,
    card_printings: 4,
    gym_source_binding_templates: 4,
    market_evidence_variant_assignments: 2,
    price_publications: 0,
    customer_state_writes: 0,
  });
  assert.equal(result.gym_rows.length, 4);
  assert.equal(result.mep_assignment_rows.length, 2);
  assert.equal(result.combined_read_only_price_evaluation.length, 6);
  assert.ok(result.combined_read_only_price_evaluation.every(row =>
    row.publish_ready_after_schema_rehearsal === true));
  assert.ok(result.mep_assignment_rows.every(row =>
    row.variant_assignment_version === MEP_REVIEWED_FINISH_OVERRIDE_V1 &&
    row.source_finish_hint === 'Normal' && row.normalized_finish_key === 'normal' &&
    row.assigned_finish_key === 'holo' && row.publishable === false &&
    row.app_visible === false && row.market_truth === false));
  const withoutFingerprint = clone(result);
  delete withoutFingerprint.rehearsal_fingerprint;
  assert.equal(result.rehearsal_fingerprint, sha256(stableJson(withoutFingerprint)));
  return {
    status: 'verified_local_rehearsal_plan',
    covered_price_observations: 6,
    production_database_writes: 0,
    pricing_publication_writes: 0,
    rehearsal_fingerprint: result.rehearsal_fingerprint,
  };
}
