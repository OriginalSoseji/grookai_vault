import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { assertMasterMappingBatchAuthority } from '../../backend/pricing/master_index_mapping_authority_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BATCH = path.join(ROOT, 'docs', 'audits', 'pricing',
  'pokemon_tcgplayer_identity_repair_20261012', 'batch_01');
const EXPECTED_PRODUCTS = [85720, 85721, 214239, 654596, 654598];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('Pokémon identity repair batch 01 is immutable, reviewed, and non-executing', async () => {
  const selectedBytes = await fs.readFile(path.join(BATCH, 'plan', 'candidates.jsonl'));
  const selected = selectedBytes.toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
  const authorityBytes = await fs.readFile(path.join(BATCH, 'package', 'master_authority.json'));
  const authority = JSON.parse(authorityBytes);
  const receipt = JSON.parse(await fs.readFile(path.join(BATCH, 'package', 'receipt.json'), 'utf8'));

  assert.deepEqual(selected.map(row => Number(row.source_product_id)), EXPECTED_PRODUCTS);
  assert.equal(selected.reduce((sum, row) => sum + row.supporting_gap_row_count, 0), 7);
  assert.equal(sha256(selectedBytes), '2c6854328b6533c2c792a0f49f9d1806fa27a68a2e9195502433e1abd308cb76');
  assert.equal(sha256(authorityBytes), 'bdc16ba4bf7a6ece6c011400d166f021a0ade1af8e8389e32f2cef612f14d176');
  const proof = assertMasterMappingBatchAuthority(selected, authority);
  assert.equal(proof.fingerprint, 'ebbf7848ee4f37e51380779f541b1678e1e3ea52b222064b9e3726898226156b');
  assert.equal(proof.bindings.length, 5);
  assert.equal(proof.execution_authorized, false);
  assert.equal(receipt.execution_authorized, false);
  assert.equal(receipt.database_writes, 0);
  assert.equal(receipt.selected_count, 5);
  assert.equal(receipt.scope_count, 3);
});
