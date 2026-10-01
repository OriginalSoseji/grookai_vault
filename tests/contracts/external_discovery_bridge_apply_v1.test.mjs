import test from 'node:test';
import assert from 'node:assert/strict';
import { insertCandidate } from '../../backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs';

const candidate = {
  row: { id: 'source-dragonite', set_id: 'miscellaneous-cards-products-pokemon' },
  tcgplayer_id: '456093', notes: 'GameStop Dragonite',
  claimed_identity_payload: { name: 'Dragonite', number: '131', variant_key: 'gamestop_stamp' },
  reference_hints_payload: { source_candidate_id: 'source-dragonite' },
};
function database({ eventCount = 1, state = 'RAW' } = {}) {
  const calls = [];
  return { calls, async query(sql, params = []) {
    const normalized = sql.trim().replace(/\s+/g, ' ');
    calls.push({ sql: normalized, params });
    if (normalized.startsWith('insert into public.canon_warehouse_candidates ')) return { rows: [{ id: 'new-candidate' }] };
    if (normalized.startsWith('select state')) {
      assert.deepEqual(params, ['new-candidate'], 'proof must use the ID returned by insertion');
      return { rows: [{ state }] };
    }
    if (normalized.startsWith('select count')) {
      assert.deepEqual(params, ['new-candidate'], 'event proof must use the inserted candidate ID');
      return { rows: [{ event_count: eventCount }] };
    }
    return { rows: [] };
  } };
}
test('bridge applies through shared runtime and proves the returned candidate and its event', async () => {
  const db = database();
  assert.equal(await insertCandidate(db, 'founder', candidate), 'new-candidate');
  assert.equal(db.calls.filter(c => c.sql.startsWith('insert into public.canon_warehouse_candidates ')).length, 1);
  assert.equal(db.calls.filter(c => c.sql.startsWith('insert into public.canon_warehouse_candidate_events ')).length, 1);
  assert.equal(db.calls.some(c => /card_prints|card_printings/.test(c.sql)), false);
});
test('bridge cannot report success without its event or RAW candidate proof', async () => {
  for (const opts of [{ eventCount: 0 }, { state: 'PROMOTED' }]) {
    await assert.rejects(insertCandidate(database(opts), 'founder', candidate), /contracts:post_write_proof/);
  }
});
