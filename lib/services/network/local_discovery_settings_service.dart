import 'package:supabase_flutter/supabase_flutter.dart';

class LocalDiscoverySettingsData {
  const LocalDiscoverySettingsData({
    required this.enabled,
    required this.areaLabel,
    required this.regionCode,
    required this.countryCode,
  });

  const LocalDiscoverySettingsData.disabled()
    : enabled = false,
      areaLabel = '',
      regionCode = '',
      countryCode = '';

  final bool enabled;
  final String areaLabel;
  final String regionCode;
  final String countryCode;

  bool get hasCoarseRegion =>
      areaLabel.isNotEmpty && regionCode.isNotEmpty && countryCode.isNotEmpty;

  String get displayLabel => [
    areaLabel,
    regionCode,
    countryCode,
  ].where((value) => value.isNotEmpty).join(', ');

  LocalDiscoverySettingsData copyWith({
    bool? enabled,
    String? areaLabel,
    String? regionCode,
    String? countryCode,
  }) {
    return LocalDiscoverySettingsData(
      enabled: enabled ?? this.enabled,
      areaLabel: areaLabel ?? this.areaLabel,
      regionCode: regionCode ?? this.regionCode,
      countryCode: countryCode ?? this.countryCode,
    );
  }
}

class LocalDiscoverySettingsService {
  static const String tableName = 'collector_local_discovery_settings';

  static Future<LocalDiscoverySettingsData> load({
    required SupabaseClient client,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Sign in required.');
    }

    final row = await client
        .from(tableName)
        .select('local_discovery_enabled,area_label,region_code,country_code')
        .eq('user_id', user.id)
        .maybeSingle();
    if (row == null) {
      return const LocalDiscoverySettingsData.disabled();
    }

    final map = Map<String, dynamic>.from(row);
    return normalize(
      LocalDiscoverySettingsData(
        enabled: map['local_discovery_enabled'] == true,
        areaLabel: _text(map['area_label']),
        regionCode: _text(map['region_code']),
        countryCode: _text(map['country_code']),
      ),
    );
  }

  static LocalDiscoverySettingsData normalize(LocalDiscoverySettingsData data) {
    return LocalDiscoverySettingsData(
      enabled: data.enabled,
      areaLabel: data.areaLabel.trim().replaceAll(RegExp(r'\s+'), ' '),
      regionCode: data.regionCode.trim().toUpperCase(),
      countryCode: data.countryCode.trim().toUpperCase(),
    );
  }

  static Map<String, String> validate(LocalDiscoverySettingsData data) {
    final normalized = normalize(data);
    final errors = <String, String>{};
    if (!normalized.enabled) {
      return errors;
    }

    if (normalized.areaLabel.length < 2 || normalized.areaLabel.length > 120) {
      errors['areaLabel'] = 'Enter a city or area name.';
    }
    if (!_regionPattern.hasMatch(normalized.regionCode)) {
      errors['regionCode'] = 'Enter a region code such as CO.';
    }
    if (!_countryPattern.hasMatch(normalized.countryCode)) {
      errors['countryCode'] = 'Enter a 2-letter country code such as US.';
    }
    return errors;
  }

  static Map<String, dynamic> buildOwnerPayload({
    required String userId,
    required LocalDiscoverySettingsData data,
  }) {
    final normalized = normalize(data);
    return <String, dynamic>{
      'user_id': userId,
      'local_discovery_enabled': normalized.enabled,
      'area_label': normalized.areaLabel.isEmpty ? null : normalized.areaLabel,
      'region_code': normalized.regionCode.isEmpty
          ? null
          : normalized.regionCode,
      'country_code': normalized.countryCode.isEmpty
          ? null
          : normalized.countryCode,
      'geohash_prefix': null,
      'radius_miles': 25,
      'location_precision': 'region',
      'location_source': 'manual',
    };
  }

  static Future<LocalDiscoverySettingsData> save({
    required SupabaseClient client,
    required LocalDiscoverySettingsData data,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Sign in required.');
    }

    final normalized = normalize(data);
    final errors = validate(normalized);
    if (errors.isNotEmpty) {
      throw ArgumentError('Local discovery settings are incomplete.');
    }

    final row = await client
        .from(tableName)
        .upsert(
          buildOwnerPayload(userId: user.id, data: normalized),
          onConflict: 'user_id',
        )
        .select('local_discovery_enabled,area_label,region_code,country_code')
        .single();
    final map = Map<String, dynamic>.from(row);
    return normalize(
      LocalDiscoverySettingsData(
        enabled: map['local_discovery_enabled'] == true,
        areaLabel: _text(map['area_label']),
        regionCode: _text(map['region_code']),
        countryCode: _text(map['country_code']),
      ),
    );
  }

  static final RegExp _regionPattern = RegExp(r'^[A-Z0-9][A-Z0-9-]{0,11}$');
  static final RegExp _countryPattern = RegExp(r'^[A-Z]{2}$');
}

String _text(dynamic value) => (value ?? '').toString().trim();
