import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/binders/binder_models.dart';

/// Account-scoped cache for safe Binder dashboard summaries only.
///
/// Invitation/view tokens, exact Vault instance IDs, eligible-copy results,
/// member identities, and mutation responses are intentionally never cached.
class BinderPrivateCache {
  BinderPrivateCache._();

  static const _activeAccountKey = 'binder_cache_active_account_v1';
  static const _libraryPrefix = 'binder_cache_library_v1_';

  static Future<BinderLibraryPage?> readLibrary(String userId) async {
    final scope = _scope(userId);
    if (scope == null) return null;
    final prefs = await SharedPreferences.getInstance();
    await _synchronizeScope(prefs, scope);
    final raw = prefs.getString('$_libraryPrefix$scope');
    if (raw == null || raw.isEmpty) return null;
    return BinderLibraryPage.decodeCache(raw);
  }

  static Future<void> writeLibrary(
    String userId,
    BinderLibraryPage page,
  ) async {
    final scope = _scope(userId);
    if (scope == null) return;
    final prefs = await SharedPreferences.getInstance();
    await _synchronizeScope(prefs, scope);
    await prefs.setString('$_libraryPrefix$scope', page.encodeForCache());
  }

  static Future<void> purgeCurrent() async {
    final prefs = await SharedPreferences.getInstance();
    final active = prefs.getString(_activeAccountKey);
    if (active != null && active.isNotEmpty) {
      await prefs.remove('$_libraryPrefix$active');
    }
    await prefs.remove(_activeAccountKey);
  }

  static Future<void> purgeUser(String userId) async {
    final scope = _scope(userId);
    if (scope == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_libraryPrefix$scope');
    if (prefs.getString(_activeAccountKey) == scope) {
      await prefs.remove(_activeAccountKey);
    }
  }

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
