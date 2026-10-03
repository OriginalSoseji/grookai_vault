import test from 'node:test';
import assert from 'node:assert/strict';
import { bindClassicGeneratedRows, verifyClassicGeneratedRows } from '../../backend/catalog/pokemon_classic_generated_rows_v1.mjs';
import { applyClassicJournaledLocalQualification, assertClassicPendingReadback } from '../../backend/catalog/pokemon_classic_execution_journal_v2.mjs';

function fixture() {
  const lineage = Array.from({ length: 102 }, (_, i) => ({ discovery_id: `candidate-${i}`, product_id: 1000 + i,
    existing_raw_id: i < 81 ? String(9007199254740993n + BigInt(i)) : null }));
  const raw = lineage.map((r, i) => ({ discovery_id: r.discovery_id, product_id: String(r.product_id),
    raw_import_id: String(9007199254740993n + BigInt(i)), raw_id: String(9007199254740993n + BigInt(i)), raw_source: 'tcgcsv' }));
  const mappings = lineage.map((r, i) => ({ id: String(9007199254741993n + BigInt(i)), source: 'tcgcsv',
    external_id: `tcgcsv:23323:${r.product_id}`, card_print_id: `parent-${i}` }));
  const plan = { fingerprint: 'a'.repeat(64), lineage, ingress: { entries: lineage.slice(81).map(r => ({ candidate_id: r.discovery_id })) },
    tables: { external_mappings: mappings.map(({ id, ...rest }) => rest), card_prints: mappings.map(r => ({ id: r.card_print_id })) } };
  return { plan, raw, mappings };
}

test('whole102 generated bindings preserve bigint precision,81retained IDs and deterministic ordering', () => {
  const { plan, raw, mappings } = fixture(), result = bindClassicGeneratedRows(plan, raw, mappings);
  assert.equal(result.raw.length, 102); assert.equal(result.mappings.length, 102);
  assert.equal(result.raw.filter(r => r.new_ingress).length, 21);
  assert.ok(result.raw.every(r => typeof r.raw_import_id === 'string'));
  assert.deepEqual(bindClassicGeneratedRows(plan, raw.reverse(), mappings.reverse()), result);
});

test('generated binding rejects omissions, duplicates, source substitution and wrong product/parent', async t => {
  const cases = [
    ['raw omission', f => f.raw.pop(), /whole102_raw_bindings_required/],
    ['mapping omission', f => f.mappings.pop(), /whole102_mapping_bindings_required/],
    ['duplicate discovery', f => f.raw[1] = { ...f.raw[0] }, /duplicate_discovery_binding/],
    ['duplicate mapping', f => f.mappings[1] = { ...f.mappings[0] }, /duplicate_mapping_generated_id/],
    ['raw source', f => f.raw[0].raw_source = 'tcgplayer', /raw_source_identity_preserved/],
    ['product mismatch', f => f.raw[0].product_id = '9999', /raw_product_binding_mismatch/],
    ['retained ID drift', f => { f.raw[0].raw_import_id = '42'; f.raw[0].raw_id = '42'; }, /retained_raw_id_drift/],
    ['raw join drift', f => f.raw[0].raw_id = '42', /raw_join_identity_mismatch/],
    ['mapping parent', f => f.mappings[0].card_print_id = 'other', /mapping_parent_binding_mismatch/],
    ['mapping source', f => f.mappings[0].source = 'tcgplayer', /unexpected_or_ambiguous_mapping_binding/],
    ['wrong ingress classification', f => f.plan.ingress.entries.pop(), /retained_ingress_classification_mismatch/],
  ];
  for (const [name, mutate, pattern] of cases) await t.test(name, () => {
    const f = fixture(); mutate(f); assert.throws(() => bindClassicGeneratedRows(f.plan, f.raw, f.mappings), pattern);
  });
});

test('generated IDs reject JS numeric coercion, noncanonical decimals and int8 overflow', async t => {
  for (const id of [9007199254740992, '0', '-1', '01', '1e5', '9223372036854775808', null]) await t.test(String(id), () => {
    const f = fixture(); f.mappings[0].id = id;
    assert.throws(() => bindClassicGeneratedRows(f.plan, f.raw, f.mappings), /generated_id_/);
  });
});

test('independent generated-ID verification detects row replacement with unchanged source identity', async () => {
  const f = fixture(), expected = bindClassicGeneratedRows(f.plan, f.raw, f.mappings);
  const db = { query: async sql => ({ rows: sql.includes('external_discovery_candidates') ? f.raw : f.mappings }) };
  await verifyClassicGeneratedRows(db, f.plan, expected);
  f.mappings[0].id = '123';
  await assert.rejects(() => verifyClassicGeneratedRows(db, f.plan, expected), /generated_row_identity_drift/);
  f.mappings[0].id = expected.mappings.find(r => r.card_print_id === f.mappings[0].card_print_id).id;
  f.raw[101].raw_id = '456'; f.raw[101].raw_import_id = '456';
  await assert.rejects(() => verifyClassicGeneratedRows(db, f.plan, expected), /generated_row_identity_drift/);
});

test('missing or edited generated receipt fails before a database read', async () => {
  const f = fixture(), expected = bindClassicGeneratedRows(f.plan, f.raw, f.mappings);
  const db = { query: async () => { throw new Error('unexpected_database_read'); } };
  await assert.rejects(() => verifyClassicGeneratedRows(db, f.plan, undefined), /generated_row_receipt_required/);
  expected.raw[0].raw_import_id = '123';
  await assert.rejects(() => verifyClassicGeneratedRows(db, f.plan, expected), /generated_row_receipt_tamper/);
});

test('V2 journal retains the original production-host denial before database access', async () => {
  const db = { connectionParameters: { host: 'db.ycdxbpibncqcchqiihfz.supabase.co' }, query: async () => { throw new Error('unexpected_database_read'); } };
  await assert.rejects(() => applyClassicJournaledLocalQualification(db, {}, {}, {}, {}, {}), /local_journal_qualification_host_required/);
});

test('pre-COMMIT pending artifact anchors the database ledger ID and generated-row fingerprint', () => {
  const pending = { status: 'transaction_validated_commit_not_acknowledged', job_id: '9007199254740993', generated_rows_fingerprint: 'a'.repeat(64) };
  const result = { status: 'independently_verified_committed', job_id: pending.job_id, generated_rows_fingerprint: pending.generated_rows_fingerprint, retry_allowed: false };
  assertClassicPendingReadback(pending, result);
  assert.throws(() => assertClassicPendingReadback(pending, { ...result, job_id: '9007199254740994' }), /execution_ledger_identity_drift/);
  assert.throws(() => assertClassicPendingReadback(pending, { ...result, generated_rows_fingerprint: 'b'.repeat(64) }), /pending_generated_identity_drift/);
  assert.throws(() => assertClassicPendingReadback(pending, { ...result, status: 'independently_verified_absent' }), /independent_committed_readback_required/);
});
