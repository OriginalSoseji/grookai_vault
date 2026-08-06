import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL(
    '../../supabase/migrations/20260806153000_vault_archive_wrappers_include_slab_only_v1.sql',
    import.meta.url,
  ),
  'utf8',
);

test('one-copy archive resolves slab-only instances through slab cert identity', () => {
  assert.match(
    migration,
    /create or replace function public\.vault_archive_one_instance_v1/i,
  );
  assert.match(migration, /vii\.card_print_id is null[\s\S]*?public\.slab_certs sc/i);
  assert.match(migration, /sc\.card_print_id = v_card_print_id/i);
  assert.match(migration, /coalesce\(vii\.card_print_id, sc\.card_print_id\)/i);
});

test('all-copy archive includes raw and slab-only instances without crossing owners', () => {
  assert.match(
    migration,
    /create or replace function public\.vault_archive_all_instances_v1/i,
  );
  assert.match(migration, /update public\.vault_item_instances vii[\s\S]*?vii\.user_id = v_uid/i);
  assert.match(migration, /vii\.card_print_id = v_card_print_id[\s\S]*?public\.slab_certs sc/i);
  assert.match(migration, /v_archived_count <= 0/i);
});

test('archive wrappers preserve authentication and execute boundaries', () => {
  assert.equal((migration.match(/security definer/gi) ?? []).length, 2);
  assert.equal((migration.match(/set search_path = public/gi) ?? []).length, 2);
  assert.match(migration, /revoke all on function public\.vault_archive_one_instance_v1\(uuid, uuid\)[\s\S]*?from public, anon/i);
  assert.match(migration, /revoke all on function public\.vault_archive_all_instances_v1\(uuid, uuid\)[\s\S]*?from public, anon/i);
  assert.equal((migration.match(/to authenticated, service_role/gi) ?? []).length, 2);
});

test('single-copy manage action archives the exact instance', () => {
  const screen = readFileSync(
    new URL('../../lib/screens/vault/vault_manage_card_screen.dart', import.meta.url),
    'utf8',
  );

  assert.match(screen, /data\.copies\.length == 1/);
  assert.match(screen, /VaultGvviService\.archiveExactCopy\([\s\S]*?data\.copies\.single\.instanceId/);
  assert.match(screen, /else \{[\s\S]*?VaultCardService\.archiveAllVaultItems/);
});
