import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

const displayIdentity = source('lib/services/identity/display_identity.dart');

test('shared display identity prefers canonical variant authority', () => {
  assert.match(displayIdentity, /suffix \?\?= formatVariantKey\(variantKey\)/);
  assert.match(
    displayIdentity,
    /suffix \?\?= formatPrintedIdentityModifier\(printedIdentityModifier\)/,
  );
  assert.doesNotMatch(displayIdentity, /split[^\n]*gv.?id|regexp[^\n]*gv.?id/i);
});

test('binder cards transport and render canonical variant context', () => {
  const models = source('lib/models/binders/binder_models.dart');
  const screen = source('lib/screens/binders/binder_detail_screen.dart');
  const helper = source('lib/services/binders/binder_display_identity.dart');
  const migration = source(
    'supabase/migrations/20260801160000_binder_card_variant_context_v1.sql',
  );

  for (const text of [models, helper, migration]) {
    assert.match(text, /variant(?:_key|Key)/i);
    assert.match(text, /printed(?:_identity_modifier|IdentityModifier)/i);
  }
  assert.match(screen, /resolveBinderChecklistItemIdentity/);
  assert.match(screen, /Standard printing/);
});

test('scanner generations preserve variants through result rendering', () => {
  const legacyService = source('lib/services/scanner/condition_scan_service.dart');
  const legacyScreen = source('lib/screens/scanner/scan_capture_screen.dart');
  const identityService = source('lib/services/identity/identity_scan_service.dart');
  const identityScreen = source('lib/screens/identity_scan/identity_scan_screen.dart');
  const v3Candidate = source('lib/services/scanner_v3/vector_candidate_service_v1.dart');
  const v3Tile = source('lib/screens/scanner/widgets/scanner_primary_card_tile.dart');
  const v5Candidate = source('lib/services/scanner_v5/scanner_v5_identity_service.dart');
  const v5Row = source('lib/screens/scanner_v5/widgets/scanner_candidate_row.dart');

  for (const text of [legacyService, identityService, v3Candidate, v5Candidate]) {
    assert.match(text, /variant(?:_key|Key)/i);
    assert.match(text, /printed(?:_identity_modifier|IdentityModifier)/i);
  }
  for (const text of [legacyScreen, identityScreen, v3Tile, v5Row]) {
    assert.match(text, /resolveDisplayIdentityFromFields/);
  }
});

test('copy, social, dex, onboarding, and object surfaces use governed identity', () => {
  const required = [
    ['lib/screens/gvvi/public_gvvi_screen.dart', /_publicGvviDisplayIdentity/],
    ['lib/screens/vault/vault_gvvi_screen.dart', /_gvviDisplayIdentity/],
    ['lib/screens/vault/vault_manage_card_screen.dart', /_manageCardDisplayIdentity/],
    ['lib/services/network/card_interaction_service.dart', /resolveDisplayIdentityFromFields/],
    ['lib/services/network/local_community_feed_service.dart', /resolveDisplayIdentityFromFields/],
    ['lib/services/network/pulse_service.dart', /resolveDisplayIdentityFromFields/],
    ['lib/services/grookai_dex/dex_wall_showcase_service.dart', /resolveDisplayIdentityFromFields/],
    ['lib/services/onboarding/onboarding_ladder_service.dart', /collectorDisplayName/],
    ['lib/screens/grookai_objects/grookai_objects_hub_screen.dart', /resolveDisplayIdentityFromFields/],
    ['lib/services/vault/collector_memory_service.dart', /resolveDisplayIdentityFromFields/],
  ];

  for (const [path, pattern] of required) {
    assert.match(source(path), pattern, `${path} must use governed display identity`);
  }
});

test('all primary collector card surfaces use governed display identity', () => {
  const required = [
    ['lib/main.dart', /resolveCardPrintDisplayIdentity/],
    ['lib/card_detail_screen.dart', /_displayIdentity\.displayName/],
    ['lib/screens/compare/compare_screen.dart', /_compareDisplayIdentity/],
    ['lib/screens/sets/public_set_detail_screen.dart', /_setCardDisplayIdentity/],
    ['lib/screens/public_collector/public_collector_screen.dart', /_publicCollectorDisplayIdentity/],
    ['lib/screens/network/network_screen.dart', /_networkDisplayIdentity/],
    ['lib/screens/network/network_inbox_screen.dart', /group\.cardName/],
    ['lib/screens/binders/binder_detail_screen.dart', /resolveBinderChecklistItemIdentity/],
    ['lib/screens/vault/vault_gvvi_screen.dart', /_gvviDisplayIdentity/],
    ['lib/screens/vault/vault_manage_card_screen.dart', /_manageCardDisplayIdentity/],
    ['lib/screens/dex/grookai_dex_species_screen.dart', /_dexCardDisplayIdentity/],
    ['lib/screens/scanner/scan_capture_screen.dart', /resolveDisplayIdentityFromFields/],
    ['lib/screens/scanner_v5/widgets/scanner_result_sheet.dart', /resolveDisplayIdentityFromFields/],
  ];

  for (const [path, pattern] of required) {
    assert.match(source(path), pattern, `${path} must render governed identity`);
  }
});

test('known direct card labels no longer render an unqualified raw candidate name', () => {
  const forbidden = [
    ['lib/screens/scanner/scan_capture_screen.dart', /title:\s*Text\(cardName/],
    ['lib/screens/identity_scan/identity_scan_screen.dart', /title:\s*Text\(name\.isEmpty/],
    ['lib/screens/scanner_v5/widgets/scanner_candidate_row.dart', /label:\s*candidate\.name/],
    ['lib/screens/binders/binder_detail_screen.dart', /title:\s*Text\(item\.name/],
  ];

  for (const [path, pattern] of forbidden) {
    assert.doesNotMatch(source(path), pattern, `${path} renders a raw card name`);
  }
});
