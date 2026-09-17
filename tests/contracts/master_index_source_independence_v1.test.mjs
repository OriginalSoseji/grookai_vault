import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { sourceAuthorityKey } from '../../scripts/audits/verified_master_set_index_v1/shared.mjs';
import { classifyEvidence } from '../../scripts/audits/verified_master_set_index_v1/agreement_engine/classifier.mjs';
import {
  buildStrictGuardrailOptions,
  enforceStrictGuardrails,
} from '../../scripts/audits/verified_master_set_index_v1/guardrails/strict_guardrails.mjs';

function record(source_key, source_url, overrides = {}) {
  return {
    source_key, source_url, source_kind: 'marketplace_checklist',
    set_key: 'mep', set_name: 'MEP Black Star Promos', card_number: '20',
    card_name: 'Sneasel', finish_key: 'cosmos', evidence_type: 'finish_presence',
    raw_snapshot_ref: `snapshot:${source_key}`, language: 'en', ...overrides,
  };
}

const syndicated = [
  record('tcgplayer', 'https://www.tcgplayer.com/product/664055'),
  record('tcgcsv', 'https://tcgcsv.com/tcgplayer/3/24380/products'),
  record('pro_shop_a', 'https://jafcomics.tcgplayerpro.com/catalog/product/664055'),
  record('pro_shop_b', 'https://another.tcgplayerpro.com/catalog/product/664055'),
];

test('preserved TCGplayer price-guide path is syndicated but PokemonTCG identity API is separate', () => {
  const price = record('tcgplayer_price_guide', 'https://prices.pokemontcg.io/tcgplayer/mcd21-1');
  assert.equal(sourceAuthorityKey(price), 'tcgplayer.com');
  assert.equal(sourceAuthorityKey(record('pokemontcg_api', 'https://api.pokemontcg.io/v2/cards/mcd21-1')), 'api.pokemontcg.io');
  assert.equal(sourceAuthorityKey(record('other_prices', 'https://prices.pokemontcg.io/cardmarket/mcd21-1')), 'prices.pokemontcg.io');
  assert.equal(sourceAuthorityKey(record('lookalike_path', 'https://prices.pokemontcg.io/tcgplayer-copy/mcd21-1')), 'prices.pokemontcg.io');
  assert.equal(sourceAuthorityKey(record('lookalike_host', 'https://prices.pokemontcg.io.example.test/tcgplayer/mcd21-1')), 'prices.pokemontcg.io.example.test');
  const [fact] = classifyEvidence([syndicated[0], price]).printings;
  assert.equal(fact.source_count, 1);
  assert.equal(fact.status, 'human_source_verified');
  assert.equal(fact.evidence.length, 2);
});

test('TCGplayer catalog, API, CSV and Pro channels share one authority', () => {
  for (const row of [...syndicated,
    record('api', 'https://api.tcgplayer.com/catalog/products/664055'),
    record('root', 'https://tcgplayerpro.com/catalog/product/664055'),
    record('case', 'https://WWW.TCGPLAYER.COM./product/664055'),
  ]) assert.equal(sourceAuthorityKey(row), 'tcgplayer.com');
});

test('authority grouping uses exact domain boundaries, not substrings or supplied claims', () => {
  for (const host of ['not-tcgplayer.com', 'tcgplayer.com.example.test', 'tcgcsv.com.example.test']) {
    assert.equal(sourceAuthorityKey(record('tcgplayer', `https://${host}/`, {
      source_authority: 'tcgplayer.com',
    })), host);
  }
  assert.equal(sourceAuthorityKey(record('retailer', 'https://www.gamenerdz.com/card')), 'gamenerdz.com');
});

test('syndicated finish evidence cannot produce master_verified and raw records survive', () => {
  const before = structuredClone(syndicated);
  const [fact] = classifyEvidence(syndicated).printings;
  assert.equal(fact.status, 'human_source_verified');
  assert.equal(fact.source_count, 1);
  assert.equal(fact.evidence.length, 4);
  assert.deepEqual(fact.evidence.map((row) => row.source_url).sort(), syndicated.map((row) => row.source_url).sort());
  assert.deepEqual(fact.evidence.map((row) => row.raw_snapshot_ref).sort(), syndicated.map((row) => row.raw_snapshot_ref).sort());
  assert.deepEqual(syndicated, before);
  assert.deepEqual(classifyEvidence(syndicated), classifyEvidence([...syndicated].reverse()));
});

test('independent retailer still supports agreement without inventing another finish', () => {
  const rows = [...syndicated, record('retailer', 'https://independent-retailer.test/sneasel')];
  const { printings } = classifyEvidence(rows);
  assert.equal(printings.length, 1);
  assert.equal(printings[0].status, 'master_verified');
  assert.equal(printings[0].source_count, 2);
  assert.equal(printings[0].finish_key, 'cosmos');
});

test('syndicated structured card identity cannot produce api_agreed', () => {
  const rows = syndicated.slice(0, 2).map((row) => ({
    ...row, source_kind: 'structured_api', finish_key: null, evidence_type: 'card_identity',
  }));
  const [fact] = classifyEvidence(rows).cards;
  assert.equal(fact.status, 'candidate_unconfirmed');
  assert.equal(fact.source_count, 1);
});

test('strict guard rejects stale two-source verified printing even with cached source_count', () => {
  const classified = classifyEvidence(syndicated);
  classified.printings[0].status = 'master_verified';
  classified.printings[0].source_count = 4;
  assert.throws(() => enforceStrictGuardrails({
    records: syndicated, classified, setConfigs: [], options: buildStrictGuardrailOptions({}),
  }), /without two independent source authorities/);
});

test('real MEP fixture preserves four Cosmos claims but exposes Sneasel source dependence', async () => {
  const fixture = JSON.parse(await fs.readFile(new URL(
    '../../docs/audits/verified_master_set_index_v1/source_fixtures/generated_image_truth_mep_cosmos_finish_governance_v1/mep_cosmos_finish_governance_v1.json',
    import.meta.url,
  ), 'utf8'));
  const { printings } = classifyEvidence(fixture.records);
  assert.equal(printings.length, 4);
  assert.equal(printings.every((row) => row.finish_key === 'cosmos' && row.evidence.length === 2), true);
  assert.equal(printings.filter((row) => row.status === 'master_verified').length, 3);
  const sneasel = printings.find((row) => row.card_name === 'Sneasel');
  assert.equal(sneasel.status, 'human_source_verified');
  assert.equal(sneasel.source_count, 1);
});
