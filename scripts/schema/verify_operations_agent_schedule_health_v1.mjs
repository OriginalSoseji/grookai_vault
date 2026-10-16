// Exact read-only production baseline plus rollback-only local rehearsal for the
// operations-agent schedule-health repair. This verifier never applies SQL to
// production and never commits the candidate in the isolated local database.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { pgSslConfig } from '../audits/japanese_master_index_v4/read_only_guard_v1.mjs';

export const operationsAgentScheduleHealthRelease = Object.freeze({
  target: 'ycdxbpibncqcchqiihfz',
  migration: '20261016150000_operations_agent_schedule_health_v1.sql',
  migrationSha256: 'b31f6f9395b1b6fc3f6dbc8b4c6ec1564d59d1af7a9f5853e02bf516a2e352f5',
  sourceMigrationCount: 455,
  productionMigrationCount: 454,
  productionMaxMigration: '20261016140000',
  localContainer: 'supabase_db_gv-overhaul-prepush-20261011',
  localPort: '55440',
  localMigrationCount: 442,
  localMaxMigration: '20261009190000',
  healthBeforeSha256: '9658d5e6cdaea04863514a8679d6106d6919eda7138b91580a8fefeb7f9705a7',
  maintenanceBeforeSha256: '20984a07c4a0a99e5d2c6ccacff486ca73cf841052f99dfa0c421136be4280c9',
});

const root = fileURLToPath(new URL('../../', import.meta.url));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();

export function validateOperationsAgentScheduleHealthArguments(args) {
  assert.equal(args.length, 3, 'phase, explicit env file, and new output directory are required');
  assert.ok(['AuditLinkedSchema', 'PrePush'].includes(args[0]), 'read-only audit phases only');
  assert.match(args[1], /^--env-file=.+$/);
  assert.match(args[2], /^--out-dir=.+$/);
  return {
    phase: args[0],
    envFile: args[1].slice('--env-file='.length),
    outDir: args[2].slice('--out-dir='.length),
  };
}

export function verifyOperationsAgentScheduleHealthSources(files) {
  const release = operationsAgentScheduleHealthRelease;
  assert.equal(files.length, release.sourceMigrationCount, 'source migration count changed');
  const ids = files.map(name => name.match(/^(\d+)_/)?.[1]);
  assert.ok(ids.every(Boolean), 'migration without numeric version');
  assert.equal(new Set(ids).size, ids.length, 'duplicate migration version');
  assert.equal(files.at(-1), release.migration, 'schedule-health migration must be the sole newest candidate');
  return ids;
}

function functionMetadataSql() {
  return `select jsonb_build_object(
    'health_definition',pg_get_functiondef('public.founder_operations_agent_health_v1()'::regprocedure),
    'maintenance_definition',pg_get_functiondef('public.operations_run_maintenance_v1()'::regprocedure),
    'health_acl',(select proacl from pg_proc where oid='public.founder_operations_agent_health_v1()'::regprocedure),
    'maintenance_acl',(select proacl from pg_proc where oid='public.operations_run_maintenance_v1()'::regprocedure),
    'health_owner',(select pg_get_userbyid(proowner) from pg_proc where oid='public.founder_operations_agent_health_v1()'::regprocedure),
    'maintenance_owner',(select pg_get_userbyid(proowner) from pg_proc where oid='public.operations_run_maintenance_v1()'::regprocedure),
    'health_security_definer',(select prosecdef from pg_proc where oid='public.founder_operations_agent_health_v1()'::regprocedure),
    'maintenance_security_definer',(select prosecdef from pg_proc where oid='public.operations_run_maintenance_v1()'::regprocedure),
    'health_config',(select proconfig from pg_proc where oid='public.founder_operations_agent_health_v1()'::regprocedure),
    'maintenance_config',(select proconfig from pg_proc where oid='public.operations_run_maintenance_v1()'::regprocedure)
  ) metadata`;
}

