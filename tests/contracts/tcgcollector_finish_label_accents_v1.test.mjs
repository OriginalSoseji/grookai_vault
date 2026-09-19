import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import { finishFromVariantName, buildRecords } from '../../scripts/audits/english_master_index_tcgcollector_variant_acquisition_v1.mjs';
import {classifyEvidence} from '../../scripts/audits/verified_master_set_index_v1/agreement_engine/classifier.mjs';
import {printingFactKey} from '../../scripts/audits/verified_master_set_index_v1/shared.mjs';

test('accented and decomposed Poke Ball labels retain their exact finish', () => {
  for (const label of ['Pok\u00e9 Ball Reverse Holo', 'Poke\u0301 Ball Reverse Holo', 'Poke Ball Reverse Holo']) {
    assert.equal(finishFromVariantName(label), 'pokeball');
  }
  assert.equal(finishFromVariantName('Master Ball Reverse Holo'), 'masterball');
  assert.equal(finishFromVariantName('Reverse Holo'), 'reverse');
  assert.equal(finishFromVariantName('Team Rocket Reverse Holo'), 'rocket_reverse');
  assert.equal(finishFromVariantName('unknown patterned foil'), null);
});

test('captured variant label creates only the matching targeted finish and retains raw label', () => {
  const label = 'Pok\u00e9 Ball Reverse Holo';
  const app = { cardIds: [1], totalCardCount: 1, cardIdToCardVariantTypeIdsMap: { 1: [433] },
    idToCardVariantTypeDtoMap: { 433: { name: label, isGeneric: true, hasQualifiers: false, isFirstEditionPrint: false, isCombined: false } } };
  const html = `<div data-card-id="1"><a href="/cards/1/suicune" title="Suicune (Prismatic Evolutions 024/131)"></a></div><script>appState: ${JSON.stringify(app)}</script>`;
  const common = { set: { key: 'sv08.5', set_name: 'Prismatic Evolutions' }, cardFacts: [], html,
    sourceUrl: 'https://www.tcgcollector.com/sets/11641/prismatic-evolutions', generatedAt: '2026-09-19T00:00:00Z' };
  const fact = { set_key: 'sv08.5', card_number: '024', card_name: 'Suicune', finish_key: 'pokeball' };
  const result = buildRecords({ ...common, facts: [fact] });
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].finish_key, 'pokeball');
  assert.equal(result.records[0].card_name, 'Suicune');
  assert.equal(result.records[0].evidence_label, `TCGCollector card variant ${label}`);
  assert.equal(result.records[0].raw_snapshot_ref, 'tcgcollector:1:433');
  assert.equal(buildRecords({ ...common, facts: [{ ...fact, finish_key: 'masterball' }] }).records.length, 0);
  assert.equal(buildRecords({ ...common, facts: [{ ...fact, card_number: '025' }] }).records.length, 0);
  for (const [key,value] of [['isGeneric',false],['hasQualifiers',true],['isFirstEditionPrint',true],['isCombined',true]]) {
    const invalid = structuredClone(app);
    invalid.idToCardVariantTypeDtoMap[433][key] = value;
    const invalidHtml = html.replace(JSON.stringify(app), JSON.stringify(invalid));
    assert.equal(buildRecords({...common,html:invalidHtml,facts:[fact]}).records.length,0,key);
  }
});

test('real Prismatic capture corroborates only exact parallels and preserves five identity discrepancies', () => {
  const root = new URL('../../docs/audits/verified_master_set_index_v1/', import.meta.url);
  const read = file => JSON.parse(fs.readFileSync(new URL(file,root),'utf8'));
  const fixture = read('source_fixtures/generated_tcgcollector_corroboration_20260919/prismatic_parallel_v1.json');
  const workbook = read('source_fixtures/generated_prismatic_evolutions_parallel_v1/prismatic_evolutions_parallel_finish_matrix_v1.json');
  const bytes = gunzipSync(fs.readFileSync(new URL('source_snapshots/prismatic_tcgcollector_20260919.html.gz',root)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), fixture.source_capture_sha256);
  const facts = workbook.rows.filter(row => ['pokeball','masterball'].includes(row.finish_key));
  const replay = buildRecords({set:{key:'sv08.5',set_name:'Prismatic Evolutions'},facts,cardFacts:[],html:bytes.toString('utf8'),sourceUrl:fixture.source_url,generatedAt:fixture.retrieved_at});
  const expected = fixture.records.map(printingFactKey).sort();
  assert.equal(expected.length,162);
  assert.deepEqual(replay.records.map(printingFactKey).sort(),expected);
  const classified = classifyEvidence([...facts,...fixture.records]);
  const verified = classified.printings.filter(row=>row.status==='master_verified');
  assert.deepEqual(verified.map(row=>row.key).sort(),expected);
  assert.ok(verified.every(row=>row.source_count===2));
  assert.equal(classified.conflicts.length,0);
  assert.equal(classified.printings.filter(row=>row.status==='human_source_verified').length,5);
  assert.ok(classifyEvidence([...fixture.records,...fixture.records]).printings.every(row=>row.status==='human_source_verified'&&row.source_count===1));
  assert.ok(fixture.records.every(row=>row.raw_snapshot_ref.includes(fixture.source_capture_sha256)));
});
