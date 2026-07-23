import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { CONTRACT_RUNTIME_CATALOG_V1 } from '../../backend/lib/contracts/runtime_contract_catalog_v1.mjs';
import {
  ME04_EXPECTED_FINISH_COUNTS_V1,
  ME04_FORBIDDEN_NORMAL_IDENTITIES_V1,
  ME04_INGESTION_TRUTH_PROFILE_V1,
  ME04_PHANTOM_NORMAL_IDENTITIES_V1,
} from '../../scripts/audits/me04_finish_truth_v1.mjs';

const INDEX = fs.readFileSync('docs/CONTRACT_INDEX.md', 'utf8');
const INGESTION = fs.readFileSync('docs/contracts/INGESTION_PIPELINE_CONTRACT_V1.md', 'utf8');
const TCGDEX = fs.readFileSync('docs/contracts/TCGDEX_SOURCE_CONTRACT_V1.md', 'utf8');
const PRINTING_TRUTH = fs.readFileSync('docs/contracts/PRINTING_TRUTH_CONTRACT_V1.md', 'utf8');
const VERIFIED_INDEX = fs.readFileSync('docs/contracts/VERIFIED_MASTER_SET_INDEX_V1.md', 'utf8');
const COMPLETION = fs.readFileSync('docs/contracts/ENGLISH_MASTER_INDEX_COMPLETION_V1.md', 'utf8');
const GOVERNANCE = fs.readFileSync('docs/contracts/MASTER_INDEX_GOVERNANCE_CONTRACT_V1.md', 'utf8');
const RELEASE_PLAYBOOK = fs.readFileSync('docs/playbooks/NEW_POKEMON_SET_RELEASE_INGESTION_PLAYBOOK_V1.md', 'utf8');

const ME04_FIXTURE_PATH =
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_me04_finish_governance_v1/me04.json';

test('authoritative ingestion contracts bind finish truth and price evidence separation', () => {
  assert.match(INDEX, /INGESTION_PIPELINE_CONTRACT_V1\.md/);
  assert.match(INDEX, /TCGDEX_SOURCE_CONTRACT_V1\.md/);

  for (const contract of [INGESTION, PRINTING_TRUTH, VERIFIED_INDEX, COMPLETION, GOVERNANCE]) {
    assert.match(contract, /122/);
    assert.match(contract, /202/);
    assert.match(contract, /68/);
    assert.match(contract, /76/);
    assert.match(contract, /58/);
  }

  assert.match(INGESTION, /price key, price bucket[\s\S]*must never create, restore, delete, or rename a `card_printings` row/i);
  assert.match(PRINTING_TRUTH, /Pricing evidence may select an already verified child printing[\s\S]*never create, restore, delete, or rename `card_printings`/i);
  assert.match(TCGDEX, /variants\.holo === true[\s\S]*variants\.normal === false/);
  assert.match(TCGDEX, /remain review-gated market evidence/i);
  assert.match(VERIFIED_INDEX, /CardTrader Fail-Closed Rule/);
  assert.match(VERIFIED_INDEX, /Absence of Holo, Reverse, stamp, or other tokens is never proof of Normal/);
});

test('ME04 executable ingestion profile exactly matches the locked contract', () => {
  assert.equal(ME04_INGESTION_TRUTH_PROFILE_V1.set_key, 'me04');
  assert.equal(ME04_INGESTION_TRUTH_PROFILE_V1.expected_parent_count, 122);
  assert.equal(ME04_INGESTION_TRUTH_PROFILE_V1.expected_printing_count, 202);
  assert.deepEqual(ME04_EXPECTED_FINISH_COUNTS_V1, {
    normal: 68,
    holo: 58,
    reverse: 76,
  });
  assert.equal(
    Object.values(ME04_EXPECTED_FINISH_COUNTS_V1).reduce((sum, count) => sum + count, 0),
    ME04_INGESTION_TRUTH_PROFILE_V1.expected_printing_count,
  );
  assert.equal(ME04_PHANTOM_NORMAL_IDENTITIES_V1.length, 45);
  assert.equal(ME04_FORBIDDEN_NORMAL_IDENTITIES_V1.length, 46);
  assert.equal(ME04_INGESTION_TRUTH_PROFILE_V1.suppressed_printing_facts.length, 45);
  assert.equal(ME04_INGESTION_TRUTH_PROFILE_V1.forbidden_printing_facts.length, 46);
  assert.equal(ME04_INGESTION_TRUTH_PROFILE_V1.protected_printing_facts.length, 5);
  assert.deepEqual(ME04_INGESTION_TRUTH_PROFILE_V1.protected_normal_numbers, ['013', '029', '051', '068']);
  assert.deepEqual(ME04_INGESTION_TRUTH_PROFILE_V1.holo_only_numbers, ['109']);
  assert.deepEqual(ME04_INGESTION_TRUTH_PROFILE_V1.source_evidence_refs, [ME04_FIXTURE_PATH]);

  const fixture = JSON.parse(fs.readFileSync(ME04_FIXTURE_PATH, 'utf8'));
  assert.equal(fixture.suppressed_printing_facts.length, 45);
  assert.equal(fixture.audit_only, true);
  assert.equal(fixture.db_writes_performed, false);
});

