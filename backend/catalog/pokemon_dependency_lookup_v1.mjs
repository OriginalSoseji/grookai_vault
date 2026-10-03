import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const VERSION = 'POKEMON_DEPENDENCY_LOOKUP_V1';
export const LIMITS = Object.freeze({ ids: 1024, table_bytes: 1048576, total_cost: 20000, estimated_rows: 65536 });
const quote = s => '"' + s.replaceAll('"', '""') + '"';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const EMPTY = Object.freeze({ count: '0', digest: createHash('sha256').update('').digest('hex') });

export function dependencyLookupQuery(scope, ids) {
  for (const name of [scope.source_schema, scope.source_table, ...scope.source_columns]) {
    assert.equal(typeof name, 'string'); assert.match(name, /^[a-z_][a-z0-9_]*$/, 'unsupported_dependency_identifier');
  }
  assert.equal(scope.source_columns.length, 1, 'single_dependency_column_required');
  assert.ok(['bigint', 'uuid'].includes(scope.type), 'unsupported_dependency_type');
  assert.ok(Array.isArray(ids) && ids.length <= LIMITS.ids, 'bounded_dependency_ids_required');
  assert.equal(new Set(ids).size, ids.length, 'duplicate_dependency_id');
  for (const id of ids) {
    assert.equal(typeof id, 'string', 'lossless_dependency_id_required');
    if (scope.type === 'bigint') {
      assert.match(id, /^(?:0|-?[1-9][0-9]*)$/);
      assert.ok(BigInt(id) >= -9223372036854775808n && BigInt(id) <= 9223372036854775807n, 'dependency_bigint_overflow');
    } else assert.match(id, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  }
  return `select count(*)::text count,
    encode(sha256(convert_to(coalesce(string_agg(digest,'|' order by digest),''),'UTF8')),'hex') digest from
    (select encode(sha256(convert_to(to_jsonb(c)::text,'UTF8')),'hex') digest from
    ${quote(scope.source_schema)}.${quote(scope.source_table)} c where ${quote(scope.source_columns[0])}=any($1::${scope.type}[])) s`;
}

// EXPLAIN only, never ANALYZE. Physical table size including TOAST, not potentially stale relpages,
// determines whether a small unindexed fixture can be read. Such a result never
// qualifies the same access path at production scale.
export async function inspectDependencyLookup(db, scope, ids) {
  const sql = dependencyLookupQuery(scope, ids);
  assert.ok(ids.length, 'nonempty_lookup_qualification_required');
  const relation = `${quote(scope.source_schema)}.${quote(scope.source_table)}`;
  const metadata = await readDependencyMetadata(db, scope);
  const explained = (await db.query('explain (format json, verbose true) ' + sql, [ids])).rows[0]['QUERY PLAN'];
  const decision = qualifyDependencyLookup(scope, metadata, explained);
  return { version: VERSION, relation, column: scope.source_columns[0], id_count: ids.length,
    ids_fingerprint: hash(ids), query_fingerprint: hash(sql), metadata, explained, ...decision,
    explain_analyze: false, executed: false, production_apply_authority: false };
}

export async function readDependencyMetadata(db, scope) {
  dependencyLookupQuery(scope, []);
  const relation = `${quote(scope.source_schema)}.${quote(scope.source_table)}`;
  const metadata = (await db.query(`select c.relkind,c.relrowsecurity,c.relforcerowsecurity,
    pg_table_size(c.oid)::text table_bytes,
    (select coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'valid',i.indisvalid,
      'ready',i.indisready,'live',i.indislive,'method',am.amname,
      'leading_column',a.attname,'partial',i.indpred is not null,
      'predicate',pg_get_expr(i.indpred,i.indrelid,false),'expression',i.indexprs is not null)
      order by ic.relname),'[]'::jsonb)
     from pg_index i join pg_class ic on ic.oid=i.indexrelid join pg_am am on am.oid=ic.relam
     left join pg_attribute a on a.attrelid=c.oid and a.attnum=i.indkey[0]
     where i.indrelid=c.oid) indexes
    from pg_class c where c.oid=$1::regclass`, [relation])).rows[0];
  assert.ok(metadata, 'dependency_relation_missing');
  return metadata;
}

export function qualifyDependencyLookup(scope, metadata, explained) {
  const reasons = [], nodes = [];
  const visit = node => { assert.ok(node && typeof node === 'object', 'invalid_dependency_plan'); nodes.push(node); (node.Plans ?? []).forEach(visit); };
  assert.equal(explained?.length, 1, 'single_dependency_plan_required'); visit(explained[0].Plan);
  assert.match(metadata.table_bytes, /^\d+$/);
  const small = BigInt(metadata.table_bytes) <= BigInt(LIMITS.table_bytes);
  // The parameterized equality/ANY query rejects NULL for every accepted ID.
  // Admit only PostgreSQL's exact deparsed single-column IS NOT NULL predicate;
  // never normalize arbitrary SQL, infer implication from index names, or add a
  // filter to the aggregate. Inactive and all other referenced rows still count.
  const column = scope.source_columns[0];
  const nonnullPredicates = new Set([`(${column} IS NOT NULL)`, `(${quote(column)} IS NOT NULL)`]);
  const indexes = metadata.indexes.filter(i => i.valid && i.ready && i.live && i.method === 'btree'
    && i.leading_column === column && !i.expression
    && (i.partial === false ? i.predicate == null : i.partial === true && nonnullPredicates.has(i.predicate)));
  if (metadata.relkind !== 'r') reasons.push('ordinary_table_required');
  if (!small && indexes.length === 0) reasons.push('missing_valid_leading_btree_index');
  if (!Number.isFinite(nodes[0]['Total Cost']) || nodes[0]['Total Cost'] > LIMITS.total_cost) reasons.push('plan_cost_exceeds_bound');
  const permitted = new Set(['Aggregate', 'Sort', 'Incremental Sort', 'Gather', 'Gather Merge', 'Seq Scan', 'Index Scan', 'Index Only Scan', 'Bitmap Heap Scan', 'Bitmap Index Scan']);
  for (const node of nodes) {
    if (!permitted.has(node['Node Type'])) reasons.push('unsupported_plan_node:' + node['Node Type']);
    if (!Number.isFinite(node['Plan Rows']) || node['Plan Rows'] > LIMITS.estimated_rows) reasons.push('estimated_rows_exceed_bound');
    if (node['Relation Name'] && (node['Relation Name'] !== scope.source_table || node.Schema !== scope.source_schema)) reasons.push('unexpected_plan_relation');
    if (!small && node['Node Type'] === 'Seq Scan') reasons.push('large_sequential_scan');
    if (!small && ['Index Scan', 'Index Only Scan', 'Bitmap Index Scan'].includes(node['Node Type'])) {
      if (!indexes.some(i => i.name === node['Index Name']) || !node['Index Cond']) reasons.push('unqualified_index_access');
    }
  }
  if (!small && !nodes.some(n => n['Index Cond'] && indexes.some(i => i.name === n['Index Name']))) reasons.push('indexed_predicate_required');
  if (!nodes.some(n => n['Relation Name'] === scope.source_table)) reasons.push('relation_scan_required');
  return { qualified: reasons.length === 0, classification: small ? 'bounded_small_relation_only' : 'indexed_plan_within_bounds',
    reasons: [...new Set(reasons)], limits: LIMITS, runtime_qualified: false };
}

// The caller owns its transaction, RLS bypass check, source fence and bounded
// statement/lock timeouts. Reinspect every execution; do not cache a prior plan.
export async function measureDependencyLookup(db, scope, ids) {
  const sql = dependencyLookupQuery(scope, ids);
  if (!ids.length) return { ...EMPTY };
  const inspection = await inspectDependencyLookup(db, scope, ids);
  assert.ok(inspection.qualified, `dependency_lookup_unqualified:${inspection.relation}:${inspection.reasons.join(',')}`);
  return (await db.query(sql, [ids])).rows[0];
}
