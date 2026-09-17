import assert from 'node:assert/strict';
import { assertPrintingDatabaseTarget } from '../catalog/master_index_printing_execution_guard_v1.mjs';

export function mappingDatabaseConfig(connectionString, { mode, env = process.env } = {}) {
  assert.ok(['apply', 'dry_run'].includes(mode), 'mapping_database_mode_required');
  assert.notEqual(env.NODE_TLS_REJECT_UNAUTHORIZED, '0', 'mapping_insecure_tls_environment');
  let url = new URL(connectionString);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol), 'mapping_database_protocol');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (local) {
    assert.match(url.pathname, /^\/grookai_mapping_authority_[a-z0-9_]+$/, 'mapping_local_database_must_be_isolated');
    assert.equal(url.search, '', 'mapping_database_options_not_allowed');
  } else {
    url = assertPrintingDatabaseTarget(connectionString);
  }
  return {
    connectionString: url.href,
    ssl: local ? false : { rejectUnauthorized: true, servername: url.hostname },
    application_name: 'tcgplayer-market-exact-mapping-apply-v1',
    connectionTimeoutMillis: 15000,
    statement_timeout: 120000,
    query_timeout: 125000,
    ...(mode === 'dry_run' ? { options: '-c default_transaction_read_only=on' } : {}),
  };
}

export function mappingTransactionState() {
  return { commit_attempted: false, committed: false, commit_uncertain: false,
    rollback_attempted: false, rollback_proven: false, rollback_uncertain: false };
}

export async function commitMappingTransaction(client, state) {
  state.commit_attempted = true;
  try {
    const result = await client.query('commit');
    assert.equal(result.command, 'COMMIT', 'mapping_commit_not_acknowledged');
    state.committed = true;
  } catch (error) {
    state.committed = null;
    state.commit_uncertain = true;
    throw error;
  }
}

export async function rollbackMappingTransaction(client, state) {
  // ROLLBACK after a lost COMMIT response cannot prove that the commit did not happen.
  if (state.commit_attempted) return;
  state.rollback_attempted = true;
  try {
    const result = await client.query('rollback');
    assert.equal(result.command, 'ROLLBACK', 'mapping_rollback_not_acknowledged');
    state.rollback_proven = true;
  } catch (error) {
    state.rollback_uncertain = true;
    throw error;
  }
}
