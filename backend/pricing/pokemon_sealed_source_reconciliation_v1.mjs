import assert from 'node:assert/strict';
import { pokemonSealedHashV1 as hash } from './pokemon_sealed_world_v1.mjs';

export const POKEMON_SEALED_SOURCE_RECONCILIATION_V1 = 'POKEMON_SEALED_SOURCE_RECONCILIATION_V1';

function validGtin(value) {
  if (!/^(?:\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = [...value].map(Number);
  const sum = digits.slice(0, -1).reverse().reduce((n, d, i) => n + d * (i % 2 ? 1 : 3), 0);
  return (10 - sum % 10) % 10 === digits.at(-1);
}

function verifySource(row) {
  assert.equal(hash(row.raw_payload), row.payload_hash, 'Raw source hash mismatch');
  for (const [column, field] of Object.entries({ product_id: 'productId', category_id: 'categoryId',
    group_id: 'groupId', name: 'name', clean_name: 'cleanName', source_url: 'url',
    image_url: 'imageUrl', extended_data: 'extendedData', presale_info: 'presaleInfo' })) {
    assert.equal(hash(row[column] ?? null), hash(row.raw_payload[field] ?? null), `Source projection mismatch: ${column}`);
  }
  assert.ok([3, 85].includes(Number(row.category_id)), 'Wrong game source');
  assert.equal(row.source_active, true, 'Inactive source');
}

export function reconcilePokemonSealedSourceV1({ prior, current, mapping }) {
  verifySource(prior); verifySource(current);
  assert.equal(mapping.game_key, 'pokemon');
  assert.equal(mapping.source_provider, 'tcgplayer');
  assert.equal(mapping.mapping_status, 'exact_reviewed');
  assert.equal(mapping.source_payload_hash, prior.payload_hash, 'Unbound historical receipt');
  for (const field of ['product_id', 'category_id', 'group_id']) {
    assert.equal(Number(prior[field]), Number(current[field]), 'Source ownership changed');
    assert.equal(Number(mapping[`source_${field}`]), Number(current[field]), 'Mapping ownership changed');
  }
  const before = structuredClone(prior.raw_payload), after = structuredClone(current.raw_payload);
  const oldExtended = before.extendedData ?? [], newExtended = after.extendedData ?? [];
  for (const list of [oldExtended, newExtended]) {
    assert.ok(Array.isArray(list));
    assert.equal(new Set(list.map(r => r.name)).size, list.length, 'Ambiguous source fields');
  }
  const added = newExtended.filter(r => !oldExtended.some(p => p.name === r.name));
  assert.ok(added.length <= 1, 'Unreviewed source field additions');
  for (const row of added) {
    assert.equal(row.name, 'UPC', 'Only additive UPC evidence is supported');
    assert.equal(row.displayName, 'UPC');
    assert.deepEqual(Object.keys(row).sort(), ['displayName', 'name', 'value']);
    assert.ok(validGtin(row.value), 'Invalid GTIN checksum');
  }
  assert.equal(hash(newExtended.filter(r => !added.includes(r))), hash(oldExtended), 'Existing source fields changed');
  delete before.modifiedOn; delete after.modifiedOn;
  delete before.extendedData; delete after.extendedData;
  assert.equal(hash(before), hash(after), 'Product identity or source fields changed');
  const receipt = { version: POKEMON_SEALED_SOURCE_RECONCILIATION_V1,
    source_product_id: Number(current.product_id), source_category_id: Number(current.category_id),
    source_group_id: Number(current.group_id), source_mapping_id: mapping.id, variant_id: mapping.variant_id,
    mapped_payload_hash: prior.payload_hash, current_payload_hash: current.payload_hash,
    preserved_product_projection_sha256: hash(before), preserved_extended_data_sha256: hash(oldExtended),
    added_source_fields: added, classification: prior.payload_hash === current.payload_hash ? 'unchanged' : 'identity_preserved_metadata_only',
    canonical_upc_write: false, mapping_write: false, publication_authority: false };
  return { ...receipt, fingerprint: hash(receipt) };
}
