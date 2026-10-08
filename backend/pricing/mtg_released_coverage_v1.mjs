import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const MTG_RELEASED_COVERAGE_VERSION = 'MTG_RELEASED_COVERAGE_V1';
export const MTG_RELEASED_COVERAGE_SHA = '86036435af9184a5d6999124fbdda166c323cb6791c6eca1a0aec36f9105ab12';
const stable = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
  : Array.isArray(value) ? '[' + value.map(stable).join(',') + ']'
  : '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
export const mtgCoverageDigestV1 = value => createHash('sha256').update(stable(value)).digest('hex');
export const mtgCoverageRowsDigestV1 = rows => createHash('sha256').update('[' + rows.map(stable).sort().join(',') + ']').digest('hex');

export function assertMtgReleasedCoverageV1(coverage, asOf) {
  assert.equal(mtgCoverageDigestV1(coverage), MTG_RELEASED_COVERAGE_SHA, 'Released coverage manifest changed');
  assert.equal(coverage.version, MTG_RELEASED_COVERAGE_VERSION);
  assert.match(asOf, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(asOf >= coverage.as_of && asOf < coverage.review_before, 'Released coverage expired; review held cards');
  assert.equal(coverage.held_future_print_ids.length, 10);
  assert.equal(coverage.unpriced_source_print_ids.length, 7);
}

export function applyMtgReleasedCoverageV1(executionOrder, coverage, evidence, asOf, releaseStatus) {
  assertMtgReleasedCoverageV1(coverage, asOf);
  assert.equal(releaseStatus, 'public', 'Released coverage only applies to the public catalog');
  assert.deepEqual(evidence, { version: MTG_RELEASED_COVERAGE_VERSION, sha256: MTG_RELEASED_COVERAGE_SHA,
    exact: true, held_absent: 10, unpriced_parents: 7 });
  for (const set of coverage.sets) assert.equal(executionOrder.filter(b => b.code === set.code).length, 1);
  return executionOrder.map(batch => {
    const set = coverage.sets.find(s => s.code === batch.code);
    if (!set) return batch;
    assert.equal(batch.source_set_id, set.source_set_id, 'Source set identity changed');
    return { ...batch, candidate_count: set.row_counts.card_prints, card_printings: set.row_counts.card_printings,
      external_printing_mappings: set.row_counts.external_printing_mappings,
      released_coverage_sha256: MTG_RELEASED_COVERAGE_SHA };
  });
}

// Select-only verification. No ingestion/writer imports, dispatch, fallback counts
// or permissive handling of a missing card. Reads use the caller's single snapshot.
export async function captureMtgReleasedCoverageV1(client, coverage, asOf) {
  assertMtgReleasedCoverageV1(coverage, asOf);
  assert.equal((await client.query('show transaction_read_only')).rows[0].transaction_read_only, 'on');
  const codes = coverage.sets.map(s => s.code);
  const from = {
    sets: "public.sets t where t.game='mtg' and lower(t.code)=any($1::text[])",
    card_prints: "public.card_prints t where t.game_id='4d544700-0000-4000-8000-000000000001' and lower(t.set_code)=any($1::text[])",
    card_print_identity: "public.card_print_identity t join public.card_prints c on c.id=t.card_print_id where c.game_id='4d544700-0000-4000-8000-000000000001' and lower(c.set_code)=any($1::text[])",
    card_printings: "public.card_printings t join public.card_prints c on c.id=t.card_print_id where c.game_id='4d544700-0000-4000-8000-000000000001' and lower(c.set_code)=any($1::text[])",
    external_mappings: "public.external_mappings t join public.card_prints c on c.id=t.card_print_id where c.game_id='4d544700-0000-4000-8000-000000000001' and lower(c.set_code)=any($1::text[]) and t.source='scryfall'",
    external_printing_mappings: "public.external_printing_mappings t join public.card_printings p on p.id=t.card_printing_id join public.card_prints c on c.id=p.card_print_id where c.game_id='4d544700-0000-4000-8000-000000000001' and lower(c.set_code)=any($1::text[]) and t.source='tcgplayer_market'",
  };
  assert.deepEqual(Object.keys(coverage.tables).sort(), Object.keys(from).sort());
  for (const [table, expected] of Object.entries(coverage.tables)) {
    assert.ok(expected.fields.every(f => /^[a-z_]+$/.test(f)));
    const fields = expected.fields.map(f => `'${f}',to_jsonb(t)->'${f}'`).join(',');
    const rows = (await client.query(`select jsonb_build_object(${fields}) payload from ${from[table]}`, [codes])).rows.map(r => r.payload);
    assert.equal(rows.length, expected.count, table + ' count drift');
    assert.equal(mtgCoverageRowsDigestV1(rows), expected.sha256, table + ' identity/finish/source drift');
  }
  const held = (await client.query("select count(*)::int n from public.card_prints where external_ids->>'scryfall'=any($1::text[])", [coverage.held_future_print_ids])).rows[0].n;
  assert.equal(held, 0, 'Held future card became public');
  const unpriced = (await client.query(`select count(distinct c.id)::int parents,count(m.external_id)::int mappings
    from public.card_prints c left join public.card_printings p on p.card_print_id=c.id
    left join public.external_printing_mappings m on m.card_printing_id=p.id and m.source='tcgplayer_market'
    where c.external_ids->>'scryfall'=any($1::text[])`, [coverage.unpriced_source_print_ids])).rows[0];
  assert.deepEqual(unpriced, { parents: 7, mappings: 0 }, 'Unreviewed price link for an unpriced card');
  return { version: MTG_RELEASED_COVERAGE_VERSION, sha256: MTG_RELEASED_COVERAGE_SHA, exact: true, held_absent: 10, unpriced_parents: 7 };
}
