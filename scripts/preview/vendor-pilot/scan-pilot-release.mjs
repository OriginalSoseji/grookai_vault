// One scoped alias switch, with immediate direct-origin proof and guarded rollback.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { root, out, verified, query } from './ops.mjs';

assert.equal(process.argv[2], 'release');
assert.equal(process.argv.length, 3);
const dir = path.join(root, '.local/integration/vendor-scan-release-20260926');
fs.mkdirSync(dir, { recursive: true });
const project = 'prj_6eeKXtBiLWciS3F2K7Usz8JhwDgy', team = 'team_EFKFYSau9Gf8wEaix8zXgQZG';
const deployment = 'dpl_9oyb6uwYpsjmcji52NSmoE5UhK3h', previous = 'dpl_F9id47NjSDscTwE2wx1F1gWpgGRR';
const qa = 'dpl_C6aSNWbDD4mesmMTNkpgJhgxaM4w', alias = 'grookai-vendor-preview.vercel.app';
const canonical = 'https://' + alias;
const read = relative => JSON.parse(fs.readFileSync(path.resolve(root, relative), 'utf8'));
const hash = relative => createHash('sha256').update(fs.readFileSync(path.resolve(root, relative))).digest('hex');
const token = read(path.join(process.env.APPDATA, 'com.vercel.cli/Data/auth.json')).token;
const resultFile = path.join(dir, 'release.json');
assert.ok(!fs.existsSync(resultFile), 'Reconcile the existing release receipt before retrying');
const report = { at: new Date().toISOString(), project, deployment, previous, alias, qa,
  status: 'preflight', productionChanges: 0, paymentActivation: false, schemaChanges: 0,
  environmentWrites: 0, acceptance: 'User-requested iOS Simulator functional proof; physical/native interaction limits retained' };
fs.writeFileSync(resultFile, JSON.stringify(report, null, 2), { flag: 'wx' });
const save = () => fs.writeFileSync(resultFile, JSON.stringify(report, null, 2) + '\n');
async function api(route, body) {
  const response = await fetch('https://api.vercel.com' + route + (route.includes('?') ? '&' : '?') + 'teamId=' + team, {
    method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000),
  });
  assert.ok(response.ok, 'Hosting request failed: HTTP ' + response.status);
  return response.json();
}
const retainedSql = `begin read only; select md5(jsonb_build_object(
 'copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),
 'profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),
 'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),
 'grants',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),
 'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events)
 )::text) as digest; rollback;`;
