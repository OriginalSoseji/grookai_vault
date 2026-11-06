import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/services/notifications/notification_permission_policy.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test(
    'declining stays declined across service and application restart',
    () async {
      var prompts = 0;
      NotificationPermissionPolicy policy() => NotificationPermissionPolicy(
        readAuthorization: () async => AuthorizationStatus.denied,
        requestAuthorization: () async {
          prompts++;
          return AuthorizationStatus.denied;
        },
      );
      expect(await policy().ensureCanNotify(), false);
      expect(await policy().ensureCanNotify(), false);
      expect(prompts, 1);
    },
  );

  test(
    'concurrent authentication callbacks share one pending decision',
    () async {
      final requested = Completer<void>();
      final decision = Completer<AuthorizationStatus>();
      var prompts = 0;
      final policy = NotificationPermissionPolicy(
        readAuthorization: () async => AuthorizationStatus.notDetermined,
        requestAuthorization: () {
          prompts++;
          requested.complete();
          return decision.future;
        },
      );
      final first = policy.ensureCanNotify();
      final second = policy.ensureCanNotify();
      await requested.future;
      expect(prompts, 1);
      decision.complete(AuthorizationStatus.authorized);
      expect(await Future.wait([first, second]), [true, true]);
    },
  );

  test(
    'existing grant can register, then respects a later system refusal',
    () async {
      var status = AuthorizationStatus.authorized;
      var prompts = 0;
      final policy = NotificationPermissionPolicy(
        readAuthorization: () async => status,
        requestAuthorization: () async {
          prompts++;
          return AuthorizationStatus.authorized;
        },
      );
      expect(await policy.ensureCanNotify(), true);
      status = AuthorizationStatus.denied;
      expect(await policy.ensureCanNotify(), false);
      expect(prompts, 0);
    },
  );

  test('unavailable local storage cannot cause repeated OS prompts', () async {
    var prompts = 0;
    final policy = NotificationPermissionPolicy(
      readAuthorization: () async => AuthorizationStatus.notDetermined,
      requestAuthorization: () async {
        prompts++;
        return AuthorizationStatus.authorized;
      },
      loadPreferences: () async => throw StateError('storage unavailable'),
    );
    expect(await policy.ensureCanNotify(), false);
    expect(await policy.ensureCanNotify(), false);
    expect(prompts, 0);
  });
}
