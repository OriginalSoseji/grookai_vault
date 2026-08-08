import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/network/local_discovery_settings_service.dart';

void main() {
  test('normalizes coarse manual region without exact location data', () {
    const draft = LocalDiscoverySettingsData(
      enabled: true,
      areaLabel: '  denver   metro ',
      regionCode: ' co ',
      countryCode: ' us ',
    );

    final normalized = LocalDiscoverySettingsService.normalize(draft);
    final payload = LocalDiscoverySettingsService.buildOwnerPayload(
      userId: 'user-1',
      data: draft,
    );

    expect(normalized.areaLabel, 'denver metro');
    expect(normalized.regionCode, 'CO');
    expect(normalized.countryCode, 'US');
    expect(payload['location_precision'], 'region');
    expect(payload['location_source'], 'manual');
    expect(payload['geohash_prefix'], isNull);
    for (final forbidden in <String>[
      'latitude',
      'longitude',
      'address',
      'gps',
    ]) {
      expect(payload, isNot(contains(forbidden)));
    }
  });

  test('enabled settings require area, region, and ISO country code', () {
    const incomplete = LocalDiscoverySettingsData(
      enabled: true,
      areaLabel: '',
      regionCode: '',
      countryCode: 'USA',
    );

    expect(
      LocalDiscoverySettingsService.validate(incomplete).keys,
      containsAll(<String>['areaLabel', 'regionCode', 'countryCode']),
    );
  });

  test('disabled settings do not invent location requirements', () {
    const disabled = LocalDiscoverySettingsData.disabled();

    expect(LocalDiscoverySettingsService.validate(disabled), isEmpty);
    expect(disabled.hasCoarseRegion, isFalse);
  });
}
