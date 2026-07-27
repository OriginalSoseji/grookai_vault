import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFinalAdmission,
} from '../../scripts/audits/japanese_master_index_v4/final_admission_v1.mjs';

function assertion({
  key,
  sourceId,
  sourceFamily,
  name = 'ピカチュウ',
  category = 'たね',
  finishLabels = [],
  registryKey = 'jpn-test',
}) {
  return {
    assertion_key: key,
    source_id: sourceId,
    source_family: sourceFamily,
    printed_name: name,
    category,
    type_line: null,
    finish_labels: finishLabels,
    image_urls: [],
    identity_modifiers: [],
    edition_labels: [],
    distribution_labels: [],
    stamp_labels: [],
    registry_key: registryKey,
  };
}

function registryEntry({
  key = 'jpn-test',
  scopeStatus = 'admitted_official_expansion_release',
  name = 'テスト拡張パック',
}) {
  return {
    registry_key: key,
    scope_status: scopeStatus,
    registry_entry_kind: 'official_expansion_release',
    preferred_source_name: name,
    source_native_names: [name],
    source_container_kinds: ['expansion'],
    source_release_kinds: ['expansion'],
    source_scope_hints: [],
    source_era_labels: ['test-era'],
    source_release_dates: ['2026-01-01'],
    source_native_codes: ['TEST'],
    live_set_code_aliases: ['TEST'],
    source_expected_card_counts: [1],
    source_ids: ['official_jp_cards'],
    independent_source_count: 1,
  };
}

function candidate({
  key,
  assertionKeys,
  sourceIds,
  name = 'ピカチュウ',
  registryKeys = ['jpn-test'],
  kind = 'novel_numbered',
  existingCardPrintId = null,
}) {
  return {
    candidate_key: key,
    candidate_kind: kind,
    assertion_keys: assertionKeys,
    source_ids: sourceIds,
    baseline_evidence_ids: [],
    registry_keys: registryKeys,
    printed_name_ja_candidates: [name],
    printed_number_candidates: ['1'],
    number_core: '1',
    english_name_candidates: ['Pikachu'],
    image_urls: [],
    promotion_status: 'index_candidate',
    existing_card_print_id: existingCardPrintId,
    existing_gv_id: existingCardPrintId ? 'GV-PK-JPN-TEST-001' : null,
  };
}

function unionRow(assertionRow, candidateKey, index) {
  return {
    union_row_key: `fresh:${assertionRow.assertion_key}:${index}`,
    assertion_key: assertionRow.assertion_key,
    evidence_id: null,
    assertion_lane: 'fresh_source_assertion',
    source_key: assertionRow.source_id,
    registry_key: assertionRow.registry_key,
    projected_candidate_key: candidateKey,
    resolution_status: 'novel_numbered_candidate',
  };
}

function buildFixture({
  registryEntries = [registryEntry({})],
  sourceAssertions,
  identityCandidates,
  printingCandidates = [],
  familyProjectionRows = [],
  candidateConflicts = [],
  parents = [],
  familyReviewRows = [],
  jpnSpeciesLinks = [],
  futureRegistryKeys = new Set(),
}) {
  return buildFinalAdmission({
    registryEntries,
    setConflicts: [],
    sourceExhaustionRows: [],
    futureRegistryKeys,
    sourceAssertionUnion: sourceAssertions.map((row, index) => (
      unionRow(
        row,
        identityCandidates.find(
          (item) => item.assertion_keys.includes(row.assertion_key),
        )?.candidate_key ?? null,
        index,
      )
    )),
    identityCandidates,
    printingCandidates,
    familyProjectionRows,
    candidateConflicts,
    sourceAssertions,
    parents,
    familyReviewRows,
    jpnSpeciesLinks,
  });
}

