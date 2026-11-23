import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFinalAdmission,
  assertionDispositionRows,
} from '../../scripts/audits/japanese_master_index_v4/final_admission_v1.mjs';

test('inactive historical evidence stays excluded even when its parent is admissible', () => {
  const rows = assertionDispositionRows({
    sourceAssertionUnion: [{ union_row_key: 'retired', assertion_lane: 'preserved_inactive_evidence', evidence_id: 'old', projected_candidate_key: 'parent', resolution_status: 'preserved_inactive_evidence' }],
    cardRowsByKey: new Map([['parent', { final_disposition: 'master_admissible' }]]),
    conflictIndexes: { unresolvedAssertions: new Map() },
    futureRegistryKeys: new Set(),
  });
  assert.equal(rows[0].final_disposition, 'adjudicated_excluded');
  assert.equal(rows[0].disposition_reason, 'inactive_historical_evidence');
  assert.equal(rows[0].evidence_id, 'old');
});

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

test('gap report counts active evidence separately from retained historical IDs', () => {
  const source = assertion({ key: 'single', sourceId: 'community', sourceFamily: 'community' });
  const item = candidate({ key: 'one', assertionKeys: ['single'], sourceIds: ['community'] });
  item.baseline_evidence_ids = ['active', 'retired'];
  item.active_baseline_evidence_ids = ['active'];
  const result = buildFixture({ sourceAssertions: [source], identityCandidates: [item] });
  const gap = result.datasets.master_source_gap_rows_v1.find((row) => row.subject_key === 'one');
  assert.ok(gap);
  assert.equal(gap.preserved_live_evidence_rows, 1);
});

test('older candidate artifacts without active-ID metadata retain their prior gap count', () => {
  const source = assertion({ key: 'legacy', sourceId: 'community', sourceFamily: 'community' });
  const item = candidate({ key: 'old', assertionKeys: ['legacy'], sourceIds: ['community'] });
  item.baseline_evidence_ids = ['one', 'two'];
  const result = buildFixture({ sourceAssertions: [source], identityCandidates: [item] });
  const gap = result.datasets.master_source_gap_rows_v1.find((row) => row.subject_key === 'old');
  assert.ok(gap);
  assert.equal(gap.preserved_live_evidence_rows, 2);
});

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

test('mismatched source claims cannot grant official identity or finish authority', () => {
  const official = assertion({ key: 'official', sourceId: 'official_jp_cards', sourceFamily: 'pokemon_card_official_jp', finishLabels: ['normal'] });
  const spoofed = assertion({ key: 'spoofed', sourceId: 'pokeapi_species_names_only', sourceFamily: 'limitless_tcg_jp', finishLabels: ['normal'] });
  const card = candidate({ key: 'card', assertionKeys: ['official', 'spoofed'], sourceIds: [official.source_id, spoofed.source_id] });
  const result = buildFixture({
    sourceAssertions: [official, spoofed], identityCandidates: [card],
    printingCandidates: [{ printing_candidate_key: 'finish', identity_candidate_key: 'card', finish_key: 'normal', assertion_keys: ['official', 'spoofed'], candidate_kind: 'novel_printing_exact_finish' }],
    familyProjectionRows: [{ candidate_key: 'card', projection_status: 'projected_exact', species_id: 'species-pikachu', projection_methods: ['exact_japanese_name'] }],
  });
  const printing = result.datasets.master_printing_fact_rows_v1[0];
  assert.deepEqual(printing.independent_source_families, ['official_jp']);
  assert.equal(printing.final_disposition, 'blocked');
});

test('an unrecognized or inconsistent assertion cannot claim an official family through candidate source IDs', () => {
  for (const [sourceId, sourceFamily] of [
    ['pokeapi_species_names_only', 'pokemon_card_official_jp'],
    ['official_jp_cards', 'limitless_tcg_jp'],
  ]) {
    const source = assertion({ key: 'bad', sourceId, sourceFamily });
    const card = candidate({ key: 'card', assertionKeys: ['bad'], sourceIds: [sourceId] });
    const result = buildFixture({ sourceAssertions: [source], identityCandidates: [card] });
    const row = result.datasets.master_card_resolution_rows_v1[0];
    assert.equal(row.official_source_present, false, sourceId);
    assert.equal(row.independent_source_count, 0, sourceId);
  }
});

test('a false official claim cannot select the canonical Japanese spelling', () => {
  const source = assertion({ key: 'bad-name', sourceId: 'pokeapi_species_names_only', sourceFamily: 'pokemon_card_official_jp', name: 'バクーダEX' });
  const card = candidate({ key: 'card', assertionKeys: ['bad-name'], sourceIds: [source.source_id], name: 'バクーダex' });
  const result = buildFixture({ sourceAssertions: [source], identityCandidates: [card] });
  assert.equal(result.datasets.master_card_resolution_rows_v1[0].printed_name_ja, 'バクーダex');
});

