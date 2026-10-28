import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart' show RequiredProfileSetupGate;
import 'package:grookai_vault/screens/intake/intake_screens.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channels = [
    MethodChannel('com.llfbandit.app_links/messages'),
    MethodChannel('com.llfbandit.app_links/events'),
  ];
  setUpAll(() async {
    for (final channel in channels) {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (_) async => null);
    }
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'fixture-public',
      authOptions: const FlutterAuthClientOptions(autoRefreshToken: false),
      httpClient: MockClient((request) async {
        if (request.url.path == '/auth/v1/token') {
          return http.Response(
            jsonEncode({
              'access_token': 'fixture-token',
              'refresh_token': 'fixture-refresh',
              'expires_in': 3600,
              'token_type': 'bearer',
              'user': {
                'id': 'owner',
                'aud': 'authenticated',
                'email': 'fixture@example.test',
                'created_at': '2026-10-28T00:00:00Z',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        throw http.ClientException('private-host.example is offline');
      }),
    );
    await Supabase.instance.client.auth.signInWithPassword(
      email: 'fixture@example.test',
      password: 'fixture',
    );
  });
  tearDownAll(() async {
    await Supabase.instance.dispose();
    for (final channel in channels) {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    }
  });
  testWidgets(
    'offline profile failure retains an owner-local draft recovery route',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: RequiredProfileSetupGate(
            child: Scaffold(body: Text('App shell')),
          ),
        ),
      );
      await tester.pumpAndSettle();
      for (
        var attempt = 0;
        attempt < 12 && find.text('Open saved drafts').evaluate().isEmpty;
        attempt++
      ) {
        await tester.pump(const Duration(seconds: 1));
      }
      expect(find.text('Unable to load profile setup.'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
      await tester.tap(find.text('Open saved drafts'));
      await tester.pump();
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 100)),
      );
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(IntakeHomeScreen), findsOneWidget);
      expect(find.text('Batch intake'), findsOneWidget);
      expect(find.textContaining('private-host.example'), findsNothing);
      expect(Supabase.instance.client.auth.currentUser?.id, 'owner');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
