import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:grookai_vault/services/notifications/grookai_push_notification_service.dart';
import 'package:grookai_vault/services/notifications/notification_device_registration.dart';
import 'package:grookai_vault/services/notifications/notification_device_platform.dart';
import 'package:grookai_vault/services/notifications/notification_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class FakeMessaging implements NotificationMessagingPort {
  bool failDelete = false;
  int deletes = 0;
  @override
  Future<NotificationPermission> readPermission() async =>
      NotificationPermission.granted;
  @override
  Future<NotificationPermission> requestPermission() async =>
      NotificationPermission.granted;
  @override
  Future<String?> getToken() async => 'synthetic-token';
  @override
  Future<void> deleteToken() async {
    deletes++;
    if (failDelete) throw StateError('provider unavailable');
  }
}

Future<void> signIn(SupabaseClient client, String owner) =>
    client.auth.setInitialSession(
      jsonEncode(
        Session(
          accessToken: 'unit-session-$owner',
          tokenType: 'bearer',
          user: User(
            id: owner,
            appMetadata: const {},
            userMetadata: const {},
            aud: 'authenticated',
            createdAt: '2026-10-08T00:00:00Z',
          ),
        ).toJson(),
      ),
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({'unrelated': 'keep'}));

  SupabaseClient client(
    List<http.Request> requests, {
    http.Response Function(http.Request)? response,
  }) {
    final value = SupabaseClient(
      'http://127.0.0.1:39999',
      'unit-anon',
      httpClient: MockClient((request) async {
        requests.add(request);
        final reply =
            response?.call(request) ??
            http.Response(
              'null',
              200,
              headers: {'content-type': 'application/json'},
            );
        return http.Response(
          reply.body,
          reply.statusCode,
          headers: reply.headers,
          request: request,
        );
      }),
    );
    addTearDown(value.dispose);
    return value;
  }

  SupabaseNotificationDevicePort device(SupabaseClient client) =>
      SupabaseNotificationDevicePort(
        client: client,
        messaging: FakeMessaging(),
        platform: 'android',
      );

  test(
    'registration and disable explicitly send the captured owner authorization',
    () async {
      final requests = <http.Request>[];
      final sb = client(requests);
      await signIn(sb, 'owner-a');
      final port = device(sb);
      final pending = port.registerToken('owner-a', 'synthetic-token-a');
      await signIn(sb, 'owner-b');
      await pending;
      expect(sb.auth.currentUser!.id, 'owner-b');
      expect(
        requests.single.headers['authorization'],
        'Bearer unit-session-owner-a',
      );
      expect(jsonDecode(requests.single.body), {
        'p_token': 'synthetic-token-a',
        'p_platform': 'android',
        'p_app_build': null,
        'p_device_label': null,
      });
      await port.disableToken('owner-b', 'synthetic-token-b');
      expect(
        requests.last.headers['authorization'],
        'Bearer unit-session-owner-b',
      );
      expect(
        requests.last.url.path,
        '/rest/v1/rpc/notification_disable_device_token_v1',
      );
    },
  );
  test(
    'a stale requested owner is rejected before the SDK sends a request',
    () async {
      final requests = <http.Request>[];
      final sb = client(requests);
      await signIn(sb, 'owner-b');
      final port = device(sb);
      await expectLater(
        port.registerToken('owner-a', 'synthetic-token-a'),
        throwsA(isA<AuthException>()),
      );
      await expectLater(
        port.disableToken('owner-a', 'synthetic-token-a'),
        throwsA(isA<AuthException>()),
      );
      expect(requests, isEmpty);
    },
  );
  test('device ownership persistence clears only its own key', () async {
    final sb = client([]);
    final port = device(sb);
    await port.writeBinding(
      const NotificationDeviceBinding('owner-a', 'synthetic-token-a'),
    );
    final saved = await port.readBinding();
    expect(saved!.ownerId, 'owner-a');
    expect(saved.token, 'synthetic-token-a');
    await port.writeBinding(null);
    expect(await port.readBinding(), isNull);
    expect(
      (await SharedPreferences.getInstance()).getString('unrelated'),
      'keep',
    );
  });
  test(
    'corrupt stored ownership is not mistaken for an absent binding',
    () async {
      SharedPreferences.setMockInitialValues({
        SupabaseNotificationDevicePort.bindingKey: '{broken',
      });
      final sb = client([]);
      await expectLater(device(sb).readBinding(), throwsFormatException);
    },
  );
  Map<String, dynamic> stored() => {
    'instant_enabled': true,
    'daily_pulse_enabled': false,
    'weekly_enabled': false,
    'quiet_hours_start': '22:00:00',
    'quiet_hours_end': '08:00:00',
    'timezone': 'Legacy/Zone',
  };
  test(
    'one cadence upsert sends no unrelated columns and preserves the returned choices',
    () async {
      final requests = <http.Request>[];
      final row = stored();
      final sb = client(
        requests,
        response: (request) {
          expect(request.method, 'POST');
          final patch = jsonDecode(request.body) as Map<String, dynamic>;
          expect(patch, {'user_id': 'owner-a', 'instant_enabled': false});
          row.addAll({...patch}..remove('user_id'));
          return http.Response(
            jsonEncode(row),
            200,
            headers: {'content-type': 'application/json'},
          );
        },
      );
      await signIn(sb, 'owner-a');
      final repo = SupabaseNotificationPreferencesRepository(
        client: sb,
        ownerId: 'owner-a',
        timezones: {'UTC'},
      );
      final saved = await repo.saveCadence(NotificationCadence.instant, false);
      expect([saved.instant, saved.daily, saved.weekly], [false, false, false]);
      expect(saved.quietStart, '22:00:00');
      expect(saved.quietEnd, '08:00:00');
      expect(saved.timezone, 'Legacy/Zone');
      expect(requests.single.headers['prefer'], contains('missing=default'));
    },
  );
  test(
    'disabling quiet hours clears the pair without overwriting the saved timezone or cadences',
    () async {
      final requests = <http.Request>[];
      final row = stored();
      final sb = client(
        requests,
        response: (request) {
          final patch = jsonDecode(request.body) as Map<String, dynamic>;
          expect(patch, {
            'user_id': 'owner-a',
            'quiet_hours_start': null,
            'quiet_hours_end': null,
          });
          row.addAll({...patch}..remove('user_id'));
          return http.Response(
            jsonEncode(row),
            200,
            headers: {'content-type': 'application/json'},
          );
        },
      );
      await signIn(sb, 'owner-a');
      final repo = SupabaseNotificationPreferencesRepository(
        client: sb,
        ownerId: 'owner-a',
        timezones: {'UTC'},
      );
      final saved = await repo.disableQuietHours();
      expect(saved.quietStart, isNull);
      expect(saved.quietEnd, isNull);
      expect(saved.timezone, 'Legacy/Zone');
      expect(saved.daily, false);
    },
  );
  test(
    'invalid quiet hours and unsupported new timezones cannot reach the network',
    () async {
      final requests = <http.Request>[];
      final sb = client(requests);
      await signIn(sb, 'owner-a');
      final repo = SupabaseNotificationPreferencesRepository(
        client: sb,
        ownerId: 'owner-a',
        timezones: {'UTC'},
      );
      for (final args in [
        ('22:00', '22:00', 'UTC'),
        ('25:00', '08:00', 'UTC'),
        ('22:00', '08:00', 'America/Coyhaique'),
      ]) {
        expect(
          () => repo.saveQuietHours(
            start: args.$1,
            end: args.$2,
            timezone: args.$3,
          ),
          throwsArgumentError,
        );
      }
      expect(requests, isEmpty);
    },
  );
  test(
    'a failed preference read is not converted into default enabled preferences',
    () async {
      final requests = <http.Request>[];
      final sb = client(
        requests,
        response: (_) => http.Response(
          '{"message":"read unavailable"}',
          503,
          headers: {'content-type': 'application/json'},
        ),
      );
      await signIn(sb, 'owner-a');
      final repo = SupabaseNotificationPreferencesRepository(
        client: sb,
        ownerId: 'owner-a',
        timezones: {'UTC'},
      );
      await expectLater(repo.load(), throwsA(isA<PostgrestException>()));
      expect(requests.every((request) => request.method == 'GET'), true);
    },
  );
  for (final providerFails in [false, true]) {
    test(
      'delivered notices are cleared when provider retirement ${providerFails ? 'fails' : 'succeeds'}',
      () async {
        debugDefaultTargetPlatformOverride = TargetPlatform.android;
        addTearDown(() => debugDefaultTargetPlatformOverride = null);
        var clears = 0;
        final messenger =
            TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
        messenger.setMockMethodCallHandler(NotificationDevicePlatform.channel, (
          call,
        ) async {
          expect(call.method, 'clearDelivered');
          clears++;
          return null;
        });
        addTearDown(
          () => messenger.setMockMethodCallHandler(
            NotificationDevicePlatform.channel,
            null,
          ),
        );
        final fake = FakeMessaging()..failDelete = providerFails;
        final port = SupabaseNotificationDevicePort(
          client: client([]),
          messaging: fake,
          platform: 'android',
        );
        if (providerFails) {
          await expectLater(port.deleteToken(), throwsStateError);
        } else {
          await port.deleteToken();
        }
        expect(fake.deletes, 1);
        expect(clears, 1);
      },
    );
  }
  test(
    'failed delivered-notice cleanup blocks registration for a replacement account',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      messenger.setMockMethodCallHandler(NotificationDevicePlatform.channel, (
        _,
      ) async {
        throw PlatformException(code: 'cleanup_failed');
      });
      addTearDown(
        () => messenger.setMockMethodCallHandler(
          NotificationDevicePlatform.channel,
          null,
        ),
      );
      final requests = <http.Request>[];
      final sb = client(requests);
      await signIn(sb, 'owner-b');
      final port = device(sb);
      await port.writeBinding(
        const NotificationDeviceBinding('owner-a', 'synthetic-token-a'),
      );
      expect(
        await NotificationDeviceRegistration(port).synchronize(),
        NotificationDeviceOutcome.failed,
      );
      expect(requests, isEmpty);
      expect((await port.readBinding())!.ownerId, 'owner-a');
    },
  );
}
