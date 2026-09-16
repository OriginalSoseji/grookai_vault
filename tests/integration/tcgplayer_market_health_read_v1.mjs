import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import pg from 'pg';

const url = new URL(process.env.SUPABASE_DB_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname) && ['16530', '56530'].includes(url.port), 'Isolated local replay only');
const source = await fs.readFile(new URL('../../scripts/workers/tcgplayer_market_health_v1.mjs', import.meta.url), 'utf8');
const candidate = source.match(/`(with latest_source[\s\S]*?left join current_publication on true)`/)[1];
const original = await fs.readFile(new URL('../fixtures/market_health_original_20260916.sql', import.meta.url), 'utf8');
const tables = {
  tcgcsv_source_sync_runs: 'run_key text,status text,source_marker text,finished_at timestamptz,price_row_count int,failed_count int,error text,sync_mode text,created_at timestamptz',
  market_price_pipeline_runs: 'id int,run_key text,run_mode text,state text,reconciliation_state text,selected_count int,excluded_count int,quarantined_count int,delayed_count int,suppressed_count int,eligible_count int,snapshot_count int,required_phase_count int,succeeded_phase_count int,created_at timestamptz',
  market_price_publication_sets: 'id int,run_id int,publication_state text',
  market_price_qualification_decisions: 'id int,run_id int,eligible boolean,decision text,source_observation_id int,card_printing_id int,publication_lane text',
  market_price_publication_snapshots: 'id int,publication_set_id int,run_id int,qualification_decision_id int,source_observation_id int,card_printing_id int,card_print_id int,source_sync_finished_at timestamptz,publication_state text,freshness_state text',
  market_price_pipeline_phase_attempts: 'run_id int,phase_name text,state text',
  market_price_current_publication: 'publication_set_id int,run_id int,activated_at timestamptz,singleton boolean',
  card_printing_truth_reviews: 'card_printing_id int,active boolean,public_visibility text',
};
function fixtureSql(sql) {
  for (const name of Object.keys(tables)) sql = sql.replaceAll(`public.${name}`, `pg_temp.health_${name}`);
  assert.doesNotMatch(sql, /public\./);
  return sql;
}
const client = new pg.Client({connectionString:url.toString(),statement_timeout:10000,query_timeout:15000});
await client.connect();
let scenarios = 0;
try {
  await client.query('begin');
  for (const [name, columns] of Object.entries(tables)) await client.query(`create temp table health_${name} (${columns}) on commit drop`);
  async function reset() {
    for (const name of Object.keys(tables)) await client.query(`truncate pg_temp.health_${name}`);
    await client.query(fixtureSql(`
      insert into public.tcgcsv_source_sync_runs values ('source','completed','marker',now(),100,0,null,'current_full_sync',now());
      insert into public.market_price_pipeline_runs values (1,'selected','production','verified','reconciled',1,0,0,0,0,1,1,5,5,now()),(2,'other','production','verified','reconciled',1,0,0,0,0,1,1,5,5,now()-interval '1 day');
      insert into public.market_price_publication_sets values (10,1,'published'),(20,2,'published');
      insert into public.market_price_qualification_decisions values (100,1,true,'publish',1000,10000,'current'),(200,2,true,'publish',2000,20000,'current');
      insert into public.market_price_publication_snapshots values (100,10,1,100,1000,10000,100000,now(),'published','fresh'),(200,20,2,200,2000,20000,200000,now(),'published','fresh');
      insert into public.market_price_current_publication values (10,1,now(),true);
      insert into public.market_price_pipeline_phase_attempts select 1,unnest(array['prepare_variant_assignments','stage_candidates','qualify','build_publication','reconcile']),'succeeded';
    `));
  }
  async function compare(label, change = '', key = 'selected') {
    await reset();
    if (change) await client.query(fixtureSql(change));
    const before = (await client.query(fixtureSql(original), [key])).rows[0];
    const after = (await client.query(fixtureSql(candidate), [key])).rows[0];
    assert.deepEqual(after, before, label);
    scenarios++;
    return after;
  }
  const clean = await compare('clean');
  assert.equal(clean.current_exact_price_count, 1);
  assert.equal(clean.traced_snapshot_count, 1);
  for (const [label, change] of [
    ['missing decision', 'delete from public.market_price_qualification_decisions where id=100'],
    ['wrong observation', 'update public.market_price_publication_snapshots set source_observation_id=9 where id=100'],
    ['wrong printing', 'update public.market_price_publication_snapshots set card_printing_id=9 where id=100'],
    ['ineligible', 'update public.market_price_qualification_decisions set eligible=false where id=100'],
    ['wrong decision', "update public.market_price_qualification_decisions set decision='quarantine' where id=100"],
    ['wrong lane', "update public.market_price_qualification_decisions set publication_lane='history' where id=100"],
    ['stale clock', "update public.market_price_publication_snapshots set source_sync_finished_at=now()-interval '37 hours' where id=100"],
    ['stale state', "update public.market_price_publication_snapshots set freshness_state='stale' where id=100"],
    ['unpublished snapshot', "update public.market_price_publication_snapshots set publication_state='draft' where id=100"],
    ['unpublished release', "update public.market_price_publication_sets set publication_state='draft' where id=10"],
    ['unreconciled', "update public.market_price_pipeline_runs set reconciliation_state='pending' where id=1"],
    ['hidden', "insert into public.card_printing_truth_reviews values (10000,true,'hidden_unsupported')"],
    ['pending review', "insert into public.card_printing_truth_reviews values (10000,true,'hidden_pending_review')"],
    ['inactive review', "insert into public.card_printing_truth_reviews values (10000,false,'hidden_pending_review')"],
    ['other active run', 'update public.market_price_current_publication set publication_set_id=20,run_id=2'],
    ['no pointer', 'delete from public.market_price_current_publication'],
    ['no release', 'delete from public.market_price_publication_sets where id=10'],
    ['empty publication', 'delete from public.market_price_publication_snapshots where id=100'],
    ['wrong snapshot run', 'update public.market_price_publication_snapshots set run_id=2 where id=100'],
  ]) await compare(label, change);
  await compare('missing selected run', '', 'absent');
  await compare('implicit latest run', '', null);
  // A corrupt snapshot cannot borrow a valid trace from another run.
  await reset();
  await client.query(fixtureSql('update public.market_price_publication_snapshots set run_id=2,qualification_decision_id=200,source_observation_id=2000,card_printing_id=20000 where id=100'));
  const corrupt = (await client.query(fixtureSql(candidate), ['selected'])).rows[0];
  assert.equal(corrupt.broken_trace_count, 1);
  assert.equal(corrupt.current_exact_price_count, 0);
  scenarios++;
  await reset();
  await client.query(fixtureSql(`
    insert into public.market_price_qualification_decisions
      select i,2,true,'publish',i,i,'current' from generate_series(1000,31000) i;
    insert into public.market_price_publication_snapshots
      select i,20,2,i,i,i,i,now(),'published','fresh' from generate_series(1000,31000) i;
    analyze public.market_price_qualification_decisions;
    analyze public.market_price_publication_snapshots;
    insert into public.market_price_qualification_decisions
      select i,1,true,'publish',i,i,'current' from generate_series(40000,59999) i;
    insert into public.market_price_publication_snapshots
      select i,10,1,i,i,i,i,now(),'published','fresh' from generate_series(40000,59999) i;
  `));
  const started = Date.now();
  const scaled = (await client.query(fixtureSql(candidate), ['selected'])).rows[0];
  assert.equal(scaled.snapshot_count, 20001);
  assert.equal(scaled.traced_snapshot_count, 20001);
  assert.equal(scaled.current_exact_price_count, 20001);
  assert.equal(scaled.broken_trace_count, 0);
  scenarios++;
  console.log(JSON.stringify({scale_query_ms:Date.now()-started,active_snapshots:20001,historical_snapshots:30002}));
  console.log(JSON.stringify({status:'passed',scenarios,canonical_writes:0,temporary_fixture_only:true}));
} finally { await client.query('rollback'); await client.end(); }
