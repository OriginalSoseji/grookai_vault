import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PACKAGE_ID,
  buildGuardedDryRunSql,
} from '../../scripts/audits/base_set_print_run_lanes_guarded_dry_run_v1.mjs';

const MOCK_AUDIT = {
  contract_key: 'BASE_SET_PRINT_RUN_LANES_V1',
  ordinary_base_checklist: {
    row_count: 102,
    slot_count: 102,
    expected_slot_count: 102,
    complete: true,
  },
  summary: {
    total_proposed_new_identity_rows: 304,
  },
  lane_audits: [
    {
      lane_code: 'base1-unlimited',
      label: 'Base Set Unlimited',
      required_modifier: null,
      current_satisfied_slots: 102,
      current_missing_slots: 0,
      proposed_new_identity_row_count: 0,
    },
    {
      lane_code: 'base1-shadowless',
      label: 'Base Set Shadowless',
      required_modifier: 'print_run:shadowless',
      current_satisfied_slots: 1,
      current_missing_slots: 101,
      proposed_new_identity_row_count: 101,
    },
    {
      lane_code: 'base1-first-edition',
      label: 'Base Set 1st Edition',
      required_modifier: 'edition:first_edition;print_run:shadowless',
      current_satisfied_slots: 1,
      current_missing_slots: 101,
      proposed_new_identity_row_count: 101,
    },
    {
      lane_code: 'base1-1999-2000',
      label: 'Base Set 1999-2000',
      required_modifier: 'print_run:1999-2000',
      current_satisfied_slots: 0,
      current_missing_slots: 102,
      proposed_new_identity_row_count: 102,
    },
  ],
};

test('Base Set print-run guarded dry-run SQL is rollback-only and scoped', () => {
  const sql = buildGuardedDryRunSql(MOCK_AUDIT);
  const stripped = sql.replace(/--.*$/gm, '');

  assert.match(sql, new RegExp(PACKAGE_ID));
  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /rollback\s*;/i);
  assert.doesNotMatch(stripped, /commit\s*;/i);
  assert.doesNotMatch(stripped, /\bdelete\s+from\b/i);
  assert.doesNotMatch(stripped, /\bupdate\s+public\./i);
  assert.match(stripped, /insert\s+into\s+public\.sets/i);
  assert.match(stripped, /insert\s+into\s+public\.card_prints/i);
});

test('Base Set print-run guarded dry-run blocks generic Pikachu lane rows and fake image statuses', () => {
  const sql = buildGuardedDryRunSql(MOCK_AUDIT);

  assert.match(sql, /not \(ordinary_base\.number_plain = '58'/);
  assert.match(sql, /GV-PK-BASE1-'\s*\|\|\s*ordinary_base\.number_plain\s*\|\|\s*'-SHADOWLESS/);
  assert.match(sql, /GV-PK-BASE1-'\s*\|\|\s*ordinary_base\.number_plain\s*\|\|\s*'-FIRST-EDITION/);
  assert.doesNotMatch(sql, /missing_variant_visual/i);
  assert.match(sql, /'missing'/);
  assert.match(sql, /exact physical lane image not cataloged yet/);
});

test('Base Set print-run guarded dry-run proves 102 slot coverage with existing Pikachu specials', () => {
  const sql = buildGuardedDryRunSql(MOCK_AUDIT);

  assert.match(sql, /'base1-shadowless'::text as lane_code/);
  assert.match(sql, /1::int as existing_special_pikachu_slot/);
  assert.match(sql, /'base1-first-edition'/);
  assert.match(sql, /'base1-1999-2000'/);
  assert.match(sql, /covered_slots_after_plan/);
  assert.match(sql, /forbidden_rows/);
});
