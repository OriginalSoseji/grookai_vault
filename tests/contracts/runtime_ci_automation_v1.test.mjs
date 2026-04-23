import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('package command surface exposes the runtime automation commands', async () => {
  const packageJson = JSON.parse(
    await fs.readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );

  assert.equal(
    packageJson.scripts['grookai:preflight'],
    'node scripts/contracts/run_runtime_preflight_v1.mjs',
  );
  assert.equal(
    packageJson.scripts['contracts:runtime-health'],
    'node scripts/contracts/run_runtime_health_v1.mjs',
  );
  assert.equal(
    packageJson.scripts['contracts:quarantine-report'],
    'node scripts/contracts/run_quarantine_report_v1.mjs',
  );
  assert.equal(
    packageJson.scripts['contracts:deferred-report'],
    'node scripts/contracts/run_deferred_report_v1.mjs',
  );
  assert.match(packageJson.scripts['contracts:test'], /tests\/contracts\/\*\.test\.mjs/);
});

test('runtime protection workflow runs runtime health and focused contracts tests', async () => {
  const workflow = await fs.readFile(
    new URL('../../.github/workflows/contracts-runtime-protection.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /npm run contracts:runtime-health/);
  assert.match(workflow, /npm run contracts:test/);
});

test('drift gate workflow still runs the contracts drift audit automatically', async () => {
  const workflow = await fs.readFile(
    new URL('../../.github/workflows/contracts-drift-gate.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /npm run contracts:drift-audit/);
});
