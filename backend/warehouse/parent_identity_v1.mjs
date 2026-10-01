import assert from 'node:assert/strict';

export const WAREHOUSE_PARENT_IDENTITY_VERSION = 'WAREHOUSE_PARENT_IDENTITY_V1';
const fields = ['set_id', 'set_code', 'game_id', 'identity_domain', 'variant_key', 'printed_identity_modifier'];
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);

// A canonical set's explicit domain is authority for the parent's language.
// Neither the worker's English-only scope nor a provider price bucket is a default.
export async function readWarehouseParentIdentity(client, {set_id, set_code, variant_key, printed_identity_modifier}, {lock = false} = {}) {
  assert.ok(uuid(set_id), 'warehouse_parent_set_id_required');
  assert.ok(typeof set_code === 'string' && set_code.length, 'warehouse_parent_set_code_required');
  assert.ok(variant_key === null || (typeof variant_key === 'string' && variant_key.length), 'warehouse_parent_variant_required');
  assert.ok(printed_identity_modifier === null || printed_identity_modifier === variant_key, 'warehouse_parent_modifier_mismatch');
  if (/_stamp(?:ed)?$/.test(variant_key ?? '')) {
    assert.equal(printed_identity_modifier, variant_key, 'warehouse_parent_stamp_modifier_required');
  }
  const {rows} = await client.query(`select s.id set_id, s.code set_code, s.game, s.identity_model,
    s.identity_domain_default identity_domain, g.id game_id
    from public.sets s join public.games g on g.code=s.game where s.id=$1
    ${lock ? 'for share of s,g' : ''}`, [set_id]);
  assert.equal(rows.length, 1, 'warehouse_parent_exact_set_required');
  const set = rows[0];
  assert.equal(set.set_code, set_code, 'warehouse_parent_set_code_drift');
  assert.equal(set.game, 'pokemon', 'warehouse_parent_game_unsupported');
  assert.equal(set.identity_domain, 'pokemon_eng_standard', 'warehouse_parent_language_unresolved');
  assert.equal(set.identity_model, 'standard', 'warehouse_parent_identity_model_unsupported');
  assert.ok(uuid(set.game_id), 'warehouse_parent_game_id_required');
  return {version: WAREHOUSE_PARENT_IDENTITY_VERSION, set_id, set_code, game_id: set.game_id,
    identity_domain: set.identity_domain, variant_key, printed_identity_modifier};
}

export async function assertWarehouseParentIdentity(client, frozen, target, options) {
  assert.ok(frozen, 'warehouse_parent_identity_missing_restage_required');
  assert.equal(frozen.version, WAREHOUSE_PARENT_IDENTITY_VERSION, 'warehouse_parent_identity_version');
  const live = await readWarehouseParentIdentity(client, target, options);
  assert.deepEqual(frozen, live, 'warehouse_parent_identity_drift_restage_required');
  return live;
}

export function assertWarehouseParentMutation(frozen, mutation) {
  assert.ok(frozen, 'warehouse_parent_identity_missing_restage_required');
  for (const key of fields) assert.equal(mutation[key], frozen[key], `warehouse_parent_mutation_mismatch:${key}`);
}

export async function verifyWarehouseParentIdentity(client, parentId, expected) {
  assert.ok(uuid(parentId), 'warehouse_parent_result_id_required');
  const {rows} = await client.query('select to_jsonb(p) parent from public.card_prints p where id=$1', [parentId]);
  assert.equal(rows.length, 1, 'warehouse_parent_readback_missing');
  const parent = rows[0].parent;
  for (const key of [...fields, 'name', 'number', 'gv_id', 'tcgplayer_id']) {
    assert.ok(Object.hasOwn(expected, key), `warehouse_parent_expected_field_missing:${key}`);
    assert.equal(parent[key], expected[key], `warehouse_parent_readback_mismatch:${key}`);
  }
  return {card_print_id: parentId, identity_domain: parent.identity_domain,
    printed_identity_modifier: parent.printed_identity_modifier, gv_id: parent.gv_id};
}
