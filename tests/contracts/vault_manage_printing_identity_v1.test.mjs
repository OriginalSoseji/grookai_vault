import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

const service = source('lib/services/vault/vault_card_service.dart');
const screen = source('lib/screens/vault/vault_manage_card_screen.dart');

test('manage-card printing enrichment is owner-scoped and read-only', () => {
  assert.match(service, /from\('vault_item_instances'\)[\s\S]*select\('id,card_printing_id'\)[\s\S]*eq\('user_id', userId\)/);
  assert.match(service, /from\('card_printings'\)[\s\S]*finish_keys\(label\)/);
  assert.doesNotMatch(
    service.match(/_enrichManageCardCopiesWithPrintingIdentity\([\s\S]*?\n  }\n/)?.[0] ?? '',
    /\.update\(|\.insert\(|\.upsert\(|\.delete\(/,
  );
});

test('manage-card hero, copy rows, and Card Detail retain printing identity', () => {
  assert.match(screen, /label: data\.printingIdentityLabel/);
  assert.match(screen, /copy\.printingIdentityLabel/);
  assert.match(screen, /selectedPrintingGvId: data\.copies\.length == 1/);
  assert.match(screen, /selectedFinishLabel: data\.copies\.length == 1/);
});
