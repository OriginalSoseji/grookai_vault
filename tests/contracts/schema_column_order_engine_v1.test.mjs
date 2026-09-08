import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PostgreSQL, ColumnInfo } from '@pgkit/schemainspect';
import { InspectedSelectable, InspectedPrivilege } from '@pgkit/schemainspect/dist/pg/obj.js';
import { Migration } from '@pgkit/migra';
import { RECONCILIATION_TABLES, reconcileKnownTableColumnOrderV1 } from '../../scripts/schema/column_order_reconciliation_v1.mjs';

function inspection(reverse = false) {
  const db = PostgreSQL.empty();
  for (const key of RECONCILIATION_TABLES) {
    const name = key.split('"')[3];
    const columns = Object.fromEntries((reverse ? ['b', 'a'] : ['a', 'b']).map(column => [column, new ColumnInfo({
      name: column, dbtype: 'text', dbtypestr: 'text', pytype: null,
      default: null, not_null: false, is_enum: false, is_identity: false,
      is_identity_always: false, is_generated: false, collation: null,
    })]));
    const table = new InspectedSelectable({ name, schema: 'public', relationtype: 'r',
      columns, definition: null, persistence: 'p', parent_table: null, partition_def: null,
      rowsecurity: false, });
    db.tables[key] = table;
    db.relations[key] = table;
    db.selectables[key] = table;
  }
  return db;
}
async function sql(from, target) {
  const migration = await Migration.create(from, target, {});
  migration.set_safety(false);
  migration.add_all_changes(true);
  return migration.sql;
}
test('pinned engine reports no SQL after the narrow in-memory column-order repair', async () => {
  const from = inspection();
  const target = inspection(true);
  reconcileKnownTableColumnOrderV1(from, target);
  assert.equal((await sql(from, target)).trim(), '');
});
test('normalization does not hide an actual table RLS change from the engine', async () => {
  const from = inspection();
  const target = inspection(true);
  target.tables[RECONCILIATION_TABLES[0]].rowsecurity = true;
  reconcileKnownTableColumnOrderV1(from, target);
  assert.match(await sql(from, target), /enable row level security/i);
});
test('normalization does not hide a new grant from the engine', async () => {
  const from = inspection();
  const target = inspection(true);
  target.privileges.newGrant = new InspectedPrivilege({ object_type: 'table', schema: 'public', name: 'card_prints', privilege: 'SELECT', target_user: 'anon' });
  reconcileKnownTableColumnOrderV1(from, target);
  assert.match(await sql(from, target), /grant SELECT on table "public"\."card_prints" to "anon"/i);
});
test('normalization preserves changed view definitions for engine comparison', async () => {
  const from = inspection();
  const target = inspection(true);
  const key = '"public"."visible_view"';
  for (const [db, text] of [[from, ' SELECT 1 AS a;'], [target, ' SELECT 2 AS a;']]) {
    const view = new InspectedSelectable({ name: 'visible_view', schema: 'public', relationtype: 'v',
      columns: { a: new ColumnInfo({ name: 'a', dbtype: 'integer', dbtypestr: 'integer', not_null: false }) },
      definition: text, persistence: 'p', });
    db.views[key] = view;
    db.relations[key] = view;
    db.selectables[key] = view;
  }
  reconcileKnownTableColumnOrderV1(from, target);
  assert.match(await sql(from, target), /SELECT 2 AS a/);
});
