import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const active = 'supabase/migrations/20261015090000_vendor_receipt_delivery_reconcile_v1.sql';
const deferred = 'supabase/migrations/20261005150000_vendor_receipt_delivery_v1.sql';
const sql = fs.readFileSync(active, 'utf8');

test('receipt delivery uses a forward-only migration after the live ledger', () => {
  assert.equal(fs.existsSync(active), true);
  assert.equal(fs.existsSync(deferred), false);
  assert.equal(fs.existsSync('supabase/migrations/_quarantine/' + deferred.split('/').at(-1)), true);
  assert.match(active, /20261015/);
});

test('receipt delivery reconciliation is safe if a retained lab already has the old schema', () => {
  assert.match(sql, /create table if not exists public\.vendor_receipt_delivery_control/);
  assert.match(sql, /create table if not exists public\.vendor_receipt_deliveries/);
  assert.match(sql, /insert into public\.vendor_receipt_delivery_control\(singleton\) values\(true\) on conflict/);
  assert.match(sql, /create index if not exists vendor_receipt_deliveries_owner_created_idx/);
  assert.equal((sql.match(/create or replace function public\.vendor_receipt_delivery/g) ?? []).length, 8);
  assert.doesNotMatch(sql, /create function public\.vendor_receipt_delivery/);
  assert.doesNotMatch(sql, /drop table|drop function|drop schema/i);
});
