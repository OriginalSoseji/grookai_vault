import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const contract = fs.readFileSync(
  'docs/contracts/VENDOR_MODE_WORKSPACE_V1.md',
  'utf8',
);
const index = fs.readFileSync('docs/CONTRACT_INDEX.md', 'utf8');
const service = fs.readFileSync(
  'lib/services/gvvi/vendor_pricing_workspace_service.dart',
  'utf8',
);
const screen = fs.readFileSync(
  'lib/screens/gvvi/vendor_pricing_workspace_screen.dart',
  'utf8',
);
const mainShell = fs.readFileSync('lib/main_shell.dart', 'utf8');
const collectorWall = fs.readFileSync(
  'lib/screens/public_collector/public_collector_screen.dart',
  'utf8',
);
const migration = fs.readFileSync(
  'supabase/migrations/20260817190000_vendor_mode_private_section_visibility_v1.sql',
  'utf8',
);
const dispositionMigration = fs.readFileSync(
  'supabase/migrations/20260818130000_vendor_mode_exact_copy_dispositions_v1.sql',
  'utf8',
);
const dispositionGrantMigration = fs.readFileSync(
  'supabase/migrations/20260818131500_vendor_mode_disposition_append_only_grants_v1.sql',
  'utf8',
);
const dispositionDetailsMigration = fs.readFileSync(
  'supabase/migrations/20260818133000_vendor_mode_transaction_details_v2.sql',
  'utf8',
);

test('Vendor Mode V1 is active and preserves exact-copy authority', () => {
  assert.match(index, /VENDOR_MODE_WORKSPACE_V1 \| Active/);
  assert.match(contract, /One row represents one `vault_item_instances\.id`/);
  assert.match(service, /\.eq\('id', instanceId\)/);
  assert.match(service, /\.eq\('user_id', userId\)/);
  assert.match(service, /filter\('archived_at', 'is', null\)/);
});

test('Vendor Mode is signed-in drawer navigation below Grookai Objects', () => {
  const drawer = mainShell.match(
    /class _GrookaiAppDrawer extends StatelessWidget[\s\S]*?class _GrookaiDrawerTile/,
  )?.[0] ?? '';
  const objectsIndex = drawer.indexOf("label: 'Grookai Objects'");
  const vendorIndex = drawer.indexOf("label: 'Vendor Mode'");

  assert.ok(objectsIndex >= 0);
  assert.ok(vendorIndex > objectsIndex);
  assert.match(drawer, /if \(signedIn\)[\s\S]*?label: 'Vendor Mode'/);
  assert.match(mainShell, /VendorPricingWorkspaceScreen/);
  assert.doesNotMatch(collectorWall, /VendorPricingWorkspaceScreen|_VendorPricingShortcut/);
});

test('market comparisons use only governed exact-printing evidence', () => {
  assert.match(service, /fetchByCardPrintingIds/);
  assert.doesNotMatch(service, /fetchByCardPrintIds/);
  assert.match(contract, /No parent fallback/);
  assert.match(contract, /Raw market comparison is absent for slabs/);
});

test('unassigned copies can select only a child printing from the same card', () => {
  assert.match(contract, /inline selector containing only/);
  assert.match(service, /savePrinting/);
  assert.match(service, /\.eq\('card_print_id', row\.cardPrintId\)/);
  assert.match(service, /'card_printing_id': selected\.id/);
  assert.match(service, /_text\(saved\['card_print_id'\]\) != row\.cardPrintId/);
  assert.match(screen, /vendor_printing_/);
});

test('price publication, condition, sections, and sharing remain bounded', () => {
  assert.match(service, /saveSingleCardListing/);
  assert.match(service, /'condition_label': next/);
  assert.match(service, /VaultGvviService\.assignSectionMembership/);
  assert.match(screen, /buildPersistentGvviQrUri/);
  assert.match(screen, /if \(!row\.shareReady\)/);
});

test('priced inventory is explicit, visible, and ordered before unpriced work', () => {
  assert.match(contract, /Price status includes all cards, priced, and unpriced/);
  assert.match(service, /left\.askingPrice == null \? 1 : 0/);
  assert.match(screen, /_VendorWorkspaceFilter\.priced => row\.askingPrice != null/);
  assert.match(screen, /_VendorWorkspaceFilter\.unpriced => row\.askingPrice == null/);
  assert.match(screen, /vendor_more_filters/);
  assert.match(screen, /Filter inventory/);
  assert.match(screen, /Text\('Market position'/);
  assert.match(screen, /Text\('Visibility'/);
  assert.doesNotMatch(screen, /class _VendorFilterGroup/);
});

test('swipe removal archives one exact copy through the governed RPC', () => {
  assert.match(contract, /familiar end-to-start swipe gesture/);
  assert.match(contract, /archives one exact/);
  assert.match(service, /vault_archive_exact_instance_v1/);
  assert.match(service, /archived_instance_id/);
  assert.match(service, /gv_vi_id/);
  assert.match(screen, /secondaryBackground: _RemoveBackground/);
  assert.match(screen, /else \{\s+await _confirmRemove\(row\)/);
  assert.match(screen, /Remove from Vault/);
  assert.match(screen, /return false/);
});

test('opposite swipe records sold or traded before archiving one exact copy', () => {
  assert.match(contract, /start-to-end swipe gesture/);
  assert.match(
    contract,
    /asking price remains a\s+separate historical snapshot/i,
  );
  assert.match(service, /vault_record_exact_instance_disposition_v2/);
  assert.match(service, /disposition_id/);
  assert.match(screen, /DismissDirection\.horizontal/);
  assert.match(screen, /DismissDirection\.startToEnd/);
  assert.match(screen, /Sold \/ Traded/);
  assert.match(dispositionMigration, /vault_item_instance_dispositions/);
  assert.match(dispositionMigration, /unique \(vault_item_instance_id\)/i);
  assert.match(dispositionMigration, /vault_archive_exact_instance_v1/);
  assert.match(dispositionMigration, /user_id = v_uid/);
  assert.match(dispositionMigration, /grant select[\s\S]*to authenticated/i);
  assert.doesNotMatch(
    dispositionMigration,
    /grant (update|delete)[\s\S]*to authenticated/i,
  );
  assert.match(
    dispositionGrantMigration,
    /revoke all[\s\S]*from service_role/i,
  );
  assert.match(
    dispositionGrantMigration,
    /grant select, insert[\s\S]*to service_role/i,
  );
  assert.doesNotMatch(
    dispositionGrantMigration,
    /grant (update|delete|truncate)[\s\S]*to service_role/i,
  );
  assert.match(dispositionDetailsMigration, /sale_price_required/);
  assert.match(
    dispositionDetailsMigration,
    /trade_received_description_required/,
  );
  assert.match(
    dispositionDetailsMigration,
    /trade_cash_direction in \('received', 'paid'\)/,
  );
  assert.match(screen, /Buyer \(optional\)/);
  assert.match(screen, /Received in trade/);
  assert.match(screen, /Cash received/);
  assert.match(screen, /Cash paid/);
});

test('private section membership cannot cross the public read boundary', () => {
  assert.match(migration, /vii\.intent[\s\S]*?in \('trade', 'sell', 'showcase'\)/i);
  assert.match(migration, /vii\.archived_at is null/i);
  assert.match(migration, /revoke all on function public\.section_card_rows_v2\(\)/i);
  assert.match(migration, /grant execute on function public\.section_card_rows_v2\(\)[\s\S]*?to anon, authenticated, service_role/i);
});
