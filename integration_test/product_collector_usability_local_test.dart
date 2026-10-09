import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart' show MyApp, AppShell;
import 'package:grookai_vault/screens/binders/binder_detail_screen.dart';
import 'package:grookai_vault/screens/binders/binder_library_screen.dart';

class LocalCollectorNetwork extends HttpOverrides {
  final blocked = <String>[];
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    final client = super.createHttpClient(context);
    client.connectionFactory = (uri, proxyHost, proxyPort) {
      if (uri.host != '127.0.0.1' || uri.port != 35521) {
        blocked.add(uri.origin);
        throw SocketException(
          'Collector acceptance allows its local fixture only',
        );
      }
      return Socket.startConnect(uri.host, uri.port);
    };
    return client;
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'full collector app preserves private first session and retained destinations',
    (tester) async {
      const url = String.fromEnvironment('SUPABASE_URL');
      const email = String.fromEnvironment('COLLECTOR_TEST_EMAIL');
      expect(url, 'http://127.0.0.1:35521');
      expect(email.endsWith('@collector-home.invalid'), true);
      final network = LocalCollectorNetwork();
      HttpOverrides.global = network;
      addTearDown(() => HttpOverrides.global = null);
      // Exercise actual MyApp without registering this synthetic account with an external push provider.
      binding.defaultBinaryMessenger.setMockMessageHandler(
        'dev.flutter.pigeon.firebase_core_platform_interface.FirebaseCoreHostApi.initializeCore',
        (_) async => const StandardMessageCodec().encodeMessage(<Object?>[
          'local_acceptance',
          'External push disabled for isolated fixture',
          null,
        ]),
      );
      await Supabase.initialize(
        url: url,
        publishableKey: const String.fromEnvironment(
          'SUPABASE_PUBLISHABLE_KEY',
        ),
        authOptions: const FlutterAuthClientOptions(
          localStorage: EmptyLocalStorage(),
        ),
      );
      final client = Supabase.instance.client;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('scanner_state_notice_dismissed_v1', true);
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('COLLECTOR_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id;
      expect(
        await client
            .from('public_profiles')
            .select('user_id')
            .eq('user_id', owner),
        isEmpty,
      );
      await tester.pumpWidget(const MyApp());
      Future<void> until(Finder finder) async {
        for (var i = 0; i < 160 && finder.evaluate().isEmpty; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
        expect(finder, findsWidgets);
      }

      Future<void> tick() async {
        for (var i = 0; i < 10; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
      }

      Future<void> tap(Finder finder) async {
        await Scrollable.ensureVisible(tester.element(finder), alignment: 0.5);
        await tick();
        expect(finder.hitTestable(), findsWidgets);
        await tester.tap(finder);
        await tick();
      }

      Future<void> picture(String name) async {
        await tester.pump();
        await binding.takeScreenshot('collector-usability-$name');
      }

      await until(find.text('Find a card'));
      expect(find.byType(AppShell), findsOneWidget);
      await until(find.text('Another collection goal'));
      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pump();
      }
      expect(find.text('Weekend collection goal'), findsNothing);
      await picture('vault');
      await tap(find.text('Show 2 more goals'));
      expect(find.text('Weekend collection goal'), findsOneWidget);
      await picture('expanded-goals');
      await tap(find.text('Show fewer goals'));
      expect(find.text('Weekend collection goal'), findsNothing);
      await tap(find.text('Another collection goal'));
      await until(find.byType(BinderDetailScreen));
      expect(
        tester
            .widget<BinderDetailScreen>(find.byType(BinderDetailScreen))
            .publicId,
        const String.fromEnvironment('COLLECTOR_TEST_GOAL'),
      );
      await picture('goal-resumed');
      await binding.handlePopRoute();
      await tick();
      await tap(find.text('Binders').last);
      await until(find.byType(BinderLibraryScreen));
      await picture('binders');
      await tap(find.text('Explore').last);
      await tick();
      await tap(find.text('Scan').last);
      await tick();
      await picture('scan');
      await binding.handlePopRoute();
      await tick();
      expect(find.text('Explore'), findsWidgets);
      await tap(find.text('Community').last);
      await until(find.text('My Wall'));
      await picture('community');
      await tap(find.text('Vault').last);
      await until(find.text('Another collection goal'));
      await tap(find.text('Another collection goal'));
      await until(find.byType(BinderDetailScreen));
      // Direct account replacement must dispose retained screens and the pushed private detail.
      await client.auth.signInWithPassword(
        email: const String.fromEnvironment('COLLECTOR_EMPTY_EMAIL'),
        password: const String.fromEnvironment('COLLECTOR_EMPTY_PASSWORD'),
      );
      await tick();
      await until(
        find.text('Build a Binder for the cards you want to collect.'),
      );
      expect(find.byType(BinderDetailScreen), findsNothing);
      expect(find.text('Another collection goal'), findsNothing);
      expect(find.text('Find a card'), findsWidgets);
      expect(find.text('Recently Added'), findsNothing);
      await picture('empty-new-owner');
      expect(
        await client
            .from('public_profiles')
            .select('user_id')
            .eq('user_id', client.auth.currentUser!.id),
        isEmpty,
      );
      binding.reportData = {
        ...?binding.reportData,
        'status': 'passed',
        'actualMyApp': true,
        'actualAuth': true,
        'profileCreated': false,
        'ownerReplaced': true,
        'goalsExpandedAndCollapsed': true,
        'emptyRecentlyAddedRemoved': true,
        'blockedExternalOrigins': network.blocked.toSet().toList(),
        'screens': 7,
      };
      await tester.pumpWidget(const SizedBox.shrink());
      await tick();
    },
  );
}