let attempted = false, client, cookie;
async function endpoint(origin, route, authenticated = true) {
  const response = await fetch(origin + route, { headers: authenticated ? { cookie } : {}, signal: AbortSignal.timeout(30000) });
  return { response, data: await response.json() };
}
async function accessCheck(origin) {
  const anon = await endpoint(origin, '/api/stores/owner/intake', false);
  assert.equal(anon.response.status, 401);
  const intake = await endpoint(origin, '/api/stores/owner/intake');
  assert.equal(intake.response.status, 200); assert.match(intake.response.headers.get('cache-control'), /no-store/);
  assert.equal(intake.data.recognition, true); assert.equal(intake.data.commit, true); assert.equal(intake.data.cancellation, true);
  const billing = await endpoint(origin, '/api/vendor-billing/owner');
  assert.equal(billing.response.status, 200);
  assert.deepEqual(billing.data, { enabled: false, checkoutEnabled: false, environment: null });
  const page = await fetch(origin + '/vendor-preview', { signal: AbortSignal.timeout(30000) });
  assert.equal(page.status, 200);
  return { anonymousDenied: true, intake: intake.data, billingDisabled: true, publicTrialEntryAvailable: true };
}
try {
  assert.equal((await verified()).id, 'hrtbjchobencariqclab');
  const simulatorPath = 'docs/audits/vendor_scan_simulator_328/PROOF_20260926.json';
  const simulator = read(simulatorPath);
  assert.equal(simulator.status, 'simulator_functional_checks_passed');
  assert.ok(simulator.retainedDataUnchanged && simulator.draftReload.passed);
  assert.equal(simulator.deployment, qa);
  assert.equal(simulator.webProofSha256, hash('docs/audits/vendor_scan_device_v32/PROOF_20260925.json'));
  report.simulatorProofSha256 = hash(simulatorPath);
  report.simulatorLimitations = simulator.limitations;
  const manifest = read('.local/integration/vendor-scan-hosted-v31-features/package.json');
  assert.equal(manifest.project, project); assert.equal(manifest.database, 'hrtbjchobencariqclab');
  for (const f of manifest.files) assert.equal(hash(path.join(manifest.dest, f.path)), f.sha256, 'Frozen package changed: ' + f.path);
  report.packageSha256 = hash('.local/integration/vendor-scan-hosted-v31-features/package.json');
  const intent = read('.local/integration/vendor-scan-hosted-v31-features/deploy-intent.json');
  assert.equal(intent.settings.GROOKAI_STORE_SCAN_FEATURES_V29_ENABLED, 'true');
  assert.equal(intent.settings.GROOKAI_STORE_SCAN_VISUAL_V26_ENABLED, 'false');
  const detail = await api('/v13/deployments/' + deployment);
  assert.equal(detail.projectId, project); assert.equal(detail.readyState, 'READY'); assert.equal(detail.target, null);
  const ready = read('.local/integration/vendor-scan-hosted-v31-features/ready.json');
  assert.equal('https://' + detail.url, ready.url); assert.equal(ready.id, deployment);
  const fallback = await api('/v13/deployments/' + previous);
  assert.equal(fallback.projectId, project); assert.equal(fallback.readyState, 'READY');
  assert.equal((await api('/v4/aliases/' + alias)).deploymentId, previous);
  assert.equal((await api('/v4/aliases/grookai-vendor-device-qa.vercel.app')).deploymentId, qa);
  const environment = await api('/v10/projects/' + project + '/env');
  const selected = environment.envs.filter(e => e.target?.includes('preview') && !e.gitBranch);
  const values = {};
  for (const entry of selected) {
    if (!['SUPABASE_URL', 'NEXT_PUBLIC_VENDOR_PILOT', 'NEXT_PUBLIC_COLLECTOR_STAGING', 'GROOKAI_DISABLE_TELEMETRY'].includes(entry.key) &&
        !entry.key.startsWith('STRIPE_') && !(entry.key.startsWith('GROOKAI_VENDOR_') && entry.key.endsWith('_ENABLED'))) continue;
    const value = await api('/v1/projects/' + project + '/env/' + entry.id);
    assert.equal(value.decrypted, true); values[entry.key] = value.value;
  }
  assert.equal(values.SUPABASE_URL, 'https://hrtbjchobencariqclab.supabase.co');
  assert.equal(values.NEXT_PUBLIC_VENDOR_PILOT, 'true'); assert.equal(values.NEXT_PUBLIC_COLLECTOR_STAGING, 'true');
  assert.equal(values.GROOKAI_DISABLE_TELEMETRY, '1');
  assert.ok(!Object.entries(values).some(([k,v]) => k.startsWith('STRIPE_') && v || k.startsWith('GROOKAI_VENDOR_') && k.endsWith('_ENABLED') && v === 'true'));
  report.environmentChecked = { database: 'hrtbjchobencariqclab', paymentsDisabled: true, telemetryDisabled: true };
  report.counts = await query('begin read only; select (select count(*) from card_prints) cards,(select count(*) from sets) sets,(select count(*) from card_print_traits) traits; rollback;');
  report.beforeDigest = (await query(retainedSql))[0].digest;
  const invitePath = path.join(out, 'review-invite.private.json');
  const inviteHash = hash(invitePath);
  const require = createRequire(path.join(root, 'apps/web/package.json'));
  const { createServerClient } = require('@supabase/ssr'), jar = new Map();
  const key = read(path.join(out, 'keys.private.json')).find(k => k.name === 'anon').api_key;
  client = createServerClient('https://hrtbjchobencariqclab.supabase.co', key, { cookies: {
    getAll: () => [...jar].map(([name,value]) => ({ name,value })), setAll: rows => rows.forEach(r => jar.set(r.name,r.value)),
  }});
  assert.equal((await client.auth.signInWithPassword(read(path.join(out, 'proof-accounts.private.json'))[2])).error, null);
  cookie = [...jar].map(([k,v]) => k + '=' + v).join('; ');
  report.beforeChecks = await accessCheck(ready.url); save();
  assert.equal((await api('/v4/aliases/' + alias)).deploymentId, previous);
  fs.writeFileSync(path.join(dir, 'alias-intent.json'), JSON.stringify({ at: new Date().toISOString(), project, alias, previous, deployment, rollback: previous }, null, 2), { flag: 'wx' });
  attempted = true;
  await api('/v2/deployments/' + deployment + '/aliases', { alias });
  assert.equal((await api('/v4/aliases/' + alias)).deploymentId, deployment);
  report.status = 'promoted_verifying'; save();
  console.log('Shared isolated-pilot alias switched; verifying direct origin.');
  report.afterChecks = await accessCheck(canonical); save();
  const invalid = await fetch(canonical + '/api/stores/owner/intake/match', { method: 'POST', headers: { cookie, Origin: 'https://grookai-vendor-device-qa.vercel.app', 'Content-Type': 'image/jpeg' }, body: 'invalid', signal: AbortSignal.timeout(30000) });
  assert.equal(invalid.status, 403); report.foreignQaOriginDenied = true;
  const browser = await promisify(execFile)(process.execPath, ['--use-system-ca', '--dns-result-order=ipv4first', 'scripts/preview/vendor-pilot/scan-pilot-release-browser.mjs'], { cwd: root, windowsHide: true, timeout: 240000, maxBuffer: 1024 * 1024 });
  fs.writeFileSync(path.join(dir, 'browser-run.log'), browser.stdout + browser.stderr, { flag: 'wx' });
  const browserFile = fs.readdirSync(dir).filter(f => /^browser-\d+\.json$/.test(f)).sort().at(-1);
  assert.ok(browserFile); const proof = read(path.join(dir, browserFile));
  assert.equal(proof.status, 'passed'); assert.ok(proof.retainedDataUnchanged && proof.draftDetailsVerified);
  assert.equal(proof.inventoryWrites, 0); assert.deepEqual(proof.blockedWrites, []);
  report.browser = { receipt: browserFile, sha256: hash(path.join(dir, browserFile)), steps: proof.steps, requests: proof.requests, draftDetailsVerified: true };
  report.afterDigest = (await query(retainedSql))[0].digest;
  assert.equal(report.afterDigest, report.beforeDigest); report.retainedDataUnchanged = true;
  assert.equal(hash(invitePath), inviteHash); report.inviteUnchanged = true;
  assert.equal((await api('/v4/aliases/' + alias)).deploymentId, deployment);
  assert.equal((await api('/v4/aliases/grookai-vendor-device-qa.vercel.app')).deploymentId, qa);
  report.qaAliasUnchanged = true; report.status = 'released_verified';
} catch (error) {
  report.status = 'failed'; report.error = error.message.split('\n')[0]; save();
  if (attempted) {
    try {
      const current = (await api('/v4/aliases/' + alias)).deploymentId;
      if (current === deployment) await api('/v2/deployments/' + previous + '/aliases', { alias });
      else assert.equal(current, previous, 'Alias belongs to another deployment; manual reconciliation required');
      assert.equal((await api('/v4/aliases/' + alias)).deploymentId, previous);
      report.rollbackVerified = true;
    } catch { report.rollbackVerified = false; report.rollbackNeedsReconciliation = true; }
  }
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString(); save();
  if (client) await client.auth.signOut({ scope: 'local' }).catch(() => {});
  console.log(JSON.stringify({ status: report.status, deployment, alias, error: report.error, rollbackVerified: report.rollbackVerified, retainedDataUnchanged: report.retainedDataUnchanged }));
}
