// Bounded recovery readback for one consumed reset. Never starts, resets or applies.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { root, fixture, output, guard, sql, hash } from '../schema/vendor_preorder_conflict_runtime_v1.mjs';

assert.equal(process.argv.length, 2);
const before = guard({ full: true });
const log = fs.readFileSync(path.join(fixture, 'full-reset-private.log'), 'utf8');
assert.equal(hash(log), 'c13183285b5547fb5406784271c0a8385e11a519e60df74e3afb26d4fda7c3dd');
assert.match(log, /Applying migration 20260923030000_vendor_preorders_conflict_v1.sql/);
assert.match(log, /Restarting containers/);
assert.match(log, /Error status 502/);
const intent = JSON.parse(fs.readFileSync(path.join(fixture, 'full-replay-intent.json')));
assert.deepEqual(intent.sourceHashes, before.sourceHashes);
const footprintSql = fs.readFileSync(path.join(root, 'scripts/audits/storefront_schema_footprint_v1.sql'), 'utf8');
const old = JSON.parse(fs.readFileSync(path.join(fixture, 'prior-414-footprint.json')));
const current = JSON.parse(sql(footprintSql));
const key = row => row.kind + '|' + row.key;
const previous = new Map(old.objects.map(row => [key(row), row]));
const next = new Map(current.objects.map(row => [key(row), row]));
assert.deepEqual(old.objects.filter(row => !next.has(key(row))), []);
assert.deepEqual(current.objects.filter(row => !previous.has(key(row))), []);
const changed = current.objects.filter(row => JSON.stringify(row) !== JSON.stringify(previous.get(key(row))));
assert.equal(changed.length, 1);
assert.equal(changed[0].key, 'public.vendor_preorders_save_v1(p_id uuid, p_version integer, p_data jsonb)');
const previousFunction = previous.get(key(changed[0]));
assert.deepEqual({ ...changed[0].value, definition_hash: null }, { ...previousFunction.value, definition_hash: null });
// Footprints contain definition hashes, not SQL text. Compare actual definitions
// and bind both readbacks to their corresponding immutable footprint hashes.
const definitionQuery = "select json_build_object('definition',pg_get_functiondef('public.vendor_preorders_save_v1(uuid,integer,jsonb)'::regprocedure),'digest',md5(pg_get_functiondef('public.vendor_preorders_save_v1(uuid,integer,jsonb)'::regprocedure)));";
const priorContainer = 'supabase_db_grookai-preorders-20260922';
const priorState = JSON.parse(execFileSync('docker', ['inspect', priorContainer], { encoding: 'utf8', windowsHide: true }))[0];
assert.equal(priorState.State.Running, true);
assert.deepEqual(Object.keys(priorState.NetworkSettings.Networks), ['grookai-preorders-20260922']);
const priorDefinition = JSON.parse(execFileSync('docker', ['exec', '-i', priorContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], { input: definitionQuery, encoding: 'utf8', windowsHide: true, timeout: 30000 }));
const currentDefinition = JSON.parse(sql(definitionQuery));
assert.equal(priorDefinition.digest, previousFunction.value.definition_hash);
assert.equal(currentDefinition.digest, changed[0].value.definition_hash);
assert.equal(currentDefinition.definition, priorDefinition.definition.replace('40001', 'PT409'));

