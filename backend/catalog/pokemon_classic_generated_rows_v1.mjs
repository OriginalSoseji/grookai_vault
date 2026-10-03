import assert from 'node:assert/strict';
import { printingManifestHash as hash } from './printing_completeness_gate_v1.mjs';

export const VERSION = 'POKEMON_CLASSIC_GENERATED_ROWS_V1';
const sort = (rows, key) => [...rows].sort((a, b) => a[key].localeCompare(b[key]));
const decimalId = value => {
  // pg int8 is text. Never round a generated ID through a JavaScript Number.
  assert.equal(typeof value, 'string', 'generated_id_decimal_string_required');
  assert.match(value, /^[1-9][0-9]*$/, 'generated_id_positive_decimal_required');
  assert.ok(BigInt(value) <= 9223372036854775807n, 'generated_id_bigint_range');
  return value;
};

export function bindClassicGeneratedRows(plan, discoveryRows, mappingRows) {
  assert.equal(plan.lineage.length, 102, 'whole102_lineage_required');
  assert.equal(discoveryRows.length, 102, 'whole102_raw_bindings_required');
  assert.equal(mappingRows.length, 102, 'whole102_mapping_bindings_required');
  const raw = sort(discoveryRows.map(row => {
    const expected = plan.lineage.filter(r => r.discovery_id === row.discovery_id);
    assert.equal(expected.length, 1, 'unexpected_or_ambiguous_discovery_binding');
    const target = expected[0];
    assert.equal(row.product_id, String(target.product_id), 'raw_product_binding_mismatch');
    assert.equal(row.raw_source, 'tcgcsv', 'raw_source_identity_preserved');
    assert.equal(row.raw_import_id, row.raw_id, 'raw_join_identity_mismatch');
    const id = decimalId(row.raw_import_id);
    const fresh = plan.ingress.entries.some(e => e.candidate_id === row.discovery_id);
    assert.equal(fresh, target.existing_raw_id === null, 'retained_ingress_classification_mismatch');
    if (!fresh) assert.equal(id, String(target.existing_raw_id), 'retained_raw_id_drift');
    return { product_id: row.product_id, discovery_id: row.discovery_id, raw_import_id: id, new_ingress: fresh };
  }), 'discovery_id');
  assert.equal(new Set(raw.map(r => r.discovery_id)).size, 102, 'duplicate_discovery_binding');
  assert.equal(new Set(raw.map(r => r.raw_import_id)).size, 102, 'duplicate_raw_binding');
  assert.equal(raw.filter(r => r.new_ingress).length, 21, 'exact21_new_raw_bindings_required');
  const mappings = sort(mappingRows.map(row => {
    const expected = plan.tables.external_mappings.filter(r => r.external_id === row.external_id && r.source === row.source);
    assert.equal(expected.length, 1, 'unexpected_or_ambiguous_mapping_binding');
    assert.equal(row.card_print_id, expected[0].card_print_id, 'mapping_parent_binding_mismatch');
    assert.equal(row.source, 'tcgcsv', 'mapping_source_identity_preserved');
    return { id: decimalId(row.id), source: row.source, external_id: row.external_id, card_print_id: row.card_print_id };
  }), 'external_id');
  assert.equal(new Set(mappings.map(r => r.id)).size, 102, 'duplicate_mapping_generated_id');
  assert.equal(new Set(mappings.map(r => r.external_id)).size, 102, 'duplicate_mapping_binding');
  const body = { version: VERSION, canonical_fingerprint: plan.fingerprint, raw, mappings };
  return { ...body, fingerprint: hash(body) };
}

export async function readClassicGeneratedRows(db, plan) {
  const raw = (await db.query(`select c.id::text discovery_id,c.tcgplayer_id::text product_id,
    c.raw_import_id::text raw_import_id,r.id::text raw_id,r.source raw_source
    from public.external_discovery_candidates c join public.raw_imports r on r.id=c.raw_import_id
    where c.id=any($1::uuid[]) order by c.id`, [plan.lineage.map(r => r.discovery_id)])).rows;
  const mappings = (await db.query(`select id::text,source,external_id,card_print_id::text
    from public.external_mappings where card_print_id=any($1::uuid[]) order by external_id,id`,
  [plan.tables.card_prints.map(r => r.id)])).rows;
  return bindClassicGeneratedRows(plan, raw, mappings);
}

export async function verifyClassicGeneratedRows(db, plan, expected) {
  assert.ok(expected && typeof expected === 'object', 'generated_row_receipt_required');
  const { fingerprint, ...body } = expected;
  assert.equal(fingerprint, hash(body), 'generated_row_receipt_tamper');
  assert.deepEqual(await readClassicGeneratedRows(db, plan), expected, 'generated_row_identity_drift');
}
