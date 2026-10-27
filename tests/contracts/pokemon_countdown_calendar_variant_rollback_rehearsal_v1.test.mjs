import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  assertPokemonCountdownRollbackInputsV1,
} from '../../scripts/audits/pokemon_countdown_calendar_variant_rollback_rehearsal_v1.mjs';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fixtures() {
  const rows = Array.from({ length: 22 }, (_, index) => ({
    source_product_id: 153083 + index,
    source_product_name: `Card ${index} - ${index + 1}/123`,
    source_group_id: 2155,
    source_group_name: 'Countdown Calendar Promos',
    base_card_print_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    base_gv_id: `GV-PK-MT-${index + 1}`,
    base_set_code: 'dp2',
    base_name: `Card ${index}`,
    base_number: String(index + 1),
    proposed_variant_key: 'countdown_calendar_2008_gold_snowflake_stamp',
    proposed_stamp_color: 'gold',
    proposed_finish_key: 'normal',
    proposed_parent_gv_id: `GV-PK-MT-${index + 1}-COUNTDOWN-CALENDAR-2008-GOLD-SNOWFLAKE-STAMP`,
    proposed_printing_gv_id: `GV-PK-MT-${index + 1}-COUNTDOWN-CALENDAR-2008-GOLD-SNOWFLAKE-STAMP-NORMAL`,
    master_stamped_evidence: [{ source_key: 'fixture' }],
    source_evidence: [{ source: 'fixture' }],
    status: 'ready_for_guarded_variant_parent_plan',
    blockers: [],
  }));
  const proposal = {
    version: 'POKEMON_SPECIAL_PRINTING_REFERENCE_PROPOSAL_V1',
    database_writes_performed: false,
    scope: { source_group_id: 2155 },
    rows,
  };
  proposal.fingerprint_sha256 = sha256(stableJson({
    version: proposal.version,
    source_group_id: 2155,
    rows,
  }));
  const planRows = rows.map((row, index) => ({
    ...row,
    status: 'ready_for_transactional_rollback_rehearsal',
    blockers: [],
    target_parent_id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    target_child_id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  }));
  const plan = {
    version: 'POKEMON_COUNTDOWN_CALENDAR_VARIANT_PLAN_V1',
    database_writes_performed: false,
    proposal_fingerprint_sha256: proposal.fingerprint_sha256,
    database_target: { kind: 'production_service_snapshot', project_ref: 'ycdxbpibncqcchqiihfz' },
    environment_sanity: { maturity_gate_passed: true },
    snapshot_consistency: 'bounded_multi_request_snapshot_revalidate_in_transactional_rehearsal',
    summary: { ready_for_transactional_rollback_rehearsal: 22, blocked_by_live_invariant: 0 },
    rows: planRows,
  };
  plan.fingerprint_sha256 = sha256(stableJson({
    version: plan.version,
    proposal_fingerprint_sha256: proposal.fingerprint_sha256,
    rows: planRows,
  }));
  return { proposal, plan };
}

test('accepts exactly 22 fingerprint-bound ready Countdown targets', () => {
  const { proposal, plan } = fixtures();
  const targets = assertPokemonCountdownRollbackInputsV1(proposal, plan);
  assert.equal(targets.length, 22);
  assert.equal(targets[0].target_mapping_id, -153083);
  assert.equal(targets[0].evidence.plan_fingerprint_sha256, plan.fingerprint_sha256);
});

test('fails closed on plan tampering or a blocked row', () => {
  const tampered = fixtures();
  tampered.plan.rows[0].target_parent_id = '30000000-0000-4000-8000-000000000001';
  assert.throws(
    () => assertPokemonCountdownRollbackInputsV1(tampered.proposal, tampered.plan),
    /plan_fingerprint/,
  );

  const blocked = fixtures();
  blocked.plan.rows[0].status = 'blocked_by_live_invariant';
  blocked.plan.fingerprint_sha256 = sha256(stableJson({
    version: blocked.plan.version,
    proposal_fingerprint_sha256: blocked.proposal.fingerprint_sha256,
    rows: blocked.plan.rows,
  }));
  assert.throws(
    () => assertPokemonCountdownRollbackInputsV1(blocked.proposal, blocked.plan),
    /row_not_ready/,
  );
});

test('rehearsal source performs four simulated insert classes and can only roll back', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/audits/pokemon_countdown_calendar_variant_rollback_rehearsal_v1.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /insert into public\.card_prints/i);
  assert.match(source, /insert into public\.card_print_identity/i);
  assert.match(source, /insert into public\.card_printings/i);
  assert.match(source, /insert into public\.external_mappings/i);
  assert.match(source, /target_mapping_id, target_parent_id, 'tcgplayer'/i);
  assert.match(source, /rollbackMappingTransaction/);
  assert.match(source, /mapping_sequence_unchanged/);
  assert.doesNotMatch(source, /client\.query\(['"]commit['"]\)/i);
  assert.doesNotMatch(source, /insert into public\.(?:price_observations|card_prices|price_snapshots)/i);
});

test('production rehearsal workflow is manual, least-privilege, and preserves evidence', async () => {
  const workflow = await fs.readFile(
    new URL('../../.github/workflows/pokemon-countdown-calendar-rollback-rehearsal.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+schedule:/m);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.match(workflow, /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_URL \}\}/);
  assert.match(workflow, /master_index_printing_execution_v1\.test\.mjs/);
  assert.match(workflow, /pokemon_countdown_calendar_variant_rollback_rehearsal_v1\.mjs/);
  assert.match(workflow, /retention-days: 90/);
  assert.doesNotMatch(workflow, /\b(?:git push|supabase db push)\b/i);
});
