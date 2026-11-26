import assert from 'node:assert/strict';

// A setting alone cannot distinguish an explicit transaction from a sequence
// of autocommitted statements. An assigned XID must survive a second statement.
// This guard creates no application rows and never starts/ends the caller's TX.
export async function assertWarehouseTransactionContextV1(client,{serializable=false}={}) {
  const first=(await client.query(`select pg_current_xact_id()::text xid,
    current_setting('transaction_isolation') isolation,
    current_setting('transaction_read_only') read_only`)).rows[0];
  assert.match(first?.xid??'',/^\d+$/,'warehouse_transaction_id_required');
  assert.equal(first.read_only,'off','warehouse_writable_transaction_required');
  if(serializable)assert.equal(first.isolation,'serializable','warehouse_serializable_transaction_required');
  const second=(await client.query('select pg_current_xact_id_if_assigned()::text xid')).rows[0];
  assert.equal(second?.xid,first.xid,'warehouse_explicit_external_transaction_required');
  return {xid:first.xid,isolation:first.isolation};
}
