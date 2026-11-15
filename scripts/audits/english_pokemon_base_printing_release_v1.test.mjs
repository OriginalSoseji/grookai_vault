import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {assertMasterPrintingAuthority} from '../../backend/catalog/master_index_printing_authority_v1.mjs';
import {assertPrintingManifest} from '../../backend/catalog/printing_completeness_gate_v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const release = path.join(root, 'docs', 'audits', 'delta_reign_base_printing_release_v1');
const authority = path.join(release, 'authority_20261115_v1');

test('Delta Reign official projection proves only the 141-card base release', async () => {
  const source = JSON.parse(await fs.readFile(path.join(release, 'official_checklist_projection_v1.json')));
  assert.equal(source.collector_number_scope.count, 141);
  assert.equal(new Set(source.holo_numbers).size, 58);
  assert.deepEqual(source.expected_finish_counts, {normal: 83, holo: 58});
  assert.equal(source.tcgplayer_corroboration.reverse_holo_review_leads, 87);
  assert.equal(source.tcgplayer_corroboration.authority, false);
  assert.equal(source.boundaries.reverse_holo_authorized, false);
  assert.equal(source.boundaries.pricing_authorized, false);
  assert.equal(source.boundaries.visibility_activation_authorized, false);
});

test('Delta Reign manifest is source-bound, complete, and holds reverse leads', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(authority, 'manifest.json')));
  const artifactMap = JSON.parse(await fs.readFile(path.join(authority, 'artifact_map.json')));
  const artifacts = new Map();
  for (const entry of artifactMap) {
    artifacts.set(entry.ref, await fs.readFile(path.resolve(authority, entry.path)));
  }
  assertPrintingManifest(manifest);
  assertMasterPrintingAuthority(manifest, artifacts);
  assert.equal(manifest.authority.set_id, 'c72b4744-db4d-565f-9914-e28a2b244f5c');
  assert.equal(manifest.parents.length, 141);
  assert.equal(manifest.printings.length, 141);
  assert.equal(manifest.printings.filter(row => row.finish_key === 'normal').length, 83);
  assert.equal(manifest.printings.filter(row => row.finish_key === 'holo').length, 58);
  assert.equal(manifest.unresolved_variants.length, 87);
  assert.ok(manifest.unresolved_variants.every(row => row.scope === 'outside_base_release' &&
    row.status === 'needs_review'));
});
