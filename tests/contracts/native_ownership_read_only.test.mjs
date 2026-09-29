import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (path) => fs.readFileSync(path, 'utf8');

test('existing copy reader is authenticated, active, slab-aware and does not reconcile anchors', () => {
  const sql = read('supabase/migrations/20260728133000_vault_exact_market_pricing_targets_v1.sql');
  const reader = sql.slice(sql.indexOf('create function public.vault_mobile_card_copies_v1'), sql.indexOf('create or replace function public.vault_mobile_instance_pricing_target_v1'));
  assert.match(reader, /v_uid uuid := auth.uid\(\)/);
  assert.match(reader, /vii.user_id = v_uid/);
  assert.match(reader, /vii.archived_at is null/);
  assert.match(reader, /coalesce\(vii.card_print_id, sc.card_print_id\)/);
  assert.doesNotMatch(reader, /resolve_active_vault_anchor|\binsert into\b|\bupdate public\./i);
});
test('self ownership resolution cannot call reconciling detail or raw-only count readers', () => {
  const source = read('lib/services/vault/ownership_resolver_service.dart');
  const self = source.slice(source.indexOf('Future<Map<String, OwnershipState>> _resolveSelfContextBatch'), source.indexOf('Future<Map<String, OwnershipState>> _resolvePublicContextBatch'));
  assert.match(self, /OwnedCopyReadService.load/);
  assert.doesNotMatch(self, /loadManageCard|loadPrivate|getOwnedCountsByCardPrintIds|resolveOwnedCardAnchor/);
  assert.doesNotMatch(read('lib/services/vault/vault_card_service.dart'), /['"]resolve_active_vault_anchor_v1['"]/);
});
test('Objects selection is exact-copy keyed and avoids parent-level market estimates', () => {
  const source = read('lib/screens/grookai_objects/grookai_objects_hub_screen.dart');
  assert.match(source, /inventoryService.load/);
  assert.doesNotMatch(source, /getCanonicalCollectorRows|fetchByCardPrintIds/);
  const key = source.slice(source.indexOf('String _rowKey('), source.indexOf('String _cardPrintIdForRow('));
  assert.ok(key.indexOf("row['instance_id']") < key.indexOf('_cardPrintIdForRow'));
});
