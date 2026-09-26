import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../../', import.meta.url));
const normal = 'https://grookai-vendor-preview.vercel.app';
const qa = 'https://grookai-vendor-device-qa.vercel.app';
function run(overrides = {}, expression = "const m=await import('./apps/web/src/lib/vendorPilot.mjs');console.log(m.VENDOR_PILOT_ORIGIN)") {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/(SUPABASE|STRIPE|GROOKAI|NEXT_PUBLIC|SITE_URL|VERCEL|BRIDGE)/.test(k)));
  // Next's tracing resolves packages from its web working directory.
  const code = expression.includes('next.config.mjs') ? "process.chdir('./apps/web');" + expression : expression;
  return spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd, encoding: 'utf8', env: { ...clean, ...overrides } });
}
const environment = { NEXT_PUBLIC_VENDOR_PILOT: 'true', NEXT_PUBLIC_VENDOR_DEVICE_QA: 'true',
  NEXT_PUBLIC_COLLECTOR_STAGING: 'true', GROOKAI_DISABLE_TELEMETRY: '1', VERCEL_ENV: 'preview',
  NEXT_PUBLIC_SITE_URL: qa, SUPABASE_URL: 'https://hrtbjchobencariqclab.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'synthetic' };
test('normal builds keep the established origin; arbitrary origin env cannot select a host', () => {
  for (const env of [{}, { NEXT_PUBLIC_VENDOR_PILOT: 'true' }, { NEXT_PUBLIC_SITE_URL: 'https://attacker.invalid' }]) {
    const r = run(env); assert.equal(r.status, 0, r.stderr); assert.equal(r.stdout.trim(), normal);
  }
});
test('device build selects exactly one origin and requires pilot mode', () => {
  assert.equal(run(environment).stdout.trim(), qa);
  assert.notEqual(run({ NEXT_PUBLIC_VENDOR_DEVICE_QA: 'true' }).status, 0);
});
test('fully isolated device preview builds successfully', () => {
  const r = run(environment, "await import('./apps/web/next.config.mjs')"); assert.equal(r.status, 0, r.stderr);
});
for (const [name, change] of [
  ['shared origin', { NEXT_PUBLIC_SITE_URL: normal }],
  ['foreign origin', { NEXT_PUBLIC_SITE_URL: 'https://attacker.invalid' }],
  ['lookalike', { NEXT_PUBLIC_SITE_URL: qa + '.attacker.invalid' }],
  ['alternate origin conflict', { SITE_URL: normal }],
  ['production deployment', { VERCEL_ENV: 'production' }],
  ['missing deployment boundary', { VERCEL_ENV: '' }],
  ['production DB', { SUPABASE_URL: 'https://ycdxbpibncqcchqiihfz.supabase.co' }],
  ['telemetry', { GROOKAI_DISABLE_TELEMETRY: '0' }],
  ['payment credential', { STRIPE_SECRET_KEY: 'synthetic-forbidden' }],
]) test('device QA rejects ' + name, () => {
  const r = run({ ...environment, ...change }, "await import('./apps/web/next.config.mjs')"); assert.notEqual(r.status, 0);
});