test('official identity and two-source finish are master-admissible', () => {
  const official = assertion({
    key: 'official-1',
    sourceId: 'official_jp_cards',
    sourceFamily: 'pokemon_card_official_jp',
    finishLabels: ['normal'],
  });
  const limitless = assertion({
    key: 'limitless-1',
    sourceId: 'limitless_jp_cards',
    sourceFamily: 'limitless_tcg_jp',
    finishLabels: ['normal'],
  });
  const card = candidate({
    key: 'card-1',
    assertionKeys: [official.assertion_key, limitless.assertion_key],
    sourceIds: [official.source_id, limitless.source_id],
  });
  const result = buildFixture({
    sourceAssertions: [official, limitless],
    identityCandidates: [card],
    printingCandidates: [{
      printing_candidate_key: 'printing-1',
      identity_candidate_key: card.candidate_key,
      finish_key: 'normal',
      assertion_keys: [official.assertion_key, limitless.assertion_key],
      candidate_kind: 'novel_printing_exact_finish',
      existing_card_printing_id: null,
      existing_printing_gv_id: null,
    }],
    familyProjectionRows: [{
      candidate_key: card.candidate_key,
      projection_status: 'projected_exact',
      species_id: 'species-pikachu',
      projection_methods: ['exact_japanese_name'],
    }],
  });

  assert.equal(result.datasets.master_admissible_set_rows_v1.length, 1);
  assert.equal(result.datasets.master_admissible_card_rows_v1.length, 1);
  assert.equal(result.datasets.master_admissible_printing_rows_v1.length, 1);
  assert.equal(
    result.datasets.master_family_relationship_rows_v1[0].species_id,
    'species-pikachu',
  );
  assert.equal(result.completion.all_static_admission_checks_pass, true);
});

test('single non-official source remains blocked', () => {
  const source = assertion({
    key: 'limitless-only',
    sourceId: 'limitless_jp_cards',
    sourceFamily: 'limitless_tcg_jp',
  });
  const card = candidate({
    key: 'single-card',
    assertionKeys: [source.assertion_key],
    sourceIds: [source.source_id],
  });
  const result = buildFixture({
    sourceAssertions: [source],
    identityCandidates: [card],
    familyProjectionRows: [{
      candidate_key: card.candidate_key,
      projection_status: 'projected_exact',
      species_id: 'species-pikachu',
    }],
  });

  assert.equal(result.datasets.master_admissible_card_rows_v1.length, 0);
  assert.deepEqual(
    result.datasets.master_card_resolution_rows_v1[0].disposition_reasons,
    ['single_source_only'],
  );
  assert.equal(
    result.datasets.master_assertion_disposition_rows_v1[0]
      .final_disposition,
    'single_source_only',
  );
});

test('explicit trainer evidence overrides heuristic species projection', () => {
  const source = assertion({
    key: 'official-trainer',
    sourceId: 'official_jp_cards',
    sourceFamily: 'pokemon_card_official_jp',
    name: '博士の研究',
    category: 'トレーナーズ',
  });
  const card = candidate({
    key: 'trainer-card',
    assertionKeys: [source.assertion_key],
    sourceIds: [source.source_id],
    name: '博士の研究',
  });
  const result = buildFixture({
    sourceAssertions: [source],
    identityCandidates: [card],
    familyProjectionRows: [{
      candidate_key: card.candidate_key,
      projection_status: 'projected_exact',
      species_id: 'incorrect-species',
    }],
  });

  const resolved = result.datasets.master_admissible_card_rows_v1[0];
  assert.equal(resolved.card_type, 'trainer');
  assert.equal(resolved.family_key, 'domain:trainer');
  assert.equal(
    result.datasets.master_family_relationship_rows_v1[0].species_id,
    null,
  );
});

