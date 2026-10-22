import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTcgplayerOllamaCandidateIndexV1,
  candidatePoolForTcgplayerOllamaRowV1,
  enrichTcgplayerOllamaRowV1,
  isLikelySealedTcgplayerProductV1,
  normalizeTcgplayerOllamaCandidateTextV1,
  normalizeTcgplayerOllamaCoordinateV1,
  normalizeTcgplayerOllamaSourceNameV1,
  rankTcgplayerOllamaCandidatesV1,
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

test('ambiguous MTG printing evidence becomes a bounded Ollama review set', () => {
  const row = {
    source_product_id: 2810,
    source_product_name: 'Example Spell',
    source_category_id: 1,
    source_group_name: 'Example Set',
    printed_number: '',
    source_subtypes: ['Normal', 'Foil'],
  };
  const candidates = [{
    ...baseCard,
    card_print_id: 'mtg-parent-b',
    gv_id: 'GV-MTG-EXB-2',
    identity_domain: 'mtg_eng_paper_print',
    canonical_name: 'Example Spell',
    canonical_number: '2',
    candidate_evidence: {
      target_set_source: 'exact_tcgplayer_market_printing_evidence',
      supporting_printing_mapping_count: 1,
      mapping_authority: false,
    },
  }, {
    ...baseCard,
    card_print_id: 'mtg-parent-a',
    gv_id: 'GV-MTG-EXA-1',
    identity_domain: 'mtg_eng_paper_print',
    canonical_name: 'Example Spell',
    canonical_number: '1',
    candidate_evidence: {
      target_set_source: 'exact_tcgplayer_market_printing_evidence',
      supporting_printing_mapping_count: 1,
      mapping_authority: false,
    },
  }];
  const enriched = enrichTcgplayerOllamaRowV1(row, [], null, candidates);
  assert.deepEqual(
    enriched.review_targets.map((candidate) => candidate.card_print_id),
    ['mtg-parent-a', 'mtg-parent-b'],
  );
  assert.equal(
    enriched.candidate_search.candidate_source,
    'exact_tcgplayer_market_printing_evidence',
  );
  assert.equal(enriched.candidate_search.exact_printing_evidence_candidate_count, 2);
  assert.equal(enriched.candidate_search.mapping_authority, false);
  const plan = planTcgplayerOllamaTriageRowV1(enriched);
  assert.equal(plan.model_call_allowed, true);
  assert.equal(plan.compatible_candidates.length, 2);
});

test('one MTG printing parent stays on the deterministic mapping lane', () => {
  const row = {
    source_product_id: 2810,
    source_product_name: 'Example Spell',
    source_category_id: 1,
    source_group_name: 'Example Set',
    printed_number: '',
  };
  const onlyParent = {
    ...baseCard,
    card_print_id: 'only-parent',
    identity_domain: 'mtg_eng_paper_print',
    canonical_name: 'Example Spell',
  };
  const enriched = enrichTcgplayerOllamaRowV1(row, [onlyParent], null, [onlyParent]);
  assert.deepEqual(enriched.review_targets, []);
  assert.equal(enriched.candidate_search.exact_printing_evidence_candidate_count, 1);
  assert.equal(
    enriched.candidate_search.candidate_source,
    'deterministic_single_printing_parent',
  );
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
