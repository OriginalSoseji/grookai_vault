import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertCollectorReleaseEnvironment} from '../../apps/web/src/lib/collectorRelease.mjs';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = require('typescript');
const root = fileURLToPath(new URL('../../', import.meta.url));
const scaleFlag = 'NEXT_PUBLIC_SQUARE_SCALE_LOCAL_TEST';
const otherModes = ['VENDOR_PILOT', 'COLLECTOR_FIXTURE_LAB', 'COLLECTOR_HOSTED_STAGING',
  'STOREFRONT_LOCAL_TEST', 'VENDOR_BATCH_LOCAL_TEST', 'COLLECTR_IMPORT_LOCAL_TEST',
  'RECEIPT_CLOUD_LOCAL_TEST', 'SALES_DESK_PRO_LOCAL_TEST', 'SALES_CART_LOCAL_TEST',
  'SALES_TRADE_LOCAL_TEST', 'SALES_PAYMENTS_LOCAL_TEST', 'RECEIPT_DELIVERY_LOCAL_TEST',
  'SQUARE_LOCAL_TEST', 'VENDOR_PRICING_LOCAL_TEST', 'SQUARE_ONBOARDING_LOCAL_TEST'];

function targetGuard(env) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../../apps/web/src/lib/collectorStaging.mjs', import.meta.url), 'utf8'),
    {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source, {exports, process: {env}, URL, Error, require: name => {
    assert.equal(name, './vendorPilot.mjs');
    return {vendorPilot: env.NEXT_PUBLIC_VENDOR_PILOT === 'true', VENDOR_PILOT_DATABASE: 'https://hrtbjchobencariqclab.supabase.co'};
  }});
  return exports.assertCollectorStagingTarget;
}

test('scale proof admits only its explicit existing full-size loopback lab', () => {
  const guard = targetGuard({[scaleFlag]: 'true'});
  assert.doesNotThrow(() => guard('http://127.0.0.1:55881'));
  for (const bad of ['http://localhost:55881', 'https://127.0.0.1:55881',
    'http://127.0.0.1:55880', 'http://127.0.0.1:54321', 'http://127.0.0.1:61841',
    'http://127.0.0.1:55901', 'http://user@127.0.0.1:55881',
    'http://127.0.0.1:55881/rest', 'http://127.0.0.1:55881?prod=1',
    'http://127.0.0.1:55881#x', 'https://ycdxbpibncqcchqiihfz.supabase.co']) assert.throws(() => guard(bad), bad);
  assert.throws(() => targetGuard({})('http://127.0.0.1:55881'));
  assert.throws(() => targetGuard({[scaleFlag]: 'false'})('http://127.0.0.1:55881'));
  assert.doesNotThrow(() => targetGuard({})('http://127.0.0.1:54321'));
  assert.throws(() => guard('http://127.0.0.1:55881', true));
  assert.throws(() => guard('http://127.0.0.1:55881', false, true));
});

for (const mode of otherModes) test('scale proof rejects mixed ' + mode, () => {
  assert.throws(() => targetGuard({[scaleFlag]: 'true', ['NEXT_PUBLIC_' + mode]: 'true'})('http://127.0.0.1:55881'));
});

const production = {GROOKAI_COLLECTOR_RELEASE_V1: 'true', VERCEL_ENV: 'production',
  VERCEL_PROJECT_ID: 'prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum', SUPABASE_URL: 'https://ycdxbpibncqcchqiihfz.supabase.co'};
test('production rejects the scale flag, including malformed activation values', () => {
  assert.doesNotThrow(() => assertCollectorReleaseEnvironment(production));
  assert.doesNotThrow(() => assertCollectorReleaseEnvironment({...production, [scaleFlag]: 'false'}));
  for (const value of ['true', '1', 'TRUE']) assert.throws(() => assertCollectorReleaseEnvironment({...production, [scaleFlag]: value}));
});

const bootstrap = {NEXT_PUBLIC_COLLECTOR_STAGING: 'true', [scaleFlag]: 'true',
  GROOKAI_DISABLE_TELEMETRY: '1', SUPABASE_URL: 'http://127.0.0.1:55881',
  SUPABASE_PUBLISHABLE_KEY: 'local-contract-public-key', NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:54490'};
for (const [name, change, valid] of [
  ['isolated development', {}, true],
  ['missing staging', {NEXT_PUBLIC_COLLECTOR_STAGING: 'false'}, false],
  ['read-only preview', {NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY: 'true'}, false],
  ['Vercel preview', {VERCEL_ENV: 'preview'}, false],
  ['Vercel production', {VERCEL: '1', VERCEL_ENV: 'production'}, false],
  ['telemetry enabled', {GROOKAI_DISABLE_TELEMETRY: '0'}, false],
  ['production activation', {GROOKAI_COLLECTOR_RELEASE_V1: 'true'}, false],
]) test('web bootstrap ' + (valid ? 'accepts ' : 'rejects ') + name, () => {
  const env = {...process.env};
  for (const key of Object.keys(env)) if (/SUPABASE|SQUARE|VERCEL|COLLECTOR|VENDOR_PILOT|SITE_URL|GROOKAI_COLLECTOR_RELEASE/.test(key)) delete env[key];
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    `await import(${JSON.stringify(new URL('../../apps/web/next.config.mjs', import.meta.url).href)});`],
  {env: {...env, ...bootstrap, ...change}, cwd: root + '/apps/web', encoding: 'utf8', timeout: 15000, windowsHide: true});
  assert.ifError(result.error);
  if (valid) assert.equal(result.status, 0, result.stderr);
  else assert.notEqual(result.status, 0);
});
