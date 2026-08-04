import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mainSource = readFileSync(new URL('../../lib/main.dart', import.meta.url), 'utf8');
const manageSource = readFileSync(
  new URL('../../lib/screens/vault/vault_manage_card_screen.dart', import.meta.url),
  'utf8',
);

test('mobile catalog metadata removes duplicate finish labels', () => {
  assert.match(mainSource, /List<String> _dedupeCatalogLabels/);
  assert.match(mainSource, /_dedupeCatalogLabels\(subtitleParts\)\.join\(' • '\)/);
});

test('owned copy rows expose the exact-copy media manager', () => {
  assert.match(manageSource, /Future<void> _openExactCopy\(VaultManageCardCopy copy\)/);
  assert.match(manageSource, /VaultGvviScreen\(gvviId: gvviId\)/);
  assert.match(manageSource, /onTap: \(\) => _openExactCopy\(copy\)/);
  assert.match(manageSource, /onTap: \(\) => _openExactCopy\(data\.copies\[index\]\)/);
});
