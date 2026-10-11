import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/notifications/notification_preferences.dart';
import 'package:grookai_vault/services/notifications/notification_preferences_controller.dart';

class FakeRepository implements NotificationPreferencesRepository {
  @override
  String? currentOwnerId = 'owner-a';
  NotificationPreferences value = const NotificationPreferences.defaults();
  final reads = <Completer<NotificationPreferences>>[];
  Completer<NotificationPreferences>? write;
  int mutations = 0;
  @override
  Future<NotificationPreferences> load() async =>
      reads.isEmpty ? value : reads.removeAt(0).future;
  Future<NotificationPreferences> save() async {
    mutations++;
    return write?.future ?? value;
  }

  @override
  Future<NotificationPreferences> saveCadence(
    NotificationCadence cadence,
    bool enabled,
  ) => save();
  @override
  Future<NotificationPreferences> saveQuietHours({
    required String start,
    required String end,
    required String timezone,
  }) => save();
  @override
  Future<NotificationPreferences> disableQuietHours() => save();
}

void main() {
  NotificationPreferencesController controller(FakeRepository repo) =>
      NotificationPreferencesController(ownerId: 'owner-a', repository: repo);
  const changed = NotificationPreferences(
    instant: false,
    daily: true,
    weekly: false,
    quietStart: '22:00:00',
    quietEnd: '08:00:00',
    timezone: 'America/Denver',
  );

  test('only an absent row becomes the existing defaults', () {
    final value = NotificationPreferences.parse(null);
    expect([value.instant, value.daily, value.weekly], [true, true, true]);
    expect(value.quietStart, isNull);
    expect(() => NotificationPreferences.parse({}), throwsFormatException);
    expect(
      () => NotificationPreferences.parse({
        'instant_enabled': null,
        'daily_pulse_enabled': true,
        'weekly_enabled': true,
      }),
      throwsFormatException,
    );
  });
  test(
    'stored false, partial quiet hours and legacy timezone remain visible without invented repair',
    () {
      final value = NotificationPreferences.parse({
        'instant_enabled': false,
        'daily_pulse_enabled': false,
        'weekly_enabled': false,
        'quiet_hours_start': '22:00:00',
        'quiet_hours_end': null,
        'timezone': 'Legacy/Unknown',
      });
      expect([value.instant, value.daily, value.weekly], [false, false, false]);
      expect(value.quietStart, '22:00:00');
      expect(value.quietEnd, isNull);
      expect(value.timezone, 'Legacy/Unknown');
    },
  );
  test('read failure is unavailable and cannot enable mutations', () async {
    final read = Completer<NotificationPreferences>();
    final repo = FakeRepository()..reads.add(read);
    final state = controller(repo);
    final pending = state.load();
    read.completeError(StateError('read unavailable'));
    await pending;
    expect(state.value, isNull);
    expect(state.error, contains('Unable to load'));
    expect(state.loading, false);
    expect(await state.saveCadence(NotificationCadence.instant, false), false);
    expect(repo.mutations, 0);
    state.dispose();
  });
  test('a slow older read cannot replace the latest one', () async {
    final old = Completer<NotificationPreferences>(),
        current = Completer<NotificationPreferences>();
    final repo = FakeRepository()..reads.addAll([old, current]);
    final state = controller(repo);
    final first = state.load(), second = state.load();
    current.complete(changed);
    await second;
    old.complete(const NotificationPreferences.defaults());
    await first;
    expect(state.value, same(changed));
    state.dispose();
  });
  for (final dispose in [false, true]) {
    test(
      'late read after ${dispose ? 'disposal' : 'owner replacement'} cannot restore settings',
      () async {
        final read = Completer<NotificationPreferences>();
        final repo = FakeRepository()..reads.add(read);
        final state = controller(repo);
        final pending = state.load();
        if (dispose) {
          state.dispose();
        } else {
          repo.currentOwnerId = 'owner-b';
          state.close();
        }
        read.complete(changed);
        await pending;
        expect(state.value, isNull);
        if (!dispose) {
          expect(state.closed, true);
          state.dispose();
        }
      },
    );
    test(
      'late write after ${dispose ? 'disposal' : 'owner replacement'} cannot report success',
      () async {
        final write = Completer<NotificationPreferences>();
        final repo = FakeRepository()..write = write;
        final state = controller(repo);
        await state.load();
        final pending = state.saveCadence(NotificationCadence.instant, false);
        if (dispose) {
          state.dispose();
        } else {
          repo.currentOwnerId = 'owner-b';
          state.close();
        }
        write.complete(changed);
        expect(await pending, false);
        if (!dispose) {
          expect(state.value, isNull);
          expect(state.closed, true);
          state.dispose();
        }
      },
    );
  }
  test(
    'unconfirmed save requires a successful reload before another edit',
    () async {
      final write = Completer<NotificationPreferences>();
      final repo = FakeRepository()..write = write;
      final state = controller(repo);
      await state.load();
      final pending = state.saveCadence(NotificationCadence.instant, false);
      write.completeError(StateError('response lost'));
      expect(await pending, false);
      expect(state.needsReload, true);
      expect(state.error, contains('Could not confirm'));
      expect(await state.saveCadence(NotificationCadence.daily, false), false);
      expect(repo.mutations, 1);
      repo.value = changed;
      repo.write = null;
      await state.load();
      expect(state.value, same(changed));
      expect(state.needsReload, false);
      expect(await state.saveCadence(NotificationCadence.daily, false), true);
      expect(repo.mutations, 2);
      state.dispose();
    },
  );
  test('saving disables overlapping writes and premature reload', () async {
    final write = Completer<NotificationPreferences>();
    final repo = FakeRepository()..write = write;
    final state = controller(repo);
    await state.load();
    final pending = state.saveCadence(NotificationCadence.instant, false);
    expect(await state.disableQuietHours(), false);
    await state.load();
    expect(state.saving, true);
    expect(repo.mutations, 1);
    write.complete(changed);
    expect(await pending, true);
    expect(state.value, same(changed));
    expect(state.busy, false);
    state.dispose();
  });
  test(
    'owner changes are detected before a new write even without a UI auth callback',
    () async {
      final repo = FakeRepository();
      final state = controller(repo);
      await state.load();
      repo.currentOwnerId = 'owner-b';
      expect(await state.disableQuietHours(), false);
      expect(repo.mutations, 0);
      expect(state.closed, true);
      expect(state.value, isNull);
      state.dispose();
    },
  );
  test(
    'a closed old-owner controller cannot reopen when that owner signs back in',
    () async {
      final repo = FakeRepository();
      final state = controller(repo);
      await state.load();
      repo.currentOwnerId = null;
      state.close();
      repo.currentOwnerId = 'owner-a';
      await state.load();
      expect(state.closed, true);
      expect(state.value, isNull);
      expect(await state.saveCadence(NotificationCadence.weekly, false), false);
      state.dispose();
    },
  );
}
