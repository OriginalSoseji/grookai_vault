import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchUnresolved,
  insertQuarantine,
  resolveQuarantine,
} from '../../backend/lib/contracts/quarantine_service_v1.mjs';

function createFakeSupabaseTarget() {
  const inserts = [];
  const updates = [];

  return {
    inserts,
    updates,
    from(tableName) {
      return {
        insert(row) {
          inserts.push({ tableName, row });
          return {
            select() {
              return {
                single: async () => ({
                  data: { id: `${tableName}-${inserts.length}`, created_at: '2026-04-23T00:00:00.000Z' },
                  error: null,
                }),
              };
            },
          };
        },
        select() {
          return {
            order() {
              return this;
            },
            limit() {
              return this;
            },
            is() {
              return this;
            },
            eq() {
              return this;
            },
            then(resolve) {
              resolve({
                data: [
                  {
                    id: 'quarantine-1',
                    source_system: 'warehouse',
                    contract_name: 'NO_ASSUMPTION_RULE',
                    quarantine_reason: 'ambiguous',
                    created_at: '2026-04-22T00:00:00.000Z',
                  },
                ],
                error: null,
              });
            },
          };
        },
        update(row) {
          updates.push({ tableName, row });
          return {
            eq() {
              return this;
            },
            select() {
              return this;
            },
            maybeSingle: async () => ({
              data: {
                id: 'quarantine-1',
                resolved_at: row.resolved_at,
                resolved_by: row.resolved_by,
                resolution_outcome: row.resolution_outcome,
                resolution_notes: row.resolution_notes,
              },
              error: null,
            }),
          };
        },
      };
    },
  };
}

test('insertQuarantine preserves blocked payload evidence', async () => {
  const target = createFakeSupabaseTarget();

  const row = await insertQuarantine({
    target,
    source_system: 'warehouse',
    execution_name: 'source_image_enrichment_worker_v1',
    contract_name: 'NO_ASSUMPTION_RULE',
    quarantine_reason: 'ambiguous image group',
    source_payload_hash: 'hash-1',
    payload_snapshot: { card_print_id: 'cp-1' },
  });

  assert.equal(row.id, 'quarantine_records-1');
  assert.equal(target.inserts.length, 1);
  assert.equal(target.inserts[0].tableName, 'quarantine_records');
  assert.equal(target.inserts[0].row.canonical_write_blocked, true);
});

test('fetchUnresolved can group unresolved quarantine rows by reason', async () => {
  const target = createFakeSupabaseTarget();

  const rows = await fetchUnresolved(target, {
    group_by: 'reason',
    unresolved_only: true,
  });

  assert.deepEqual(rows, [{ reason: 'ambiguous', unresolved_count: 1 }]);
});

test('resolveQuarantine appends explicit resolution metadata', async () => {
  const target = createFakeSupabaseTarget();

  const row = await resolveQuarantine({
    target,
    id: 'quarantine-1',
    resolved_by: 'founder',
    resolution_outcome: 'rejected_no_action',
    resolution_notes: 'kept blocked',
  });

  assert.equal(row.id, 'quarantine-1');
  assert.equal(target.updates.length, 1);
  assert.equal(target.updates[0].row.resolved_by, 'founder');
  assert.equal(target.updates[0].row.resolution_outcome, 'rejected_no_action');
});
