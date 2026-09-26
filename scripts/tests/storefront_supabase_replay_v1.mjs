// Destructive only to the fixed isolated storefront test project, empty or
// populated exclusively by this proof after its recorded 396-migration replay.
// Never accepts a target, linked project, credentials or other CLI arguments.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, '.local/storefront/supabase-verification');
const project = 'grookai-storefront-verification-20260918';
const container = `supabase_db_${project}`;
assert.equal(process.argv.length, 2);
const hash = b => createHash('sha256').update(b).digest('hex');
const docker = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 15000, windowsHide: true }).trim();
const sql = query => docker(['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', query]);
const plan = JSON.parse(fs.readFileSync(path.join(out, 'preparation.json')));
assert.equal(plan.project, project);
assert.equal(plan.ports.db, 16422);
const network = JSON.parse(docker(['network', 'inspect', project]))[0];
assert.equal(network.Internal, true);
const state = JSON.parse(docker(['inspect', container]))[0];
assert.equal(state.State.Running, true);
assert.deepEqual(Object.keys(state.NetworkSettings.Networks), [project]);
assert.equal(state.HostConfig.PortBindings['5432/tcp'][0].HostPort, '16422');
const initial = sql("select (select count(*) from auth.users)||'|'||(select count(*) from pg_tables where schemaname='public')") === '0|0';
if (!initial) {
    const prior = JSON.parse(fs.readFileSync(path.join(out, 'replay-result.json')));
    assert.equal(prior.project, project);
    assert.equal(prior.exitCode, 0);
    assert.equal(prior.ledger.length, 396);
    assert.equal(sql("select count(*) from auth.users where email !~ '^store-(owner|other|visitor)-[0-9]+@fixture[.]invalid$'"), '0');
    assert.equal(sql('select count(*) from public.card_prints'), '0');
    assert.equal(sql('select count(*) from public.vault_item_instances'), '0');
    assert.equal(sql("select count(*) from vendor_stores s join auth.users u on u.id=s.owner_id where u.email !~ '^store-(owner|other)-[0-9]+@fixture[.]invalid$'"), '0');
    assert.equal(sql('show max_worker_processes'), '0');
    fs.writeFileSync(path.join(out, 'before-final-replay.json'), JSON.stringify({ project, recordedAt: new Date().toISOString(), priorLedger: prior.ledger, fixtureUsers: Number(sql('select count(*) from auth.users')), syntheticOnly: true }, null, 2));
}
assert.equal(Object.keys(plan.sourceHashes).length, 396);
const correction = '20260918100000_vendor_custom_collectible_conflict_status_v1.sql';
const bytes = fs.readFileSync(path.join(root, 'supabase/migrations', correction));
plan.sourceHashes[correction] = hash(bytes);
fs.writeFileSync(path.join(out, 'supabase/migrations', correction), bytes);
const names = Object.keys(plan.sourceHashes).sort();
assert.equal(names.length, 397);
for (const dir of [path.join(root, 'supabase/migrations'), path.join(out, 'supabase/migrations')]) {
    assert.deepEqual(fs.readdirSync(dir).filter(n => /^\d+.*\.sql$/.test(n)).sort(), names);
    for (const name of names)
        assert.equal(hash(fs.readFileSync(path.join(dir, name))), plan.sourceHashes[name]);
}
const configPath = path.join(out, 'supabase/config.toml');
let config = fs.readFileSync(configPath, 'utf8');
assert(config.includes(`project_id = "${project}"`));
assert(config.includes('[db.migrations]\nenabled = false') || config.includes('[db.migrations]\nenabled = true'));
// This CLI recreates the entire PG17 container/volume on reset, so ALTER SYSTEM
// alone cannot protect replay. Its supported config persists this worker limit
// into the new postmaster before ANY migration can schedule work.
config = config.replace('[db.migrations]\nenabled = false', '[db.migrations]\nenabled = true');
if (!config.includes('[db.settings]'))
    config += '\n[db.settings]\nmax_worker_processes = 0\n';
assert(config.includes('max_worker_processes = 0'));
fs.writeFileSync(configPath, config);
const env = { ...process.env, DO_NOT_TRACK: '1' };
for (const name of Object.keys(env))
    if (/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(name))
        delete env[name];
const run = spawnSync('pwsh', ['-NoProfile', '-Command', `supabase db reset --workdir '${out.replaceAll("'", "''")}' --network-id ${project} --local --no-seed --yes; exit $LASTEXITCODE`], { encoding: 'utf8', env, windowsHide: true, timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
fs.writeFileSync(path.join(out, 'reset.log'), (run.stdout ?? '') + (run.stderr ?? ''));
const result = { recordedAt: new Date().toISOString(), project, exitCode: run.status, error: run.error?.code ?? null, configSha256: hash(config), logSha256: hash(fs.readFileSync(path.join(out, 'reset.log'))), sourceHashes: plan.sourceHashes };
result.maxWorkerProcesses = sql('show max_worker_processes');
assert.equal(result.maxWorkerProcesses, '0');
result.ledger = JSON.parse(sql('select coalesce(jsonb_agg(version order by version),\'[]\'::jsonb) from supabase_migrations.schema_migrations'));
fs.writeFileSync(path.join(out, 'replay-result.json'), JSON.stringify(result, null, 2) + '\n');
assert.equal(run.status, 0, 'Replay failed; inspect dedicated reset.log');
assert.deepEqual(result.ledger, names.map(n => n.match(/^\d+/)[0]));
console.log(JSON.stringify({ project, migrations: result.ledger.length, maxWorkerProcesses: result.maxWorkerProcesses, passed: true }));
