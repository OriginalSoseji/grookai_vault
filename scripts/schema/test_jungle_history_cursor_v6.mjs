// Fixed retained local lab, temporary data only. Never reset or reseed it.
import assert from 'node:assert/strict';
import pg from 'pg';
import {inspectJungleFullV37} from './inspect_jungle_full_v37.mjs';
import {jungleHistoryCursorClientV6, JUNGLE_HISTORY_AGGREGATE_V6 as aggregate, JUNGLE_HISTORY_CURSOR_SQL_V6 as declare} from '../../backend/catalog/jungle_edition_catalog_state_v6.mjs';

const runtime = inspectJungleFullV37();
const client = new pg.Client({host: '127.0.0.1', port: 54200, user: 'postgres', password: 'postgres', database: 'postgres', connectionTimeoutMillis: 10000});
const ids = Array.from({length: 83}, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
const table = 'pg_temp.jungle_history_cursor_fixture';
await client.connect();
try {
  const state = (await client.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
  assert.deepEqual(state, {address: runtime.address, workers: '0', migrations: 426});
  await client.query('begin isolation level repeatable read');
  await client.query("set local timezone='UTC';set local statement_timeout='15s';set local lock_timeout='2s'");
  await client.query('create temporary table jungle_history_cursor_fixture(card_print_id uuid,n numeric,label text,payload jsonb,observed_at timestamptz) on commit drop');
  // Real PostgreSQL record serialization: NULL/empty, commas, quotes, Unicode,
  // JSON, timestamp and unconstrained numeric scale, including duplicate rows.
  await client.query(`insert into ${table} select ($1::uuid[])[1+g%83],case g%3 when 0 then 1.00::numeric when 1 then 1.000::numeric else null end,case g%4 when 0 then null when 1 then '' when 2 then 'Poké, "quoted"' else E'line\nbreak' end,jsonb_build_object('customer',jsonb_build_object('name','César','notes',case g%2 when 0 then null else '' end)),timestamptz '2026-10-01 01:02:03.123456+00' from generate_series(1,4123) g`, [ids]);
  await client.query(`insert into ${table} select * from ${table} limit 5`);
  const batches = [];
  const adapted = jungleHistoryCursorClientV6({query: (sql, args) => client.query(sql === declare ? sql.replace('public.justtcg_variant_price_snapshots', table) : sql, args)}, {onBatch: b => batches.push(b)});
  const reference = () => client.query(aggregate.replace('public."justtcg_variant_price_snapshots"', table), [ids]);
  const before = await reference();
  assert.deepEqual((await adapted.query(aggregate, [ids])).rows, before.rows);
  assert.equal(before.rows[0].rows, '4128');
  assert.deepEqual(batches.map(b => b.rows), [2000, 2000, 128, 0]);
  let previous = before.rows[0].digest;
  for (const [set, where] of [
    ["n=1.000000::numeric", 'n is not null'],
    ["label=''", 'label is null'],
    ["payload=payload||jsonb_build_object('new_field',true)", 'true'],
    ["observed_at=observed_at+interval '1 microsecond'", 'true'],
  ]) {
    await client.query(`update ${table} set ${set} where ctid=(select ctid from ${table} where ${where} limit 1)`);
    const expected = (await reference()).rows;
    assert.notEqual(expected[0].digest, previous, 'complete_record_change_must_be_detected');
    assert.deepEqual((await adapted.query(aggregate, [ids])).rows, expected);
    previous = expected[0].digest;
  }
  await client.query(`delete from ${table}`);
  assert.deepEqual((await adapted.query(aggregate, [ids])).rows, (await reference()).rows);
} finally {
  await client.query('rollback');
  assert.equal((await client.query("select to_regclass('pg_temp.jungle_history_cursor_fixture') name")).rows[0].name, null);
  await client.end();
}
console.log(JSON.stringify({status: 'passed',project: runtime.project,rows: 4128,comparisons: 6,initialBatches: [2000,2000,128,0],temporaryDataOnly: true,productionWrites: 0}));
