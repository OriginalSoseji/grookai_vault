import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/secrets.dart';
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'Android native import recovers a lost response without duplicate copies',
    (tester) async {
      final uri = Uri.parse(supabaseUrl);
      expect(['10.0.2.2', '127.0.0.1'].contains(uri.host), isTrue);
      expect(uri.scheme, 'http');
      expect(uri.port, 57550);
      const email = String.fromEnvironment('GV_IMPORT_TEST_EMAIL');
      const password = String.fromEnvironment('GV_IMPORT_TEST_PASSWORD');
      expect(email.endsWith('@native-emulator.invalid'), isTrue);
      expect(password, isNotEmpty);
      final client = SupabaseClient(
        supabaseUrl,
        supabasePublishableKey,
        authOptions: const AuthClientOptions(autoRefreshToken: false),
      );
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Center(child: Text('Testing native import recovery')),
          ),
        ),
      );
      try {
        await client.auth.signInWithPassword(email: email, password: password);
        const ids = [
          String.fromEnvironment('GV_IMPORT_TEST_CARD_A'),
          String.fromEnvironment('GV_IMPORT_TEST_CARD_B'),
        ];
        final before = await VaultCardService.getOwnedCountsIncludingSlabs(
          client: client,
          cardPrintIds: ids,
        );
        expect(
          before,
          isEmpty,
          reason:
              'Use the fresh synthetic account only; do not replay a consumed acceptance',
        );
        const csv =
            'Product Name,Set,Card Number,Quantity,Card Condition,Average Cost,Notes\nNative Test Card 1,Native Import Test Set,1,3,LP,4.25,Emulator fixture\nNative Test Card 2,Native Import Test Set,2,2,NM,2.50,Emulator fixture\n';
        final preview = await CollectionImportService.buildPreview(
          client: client,
          csvText: csv,
        );
        expect(preview.summary.matchedRows, 2);
        expect(preview.summary.unmatchedRows, 0);
        final http = HttpClient();
        try {
          final request = await http.postUrl(
            uri.resolve('/__test/drop-next-import-response'),
          );
          final response = await request.close();
          expect(response.statusCode, 200);
          await response.drain<void>();
        } finally {
          http.close();
        }
        await expectLater(
          CollectionImportService.importPreview(
            client: client,
            preview: preview,
          ),
          throwsA(isA<CollectionImportFailure>()),
        );
        final saved = await VaultCardService.getOwnedCountsIncludingSlabs(
          client: client,
          cardPrintIds: ids,
        );
        expect(saved, {ids[0]: 3, ids[1]: 2});
        final retried = await CollectionImportService.importPreview(
          client: client,
          preview: preview,
        );
        expect(retried.importedCards, 0);
        expect(retried.importedEntries, 0);
        expect(
          await VaultCardService.getOwnedCountsIncludingSlabs(
            client: client,
            cardPrintIds: ids,
          ),
          saved,
        );
        final refreshed = await CollectionImportService.buildPreview(
          client: client,
          csvText: csv,
        );
        expect(refreshed.rows, isEmpty);
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: Center(
                child: Text('Native import verified: 5 copies, retry added 0'),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        debugPrint('NATIVE_IMPORT_EMULATOR_VERIFIED copies=5 retryAdded=0');
      } finally {
        await client.dispose();
      }
    },
  );
}
