import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../../scripts/workers/tcgplayer_market_health_v1.mjs', import.meta.url), 'utf8');
test('health bulk joins are fenced to selected and active evidence', () => {
  assert.match(source, /selected_decisions as materialized/);
  assert.match(source, /left join selected_decisions decision/);
  assert.match(source, /current_snapshots as materialized[\s\S]*where snapshot.publication_set_id = \(select publication_set_id from current_publication\)/);
  assert.match(source, /current_decisions as materialized[\s\S]*where decision.run_id = \(select run_id from current_publication\)/);
  assert.match(source, /current_qualified_snapshots as materialized[\s\S]*decision.id = snapshot.qualification_decision_id[\s\S]*decision.run_id = snapshot.run_id/);
  assert.match(source, /join current_qualified_snapshots snapshot/);
});
test('health retains source, trace, freshness and visibility gates', () => {
  for (const predicate of [
    'decision.source_observation_id = snapshot.source_observation_id',
    'decision.card_printing_id = snapshot.card_printing_id',
    "decision.publication_lane = 'current'", "decision.decision = 'publish'",
    'decision.eligible = true', "snapshot.freshness_state = 'fresh'",
    "snapshot.source_sync_finished_at >= now() - interval '36 hours'",
    "publication_set.publication_state = 'published'",
    "pipeline_run.reconciliation_state = 'reconciled'",
    "'hidden_pending_review'", "'hidden_unsupported'",
  ]) assert.ok(source.includes(predicate), predicate);
});
test('health runs in a read-only snapshot and gives server cancellation time to return', () => {
  assert.match(source, /begin isolation level repeatable read read only/);
  assert.match(source, /set local lock_timeout = '3s'/);
  assert.match(source, /statement_timeout: 120_000/);
  assert.match(source, /query_timeout: 125_000/);
  assert.match(source, /finally \{\s*await client.query\("rollback"\)/);
  assert.match(source, /query_duration_ms: queryDurationMs/);
  assert.doesNotMatch(source, /enable_nestloop|set global|insert into|update public\.|delete from/i);
});