test('future release is adjudicated excluded, never admitted', () => {
  const source = assertion({
    key: 'future-official',
    sourceId: 'official_jp_cards',
    sourceFamily: 'pokemon_card_official_jp',
    registryKey: 'jpn-future',
  });
  const card = candidate({
    key: 'future-card',
    assertionKeys: [source.assertion_key],
    sourceIds: [source.source_id],
    registryKeys: ['jpn-future'],
  });
  const result = buildFixture({
    registryEntries: [registryEntry({ key: 'jpn-future' })],
    sourceAssertions: [source],
    identityCandidates: [card],
    familyProjectionRows: [{
      candidate_key: card.candidate_key,
      projection_status: 'projected_exact',
      species_id: 'species-pikachu',
    }],
    futureRegistryKeys: new Set(['jpn-future']),
  });

  assert.equal(result.datasets.master_admissible_card_rows_v1.length, 0);
  assert.equal(
    result.datasets.master_card_resolution_rows_v1[0].final_disposition,
    'adjudicated_excluded',
  );
});

test('hard identity collision is blocked', () => {
  const source = assertion({
    key: 'official-conflict',
    sourceId: 'official_jp_cards',
    sourceFamily: 'pokemon_card_official_jp',
  });
  const card = candidate({
    key: 'conflicting-card',
    assertionKeys: [source.assertion_key],
    sourceIds: [source.source_id],
  });
  const result = buildFixture({
    sourceAssertions: [source],
    identityCandidates: [card],
    familyProjectionRows: [{
      candidate_key: card.candidate_key,
      projection_status: 'projected_exact',
      species_id: 'species-pikachu',
    }],
    candidateConflicts: [{
      conflict_key: 'conflict-1',
      conflict_type: 'same_source_id_conflicting_coordinates',
      assertion_keys: [source.assertion_key],
      candidate_key: card.candidate_key,
    }],
  });

  assert.equal(result.datasets.master_admissible_card_rows_v1.length, 0);
  assert.ok(
    result.datasets.master_card_resolution_rows_v1[0]
      .disposition_reasons.includes('unresolved_exact_identity_collision'),
  );
});

test('Japanese case and spacing variants resolve while English-only names do not', () => {
  const japaneseSource = assertion({
    key: 'official-japanese',
    sourceId: 'official_jp_cards',
    sourceFamily: 'pokemon_card_official_jp',
    name: 'バクーダex',
  });
  const englishSource = assertion({
    key: 'official-english',
    sourceId: 'official_jp_cards',
    sourceFamily: 'pokemon_card_official_jp',
    name: 'Pikachu',
  });
  const japaneseCard = candidate({
    key: 'existing-japanese',
    assertionKeys: [japaneseSource.assertion_key],
    sourceIds: [japaneseSource.source_id],
    name: 'バクーダex',
    kind: 'existing_parent',
    existingCardPrintId: 'existing-japanese-id',
  });
  const englishCard = candidate({
    key: 'existing-english',
    assertionKeys: [englishSource.assertion_key],
    sourceIds: [englishSource.source_id],
    name: 'Pikachu',
    kind: 'existing_parent',
    existingCardPrintId: 'existing-english-id',
  });
  const result = buildFixture({
    sourceAssertions: [japaneseSource, englishSource],
    identityCandidates: [japaneseCard, englishCard],
    parents: [
      {
        card_print_id: 'existing-japanese-id',
        printed_name: 'バクーダEX',
        printed_number: '1',
        number_plain: '1',
      },
      {
        card_print_id: 'existing-english-id',
        printed_name: 'Pikachu',
        printed_number: '1',
        number_plain: '1',
      },
    ],
    jpnSpeciesLinks: [
      {
        card_print_id: 'existing-japanese-id',
        species_id: 'species-camerupt',
        active: true,
        confidence: 1,
      },
      {
        card_print_id: 'existing-english-id',
        species_id: 'species-pikachu',
        active: true,
        confidence: 1,
      },
    ],
  });

  assert.equal(result.datasets.master_admissible_card_rows_v1.length, 1);
  assert.equal(
    result.datasets.master_admissible_card_rows_v1[0].printed_name_ja,
    'バクーダex',
  );
  const english = result.datasets.master_card_resolution_rows_v1.find(
    (row) => row.jpn_card_identity_key === 'existing-english',
  );
  assert.ok(
    english.disposition_reasons.includes('japanese_printed_name_missing'),
  );
});
