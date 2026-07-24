import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  applyMe04FinishTruthV1,
  assertMe04FinishTruthV1,
  isMe04ForbiddenNormalV1,
  isMe04PhantomNormalV1,
  ME04_EXPECTED_FINISH_COUNTS_V1,
  ME04_EXPECTED_PARENT_COUNT_V1,
  ME04_EXPECTED_PRINTING_COUNT_V1,
  ME04_FORBIDDEN_NORMAL_IDENTITIES_V1,
  ME04_INGESTION_TRUTH_PROFILE_V1,
  ME04_PHANTOM_NORMAL_IDENTITIES_V1,
  ME04_VALID_BUILD_BATTLE_NORMAL_NUMBERS_V1,
  me04PrintingIdentityV1,
} from '../../scripts/audits/me04_finish_truth_v1.mjs';

const MASTER_PRINTINGS = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const PUBLISHABLE_PRINTINGS = 'docs/audits/english_master_index_publishable_v1/sets/me04/printings.json';
const GOVERNANCE_FIXTURE = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_me04_finish_governance_v1/me04.json';
const TCGCOLLECTOR_FIXTURE = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcollector_v1/me4.json';
const REVERSEHOLO_FIXTURE = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_reverseholo_v1/me04.json';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function rowKey(row) {
  const identity = me04PrintingIdentityV1(row);
  return `${identity.card_number}|${identity.card_name.toLowerCase()}|${identity.finish_key}`;
}

test('ME04 governance projects the legacy 247 rows to exact 202-printing truth', () => {
  const master = readJson(MASTER_PRINTINGS);
  const sourceRows = master.printings.filter((row) => row.set_key === 'me04');
  const { retained, removed } = applyMe04FinishTruthV1(sourceRows);

  assert.equal(removed.length, 45);
  assert.equal(removed.every(isMe04PhantomNormalV1), true);
  const summary = assertMe04FinishTruthV1(retained);
  assert.equal(summary.total, ME04_EXPECTED_PRINTING_COUNT_V1);
  assert.deepEqual(summary.by_finish, ME04_EXPECTED_FINISH_COUNTS_V1);
  assert.equal(
    new Set(summary.rows.map((row) => me04PrintingIdentityV1(row).card_number)).size,
    ME04_EXPECTED_PARENT_COUNT_V1,
  );
  assert.equal(
    retained.filter((row) => me04PrintingIdentityV1(row).finish_key === 'reverse').length,
    76,
  );
});

test('ME04 website-facing publishable shard is already governed to 202 rows', () => {
  const publishable = readJson(PUBLISHABLE_PRINTINGS);
  const summary = assertMe04FinishTruthV1(publishable.printings);

  assert.equal(summary.total, ME04_EXPECTED_PRINTING_COUNT_V1);
  assert.deepEqual(summary.by_finish, ME04_EXPECTED_FINISH_COUNTS_V1);
  assert.equal(summary.rows.some(isMe04PhantomNormalV1), false);
});

test('ME04 phantom list is exactly 10 base-set ex cards plus 35 secret cards', () => {
  const baseEx = ME04_PHANTOM_NORMAL_IDENTITIES_V1.filter((row) => Number(row.card_number) <= 86);
  const secrets = ME04_PHANTOM_NORMAL_IDENTITIES_V1.filter((row) => Number(row.card_number) >= 87);

  assert.equal(baseEx.length, 10);
  assert.equal(baseEx.every((row) => /\bex$/i.test(row.card_name)), true);
  assert.equal(secrets.length, 35);
  assert.equal(secrets.some((row) => row.card_number === '109'), false);
});

test('ME04 ingestion profile forbids every false Normal, including Holo-only #109', () => {
  assert.equal(ME04_INGESTION_TRUTH_PROFILE_V1.expected_parent_count, 122);
  assert.equal(ME04_INGESTION_TRUTH_PROFILE_V1.expected_printing_count, 202);
  assert.deepEqual(ME04_INGESTION_TRUTH_PROFILE_V1.expected_finish_counts, {
    normal: 68,
    holo: 58,
    reverse: 76,
  });
  assert.equal(ME04_INGESTION_TRUTH_PROFILE_V1.historical_suppressed_printing_fact_count, 45);
  assert.equal(ME04_FORBIDDEN_NORMAL_IDENTITIES_V1.length, 46);
  assert.equal(
    ME04_FORBIDDEN_NORMAL_IDENTITIES_V1.some((row) => row.card_number === '109' && row.card_name === 'Jumbo Ice Cream'),
    true,
  );

  const publishable = readJson(PUBLISHABLE_PRINTINGS);
  const holoOnly109 = publishable.printings.find((row) => row.card_number === '109');
  assert.equal(holoOnly109.finish_key, 'holo');
  assert.equal(publishable.printings.some(isMe04ForbiddenNormalV1), false);

  const invalid = publishable.printings.map((row) => (
    row.card_number === '109' ? { ...row, finish_key: 'normal' } : row
  ));
  assert.throws(
    () => assertMe04FinishTruthV1(invalid, 'ME04 regression fixture'),
    /forbidden Normal rows/,
  );
});

