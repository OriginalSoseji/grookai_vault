// Sequential read-only CLI proof against the current guarded 220xx project.
// No reset, rollout, Stripe credential, provider request or alert destination.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { root, fixture, guard, hash } from '../schema/vendor_order_retry_final_runtime_v1.mjs';
const before = guard({ full: true });
const cfg = JSON.parse(execFileSync('supabase', ['status', '--workdir', fixture, '--output', 'json'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }));
assert.equal(cfg.API_URL, 'http://127.0.0.1:22021'); assert.ok(cfg.SECRET_KEY.startsWith('sb_secret_'));
const env = {}; for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP', 'USERPROFILE']) if (process.env[key]) env[key] = process.env[key];
const empty = path.join(fixture, 'commerce-empty.env'); fs.writeFileSync(empty, '');
Object.assign(env, { DOTENV_CONFIG_PATH: empty, SUPABASE_URL: cfg.API_URL, SUPABASE_SECRET_KEY: cfg.SECRET_KEY,
  STRIPE_PAYMENTS_MODE: 'test', STRIPE_BILLING_MODE: 'test', STRIPE_ACCOUNT_ID: 'acct_commerceLocalProof',
  NODE_OPTIONS: `--require=${path.join(root, 'scripts/tests/vendor_storefront_network_guard.cjs')}` });
const checks = [];
for (const lane of ['health', 'orders', 'billing']) {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', 'backend/payments/vendor_commerce_worker_v1.mjs', `--${lane}`], { cwd: root, env, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(result.error, undefined); assert.equal(result.status, 1);
  assert.ok(!result.stdout.includes(cfg.SECRET_KEY) && !result.stderr.includes(cfg.SECRET_KEY));
  if (lane === 'health') {
    const parsed = result.stdout.split(/\r?\n/).filter(line => line.startsWith('{')).map(JSON.parse).find(item => item.worker === 'vendor-commerce-v1');
    assert.equal(parsed.healthy, false); assert.deepEqual(parsed.lanes.orders.alerts, ['disabled', 'not_started']); assert.deepEqual(parsed.lanes.billing.alerts, ['not_started']);
    checks.push('actual CLI queries both guarded local health RPCs without a Stripe credential and returns unhealthy for disabled/unstarted services');
  } else {
    assert.doesNotMatch(result.stdout, /supabase-backend/);
    checks.push(`actual ${lane} CLI rejects disabled processing before client construction`);
  }
}
assert.deepEqual(guard({ full: true }), before);
const report = { at: new Date().toISOString(), status: 'passed', project: before.project, checks, migrationCount: Object.keys(before.sourceHashes).length,
  runnerSha256: hash(fs.readFileSync(new URL(import.meta.url))), productionWrites: 0, providerRequests: 0, alertsSentExternally: 0, workersInstalled: 0 };
const output = path.join(root, 'docs/audits/vendor_commerce_operations_v1'); fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, `local-${report.at.replaceAll(/[:.]/g, '-')}.json`), JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify(report));
