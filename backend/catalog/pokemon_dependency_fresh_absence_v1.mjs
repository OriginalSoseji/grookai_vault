import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dependencyLookupQuery, readDependencyMetadata, EMPTY, LIMITS } from './pokemon_dependency_lookup_v1.mjs';

export const VERSION = 'POKEMON_DEPENDENCY_FRESH_ABSENCE_V1';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function freshAbsenceQuery(scope) {
  assert.deepEqual(scope.existing, [], 'fresh_only_scope_required');
  assert.equal(scope.pending_generated_ids, false, 'generated_ids_must_be_reconciled');
  dependencyLookupQuery(scope, scope.fresh);
  assert.ok(scope.fresh.length, 'nonempty_fresh_scope_required');
  return `select 1 present from "${scope.source_schema}"."${scope.source_table}" c where "${scope.source_columns[0]}"=any($1::${scope.type}[]) limit 1`;
}

// LIMIT bounds output, not work. Accept only a direct streaming index path;
// runtime statement/lock bounds still apply even when the estimate is small.
export function qualifyFreshAbsence(scope, metadata, explained) {
  freshAbsenceQuery(scope);
  const reasons = [], root = explained?.length === 1 ? explained[0]?.Plan : null;
  const scan = root?.Plans?.length === 1 ? root.Plans[0] : null;
  const column = scope.source_columns[0];
  const predicates = new Set([`(${column} IS NOT NULL)`, `("${column}" IS NOT NULL)`]);
  const indexes = metadata.indexes.filter(i => i.valid && i.ready && i.live && i.method === 'btree'
    && i.leading_column === column && !i.expression
    && (i.partial === false ? i.predicate == null : i.partial === true && predicates.has(i.predicate)));
  if (metadata.relkind !== 'r') reasons.push('ordinary_table_required');
  if (!indexes.length) reasons.push('valid_leading_btree_required');
  if (root?.['Node Type'] !== 'Limit' || root?.['Plan Rows'] !== 1
      || !scan || !['Index Scan', 'Index Only Scan'].includes(scan['Node Type'])
      || (scan.Plans?.length ?? 0) !== 0 || root?.Filter || scan?.Filter
      || root?.['One-Time Filter'] || scan?.['One-Time Filter']) reasons.push('direct_streaming_limit_index_required');
  if (scan?.['Relation Name'] !== scope.source_table || scan?.Schema !== scope.source_schema) reasons.push('exact_relation_required');
  if (!scan?.['Index Cond'] || !indexes.some(i => i.name === scan?.['Index Name'])) reasons.push('qualified_index_predicate_required');
  for (const cost of [root?.['Total Cost'], root?.['Startup Cost'], scan?.['Startup Cost']]) {
    if (!Number.isFinite(cost) || cost < 0 || cost > LIMITS.total_cost) reasons.push('bounded_streaming_cost_required');
  }
  // Child total rows/cost describe consuming the complete index stream, which
  // this query never requests. The general aggregate limits remain unchanged.
  return { qualified: !reasons.length, reasons: [...new Set(reasons)], runtime_qualified: false };
}

export async function inspectFreshAbsence(db, scope) {
  const sql = freshAbsenceQuery(scope), metadata = await readDependencyMetadata(db, scope);
  const explained = (await db.query('explain (format json, verbose true) ' + sql, [scope.fresh])).rows[0]['QUERY PLAN'];
  return { version: VERSION, ids_fingerprint: hash(scope.fresh), id_count: scope.fresh.length,
    query_fingerprint: hash(sql), metadata, explained, ...qualifyFreshAbsence(scope, metadata, explained),
    executed: false, production_apply_authority: false };
}

export async function assertFreshDependencyAbsence(db, scope) {
  const sql = freshAbsenceQuery(scope);
  const guard = (await db.query(`select (rolsuper or rolbypassrls) unrestricted,
    (select setting::bigint from pg_settings where name='statement_timeout') statement_ms,
    (select setting::bigint from pg_settings where name='lock_timeout') lock_ms
    from pg_roles where rolname=current_user`)).rows[0];
  assert.equal(guard?.unrestricted, true, 'unrestricted_dependency_reader_required');
  assert.ok(Number(guard.statement_ms) > 0 && Number(guard.statement_ms) <= 30000, 'bounded_statement_timeout_required');
  assert.ok(Number(guard.lock_ms) > 0 && Number(guard.lock_ms) <= 5000, 'bounded_lock_timeout_required');
  const inspection = await inspectFreshAbsence(db, scope);
  assert.ok(inspection.qualified, 'fresh_absence_unqualified:' + inspection.reasons.join(','));
  const result = await db.query(sql, [scope.fresh]);
  assert.equal(result.rowCount, 0, 'unexpected_fresh_dependency');
  assert.deepEqual(result.rows, [], 'unexpected_fresh_dependency');
  return { ...EMPTY };
}
