import assert from 'node:assert/strict';
import test from 'node:test';

import {
  enrichTcgplayerOllamaRowV1,
  isLikelySealedTcgplayerProductV1,
  normalizeTcgplayerOllamaCandidateTextV1,
  normalizeTcgplayerOllamaCoordinateV1,
  rankTcgplayerOllamaCandidatesV1,
} from '../../backend/pricing/tcgplayer_ollama_candidate_enrichment_v1.mjs';
import { planTcgplayerOllamaTriageRowV1 } from '../../backend/pricing/tcgplayer_ollama_triage_v1.mjs';

const baseCard = {
  card_print_id: 'card-1', gv_id: 'GV-PK-XY-19', set_id: 'set-1', set_code: 'xy1',
  set_name: 'XY Base Set', canonical_name: 'Abomasnow', canonical_number: '19',
  variant_key: '', active_standard_identity_count: 1, active_tcgplayer_mapping_count: 0,
};

test('candidate normalization preserves identity symbols and collector coordinates', () => {
  assert.equal(normalizeTcgplayerOllamaCandidateTextV1('Nidoran ♀ (Promo)'), 'nidoran f');
  assert.equal(normalizeTcgplayerOllamaCoordinateV1('019/123'), '19');
  assert.equal(normalizeTcgplayerOllamaCoordinateV1('AR06'), 'AR6');
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

test('enrichment artifacts remain advisory and read-only', () => {
  const enriched = enrichTcgplayerOllamaRowV1({ source_product_name: 'Abomasnow', printed_number: '19' }, [baseCard]);
  assert.equal(enriched.candidate_search.mapping_authority, false);
  assert.equal(enriched.candidate_search.publication_authority, false);
  assert.equal(enriched.candidate_search.database_reads_only, true);
});
