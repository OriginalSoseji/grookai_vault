import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTcgplayerOllamaCandidateIndexV1,
  candidateSearchNamesForTcgplayerOllamaRowV1,
  candidatePoolForTcgplayerOllamaRowV1,
  diagnoseTcgplayerOllamaCandidateGapV1,
  diagnosticPoolForTcgplayerOllamaRowV1,
  enrichTcgplayerOllamaRowV1,
  isLikelySealedTcgplayerProductV1,
  normalizeTcgplayerOllamaCandidateTextV1,
  normalizeTcgplayerOllamaCoordinateV1,
  normalizeTcgplayerOllamaSourceNameV1,
  rankTcgplayerOllamaCandidatesV1,
  rankTcgplayerOllamaDiagnosticReferencesV1,
  uniqueTcgplayerExtendedNumberV1,
} from '../../backend/pricing/tcgplayer_ollama_candidate_enrichment_v1.mjs';
import { planTcgplayerOllamaTriageRowV1 } from '../../backend/pricing/tcgplayer_ollama_triage_v1.mjs';

const baseCard = {
  card_print_id: 'card-1', gv_id: 'GV-PK-XY-19', set_id: 'set-1', set_code: 'xy1',
  set_name: 'XY Base Set', canonical_name: 'Abomasnow', canonical_number: '19',
  variant_key: '', active_standard_identity_count: 1, active_tcgplayer_mapping_count: 0,
};

test('candidate normalization preserves identity symbols and collector coordinates', () => {
  assert.equal(normalizeTcgplayerOllamaCandidateTextV1('Nidoran ♀ (Promo)'), 'nidoran f');
  assert.equal(normalizeTcgplayerOllamaCandidateTextV1('Flabébé'), 'flabebe');
  assert.equal(normalizeTcgplayerOllamaSourceNameV1('Pikachu - 005/012'), 'pikachu');
  assert.equal(normalizeTcgplayerOllamaCoordinateV1('019/123'), '19');
  assert.equal(normalizeTcgplayerOllamaCoordinateV1('AR06'), 'AR6');
  assert.equal(normalizeTcgplayerOllamaCoordinateV1('PW 2'), 'PW2');
});

test('candidate search keeps exact identity text and adds a base-name alias', () => {
  assert.deepEqual(candidateSearchNamesForTcgplayerOllamaRowV1({
    source_product_name: 'Chimchar - 76/130 [Diamond & Pearl]',
    normalized_source_name: 'chimchar 76 130 diamond pearl',
    printed_number: '076/130',
  }), ['chimchar 76 130 diamond pearl', 'chimchar diamond pearl', 'chimchar']);
  assert.deepEqual(candidateSearchNamesForTcgplayerOllamaRowV1({
    source_product_name: 'Fighting Energy (2004-2005)',
    normalized_source_name: 'fighting energy 2004 2005',
    printed_number: '105/109',
  }), ['fighting energy 2004 2005', 'fighting energy']);
});

test('global candidate lookup strips only the collector coordinate suffix', () => {
  const pikachu = {
    ...baseCard,
    card_print_id: 'pikachu-5',
    canonical_name: 'Pikachu',
    canonical_number: '5',
    identity_domain: 'pokemon_eng_standard',
  };
  const index = buildTcgplayerOllamaCandidateIndexV1([pikachu]);
  const pool = candidatePoolForTcgplayerOllamaRowV1({
    source_category_id: 3,
    source_product_name: 'Pikachu - 005/012',
    printed_number: '005/012',
  }, index);
  assert.deepEqual(pool.map((row) => row.card_print_id), ['pikachu-5']);
});

test('cross-set lookup uses exact coordinate plus a review-only base-name alias', () => {
  const chimchar = {
    ...baseCard,
    card_print_id: 'chimchar-76',
    canonical_name: 'Chimchar',
    canonical_number: '76',
    identity_domain: 'pokemon_eng_standard',
  };
  const index = buildTcgplayerOllamaCandidateIndexV1([chimchar]);
  const row = {
    source_category_id: 3,
    source_product_name: 'Chimchar - 76/130 [Diamond & Pearl]',
    normalized_source_name: 'chimchar 76 130 diamond pearl',
    printed_number: '076/130',
  };
  const pool = candidatePoolForTcgplayerOllamaRowV1(row, index);
  const ranked = rankTcgplayerOllamaCandidatesV1(row, pool);
  assert.deepEqual(ranked.map((candidate) => candidate.card_print_id), ['chimchar-76']);
  assert.equal(ranked[0].candidate_evidence.source_name_match, 'base_name_alias');
  assert.equal(ranked[0].candidate_evidence.target_set_source, 'global_catalog_search');
});

