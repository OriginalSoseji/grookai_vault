import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMasterSetAnchors,
  normalizeJapaneseName,
  numberCore,
  reconcileCards,
  reconcileSets,
} from '../../scripts/audits/japanese_master_index_v4/live_reconciliation_v1.mjs';

function masterSet(overrides = {}) {
  return {
    canonical_name_ja: 'テストセット',
    collector_facing_name_en: 'Test Set',
    jpn_set_key: 'jpn-test',
    official_code_evidence: ['TEST'],
    release_kind: 'expansion',
    source_aliases: ['jpn-TEST', 'Test Set'],
    source_ids: ['official_jp'],
    ...overrides,
  };
}

function masterCard(overrides = {}) {
  return {
    candidate_kind: 'novel_numbered',
    collector_facing_name_en: null,
    existing_card_print_id: null,
    existing_gv_id: null,
    family_key: 'species:species-1',
    family_status: 'resolved_species',
    independent_source_families: ['official_jp'],
    image_urls: ['https://example.test/card.jpg'],
    jpn_card_identity_key: 'candidate-1',
    jpn_set_key: 'jpn-test',
    printed_name_ja: 'ピカチュウ',
    printed_name_ja_candidates: ['ピカチュウ'],
    printed_number: '025',
    ...overrides,
  };
}

function reconciliationInput(overrides = {}) {
  return {
    liveEvidence: [],
    liveIdentities: [],
    liveParents: [],
    livePrintings: [],
    liveSpeciesLinks: [],
    masterCards: [masterCard()],
    setRows: reconcileSets([masterSet()], [{
      code: 'jpn-test',
      id: 'set-1',
      name: 'Test Set',
      printed_total: 100,
      source: 'fixture',
    }]),
    speciesRows: [{
      canonical_name: 'Pikachu',
      id: 'species-1',
    }],
    ...overrides,
  };
}

test('reconciliation normalizers preserve Japanese identity and number grain', () => {
  assert.equal(normalizeJapaneseName(' ピカ チュウ '), 'ピカチュウ');
  assert.equal(numberCore('025/100'), '25');
  assert.equal(numberCore('001-A'), '1A');
});

test('set reconciliation distinguishes exact, missing, and ambiguous live sets', () => {
  const sets = [
    masterSet(),
    masterSet({
      canonical_name_ja: '未収録セット',
      collector_facing_name_en: 'Missing Set',
      jpn_set_key: 'jpn-missing',
      official_code_evidence: ['MISSING'],
      source_aliases: ['jpn-missing'],
    }),
    masterSet({ jpn_set_key: 'jpn-dup' }),
  ];
  const rows = reconcileSets(sets, [
    {
      code: 'jpn-test',
      id: 'set-1',
      name: 'Test Set',
      source: 'fixture',
    },
    {
      code: 'jpn-dup',
      id: 'set-2',
      name: 'Duplicate A',
      source: 'fixture',
    },
    {
      code: 'JPN-DUP',
      id: 'set-3',
      name: 'Duplicate B',
      source: 'fixture',
    },
  ]);

  assert.equal(rows[0].reconciliation_status, 'existing_exact_code');
  assert.equal(rows[1].reconciliation_status, 'missing_set');
  assert.equal(rows[2].reconciliation_status, 'existing_exact_code_ambiguous');
});

test('existing parents resolve an otherwise ambiguous live set mapping', () => {
  const cards = [masterCard({
    candidate_kind: 'existing_parent',
    existing_card_print_id: 'card-parent-1',
    jpn_set_key: 'jpn-dup',
  })];
  const liveSets = [
    {
      code: 'jpn-dup',
      id: 'set-1',
      name: 'Duplicate A',
      source: 'fixture',
    },
    {
      code: 'JPN-DUP',
      id: 'set-2',
      name: 'Duplicate B',
      source: 'fixture',
    },
  ];
  const anchors = buildMasterSetAnchors(cards, [{
    card_print_id: 'card-parent-1',
    set_id: 'set-2',
  }]);
  const rows = reconcileSets(
    [masterSet({ jpn_set_key: 'jpn-dup' })],
    liveSets,
    anchors,
  );

  assert.equal(rows[0].reconciliation_status, 'existing_parent_anchor');
  assert.deepEqual(rows[0].live_matches.map((row) => row.id), ['set-2']);
  assert.deepEqual(rows[0].promotion_blockers, []);
});

