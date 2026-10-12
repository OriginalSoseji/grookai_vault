import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { assertPokemonTcgplayerVariantRepairPlanV1 } from
  '../../backend/pricing/pokemon_tcgplayer_variant_repair_plan_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AUTHORITY = path.join(ROOT, 'docs', 'audits', 'pricing',
  'pokemon_tcgplayer_variant_repair_20261012', 'batch_02', 'authority.json');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('Pokemon variant repair batch 02 is exact, evidence-bound, and non-executing', async () => {
  const authority = JSON.parse(await fs.readFile(AUTHORITY, 'utf8'));
  const result = assertPokemonTcgplayerVariantRepairPlanV1(authority);
  assert.equal(result.gym_rows, 4);
  assert.equal(result.mep_rows, 2);
  assert.equal(result.covered_price_observations, 6);
  assert.equal(result.execution_authorized, false);

  for (const evidence of authority.evidence.filter(row => !row.path.startsWith('artifacts/'))) {
    const bytes = await fs.readFile(path.join(ROOT, evidence.path));
    assert.equal(sha256(bytes), evidence.sha256, `evidence drift: ${evidence.path}`);
  }
});
