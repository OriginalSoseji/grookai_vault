import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CONTRACT_KEY,
  EXPECTED_SLOTS_PER_LANE,
  LANE_CONFIGS,
  PIKACHU_SLOT_RULE,
  buildLaneAudit,
} from '../../scripts/audits/base_set_print_run_lanes_contract_v1.mjs';

test('Base Set print-run lane contract is authoritative and audit-only', () => {
  const index = readFileSync(new URL('../../docs/CONTRACT_INDEX.md', import.meta.url), 'utf8');
  const contract = readFileSync(new URL('../../docs/contracts/BASE_SET_PRINT_RUN_LANES_V1.md', import.meta.url), 'utf8');
  const contractJson = JSON.parse(
    readFileSync(new URL('../../docs/contracts/BASE_SET_PRINT_RUN_LANES_V1.json', import.meta.url), 'utf8'),
  );

  assert.equal(CONTRACT_KEY, 'BASE_SET_PRINT_RUN_LANES_V1');
  assert.match(index, /\|\s*BASE_SET_PRINT_RUN_LANES_V1\s*\|\s*Active\s*\|/);
  assert.equal(contractJson.status, 'active');
  assert.equal(contractJson.db_writes_allowed, false);
  assert.equal(contractJson.migrations_allowed, false);
  assert.equal(contractJson.blind_clone_allowed, false);
  assert.match(contract, /No generic `GV-PK-BASE1-58-SHADOWLESS`/);
  assert.match(contract, /Ghost Stamp Shadowless Pikachu row is an error\/special identity/);
});

test('Base Set print-run lane registry includes the four governed collector lanes', () => {
  assert.equal(EXPECTED_SLOTS_PER_LANE, 102);
  assert.deepEqual(
    LANE_CONFIGS.map((lane) => lane.lane_code),
    ['base1-unlimited', 'base1-shadowless', 'base1-first-edition', 'base1-1999-2000'],
  );
  assert.equal(LANE_CONFIGS.find((lane) => lane.lane_code === 'base1-1999-2000').required_modifier, 'print_run:1999-2000');
});

test('Pikachu special slot excludes ghost stamp and blocks generic Shadowless/first edition rows', () => {
  assert.equal(PIKACHU_SLOT_RULE.number_plain, '58');
  assert.equal(PIKACHU_SLOT_RULE.generic_shadowless_row_allowed, false);
  assert.equal(PIKACHU_SLOT_RULE.generic_first_edition_row_allowed, false);
  assert.deepEqual(PIKACHU_SLOT_RULE.excluded_from_ordinary_lane_coverage, ['ghost_stamp_shadowless']);
  assert.deepEqual(PIKACHU_SLOT_RULE.shadowless_identity_variant_keys, ['shadowless_red_cheeks', 'shadowless_yellow_cheeks']);
  assert.deepEqual(PIKACHU_SLOT_RULE.first_edition_identity_variant_keys, ['first_edition_red_cheeks', 'first_edition_yellow_cheeks']);
});

test('lane audit plans whole-set coverage without satisfying Shadowless from ghost stamp', () => {
  const ordinaryRows = Array.from({ length: 102 }, (_, index) => {
    const number = String(index + 1);
    return {
      id: `ordinary-${number}`,
      set_code: 'base1',
      gv_id: `GV-PK-BS-${number}`,
      name: number === '58' ? 'Pikachu' : `Card ${number}`,
      number,
      number_plain: number,
      variant_key: '',
      printed_identity_modifier: null,
      image_status: 'exact',
    };
  });
  const specialRows = [
    {
      id: 'shadowless-red',
      set_code: 'base1',
      gv_id: 'GV-PK-BASE1-58-SHADOWLESS-RED-CHEEKS',
      name: 'Pikachu',
      number: '58',
      number_plain: '58',
      variant_key: 'shadowless_red_cheeks',
      printed_identity_modifier: 'print_run:shadowless;color:red_cheeks',
      image_status: 'representative_shared',
    },
    {
      id: 'shadowless-yellow',
      set_code: 'base1',
      gv_id: 'GV-PK-BASE1-58-SHADOWLESS-YELLOW-CHEEKS',
      name: 'Pikachu',
      number: '58',
      number_plain: '58',
      variant_key: 'shadowless_yellow_cheeks',
      printed_identity_modifier: 'print_run:shadowless;color:yellow_cheeks',
      image_status: 'representative_shared',
    },
    {
      id: 'ghost',
      set_code: 'base1',
      gv_id: 'GV-PK-BASE1-58-GHOST-STAMP-SHADOWLESS',
      name: 'Pikachu',
      number: '58',
      number_plain: '58',
      variant_key: 'ghost_stamp_shadowless',
      printed_identity_modifier: 'print_run:shadowless;stamp_error:ghost_first_edition',
      image_status: 'representative_shared',
    },
  ];

  const audit = buildLaneAudit({
    setRows: [{ code: 'base1', name: 'Base Set' }],
    cardRows: [...ordinaryRows, ...specialRows],
  });
  const shadowless = audit.lane_audits.find((lane) => lane.lane_code === 'base1-shadowless');
  const firstEdition = audit.lane_audits.find((lane) => lane.lane_code === 'base1-first-edition');
  const fourthPrint = audit.lane_audits.find((lane) => lane.lane_code === 'base1-1999-2000');

  assert.equal(shadowless.current_identity_rows, 2);
  assert.equal(shadowless.current_satisfied_slots, 1);
  assert.equal(shadowless.current_missing_slots, 101);
  assert.equal(shadowless.proposed_new_identity_row_count, 101);
  assert.equal(
    shadowless.proposed_new_identity_rows.some((row) => row.proposed_gv_id === 'GV-PK-BASE1-58-SHADOWLESS'),
    false,
  );
  assert.equal(firstEdition.proposed_new_identity_row_count, 101);
  assert.equal(fourthPrint.proposed_new_identity_row_count, 102);
  assert.equal(audit.summary.total_proposed_new_identity_rows, 304);
});
