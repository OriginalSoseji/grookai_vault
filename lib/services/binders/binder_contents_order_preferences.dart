import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Stores a device-local presentation order for contributed Binder contents.
/// This never changes the Binder checklist or the server's contribution rows.
class BinderContentsOrderPreferences {
  BinderContentsOrderPreferences({
    required String publicId,
    Future<String?> Function(String key)? read,
    Future<bool> Function(String key, String value)? write,
  }) : _key = 'binder_contents_order_v1_$publicId',
       _read = read ?? _readDevice,
       _write = write ?? _writeDevice;

  final String _key;
  final Future<String?> Function(String key) _read;
  final Future<bool> Function(String key, String value) _write;

  static Future<String?> _readDevice(String key) async =>
      (await SharedPreferences.getInstance()).getString(key);

  static Future<bool> _writeDevice(String key, String value) async =>
      (await SharedPreferences.getInstance()).setString(key, value);

  Future<List<String>> load() async {
    try {
      final value = await _read(_key);
      if (value == null) return const [];
      final decoded = jsonDecode(value);
      if (decoded is! List) return const [];
      return decoded.whereType<String>().toList(growable: false);
    } catch (_) {
      return const [];
    }
  }

  Future<bool> save(Iterable<String> displayKeys) async {
    try {
      return await _write(_key, jsonEncode(displayKeys.toList()));
    } catch (_) {
      return false;
    }
  }
}
