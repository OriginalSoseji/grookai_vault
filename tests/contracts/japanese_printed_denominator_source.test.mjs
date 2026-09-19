import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLimitlessJapaneseCardAssertion } from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/limitless_jp_v1.mjs';
import { buildTcgdexJapaneseCardAssertion } from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/tcgdex_ja_v1.mjs';

const snapshotMetadata = { fetched_at: '2026-09-19T00:00:00Z', body_sha256: 'a'.repeat(64) };
const workItem = { registry_key: 'jpn-s8a', source_expected_card_count: 37 };
function limitless(number, count = 37) {
  return buildLimitlessJapaneseCardAssertion({
    card: { source_external_id: 'S8a:25', source_url: 'https://limitlesstcg.com/cards/jp/S8a/25',
      card_number_raw: number, printed_name: 'Pikachu V-UNION', source_fields: {} },
    checklist: { set: { id: 'S8a', card_count: count } }, workItem, snapshotMetadata,
    rawSnapshotRef: 'raw/S8a.html',
  });
}
function tcgdex(count) {
  return buildTcgdexJapaneseCardAssertion({
    card: { id: 'S8a-025', localId: '025', name: 'Pikachu V-UNION' },
    setPayload: { id: 'S8a', cardCount: count }, workItem, snapshotMetadata,
    rawSnapshotRef: 'raw/S8a.json', detailStatus: 'captured',
  });
}

test('Limitless never turns checklist or registry counts into printed totals', () => {
  for (const count of [37, 28, null, 1]) {
    const result = limitless('025', count);
    assert.equal(result.card_number_denominator, null);
    assert.equal(result.card_number_numerator, 25);
    assert.equal(result.source_fields.checklist_card_count, count);
    assert.equal(result.source_fields.printed_denominator_basis, null);
  }
});

test('Limitless uses an explicit fraction while retaining raw evidence', () => {
  const result = limitless('025/028');
  assert.equal(result.card_number_raw, '025/028');
  assert.equal(result.card_number_numerator, 25);
  assert.equal(result.card_number_denominator, 28);
  assert.equal(result.source_fields.printed_denominator_basis, 'displayed_card_number_fraction');
});

test('Limitless preserves promo series and prefixed coordinates', () => {
  const promo = limitless('001/SV-P');
  assert.equal(promo.card_number_raw, '001/SV-P');
  assert.equal(promo.card_number_denominator, null);
  const prefixed = limitless('TG01/030');
  assert.equal(prefixed.card_number_raw, 'TG01/030');
  assert.equal(prefixed.card_number_numerator, null);
  assert.equal(prefixed.card_number_denominator, 30);
});

test('Limitless does not fabricate denominators from malformed fractions', () => {
  for (const number of ['025/000', '025/-28', '025/28 cards', '025/28/30', '025/999999999999999999999']) {
    assert.equal(limitless(number).card_number_denominator, null, number);
  }
});

test('TCGdex uses official count, not total including secrets', () => {
  const result = tcgdex({ official: 28, total: 37 });
  assert.equal(result.card_number_denominator, 28);
  assert.equal(result.source_fields.printed_denominator_basis, 'source_official_card_count');
  assert.deepEqual(result.source_fields.set_card_count, { official: 28, total: 37 });
});

test('TCGdex missing or invalid official count never falls back to total', () => {
  for (const official of [undefined, null, 0, -1, '28 cards', 2.5, '9007199254740993']) {
    const result = tcgdex({ official, total: 37 });
    assert.equal(result.card_number_denominator, null, String(official));
    assert.equal(result.source_fields.printed_denominator_basis, null);
    assert.equal(result.source_fields.set_card_count.total, 37);
  }
});

test('Denominator correction preserves assertion identity, source reference and finish evidence', () => {
  const a = limitless('025', 37), b = limitless('025', 28);
  assert.equal(a.assertion_key, b.assertion_key);
  assert.equal(a.raw_snapshot_sha256, b.raw_snapshot_sha256);
  assert.equal(a.raw_snapshot_ref, b.raw_snapshot_ref);
  assert.deepEqual(a.finish_labels, []);
  assert.equal(a.parser_version, 'JPN-MASTER-INDEX-LIMITLESS-JP-CARD-PARSER-V3');
});
