import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart' show MyApp;
import 'package:grookai_vault/screens/account/inventory_export_screen.dart';
import 'package:grookai_vault/services/notifications/grookai_push_notification_service.dart';
import 'package:grookai_vault/services/notifications/notification_device_registration.dart';

class LocalNetwork extends HttpOverrides {
  final blocked = <String>[];
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    final client = super.createHttpClient(context);
    client.connectionFactory = (uri, proxyHost, proxyPort) {
      if (uri.host != '127.0.0.1' || uri.port != 35941) {
        blocked.add(uri.origin);
        throw const SocketException('Only local export fixture allowed');
      }
      return Socket.startConnect(uri.host, uri.port);
    };
    return client;
  }
}

class DeniedMessaging implements NotificationMessagingPort {
  @override
  Future<NotificationPermission> readPermission() async =>
      NotificationPermission.denied;
  @override
  Future<NotificationPermission> requestPermission() async =>
      throw StateError('No provider prompt allowed');
  @override
  Future<String?> getToken() async =>
      throw StateError('No provider token allowed');
  @override
  Future<void> deleteToken() async {}
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'physical current inventory and actual OS save',
    (tester) async {
      const url = String.fromEnvironment('SUPABASE_URL');
      const email = String.fromEnvironment('INVENTORY_TEST_EMAIL');
      expect(url, 'http://127.0.0.1:35941');
      expect(email.endsWith('@inventory-export.invalid'), true);
      final network = LocalNetwork();
      HttpOverrides.global = network;
      addTearDown(() => HttpOverrides.global = null);
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
      await client.auth.signInWithPassword(
        email: email,
        password: const String.fromEnvironment('INVENTORY_TEST_PASSWORD'),
      );
      final owner = client.auth.currentUser!.id;
      final service = GrookaiPushNotificationService.instance;
      service.installMessagingForTest(DeniedMessaging());
      addTearDown(service.dispose);
      final checks = <String>[];
      Future<void> tick() async {
        for (var i = 0; i < 10; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
      }

      Future<void> until(Finder finder, {int attempts = 200}) async {
        for (var i = 0; i < attempts && finder.evaluate().isEmpty; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
        expect(finder, findsWidgets);
      }

      Future<void> show(Finder finder) async {
        await tester.scrollUntilVisible(
          finder,
          180,
          scrollable: find.byType(Scrollable).first,
          maxScrolls: 40,
          duration: const Duration(milliseconds: 200),
        );
        await tick();
      }

      Future<void> picture(String name) async {
        await tester.pump();
        final bytes = await binding.takeScreenshot('inventory-$name');
        await File(
          '${Directory.systemTemp.path}/inventory-proof-$name.png',
        ).writeAsBytes(bytes, flush: true);
      }

      final before = await client
          .from('vault_item_instances')
          .select('id,notes,updated_at')
          .eq('user_id', owner)
          .order('id');
      expect(
        before.length,
        4,
      ); // The direct owner projection excludes archived rows.
      await tester.pumpWidget(const MyApp());
      await until(find.text('Find a card'));
      await until(find.byTooltip('Account').hitTestable());
      await tester.tap(find.byTooltip('Account').hitTestable());
      await tick();
      await show(find.text('Export Inventory'));
      await tester.tap(find.text('Export Inventory'));
      await until(find.byType(InventoryExportScreen));
      if (Platform.isAndroid) {
        await binding.convertFlutterSurfaceToImage();
        await tester.pump();
      }
      await picture('app-entry');
      expect(find.text('Save JSON'), findsNothing);
      await show(find.text('Prepare export'));
      await tester.tap(find.text('Prepare export'));
      await until(find.text('4 copies ready'));
      expect(find.text('Cards: 2 · Slabs: 1 · Sealed: 1'), findsOneWidget);
      await picture('ready');
      checks.add(
        'Actual MyApp Account opens all four active copies without public profile',
      );
      // No picker/saver replacement: the host completes the real Android Documents dialog.
      await show(find.text('Save JSON'));
      await tester.tap(find.text('Save JSON'));
      await until(find.text('Inventory file saved.'), attempts: 1500);
      await picture('json-saved');
      await show(find.text('Save CSV'));
      await tester.tap(find.text('Save CSV'));
      await until(find.text('Inventory file saved.'), attempts: 1500);
      await picture('csv-saved');
      checks.add(
        'Unmodified file_picker completes both actual Android save dialogs',
      );
      final after = await client
          .from('vault_item_instances')
          .select('id,notes,updated_at')
          .eq('user_id', owner)
          .order('id');
      expect(after, before);
      checks.add(
        'Saving leaves every original instance, note and update timestamp unchanged',
      );
      // Diagnostic host preserves the export route while real Auth changes underneath it.
      await tester.pumpWidget(const MaterialApp(home: InventoryExportScreen()));
      await tick();
      await tester.tap(find.text('Prepare export'));
      await until(find.text('4 copies ready'));
      await client.auth.signOut(scope: SignOutScope.local);
      await tick();
      await until(
        find.text(
          'Your account changed. Return to Account and reopen inventory export.',
        ),
      );
      expect(find.text('Save JSON'), findsNothing);
      await picture('owner-closed');
      await client.auth.signInWithPassword(
        email: const String.fromEnvironment('INVENTORY_OTHER_EMAIL'),
        password: const String.fromEnvironment('INVENTORY_OTHER_PASSWORD'),
      );
      await tester.pumpWidget(
        const MaterialApp(home: InventoryExportScreen(key: ValueKey('other'))),
      );
      await tick();
      await tester.tap(find.text('Prepare export'));
      await until(find.text('Your active inventory is empty'));
      await picture('other-empty');
      checks.add(
        'Actual Auth replacement removes old private content and reads an independent empty inventory',
      );
      expect(network.blocked, isEmpty);
      expect(tester.takeException(), isNull);
      binding.reportData = {
        ...binding.reportData ?? {},
        'proof': {
          'status': 'passed',
          'checks': checks,
          'ownerId': owner,
          'actualMyAppEntry': true,
          'actualOsSave': true,
          'blocked': network.blocked,
          'providerCalls': 0,
          'productionWrites': 0,
        },
      };
    },
    timeout: const Timeout(Duration(minutes: 15)),
  );
}
