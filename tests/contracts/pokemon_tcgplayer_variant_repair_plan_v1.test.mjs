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
const REVIEWED_MEP = path.join(ROOT, 'docs', 'audits', 'pricing',
  'pokemon_tcgplayer_variant_repair_20261012', 'batch_02',
  'reviewed_mep_source_rows.json');
const MEP_PRODUCTS = path.join(ROOT, 'docs', 'audits', 'pricing',
  'pokemon_tcgplayer_identity_repair_20261012', 'batch_01', 'authority',
  'mep', 'sources', '24451-products.json');
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

  const reviewedMep = JSON.parse(await fs.readFile(REVIEWED_MEP, 'utf8'));
  const productBytes = await fs.readFile(MEP_PRODUCTS);
  const products = JSON.parse(productBytes);
  assert.equal(sha256(productBytes), reviewedMep.source_products.sha256);
  const planMepRows = authority.plan.mega_evolution_promo_finish_override.rows;
  const lineageFields = [
    'reviewed_source_product_sha256',
    'source_candidate_fingerprint',
    'mapping_gap_observation_id',
    'source_observation_id',
    'source_sync_run_id',
    'source_artifact_id',
    'source_artifact_hash',
    'source_price_row_identity',
    'source_row_hash',
    'source_observed_on',
  ];
  for (const reviewedRow of reviewedMep.rows) {
    const product = products.results.find(row =>
      row.productId === reviewedRow.source_product_id);
    assert.ok(product, `missing reviewed product ${reviewedRow.source_product_id}`);
    assert.equal(sha256(JSON.stringify(product)),
      reviewedRow.reviewed_source_product_sha256);
    const planRow = planMepRows.find(row =>
      row.source_product_id === reviewedRow.source_product_id);
    assert.ok(planRow, `missing plan row ${reviewedRow.source_product_id}`);
    assert.equal(planRow.reviewed_source_products_payload_sha256,
      reviewedMep.source_products.sha256);
    for (const field of lineageFields) {
      assert.equal(planRow[field], reviewedRow[field],
        `MEP lineage drift ${reviewedRow.source_product_id}:${field}`);
    }
  }

  const withoutEvidence = structuredClone(authority);
  withoutEvidence.evidence = [];
  assert.throws(() => assertPokemonTcgplayerVariantRepairPlanV1(withoutEvidence));

  const changedEvidence = structuredClone(authority);
  changedEvidence.evidence[0].sha256 = '0'.repeat(64);
  assert.throws(() => assertPokemonTcgplayerVariantRepairPlanV1(changedEvidence));

  const changedSourceLineage = structuredClone(authority);
  changedSourceLineage.plan.mega_evolution_promo_finish_override.rows[0]
    .source_row_hash = '0'.repeat(64);
  assert.throws(() => assertPokemonTcgplayerVariantRepairPlanV1(changedSourceLineage));
});
