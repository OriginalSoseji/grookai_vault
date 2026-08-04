import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL(
    '../../supabase/migrations/20260803210000_card_print_app_visibility_guard_v1.sql',
    import.meta.url,
  ),
  'utf8',
);

test('visibility repair no-ops only when both production identities are absent', () => {
  assert.match(
    migration,
    /if not exists \([\s\S]*where id = v_disputed_id[\s\S]*\) and not exists \([\s\S]*where id = v_canonical_id[\s\S]*\) then\s*return;/i,
  );
});

test('visibility repair still fails closed for partial or mismatched identity state', () => {
  assert.match(
    migration,
    /raise exception 'CARD_PRINT_APP_VISIBILITY_GUARD_V1 disputed row precondition failed'/,
  );
  assert.match(
    migration,
    /raise exception 'CARD_PRINT_APP_VISIBILITY_GUARD_V1 canonical target precondition failed'/,
  );
  assert.match(migration, /and name = 'ポッチャマ'/);
  assert.match(migration, /and name = 'Pikachu'/);
});
