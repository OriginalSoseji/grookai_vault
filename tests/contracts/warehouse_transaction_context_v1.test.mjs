import test from 'node:test';
import assert from 'node:assert/strict';
import {assertWarehouseTransactionContextV1} from '../../backend/warehouse/transaction_context_v1.mjs';
const client=({second='123',isolation='serializable',readOnly='off'}={})=>{
  const calls=[];return {calls,async query(sql){calls.push(sql);return {rows:[calls.length===1?
    {xid:'123',isolation,read_only:readOnly}:{xid:second}]};}};
};
test('writable serializable context keeps one assigned transaction across statements',async()=>{
  const c=client();assert.deepEqual(await assertWarehouseTransactionContextV1(c,{serializable:true}),{xid:'123',isolation:'serializable'});
  assert.equal(c.calls.length,2);assert.ok(c.calls.every(q=>q.startsWith('select ')));
});
test('autocommit cannot be mistaken for an explicit external transaction',async()=>{
  await assert.rejects(assertWarehouseTransactionContextV1(client({second:null})),/explicit_external_transaction_required/);
});
test('a changed backend transaction is rejected',async()=>{
  await assert.rejects(assertWarehouseTransactionContextV1(client({second:'124'})),/explicit_external_transaction_required/);
});
test('repeatable-read is insufficient for programme mutation execution',async()=>{
  await assert.rejects(assertWarehouseTransactionContextV1(client({isolation:'repeatable read'}),{serializable:true}),/serializable_transaction_required/);
});
test('read-only connections cannot enter mutation execution',async()=>{
  await assert.rejects(assertWarehouseTransactionContextV1(client({readOnly:'on'})),/writable_transaction_required/);
});
