import assert from 'node:assert/strict';
import { measureDependencyLookup } from './pokemon_dependency_lookup_v1.mjs';
import { TABLES } from './pokemon_classic_canonical_admission_v1.mjs';
import { printingManifestHash as hash } from './printing_completeness_gate_v1.mjs';
import { bindClassicGeneratedRows } from './pokemon_classic_generated_rows_v1.mjs';

export const VERSION = 'POKEMON_CLASSIC_DEPENDENCY_PRESERVATION_V1';
export const WRITE_TABLES = Object.freeze([...TABLES, 'raw_imports', 'external_discovery_candidates', 'ingestion_jobs'].sort());
const key = row => `${row.source_schema}.${row.source_table}.${row.constraint_name}`;
const seal = body => ({ ...body, fingerprint: hash(body) });
function unseal(value) {
  const { fingerprint, ...body } = value;
  assert.equal(fingerprint, hash(body), 'dependency_receipt_tamper');
  return body;
}

// Catalog attributes, not a regex over pg_get_constraintdef. Include NOT VALID
// constraints and every source schema; neither may silently disappear.
export async function readClassicInboundCatalog(db) {
  const rows = (await db.query(`select sn.nspname source_schema,s.relname source_table,
    k.conname constraint_name,tn.nspname target_schema,t.relname target_table,
    array(select a.attname::text from unnest(k.conkey) with ordinality x(n,i)
      join pg_attribute a on a.attrelid=k.conrelid and a.attnum=x.n order by x.i) source_columns,
    array(select a.attname::text from unnest(k.confkey) with ordinality x(n,i)
      join pg_attribute a on a.attrelid=k.confrelid and a.attnum=x.n order by x.i) target_columns,
    k.convalidated validated,k.condeferrable deferrable,k.condeferred deferred,
    pg_get_constraintdef(k.oid) definition
    from pg_constraint k join pg_class s on s.oid=k.conrelid
    join pg_namespace sn on sn.oid=s.relnamespace join pg_class t on t.oid=k.confrelid
    join pg_namespace tn on tn.oid=t.relnamespace
    where k.contype='f' and tn.nspname='public' and t.relname=any($1::text[])
    order by sn.nspname,s.relname,k.conname`, [WRITE_TABLES])).rows;
  return seal({ version: VERSION, write_tables: WRITE_TABLES, rows });
}