test('a baseline-only recognized source key keeps its existing family', () => {
  const card = candidate({ key: 'existing', assertionKeys: [], sourceIds: ['official_jp_cards'], kind: 'existing_parent', existingCardPrintId: 'parent' });
  const result = buildFixture({ sourceAssertions: [], identityCandidates: [card] });
  const row = result.datasets.master_card_resolution_rows_v1[0];
  assert.deepEqual(row.independent_source_families, ['official_jp']);
  assert.equal(row.official_source_present, true);
});

test('explicitly ineligible active baseline evidence cannot supply an official family', () => {
  const card = candidate({ key: 'existing', assertionKeys: [], sourceIds: ['pokemon_card_official_jp'], kind: 'existing_parent', existingCardPrintId: 'parent' });
  card.baseline_evidence_ids = ['stale'];
  card.active_baseline_evidence_ids = ['stale'];
  card.current_eligible_baseline_evidence_ids = [];
  card.current_eligible_baseline_source_keys = [];
  const result = buildFixture({ sourceAssertions: [], identityCandidates: [card] });
  const row = result.datasets.master_card_resolution_rows_v1[0];
  assert.equal(row.official_source_present, false);
  assert.deepEqual(row.current_eligible_baseline_evidence_ids, []);
  assert.deepEqual(row.active_baseline_evidence_ids, ['stale']);
});

test('valid fresh assertions still count when baseline eligibility is explicitly empty', () => {
  const source = assertion({ key: 'official', sourceId: 'official_jp_cards', sourceFamily: 'pokemon_card_official_jp' });
  const card = candidate({ key: 'card', assertionKeys: ['official'], sourceIds: [source.source_id] });
  card.current_eligible_baseline_source_keys = [];
  card.current_eligible_baseline_evidence_ids = [];
  const result = buildFixture({ sourceAssertions: [source], identityCandidates: [card] });
  assert.equal(result.datasets.master_card_resolution_rows_v1[0].official_source_present, true);
});

test('malformed explicit baseline eligibility fails closed', () => {
  const card = candidate({ key: 'existing', assertionKeys: [], sourceIds: ['pokemon_card_official_jp'] });
  card.current_eligible_baseline_source_keys = null;
  card.current_eligible_baseline_evidence_ids = null;
  const result = buildFixture({ sourceAssertions: [], identityCandidates: [card] });
  const row = result.datasets.master_card_resolution_rows_v1[0];
  assert.equal(row.official_source_present, false);
  assert.deepEqual(row.current_eligible_baseline_evidence_ids, []);
});

test('a qualified baseline source keeps its recognized family', () => {
  const card = candidate({ key: 'existing', assertionKeys: [], sourceIds: ['pokemon_card_official_jp'] });
  card.current_eligible_baseline_source_keys = ['pokemon_card_official_jp'];
  card.current_eligible_baseline_evidence_ids = ['current'];
  const result = buildFixture({ sourceAssertions: [], identityCandidates: [card] });
  const row = result.datasets.master_card_resolution_rows_v1[0];
  assert.equal(row.official_source_present, true);
  assert.deepEqual(row.current_eligible_baseline_evidence_ids, ['current']);
});

test('ineligible live evidence remains excluded in the assertion disposition', () => {
  const rows = assertionDispositionRows({
    sourceAssertionUnion: [{ union_row_key: 'stale', assertion_lane: 'preserved_live_evidence', current_identity_claims_eligible: false, evidence_id: 'old', projected_candidate_key: 'parent' }],
    cardRowsByKey: new Map([['parent', { final_disposition: 'master_admissible' }]]),
    conflictIndexes: { unresolvedAssertions: new Map() }, futureRegistryKeys: new Set(),
  });
  assert.equal(rows[0].final_disposition, 'adjudicated_excluded');
  assert.equal(rows[0].disposition_reason, 'active_evidence_identity_claims_unqualified');
});

test('final admission independently rejects a composite presented as an exact numbered card', () => {
  const source=assertion({key:'composite',sourceId:'official_jp_cards',sourceFamily:'pokemon_card_official_jp',category:'V-UNION'});
  const card=candidate({key:'composite-candidate',assertionKeys:[source.assertion_key],sourceIds:[source.source_id]});
  const result=buildFixture({sourceAssertions:[source],identityCandidates:[card],familyProjectionRows:[{
    candidate_key:card.candidate_key,projection_status:'projected_exact',species_id:'species-pikachu'}]});
  assert.equal(result.datasets.master_admissible_card_rows_v1.length,0);
  assert.ok(result.datasets.master_card_resolution_rows_v1[0].disposition_reasons.includes('multipart_assembly_requires_component_reconciliation'));
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
