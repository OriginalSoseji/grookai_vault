import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('retired pricing source guard passes', () => {
  const output = execFileSync(
    process.execPath,
    ['scripts/ci/assert_retired_pricing_entrypoints.mjs'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.match(output, /health-only and database-free/);
});

test('all retired entrypoints return 200 only for health and 410 for legacy work', async () => {
  for (const relativePath of [
    'supabase/functions/import-prices/index.ts',
    'supabase/functions/import-prices-v3/index.ts',
    'supabase/functions/import-prices-bridge/index.ts',
  ]) {
    const moduleUrl = pathToFileURL(path.join(root, relativePath)).href;
    const { default: handler } = await import(moduleUrl);

    const healthResponse = await handler(new Request('https://local.test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'health', source: 'contract-test' }),
    }));
    const healthBody = await healthResponse.json();
    assert.equal(healthResponse.status, 200, `${relativePath} health status`);
    assert.equal(healthBody.ok, true, `${relativePath} health ok marker`);
    assert.equal(healthBody.mode, 'health', `${relativePath} health mode`);
    assert.equal(healthBody.pipeline, 'retired', `${relativePath} retired marker`);

    const legacyResponse = await handler(new Request('https://local.test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'run', limit: 1 }),
    }));
    const legacyBody = await legacyResponse.json();
    assert.equal(legacyResponse.status, 410, `${relativePath} legacy status`);
    assert.equal(
      legacyBody.reason,
      'legacy-pricing-pipeline-disabled',
      `${relativePath} disabled reason`,
    );
  }
});

test('GitHub automation never deploys retired pricing entrypoints', () => {
  const workflowPaths = fs
    .readdirSync(path.join(root, '.github/workflows'))
    .filter((name) => /\.ya?ml$/i.test(name));

  for (const name of workflowPaths) {
    const source = read(`.github/workflows/${name}`);
    assert.doesNotMatch(
      source,
      /supabase\s+functions\s+deploy\s+import-prices(?:-v3|-bridge)?/i,
      `${name} must not auto-deploy a retired pricing entrypoint`,
    );
  }
});

test('legacy auto-align workflows are manual disabled shims', () => {
  for (const relativePath of [
    '.github/workflows/auto-align-import-prices-bridge.yml',
    '.github/workflows/kick-auto-align-bridge.yml',
  ]) {
    const source = read(relativePath);
    assert.match(source, /LEGACY DISABLED/);
    assert.match(source, /if:\s*\$\{\{\s*false\s*\}\}/);
    assert.doesNotMatch(source, /^\s+(?:push|schedule):/m);
    assert.doesNotMatch(source, /contents:\s*write|SUPABASE_ACCESS_TOKEN|gh\s+workflow\s+run/i);
  }
});

test('canonical CI validates all retired sources without production write credentials', () => {
  const source = read('.github/workflows/prod-import-prices-validate.yml');

  assert.match(source, /assert_retired_pricing_entrypoints\.mjs/);
  assert.match(source, /retired_pricing_automation_v1\.test\.mjs/);
  assert.match(source, /supabase\/functions\/import-prices\/\*\*/);
  assert.match(source, /supabase\/functions\/import-prices-v3\/\*\*/);
  assert.match(source, /supabase\/functions\/import-prices-bridge\/\*\*/);
  assert.match(source, /scripts\/\*\*\/\*import\*prices\*/);
  assert.match(source, /scripts\/\*\*\/\*\.ps1/);
  assert.match(source, /supabase\/\*import_prices\*\.ps1/);
  assert.match(source, /\.github\/workflows\/\*\*/);
  assert.doesNotMatch(source, /BRIDGE_IMPORT_TOKEN|SUPABASE_SECRET_KEY|contents:\s*write/i);
});

test('live validator sends only an explicit health request and checks retired markers', () => {
  const source = read('.github/workflows/prod-import-prices-validate-edge.yml');

  assert.match(source, /mode\s*=\s*['"]health['"]/);
  assert.match(source, /pipeline\s*-ne\s*['"]retired['"]/);
  assert.match(source, /\.mode\s*-ne\s*['"]health['"]/);
  assert.doesNotMatch(source, /ping|BRIDGE_IMPORT_TOKEN|mode\s*=\s*['"]run['"]/i);
});

test('local validators use health mode without write-capable credentials', () => {
  for (const relativePath of [
    'scripts/backend/import_prices_health.mjs',
    'scripts/import_prices_health.mjs',
    'scripts/test_import_prices_health.ps1',
    'scripts/bridge_status.ps1',
  ]) {
    const source = read(relativePath);
    assert.match(source, /mode\s*[:=]\s*['"]health['"]/);
    assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|BRIDGE_IMPORT_TOKEN|mode\s*[:=]\s*['"]run['"]/i);
  }

  for (const relativePath of [
    'scripts/bridge_task_import_prices.ps1',
    'scripts/import_prices_health.ps1',
    'scripts/validate_import_prices_now.ps1',
  ]) {
    const source = read(relativePath);
    assert.match(source, /test_import_prices_health\.ps1/);
    assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|BRIDGE_IMPORT_TOKEN/i);
  }
});

test('obsolete repair automation is fail-closed', () => {
  for (const relativePath of [
    'scripts/auto_fix_import_prices.ps1',
    'scripts/bridge_token_doctor.ps1',
    'scripts/ci/align_until_proofs.ps1',
    'scripts/ci/bump_auto_align.ps1',
    'scripts/ci/realign_bridge_and_redeploy.ps1',
    'scripts/mint_import_token.ps1',
    'scripts/run_auto_fix.ps1',
    'scripts/session_sync_bridge_and_validate.ps1',
    'scripts/verify_repair_and_validate.ps1',
    'supabase/repair_import_prices_jwt.ps1',
  ]) {
    const source = read(relativePath);
    assert.match(source, /legacy-pricing-pipeline-disabled/);
    assert.doesNotMatch(source, /supabase\s+functions\s+deploy/i);
    assert.doesNotMatch(source, /gh\s+(?:workflow\s+run|secret\s+set)|git\s+push/i);
  }
});

test('the remaining manual deploy helper is guarded before invoking Supabase', () => {
  const source = read('supabase/deploy_import_prices_v3.ps1');
  const guardIndex = source.indexOf('assert_retired_pricing_entrypoints.mjs');
  const deployIndex = source.indexOf('supabase functions deploy import-prices-v3');

  assert.ok(guardIndex >= 0, 'manual deploy helper must invoke the source guard');
  assert.ok(deployIndex > guardIndex, 'source guard must run before deployment');
});
