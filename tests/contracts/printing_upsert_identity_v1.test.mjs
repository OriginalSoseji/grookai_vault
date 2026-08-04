import assert from 'node:assert/strict';
import test from 'node:test';

import { upsertPrinting } from '../../backend/printing/printing_upsert_v1.mjs';

function createFakeSupabase() {
  const upserts = [];
  const filters = [];

  return {
    upserts,
    filters,
    from(table) {
      assert.equal(table, 'card_printings');
      return {
        upsert(payload, options) {
          upserts.push({ payload, options });
          return Promise.resolve({ error: null });
        },
        select() {
          const request = {
            eq(column, value) {
              filters.push([column, value]);
              return request;
            },
            async limit() {
              return { data: [{ card_print_id: 'parent-1', finish_key: 'holo' }], error: null };
            },
          };
          return request;
        },
      };
    },
  };
}

test('printing upsert writes and proves a supplied governed printing GV-ID atomically', async () => {
  const supabase = createFakeSupabase();
  await upsertPrinting({
    supabase,
    card_print_id: 'parent-1',
    finish_key: 'holo',
    printing_gv_id: 'GV-PK-TEST-001-HOLO',
    source: 'justtcg',
    ref: 'external-card-1',
    evidence: {
      source: 'justtcg',
      external_id: 'external-card-1',
      evidence_type: 'variant_printing_label',
    },
  });

  assert.equal(supabase.upserts.length, 1);
  assert.equal(supabase.upserts[0].payload.printing_gv_id, 'GV-PK-TEST-001-HOLO');
  assert.deepEqual(
    supabase.filters,
    [
      ['card_print_id', 'parent-1'],
      ['finish_key', 'holo'],
      ['printing_gv_id', 'GV-PK-TEST-001-HOLO'],
    ],
  );
});
