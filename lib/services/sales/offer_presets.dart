import 'dart:convert';

// Local editing preferences only; saved deal amounts remain authoritative.
final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  caseSensitive: false,
);
bool _keys(dynamic value, List<String> keys) =>
    value is Map &&
    value.length == keys.length &&
    value.keys.every(keys.contains);

Map<String, dynamic> validateOfferPresets(dynamic value) {
  if (!_keys(value, ['version', 'revision', 'presets']) ||
      value['version'] != 1 ||
      value['revision'] is! int ||
      value['revision'] < 0 ||
      value['revision'] > 1000000000 ||
      value['presets'] is! List ||
      value['presets'].length > 20) {
    throw const FormatException(
      'Saved offer presets could not be read. Your saved data has been kept.',
    );
  }
  final seen = <String>{};
  final presets = <Map<String, dynamic>>[];
  for (final dynamic preset in value['presets'] as List) {
    if (!_keys(preset, ['id', 'name', 'rateBps']) ||
        preset['id'] is! String ||
        !_uuid.hasMatch(preset['id'] as String) ||
        preset['name'] is! String ||
        (preset['name'] as String).trim().isEmpty ||
        (preset['name'] as String).trim().length > 80 ||
        RegExp(r'[\x00-\x1f\x7f]').hasMatch(preset['name'] as String) ||
        preset['rateBps'] is! int ||
        preset['rateBps'] < 1 ||
        preset['rateBps'] > 10000 ||
        !seen.add((preset['id'] as String).toLowerCase())) {
      throw const FormatException(
        'Check each preset name and percentage (0.01–100%). Keep at most 20 presets.',
      );
    }
    presets.add(
      Map<String, dynamic>.unmodifiable({
        'id': (preset['id'] as String).toLowerCase(),
        'name': (preset['name'] as String).trim(),
        'rateBps': preset['rateBps'],
      }),
    );
  }
  return Map<String, dynamic>.unmodifiable({
    'version': 1,
    'revision': value['revision'],
    'presets': List<Map<String, dynamic>>.unmodifiable(presets),
  });
}

Map<String, dynamic> readOfferPresets(String? raw) {
  if (raw == null) {
    return validateOfferPresets({'version': 1, 'revision': 0, 'presets': []});
  }
  if (raw.length > 20000) {
    throw const FormatException(
      'Saved offer presets could not be read. Your saved data has been kept.',
    );
  }
  return validateOfferPresets(jsonDecode(raw));
}
