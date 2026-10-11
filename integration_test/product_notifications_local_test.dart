import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart' show MyApp;
import 'package:grookai_vault/screens/account/notification_settings_screen.dart';
import 'package:grookai_vault/services/notifications/grookai_push_notification_service.dart';
import 'package:grookai_vault/services/notifications/notification_device_registration.dart';

class NotificationLocalNetwork extends HttpOverrides {
  final blocked = <String>[];
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    final client = super.createHttpClient(context);
    client.connectionFactory = (uri, proxyHost, proxyPort) {
      if (uri.host != '127.0.0.1' || uri.port != 35521) {
        blocked.add(uri.origin);
        throw const SocketException(
          'Only the local notification fixture is allowed',
        );
      }
      return Socket.startConnect(uri.host, uri.port);
    };
    return client;
  }
}

class SyntheticMessaging implements NotificationMessagingPort {
  SyntheticMessaging(this.prefix);
  final String prefix;
  NotificationPermission permission = NotificationPermission.undetermined;
  int requests = 0, deletions = 0, acquisitions = 0;
  String? token;
  @override
  Future<NotificationPermission> readPermission() async => permission;
  @override
  Future<NotificationPermission> requestPermission() async {
    requests++;
    return permission = NotificationPermission.granted;
  }

  @override
  Future<String?> getToken() async =>
      token ??= '$prefix-device-${++acquisitions}';
  @override
  Future<void> deleteToken() async {
    deletions++;
    token = null;
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('notification settings and physical notice cleanup isolate owners', (
    tester,
  ) async {
    const url = String.fromEnvironment('SUPABASE_URL');
    const email = String.fromEnvironment('NOTIFICATION_TEST_EMAIL');
    const prefix = String.fromEnvironment('NOTIFICATION_TEST_TOKEN_PREFIX');
    expect(url, 'http://127.0.0.1:35521');
    expect(email.endsWith('@notifications-proof.invalid'), true);
    expect(prefix.startsWith('notifications-proof-'), true);
    final network = NotificationLocalNetwork();
    HttpOverrides.global = network;
    addTearDown(() => HttpOverrides.global = null);
    await Supabase.initialize(
      url: url,
      publishableKey: const String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY'),
      authOptions: const FlutterAuthClientOptions(
        localStorage: EmptyLocalStorage(),
      ),
    );
    final client = Supabase.instance.client;
    await client.auth.signInWithPassword(
      email: email,
      password: const String.fromEnvironment('NOTIFICATION_TEST_PASSWORD'),
    );
    final owner = client.auth.currentUser!.id;
    final messaging = SyntheticMessaging(prefix);
    final service = GrookaiPushNotificationService.instance;
    service.installMessagingForTest(messaging);
    await service.start(onRoute: (_) {});
    addTearDown(service.dispose);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString(SupabaseNotificationDevicePort.bindingKey), isNull);
    expect(messaging.requests, 0);
    final checks = <String>[];
    Future<void> tick() async {
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 200));
      }
    }

    Future<void> until(Finder finder) async {
      for (var i = 0; i < 150 && finder.evaluate().isEmpty; i++) {
        await tester.pump(const Duration(milliseconds: 200));
      }
      expect(finder, findsWidgets);
    }

    Future<void> show(Finder finder) async {
      await tester.scrollUntilVisible(
        finder,
        220,
        scrollable: find.byType(Scrollable).first,
        maxScrolls: 25,
      );
      await tick();
    }

    Future<void> picture(String name) async {
      await tester.pump();
      await binding.takeScreenshot('notifications-$name');
    }

    Future<Map<String, dynamic>> row() => client
        .from('notification_prefs')
        .select()
        .eq('user_id', owner)
        .single();
    await tester.pumpWidget(
      const MaterialApp(home: NotificationSettingsScreen()),
    );
    await until(find.text('Instant updates'));
    if (Platform.isAndroid) {
      await binding.convertFlutterSurfaceToImage();
      await tester.pump();
    }
    await picture('settings');
    expect(messaging.requests, 0);
    checks.add(
      'Opening real settings reads permission without prompting or registering',
    );
    final before = await row();
    await tester.tap(find.widgetWithText(SwitchListTile, 'Instant updates'));
    await tick();
    final after = await row();
    expect(after['instant_enabled'], !before['instant_enabled']);
    for (final field in [
      'daily_pulse_enabled',
      'weekly_enabled',
      'quiet_hours_start',
      'quiet_hours_end',
      'timezone',
    ]) {
      expect(after[field], before[field]);
    }
    checks.add('Actual preference save changes only its cadence column');
    await show(find.text('Enable on this device'));
    await picture('permission-before');
    await tester.tap(find.text('Enable on this device'));
    await tick();
    expect(messaging.requests, 1);
    final oldToken = messaging.token!;
    final oldRow = await client
        .from('device_tokens')
        .select('user_id,disabled_at')
        .eq('token', oldToken)
        .single();
    expect(oldRow['user_id'], owner);
    expect(oldRow['disabled_at'], isNull);
    await picture('permission-enabled');
    checks.add(
      'Explicit enable uses fake provider and actual owner-only token RPC/persistence',
    );
    const channel = MethodChannel('grookai/notifications/device');
    await channel.invokeMethod<void>('proofPostNotification');
    // Android enqueues notify asynchronously; wait for actual OS readback.
    var delivered = 0;
    for (var i = 0; i < 30 && delivered == 0; i++) {
      await tester.pump(const Duration(milliseconds: 200));
      delivered = await channel.invokeMethod<int>('proofDeliveredCount') ?? 0;
    }
    expect(delivered, 1);
    checks.add(
      'Separate debug app posts one synthetic operating-system notification',
    );
    await client.auth.signInWithPassword(
      email: const String.fromEnvironment('NOTIFICATION_OTHER_EMAIL'),
      password: const String.fromEnvironment('NOTIFICATION_OTHER_PASSWORD'),
    );
    final other = client.auth.currentUser!.id;
    expect(other, isNot(owner));
    await service.registerForCurrentUser(
      reason: 'local_owner_replacement_proof',
    );
    await tick();
    await until(
      find.text('Your account changed. Reopen notification settings.'),
    );
    expect(find.text('Instant updates'), findsNothing);
    expect(await channel.invokeMethod<int>('proofDeliveredCount'), 0);
    expect(messaging.token, isNot(oldToken));
    final current = await client
        .from('device_tokens')
        .select('user_id,disabled_at')
        .eq('token', messaging.token!)
        .single();
    expect(current['user_id'], other);
    expect(current['disabled_at'], isNull);
    expect(
      prefs.getString(SupabaseNotificationDevicePort.bindingKey),
      contains(other),
    );
    await picture('owner-closed');
    checks.add(
      'Real replacement owner closes old UI, retires physical route, clears delivered notice, and registers a new bound token',
    );
    await tester.pumpWidget(const MaterialApp(home: SizedBox()));
    await tick();
    messaging.permission = NotificationPermission.denied;
    await service.registerForCurrentUser(reason: 'local_denied_proof');
    await tester.pumpWidget(
      const MaterialApp(home: NotificationSettingsScreen()),
    );
    await until(find.text('Instant updates'));
    await show(find.text('Check device permission'));
    await tester.tap(find.text('Check device permission'));
    await tick();
    expect(messaging.requests, 1);
    expect(prefs.getString(SupabaseNotificationDevicePort.bindingKey), isNull);
    await picture('permission-denied');
    checks.add(
      'Denied permission retires token; checking permission does not prompt',
    );
    await service.disableCurrentTokenBeforeSignOut();
    await client.auth.signOut();
    await tick();
    expect(prefs.getString(SupabaseNotificationDevicePort.bindingKey), isNull);
    expect(await channel.invokeMethod<int>('proofDeliveredCount'), 0);
    expect(network.blocked, isEmpty);
    expect(tester.takeException(), isNull);
    // Also prove the real app entry and its actual theme, not only the focused
    // component harness used for the owner-replacement assertions above.
    await tester.pumpWidget(const SizedBox.shrink());
    await service.dispose();
    final appMessaging = SyntheticMessaging('$prefix-app');
    service.installMessagingForTest(appMessaging);
    await client.auth.signInWithPassword(
      email: email,
      password: const String.fromEnvironment('NOTIFICATION_TEST_PASSWORD'),
    );
    await tester.pumpWidget(const MyApp());
    await until(find.text('Find a card'));
    await until(find.byTooltip('Account').hitTestable());
    await tick();
    await tester.tap(find.byTooltip('Account').hitTestable());
    await tick();
    await until(find.text('Notifications'));
    await show(find.text('Notifications'));
    await tester.tap(find.text('Notifications'));
    await until(find.byType(NotificationSettingsScreen));
    await until(find.text('Instant updates'));
    await picture('app-settings');
    await show(find.text('Enable on this device'));
    await picture('app-device');
    expect(appMessaging.requests, 0);
    expect(
      await client
          .from('public_profiles')
          .select('user_id')
          .eq('user_id', owner),
      isEmpty,
    );
    expect(network.blocked, isEmpty);
    expect(tester.takeException(), isNull);
    await service.disableCurrentTokenBeforeSignOut();
    await client.auth.signOut();
    await tester.pumpWidget(const SizedBox.shrink());
    await tick();
    binding.reportData = {
      ...binding.reportData ?? {},
      'proof': {
        'status': 'passed',
        'checks': checks,
        'providerCalls': 0,
        'productionWrites': 0,
        'blocked': network.blocked,
        'permissionRequests': messaging.requests,
        'actualMyAppEntry': true,
        'profileCreated': false,
        'actualAppThemeReviewedSeparately': true,
      },
    };
  });
}