test('all active ME04 build and child-plan paths consume the shared truth assertion', () => {
  const paths = [
    'scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs',
    'scripts/audits/english_master_index_publishable_v1_build.mjs',
    'scripts/audits/english_master_index_chaos_rising_completion_package_v1.mjs',
    'scripts/audits/english_master_index_pkg04a_chaos_rising_child_printing_completion_v1.mjs',
  ];

  for (const path of paths) {
    const source = fs.readFileSync(path, 'utf8');
    assert.match(source, /applyMe04FinishTruthV1|assertMe04FinishTruthV1/, `${path} lacks the ME04 truth gate`);
  }

  const masterBuilder = fs.readFileSync(paths[0], 'utf8');
  const preWriteAssertion = masterBuilder.indexOf("assertMe04FinishTruthV1(index.printings");
  const reportWrite = masterBuilder.indexOf('await writeReports({');
  assert.ok(preWriteAssertion >= 0 && reportWrite > preWriteAssertion);
});

test('release and pricing ingestion boundaries cannot manufacture child printings', () => {
  assert.match(RELEASE_PLAYBOOK, /materializes_child_printings/);
  assert.match(RELEASE_PLAYBOOK, /exact counts by finish/i);
  assert.match(RELEASE_PLAYBOOK, /price[\s\S]*cannot supply printing\s+truth or create a child row/i);

  const releaseRunner = fs.readFileSync('scripts/ingest/new_set_release_ingest_v1.mjs', 'utf8');
  assert.doesNotMatch(
    releaseRunner,
    /\b(?:insert\s+into|update|delete\s+from|merge\s+into)\s+(?:public\.)?card_printings\b/i,
  );

  const pricingNormalizer = fs.readFileSync(
    'backend/pricing/market_reference_tcgdex_pricing_audit_v1.mjs',
    'utf8',
  );
  assert.match(pricingNormalizer, /card\?\.variants\?\.holo === true/);
  assert.match(pricingNormalizer, /card\?\.variants\?\.normal === false/);
  assert.match(pricingNormalizer, /unsuffixed_legacy_normal_review_only/);
  assert.match(pricingNormalizer, /card_printing_writes: false/);
});

test('runtime catalog points ingestion enforcement at the authoritative contracts and guards', () => {
  const ingestion = CONTRACT_RUNTIME_CATALOG_V1.INGESTION_PIPELINE_CONTRACT_V1;
  assert.deepEqual(ingestion.enforcement_points.checkpoint, [
    'docs/contracts/INGESTION_PIPELINE_CONTRACT_V1.md',
  ]);
  assert.ok(
    ingestion.enforcement_points.worker.includes(
      'scripts/audits/english_master_index_pkg04a_chaos_rising_child_printing_completion_v1.mjs',
    ),
  );
  assert.ok(
    ingestion.enforcement_points.worker.includes(
      'scripts/audits/english_master_index_cardtrader_finish_acquisition_v1.mjs',
    ),
  );
  assert.ok(
    ingestion.enforcement_points.audit.includes(
      'tests/contracts/ingestion_finish_truth_guard_v1.test.mjs',
    ),
  );

  const tcgdex = CONTRACT_RUNTIME_CATALOG_V1.TCGDEX_SOURCE_CONTRACT_V1;
  assert.deepEqual(tcgdex.enforcement_points.checkpoint, [
    'docs/contracts/TCGDEX_SOURCE_CONTRACT_V1.md',
  ]);
  assert.ok(
    tcgdex.enforcement_points.worker.includes(
      'backend/pricing/market_reference_tcgdex_pricing_audit_v1.mjs',
    ),
  );
  assert.match(tcgdex.enforcement_points.quarantine_behavior, /cannot write card_printings/);
});
