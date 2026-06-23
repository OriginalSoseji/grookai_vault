import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRealApplySqlFromDryRunSql,
} from '../../scripts/audits/base_set_print_run_lanes_real_apply_gate_v1.mjs';

test('Base Set print-run real apply SQL swaps only rollback for commit', () => {
  const dryRunSql = `-- header
begin;
insert into public.sets (game, code) values ('pokemon', 'base1-shadowless');
insert into public.card_prints (set_id, name) values (gen_random_uuid(), 'Alakazam');
rollback;
`;
  const realSql = buildRealApplySqlFromDryRunSql(dryRunSql);
  const stripped = realSql.replace(/--.*$/gm, '');

  assert.match(stripped, /begin\s*;/i);
  assert.match(stripped, /commit\s*;\s*$/i);
  assert.doesNotMatch(stripped, /rollback\s*;/i);
  assert.match(stripped, /insert into public\.sets/i);
  assert.match(stripped, /insert into public\.card_prints/i);
});

test('Base Set print-run real apply builder fails closed without final rollback', () => {
  assert.throws(
    () => buildRealApplySqlFromDryRunSql('begin;\nselect 1;\n'),
    /DRY_RUN_SQL_MISSING_FINAL_ROLLBACK/,
  );
});