test('ME04 exact checklists support Holo and not Normal for every suppressed identity', () => {
  const targetHoloKeys = new Set(
    ME04_PHANTOM_NORMAL_IDENTITIES_V1.map((row) => rowKey({ ...row, finish_key: 'holo' })),
  );
  const targetNormalKeys = new Set(ME04_PHANTOM_NORMAL_IDENTITIES_V1.map(rowKey));
  const tcgCollector = readJson(TCGCOLLECTOR_FIXTURE);
  const tcgCollectorHoloKeys = new Set(
    (tcgCollector.records ?? []).filter((row) => row.finish_key === 'holo').map(rowKey),
  );
  const tcgCollectorNormalKeys = new Set(
    (tcgCollector.records ?? []).filter((row) => row.finish_key === 'normal').map(rowKey),
  );
  assert.equal([...targetHoloKeys].every((key) => tcgCollectorHoloKeys.has(key)), true);
  assert.equal([...targetNormalKeys].some((key) => tcgCollectorNormalKeys.has(key)), false);

  const reverseHolo = readJson(REVERSEHOLO_FIXTURE);
  const reverseHoloTargetKeys = new Set(
    (reverseHolo.records ?? [])
      .filter((row) => row.finish_key === 'holo')
      .map(rowKey)
      .filter((key) => targetHoloKeys.has(key)),
  );
  assert.equal(reverseHoloTargetKeys.size, 41);

  const master = readJson(MASTER_PRINTINGS);
  const governedHoloRows = master.printings.filter((row) => (
    row.set_key === 'me04'
    && row.finish_key === 'holo'
    && targetHoloKeys.has(rowKey(row))
  ));
  assert.equal(governedHoloRows.length, 45);
  assert.equal(governedHoloRows.every((row) => row.sources.includes('tcgcollector_card_variants')), true);
  assert.equal(governedHoloRows.every((row) => row.sources.includes('thepricedex_price_list')), true);
});

test('ME04 explicit suppression fixture exactly matches the bounded phantom list', () => {
  const fixture = readJson(GOVERNANCE_FIXTURE);
  const expected = new Set(ME04_PHANTOM_NORMAL_IDENTITIES_V1.map(rowKey));
  const actual = new Set((fixture.suppressed_printing_facts ?? []).map(rowKey));

  assert.equal(fixture.audit_only, true);
  assert.equal(fixture.db_writes_performed, false);
  assert.equal(fixture.migrations_created, false);
  assert.equal(fixture.suppression_evidence_urls.length, 2);
  assert.ok(fixture.suppression_reason);
  assert.equal(actual.size, 45);
  assert.deepEqual(actual, expected);
});

test('ME04 preserves the four valid Build & Battle Normal printings', () => {
  const master = readJson(MASTER_PRINTINGS);
  const sourceRows = master.printings.filter((row) => row.set_key === 'me04');
  const { retained } = applyMe04FinishTruthV1(sourceRows);
  const retainedNormals = new Set(
    retained
      .filter((row) => me04PrintingIdentityV1(row).finish_key === 'normal')
      .map((row) => me04PrintingIdentityV1(row).card_number),
  );

  for (const number of ME04_VALID_BUILD_BATTLE_NORMAL_NUMBERS_V1) {
    assert.equal(retainedNormals.has(number), true, `missing valid Normal #${number}`);
  }
});

test('ME04 completion and child-insertion paths both enforce the shared truth contract', () => {
  const completionPackage = fs.readFileSync(
    'scripts/audits/english_master_index_chaos_rising_completion_package_v1.mjs',
    'utf8',
  );
  const childCompletion = fs.readFileSync(
    'scripts/audits/english_master_index_pkg04a_chaos_rising_child_printing_completion_v1.mjs',
    'utf8',
  );

  for (const source of [completionPackage, childCompletion]) {
    assert.match(source, /applyMe04FinishTruthV1/);
    assert.match(source, /assertMe04FinishTruthV1/);
  }
  assert.doesNotMatch(completionPackage, /247\/247 verified_by_index/);

  const masterBuilder = fs.readFileSync(
    'scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs',
    'utf8',
  );
  assert.match(masterBuilder, /fixture\.suppression_reason/);
  assert.match(masterBuilder, /fixture\.suppression_evidence_urls/);

  const publishableBuilder = fs.readFileSync(
    'scripts/audits/english_master_index_publishable_v1_build.mjs',
    'utf8',
  );
  assert.match(publishableBuilder, /applyMe04FinishTruthV1/);
  assert.match(publishableBuilder, /assertMe04FinishTruthV1/);
});
