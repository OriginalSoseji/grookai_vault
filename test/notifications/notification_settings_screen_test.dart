import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/account/notification_settings_screen.dart';
import 'package:grookai_vault/services/notifications/notification_device_registration.dart';
import 'package:grookai_vault/services/notifications/notification_preferences.dart';

class SettingsRepository implements NotificationPreferencesRepository {
  @override
  String? currentOwnerId = 'owner-a';
  NotificationPreferences value = const NotificationPreferences.defaults();
  bool failRead = false, loseWriteReply = false;
  int writes = 0;
  @override
  Future<NotificationPreferences> load() async {
    if (failRead) throw StateError('offline');
    return value;
  }

  @override
  Future<NotificationPreferences> saveCadence(
    NotificationCadence cadence,
    bool enabled,
  ) async {
    writes++;
    value = NotificationPreferences(
      instant: cadence == NotificationCadence.instant ? enabled : value.instant,
      daily: cadence == NotificationCadence.daily ? enabled : value.daily,
      weekly: cadence == NotificationCadence.weekly ? enabled : value.weekly,
      quietStart: value.quietStart,
      quietEnd: value.quietEnd,
      timezone: value.timezone,
    );
    if (loseWriteReply) throw StateError('reply lost');
    return value;
  }

  @override
  Future<NotificationPreferences> saveQuietHours({
    required String start,
    required String end,
    required String timezone,
  }) async {
    writes++;
    return value = NotificationPreferences(
      instant: value.instant,
      daily: value.daily,
      weekly: value.weekly,
      quietStart: '$start:00',
      quietEnd: '$end:00',
      timezone: timezone,
    );
  }

  @override
  Future<NotificationPreferences> disableQuietHours() async {
    writes++;
    return value = NotificationPreferences(
      instant: value.instant,
      daily: value.daily,
      weekly: value.weekly,
      quietStart: null,
      quietEnd: null,
      timezone: value.timezone,
    );
  }
}

void main() {
  Future<void> show(
    WidgetTester tester,
    SettingsRepository repository, {
    Stream<String?>? owners,
    NotificationPermission permission = NotificationPermission.undetermined,
    Future<NotificationDeviceOutcome> Function()? enable,
    Future<NotificationPermission?> Function()? read,
    double scale = 1,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: NotificationSettingsScreen(
          repository: repository,
          ownerChanges: owners,
          readPermission: read ?? () async => permission,
          enableDevice:
              enable ?? () async => NotificationDeviceOutcome.registered,
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> tapVisible(WidgetTester tester, Finder finder) async {
    await tester.scrollUntilVisible(
      finder,
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(finder);
    await tester.pumpAndSettle();
  }

  testWidgets(
    'opening settings reads permission but never requests it or writes defaults',
    (tester) async {
      final repo = SettingsRepository();
      var reads = 0, enables = 0;
      await show(
        tester,
        repo,
        read: () async {
          reads++;
          return NotificationPermission.undetermined;
        },
        enable: () async {
          enables++;
          return NotificationDeviceOutcome.registered;
        },
      );
      expect(reads, 1);
      expect(enables, 0);
      expect(repo.writes, 0);
      expect(find.text('Instant updates'), findsOneWidget);
      expect(find.textContaining('Not available yet.'), findsOneWidget);
      await tapVisible(tester, find.text('Enable on this device'));
      expect(enables, 1);
      expect(
        find.text('Push notifications are enabled on this device.'),
        findsOneWidget,
      );
    },
  );
  testWidgets(
    'a failed preference read does not show default switches or enable device setup',
    (tester) async {
      final repo = SettingsRepository()..failRead = true;
      await show(tester, repo);
      expect(find.textContaining('Unable to load'), findsOneWidget);
      expect(find.byType(SwitchListTile), findsNothing);
      expect(find.text('Enable on this device'), findsNothing);
      repo.failRead = false;
      await tapVisible(tester, find.text('Reload settings'));
      expect(find.text('Instant updates'), findsOneWidget);
      expect(repo.writes, 0);
    },
  );
  testWidgets(
    'an ambiguous cadence save disables further edits until actual preferences reload',
    (tester) async {
      final repo = SettingsRepository()..loseWriteReply = true;
      await show(tester, repo);
      await tester.tap(find.text('Instant updates'));
      await tester.pumpAndSettle();
      expect(repo.writes, 1);
      expect(find.textContaining('Could not confirm'), findsOneWidget);
      for (final item in tester.widgetList<SwitchListTile>(
        find.byType(SwitchListTile),
      )) {
        expect(item.onChanged, isNull);
      }
      repo.loseWriteReply = false;
      await tapVisible(tester, find.text('Reload settings'));
      final instant = tester.widget<SwitchListTile>(
        find.ancestor(
          of: find.text('Instant updates'),
          matching: find.byType(SwitchListTile),
        ),
      );
      expect(instant.value, false);
      expect(repo.writes, 1);
    },
  );
  testWidgets(
    'quiet hours remain a draft until explicitly saved as a complete pair',
    (tester) async {
      final repo = SettingsRepository();
      await show(tester, repo);
      await tapVisible(
        tester,
        find.text('Pause collection and message updates during quiet hours'),
      );
      expect(repo.writes, 0);
      expect(find.byType(DropdownMenu<String>), findsOneWidget);
      await tapVisible(tester, find.text('Save quiet hours'));
      expect(repo.writes, 1);
      expect(repo.value.quietStart, '22:00:00');
      expect(repo.value.quietEnd, '08:00:00');
      expect(repo.value.timezone, 'UTC');
    },
  );
  testWidgets(
    'denied permission offers a read-only check without a repeated request',
    (tester) async {
      final repo = SettingsRepository();
      var reads = 0, enables = 0;
      await show(
        tester,
        repo,
        read: () async {
          reads++;
          return NotificationPermission.denied;
        },
        enable: () async {
          enables++;
          return NotificationDeviceOutcome.registered;
        },
      );
      await tapVisible(tester, find.text('Check device permission'));
      expect(reads, 2);
      expect(enables, 0);
    },
  );
  testWidgets(
    'owner replacement removes private preferences and late device success',
    (tester) async {
      final owners = StreamController<String?>.broadcast();
      addTearDown(owners.close);
      final repo = SettingsRepository();
      final pending = Completer<NotificationDeviceOutcome>();
      await show(
        tester,
        repo,
        owners: owners.stream,
        enable: () => pending.future,
      );
      await tester.scrollUntilVisible(
        find.text('Enable on this device'),
        220,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Enable on this device'));
      await tester.pump();
      repo.currentOwnerId = 'owner-b';
      owners.add('owner-b');
      await tester.pumpAndSettle();
      pending.complete(NotificationDeviceOutcome.registered);
      await tester.pumpAndSettle();
      expect(find.text('Instant updates'), findsNothing);
      expect(find.textContaining('Your account changed.'), findsOneWidget);
      expect(
        find.text('Push notifications are enabled on this device.'),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    '320px and large text keep controls reachable without layout overflow',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(320, 820));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final repo = SettingsRepository();
      await show(tester, repo, scale: 2);
      await tapVisible(
        tester,
        find.text('Pause collection and message updates during quiet hours'),
      );
      await tester.scrollUntilVisible(
        find.text('Save quiet hours'),
        220,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.scrollUntilVisible(
        find.text('Enable on this device'),
        220,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );
}
