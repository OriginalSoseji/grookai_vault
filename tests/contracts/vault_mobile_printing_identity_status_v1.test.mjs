import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

const migration = source(
  'supabase/migrations/20260803220000_vault_mobile_printing_identity_status_v1.sql',
);
const vaultUi = source('lib/main_vault.dart');

test('Vault collector rows preserve parent grouping and derive printing status', () => {
  assert.match(migration, /group by ai\.card_print_id/i);
  assert.doesNotMatch(migration, /group by ai\.card_print_id\s*,\s*ai\.card_printing_id/i);
  assert.match(migration, /count\(ai\.card_printing_id\)::integer as assigned_printing_count/i);
  assert.match(migration, /count\(distinct ai\.card_printing_id\)::integer as distinct_printing_count/i);
  assert.match(migration, /when g\.assigned_printing_count = 0 then 'unassigned'/i);
  assert.match(migration, /when g\.unassigned_printing_count > 0 then 'partially_unassigned'/i);
  assert.match(migration, /when g\.distinct_printing_count = 1 then 'exact'/i);
  assert.match(migration, /else 'mixed'/i);
});

test('exact child identity is exposed only for a single fully assigned printing', () => {
  assert.match(
    migration,
    /when count\(ai\.card_printing_id\) = count\(\*\)[\s\S]*count\(distinct ai\.card_printing_id\) = 1[\s\S]*then min\(ai\.card_printing_id::text\)::uuid/i,
  );
  assert.match(migration, /left join public\.card_printings cpn[\s\S]*cpn\.id = g\.exact_card_printing_id/i);
  assert.match(migration, /left join public\.finish_keys fk on fk\.key = cpn\.finish_key/i);
});

test('Vault remains owner-scoped and keeps the authenticated RPC boundary', () => {
  assert.match(migration, /v_uid uuid := auth\.uid\(\)/i);
  assert.match(migration, /where vii\.user_id = v_uid/i);
  assert.match(migration, /where vi\.user_id = v_uid/i);
  assert.match(migration, /security definer[\s\S]*set search_path = public/i);
  assert.match(migration, /revoke all[\s\S]*from public, anon/i);
  assert.match(migration, /grant execute[\s\S]*to authenticated, service_role/i);
});

test('both Vault layouts render printing identity without changing mutation IDs', () => {
  const occurrences = vaultUi.match(/printingIdentity\.label/g) ?? [];
  assert.equal(occurrences.length, 2);
  assert.match(vaultUi, /VaultCardService\.archiveOneVaultItem\([\s\S]*vaultItemId: vaultItemId,[\s\S]*cardId: cardId/);
  assert.match(vaultUi, /VaultCardService\.archiveAllVaultItems\([\s\S]*vaultItemId: vaultItemId,[\s\S]*cardId: cardId/);
});
