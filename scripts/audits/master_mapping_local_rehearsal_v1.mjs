import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { fixture } from '../../tests/fixtures/master_mapping_authority_v1.mjs';
import { freezeMasterMappingAuthority } from '../../backend/pricing/master_index_mapping_authority_v1.mjs';
import { mappingDatabaseConfig, mappingTransactionState, commitMappingTransaction,
  rollbackMappingTransaction } from '../../backend/pricing/exact_mapping_execution_guard_v1.mjs';

// Fixed loopback-only rehearsal. It creates and preserves a fresh synthetic DB.
const root = fileURLToPath(new URL('../../', import.meta.url));
const { Client } = createRequire(path.join(root, 'backend/package.json'))('pg');
const suffix = `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}_${randomBytes(4).toString('hex')}`;
const database = `grookai_mapping_authority_${suffix}`;
assert.match(database, /^grookai_mapping_authority_[a-z0-9_]+$/);
const out = path.join(root, 'artifacts', 'master_mapping_local', suffix);
await fs.mkdir(out, { recursive: true });
const write = (name, value) => fs.writeFile(path.join(out, name), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['backend/maintenance/tcgplayer_market_exact_mapping_apply_v1.mjs',
  'backend/pricing/master_index_mapping_authority_v1.mjs', 'backend/pricing/exact_mapping_execution_guard_v1.mjs',
  'backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs',
  'scripts/audits/master_mapping_local_rehearsal_v1.mjs', 'tests/fixtures/master_mapping_authority_v1.mjs'];
const hashes = {};
for (const file of files) hashes[file] = hash(await fs.readFile(path.join(root, file)));
await write('run_plan.json', { database, files: hashes, synthetic_only: true, production_access: false,
  boundaries: { fresh_local_database_only: true, preserved_after_execution: true, production_writes: 0 } });
const admin = new Client({ connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54330/postgres', connectionTimeoutMillis: 5000 });
const url = `postgresql://supabase_admin:postgres@127.0.0.1:54330/${database}`;
const client = new Client(mappingDatabaseConfig(url, { mode: 'apply' }));
const runId = '88888888-8888-4888-8888-888888888888';
let connected = false;
try {
  await admin.connect();
  await admin.query(`create database "${database}"`);
  await admin.end();
  await client.connect(); connected = true;
  await client.query(`
    create table public.card_prints (id uuid primary key, gv_id text, set_id uuid, set_code text,
      name text, number text, variant_key text, identity_domain text, printed_identity_modifier text);
    create table public.card_print_identity (id uuid primary key, card_print_id uuid, is_active boolean, identity_domain text);
    create table public.external_mappings (id bigint generated always as identity primary key,
      card_print_id uuid, source text, external_id text, meta jsonb, active boolean, synced_at timestamptz);
    create table public.tcgcsv_source_sync_runs (id uuid primary key, sync_mode text, status text,
      failed_count int, observed_on date, finished_at timestamptz, artifact_hash text);
    create table public.tcgcsv_source_groups (group_id int primary key, name text);
    create table public.tcgcsv_source_products (product_id int primary key, name text, group_id int,
      extended_data jsonb, source_active boolean, catalog_metadata_status text);
    create table public.tcgcsv_source_price_daily_observations (id uuid primary key, product_id int,
      last_seen_run_id uuid, observed_on date);
    create table public.market_price_current_publication (singleton boolean, publication_set_id uuid);
    create table public.market_price_publication_snapshots (publication_set_id uuid, source_product_id int, card_print_id uuid);
    create table public.commit_probe (id int primary key);
  `);
  const f = fixture(), p = f.parent, c = f.selected[0];
  await client.query('insert into public.card_prints values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [p.id, p.gv_id, p.set_id, 'test', p.name, '1', '', p.identity_domain, null]);
  await client.query('insert into public.card_print_identity values ($1,$2,true,$3)', [p.id, p.id, p.identity_domain]);
  await client.query("insert into public.tcgcsv_source_sync_runs values ($1,'current_full_sync','completed',0,current_date,now(),'synthetic')", [runId]);
  await client.query('insert into public.tcgcsv_source_groups values ($1,$2)', [456, c.source_group_name]);
  await client.query("insert into public.tcgcsv_source_products values ($1,$2,456,$3,true,'current')",
    [123, c.source_product_name, JSON.stringify([{ name: 'Number', value: '001/010' }])]);
  await client.query('insert into public.tcgcsv_source_price_daily_observations values ($1,123,$2,current_date)', [c.supporting_gap_observation_ids[0], runId]);
  const input = path.join(out, 'input'); await fs.mkdir(input);
  const candidates = `${JSON.stringify(c)}\n`, authority = JSON.stringify(freezeMasterMappingAuthority(f.selected, [f]));
  await fs.writeFile(path.join(input, 'candidates.jsonl'), candidates, { flag: 'wx' });
  await fs.writeFile(path.join(input, 'authority.json'), authority, { flag: 'wx' });
  await fs.writeFile(path.join(input, 'summary.json'), JSON.stringify({ status: 'passed', counts: { candidates: 1 } }), { flag: 'wx' });
  await fs.writeFile(path.join(input, 'run_plan.json'), JSON.stringify({ mode: 'read_only_dry_run', source_sync_run_id: runId,
    commit_sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() }), { flag: 'wx' });
  async function cli(name) {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !/^(SUPABASE|DATABASE|POSTGRES|PG|TCGPLAYER_EXACT_MAPPING|CANON_MAINTENANCE|ENABLE_CANON|NODE_OPTIONS|DOTENV)/i.test(key)));
    Object.assign(env, { DOTENV_CONFIG_PATH: path.join(out, 'no-env'), DATABASE_URL: url,
      ENABLE_CANON_MAINTENANCE_MODE: 'true', CANON_MAINTENANCE_MODE: 'EXPLICIT', CANON_MAINTENANCE_DRY_RUN: 'true',
      CANON_MAINTENANCE_ENTRYPOINT: 'backend/maintenance/run_canon_maintenance_v1.mjs',
      TCGPLAYER_EXACT_MAPPING_PLAN_PATH: path.join(input, 'candidates.jsonl'), TCGPLAYER_EXACT_MAPPING_EXPECTED_SHA256: hash(candidates),
      TCGPLAYER_EXACT_MAPPING_LIMIT: '1', TCGPLAYER_EXACT_MAPPING_MASTER_AUTHORITY_PATH: path.join(input, 'authority.json'),
      TCGPLAYER_EXACT_MAPPING_MASTER_AUTHORITY_SHA256: hash(authority), TCGPLAYER_EXACT_MAPPING_OUTPUT_ROOT: path.join(out, name) });
    const child = spawn(process.execPath, ['backend/maintenance/tcgplayer_market_exact_mapping_apply_v1.mjs', '--dry-run'], { cwd: root, env, windowsHide: true });
    let log = ''; child.stdout.on('data', bytes => { log += bytes; }); child.stderr.on('data', bytes => { log += bytes; });
    const timer = setTimeout(() => child.kill(), 30000);
    const result = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal })); })
      .finally(() => clearTimeout(timer));
    await write(`${name}.log`, log);
    assert.equal(result.signal, null, log);
    const children = await fs.readdir(path.join(out, name)); assert.equal(children.length, 1);
    const summary = JSON.parse(await fs.readFile(path.join(out, name, children[0], 'summary.json'), 'utf8'));
    return { ...result, summary, log };
  }
  const valid = await cli('valid');
  assert.equal(valid.code, 0, valid.log); assert.equal(valid.summary.status, 'passed');
  assert.equal(valid.summary.database_writes, 0); assert.equal(valid.summary.rollback_proven, true);
  await client.query("update public.card_prints set number='001/010' where id=$1", [p.id]);
  const drift = await cli('raw-drift');
  assert.equal(drift.code, 1); assert.match(drift.summary.error, /mapping_live_raw_number_drift/);
  assert.equal(drift.summary.rollback_proven, true);
  await client.query("update public.card_prints set number='1' where id=$1", [p.id]);
  const after = await cli('restored'); assert.equal(after.code, 0, after.log);
  assert.equal((await client.query('select count(*)::int count from public.external_mappings')).rows[0].count, 0);
  const lost = mappingTransactionState();
  await client.query('begin'); await client.query('insert into public.commit_probe values (1)');
  await assert.rejects(commitMappingTransaction({ query: async sql => { await client.query(sql); throw new Error('simulated response loss after server commit'); } }, lost));
  let rollbackCalls = 0;
  await rollbackMappingTransaction({ query: async () => { rollbackCalls++; } }, lost);
  assert.equal(rollbackCalls, 0); assert.equal(lost.commit_uncertain, true); assert.equal(lost.committed, null);
  const independent = new Client(mappingDatabaseConfig(url, { mode: 'dry_run' }));
  await independent.connect();
  try { assert.equal((await independent.query('select count(*)::int count from public.commit_probe')).rows[0].count, 1); }
  finally { await independent.end(); }
  for (const file of files) assert.equal(hash(await fs.readFile(path.join(root, file))), hashes[file], 'producer changed during rehearsal');
  await write('result.json', { status: 'passed', database, production_access: false, production_writes: 0,
    real_cli_valid_dry_run: true, raw_identity_drift_blocked: true, dry_run_mapping_writes: 0,
    real_commit_lost_response_state: lost, independent_readback_found_committed_probe: true,
    limitation: 'Synthetic local schema; not production apply or full production schema parity.', finished_at: new Date().toISOString() });
  console.log(JSON.stringify({ status: 'passed', database, out }));
} catch (error) {
  await write('failure.json', { error: error.message, database, production_access: false });
  throw error;
} finally {
  if (connected) await client.end();
  await admin.end().catch(() => {});
}
