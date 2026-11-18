import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart' show buildGrookaiTheme;
import 'package:grookai_vault/services/intake/intake_models.dart';
import 'package:grookai_vault/services/intake/intake_service.dart';
import 'package:grookai_vault/services/pricing/condition_price_service.dart';
import 'package:grookai_vault/widgets/vault/vault_add_review_sheet.dart';

const _printing = '00000000-0000-4000-8000-000000000001';

class _LocalIntake extends IntakeService {
  _LocalIntake(super.client);
  @override
  Future<List<PurchaseLot>> lots() async => [];
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'native add controls use exact local HTTP references without inventory writes',
    (tester) async {
      final requests = <String>[];
      final requestDetails = <Map<String, String?>>[];
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final client = SupabaseClient(
        'http://127.0.0.1:54321',
        'fixture-key',
        authOptions: const AuthClientOptions(autoRefreshToken: false),
      );
      addTearDown(() async {
        await server.close(force: true);
        await client.dispose();
      });
      server.listen((request) async {
        requestDetails.add({
          'method': request.method,
          'path': request.uri.path,
          'authorization': request.headers.value('Authorization'),
          'printing': request.uri.queryParameters['card_printing_id'],
        });
        final condition = request.uri.queryParameters['condition']!;
        requests.add(condition);
        final amount = switch (condition) {
          'NM' => 2.51,
          'LP' => 1.16,
          _ => null,
        };
        request.response.headers.contentType = ContentType.json;
        request.response.write(
          jsonEncode({
            'ok': true,
            'pricing': {
              'version': 'CONDITION_PRICE_READ_MODEL_V1',
              'card_printing_id': _printing,
              'condition': condition,
              'status': amount == null ? 'unavailable' : 'available',
              'confidence': amount == null ? 'unavailable' : 'medium',
              'amount': amount,
              'currency': null,
              'currency_hint': 'USD',
              'currency_verified': false,
              'source_label': 'TCGplayer condition price via TCGTracking',
              'provider_updated_at': '2026-11-17T13:36:40-05:00',
              'pricing_lane': 'reference',
            },
          }),
        );
        await request.response.close();
      });
      ConditionPriceReader reader() => ConditionPriceService(
        origin: Uri.parse('http://127.0.0.1:${server.port}'),
        session: () =>
            (owner: 'local-fixture-owner', token: 'local-fixture-token'),
      );
      for (final brightness in Brightness.values) {
        final before = requests.length;
        await tester.pumpWidget(
          MaterialApp(
            key: ValueKey(brightness),
            theme: buildGrookaiTheme(brightness),
            home: Scaffold(
              body: SafeArea(
                child: VaultAddReviewSheet(
                  service: _LocalIntake(client),
                  conditionPriceReader: reader,
                  initialAcquiredOn: DateTime(2026, 11, 17),
                  cardPrintId: 'local-parent',
                  gvId: 'LOCAL-FIXTURE',
                  name: 'Condition pricing fixture',
                  setName: 'Local fixture',
                  printingId: _printing,
                  finish: 'Normal',
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(requests.length, before);
        for (final selection in [
          ('NM', '2.51'),
          ('LP', '1.16'),
          ('DMG', 'DMG price unavailable'),
        ]) {
          await tester.ensureVisible(find.text(selection.$1));
          await tester.pumpAndSettle();
          await tester.tap(find.text(selection.$1));
          // A real socket response can arrive after the first settled frame.
          for (
            var attempt = 0;
            attempt < 50 && find.text(selection.$2).evaluate().isEmpty;
            attempt++
          ) {
            await tester.pump(const Duration(milliseconds: 100));
          }
          expect(find.text(selection.$2), findsOneWidget);
          expect(
            find.text('Reported amount · USD assumed'),
            selection.$1 == 'DMG' ? findsNothing : findsOneWidget,
          );
          expect(find.text('TCGplayer via TCGTracking'), findsOneWidget);
          await tester.ensureVisible(find.text(selection.$2));
          await tester.pumpAndSettle();
          if (brightness == Brightness.dark && selection.$1 == 'NM') {
            await binding.convertFlutterSurfaceToImage();
            await tester.pumpAndSettle();
          }
          await binding.takeScreenshot(
            'condition-price-${brightness.name}-${selection.$1.toLowerCase()}',
          );
        }
        expect(requests.sublist(before), ['NM', 'LP', 'DMG']);
        await tester.ensureVisible(find.text('Graded slab'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Graded slab'));
        await tester.pumpAndSettle();
        expect(find.text('TCGplayer via TCGTracking'), findsNothing);
        expect(
          tester
              .widget<FilledButton>(
                find.widgetWithText(FilledButton, 'Add 1 copy'),
              )
              .onPressed,
          isNull,
        );
        expect(tester.takeException(), isNull);
      }
      for (final request in requestDetails) {
        expect(request, {
          'method': 'GET',
          'path': '/api/condition-pricing/v1',
          'authorization': 'Bearer local-fixture-token',
          'printing': _printing,
        });
      }
      binding.reportData = {
        ...?binding.reportData,
        'fixture_only': true,
        'inventory_writes': 0,
        'requests': requests,
      };
    },
  );
}
