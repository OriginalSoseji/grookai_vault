import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  readVerifiedArtifact,
} from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';
import {
  buildPayloadContracts,
} from '../../scripts/audits/japanese_master_index_v4/payload_preflight_v1.mjs';
import {
  assertFinalPackage,
  EXPECTED_COUNTS_V2,
  normalizeFinalCardCandidate,
  STABLE_IDENTIFIER_NAMESPACE,
} from '../../scripts/audits/japanese_master_index_v4/payload_preflight_v2.mjs';

const FINAL_ROOT =
  'docs/audits/japanese_master_index_v4/complete_no_write';

async function readJsonl(filename) {
  const body = await fs.readFile(`${FINAL_ROOT}/${filename}`, 'utf8');
  return body.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

async function loadArtifactRows(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  return rows;
}

function fixtureCandidate({
  key = 'candidate-1',
  lane = 'existing_set',
  liveSetId = '11111111-1111-4111-8111-111111111111',
} = {}) {
  return {
    candidate_key: key,
    promotion_lane: lane,
    target_set: {
      jpn_set_key: 'jpn-test',
      live_set_id: liveSetId,
    },
    printed_identity: {
      collector_facing_name_en: 'Pikachu',
      collector_facing_name_source: 'master_index_explicit',
      printed_name_ja: 'pikachu-fixture',
      printed_number: '025',
      card_domain: 'pokemon',
      card_type: 'pokemon',
      identity_modifiers: [],
    },
    family_relationship: {
      family_key: 'species:22222222-2222-4222-8222-222222222222',
      family_status: 'resolved_species',
      relationship_type: 'language_agnostic_species',
      species_id: '22222222-2222-4222-8222-222222222222',
      confidence: 0.95,
    },
    source_evidence: {
      source_assertion_keys: ['assertion-1'],
      source_ids: ['fixture'],
    },
    image_evidence: {
      urls: ['https://example.test/card.png'],
    },
  };
}

const fixtureAssertion = {
  assertion_key: 'assertion-1',
  assertion_lane: 'fresh_source_assertion',
  registry_key: 'jpn-test',
  resolution_status: 'novel_numbered_candidate',
  source_external_id: 'TEST:025',
  source_key: 'fixture',
  raw_snapshot_ref: 'fixture://test',
  raw_snapshot_sha256: 'a'.repeat(64),
  image_urls: ['https://example.test/card.png'],
};

const fixtureSpecies = {
  id: '22222222-2222-4222-8222-222222222222',
  canonical_name: 'pikachu',
  display_name: 'Pikachu',
  active: true,
};

test('V2 preserves the V1 deterministic identifier namespace', () => {
  assert.equal(
    STABLE_IDENTIFIER_NAMESPACE,
    'JPN-MASTER-INDEX-PAYLOAD-PREFLIGHT-V1',
  );
  const candidate = fixtureCandidate();
  const v1 = buildPayloadContracts({
    setCandidates: [],
    cardCandidates: [candidate],
    assertions: [fixtureAssertion],
    speciesRows: [fixtureSpecies],
  });
  const v2 = buildPayloadContracts({
    setCandidates: [],
    cardCandidates: [normalizeFinalCardCandidate(candidate, 'direct')],
    assertions: [fixtureAssertion],
    speciesRows: [fixtureSpecies],
  });
  assert.equal(v2.card_print_rows[0].db_row.id, v1.card_print_rows[0].db_row.id);
  assert.equal(v2.identity_rows[0].db_row.id, v1.identity_rows[0].db_row.id);
  assert.equal(v2.card_print_rows[0].db_row.gv_id, v1.card_print_rows[0].db_row.gv_id);
});

test('additional resolved domain cards normalize by final promotion lane', () => {
  const base = {
    candidate_key: 'additional-1',
    family_relationship: {
      family_key: 'domain:trainer',
      family_status: 'resolved_domain',
    },
  };
  const direct = normalizeFinalCardCandidate({
    ...base,
    promotion_contract: { lane: 'direct' },
  }, 'set_prerequisite');
  assert.deepEqual(direct.family_relationship, {
    confidence: null,
    family_key: 'domain:trainer',
    family_status: 'resolved_domain',
    relationship_type: 'classified_non_pokemon_domain',
    review_status: 'reviewed_for_index_only_not_promoted',
    species_id: null,
  });
  assert.equal(direct.promotion_lane, 'existing_set');

  const setFirst = normalizeFinalCardCandidate({
    ...base,
    promotion_contract: { lane: 'set_first' },
  }, 'set_prerequisite');
  assert.equal(setFirst.promotion_lane, 'set_prerequisite');
});

test('the frozen final package reconciles to all 5,336 candidates', async () => {
  const [direct, dependent, additional, sets, counts] = await Promise.all([
    readJsonl('jpn_v4_direct_card_promotion_package.jsonl'),
    readJsonl('jpn_v4_dependent_card_promotion_package.jsonl'),
    readJsonl('jpn_v4_additional_resolved_card_package.jsonl'),
    readJsonl('jpn_v4_set_promotion_package.jsonl'),
    fs.readFile(`${FINAL_ROOT}/jpn_v4_final_counts.json`, 'utf8')
      .then(JSON.parse),
  ]);
  assert.doesNotThrow(() => assertFinalPackage({
    direct,
    dependent,
    additional,
    sets,
    counts,
  }));
  assert.deepEqual(EXPECTED_COUNTS_V2, {
    direct: 38,
    dependent: 3_850,
    additional: 1_448,
    cards: 5_336,
    sets: 1_041,
  });
  assert.equal(
    additional.filter((row) => row.promotion_contract?.lane === 'direct')
      .length,
    15,
  );
  assert.equal(
    additional.filter((row) => row.promotion_contract?.lane === 'set_first')
      .length,
    1_433,
  );
  assert.equal(
    additional.every(
      (row) => row.family_relationship?.family_status === 'resolved_domain',
    ),
    true,
  );
});

test('V2 preserves every generated V1 target row byte-for-byte', async () => {
  const [v1Record, v2Record] = await Promise.all([
    readVerifiedArtifact(
      'docs/audits/japanese_master_index_v4/payload_preflight/'
      + 'jpn_payload_preflight_v1.json',
    ),
    readVerifiedArtifact(
      'docs/audits/japanese_master_index_v4/payload_preflight_v2/'
      + 'jpn_payload_preflight_v2.json',
    ),
  ]);
  const datasetKeys = [
    'set_rows',
    'card_print_rows',
    'identity_rows',
    'evidence_rows',
    'family_review_rows',
    'child_printing_rows',
  ];
  for (const key of datasetKeys) {
    const [v1Rows, v2Rows] = await Promise.all([
      loadArtifactRows(v1Record.artifact.content.datasets[key]),
      loadArtifactRows(v2Record.artifact.content.datasets[key]),
    ]);
    const v2ById = new Map(
      v2Rows.map((row) => [row.db_row.id, row]),
    );
    assert.equal(
      v1Rows.every((row) => v2ById.has(row.db_row.id)),
      true,
      `${key} lost a V1 deterministic ID`,
    );
    for (const row of v1Rows) {
      assert.deepEqual(v2ById.get(row.db_row.id), row);
    }
  }
});

test('final package guard fails closed on blockers and duplicate keys', () => {
  const valid = {
    candidate_key: 'candidate-1',
    image_evidence: { urls: ['https://example.test/card.png'] },
    promotion_blockers: [],
  };
  const counts = {
    promotion: { total_cards_ready: 5_336, sets_first: 1_041 },
  };
  const direct = Array.from({ length: 38 }, (_, index) => ({
    ...valid,
    candidate_key: `direct-${index}`,
  }));
  const dependent = Array.from({ length: 3_850 }, (_, index) => ({
    ...valid,
    candidate_key: `dependent-${index}`,
  }));
  const additional = Array.from({ length: 1_448 }, (_, index) => ({
    ...valid,
    candidate_key: `additional-${index}`,
  }));
  const sets = Array.from({ length: 1_041 }, () => ({}));
  additional[0] = { ...additional[0], promotion_blockers: ['blocked'] };
  assert.throws(
    () => assertFinalPackage({
      direct,
      dependent,
      additional,
      sets,
      counts,
    }),
    /still contains blockers/,
  );
  additional[0] = { ...valid, candidate_key: direct[0].candidate_key };
  assert.throws(
    () => assertFinalPackage({
      direct,
      dependent,
      additional,
      sets,
      counts,
    }),
    /duplicate candidate keys/,
  );
});
