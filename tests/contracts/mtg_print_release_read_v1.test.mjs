import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readMtgPrintReleaseV1 as read } from '../../backend/catalog/mtg_print_release_read_v1.mjs';
import { loadMtgPrintReleaseDatesV1 as load, findMtgPrintReleaseCandidateIdsV1 as candidateIds } from '../../backend/catalog/mtg_print_release_service_v1.mjs';

const fixture = () => JSON.parse(fs.readFileSync(new URL('../fixtures/catalog/mtg_print_release_v1.json', import.meta.url))).cases;
const project = f => read(f.parent, f.identities, f.owners);
test('actual rolling-set prints use exact print dates with an explicit scope and no private evidence in the result', () => {
  for (const f of fixture()) {
    assert.equal(f.set_release_date, null);
    const before = JSON.stringify(f), result = project(f);
    assert.equal(result.release_date, f.parent.ai_metadata.mtg_print_details_v1.source_released_at);
    assert.deepEqual(Object.keys(result).sort(), ['card_print_id', 'release_date', 'release_date_scope', 'release_date_source', 'release_year']);
    assert.equal(result.release_date_scope, 'individual_print');
    assert.equal(result.release_date_source, 'scryfall');
    assert.equal(JSON.stringify(f), before);
  }
});
test('wrong owner, multiple active identities, stale hashes and rehashed altered identities all fail closed', () => {
  for (const mutate of [
    f => f.owners.push(structuredClone(f.owners[0])),
    f => { f.owners[0].card_print_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'; },
    f => { f.owners[0].active = false; },
    f => f.identities.push(structuredClone(f.identities[0])),
    f => { f.identities[0].is_active = false; },
    f => { f.identities[0].identity_payload.collector_number = '999'; },
    f => { f.identities[0].identity_key_hash = f.parent.ai_metadata.mtg_print_details_v1.identity_key_hash = '0'.repeat(64); },
    f => { f.parent.name = 'Another print'; },
    f => { f.parent.variant_key = 'another_version'; },
    f => { f.parent.printed_identity_modifier = 'unknown_stamp'; },
    f => { f.parent.gv_id = 'GV-MTG-OTHER'; },
    f => { f.parent.identity_domain = 'pokemon_eng_standard'; },
  ]) { const f = fixture()[0]; mutate(f); assert.equal(project(f), null); }
});
test('unknown, malformed, contradictory or unsourced dates never fall back to a set release', () => {
  for (const value of [null, undefined, '', '2025', '2025-02-30', '2025-2-03', 'not-a-date', 2025]) {
    const f = fixture()[0]; f.set_release_date = '2025-01-01';
    f.parent.ai_metadata.mtg_print_details_v1.source_released_at = value;
    assert.equal(project(f), null);
  }
  for (const field of ['source_raw_import_id', 'source_card_sha256', 'source_bulk_sha256',
    'source_url', 'source_bulk_updated_at', 'source_retrieved_at']) {
    const f = fixture()[0]; delete f.parent.ai_metadata.mtg_print_details_v1[field]; assert.equal(project(f), null, field);
  }
  const f = fixture()[0]; f.owners[0].meta = { source_card_released_at: '1993-08-05' }; assert.equal(project(f), null);
});

function clients({ hidden = false, failTable = '', extraIdentities = [] } = {}) {
  const fixtures = fixture(), calls = [], visible = hidden ? [] : fixtures.map(f => ({ id: f.parent.id, identity_domain: f.parent.identity_domain }));
  const tables = { card_prints: fixtures.map(f => f.parent), card_print_identity: [...fixtures.flatMap(f => f.identities), ...extraIdentities], external_mappings: fixtures.flatMap(f => f.owners) };
  function client(publicOnly) {
    return { from(table) {
      assert.equal(publicOnly, table === 'v_card_prints_discovery_v1', 'private reads require a separate trusted client');
      const filters = [];
      const q = { select() { return q; }, eq(k, v) { filters.push(r => r[k] === v); return q; },
        in(k, values) { filters.push(r => values.includes(r[k])); return q; }, order() { return q; },
        async range(start, end) {
          calls.push({ table, start, end });
          if (table === failTable) return { data: null, error: { message: 'private-sensitive-failure' } };
          return { data: (publicOnly ? visible : tables[table]).filter(r => filters.every(f => f(r))).slice(start, end + 1), error: null };
        } };
      return q;
    } };
  }
  return { publicClient: client(true), backendClient: client(false), calls, ids: fixtures.map(f => f.parent.id) };
}
test('batch loader rechecks requester visibility before privileged reads and emits only eligible dates', async () => {
  const c = clients(), result = await load(c.publicClient, c.backendClient, [...c.ids, c.ids[0]]);
  assert.equal(result.size, 2);
  assert.equal(c.calls[0].table, 'v_card_prints_discovery_v1');
  const hidden = clients({ hidden: true });
  assert.equal((await load(hidden.publicClient, hidden.backendClient, hidden.ids)).size, 0);
  assert.deepEqual(hidden.calls.map(c => c.table), ['v_card_prints_discovery_v1']);
});
test('ambiguous identities after the first 500 evidence rows are not hidden by transport pagination', async () => {
  const f = fixture()[0];
  const c = clients({ extraIdentities: Array.from({ length: 501 }, (_, n) => ({ ...f.identities[0], id: String(n) })) });
  const result = await load(c.publicClient, c.backendClient, c.ids);
  assert.equal(result.has(f.parent.id), false);
  assert.equal(result.size, 1);
  assert.ok(c.calls.some(c => c.table === 'card_print_identity' && c.start === 500));
});
test('transport errors are actionable without private details and invalid IDs cannot reach any client', async () => {
  const c = clients({ failTable: 'external_mappings' });
  await assert.rejects(load(c.publicClient, c.backendClient, c.ids), e => /could not be verified/.test(e.message) && !/sensitive/.test(e.message));
  const bad = clients(); await assert.rejects(load(bad.publicClient, bad.backendClient, ['bad-id']), /invalid/);
  assert.equal(bad.calls.length, 0);
});
test('private year candidate discovery uses complete, bounded source-date pages and never claims verification', async () => {
  const rows = Array.from({ length: 503 }, (_, n) => ({ id: `00000000-0000-0000-0000-${String(n + 1).padStart(12, '0')}` }));
  const calls = [], filters = [];
  const client = { from(table) {
    assert.equal(table, 'card_prints');
    let after;
    const query = { select(fields) { assert.equal(fields, 'id'); return query; }, eq(key, value) { filters.push([key, value]); return query; },
      gte(key, value) { filters.push([key, value]); return query; }, lt(key, value) { filters.push([key, value]); return query; },
      gt(key, value) { assert.equal(key, 'id'); after = value; return query; },
      in(key, value) { filters.push([key, value]); return query; }, order() { return query; },
      async range(start, end) { calls.push([start, end]); return { data: rows.filter(row => !after || row.id > after).slice(start, end + 1), error: null }; } };
    return query;
  } };
  assert.equal((await candidateIds(client, { minYear: 1993, maxYear: 1993, setCodes: ['lea'] })).length, 503);
  assert.deepEqual(calls, [[0, 499], [0, 499]]);
  assert.ok(filters.some(([key, value]) => key.endsWith('source_released_at') && value === '1993-01-01'));
  assert.ok(filters.some(([key, value]) => key.endsWith('source_released_at') && value === '1994-01-01'));
  await assert.rejects(candidateIds(client, {}), /invalid/);
  await assert.rejects(candidateIds(client, { minYear: 2025, maxYear: 2020 }), /invalid/);
});
