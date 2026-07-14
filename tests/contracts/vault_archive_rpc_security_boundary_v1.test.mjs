import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("Vault archive RPCs remain the authenticated deletion boundary", () => {
  const migration = source(
    "supabase/migrations/20260714203000_restore_vault_archive_rpc_definer_v1.sql",
  );
  const cardService = source("lib/services/vault/vault_card_service.dart");
  const gvviService = source("lib/services/vault/vault_gvvi_service.dart");

  for (const fn of [
    "vault_archive_one_instance_v1",
    "vault_archive_all_instances_v1",
    "vault_archive_exact_instance_v1",
  ]) {
    assert.match(migration, new RegExp(`alter function public\\.${fn}[\\s\\S]*security definer`, "i"));
    assert.match(migration, new RegExp(`grant execute on function public\\.${fn}[\\s\\S]*to authenticated`, "i"));
    assert.match(migration, new RegExp(`revoke all on function public\\.${fn}[\\s\\S]*from public, anon`, "i"));
  }

  assert.match(cardService, /'vault_archive_one_instance_v1'/);
  assert.match(cardService, /'vault_archive_all_instances_v1'/);
  assert.match(gvviService, /'vault_archive_exact_instance_v1'/);
  assert.doesNotMatch(cardService, /\.from\('vault_item_instances'\)\s*\.update\(\{'archived_at'/);
  assert.doesNotMatch(gvviService, /\.from\('vault_item_instances'\)\s*\.update\(\{'archived_at'/);
});
