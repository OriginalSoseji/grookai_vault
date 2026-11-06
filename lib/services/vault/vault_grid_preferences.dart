import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Device-only artwork density; never inventory or account authority.
class VaultGridPreferences extends ValueNotifier<int> {
  VaultGridPreferences({
    Future<int?> Function()? read,
    Future<bool> Function(int)? write,
  }) : _read = read ?? _readDevice,
       _write = write ?? _writeDevice,
       super(2);
  static const key = 'vault_grid_columns_v1';
  final Future<int?> Function() _read;
  final Future<bool> Function(int) _write;
  Future<void>? _loading;
  Future<void> _writes = Future.value();
  int _revision = 0;
  bool _disposed = false;
  static Future<int?> _readDevice() async =>
      (await SharedPreferences.getInstance()).getInt(key);
  static Future<bool> _writeDevice(int value) async =>
      (await SharedPreferences.getInstance()).setInt(key, value);
  Future<void> ensureLoaded() => _loading ??= _load();
  Future<void> _load() async {
    try {
      final stored = await _read();
      if (!_disposed && _revision == 0 && [2, 3, 4].contains(stored)) {
        value = stored!;
      }
    } catch (_) {
      /* Keep the usable default if local settings are unavailable. */
    }
  }

  Future<bool> select(int columns) {
    if (_disposed || ![2, 3, 4].contains(columns)) return Future.value(false);
    ++_revision;
    value = columns;
    final result = _writes.then((_) async {
      try {
        return await _write(columns);
      } catch (_) {
        return false;
      }
    });
    _writes = result.then((_) {});
    return result;
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
