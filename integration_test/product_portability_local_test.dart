import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart' show MyApp;
import 'package:grookai_vault/screens/account/import_collection_screen.dart';
import 'package:grookai_vault/screens/account/import_collection_history_screen.dart';
import 'package:grookai_vault/services/notifications/grookai_push_notification_service.dart';
import 'package:grookai_vault/services/notifications/notification_device_registration.dart';

class LocalNetwork extends HttpOverrides {
  final blocked = <String>[];
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    final client = super.createHttpClient(context);
    client.connectionFactory = (uri, proxyHost, proxyPort) {
      if (uri.host != '127.0.0.1' || uri.port != 35841) {
        blocked.add(uri.origin);
        throw const SocketException('Only local portability fixture allowed');
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

// Injects only file selection. CSV parsing, matching, writes, Auth and reads are real.
class SourcePicker extends FilePicker {
  @override
  Future<FilePickerResult?> pickFiles({
    String? dialogTitle,
    String? initialDirectory,
    FileType type = FileType.any,
    List<String>? allowedExtensions,
    Function(FilePickerStatus)? onFileLoading,
    bool allowCompression = true,
    int compressionQuality = 30,
    bool allowMultiple = false,
    bool withData = false,
    bool withReadStream = false,
    bool lockParentWindow = false,
    bool readSequential = false,
  }) async {
    final bytes = Uint8List.fromList(
      base64Decode(const String.fromEnvironment('PORTABILITY_CSV_BASE64')),
    );
    return FilePickerResult([
      PlatformFile(
        name: 'synthetic-portability.csv',
        size: bytes.length,
        bytes: bytes,
      ),
    ]);
  }
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('physical saved import retains source and isolates owners', (
    tester,
  ) async {
    const url = String.fromEnvironment('SUPABASE_URL');
    const email = String.fromEnvironment('PORTABILITY_TEST_EMAIL');
    const source = String.fromEnvironment('PORTABILITY_SOURCE_SHA');
    expect(url, 'http://127.0.0.1:35841');
    expect(email.endsWith('@portability-proof.invalid'), true);
    final network = LocalNetwork();
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
      password: const String.fromEnvironment('PORTABILITY_TEST_PASSWORD'),
    );
    final owner = client.auth.currentUser!.id;
    final service = GrookaiPushNotificationService.instance;
    service.installMessagingForTest(DeniedMessaging());
    addTearDown(service.dispose);
    FilePicker.platform = SourcePicker();
    final checks = <String>[];
    Future<void> tick() async {
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 200));
      }
    }

    Future<void> until(Finder finder) async {
      for (var i = 0; i < 200 && finder.evaluate().isEmpty; i++) {
        await tester.pump(const Duration(milliseconds: 200));
      }
      expect(finder, findsWidgets);
    }

    Future<void> show(Finder finder) async {
      await tester.scrollUntilVisible(
        finder,
        220,
        scrollable: find.byType(Scrollable).first,
        maxScrolls: 40,
        duration: const Duration(milliseconds: 200),
      );
      await tick();
    }

    Future<void> picture(String name) async {
      await tester.pump();
      await binding.takeScreenshot('portability-$name');
    }

    Future<List<Map<String, dynamic>>> copies() async => await client
        .from('vault_item_instances')
        .select('id,card_printing_id,acquisition_cost,condition_label')
        .eq('user_id', owner)
        .order('id');
    final retained = await copies();
    expect(
      retained.length,
      3,
    ); // Retain the prior successful initial-import proof.

    await tester.pumpWidget(const MyApp());
    await until(find.text('Find a card'));
    await until(find.byTooltip('Account').hitTestable());
    await tester.tap(find.byTooltip('Account').hitTestable());
    await tick();
    await show(find.text('Import Collection'));
    await tester.tap(find.text('Import Collection'));
    await until(find.byType(ImportCollectionScreen));
    await until(find.text('Choose CSV'));
    if (Platform.isAndroid) {
      await binding.convertFlutterSurfaceToImage();
      await tester.pump();
    }
    await picture('app-import');
    checks.add('Actual MyApp Account reaches importer without public profile');
    await tester.tap(find.text('Choose CSV'));
    await tick();
    await show(find.text('Import to Vault'));
    await picture('preview');
    final http = HttpClient();
    final arm = await http.postUrl(
      Uri.parse('$url/__test/drop-next-import-response'),
    );
    arm.headers.set(
      'authorization',
      'Bearer ${client.auth.currentSession!.accessToken}',
    );
    expect((await arm.close()).statusCode, 200);
    http.close();
    await tester.tap(find.text('Import to Vault'));
    await until(find.text('Retry import'));
    final added = await copies();
    expect(added.length, 3);
    expect(added, retained);
    expect(
      added
          .where(
            (c) =>
                c['acquisition_cost'] == 4.25 && c['condition_label'] == 'NM',
          )
          .length,
      2,
    );
    expect(
      added
          .where(
            (c) => c['acquisition_cost'] == 9 && c['condition_label'] == 'LP',
          )
          .length,
      1,
    );
    await show(find.text('Retry import'));
    expect(find.text('Import not confirmed'), findsOneWidget);
    await picture('response-lost');
    await tester.tap(find.text('Retry import'));
    await until(find.text('Review saved import'));
    expect(await copies(), added);
    await show(find.text('Review saved import'));
    await picture('verified');
    checks.add(
      'Actual handler committed-response loss retries without duplicate copies or lost costs',
    );
    await tester.tap(find.text('Review saved import'));
    await until(find.text('Source reconciliation'));
    await tick();
    await picture('details');
    expect(
      find.text('4 source rows · 2 previously reconciled · 2 need review'),
      findsOneWidget,
    );
    await show(
      find.text('Source row 4 · Needs review; not added from this row'),
    );
    await tester.tap(
      find.text('Source row 4 · Needs review; not added from this row'),
    );
    await tick();
    await show(find.text('PSA 10'));
    await picture('grade');
    checks.add(
      'Verified receipt opens real saved source including unresolved grade',
    );
    await tester.pumpWidget(const SizedBox.shrink());
    await tick();
    String? captured;
    await tester.pumpWidget(
      MaterialApp(
        home: ImportCollectionHistoryScreen(
          client: client,
          sourceSha256: source,
          shareSource: (contents, filename, origin) async {
            captured = contents;
            expect(filename, startsWith('grookai-saved-import-'));
          },
        ),
      ),
    );
    await until(find.text('Source reconciliation'));
    await tester.tap(find.text('Download source and retry options'));
    await tick();
    await show(find.text('Save source JSON'));
    await tester.tap(find.text('Save source JSON'));
    await tick();
    final archive = jsonDecode(captured!) as Map<String, dynamic>;
    expect(archive['format'], 'grookai-saved-import-v1');
    expect(
      archive['sourceRows'],
      jsonDecode(
        utf8.decode(
          base64Decode(
            const String.fromEnvironment('PORTABILITY_SOURCE_ROWS_BASE64'),
          ),
        ),
      ),
    );
    expect(archive['reviewIndices'], [2, 3]);
    expect((archive['mappings'] as List).length, 2);
    await picture('source-options');
    checks.add(
      'Real source JSON preserves all fields; share adapter captured locally without sending',
    );
    await client.auth.signInWithPassword(
      email: const String.fromEnvironment('PORTABILITY_OTHER_EMAIL'),
      password: const String.fromEnvironment('PORTABILITY_OTHER_PASSWORD'),
    );
    await tick();
    await picture('owner-closed');
    expect(find.text('Source reconciliation'), findsNothing);
    expect(find.text('Save source JSON'), findsNothing);
    for (final table in [
      'vault_collection_import_documents_v2',
      'vault_collection_import_groups_v2',
    ]) {
      expect(
        await client
            .from(table)
            .select()
            .eq('user_id', owner)
            .eq('source_sha256', source),
        isEmpty,
      );
    }
    checks.add(
      'Actual replacement owner clears history and cannot read foreign source or mappings',
    );
    await tester.pumpWidget(const SizedBox.shrink());
    await tick();
    await tester.pumpWidget(
      MaterialApp(home: ImportCollectionHistoryScreen(client: client)),
    );
    await until(find.text('No saved imports yet.'));
    await picture('other-empty');
    expect(
      await client
          .from('public_profiles')
          .select('user_id')
          .eq('user_id', client.auth.currentUser!.id),
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
        'actualMyAppEntry': true,
        'existingCopyReimport': true,
        'syntheticFilePicker': true,
        'syntheticShareAdapter': true,
        'productionWrites': 0,
        'providerCalls': 0,
        'blocked': network.blocked,
      },
    };
  });
}
