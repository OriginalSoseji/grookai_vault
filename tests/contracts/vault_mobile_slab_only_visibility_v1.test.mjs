import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL(
    '../../supabase/migrations/20260806143000_vault_mobile_collector_rows_include_slab_only_v1.sql',
    import.meta.url,
  ),
  'utf8',
);

test('Vault collector rows resolve raw and slab-only active copies to canonical cards', () => {
  assert.match(
    migration,
    /coalesce\(vii\.card_print_id, slab\.card_print_id\) as card_print_id/i,
  );
  assert.match(
    migration,
    /left join public\.slab_certs slab\s+on slab\.id = vii\.slab_cert_id/i,
  );
  assert.match(
    migration,
    /coalesce\(vii\.card_print_id, slab\.card_print_id\) is not null/i,
  );
  assert.doesNotMatch(migration, /and vii\.card_print_id is not null/i);
});

test('slab-only Vault repair preserves owner, archive, and RPC security boundaries', () => {
  assert.match(migration, /v_uid uuid := auth\.uid\(\)/i);
  assert.match(migration, /where vii\.user_id = v_uid/i);
  assert.match(migration, /and vii\.archived_at is null/i);
  assert.match(migration, /security definer[\s\S]*set search_path = public/i);
  assert.match(migration, /revoke all[\s\S]*from public, anon/i);
  assert.match(migration, /grant execute[\s\S]*to authenticated, service_role/i);
});

test('slab-only Vault repair preserves parent grouping and exact-copy route data', () => {
  assert.match(migration, /group by ai\.card_print_id/i);
  assert.match(
    migration,
    /case when g\.owned_count = 1 then li\.gv_vi_id else null end as gv_vi_id/i,
  );
  assert.match(
    migration,
    /coalesce\(cb\.id, li\.legacy_vault_item_id\) as vault_item_id/i,
  );
});
