import assert from 'node:assert/strict';
import { measureDependencyLookup } from './pokemon_dependency_lookup_v1.mjs';
import { projectionHash as hash } from './pokemon_world2010_identity_projection_v1.mjs';
import { assertWorld2010RelationshipExecution, reconcileWorld2010Relationships, assertWorld2010RelationshipPending } from './pokemon_world2010_relationship_execution_v1.mjs';

export const VERSION = 'POKEMON_WORLD2010_DEPENDENCY_PRESERVATION_V1';
export const WRITE_TABLES = Object.freeze(['card_print_identity', 'card_print_identity_source_evidence', 'external_discovery_candidates', 'external_mappings', 'ingestion_jobs', 'raw_imports']);
const seal = body => ({ ...body, fingerprint: hash(body) });
const unseal = value => { const { fingerprint, ...body } = value; assert.equal(fingerprint, hash(body), 'dependency_receipt_tamper'); return body; };
const key = r => `${r.source_schema}.${r.source_table}.${r.constraint_name}`;

export async function readWorld2010InboundCatalog(db) {
  const rows = (await db.query(`select sn.nspname source_schema,s.relname source_table,k.conname constraint_name,
    tn.nspname target_schema,t.relname target_table,
    array(select a.attname::text from unnest(k.conkey) with ordinality x(n,i)
      join pg_attribute a on a.attrelid=k.conrelid and a.attnum=x.n order by x.i) source_columns,
    array(select a.attname::text from unnest(k.confkey) with ordinality x(n,i)
      join pg_attribute a on a.attrelid=k.confrelid and a.attnum=x.n order by x.i) target_columns,
    k.convalidated validated,k.condeferrable deferrable,k.condeferred deferred,pg_get_constraintdef(k.oid) definition
    from pg_constraint k join pg_class s on s.oid=k.conrelid join pg_namespace sn on sn.oid=s.relnamespace
    join pg_class t on t.oid=k.confrelid join pg_namespace tn on tn.oid=t.relnamespace
    where k.contype='f' and tn.nspname='public' and t.relname=any($1::text[])
    order by sn.nspname,s.relname,k.conname`, [WRITE_TABLES])).rows;
  return seal({ version: VERSION, write_tables: WRITE_TABLES, rows });
}