test('novel exact identities already live are not emitted as insert candidates', () => {
  const rows = reconcileCards(reconciliationInput({
    liveIdentities: [{
      card_print_id: 'card-1',
      identity_payload: { card_name_ja_candidates: ['ピカチュウ'] },
      is_active: true,
      normalized_printed_name: 'ピカチュウ',
      source_name_raw: 'ピカチュウ',
    }],
    liveParents: [{
      card_print_id: 'card-1',
      gv_id: 'GV-PK-JPN-TEST-025',
      identity_domain: 'pokemon_jpn',
      number_plain: '025',
      printed_name: 'Pikachu',
      printed_number: '025',
      set_code: 'jpn-test',
      set_id: 'set-1',
    }],
  }));

  assert.equal(
    rows[0].reconciliation_status,
    'novel_candidate_already_live_exact',
  );
  assert.equal(rows[0].promotion_readiness, 'blocked');
});

test('missing novel identities become deltas with species English fallback', () => {
  const rows = reconcileCards(reconciliationInput());

  assert.equal(
    rows[0].reconciliation_status,
    'novel_candidate_missing_from_live',
  );
  assert.equal(rows[0].display_name_en, 'Pikachu');
  assert.equal(
    rows[0].display_name_source,
    'language_agnostic_species_fallback',
  );
  assert.equal(rows[0].promotion_readiness, 'delta_candidate');
});

test('number occupants with a different Japanese name block promotion', () => {
  const rows = reconcileCards(reconciliationInput({
    liveIdentities: [{
      card_print_id: 'card-1',
      identity_payload: { card_name_ja_candidates: ['ライチュウ'] },
      is_active: true,
      normalized_printed_name: 'ライチュウ',
      source_name_raw: 'ライチュウ',
    }],
    liveParents: [{
      card_print_id: 'card-1',
      gv_id: 'GV-PK-JPN-TEST-025',
      identity_domain: 'pokemon_jpn',
      number_plain: '025',
      printed_name: 'Raichu',
      printed_number: '025',
      set_code: 'jpn-test',
      set_id: 'set-1',
    }],
  }));

  assert.equal(
    rows[0].reconciliation_status,
    'novel_candidate_number_occupied_name_mismatch',
  );
  assert.ok(rows[0].promotion_blockers.includes(
    'live_set_number_occupied_by_different_name',
  ));
  assert.equal(rows[0].promotion_readiness, 'blocked');
});

test('existing parent reconciliation reports drift and missing evidence lanes', () => {
  const card = masterCard({
    candidate_kind: 'existing_parent',
    existing_card_print_id: 'card-1',
    existing_gv_id: 'GV-PK-JPN-TEST-025',
    independent_source_families: ['official_jp', 'tcgdex'],
    jpn_card_identity_key: 'existing:card-1',
  });
  const rows = reconcileCards(reconciliationInput({
    liveEvidence: [{
      active: true,
      card_print_id: 'card-1',
      source_key: 'pokemon_card_official_jp',
    }],
    liveIdentities: [{
      card_print_id: 'card-1',
      identity_payload: { card_name_ja_candidates: ['ピカチュウ'] },
      is_active: true,
      normalized_printed_name: 'ピカチュウ',
      source_name_raw: 'ピカチュウ',
    }],
    liveParents: [{
      card_print_id: 'card-1',
      gv_id: 'GV-PK-JPN-TEST-025',
      identity_domain: 'pokemon_jpn',
      number_plain: '025',
      printed_name: 'Pikachu',
      printed_number: '025',
      set_code: 'jpn-test',
      set_id: 'set-1',
    }],
    liveSpeciesLinks: [{
      active: true,
      card_print_id: 'card-1',
      role: 'primary',
      species_id: 'species-1',
    }],
    masterCards: [card],
  }));

  assert.equal(rows[0].reconciliation_status, 'existing_parent_aligned');
  assert.deepEqual(rows[0].missing_source_families, ['tcgdex']);
  assert.equal(rows[0].family_reconciliation_status, 'already_linked');
});

test('reconciliation runner contains no mutation query or payload apply path', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/live_reconciliation_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(
    source,
    /\b(?:insert|update|delete|merge|truncate|alter|drop)\s+(?:into|table|from|public\.)/i,
  );
  assert.match(source, /withReadOnlyClient/);
  assert.match(source, /promotion_payload_generated:\s*false/);
});
