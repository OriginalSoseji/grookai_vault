import test from 'node:test';
import assert from 'node:assert/strict';
import { printingManifestHash as hash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import { bindClassicGeneratedRows } from '../../backend/catalog/pokemon_classic_generated_rows_v1.mjs';
import { VERSION, WRITE_TABLES, classicDependencyScopes, assertClassicDependenciesPreserved, observeClassicDependencies } from '../../backend/catalog/pokemon_classic_dependency_preservation_v1.mjs';

const seal = body => ({ ...body, fingerprint: hash(body) });
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture() {
  const lineage = Array.from({ length: 102 }, (_, i) => ({ discovery_id: uuid(i + 1), product_id: i + 1,
    existing_raw_id: i < 81 ? String(9007199254740993n + BigInt(i)) : null }));
  const raw = lineage.map((r, i) => ({ ...r, product_id: String(r.product_id), raw_source: 'tcgcsv',
    raw_import_id: String(9007199254740993n + BigInt(i)), raw_id: String(9007199254740993n + BigInt(i)) }));
  const mappings = lineage.map((r, i) => ({ id: String(9007199254741993n + BigInt(i)), source: 'tcgcsv', external_id: String(r.product_id), card_print_id: uuid(i + 1001) }));
  const plan = seal({ lineage, ingress: { entries: lineage.slice(81).map(r => ({ candidate_id: r.discovery_id })) },
    tables: { card_prints: mappings.map(r => ({ id: r.card_print_id })), external_mappings: mappings.map(({ id, ...r }) => r) } });
  const rows = ['card_prints', 'raw_imports', 'external_mappings', 'ingestion_jobs', 'external_discovery_candidates'].map((target_table, i) => ({
    source_schema: i === 1 ? 'private' : 'public', source_table: 'dependent', constraint_name: 'fk_' + i,
    target_schema: 'public', target_table, source_columns: ['target_id'], target_columns: ['id'], validated: i !== 0 }));
  const catalog = seal({ version: VERSION, write_tables: WRITE_TABLES, rows });
  return { plan, catalog, generated: bindClassicGeneratedRows(plan, raw, mappings) };
}

test('catalog scopes include other schemas and NOT VALID keys without rounding bigint IDs', () => {
  const f = fixture(), before = classicDependencyScopes(f.plan, f.catalog), after = classicDependencyScopes(f.plan, f.catalog, f.generated, '9007199254743993');
  assert.equal(before.length, 5); assert.equal(before.filter(r => r.pending_generated_ids).length, 3);
  assert.equal(before[0].validated, false); assert.equal(before[1].source_schema, 'private');
  assert.equal(before[1].existing[0], '9007199254740993');
  assert.deepEqual(after.map(r => r.fresh.length), [102, 21, 102, 1, 21]);
  assert.ok(after.every(r => !r.pending_generated_ids));
});

test('composite or alternate target keys block instead of disappearing from inventory', () => {
  for (const target_columns of [['id', 'source'], ['card_print_id']]) {
    const f = fixture(); f.catalog.rows[0].target_columns = target_columns;
    const { fingerprint, ...body } = f.catalog; f.catalog = seal(body);
    assert.throws(() => classicDependencyScopes(f.plan, f.catalog), /unqualified_dependency_key_shape/);
  }
});

test('catalog omission/tamper, partial scope, generated-ID replacement and ledger omission fail', async t => {
  for (const [name, change, pattern] of [
    ['catalog bytes', f => f.catalog.rows.pop(), /dependency_receipt_tamper/],
    ['lineage omitted', f => f.plan.lineage.pop(), /dependency_receipt_tamper/],
    ['retained binding', f => { f.generated.raw[0].raw_import_id = '42'; const { fingerprint, ...b } = f.generated; f.generated = seal(b); }, /Expected values/],
    ['wrong parent', f => { f.generated.mappings[0].card_print_id = uuid(9999); const { fingerprint, ...b } = f.generated; f.generated = seal(b); }, /mapping_parent_binding_mismatch/],
  ]) await t.test(name, () => {
    const f = fixture(); change(f);
    assert.throws(() => classicDependencyScopes(f.plan, f.catalog, f.generated, '99'), pattern);
  });
  const f = fixture(); assert.throws(() => classicDependencyScopes(f.plan, f.catalog, f.generated), /exact_ledger_id_required/);
});

test('retained dependencies require identical count and content, with exact catalog and generated bindings', () => {
  const body = { version: VERSION, canonical_fingerprint: 'a', catalog_fingerprint: 'b', generated_fingerprint: null, ledger_id: null,
    rows: [{ key: 'public.dependent.fk', target: 'raw_imports', validated: true, fresh_ids: 0, pending_generated_ids: true,
      fresh_references: '0', retained: { count: '1', digest: 'old-content' } }] };
  const before = seal(body), afterBody = structuredClone(body);
  Object.assign(afterBody, { generated_fingerprint: 'c', ledger_id: '99' });
  Object.assign(afterBody.rows[0], { fresh_ids: 21, pending_generated_ids: false });
  assert.equal(assertClassicDependenciesPreserved(before, seal(afterBody)).status, 'outside_dependencies_preserved');
  afterBody.rows[0].retained.digest = 'replacement-content';
  assert.throws(() => assertClassicDependenciesPreserved(before, seal(afterBody)), /retained_dependency_changed/);
  afterBody.rows[0].retained = structuredClone(body.rows[0].retained); afterBody.rows[0].pending_generated_ids = true;
  assert.throws(() => assertClassicDependenciesPreserved(before, seal(afterBody)), /generated_dependency_gap/);
  afterBody.rows[0].pending_generated_ids = false; afterBody.catalog_fingerprint = 'changed';
  assert.throws(() => assertClassicDependenciesPreserved(before, seal(afterBody)), /dependency_catalog_drift/);
});


test('empty pending ID sets return exact empty SHA256 aggregates without table scans', async () => {
  const f=fixture(), calls=[];
  const db={query:async (sql,params)=>{
    if(sql.includes('from pg_roles'))return{rows:[{unrestricted:true}]};
    if(sql.includes('from pg_constraint'))return{rows:f.catalog.rows};
    if(sql.startsWith('select c.relkind'))return{rows:[{relkind:'r',table_bytes:'0',indexes:[]}]};
    if(sql.startsWith('explain')){
      assert.ok(params[0].length>0,'empty ID plan must never reach PostgreSQL');
      return{rows:[{'QUERY PLAN':[{Plan:{'Node Type':'Seq Scan','Total Cost':1,'Plan Rows':1,
        'Relation Name':'dependent',Schema:sql.includes('"private"')?'private':'public'}}]}]};
    }
    assert.ok(params[0].length>0,'empty ID scan must never reach PostgreSQL');
    calls.push(params[0].length);return{rows:[{count:'0',digest:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}]};
  }};
  const receipt=await observeClassicDependencies(db,f.plan,f.catalog);
  assert.deepEqual(calls,[102,81,21]);
  assert.equal(receipt.rows.filter(r=>r.pending_generated_ids).length,3);
  assert.ok(receipt.rows.every(r=>r.fresh_references==='0'));
});

test('RLS-filtered dependency readers fail before inspecting tables', async () => {
  const f=fixture();let calls=0;
  const db={query:async()=>{calls++;return{rows:[{unrestricted:false}]};}};
  await assert.rejects(()=>observeClassicDependencies(db,f.plan,f.catalog),/unfiltered_dependency_reader_required/);
  assert.equal(calls,1);
});