const require = createRequire(path.join(root, 'apps/web/package.json'));
const { createClient } = require('@supabase/supabase-js');
// Capture credentials in memory only; target is pinned independently of status URLs.
const status = JSON.parse(execFileSync('supabase', ['status', '--workdir', fixture, '--output', 'json'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }));
const url = 'http://127.0.0.1:25621';
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } };
assert.ok(status.ANON_KEY && status.SERVICE_ROLE_KEY);
const admin = createClient(url, status.SERVICE_ROLE_KEY, options);
const clients = [], users = [], report = { at: new Date().toISOString(), project: before.project, resetCommandExit: 1, resetServiceRestartError: 502, resetRepeated: false, schemaReadback: { applied: before.applied, unchangedObjects: old.objects.length - 1, changedObjects: 1, added: 0, removed: 0 }, checks: [], productionWrites: 0 };
const evidenceFile = path.join(output, 'recovery-http-proof.json');
assert.ok(!fs.existsSync(evidenceFile), 'Preserve the existing proof');
const privateIntent = path.join(fixture, 'http-recovery-intent.json');
assert.ok(!fs.existsSync(privateIntent), 'Inspect retained test fixtures before any retry');
fs.writeFileSync(privateIntent, JSON.stringify({ at: report.at, users }), { flag: 'wx' });
const checked = result => { if (result.error) throw new Error(`Local proof failed: ${result.error.code || result.status || 'request'}`); return result.data; };
try {
  for (let index = 0; index < 2; index++) {
    const email = `intake-preflight-${randomUUID()}@example.invalid`, password = randomBytes(24).toString('hex');
    const { user } = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true }));
    users.push(user.id); fs.writeFileSync(privateIntent, JSON.stringify({ at: report.at, users }));
    const client = createClient(url, status.ANON_KEY, options);
    checked(await client.auth.signInWithPassword({ email, password })); clients.push(client);
    checked(await admin.from('user_entitlements').insert({ user_id: user.id, tier: 'vendor', features: { store_app: true, store_web: false } }));
    checked(await admin.from('vendor_stores').insert({ owner_id: user.id, slug: `recovery-${randomUUID()}`, display_name: 'Synthetic recovery proof' }));
  }
  sql('update public.vendor_store_rollout set app_enabled=true;');
  const id = randomUUID();
  const data = { title: 'Synthetic upcoming box', description: '', expected_date: '2027-01-01', price_cents: 10000, allocation_limit: 10, payment_mode: 'reservation', deposit_cents: null, terms: 'Synthetic local proof only', status: 'draft' };
  const write = (client, version, payload) => client.rpc('vendor_preorders_save_v1', { p_id: id, p_version: version, p_data: payload });
  const created = checked(await write(clients[0], 0, data));
  const retries = await Promise.all([write(clients[0], 0, data), write(clients[0], 0, data)]);
  for (const retry of retries) assert.deepEqual(checked(retry), created);
  report.checks.push('real Auth and concurrent identical RPC retries return the same record');
  checked(await write(clients[0], 1, { ...data, title: 'Updated synthetic box' }));
  const started = performance.now(), stale = await write(clients[0], 1, { ...data, title: 'Stale title' });
  assert.equal(stale.status, 409); assert.equal(stale.error?.code, 'PT409');
  report.staleResponseMs = Math.round(performance.now() - started);
  report.checks.push('stale edit returns HTTP 409 / PT409 within request deadline');
  const foreign = await write(clients[1], 2, data); assert.equal(foreign.status, 403);
  assert.deepEqual(checked(await clients[1].from('vendor_preorders').select('id')), []);
  const anon = createClient(url, status.ANON_KEY, options);
  assert.ok((await anon.rpc('vendor_preorders_owner_v1')).error);
  report.checks.push('foreign owner and anonymous access rejected');
  checked(await admin.from('user_entitlements').update({ is_active: false }).eq('user_id', users[0]));
  assert.equal((await write(clients[0], 2, data)).status, 403);
  assert.equal(checked(await clients[0].from('vendor_preorders').select('id')).length, 1);
  report.checks.push('inactive grant denies writes and retains owner inspection');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.message; process.exitCode = 1;
} finally {
  sql('update public.vendor_store_rollout set app_enabled=false;');
  for (const id of users) checked(await admin.auth.admin.deleteUser(id));
  assert.deepEqual(guard({ full: true }), before);
  report.fixturesRemovedAndEmptyGuardPassed = true;
  fs.writeFileSync(evidenceFile, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify(report));
