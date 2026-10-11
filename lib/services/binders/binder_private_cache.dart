import 'dart:convert';
import 'dart:async';

import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/binders/binder_models.dart';

/// Account-scoped cache for safe Binder dashboard summaries only.
///
/// Invitation/view tokens, exact Vault instance IDs, eligible-copy results,
/// member identities, and mutation responses are intentionally never cached.
class BinderPrivateCache {
  BinderPrivateCache._();

  static Future<void>? _queue;
  static Future<T> _serialize<T>(Future<T> Function() action) async {
    final previous = _queue;
    final gate = Completer<void>();
    _queue = gate.future;
    try {
      if (previous != null) await previous;
      return await action();
    } finally {
      if (identical(_queue, gate.future)) _queue = null;
      gate.complete();
    }
  }

  static const _activeAccountKey = 'binder_cache_active_account_v1';
  static const _libraryPrefix = 'binder_cache_library_v1_';

  static Future<BinderLibraryPage?> readLibrary(
    String userId, {
    bool Function()? isCurrent,
  }) => _serialize(() async {
    final scope = _scope(userId);
    if (scope == null) return null;
    final prefs = await SharedPreferences.getInstance();
    if (isCurrent != null && !isCurrent()) return null;
    await _synchronizeScope(prefs, scope);
    if (isCurrent != null && !isCurrent()) return null;
    final raw = prefs.getString('$_libraryPrefix$scope');
    if (raw == null || raw.isEmpty) return null;
    return BinderLibraryPage.decodeCache(raw);
  });

  static Future<void> writeLibrary(
    String userId,
    BinderLibraryPage page, {
    bool Function()? isCurrent,
  }) => _serialize(() async {
    final scope = _scope(userId);
    if (scope == null) return;
    final prefs = await SharedPreferences.getInstance();
    if (isCurrent != null && !isCurrent()) return;
    await _synchronizeScope(prefs, scope);
    if (isCurrent != null && !isCurrent()) return;
    await prefs.setString('$_libraryPrefix$scope', page.encodeForCache());
  });

  static Future<void> purgeCurrent() => _serialize(() async {
    final prefs = await SharedPreferences.getInstance();
    final active = prefs.getString(_activeAccountKey);
    if (active != null && active.isNotEmpty) {
      await prefs.remove('$_libraryPrefix$active');
    }
    await prefs.remove(_activeAccountKey);
  });

  static Future<void> purgeUser(String userId) => _serialize(() async {
    final scope = _scope(userId);
    if (scope == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_libraryPrefix$scope');
    if (prefs.getString(_activeAccountKey) == scope) {
      await prefs.remove(_activeAccountKey);
    }
  });

  static Future<void> _synchronizeScope(
    SharedPreferences prefs,
    String scope,
  ) async {
    final previous = prefs.getString(_activeAccountKey);
    if (previous != null && previous != scope) {
      await prefs.remove('$_libraryPrefix$previous');
    }
    if (previous != scope) {
      await prefs.setString(_activeAccountKey, scope);
    }
  }

  static String? _scope(String userId) {
    final normalized = userId.trim();
    if (normalized.isEmpty) return null;
    return sha256.convert(utf8.encode(normalized)).toString().substring(0, 24);
  }
}
