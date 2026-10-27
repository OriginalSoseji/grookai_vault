import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPokemonSpecialPrintingReferenceProposalV1,
  pokemonPrintedDenominatorV1,
} from '../../backend/pricing/pokemon_special_printing_reference_proposal_v1.mjs';

const sets = {
  sets: [
    { key: 'dp2', source_totals: { api: { printed_total: 123 } } },
    { key: 'dp3', source_totals: { api: { printed_total: 132 } } },
  ],
};

function reference({ id, gv, set, name, number, variant = '' }) {
  return {
    card_print_id: id,
    gv_id: gv,
    set_code: set,
    set_name: set === 'dp2' ? 'Mysterious Treasures' : 'Secret Wonders',
    canonical_name: name,
    canonical_number: number,
    variant_key: variant,
    active_standard_identity_count: 1,
    active_tcgplayer_mapping_count: 1,
    diagnostic_reference_evidence: { name_exact: true, number_exact: true },
  };
}

function row(overrides = {}) {
  return {
    source_product_id: 153083,
    source_product_name: 'Abomasnow - 19/123',
    source_group_id: 2155,
    source_group_name: 'Countdown Calendar Promos',
    source_subtypes: ['Normal'],
    printed_number: '019/123',
    candidate_search: {
      diagnostic_reference_targets: [reference({
        id: 'base-1', gv: 'GV-PK-MT-19', set: 'dp2', name: 'Abomasnow', number: '19',
      })],
    },
    ...overrides,
  };
}

function stamped(set, name, number) {
  return {
    status: 'master_verified',
    set_key: set,
    card_name: name,
    card_number: number,
    finish_key: 'stamped',
    source_evidence: [{ source_key: 'fixture', source_url: 'https://example.test/card' }],
  };
}

test('extracts a verified set denominator without treating promo tokens as totals', () => {
  assert.equal(pokemonPrintedDenominatorV1('019/123'), 123);
  assert.equal(pokemonPrintedDenominatorV1('DP16'), null);
});

test('proposes a distinct gold snowflake variant parent under one exact mapped base', () => {
  const proposal = buildPokemonSpecialPrintingReferenceProposalV1({
    diagnosticRows: [row()],
    setRegistry: sets,
    masterPrintings: [stamped('dp2', 'Abomasnow', '19')],
  });
  assert.equal(proposal.summary.ready_for_guarded_variant_parent_plan, 1);
  assert.equal(proposal.rows[0].base_card_print_id, 'base-1');
  assert.equal(
    proposal.rows[0].proposed_variant_key,
    'countdown_calendar_2008_gold_snowflake_stamp',
  );
  assert.equal(proposal.rows[0].proposed_finish_key, 'normal');
  assert.equal(proposal.rows[0].canonical_write_authority, false);
});

test('uses the printed denominator and base-only rule to resolve cross-set references', () => {
  const diagnostic = row({
    source_product_id: 153110,
    source_product_name: 'Weavile - 40/132',
    printed_number: '040/132',
    candidate_search: {
      diagnostic_reference_targets: [
        reference({ id: 'wrong-set', gv: 'GV-PK-MT-40', set: 'dp2', name: 'Weavile', number: '40' }),
        reference({ id: 'right-set', gv: 'GV-PK-SW-40', set: 'dp3', name: 'Weavile', number: '40' }),
        reference({ id: 'variant', gv: 'GV-PK-SW-40-STAFF', set: 'dp3', name: 'Weavile', number: '40', variant: 'staff_stamp' }),
      ],
    },
  });
  const proposal = buildPokemonSpecialPrintingReferenceProposalV1({
    diagnosticRows: [diagnostic],
    setRegistry: sets,
    masterPrintings: [stamped('dp3', 'Weavile', '40')],
  });
  assert.equal(proposal.rows[0].base_card_print_id, 'right-set');
  assert.equal(proposal.rows[0].status, 'ready_for_guarded_variant_parent_plan');
});

test('preserves the silver Holo treatment for the DP16 calendar card', () => {
  const diagnostic = row({
    source_product_id: 153100,
    source_product_name: 'Pikachu - DP16',
    source_subtypes: ['Holofoil'],
    printed_number: 'DP16',
    candidate_search: {
      diagnostic_reference_targets: [reference({
        id: 'pikachu-base', gv: 'GV-PK-DPP-DP16', set: 'dpp', name: 'Pikachu', number: 'DP16',
      })],
    },
  });
  const proposal = buildPokemonSpecialPrintingReferenceProposalV1({
    diagnosticRows: [diagnostic],
    setRegistry: sets,
    masterPrintings: [stamped('dpp', 'Pikachu', 'DP16')],
  });
  assert.equal(proposal.rows[0].proposed_stamp_color, 'silver');
  assert.equal(proposal.rows[0].proposed_finish_key, 'holo');
  assert.equal(proposal.rows[0].status, 'ready_for_guarded_variant_parent_plan');
});

test('fails closed when stamped Master evidence or the source subtype is missing', () => {
  const proposal = buildPokemonSpecialPrintingReferenceProposalV1({
    diagnosticRows: [row({ source_subtypes: ['Reverse Holofoil'] })],
    setRegistry: sets,
    masterPrintings: [],
  });
  assert.equal(proposal.rows[0].status, 'blocked_before_guarded_plan');
  assert.deepEqual(proposal.rows[0].blockers, [
    'master_stamped_fact_missing',
    'source_subtype_conflicts_with_countdown_treatment',
  ]);
});
