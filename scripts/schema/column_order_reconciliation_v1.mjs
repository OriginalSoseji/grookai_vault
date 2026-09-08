import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const COLUMN_ORDER_RECONCILIATION_V1 = 'COLUMN_ORDER_RECONCILIATION_V1';
export const RECONCILIATION_TABLES = Object.freeze([
  '"public"."card_prints"', '"public"."pricing_jobs"', '"public"."sets"',
]);
export const RECONCILIATION_MIGRATIONS = Object.freeze({
  '20260905120000': {
    file: '20260905120000_mtg_sealed_image_dimension_constraint_repair_v1.sql',
    lf_sha256: 'd98f08ba73afcac510b1ae052ac35b0747c34816018900c6dba006f497f3f30e',
  },
  '20260907160000': {
    file: '20260907160000_production_function_source_replay_reconciliation_v1.sql',
    lf_sha256: 'ebaf5677fd4a20357dcb67340aaa50f0f1f0aa361d60cc386f10d819cd636755',
  },
});
export const EXPECTED_PENDING_DIMENSION_DIFF_SHA256 = '8adf7031c9a2643f252a9ea88a466ae4ee205c4ef35f9c54a3dfa6d25e8d3c1d';
export const sha256 = text => createHash('sha256').update(text).digest('hex');
const data = value => JSON.parse(JSON.stringify(value));

// Mutates inspection objects only, never a database. Only the three investigated
// tables qualify; field definitions and view/function result order stay exact.
export function reconcileKnownTableColumnOrderV1(replay, production) {
  const changes = [];
  for (const key of RECONCILIATION_TABLES) {
    const a = replay.tables[key];
    const b = production.tables[key];
    assert.ok(a && b, `reconciliation_table_missing:${key}`);
    assert.equal(a.relationtype, 'r', `ordinary_table_required:${key}`);
    assert.equal(b.relationtype, 'r', `ordinary_table_required:${key}`);
    const before = Object.keys(a.columns);
    const after = Object.keys(b.columns);
    assert.deepEqual([...before].sort(), [...after].sort(), `column_set_changed:${key}`);
    for (const name of before) {
      assert.deepEqual(data(a.columns[name]), data(b.columns[name]), `column_definition_changed:${key}.${name}`);
    }
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    a.columns = Object.fromEntries(after.map(name => [name, a.columns[name]]));
    changes.push({ table: key, replay_order: before, production_order: after });
  }
  return changes;
}

export function classifyReconciledDiffV1(sql, pendingIds) {
  assert.ok(Array.isArray(pendingIds));
  assert.equal(new Set(pendingIds).size, pendingIds.length, 'duplicate_pending_id');
  for (const id of pendingIds) assert.ok(Object.hasOwn(RECONCILIATION_MIGRATIONS, id), `unexpected_pending_migration:${id}`);
  const dimensionPending = pendingIds.includes('20260905120000');
  if (dimensionPending) {
    assert.equal(sha256(sql), EXPECTED_PENDING_DIMENSION_DIFF_SHA256, 'unexpected_schema_delta');
  } else {
    assert.equal(sql.trim(), '', 'unexpected_schema_delta');
  }
  return {
    status: pendingIds.length ? 'baseline_reconciled_pending_apply' : 'baseline_reconciled',
    expected_pending_ids: [...pendingIds].sort(),
    diff_sha256: sha256(sql),
    database_apply_authorized: false,
  };
}
