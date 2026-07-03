import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const runnerSource = readFileSync('backend/pricing/pricing_job_runner_v1.mjs', 'utf8');

test('repo-root price import script routes to the authoritative pricing runner', () => {
  assert.equal(
    rootPackage.scripts['worker:import-prices'],
    'npm run pricing:worker:once --prefix backend',
  );
});

test('authoritative pricing runner spawns child worker from backend directory', () => {
  assert.match(runnerSource, /const BACKEND_DIR = resolve\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.'\);/);
  assert.match(runnerSource, /cwd: BACKEND_DIR/);
  assert.match(runnerSource, /'pricing\/ebay_browse_prices_worker\.mjs'/);
});
