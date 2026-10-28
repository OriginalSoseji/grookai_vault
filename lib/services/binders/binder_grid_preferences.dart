import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/binders/binder_grid_layout.dart';

/// Identity-free device preference shared by the Binder page views.
class BinderGridPreferences extends ValueNotifier<BinderGridLayout> {
  BinderGridPreferences({
    Future<String?> Function()? read,
    Future<bool> Function(String)? write,
  }) : _read = read ?? _readDevice,
       _write = write ?? _writeDevice,
       super(BinderGridLayout.threeByThree);

  static const preferenceKey = 'binder_grid_layout_v1';
  static final shared = BinderGridPreferences();
  final Future<String?> Function() _read;
  final Future<bool> Function(String) _write;
  Future<void>? _loading;
  Future<void> _writes = Future.value();
  int _revision = 0;

  static Future<String?> _readDevice() async =>
      (await SharedPreferences.getInstance()).getString(preferenceKey);
  static Future<bool> _writeDevice(String value) async =>
      (await SharedPreferences.getInstance()).setString(preferenceKey, value);

  Future<void> ensureLoaded() => _loading ??= _load();

  Future<void> _load() async {
    if (_revision != 0) return;
    final revision = _revision;
    try {
      final stored = await _read();
      if (revision == _revision) value = BinderGridLayout.fromStorage(stored);
    } catch (_) {
      // A missing/unavailable device store must not block arranging cards.
    }
  }

  Future<bool> select(BinderGridLayout layout) {
    ++_revision;
    value = layout;
    // Serialize writes so a slow older choice cannot overwrite a newer one.
    final result = _writes.then((_) async {
      try {
        return await _write(layout.storageKey);
      } catch (_) {
        return false;
      }
    });
    _writes = result.then((_) {});
    return result;
  }
}
