import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/binders/binder_models.dart';

/// Presentation order of already authorized summaries, never progress authority.
enum BinderLibrarySort {
  recent('recent', 'Recently updated'),
  name('name', 'Name A–Z'),
  completion('completion', 'Closest to completion');

  const BinderLibrarySort(this.storageKey, this.label);
  final String storageKey;
  final String label;

  static BinderLibrarySort fromStorage(String? value) => values.firstWhere(
    (sort) => sort.storageKey == value,
    orElse: () => recent,
  );

  List<BinderSummary> ordered(Iterable<BinderSummary> binders) {
    final rows = binders.indexed.toList();
    int compare(BinderSummary a, BinderSummary b) {
      switch (this) {
        case recent:
          final left = a.updatedAt;
          final right = b.updatedAt;
          if (left == null) return right == null ? 0 : 1;
          if (right == null) return -1;
          return right.compareTo(left);
        case name:
          return a.title.toLowerCase().compareTo(b.title.toLowerCase());
        case completion:
          // Unknown/empty targets follow meaningful progress. Compare exact
          // fractions so rounded display percentages cannot reverse the order.
          if (a.totalSlots <= 0) return b.totalSlots <= 0 ? 0 : 1;
          if (b.totalSlots <= 0) return -1;
          return (b.completedSlots.clamp(0, b.totalSlots) * a.totalSlots)
              .compareTo(
                a.completedSlots.clamp(0, a.totalSlots) * b.totalSlots,
              );
      }
    }

    rows.sort((a, b) {
      final order = compare(a.$2, b.$2);
      return order == 0 ? a.$1.compareTo(b.$1) : order;
    });
    return rows.map((entry) => entry.$2).toList(growable: false);
  }
}

/// Identity-free device setting. No Binder IDs, queries or account data persist.
class BinderLibraryPreferences extends ValueNotifier<BinderLibrarySort> {
  BinderLibraryPreferences({
    Future<String?> Function()? read,
    Future<bool> Function(String)? write,
  }) : _read = read ?? _readDevice,
       _write = write ?? _writeDevice,
       super(BinderLibrarySort.recent);

  static const preferenceKey = 'binder_library_sort_v1';
  final Future<String?> Function() _read;
  final Future<bool> Function(String) _write;
  Future<void>? _loading;
  Future<void> _writes = Future.value();
  int _revision = 0;
  bool _disposed = false;

  static Future<String?> _readDevice() async =>
      (await SharedPreferences.getInstance()).getString(preferenceKey);
  static Future<bool> _writeDevice(String value) async =>
      (await SharedPreferences.getInstance()).setString(preferenceKey, value);

  Future<void> ensureLoaded() => _loading ??= _load();

  Future<void> _load() async {
    if (_revision != 0) return;
    try {
      final stored = await _read();
      if (!_disposed && _revision == 0) {
        value = BinderLibrarySort.fromStorage(stored);
      }
    } catch (_) {
      // An unavailable device store does not block viewing the library.
    }
  }

  Future<bool> select(BinderLibrarySort sort) {
    if (_disposed) return Future.value(false);
    ++_revision;
    value = sort;
    final result = _writes.then((_) async {
      try {
        return await _write(sort.storageKey);
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
