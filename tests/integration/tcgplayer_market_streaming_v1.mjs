import assert from 'node:assert/strict';
import pg from 'pg';
import { readMarketLedgerBatchesV1, marketLedgerRowsV1 } from '../../backend/pricing/tcgplayer_market_streaming_v1.mjs';

const target = process.env.SUPABASE_DB_URL;
assert.ok(target, 'Explicit disposable local database required');
const url = new URL(target);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.port === '55430', 'Only the isolated local replay database is allowed');
const client = new pg.Client({ connectionString: target, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
await client.connect();
try {
  await client.query('begin read write');
  await client.query(`create temp table pricing_stream_fixture (
    id uuid not null, run_id uuid not null, source_product_id integer not null,
    source_subtype_name text not null, source_observation_id uuid not null,
    candidate_payload jsonb not null) on commit drop`);
  await client.query(`create index on pricing_stream_fixture (run_id, source_product_id, source_subtype_name)`);
  await client.query(`insert into pricing_stream_fixture
    select md5(i::text)::uuid, md5(case when i <= 2505 then 'run' else 'other' end)::uuid,
      i / 5, case when i % 2 = 0 then 'Foil' else 'Normal' end, md5(('obs' || i)::text)::uuid,
      jsonb_build_object('ordinal', i, 'evidence', repeat('x', 1000))
    from generate_series(1, 2510) i`);
  const run = (await client.query("select md5('run')::uuid id")).rows[0].id;
  const expected = (await client.query(`select * from pricing_stream_fixture where run_id=$1
    order by source_product_id, source_subtype_name, source_observation_id`, [run])).rows;
  let calls = 0, maxRows = 0;
  const adapter = { async query(sql, params) {
    assert.match(sql, /from public\.market_price_(pipeline_candidates|qualification_decisions)/);
    const result = await client.query(sql.replace(/public\.market_price_(pipeline_candidates|qualification_decisions)/, 'pg_temp.pricing_stream_fixture'), params);
    calls++; maxRows = Math.max(maxRows, result.rows.length);
    return result;
  } };
  const actual = [];
  for await (const batch of readMarketLedgerBatchesV1(adapter, 'candidates', run, 137)) actual.push(...batch);
  assert.deepEqual(actual.map(r => r.id), expected.map(r => r.id));
  assert.equal(new Set(actual.map(r => r.id)).size, 2505);
  assert.ok(maxRows <= 137);
  const rows = marketLedgerRowsV1(adapter, 'decisions', run);
  for (let pass = 0; pass < 2; pass++) {
    const exported = [];
    for await (const row of rows) exported.push(row);
    assert.deepEqual(exported, expected);
  }
  await client.query('rollback');
  assert.equal((await client.query("select to_regclass('pg_temp.pricing_stream_fixture') object")).rows[0].object, null);
  console.log(JSON.stringify({ status: 'passed', fixture_rows: 2510, selected_rows: 2505,
    excluded_other_run: 5, repeated_export_passes: 2, queries: calls, durable_writes: 0, cleanup: 'rolled_back' }));
} finally {
  await client.query('rollback').catch(() => {});
  await client.end();
}
