import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflow = readFileSync(
  path.join(ROOT, '.github', 'workflows', 'tcgplayer-market-full-scope-shadow.yml'),
  'utf8',
);

test('full-scope workflow is manual and frozen to the dispatch SHA', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /EXPECTED_COMMIT_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /--expected-commit-sha=/);
});

test('full-scope workflow is shadow-only and has no publication limit', () => {
  assert.match(workflow, /SCHEDULE_MODE: shadow/);
  assert.match(workflow, /--mode=shadow/);
  assert.match(workflow, /Publication activation: \\`false\\`/);
  assert.match(workflow, /PUBLICATION_LIMIT:-/);
  assert.doesNotMatch(workflow, /--mode=production/);
  assert.doesNotMatch(workflow, /--publication-limit=/);
  assert.doesNotMatch(workflow, /REPLACEMENT_VERIFIED:\s*['"]?1/);
});

test('full-scope workflow preserves artifacts even when a phase fails', () => {
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /scheduled_summary\.json/);
  assert.match(workflow, /pipeline_state\.json/);
  assert.match(workflow, /upload-artifact@v4/);
});

