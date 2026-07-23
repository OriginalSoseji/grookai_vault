import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  blueprintKey,
  findMatches,
  finishFromBlueprint,
} from '../../scripts/audits/english_master_index_cardtrader_finish_acquisition_v1.mjs';
import {
  collectHumanFixtureEvidence,
  isUnqualifiedCardTraderNormalFixtureV1,
} from '../../scripts/audits/verified_master_set_index_v1/source_adapters/human_fixtures.mjs';

function blueprint(name, overrides = {}) {
  return {
    id: `390056-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    n: name,
    g: 5,
    x: 'Chaos Rising',
    cn: '115',
    ...overrides,
  };
}

test('CardTrader unqualified rarity labels never imply Normal finish truth', () => {
  const rows = [
    blueprint('Tool Scrapper - Ultra Rare | 115/086'),
    blueprint('Tool Scrapper - Illustration Rare | 115/086'),
    blueprint('Tool Scrapper - Rare | 115/086'),
  ];

  for (const row of rows) {
    assert.equal(finishFromBlueprint(row), null);
    assert.equal(blueprintKey(row), null);
  }
});

test('CardTrader accepts only explicit governed Normal or Non-Holo descriptors as Normal', () => {
  const rows = [
    blueprint('Tool Scrapper - Normal | 115/086'),
    blueprint('Tool Scrapper - Non-Holo | 115/086'),
    blueprint('Tool Scrapper - 115/086 | Non Holo'),
  ];

  for (const row of rows) {
    assert.equal(finishFromBlueprint(row), 'normal');
    assert.equal(blueprintKey(row)?.finish_key, 'normal');
  }
});

test('CardTrader preserves explicit Holo and Reverse Holo finish signals', () => {
  assert.equal(
    finishFromBlueprint(blueprint('Tool Scrapper - Holo Rare | 115/086')),
    'holo',
  );
  assert.equal(
    finishFromBlueprint(blueprint('Tool Scrapper - Reverse Holo | 115/086')),
    'reverse',
  );
  assert.equal(
    finishFromBlueprint(blueprint('Deoxys Normal Forme Lv.50 - Holo Rare | 1/146')),
    'holo',
  );
});

test('CardTrader unknown finishes stay out of generated fixture evidence', () => {
  const fact = {
    set_key: 'me04',
    set_name: 'Chaos Rising',
    card_number: '115',
    card_name: 'Tool Scrapper',
    finish_key: 'normal',
  };
  const { recordsBySet, results } = findMatches(
    [fact],
    [blueprint('Tool Scrapper - Ultra Rare | 115/086')],
  );

  assert.equal(recordsBySet.size, 0);
  assert.deepEqual(results, [{ ...fact, status: 'no_exact_match', records_generated: 0 }]);
});

test('legacy CardTrader fixtures cannot reload an unqualified Normal into working truth', () => {
  const fixture = { source_key: 'cardtrader_finish_me04' };
  assert.equal(isUnqualifiedCardTraderNormalFixtureV1({
    source_key: 'cardtrader_blueprint_index',
    finish_key: 'normal',
    evidence_label: 'CardTrader blueprint row Beedrill ex - Ultra Rare | 003/086',
  }, fixture), true);
  assert.equal(isUnqualifiedCardTraderNormalFixtureV1({
    finish_key: 'normal',
    evidence_label: 'CardTrader blueprint row Beedrill ex - Ultra Rare | 003/086',
  }, fixture), true);
  assert.equal(isUnqualifiedCardTraderNormalFixtureV1({
    source_key: 'cardtrader_blueprint_index',
    finish_key: 'normal',
    evidence_label: 'CardTrader blueprint row Delphox - Non-Holo | 013/086',
  }, fixture), false);
  assert.equal(isUnqualifiedCardTraderNormalFixtureV1({
    source_key: 'cardtrader_blueprint_index',
    finish_key: 'holo',
    evidence_label: 'CardTrader blueprint row Beedrill ex - Holo Rare | 003/086',
  }, fixture), false);

  const me04Fixture = JSON.parse(fs.readFileSync(
    'docs/audits/verified_master_set_index_v1/source_fixtures/generated_cardtrader_v1/me04.json',
    'utf8',
  ));
  const legacyNormals = me04Fixture.records.filter((row) => row.finish_key === 'normal');
  assert.equal(legacyNormals.length, 45);
  assert.equal(
    legacyNormals.every((row) => isUnqualifiedCardTraderNormalFixtureV1(row, me04Fixture)),
    true,
  );
});

test('legacy ME04 CardTrader fixture rows are preserved with unknown finish, not re-admitted as Normal', async () => {
  const rows = await collectHumanFixtureEvidence([
    { key: 'me04', tcgdex: null, pokemontcg: null },
  ], {
    fixtureDir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_cardtrader_v1',
    retrievedAt: '2026-07-22T00:00:00.000Z',
  });

  assert.equal(rows.length, 45);
  assert.equal(rows.every((row) => row.finish_key === null), true);
  assert.equal(rows.every((row) => row.finish_key_raw === 'normal'), true);
  assert.equal(
    rows.every((row) => row.evidence_type === 'finish_unknown_unqualified_provider'),
    true,
  );
});
