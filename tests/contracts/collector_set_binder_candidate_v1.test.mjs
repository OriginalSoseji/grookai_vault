import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildCandidate } from '../../scripts/preview/build_collector_set_binder_candidate.mjs';

const read = name => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8');
test('candidate is deterministic and source-hashed without applying anything', () => {
  const a = buildCandidate();
  assert.deepEqual(a, buildCandidate());
  assert.equal(a.sha256, createHash('sha256').update(a.sql).digest('hex'));
  assert.equal(Object.keys(a.sources).length, 4);
  assert.ok(a.sql.startsWith('begin;'));
  assert.ok(a.sql.endsWith('commit;'));
});
test('set options expose only authorized complete checklists through a bounded RPC', () => {
  const { sql }=buildCandidate();
  assert.match(sql,/binder_set_options_v1/);
  assert.match(sql,/auth.uid\(\) is not null and a.n>0/);
  assert.match(sql,/length\(coalesce\(p_query,''\)\)<=60/);
  assert.match(sql,/limit 40/);
  const source=read('apps/web/src/lib/binders/speciesOptions.ts').split('export async function getBinderSetOptions')[1];
  assert.match(source,/\.rpc\("binder_set_options_v1"/);
  assert.doesNotMatch(source,/\.from\("sets"\)/);
});
test('all set paths share reviewed authority, not raw printing enumeration', () => {
  const { sql } = buildCandidate();
  assert.match(sql, /binder_set_slots_authority_v1\(v_binder.set_id\)/);
  assert.match(sql, /binder_set_slots_authority_v1\(binder.set_id\)/);
  assert.match(sql, /binder_set_slots_authority_v1\(b.set_id\)/);
  assert.match(sql, /binder_set_progress_counts_v1\(p_binder_id\)/);
  assert.match(sql, /set_binder_authority_unavailable/);
  assert.match(sql, /s.card_printing_id is not distinct from p_card_printing_id/);
});
test('old species and custom branches remain present, no flag is enabled', () => {
  const { sql } = buildCandidate();
  assert.match(sql, /v_binder.target_kind = 'species'/);
  assert.match(sql, /v_binder.target_kind = 'custom'/);
  assert.match(sql, /select \* from custom_slots/);
  assert.doesNotMatch(sql, /(?:update|insert into) public.binder_feature_flags/i);
  assert.doesNotMatch(sql, /(?:update|delete from|insert into) public\.(?:card_prints|card_printings|vault_item_instances)\b/i);
});
test('authority remains private and invalid manifests cannot shrink progress', () => {
  const { sql } = buildCandidate();
  assert.match(sql, /enable row level security/);
  assert.match(sql, /immutable_set_slot_release/);
  assert.match(sql, /count\(\*\) from valid\) = \(select expected_slot_count from release/);
  assert.match(sql, /content_consent_revision = b.external_projection_revision/);
  assert.match(sql, /binder_contribution_current_valid_v1\(c.id\)/);
  assert.doesNotMatch(sql, /grant (?:all|insert|update|delete).*to (?:authenticated|anon|service_role)/i);
});
test('replay is isolated, excludes schedules, and tests roll back', () => {
  const replay = read('scripts/preview/replay_collector_set_binder_candidate.mjs');
  const tests = read('scripts/preview/sql/collector_set_binder_replay_tests_v1.sql');
  assert.match(replay, /http:\/\/127.0.0.1:54321/);
  assert.match(replay, /preview\/collector-authenticated-20260910/);
  assert.match(replay, /--exclude-extension=pg_cron/);
  assert.match(replay, /report.reconciliationError =/);
  assert.match(replay, /sourceSecurityAfter !== sourceBinderSecurity/);
  assert.doesNotMatch(replay, /drop database|db reset|db push/i);
  assert.match(tests, /wrong_replay_database/);
  assert.match(tests, /rollback;/);
  for (const guard of ['stale_consent_leak', 'archived_copy_counted', 'partial_manifest_silently_shrank',
    'parent_bypassed_governed_children', 'persisted_progress_wrong']) assert.ok(tests.includes(guard));
});
test('RPC replay preserves owners and exercises actual nonprivileged roles', () => {
  const replay = read('scripts/preview/replay_collector_set_binder_candidate.mjs');
  const tests = read('scripts/preview/sql/collector_set_binder_rpc_tests_v1.sql');
  assert.match(replay, /create database \$\{database\} owner postgres/);
  assert.match(replay, /assert.equal\(sql\(database, binderSecurityQuery\).trim\(\), sourceBinderSecurity\)/);
  assert.match(replay, /assert.deepEqual\(report.fixtureAfter, report.fixtureBefore\)/);
  assert.match(tests, /set local role authenticated/);
  assert.match(tests, /set local role anon/);
  assert.match(tests, /rollback;/);
  for (const guard of ['outsider_checklist_leak', 'outsider_withdraw_allowed', 'rpc_foreign_copy_accepted',
    'rpc_unresolved_copy_accepted', 'create_idempotency_failed', 'add_idempotency_failed',
    'public_projection_identity_leak', 'revoked_consent_public_leak', 'custom_regression',
    'species_regression', 'binder_mutated_ownership']) assert.ok(tests.includes(guard));
});
