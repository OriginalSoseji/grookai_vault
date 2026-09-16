import test from 'node:test';
import assert from 'node:assert/strict';
import { pokemonSealedHashV1 as hash } from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import { reconcilePokemonSealedSourceV1 as reconcile } from '../../backend/pricing/pokemon_sealed_source_reconciliation_v1.mjs';
const source = raw => ({ raw_payload: raw, payload_hash: hash(raw), source_active: true,
  product_id: raw.productId, category_id: raw.categoryId, group_id: raw.groupId, name: raw.name,
  clean_name: raw.cleanName, source_url: raw.url, image_url: raw.imageUrl,
  extended_data: raw.extendedData, presale_info: raw.presaleInfo });
function fixture() {
  const raw = { productId: 12, categoryId: 3, groupId: 2, name: 'Box', modifiedOn: '2026-09-01',
    extendedData: [{ name: 'CardText', value: 'Contains 9 booster packs.', displayName: 'Card Text' }] };
  const prior = source(raw), current = source({ ...raw, modifiedOn: '2026-09-16', extendedData: [
    ...raw.extendedData, { name: 'UPC', value: '0196214158801', displayName: 'UPC' }] });
  const mapping = { id: 'mapping', variant_id: 'variant', game_key: 'pokemon', source_provider: 'tcgplayer',
    mapping_status: 'exact_reviewed', source_payload_hash: prior.payload_hash,
    source_product_id: 12, source_category_id: 3, source_group_id: 2 };
  return { prior, current, mapping };
}
test('additive valid UPC and modification metadata preserve immutable mapping evidence', () => {
  const input = fixture(), copy = structuredClone(input), r = reconcile(input);
  assert.equal(r.classification, 'identity_preserved_metadata_only');
  assert.equal(r.added_source_fields.length, 1);
  assert.equal(r.mapping_write, false); assert.equal(r.publication_authority, false);
  assert.deepEqual(input, copy); assert.deepEqual(r, reconcile(input));
});
test('timestamp-only and unchanged sources are explicit', () => {
  const x = fixture(); x.current = source({ ...x.prior.raw_payload, modifiedOn: '2026-09-16' });
  assert.equal(reconcile(x).added_source_fields.length, 0);
  x.current = x.prior; assert.equal(reconcile(x).classification, 'unchanged');
});
test('name, contents, image, ownership, UPC replacement and unknown metadata changes fail closed', () => {
  for (const change of [r => r.name = 'Other Box', r => r.extendedData[0].value = 'Contains 3 packs.',
    r => r.imageUrl = 'other', r => r.categoryId = 1, r => r.newField = true,
    r => r.extendedData[1].value = '0196214158802', r => r.extendedData.push(r.extendedData[1])]) {
    const x = fixture(), raw = structuredClone(x.current.raw_payload); change(raw);
    x.current = source(raw); assert.throws(() => reconcile(x));
  }
  const x = fixture(); x.prior = x.current; x.mapping.source_payload_hash = x.prior.payload_hash;
  x.current = source({ ...x.current.raw_payload, extendedData: x.current.extended_data.slice(0, 1) });
  assert.throws(() => reconcile(x));
});
test('tampered raw/projection and unbound mappings fail', () => {
  for (const change of [x => x.current.raw_payload.name = 'Tampered', x => x.current.name = 'Tampered',
    x => x.mapping.source_payload_hash = 'bad', x => x.current.source_active = false,
    x => x.mapping.game_key = 'mtg']) {
    const x = fixture(); change(x); assert.throws(() => reconcile(x));
  }
});
