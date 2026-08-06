import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  new URL(
    '../../supabase/migrations/20260806170000_card_print_app_visibility_quarantine_resolution_v1.sql',
    import.meta.url,
  ),
  'utf8',
);

test('resolves only the exact verified identity-image conflict quarantine record', () => {
  assert.match(sql, /a0229cee-66a2-4cb4-a9c6-c548a51b57f1/i);
  assert.match(sql, /f723beca5c53d070978bc6ea3631e7517085a5c6fde5e7edb46c37d082fee332/i);
  assert.match(sql, /resolved_suppression_verified/i);
  assert.match(sql, /get diagnostics v_updated_count = row_count/i);
  assert.match(sql, /v_updated_count <> 1/i);
});

test('requires the disputed row to stay suppressed and the canonical target to stay active', () => {
  assert.match(sql, /GV-PK-JPN-DPP-102/i);
  assert.match(sql, /data_quality_flags #>> '\{app_visibility_v1,status\}' = 'suppressed'/i);
  assert.match(sql, /card_print_id = v_disputed_id[\s\S]*is_active = true/i);
  assert.match(sql, /GV-PK-JPN-DPP-102-PIKACHU/i);
  assert.match(sql, /cpi\.is_active = true/i);
});

test('preserves immutable quarantine and canonical evidence', () => {
  assert.doesNotMatch(sql, /delete\s+from/i);
  assert.doesNotMatch(sql, /update\s+public\.card_prints/i);
  assert.doesNotMatch(sql, /update\s+public\.card_print_identity/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.quarantine_records/i);
  assert.match(sql, /update public\.quarantine_records[\s\S]*resolved_at = now\(\)/i);
});