export function classicDependencyScopes(plan, catalog, generated = null, jobId = null) {
  unseal(plan);
  unseal(catalog);
  assert.equal(catalog.version, VERSION);
  assert.deepEqual(catalog.write_tables, WRITE_TABLES);
  assert.equal(plan.lineage.length, 102, 'whole102_dependency_scope_required');
  assert.equal(plan.ingress.entries.length, 21, 'whole21_ingress_scope_required');
  assert.equal(new Set(catalog.rows.map(key)).size, catalog.rows.length, 'duplicate_dependency_constraint');
  const retained = plan.lineage.filter(r => r.existing_raw_id !== null).map(r => String(r.existing_raw_id));
  assert.equal(retained.length, 81, 'exact81_retained_raw_required');
  assert.equal(new Set(retained).size, 81, 'duplicate_retained_raw');
  if (generated) {
    const body = unseal(generated);
    assert.equal(body.canonical_fingerprint, plan.fingerprint, 'generated_dependency_scope_mismatch');
    assert.equal(body.raw.length, 102);
    assert.equal(body.mappings.length, 102);
    assert.deepEqual(body.raw.filter(r => !r.new_ingress).map(r => r.raw_import_id).sort(), [...retained].sort());
    assert.equal(body.raw.filter(r => r.new_ingress).length, 21);
    assert.deepEqual(bindClassicGeneratedRows(plan, body.raw.map(r => ({ ...r, raw_id: r.raw_import_id,
      raw_source: 'tcgcsv' })), body.mappings), generated, 'exact_generated_dependency_bindings_required');
    assert.ok(typeof jobId === 'string' && /^[1-9][0-9]*$/.test(jobId), 'exact_ledger_id_required');
  } else assert.equal(jobId, null, 'generated_bindings_required_with_ledger');
  return catalog.rows.filter(r => !(r.source_schema === 'public' && WRITE_TABLES.includes(r.source_table))).map(row => {
    assert.equal(row.target_schema, 'public');
    assert.ok(WRITE_TABLES.includes(row.target_table), 'unexpected_dependency_target');
    assert.deepEqual(row.target_columns, ['id'], 'unqualified_dependency_key_shape');
    assert.equal(row.source_columns.length, 1, 'unqualified_dependency_key_shape');
    const generatedTarget = ['raw_imports', 'external_mappings', 'ingestion_jobs'].includes(row.target_table);
    let fresh;
    if (row.target_table === 'raw_imports') fresh = generated?.raw.filter(r => r.new_ingress).map(r => r.raw_import_id) ?? [];
    else if (row.target_table === 'external_mappings') fresh = generated?.mappings.map(r => r.id) ?? [];
    else if (row.target_table === 'ingestion_jobs') fresh = generated ? [jobId] : [];
    else if (row.target_table === 'external_discovery_candidates') fresh = plan.ingress.entries.map(r => r.candidate_id);
    else fresh = plan.tables[row.target_table].map(r => r.id);
    const existing = row.target_table === 'raw_imports' ? retained : [];
    const type = generatedTarget ? 'bigint' : 'uuid';
    for (const id of [...fresh, ...existing]) {
      assert.equal(typeof id, 'string', 'lossless_dependency_id_required');
      assert.match(id, type === 'bigint' ? /^[1-9][0-9]*$/ : /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
      if (type === 'bigint') assert.ok(BigInt(id) <= 9223372036854775807n);
    }
    assert.equal(new Set(fresh).size, fresh.length, 'duplicate_new_dependency_id');
    assert.ok(fresh.every(id => !existing.includes(id)), 'new_retained_dependency_overlap');
    return { ...row, type, fresh, existing, pending_generated_ids: generatedTarget && !generated };
  });
}

// Only aggregate counts and hashes leave the database, never dependency payloads
// (which can belong to collectors). Statement/lock timeouts are caller-owned.
export async function observeClassicDependencies(db, plan, catalog, generated = null, jobId = null) {
  const role = (await db.query('select rolbypassrls or rolsuper unrestricted from pg_roles where rolname=current_user')).rows[0];
  assert.equal(role?.unrestricted, true, 'unfiltered_dependency_reader_required');
  assert.deepEqual(await readClassicInboundCatalog(db), catalog, 'inbound_catalog_drift');
  const scopes = classicDependencyScopes(plan, catalog, generated, jobId), rows = [];
  for (const scope of scopes) {
    const measure = ids => measureDependencyLookup(db, scope, ids);
    const fresh = await measure(scope.fresh);
    assert.equal(fresh.count, '0', 'preexisting_or_unexpected_dependency:' + key(scope));
    rows.push({ key: key(scope), target: scope.target_table, validated: scope.validated,
      fresh_ids: scope.fresh.length, pending_generated_ids: scope.pending_generated_ids,
      fresh_references: fresh.count, retained: await measure(scope.existing) });
  }
  return seal({ version: VERSION, canonical_fingerprint: plan.fingerprint, catalog_fingerprint: catalog.fingerprint,
    generated_fingerprint: generated?.fingerprint ?? null, ledger_id: jobId, rows });
}

export function assertClassicDependenciesPreserved(before, after) {
  unseal(before); unseal(after);
  assert.equal(before.version, VERSION); assert.equal(after.version, VERSION);
  assert.equal(before.canonical_fingerprint, after.canonical_fingerprint, 'dependency_plan_drift');
  assert.equal(before.catalog_fingerprint, after.catalog_fingerprint, 'dependency_catalog_drift');
  assert.ok(after.generated_fingerprint && after.ledger_id, 'postwrite_generated_dependency_bindings_required');
  assert.equal(after.rows.length, before.rows.length, 'dependency_inventory_drift');
  for (let i = 0; i < before.rows.length; i++) {
    const a = before.rows[i], b = after.rows[i];
    assert.equal(a.key, b.key, 'dependency_inventory_drift');
    assert.equal(a.target, b.target, 'dependency_target_drift');
    assert.equal(a.validated, b.validated, 'dependency_validation_drift');
    assert.equal(b.pending_generated_ids, false, 'generated_dependency_gap');
    assert.equal(a.fresh_references, '0'); assert.equal(b.fresh_references, '0');
    assert.deepEqual(a.retained, b.retained, 'retained_dependency_changed:' + a.key);
    if (!a.pending_generated_ids) assert.equal(a.fresh_ids, b.fresh_ids, 'fixed_dependency_scope_drift');
  }
  return { status: 'outside_dependencies_preserved', checked_constraints: after.rows.length,
    full_application_replay: false, production_apply_authority: false };
}
