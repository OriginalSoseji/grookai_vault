import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  RECONCILIATION_TABLES, RECONCILIATION_MIGRATIONS, sha256,
  reconcileKnownTableColumnOrderV1, classifyReconciledDiffV1,
} from '../../scripts/schema/column_order_reconciliation_v1.mjs';

function fixture() {
  const column = name => ({ name, dbtype: 'text', default: null, not_null: false, is_generated: false, collation: null });
  const tables = Object.fromEntries(RECONCILIATION_TABLES.map(key => [key, { relationtype: 'r', columns: { a: column('a'), b: column('b') }, rowsecurity: true }]));
  const replay = { tables, views: { view: { columns: { b: column('b'), a: column('a') } } }, functions: { fn: { definition: "select 'a\r\nb'" } } };
  const production = structuredClone(replay);
  for (const table of Object.values(production.tables)) table.columns = { b: table.columns.b, a: table.columns.a };
  return { replay, production };
}
test('only known ordinary table column maps are reordered, with metadata unchanged', () => {
  const { replay, production } = fixture();
  const before = structuredClone(replay);
  const changes = reconcileKnownTableColumnOrderV1(replay, production);
  assert.equal(changes.length, 3);
  for (const key of RECONCILIATION_TABLES) assert.deepEqual(Object.keys(replay.tables[key].columns), ['b', 'a']);
  assert.deepEqual(replay.views, before.views);
  assert.deepEqual(replay.functions, before.functions);
  assert.equal(replay.tables[RECONCILIATION_TABLES[0]].rowsecurity, true);
  assert.equal(reconcileKnownTableColumnOrderV1(replay, production).length, 0);
});
for (const [field, value] of Object.entries({ dbtype: 'uuid', default: "'wrong'", not_null: true, is_generated: true, collation: 'C', name: 'renamed' })) {
  test(`changed ${field} fails instead of being normalized`, () => {
    const { replay, production } = fixture();
    production.tables[RECONCILIATION_TABLES[0]].columns.a[field] = value;
    assert.throws(() => reconcileKnownTableColumnOrderV1(replay, production), /column_definition_changed/);
  });
}
test('missing tables, columns, and non-table objects fail', () => {
  for (const mutate of [
    p => { delete p.tables[RECONCILIATION_TABLES[0]]; },
    p => { delete p.tables[RECONCILIATION_TABLES[0]].columns.a; },
    p => { p.tables[RECONCILIATION_TABLES[0]].relationtype = 'v'; },
  ]) {
    const { replay, production } = fixture();
    mutate(production);
    assert.throws(() => reconcileKnownTableColumnOrderV1(replay, production));
  }
});
test('unknown tables and view output order remain untouched for the diff engine', () => {
  const { replay, production } = fixture();
  replay.tables.other = { relationtype: 'r', columns: { z: {}, a: {} } };
  reconcileKnownTableColumnOrderV1(replay, production);
  assert.deepEqual(Object.keys(replay.tables.other.columns), ['z', 'a']);
  assert.deepEqual(Object.keys(replay.views.view.columns), ['b', 'a']);
});
const dimensionSql = 'alter table "public"."sealed_product_image_evidence" drop constraint "sealed_product_image_evidence_dimension_check";\n\nalter table "public"."sealed_product_image_evidence" add constraint "sealed_product_image_evidence_dimension_check" CHECK ((((image_width IS NULL) AND (image_height IS NULL) AND (image_bytes IS NULL)) OR ((image_width > 0) AND (image_height > 0) AND (image_bytes > 0)))) not valid;\n\nalter table "public"."sealed_product_image_evidence" validate constraint "sealed_product_image_evidence_dimension_check";\n\n';
test('only the exact pending dimension delta is accepted, never as write authority', () => {
  const result = classifyReconciledDiffV1(dimensionSql, Object.keys(RECONCILIATION_MIGRATIONS));
  assert.equal(result.status, 'baseline_reconciled_pending_apply');
  assert.equal(result.database_apply_authorized, false);
});
test('changed constraints, permissions, functions, or view SQL cannot pass', () => {
  for (const extra of ['drop view public.a;', 'grant all on public.a to anon;', "create function public.x() returns text language sql as $$ select 'x' $$;"]) {
    assert.throws(() => classifyReconciledDiffV1(dimensionSql + extra, ['20260905120000']), /unexpected_schema_delta/);
  }
  assert.throws(() => classifyReconciledDiffV1(dimensionSql.replace('> 0', '>= 0'), ['20260905120000']));
});
test('pending IDs and absence of expected changes fail closed', () => {
  assert.throws(() => classifyReconciledDiffV1('', ['unexpected']));
  assert.throws(() => classifyReconciledDiffV1('', ['20260905120000']));
  assert.throws(() => classifyReconciledDiffV1(dimensionSql, []));
  assert.throws(() => classifyReconciledDiffV1('', ['20260907160000', '20260907160000']));
  assert.equal(classifyReconciledDiffV1('', []).status, 'baseline_reconciled');
});
test('pending migration sources remain fingerprint-bound', () => {
  for (const binding of Object.values(RECONCILIATION_MIGRATIONS)) {
    const source = readFileSync(new URL(`../../supabase/migrations/${binding.file}`, import.meta.url), 'utf8');
    assert.equal(sha256(source.replaceAll('\r\n', '\n')), binding.lf_sha256);
  }
});
test('read-only audit retains full overload signatures and checks additional security metadata', () => {
  const source = readFileSync(new URL('../../scripts/schema/audit_reconciled_public_schema_v1.mjs', import.meta.url), 'utf8');
  assert.match(source, /c\.relname::text name/);
  assert.match(source, /pg_get_function_identity_arguments\(p\.oid\)/);
  assert.match(source, /begin isolation level repeatable read read only/);
  assert.match(source, /assert\.deepEqual\(securityReplay, securityProduction/);
  assert.match(source, /forcerowsecurity/);
  assert.match(source, /p\.proacl/);
  assert.match(source, /a\.attacl/);
  assert.doesNotMatch(source, /migration\.apply\s*\(/);
  assert.match(source, /assert\.deepEqual\(replayLedger, sourceIds/);
});