function ids(values, type, retained = false) {
  for (const id of values) {
    assert.equal(typeof id, 'string', 'lossless_dependency_id_required');
    assert.match(id, type === 'bigint' ? (retained ? /^(?:0|-?[1-9][0-9]*)$/ : /^[1-9][0-9]*$/) : /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
    if (type === 'bigint') assert.ok(BigInt(id) >= -9223372036854775808n && BigInt(id) <= 9223372036854775807n, 'bigint_dependency_overflow');
  }
  assert.equal(new Set(values).size, values.length, 'duplicate_dependency_id');
  return [...values].sort();
}

export function world2010DependencyScopes(plan, catalog, generated = null) {
  unseal(plan); unseal(catalog);
  assert.equal(plan.version, 'POKEMON_WORLD2010_RELATIONSHIP_EXECUTION_V1');
  assert.equal(catalog.version, VERSION); assert.deepEqual(catalog.write_tables, WRITE_TABLES);
  assert.equal(new Set(catalog.rows.map(key)).size, catalog.rows.length, 'duplicate_dependency_constraint');
  const ingress = plan.input.ingress, snapshot = ingress.input.ingress_snapshot;
  assert.equal(plan.tables.card_print_identity.length, 92); assert.equal(ingress.entries.length, 83);
  assert.equal(snapshot.group_raw.length, 77); assert.equal(plan.input.projection_inputs.snapshot.historical_printing_raw.length, 13);
  const retained = ids([...snapshot.group_raw.map(r => r.id), ...plan.input.projection_inputs.snapshot.historical_printing_raw.map(r => r.id)], 'bigint', true);
  if (generated) {
    assert.equal(generated.status, 'verified'); assert.equal(generated.plan_fingerprint, plan.fingerprint, 'generated_plan_mismatch');
    assert.equal(generated.ingress.status, 'verified', 'generated_ingress_mismatch');
    assert.equal(generated.mappings.length, 92); assert.equal(generated.ingress.rows.length, 83);
    assert.deepEqual(generated.mappings.map(r => r.external_id).sort(), plan.tables.external_mappings.map(r => r.external_id).sort(), 'generated_mapping_scope_mismatch');
    assert.deepEqual(generated.ingress.rows.map(r => [r.product_id, r.candidate_id]).sort(), ingress.entries.map(r => [String(r.source.product_id), r.candidate_id]).sort(), 'generated_raw_scope_mismatch');
  }
  const fresh = {
    card_print_identity: ids(plan.tables.card_print_identity.map(r => r.id), 'uuid'),
    card_print_identity_source_evidence: ids(plan.tables.card_print_identity_source_evidence.map(r => r.id), 'uuid'),
    external_discovery_candidates: ids(ingress.entries.map(r => r.candidate_id), 'uuid'),
    external_mappings: ids(generated?.mappings.map(r => r.id) ?? [], 'bigint'),
    raw_imports: ids(generated?.ingress.rows.map(r => r.raw_import_id) ?? [], 'bigint'),
    ingestion_jobs: ids(generated ? [generated.ledger_id, generated.ingress.ledger_id] : [], 'bigint'),
  };
  assert.ok(fresh.raw_imports.every(id => !retained.includes(id)), 'new_retained_dependency_overlap');
  for (const row of catalog.rows) {
    assert.equal(row.target_schema, 'public'); assert.ok(WRITE_TABLES.includes(row.target_table), 'unexpected_dependency_target');
    assert.deepEqual(row.target_columns, ['id'], 'unqualified_dependency_key_shape');
    assert.equal(row.source_columns.length, 1, 'unqualified_dependency_key_shape');
  }
  return catalog.rows.filter(r => !(r.source_schema === 'public' && WRITE_TABLES.includes(r.source_table))).map(row => {
    const dynamic = ['raw_imports', 'external_mappings', 'ingestion_jobs'].includes(row.target_table);
    return { ...row, type: dynamic ? 'bigint' : 'uuid', fresh: fresh[row.target_table],
      existing: row.target_table === 'raw_imports' ? retained : [], pending_generated_ids: dynamic && !generated };
  });
}

// Never export collector/dependency payloads. Empty scopes have an exact empty
// aggregate, but every nonempty scope must query SQL with the caller's timeout.
export async function observeWorld2010Dependencies(db, plan, originals, catalog, generated = null) {
  assertWorld2010RelationshipExecution(plan, originals);
  const role = (await db.query('select rolbypassrls or rolsuper unrestricted from pg_roles where rolname=current_user')).rows[0];
  assert.equal(role?.unrestricted, true, 'unfiltered_dependency_reader_required');
  assert.deepEqual(await readWorld2010InboundCatalog(db), catalog, 'inbound_catalog_drift');
  if (generated) assertWorld2010RelationshipPending(generated, await reconcileWorld2010Relationships(db, plan));
  const rows = [];
  for (const scope of world2010DependencyScopes(plan, catalog, generated)) {
    const measure = values => measureDependencyLookup(db, scope, values);
    const newRows = await measure(scope.fresh);
    assert.equal(newRows.count, '0', 'unexpected_new_dependency:' + key(scope));
    rows.push({ key: key(scope), target: scope.target_table, fixed_scope: hash({ existing: scope.existing, fresh: scope.pending_generated_ids ? null : scope.fresh }),
      existing_scope: hash(scope.existing), fresh_ids: scope.fresh.length, pending_generated_ids: scope.pending_generated_ids,
      fresh_references: newRows.count, retained: await measure(scope.existing) });
  }
  return seal({ version: VERSION, plan_fingerprint: plan.fingerprint, catalog_fingerprint: catalog.fingerprint,
    generated_fingerprint: generated ? hash(generated) : null, rows });
}

export function assertWorld2010DependenciesPreserved(before, after) {
  unseal(before); unseal(after); assert.equal(before.version, VERSION); assert.equal(after.version, VERSION);
  assert.equal(before.plan_fingerprint, after.plan_fingerprint, 'dependency_plan_drift');
  assert.equal(before.catalog_fingerprint, after.catalog_fingerprint, 'dependency_catalog_drift');
  assert.ok(after.generated_fingerprint, 'postwrite_generated_dependencies_required');
  assert.equal(before.rows.length, after.rows.length, 'dependency_inventory_drift');
  for (let i = 0; i < before.rows.length; i++) {
    const a = before.rows[i], b = after.rows[i];
    assert.equal(a.key, b.key, 'dependency_inventory_drift'); assert.equal(a.target, b.target, 'dependency_target_drift');
    assert.equal(b.pending_generated_ids, false, 'generated_dependency_gap');
    assert.equal(a.existing_scope, b.existing_scope, 'retained_dependency_scope_drift');
    if (!a.pending_generated_ids) assert.equal(a.fixed_scope, b.fixed_scope, 'fixed_dependency_scope_drift');
    assert.equal(a.fresh_references, '0'); assert.equal(b.fresh_references, '0');
    assert.deepEqual(a.retained, b.retained, 'retained_dependency_changed:' + a.key);
  }
  return { status: 'world2010_outside_dependencies_preserved', checked_constraints: after.rows.length, production_apply_authority: false };
}