test('cross-set lookup retains ambiguity for founder review instead of choosing a set', () => {
  const row = {
    source_category_id: 3,
    source_product_name: 'Pikachu (Baby)',
    normalized_source_name: 'pikachu baby',
    printed_number: '27',
  };
  const cards = [
    { ...baseCard, card_print_id: 'pikachu-a', set_id: 'set-a', canonical_name: 'Pikachu', canonical_number: '27', identity_domain: 'pokemon_eng_standard' },
    { ...baseCard, card_print_id: 'pikachu-b', set_id: 'set-b', canonical_name: 'Pikachu', canonical_number: '27', identity_domain: 'pokemon_eng_standard' },
  ];
  const index = buildTcgplayerOllamaCandidateIndexV1(cards);
  const pool = candidatePoolForTcgplayerOllamaRowV1(row, index);
  const ranked = rankTcgplayerOllamaCandidatesV1(row, pool);
  assert.equal(ranked.length, 2);
  assert.equal(diagnoseTcgplayerOllamaCandidateGapV1(row, pool, null, []),
    'multiple_cross_set_coordinate_targets');
});

test('cross-set diagnostics expose an already-mapped canonical parent', () => {
  const row = {
    source_category_id: 3,
    source_product_name: 'Glameow 83/130',
    normalized_source_name: 'glameow 83 130',
    printed_number: '083/130',
  };
  const mapped = {
    ...baseCard,
    card_print_id: 'glameow-83',
    canonical_name: 'Glameow',
    canonical_number: '83',
    active_tcgplayer_mapping_count: 1,
    identity_domain: 'pokemon_eng_standard',
    game: 'pokemon',
  };
  const index = buildTcgplayerOllamaCandidateIndexV1([mapped]);
  const pool = diagnosticPoolForTcgplayerOllamaRowV1(row, index);
  assert.equal(diagnoseTcgplayerOllamaCandidateGapV1(row, pool),
    'canonical_parent_already_has_tcgplayer_mapping');
  const references = rankTcgplayerOllamaDiagnosticReferencesV1(row, pool);
  assert.equal(references.length, 1);
  assert.equal(references[0].card_print_id, 'glameow-83');
  assert.deepEqual(references[0].diagnostic_reference_evidence.blockers,
    ['target_already_mapped']);
  assert.equal(references[0].diagnostic_reference_evidence.mapping_authority, false);
  const enriched = enrichTcgplayerOllamaRowV1(row, [], null, pool);
  assert.equal(enriched.review_targets.length, 0);
  assert.equal(enriched.candidate_search.diagnostic_reference_count, 1);
  assert.equal(enriched.candidate_search.diagnostic_reference_targets[0].card_print_id,
    'glameow-83');
});

test('diagnostic references expose cross-set ambiguity without selecting a target', () => {
  const row = {
    source_category_id: 3,
    source_product_name: 'Pikachu (Ivy)',
    normalized_source_name: 'pikachu ivy',
    printed_number: '1',
  };
  const cards = [
    { ...baseCard, card_print_id: 'pikachu-a', set_id: 'set-a', canonical_name: 'Pikachu', canonical_number: '1', game: 'pokemon' },
    { ...baseCard, card_print_id: 'pikachu-b', set_id: 'set-b', canonical_name: 'Pikachu', canonical_number: '1', game: 'pokemon' },
  ];
  const references = rankTcgplayerOllamaDiagnosticReferencesV1(row, cards);
  assert.equal(references.length, 2);
  assert.ok(references.every((candidate) =>
    candidate.diagnostic_reference_evidence.blockers.includes('cross_set_target_ambiguous')));
});

test('source number extraction requires one unambiguous Number value', () => {
  assert.equal(uniqueTcgplayerExtendedNumberV1([{ name: 'Number', value: '019/123' }]), '019/123');
  assert.equal(uniqueTcgplayerExtendedNumberV1([
    { name: 'Number', value: '19' }, { name: 'Number', value: '20' },
  ]), '');
});

test('candidate index keeps MTG and Pokemon identity domains separate', () => {
  const pokemon = { ...baseCard, identity_domain: 'pokemon_eng_standard' };
  const mtg = {
    ...baseCard,
    card_print_id: 'mtg-1',
    gv_id: 'GV-MTG-LEA-233',
    canonical_name: 'Underground Sea',
    canonical_number: '233',
    identity_domain: 'mtg_eng_paper_print',
  };
  const index = buildTcgplayerOllamaCandidateIndexV1([pokemon, mtg]);
  const pool = candidatePoolForTcgplayerOllamaRowV1({
    source_category_id: 1,
    source_product_name: 'Underground Sea',
    printed_number: '233',
  }, index);
  assert.deepEqual(pool.map((row) => row.card_print_id), ['mtg-1']);
});

test('cross-set base-name expansion is limited to Pokemon', () => {
  const mtg = {
    ...baseCard,
    card_print_id: 'mtg-promo',
    canonical_name: 'Lightning Bolt',
    canonical_number: '150',
    identity_domain: 'mtg_eng_paper_print',
  };
  const index = buildTcgplayerOllamaCandidateIndexV1([mtg]);
  const pool = candidatePoolForTcgplayerOllamaRowV1({
    source_category_id: 1,
    source_product_name: 'Lightning Bolt - 150 (Event Promo)',
    normalized_source_name: 'lightning bolt event promo',
    printed_number: '150',
  }, index);
  assert.deepEqual(pool, []);
});

