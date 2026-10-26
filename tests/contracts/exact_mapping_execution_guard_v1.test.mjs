import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mappingDatabaseConfig, assertMappingDatabaseSessionV1, assertMappingPlanDatabaseTargetV1, mappingTransactionState, commitMappingTransaction,
  rollbackMappingTransaction } from '../../backend/pricing/exact_mapping_execution_guard_v1.mjs';

const remote = 'postgresql://postgres.ycdxbpibncqcchqiihfz:synthetic@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
const reader = remote.replace('postgres.ycdxbpibncqcchqiihfz', 'grookai_pricing_reader_v1.ycdxbpibncqcchqiihfz');
test('dedicated reader is dry-run only and never broadens the target guard', () => {
  assert.equal(mappingDatabaseConfig(reader, { mode: 'dry_run', env: {} }).ssl.rejectUnauthorized, true);
  assert.throws(() => mappingDatabaseConfig(reader, { mode: 'apply', env: {} }), /DRY_RUN_ONLY/);
  for (const url of [reader.replace(':5432/', ':6543/'), `${reader}?sslmode=require`, `${reader}#fragment`,
    reader.replace('grookai_pricing_reader_v1', 'arbitrary_reader')]) {
    assert.throws(() => mappingDatabaseConfig(url, { mode: 'dry_run', env: {} }));
  }
});
test('dedicated reader rejects switched or privileged sessions before target reads', async () => {
  const config = mappingDatabaseConfig(reader, { mode: 'dry_run', env: {} });
  await assert.rejects(assertMappingDatabaseSessionV1({ query: async () => ({ command: 'SELECT', rows: [{
    session_user: 'postgres', current_user: 'grookai_pricing_reader_v1', role_name: 'grookai_pricing_reader_v1'
  }] }) }, config), /DIRECT_LOGIN_REQUIRED/);
  let queried = false;
  assert.equal(await assertMappingDatabaseSessionV1({ query: async () => { queried = true; } },
    mappingDatabaseConfig(remote, { mode: 'dry_run', env: {} })), null);
  assert.equal(queried, false);
});
test('actual executor verifies the dedicated session after TLS and before beginning work', () => {
  const source = readFileSync(new URL('../../backend/maintenance/tcgplayer_market_exact_mapping_apply_v1.mjs', import.meta.url), 'utf8');
  const tls = source.indexOf('throw new Error("MAPPING_TLS_NOT_AUTHORIZED")');
  const session = source.indexOf('await assertMappingDatabaseSessionV1(client, databaseConfig);');
  const begin = source.indexOf('? "begin isolation level serializable"');
  assert.ok(tls >= 0 && tls < session && session < begin);
});
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
test('explicit fixture plan cannot enter production apply', () => {
  const sourcePlan = { database_target: { kind: 'isolated_local_fixture', project_ref: null } };
  const databaseConfig = mappingDatabaseConfig(remote, { mode: 'apply', env: {} });
  assert.throws(() => assertMappingPlanDatabaseTargetV1(sourcePlan, { mode: 'apply', databaseConfig }),
    /mapping_fixture_plan_cannot_authorize_production_apply/);
});
test('fixture provenance preserves local applies and read-only remote comparison', () => {
  const sourcePlan = { database_target: { kind: 'isolated_local_fixture' } };
  for (const [url, mode] of [
    ['postgresql://test:test@127.0.0.1:54330/grookai_mapping_authority_fixture', 'apply'],
    ['postgresql://test:test@localhost:54330/grookai_mapping_authority_fixture', 'dry_run'],
    [remote, 'dry_run'],
  ]) assert.doesNotThrow(() => assertMappingPlanDatabaseTargetV1(sourcePlan,
    { mode, databaseConfig: mappingDatabaseConfig(url, { mode, env: {} }) }));
});
test('historical receipt absence and explicit production provenance retain existing gates', () => {
  const databaseConfig = mappingDatabaseConfig(remote, { mode: 'apply', env: {} });
  for (const sourcePlan of [{}, { database_target: { kind: 'production_project' } }]) {
    assert.doesNotThrow(() => assertMappingPlanDatabaseTargetV1(sourcePlan, { mode: 'apply', databaseConfig }));
  }
});
test('actual executor checks fixture provenance after target validation and before Client construction', () => {
  const source = readFileSync(new URL('../../backend/maintenance/tcgplayer_market_exact_mapping_apply_v1.mjs', import.meta.url), 'utf8');
  const config = source.indexOf('const databaseConfig = mappingDatabaseConfig(url, { mode });');
  const guard = source.indexOf('assertMappingPlanDatabaseTargetV1(frozen.sourcePlan, { mode, databaseConfig });');
  const client = source.indexOf('const client = new Client(databaseConfig);');
  assert.ok(config >= 0 && config < guard && guard < client);
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
