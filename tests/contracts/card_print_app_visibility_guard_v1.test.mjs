import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  new URL(
    '../../supabase/migrations/20260803210000_card_print_app_visibility_guard_v1.sql',
    import.meta.url,
  ),
  'utf8',
);

test('suppresses only the verified disputed DP-P row and preserves canonical data', () => {
  assert.match(sql, /77e73dcd-34f9-49a5-8807-efca3b2c3e6c/i);
  assert.match(sql, /a7e71718-4ffd-5da2-9275-2ff77c94b591/i);
  assert.match(sql, /verified_identity_image_conflict/i);
  assert.match(sql, /row_and_source_evidence_retained/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.card_prints/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.card_print_identity/i);
  assert.doesNotMatch(sql, /update\s+public\.card_prints[\s\S]*?set[\s\S]*?\bname\s*=/i);
  assert.doesNotMatch(sql, /update\s+public\.card_prints[\s\S]*?set[\s\S]*?\bimage_(?:url|path)\s*=/i);
});

test('uses a restrictive RLS policy so every client card_prints read honors suppression', () => {
  assert.match(sql, /create policy card_prints_hide_explicitly_suppressed_v1/i);
  assert.match(sql, /as restrictive\s+for select\s+to public/i);
  assert.match(sql, /data_quality_flags\s*#>>\s*'\{app_visibility_v1,status\}'/i);
});

test('deactivates the disputed identity assertion and records immutable quarantine evidence', () => {
  assert.match(sql, /update public\.card_print_identity/i);
  assert.match(sql, /is_active\s*=\s*false/i);
  assert.match(sql, /insert into public\.quarantine_records/i);
  assert.match(sql, /pokemon_card_official_jp_card_19509/i);
  assert.match(sql, /source_payload_hash/i);
  assert.equal((sql.match(/extensions\.digest\(/gi) ?? []).length, 2);
  assert.doesNotMatch(sql, /(?<!extensions\.)\bdigest\(/i);
});
