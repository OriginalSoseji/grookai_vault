import test from 'node:test';
import assert from 'node:assert/strict';
import { mappingDatabaseConfig, mappingTransactionState, commitMappingTransaction,
  rollbackMappingTransaction } from '../../backend/pricing/exact_mapping_execution_guard_v1.mjs';

const remote = 'postgresql://postgres.ycdxbpibncqcchqiihfz:synthetic@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
test('exact remote target uses verified TLS and URL cannot override transport options', () => {
  const config = mappingDatabaseConfig(`${remote}?sslmode=no-verify`, { mode: 'dry_run', env: {} });
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.servername, 'aws-1-us-east-2.pooler.supabase.com');
  assert.equal(new URL(config.connectionString).search, '');
  assert.equal(config.options, '-c default_transaction_read_only=on');
});
for (const url of [remote.replace('ycdxbpibncqcchqiihfz', 'wrong'),
  remote.replace('aws-1-us-east-2.pooler.supabase.com', 'localhost.evil.example'),
  `${remote}?options=-c%20session_replication_role=replica`,
  'postgresql://test:test@127.0.0.1:54330/postgres',
  'postgresql://test:test@127.0.0.1:54330/grookai_mapping_authority_test?sslmode=disable']) {
  test(`unapproved connection target/options rejected: ${new URL(url).hostname}${new URL(url).pathname}`, () => {
    assert.throws(() => mappingDatabaseConfig(url, { mode: 'dry_run', env: {} }));
  });
}
test('TLS verification cannot be disabled through the process environment', () => {
  assert.throws(() => mappingDatabaseConfig(remote, { mode: 'apply', env: { NODE_TLS_REJECT_UNAUTHORIZED: '0' } }), /insecure_tls/);
});
test('isolated local rehearsal target supports both modes, dry-run startup is read-only', () => {
  const url = 'postgresql://test:test@127.0.0.1:54330/grookai_mapping_authority_fixture';
  assert.equal(mappingDatabaseConfig(url, { mode: 'apply' }).ssl, false);
  assert.equal(mappingDatabaseConfig(url, { mode: 'apply' }).options, undefined);
  assert.equal(mappingDatabaseConfig(url, { mode: 'dry_run' }).options, '-c default_transaction_read_only=on');
});
test('acknowledged commit is final and never followed by rollback', async () => {
  const state = mappingTransactionState(), queries = [];
  const client = { query: async sql => { queries.push(sql); return { command: 'COMMIT' }; } };
  await commitMappingTransaction(client, state);
  await rollbackMappingTransaction(client, state);
  assert.equal(state.committed, true);
  assert.equal(state.commit_uncertain, false);
  assert.deepEqual(queries, ['commit']);
});
test('lost COMMIT response preserves unknown outcome and does not attempt misleading rollback', async () => {
  const state = mappingTransactionState(), queries = [];
  const client = { query: async sql => { queries.push(sql); throw new Error('simulated lost response'); } };
  await assert.rejects(commitMappingTransaction(client, state), /lost response/);
  await rollbackMappingTransaction(client, state);
  assert.equal(state.committed, null);
  assert.equal(state.commit_uncertain, true);
  assert.equal(state.rollback_proven, false);
  assert.deepEqual(queries, ['commit']);
});
test('ROLLBACK returned from COMMIT is not recorded as a successful commit', async () => {
  const state = mappingTransactionState();
  await assert.rejects(commitMappingTransaction({ query: async () => ({ command: 'ROLLBACK' }) }, state), /not_acknowledged/);
  assert.equal(state.commit_uncertain, true);
});
test('precommit failure records rollback only with an explicit acknowledgement', async () => {
  const state = mappingTransactionState();
  await rollbackMappingTransaction({ query: async () => ({ command: 'ROLLBACK' }) }, state);
  assert.equal(state.rollback_proven, true);
  assert.equal(state.committed, false);
  const lost = mappingTransactionState();
  await assert.rejects(rollbackMappingTransaction({ query: async () => { throw new Error('disconnected'); } }, lost));
  assert.equal(lost.rollback_proven, false);
  assert.equal(lost.rollback_uncertain, true);
});