function assertBaselineFunctions(metadata) {
  const release = operationsAgentScheduleHealthRelease;
  assert.equal(sha256(metadata.health_definition), release.healthBeforeSha256, 'health function baseline drift');
  assert.equal(sha256(metadata.maintenance_definition), release.maintenanceBeforeSha256, 'maintenance function baseline drift');
  assert.deepEqual(metadata.health_acl, ['postgres=X/postgres', 'authenticated=X/postgres', 'service_role=X/postgres']);
  assert.deepEqual(metadata.maintenance_acl, ['postgres=X/postgres', 'service_role=X/postgres']);
  assert.equal(metadata.health_owner, 'postgres');
  assert.equal(metadata.maintenance_owner, 'postgres');
  assert.equal(metadata.health_security_definer, true);
  assert.equal(metadata.maintenance_security_definer, true);
  assert.deepEqual(metadata.health_config, ['search_path=public']);
  assert.deepEqual(metadata.maintenance_config, ['search_path=public, auth']);
}

function assertUpdatedFunctions(metadata, before) {
  assert.notEqual(sha256(metadata.health_definition), sha256(before.health_definition));
  assert.notEqual(sha256(metadata.maintenance_definition), sha256(before.maintenance_definition));
  assert.match(metadata.health_definition, /schedule_kind IN \('cron', 'timer', 'continuous'\)/i);
  assert.match(metadata.maintenance_definition, /schedule_kind IN \('cron', 'timer', 'continuous'\)/i);
  assert.match(metadata.maintenance_definition, /schedule_kind IN \('event', 'manual'\)/i);
  assert.match(metadata.maintenance_definition, /OPERATIONS_MAINTENANCE_V1_1/);
  for (const field of ['health_acl', 'maintenance_acl', 'health_owner', 'maintenance_owner',
    'health_security_definer', 'maintenance_security_definer', 'health_config', 'maintenance_config']) {
    assert.deepEqual(metadata[field], before[field], `${field} changed`);
  }
}

async function ledger(client) {
  return (await client.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(row => row.version);
}

async function metadata(client) {
  return (await client.query(functionMetadataSql())).rows[0].metadata;
}

async function productionBaseline(dbUrl, sourceIds) {
  const release = operationsAgentScheduleHealthRelease;
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: pgSslConfig(dbUrl),
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
  });
  await client.connect();
  try {
    await client.query('begin isolation level repeatable read read only');
    assert.equal((await client.query('show transaction_read_only')).rows[0].transaction_read_only, 'on');
    const productionLedger = await ledger(client);
    assert.equal(productionLedger.length, release.productionMigrationCount);
    assert.equal(productionLedger.at(-1), release.productionMaxMigration);
    assert.deepEqual(productionLedger, sourceIds.slice(0, -1), 'production ledger differs from source history');
    const before = await metadata(client);
    assertBaselineFunctions(before);
    const agents = (await client.query(`select agent_key,display_name,schedule_kind,is_enabled,is_paused,last_heartbeat_at
      from public.operations_agents order by agent_key`)).rows;
    const incidents = (await client.query(`select i.incident_key,i.status,i.severity,a.agent_key
      from public.operations_incidents i left join public.operations_agents a on a.id=i.agent_id
      where i.incident_key like 'agent-stale:%' order by i.incident_key`)).rows;
    const hidden = agents.find(row => row.agent_key === 'tk-sm-r-hidden-set-apply-v1');
    assert.ok(hidden, 'hidden-set event agent missing');
    assert.equal(hidden.schedule_kind, 'event');
    assert.equal(hidden.is_enabled, true);
    assert.equal(hidden.is_paused, false);
    const falseIncident = incidents.find(row => row.incident_key === 'agent-stale:tk-sm-r-hidden-set-apply-v1');
    assert.ok(falseIncident, 'known false stale incident missing');
    assert.equal(falseIncident.status, 'open');
    return {
      transactionReadOnly: true,
      ledger: productionLedger,
      functions: {
        healthSha256: sha256(before.health_definition),
        maintenanceSha256: sha256(before.maintenance_definition),
      },
      agents,
      incidents,
    };
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end();
  }
}