test('diagnostic lookup retains identity-less catalog rows without making them candidates', () => {
  const identityLess = {
    ...baseCard,
    game: 'pokemon',
    identity_domain: null,
    active_standard_identity_count: 0,
  };
  const index = buildTcgplayerOllamaCandidateIndexV1([identityLess]);
  const row = {
    source_category_id: 3,
    source_product_name: 'Abomasnow - 19/123',
    printed_number: '19/123',
  };
  const consensus = { set_count: 1, set_id: 'set-1' };
  assert.deepEqual(candidatePoolForTcgplayerOllamaRowV1(row, index, consensus), []);
  const diagnostic = diagnosticPoolForTcgplayerOllamaRowV1(row, index, consensus);
  assert.equal(diagnostic.length, 1);
  assert.equal(diagnoseTcgplayerOllamaCandidateGapV1(row, diagnostic, consensus),
    'canonical_target_identity_not_unique');
});

test('set consensus and exact coordinate rank one unmapped standard parent', () => {
  const row = { source_product_name: 'Abomasnow - 19/123', normalized_source_name: 'abomasnow', printed_number: '019/123' };
  const cards = [baseCard, { ...baseCard, card_print_id: 'mapped', active_tcgplayer_mapping_count: 1 }];
  const ranked = rankTcgplayerOllamaCandidatesV1(row, cards, { set_count: 1, set_id: 'set-1' });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].card_print_id, 'card-1');
  assert.equal(ranked[0].candidate_evidence.number_exact, true);
});

test('missing-number rows enter advisory review only when enrichment found bounded candidates', () => {
  const row = {
    source_product_id: 84682,
    source_product_name: 'Darkness Energy (Basic)',
    source_group_name: 'Kalos Starter Set',
    printed_number: '',
    normalized_source_name: 'darkness energy basic',
    source_subtypes: ['Normal'],
  };
  const enriched = enrichTcgplayerOllamaRowV1(row, [{
    ...baseCard,
    canonical_name: 'Darkness Energy',
    canonical_number: '98',
  }], { set_count: 1, set_id: 'set-1' });
  assert.equal(enriched.review_targets.length, 1);
  const plan = planTcgplayerOllamaTriageRowV1(enriched);
  assert.equal(plan.model_call_allowed, true);
  assert.equal(plan.prompt.source.printed_number_missing, true);
});

test('sealed products never receive card-parent candidates', () => {
  assert.equal(isLikelySealedTcgplayerProductV1('Guzzlord GX Box'), true);
  const ranked = rankTcgplayerOllamaCandidatesV1({
    source_product_name: 'Guzzlord GX Box',
    printed_number: '',
  }, [{ ...baseCard, canonical_name: 'Guzzlord GX' }], { set_count: 1, set_id: 'set-1' });
  assert.deepEqual(ranked, []);
});

test('printed card coordinates override broad sealed-name terms', () => {
  const card = {
    ...baseCard,
    canonical_name: 'Box of Disaster',
    canonical_number: '154',
  };
  const row = {
    source_product_name: 'Box of Disaster - 154/196',
    normalized_source_name: 'Box of Disaster',
    printed_number: '154/196',
  };
  assert.equal(isLikelySealedTcgplayerProductV1(row.source_product_name, row.printed_number), false);
  assert.equal(rankTcgplayerOllamaCandidatesV1(row, [card])[0].card_print_id, card.card_print_id);
});

test('enrichment artifacts remain advisory and read-only', () => {
  const enriched = enrichTcgplayerOllamaRowV1({ source_product_name: 'Abomasnow', printed_number: '19' }, [baseCard]);
  assert.equal(enriched.candidate_search.mapping_authority, false);
  assert.equal(enriched.candidate_search.publication_authority, false);
  assert.equal(enriched.candidate_search.database_reads_only, true);
});

test('unmatched Pokemon products retain a concrete repair-lane diagnosis', () => {
  const row = {
    source_category_id: 3,
    source_product_name: 'Abomasnow - 19/123',
    printed_number: '19/123',
  };
  assert.equal(diagnoseTcgplayerOllamaCandidateGapV1(
    row,
    [{ ...baseCard, active_tcgplayer_mapping_count: 1 }],
    { set_count: 1, set_id: 'set-1' },
  ), 'canonical_parent_already_has_tcgplayer_mapping');
  assert.equal(diagnoseTcgplayerOllamaCandidateGapV1(
    row,
    [{ ...baseCard, variant_key: 'staff_stamp' }],
    { set_count: 1, set_id: 'set-1' },
  ), 'candidate_requires_printing_or_variant_authority');
  assert.equal(enrichTcgplayerOllamaRowV1(
    { ...row, printed_number: '' },
    [],
  ).candidate_search.no_candidate_reason, 'missing_printed_number_evidence');
});
