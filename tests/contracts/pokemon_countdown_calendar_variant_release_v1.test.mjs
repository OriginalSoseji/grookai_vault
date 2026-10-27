import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  assertCountdownReleasePackageV1,
  buildCountdownReleasePackageV1,
  countdownReleaseApprovalTextV1,
  sha256,
  stableJson,
} from '../../backend/catalog/pokemon_countdown_calendar_variant_release_v1.mjs';
import {
  assertPokemonCountdownRollbackInputsV1,
} from '../../scripts/audits/pokemon_countdown_calendar_variant_rollback_rehearsal_v1.mjs';

const NOW = Date.parse('2026-10-27T05:35:00.000Z');

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
  const transaction = {
    commit_attempted: false,
    committed: false,
    commit_uncertain: false,
    rollback_attempted: true,
    rollback_proven: true,
    rollback_uncertain: false,
  };
  const execution = {
    status: 'passed_rolled_back_no_durable_change',
    transaction,
    guard: {},
    simulated_write_counts: { parent_inserts: 22, identity_inserts: 22, child_inserts: 22, mapping_inserts: 22 },
    proof: { parent_rows: 22, identity_rows: 22, child_rows: 22, mapping_rows: 22 },
    before: { target_snapshot: { rows: [], hash_sha256: 'a'.repeat(64) }, mapping_sequence: { last_value: '5', is_called: true } },
    in_transaction: { target_snapshot: { rows: [], hash_sha256: 'b'.repeat(64) }, mapping_sequence: { last_value: '5', is_called: true } },
    after_rollback: { target_snapshot: { rows: [], hash_sha256: 'a'.repeat(64) }, mapping_sequence: { last_value: '5', is_called: true } },
    explicit_mapping_ids_bypassed_sequence: true,
    mapping_sequence_unchanged: true,
    rollback_verified: true,
  };
  const rehearsal = {
    version: 'POKEMON_COUNTDOWN_CALENDAR_VARIANT_ROLLBACK_REHEARSAL_V1',
    generated_at: '2026-10-27T05:34:00.000Z',
    project_ref: 'ycdxbpibncqcchqiihfz',
    proposal_fingerprint_sha256: proposal.fingerprint_sha256,
    plan_fingerprint_sha256: plan.fingerprint_sha256,
    durable_database_writes_performed: false,
    transaction_writes_rolled_back: true,
    approvals_performed: false,
    publication_performed: false,
    customer_state_changed: false,
    scope: { source_group_id: 2155, target_count: 22 },
    execution,
  };
  rehearsal.fingerprint_sha256 = sha256(stableJson({
    version: rehearsal.version,
    project_ref: rehearsal.project_ref,
    proposal_fingerprint_sha256: rehearsal.proposal_fingerprint_sha256,
    plan_fingerprint_sha256: rehearsal.plan_fingerprint_sha256,
    scope: rehearsal.scope,
    execution,
  }));
  const codeFiles = [
    'backend/catalog/master_index_printing_execution_guard_v1.mjs',
    'backend/catalog/pokemon_countdown_calendar_variant_release_v1.mjs',
    'backend/pricing/exact_mapping_execution_guard_v1.mjs',
    'scripts/audits/pokemon_countdown_calendar_variant_release_v1.mjs',
    'scripts/audits/pokemon_countdown_calendar_variant_rollback_rehearsal_v1.mjs',
  ].map((file, index) => ({ file, sha256: String(index + 1).repeat(64).slice(0, 64) }));
  const targets = assertPokemonCountdownRollbackInputsV1(proposal, plan);
  return { proposal, plan, rehearsal, targets, codeFiles, sourceCommitSha: 'c'.repeat(40) };
}

test('builds an immutable 22-row insert-only release package and exact approval text', () => {
  const input = fixtures();
  const pkg = buildCountdownReleasePackageV1({ ...input, rollbackReceipt: input.rehearsal, now: NOW });
  assertCountdownReleasePackageV1(pkg, {
    ...input,
    rollbackReceipt: input.rehearsal,
  });
  assert.equal(pkg.expected.total_inserts, 88);
  assert.equal(pkg.boundaries.price_writes, 0);
  assert.equal(pkg.boundaries.customer_state_writes, 0);
  const approval = countdownReleaseApprovalTextV1(pkg);
  assert.match(approval, new RegExp(pkg.package_fingerprint_sha256));
  assert.match(approval, new RegExp(pkg.source_commit_sha));
  assert.match(approval, /rows=22$/);
});

test('rejects stale, tampered, committed, or nonmatching rollback evidence', () => {
  for (const defect of ['stale', 'tampered', 'committed', 'plan']) {
    const input = fixtures();
    if (defect === 'stale') input.rehearsal.generated_at = '2026-10-27T05:00:00.000Z';
    if (defect === 'tampered') input.rehearsal.execution.proof.parent_rows = 21;
    if (defect === 'committed') input.rehearsal.execution.transaction.committed = true;
    if (defect === 'plan') input.rehearsal.plan_fingerprint_sha256 = 'd'.repeat(64);
    assert.throws(() => buildCountdownReleasePackageV1({
      ...input,
      rollbackReceipt: input.rehearsal,
      now: NOW,
    }));
  }
});

test('package fingerprint rejects widened boundaries or source drift', () => {
  const input = fixtures();
  const pkg = buildCountdownReleasePackageV1({ ...input, rollbackReceipt: input.rehearsal, now: NOW });
  const widened = structuredClone(pkg);
  widened.boundaries.price_writes = 1;
  assert.throws(() => assertCountdownReleasePackageV1(widened));
  assert.throws(() => assertCountdownReleasePackageV1(pkg, { sourceCommitSha: 'd'.repeat(40) }));
});

test('release execution is approval-gated, insert-only, and independently reads back after commit', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/audits/pokemon_countdown_calendar_variant_release_v1.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /COUNTDOWN_RELEASE_APPROVAL/);
  assert.match(source, /COUNTDOWN_RELEASE_EXPECTED_SHA/);
  assert.ok(source.indexOf('countdown_release_exact_approval_required') < source.indexOf('await applyRelease'));
  for (const table of ['card_prints', 'card_print_identity', 'card_printings', 'external_mappings']) {
    assert.match(source, new RegExp(`insert into public\\.${table}`));
  }
  assert.match(source, /commitMappingTransaction/);
  assert.match(source, /const readbackClient = new Client/);
  assert.match(source, /committed_and_independently_verified/);
  assert.doesNotMatch(source, /\bupdate\s+public\./i);
  assert.doesNotMatch(source, /\bdelete\s+from\s+public\./i);
  assert.doesNotMatch(source, /insert into public\.(?:price_observations|vault_item_instances)/i);
});

test('workflow separates package preparation from an exact approved apply', async () => {
  const workflow = await fs.readFile(
    new URL('../../.github/workflows/pokemon-countdown-calendar-durable-release.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /prepare_release/);
  assert.match(workflow, /apply_release/);
  assert.match(workflow, /source_commit_sha/);
  assert.match(workflow, /approval_phrase/);
  assert.match(workflow, /COUNTDOWN_RELEASE_APPROVAL/);
  assert.match(workflow, /--rehearsal=/);
  assert.match(workflow, /retention-days: 90/);
  assert.doesNotMatch(workflow, /^\s+schedule:/m);
  assert.doesNotMatch(workflow, /^\s+push:/m);
});