const behaviorSql = `
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('10000000-0000-0000-0000-000000000001','authenticated','authenticated','agent-health-test@example.invalid','',now(),'{}','{}',now(),now());
insert into public.user_entitlements(user_id,tier,role,is_active,source)
values ('10000000-0000-0000-0000-000000000001','founder_admin','founder',true,'agent-health-rehearsal');
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"service_role"}',true);
insert into public.operations_agents(id,agent_key,display_name,domain,execution_platform,source_locator,schedule_kind,heartbeat_interval_seconds,stale_after_seconds,last_heartbeat_at)
values
 ('20000000-0000-0000-0000-000000000001','test-event-idle','Event Idle','test','local','test','event',60,120,now()-interval '1 day'),
 ('20000000-0000-0000-0000-000000000002','test-manual-idle','Manual Idle','test','local','test','manual',60,120,now()-interval '1 day'),
 ('20000000-0000-0000-0000-000000000003','test-cron-stale','Cron Stale','test','local','test','cron',60,120,now()-interval '1 day'),
 ('20000000-0000-0000-0000-000000000004','test-event-failed','Event Failed','test','local','test','event',60,120,now()-interval '1 day');
insert into public.operations_agent_runs(agent_id,run_key,status,started_at,heartbeat_at,finished_at)
values ('20000000-0000-0000-0000-000000000004','failed-run','failed',now()-interval '2 hours',now()-interval '1 hour',now()-interval '1 hour');
insert into public.operations_incidents(incident_key,agent_id,incident_type,severity,status,title,summary)
values
 ('agent-stale:test-event-idle','20000000-0000-0000-0000-000000000001','agent_stale','high','open','test','test'),
 ('agent-stale:test-cron-stale','20000000-0000-0000-0000-000000000003','agent_stale','high','open','test','test');`;

async function localRollbackRehearsal(migrationSql) {
  const release = operationsAgentScheduleHealthRelease;
  const container = JSON.parse(execFileSync('docker', ['inspect', release.localContainer], {
    encoding: 'utf8', windowsHide: true,
  }))[0];
  assert.equal(container.State.Running, true, 'isolated local database is not running');
  assert.equal(container.NetworkSettings.Ports['5432/tcp'][0].HostPort, release.localPort, 'isolated local port drift');
  const client = new pg.Client({ host: '127.0.0.1', port: Number(release.localPort), database: 'postgres', user: 'postgres', password: 'postgres' });
  await client.connect();
  const beforeLedger = await ledger(client);
  assert.equal(beforeLedger.length, release.localMigrationCount);
  assert.equal(beforeLedger.at(-1), release.localMaxMigration);
  const before = await metadata(client);
  assertBaselineFunctions(before);
  const body = migrationSql.replace(/^\s*begin;\s*/i, '').replace(/\s*commit;\s*$/i, '');
  assert.notEqual(body, migrationSql, 'candidate transaction wrapper missing');
  let result;
  try {
    await client.query('begin');
    await client.query(body);
    const after = await metadata(client);
    assertUpdatedFunctions(after, before);
    await client.query(behaviorSql);
    const healthRows = (await client.query(`select agent_key,health from public.founder_operations_agent_health_v1()
      where agent_key like 'test-%' order by agent_key`)).rows;
    assert.deepEqual(Object.fromEntries(healthRows.map(row => [row.agent_key, row.health])), {
      'test-cron-stale': 'stale',
      'test-event-failed': 'failed',
      'test-event-idle': 'healthy',
      'test-manual-idle': 'healthy',
    });
    const maintenance = (await client.query('select public.operations_run_maintenance_v1() result')).rows[0].result;
    assert.equal(maintenance.maintenance_version, 'OPERATIONS_MAINTENANCE_V1_1');
    assert.equal(maintenance.stale_incidents_recovered, 1);
    const incidentRows = (await client.query(`select incident_key,status from public.operations_incidents
      where incident_key in ('agent-stale:test-event-idle','agent-stale:test-cron-stale') order by incident_key`)).rows;
    assert.deepEqual(incidentRows, [
      { incident_key: 'agent-stale:test-cron-stale', status: 'open' },
      { incident_key: 'agent-stale:test-event-idle', status: 'recovered' },
    ]);
    result = {
      rolledBack: true,
      healthRows,
      incidentRows,
      maintenanceVersion: maintenance.maintenance_version,
      healthAfterSha256: sha256(after.health_definition),
      maintenanceAfterSha256: sha256(after.maintenance_definition),
    };
  } finally {
    await client.query('rollback').catch(() => {});
  }
  assert.deepEqual(await ledger(client), beforeLedger, 'local ledger changed');
  const restored = await metadata(client);
  assert.equal(sha256(restored.health_definition), release.healthBeforeSha256, 'health function did not roll back');
  assert.equal(sha256(restored.maintenance_definition), release.maintenanceBeforeSha256, 'maintenance function did not roll back');
  await client.end();
  return result;
}

