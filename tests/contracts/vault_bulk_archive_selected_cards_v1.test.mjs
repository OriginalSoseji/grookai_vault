import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const migration = source(
  "supabase/migrations/20260819023000_vault_bulk_archive_selected_cards_v1.sql",
);
const service = source("lib/services/vault/vault_card_service.dart");
const vaultUi = source("lib/main_vault.dart");

test("bulk Vault archive is an authenticated atomic owner boundary", () => {
  assert.match(migration, /security definer/i);
  assert.match(migration, /v_uid uuid := auth\.uid\(\)/i);
  assert.match(migration, /card_print_ids_limit_exceeded/i);
  assert.match(migration, /card_print_ids_must_be_unique/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /vault_archive_all_instances_v1/i);
  assert.match(
    migration,
    /revoke all on function public\.vault_archive_selected_cards_v1\(uuid\[\]\)[\s\S]*from public, anon/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.vault_archive_selected_cards_v1\(uuid\[\]\)[\s\S]*to authenticated, service_role/i,
  );
});

test("mobile service uses the governed bulk RPC and reconciles its response", () => {
  const methodStart = service.indexOf(
    "static Future<VaultBulkArchiveResult> archiveSelectedVaultCards",
  );
  const methodEnd = service.indexOf("\n  static ", methodStart + 10);
  const method = service.slice(methodStart, methodEnd);

  assert.match(service, /archiveSelectedVaultCards/);
  assert.match(service, /'vault_archive_selected_cards_v1'/);
  assert.match(service, /authenticatedUserId != normalizedUserId/);
  assert.match(service, /archivedCardCount != normalizedIds\.length/);
  assert.doesNotMatch(method, /\.from\('vault_item_instances'\)/);
  assert.doesNotMatch(method, /\.update\(/);
});

test("Vault exposes explicit selection, pricing filters, and bulk removal", () => {
  assert.match(vaultUi, /Select all/);
  assert.match(vaultUi, /Remove selected/);
  assert.match(vaultUi, /_VaultPricingFilter\.unpriced/);
  assert.match(vaultUi, /archiveSelectedVaultCards/);
  assert.match(vaultUi, /Memories and transaction history remain/);
});
