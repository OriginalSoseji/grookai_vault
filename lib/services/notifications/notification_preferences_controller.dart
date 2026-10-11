import 'package:flutter/foundation.dart';
import 'notification_preferences.dart';

class NotificationPreferencesController extends ChangeNotifier {
  NotificationPreferencesController({
    required this.ownerId,
    required this.repository,
  });
  final String ownerId;
  final NotificationPreferencesRepository repository;

  NotificationPreferences? value;
  String? error;
  bool loading = false;
  bool saving = false;
  bool needsReload = false;
  bool closed = false;
  bool _disposed = false;
  int _revision = 0;
  bool get busy => loading || saving;

  bool _active() {
    if (_disposed || closed) return false;
    if (repository.currentOwnerId == ownerId && ownerId.isNotEmpty) return true;
    close();
    return false;
  }

  void close() {
    if (_disposed || closed) return;
    closed = true;
    _revision++;
    value = null;
    loading = saving = needsReload = false;
    error = 'Your account changed. Reopen notification settings.';
    notifyListeners();
  }

  bool _current(int revision) => _active() && revision == _revision;

  Future<void> load() async {
    if (!_active() || saving) return;
    final revision = ++_revision;
    loading = true;
    error = null;
    value = null;
    notifyListeners();
    try {
      final loaded = await repository.load();
      if (!_current(revision)) return;
      value = loaded;
      needsReload = false;
    } catch (_) {
      if (!_current(revision)) return;
      error = 'Unable to load notification settings. Try again.';
    } finally {
      if (_current(revision)) {
        loading = false;
        notifyListeners();
      }
    }
  }

  Future<bool> _save(
    Future<NotificationPreferences> Function() operation,
  ) async {
    if (!_active() || busy || value == null || needsReload) return false;
    final revision = ++_revision;
    saving = true;
    error = null;
    notifyListeners();
    try {
      final saved = await operation();
      if (!_current(revision)) return false;
      value = saved;
      return true;
    } catch (_) {
      if (!_current(revision)) return false;
      needsReload = true;
      error =
          'Could not confirm this change. Reload settings before editing again.';
      return false;
    } finally {
      if (_current(revision)) {
        saving = false;
        notifyListeners();
      }
    }
  }

  Future<bool> saveCadence(NotificationCadence cadence, bool enabled) =>
      _save(() => repository.saveCadence(cadence, enabled));

  Future<bool> saveQuietHours({
    required String start,
    required String end,
    required String timezone,
  }) => _save(
    () => repository.saveQuietHours(start: start, end: end, timezone: timezone),
  );

  Future<bool> disableQuietHours() => _save(repository.disableQuietHours);

  @override
  void dispose() {
    _disposed = true;
    _revision++;
    super.dispose();
  }
}