export async function verifyOperationsAgentScheduleHealth(options) {
  const release = operationsAgentScheduleHealthRelease;
  const envFile = path.resolve(options.envFile);
  const outDir = path.resolve(options.outDir);
  assert.ok(fs.existsSync(envFile), 'audit env file missing');
  fs.mkdirSync(outDir, { recursive: false });
  dotenv.config({ path: envFile, quiet: true, override: true });
  assert.ok(process.execArgv.includes('--use-system-ca'), 'verified system CA required');
  const dbUrl = process.env.SUPABASE_DB_URL;
  assert.ok(dbUrl, 'SUPABASE_DB_URL missing');
  assert.equal(new URL(dbUrl).hostname, `db.${release.target}.supabase.co`, 'production target mismatch');
  const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => /^\d+_.*\.sql$/.test(name)).sort();
  const sourceIds = verifyOperationsAgentScheduleHealthSources(migrationFiles);
  const migrationPath = path.join(root, 'supabase/migrations', release.migration);
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  assert.equal(sha256(migrationSql), release.migrationSha256, 'candidate migration drift');
  const plan = {
    version: 'OPERATIONS_AGENT_SCHEDULE_HEALTH_RELEASE_V1',
    startedAt: new Date().toISOString(),
    phase: options.phase,
    target: release.target,
    candidate: release.migration,
    candidateSha256: release.migrationSha256,
    commit: git('rev-parse', 'HEAD'),
    productionWrites: 0,
    localCommittedWrites: 0,
    applyAuthorized: false,
  };
  fs.writeFileSync(path.join(outDir, 'run_plan.json'), JSON.stringify(plan, null, 2), { flag: 'wx' });
  try {
    if (options.phase === 'PrePush') {
      assert.equal(git('status', '--porcelain'), '', 'clean committed source required');
      const main = git('ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0];
      assert.match(main, /^[a-f0-9]{40}$/);
      git('merge-base', '--is-ancestor', main, 'HEAD');
    }
    const production = await productionBaseline(dbUrl, sourceIds);
    const local = await localRollbackRehearsal(migrationSql);
    const result = {
      ...plan,
      status: 'passed',
      finishedAt: new Date().toISOString(),
      sourceMigrationCount: sourceIds.length,
      production,
      local,
    };
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(result, null, 2), { flag: 'wx' });
    const artifactHashes = Object.fromEntries(fs.readdirSync(outDir).sort().map(name => [name, sha256(fs.readFileSync(path.join(outDir, name)))]));
    fs.writeFileSync(path.join(outDir, 'artifact_hashes.json'), JSON.stringify(artifactHashes, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ status: 'passed', phase: options.phase, productionMigrations: production.ledger.length,
      candidate: release.migration, localRollback: local.rolledBack, productionWrites: 0, outDir }));
    return result;
  } catch (error) {
    const failed = { ...plan, status: 'failed', finishedAt: new Date().toISOString(), failure: error.message.split('\n')[0] };
    fs.writeFileSync(path.join(outDir, 'failure.json'), JSON.stringify(failed, null, 2), { flag: 'wx' });
    throw error;
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  await verifyOperationsAgentScheduleHealth(validateOperationsAgentScheduleHealthArguments(process.argv.slice(2)));
}
