import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertPokemonTcgplayerVariantRepairRehearsalV1,
  buildPokemonTcgplayerVariantRepairRehearsalV1,
} from '../../backend/pricing/pokemon_tcgplayer_variant_repair_rehearsal_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const load = async relative => JSON.parse(await fs.readFile(path.join(ROOT, relative), 'utf8'));

const AUTHORITY = 'docs/audits/pricing/pokemon_tcgplayer_variant_repair_20261012/batch_02/authority.json';
const REHEARSAL = 'docs/audits/pricing/pokemon_tcgplayer_variant_repair_20261012/batch_02/rehearsal.json';

function rebuildInputs(authority, rehearsal) {
  const products = new Map();
  for (const row of rehearsal.gym_rows) {
    products.set(row.source_binding_template.product_id, {
      product_id: row.source_binding_template.product_id,
      product_sha256: row.source_binding_template.source_product_sha256,
    });
  }
  return {
    authority,
    snapshot: structuredClone(rehearsal.snapshot_extract),
    snapshotSha256: rehearsal.evidence.production_snapshot_sha256,
    gymProducts: {
      source_payload_sha256: rehearsal.evidence.gym_source_products_sha256,
      rows: [...products.values()],
    },
    historicalGymIds: [...rehearsal.evidence.historical_gym_ids_forbidden],
  };
}

test('Pokemon variant repair rehearsal is reproducible, bounded, and non-publishing', async () => {
  const [authority, rehearsal] = await Promise.all([load(AUTHORITY), load(REHEARSAL)]);
  const verified = assertPokemonTcgplayerVariantRepairRehearsalV1(rehearsal);
  assert.equal(verified.covered_price_observations, 6);
  assert.equal(verified.production_database_writes, 0);
  assert.equal(verified.pricing_publication_writes, 0);

  const rebuilt = buildPokemonTcgplayerVariantRepairRehearsalV1(
    rebuildInputs(authority, rehearsal));
  assert.deepEqual(rebuilt, rehearsal);

  const allocated = rehearsal.gym_rows.flatMap(row => [
    row.card_print.id,
    row.card_printing.id,
  ]);
  assert.equal(new Set(allocated).size, 8);
  assert.ok(allocated.every(id =>
    !rehearsal.evidence.historical_gym_ids_forbidden.includes(id)));
  assert.ok(rehearsal.gym_rows.every(row =>
    row.card_print_identity.identity_payload.variant_key_current ===
      row.card_print.printed_identity_modifier &&
    row.source_binding_template.publishable === false &&
    row.source_binding_template.app_visible === false &&
    row.source_binding_template.market_truth === false));
  assert.ok(rehearsal.mep_assignment_rows.every(row =>
    row.source_finish_hint === 'Normal' && row.assigned_finish_key === 'holo'));
  assert.ok(rehearsal.combined_read_only_price_evaluation.every(row =>
    row.current_runtime_publish_ready === false &&
    row.current_runtime_status.startsWith('held_')));
});

test('Pokemon variant repair rehearsal rejects source and canonical drift', async () => {
  const [authority, rehearsal] = await Promise.all([load(AUTHORITY), load(REHEARSAL)]);

  const changedObservation = rebuildInputs(authority, rehearsal);
  changedObservation.snapshot.current_observations[0].payload_hash = '0'.repeat(64);
  assert.throws(() => buildPokemonTcgplayerVariantRepairRehearsalV1(changedObservation),
    /drift|Expected values/);

  const changedRun = rebuildInputs(authority, rehearsal);
  changedRun.snapshot.current_observations[0].last_seen_run_id =
    '00000000-0000-0000-0000-000000000000';
  assert.throws(() => buildPokemonTcgplayerVariantRepairRehearsalV1(changedRun),
    /drift|Expected values/);

  const changedTarget = rebuildInputs(authority, rehearsal);
  changedTarget.snapshot.mep_targets[0].finish_key = 'normal';
  assert.throws(() => buildPokemonTcgplayerVariantRepairRehearsalV1(changedTarget),
    /MEP target drift/);

  const changedSnapshotHash = rebuildInputs(authority, rehearsal);
  changedSnapshotHash.snapshotSha256 = '0'.repeat(64);
  assert.throws(() => buildPokemonTcgplayerVariantRepairRehearsalV1(changedSnapshotHash),
    /production snapshot hash drift/);

  const changedProduct = rebuildInputs(authority, rehearsal);
  changedProduct.gymProducts.rows[0].product_sha256 = '0'.repeat(64);
  assert.throws(() => buildPokemonTcgplayerVariantRepairRehearsalV1(changedProduct),
    /Gym source product drift/);

  const changedHistory = rebuildInputs(authority, rehearsal);
  changedHistory.historicalGymIds[0] = '00000000-0000-0000-0000-000000000000';
  assert.throws(() => buildPokemonTcgplayerVariantRepairRehearsalV1(changedHistory));
});
