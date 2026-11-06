import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const scriptPath = path.join(root, 'scripts', 'audits', 'tcgplayer_professor_program_catalog_repair_real_apply_v1.mjs');
const readbackScriptPath = path.join(root, 'scripts', 'audits', 'tcgplayer_professor_program_catalog_repair_post_apply_readback_v1.mjs');
const dryRunPath = path.join(root, 'docs', 'audits', 'tcgplayer_professor_program_catalog_repair_guarded_dry_run_20261031_v1.json');

test('Professor Program real apply is pinned to the approved package and exact scope', async () => {
  const [source, dryRun] = await Promise.all([
    fs.readFile(scriptPath, 'utf8'),
    fs.readFile(dryRunPath, 'utf8').then(JSON.parse),
  ]);
  assert.match(source, /EXPECTED_FINGERPRINT = '1203f252f7856cff512d85ff7d76eb45a9cf18e528166b53b519fb34a7c78820'/);
  assert.match(source, /EXPECTED_PRE_APPLY_HASH = 'aace12789875dc67ae402d6f34d4900e1b4c3b1f61b00857f3e67a6b86610ba6'/);
  assert.match(source, /Refusing durable write without --apply/);
  assert.match(source, /GROOKAI_APPROVED_PACKAGE_FINGERPRINT/);
  assert.equal(dryRun.targets.length, 6);
  assert.equal(dryRun.targets.filter((row) => row.operation === 'insert_parent_identity_child').length, 3);
  assert.equal(dryRun.targets.filter((row) => row.operation === 'repair_existing_parent_modifier').length, 3);
  assert.equal(dryRun.targets.some((row) => ['176638', '213516'].includes(row.source_product_id)), false);
});

test('Professor Program real apply cannot write mappings, prices, deletes, merges, or migrations', async () => {
  const source = await fs.readFile(scriptPath, 'utf8');
  assert.doesNotMatch(source, /insert\s+into\s+public\.external_mappings/i);
  assert.doesNotMatch(source, /update\s+public\.external_mappings/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.(?:price_observations|card_print_price_curves)/i);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
  assert.equal((source.match(/await client\.query\('commit'\)/g) ?? []).length, 1);
  assert.match(source, /migrations_created: false/);
  assert.match(source, /ordinary_base_parent_unchanged/);
});

test('Professor Program independent readback is transaction-read-only and preserves exclusions', async () => {
  const source = await fs.readFile(readbackScriptPath, 'utf8');
  assert.match(source, /begin read only/);
  assert.match(source, /\['176638', '213516'\]/);
  assert.doesNotMatch(source, /\binsert\s+into\b/i);
  assert.doesNotMatch(source, /\bupdate\s+public\./i);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
  assert.doesNotMatch(source, /await client\.query\('commit'\)/);
});
