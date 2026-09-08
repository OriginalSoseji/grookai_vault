import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
test('both sealed clients stage non-overwriting uploads before saving pointers', () => {
  for (const path of ['apps/web/src/components/vault/SealedCopyDetails.tsx', 'lib/widgets/vault/sealed_copy_details_dialog.dart']) {
    const source = read(path);
    assert.match(source, /sealedPhotoPath\(/);
    assert.match(source, /upsert: false/);
    assert.doesNotMatch(source, /upsert: true|\/current/);
  }
});
test('public Flutter profile guards the authenticated-only sealed panel', () => {
  assert.match(read('lib/screens/public_collector/public_collector_screen.dart'), /if \(_viewerUserId\.isNotEmpty\)\s+OwnedSealedPanel/);
  assert.match(read('lib/widgets/vault/owned_sealed_panel.dart'), /if \(_service\.userId\(\) == null\) return;/);
});
test('forward migration changes only two existing functions and reloads the API schema', () => {
  const sql = read('supabase/migrations/20260908070000_sealed_owned_photo_revisions_v1.sql');
  assert.equal((sql.match(/create or replace function/g) ?? []).length, 2);
  assert.doesNotMatch(sql, /\b(create table|drop |delete |truncate |grant |revoke )/i);
  assert.match(sql, /for update/);
  assert.match(sql, /coalesce\(path=previous,false\)/);
  assert.match(sql, /p_path=i\.image_url/);
  assert.match(sql, /image_display_mode='uploaded'/);
});
