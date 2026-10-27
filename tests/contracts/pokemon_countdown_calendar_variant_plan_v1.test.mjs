import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  assertPokemonCountdownCalendarEnvironmentSanityV1,
  buildPokemonCountdownCalendarPlanTargetsV1,
  evaluatePokemonCountdownCalendarLiveRowV1,
} from '../../scripts/audits/pokemon_countdown_calendar_variant_plan_v1.mjs';

const proposal = {
  version: 'POKEMON_SPECIAL_PRINTING_REFERENCE_PROPOSAL_V1',
  database_writes_performed: false,
  fingerprint_sha256: 'a'.repeat(64),
  rows: [{
    source_product_id: 153083,
    status: 'ready_for_guarded_variant_parent_plan',
    base_card_print_id: 'base-id',
    base_gv_id: 'GV-PK-MT-19',
    base_set_code: 'dp2',
    base_name: 'Abomasnow',
    base_number: '19',
    proposed_variant_key: 'countdown_calendar_2008_gold_snowflake_stamp',
    proposed_finish_key: 'normal',
    proposed_parent_gv_id: 'GV-PK-MT-19-COUNTDOWN-CALENDAR-2008-GOLD-SNOWFLAKE-STAMP',
  }],
};

const live = {
  base_count: 1,
  base_gv_id: 'GV-PK-MT-19',
  base_set_code: 'dp2',
  base_name: 'Abomasnow',
  base_number: '19',
  base_finish_count: 1,
  active_finish_count: 1,
  source_mapping_count: 0,
  variant_parent_collision_count: 0,
  gv_id_collision_count: 0,
  target_parent_id_collision_count: 0,
  target_child_id_collision_count: 0,
  identity_projection_status: 'ready',
  identity_hash_collision_count: 0,
};

test('builds stable parent and child ids bound to the proposal fingerprint', () => {
  const left = buildPokemonCountdownCalendarPlanTargetsV1(proposal);
  const right = buildPokemonCountdownCalendarPlanTargetsV1(proposal);
  assert.deepEqual(left, right);
  assert.match(left[0].target_parent_id, /^[0-9a-f-]{36}$/);
  assert.notEqual(left[0].target_parent_id, left[0].target_child_id);
});

test('qualifies only a collision-free live row for rollback rehearsal', () => {
  const target = buildPokemonCountdownCalendarPlanTargetsV1(proposal)[0];
  const result = evaluatePokemonCountdownCalendarLiveRowV1(target, live);
  assert.equal(result.status, 'ready_for_transactional_rollback_rehearsal');
  assert.deepEqual(result.blockers, []);
  assert.equal(result.canonical_write_authority, false);
});

test('fails closed on mapping, finish, identity, or collision drift', () => {
  const target = buildPokemonCountdownCalendarPlanTargetsV1(proposal)[0];
  const result = evaluatePokemonCountdownCalendarLiveRowV1(target, {
    ...live,
    base_finish_count: 0,
    source_mapping_count: 1,
    gv_id_collision_count: 1,
    identity_projection_status: 'blocked',
  });
  assert.equal(result.status, 'blocked_by_live_invariant');
  assert.deepEqual(result.blockers, [
    'base_finish_count_not_one',
    'source_product_already_mapped',
    'proposed_gv_id_collision',
    'identity_projection_not_ready',
  ]);
});

test('requires the canonical mature production reader target', () => {
  const target = {
    kind: 'production_project',
    project_ref: 'ycdxbpibncqcchqiihfz',
    verified_tls: true,
    startup_read_only: true,
  };
  assert.deepEqual(
    assertPokemonCountdownCalendarEnvironmentSanityV1(target, {
      card_prints: 40_000,
      sets: 150,
      card_print_traits: 5_000,
    }),
    {
      project_ref: 'ycdxbpibncqcchqiihfz',
      transport: 'postgres_reader',
      card_prints: 40_000,
      sets: 150,
      card_print_traits: 5_000,
      maturity_gate_passed: true,
    },
  );
  assert.throws(
    () => assertPokemonCountdownCalendarEnvironmentSanityV1(
      { ...target, project_ref: 'wrong-project' },
      { card_prints: 40_000, sets: 150, card_print_traits: 5_000 },
    ),
    /production_reader_required/,
  );
  assert.throws(
    () => assertPokemonCountdownCalendarEnvironmentSanityV1(
      target,
      { card_prints: 39_999, sets: 150, card_print_traits: 5_000 },
    ),
    /environment_maturity_gate_failed/,
  );
});

test('accepts only a canonical bounded service snapshot above maturity gates', () => {
  const result = assertPokemonCountdownCalendarEnvironmentSanityV1({
    kind: 'production_service_snapshot',
    project_ref: 'ycdxbpibncqcchqiihfz',
    transport: 'supabase_rest',
    https_required: true,
    code_boundary_read_only: true,
  }, {
    card_prints: 40_001,
    sets: 151,
    card_print_traits: 5_001,
  });
  assert.equal(result.transport, 'supabase_rest');
  assert.equal(result.maturity_gate_passed, true);
});

test('planner source contains no mutation statements', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/audits/pokemon_countdown_calendar_variant_plan_v1.mjs', import.meta.url),
    'utf8',
  );
  assert.equal(
    /\b(?:insert\s+into|update\s+public\.|delete\s+from|merge\s+into|truncate\s+table|alter\s+table|drop\s+table)\b/i
      .test(source),
    false,
  );
  assert.match(source, /connectExactMappingPlannerV1/);
  assert.match(source, /supabase_service_snapshot/);
  assert.match(source, /card_print_traits/);
  const withoutHashUpdate = source.replace(
    ".createHash('sha256').update",
    ".createHash('sha256').hashInput",
  );
  assert.doesNotMatch(withoutHashUpdate, /\.(?:insert|update|delete|upsert)\s*\(/i);
});
