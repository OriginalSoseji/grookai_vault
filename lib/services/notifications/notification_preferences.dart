import 'package:supabase_flutter/supabase_flutter.dart';

enum NotificationCadence {
  instant('instant_enabled'),
  daily('daily_pulse_enabled'),
  weekly('weekly_enabled');

  const NotificationCadence(this.column);
  final String column;
}

class NotificationPreferences {
  const NotificationPreferences({
    required this.instant,
    required this.daily,
    required this.weekly,
    required this.quietStart,
    required this.quietEnd,
    required this.timezone,
  });

  // Existing dispatcher defaults. Reading an absent row never creates one.
  const NotificationPreferences.defaults()
    : instant = true,
      daily = true,
      weekly = true,
      quietStart = null,
      quietEnd = null,
      timezone = null;

  final bool instant;
  final bool daily;
  final bool weekly;
  final String? quietStart;
  final String? quietEnd;
  final String? timezone;

  static NotificationPreferences parse(Map<String, dynamic>? row) {
    if (row == null) return const NotificationPreferences.defaults();
    for (final field in [
      'instant_enabled',
      'daily_pulse_enabled',
      'weekly_enabled',
    ]) {
      if (row[field] is! bool) {
        throw const FormatException('Notification settings are incomplete.');
      }
    }
    for (final field in ['quiet_hours_start', 'quiet_hours_end', 'timezone']) {
      if (!row.containsKey(field) ||
          (row[field] != null && row[field] is! String)) {
        throw const FormatException('Notification settings are incomplete.');
      }
    }
    return NotificationPreferences(
      instant: row['instant_enabled'] as bool,
      daily: row['daily_pulse_enabled'] as bool,
      weekly: row['weekly_enabled'] as bool,
      quietStart: row['quiet_hours_start'] as String?,
      quietEnd: row['quiet_hours_end'] as String?,
      timezone: row['timezone'] as String?,
    );
  }

  bool cadence(NotificationCadence cadence) => switch (cadence) {
    NotificationCadence.instant => instant,
    NotificationCadence.daily => daily,
    NotificationCadence.weekly => weekly,
  };
}

abstract interface class NotificationPreferencesRepository {
  String? get currentOwnerId;
  Future<NotificationPreferences> load();
  Future<NotificationPreferences> saveCadence(
    NotificationCadence cadence,
    bool enabled,
  );
  Future<NotificationPreferences> saveQuietHours({
    required String start,
    required String end,
    required String timezone,
  });
  Future<NotificationPreferences> disableQuietHours();
}

class SupabaseNotificationPreferencesRepository
    implements NotificationPreferencesRepository {
  SupabaseNotificationPreferencesRepository({
    required this.client,
    required this.ownerId,
    required this.timezones,
  });
  final SupabaseClient client;
  final String ownerId;
  final Set<String> timezones;
  static const columns =
      'instant_enabled,daily_pulse_enabled,weekly_enabled,quiet_hours_start,quiet_hours_end,timezone';

  @override
  String? get currentOwnerId => client.auth.currentUser?.id;

  void _checkOwner() {
    if (ownerId.isEmpty || currentOwnerId != ownerId) {
      throw const AuthException(
        'Your account changed. Reopen notification settings.',
      );
    }
  }

  @override
  Future<NotificationPreferences> load() async {
    _checkOwner();
    final row = await client
        .from('notification_prefs')
        .select(columns)
        .eq('user_id', ownerId)
        .maybeSingle();
    _checkOwner();
    return NotificationPreferences.parse(row);
  }

  Future<NotificationPreferences> _save(Map<String, dynamic> patch) async {
    _checkOwner();
    // The update contains only changed columns, preserving concurrent choices.
    final row = await client
        .from('notification_prefs')
        .upsert(
          {'user_id': ownerId, ...patch},
          onConflict: 'user_id',
          defaultToNull: false,
        )
        .select(columns)
        .single();
    _checkOwner();
    return NotificationPreferences.parse(row);
  }

  @override
  Future<NotificationPreferences> saveCadence(
    NotificationCadence cadence,
    bool enabled,
  ) => _save({cadence.column: enabled});

  @override
  Future<NotificationPreferences> saveQuietHours({
    required String start,
    required String end,
    required String timezone,
  }) {
    final pattern = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$');
    if (!pattern.hasMatch(start) || !pattern.hasMatch(end) || start == end) {
      throw ArgumentError('Choose different valid start and end times.');
    }
    if (!timezones.contains(timezone)) {
      throw ArgumentError('Choose a supported timezone.');
    }
    return _save({
      'quiet_hours_start': '$start:00',
      'quiet_hours_end': '$end:00',
      'timezone': timezone,
    });
  }

  @override
  Future<NotificationPreferences> disableQuietHours() =>
      _save({'quiet_hours_start': null, 'quiet_hours_end': null});
}
