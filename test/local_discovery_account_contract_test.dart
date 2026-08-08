import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Account exposes explicit coarse-region local discovery opt-in', () {
    final source = File(
      'lib/screens/account/account_screen.dart',
    ).readAsStringSync();

    expect(source, contains('Nearby collectors'));
    expect(source, contains('Local discovery'));
    expect(source, contains('Save and opt in'));
    expect(source, contains('Do not enter a street address'));
    expect(source, contains('LocalDiscoverySettingsService.save'));
  });

  test('existing persistence contract remains owner-only and coarse', () {
    final migration = File(
      'supabase/migrations/20260520233000_local_community_feed_infra_v1.sql',
    ).readAsStringSync();
    final service = File(
      'lib/services/network/local_discovery_settings_service.dart',
    ).readAsStringSync();

    expect(migration, contains('auth.uid() = user_id'));
    expect(
      migration,
      contains('never exact lat/lng, address, raw GPS, IP-derived location'),
    );
    expect(service, contains("'location_precision': 'region'"));
    expect(service, contains("'location_source': 'manual'"));
    expect(service, isNot(contains("'latitude'")));
    expect(service, isNot(contains("'longitude'")));
    expect(service, isNot(contains("'address'")));
  });
}
