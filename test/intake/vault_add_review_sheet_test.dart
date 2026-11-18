import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/intake/intake_service.dart';
import 'package:grookai_vault/services/intake/intake_models.dart';
import 'package:grookai_vault/main.dart' show buildGrookaiTheme;
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'package:grookai_vault/widgets/vault/vault_add_review_sheet.dart';
import 'package:grookai_vault/services/pricing/condition_price_service.dart';

class _Prices implements ConditionPriceReader {
  _Prices(this.requests);
  final List<(String, String)> requests;
  @override
  Future<ConditionPriceReference> read(
    String printingId,
    String condition,
  ) async {
    requests.add((printingId, condition));
    return ConditionPriceReference(
      printingId: printingId,
      condition: condition,
      amount: switch (condition) {
        'NM' => 2.51,
        'LP' => 1.16,
        _ => null,
      },
      updatedAt: DateTime.utc(2026, 11, 17),
    );
  }

  @override
  void dispose() {}
}

class _Service extends IntakeService {
  _Service()
    : super(
        SupabaseClient(
          'http://localhost:54321',
          'fixture-key',
          authOptions: const AuthClientOptions(autoRefreshToken: false),
        ),
      );
  @override
  Future<List<PurchaseLot>> lots() async => [];
}

Future<void> _renderReview(
  WidgetTester tester,
  Brightness brightness, {
  ConditionPriceReaderFactory? conditionPriceReader,
}) async {
  final service = _Service();
  tester.view.physicalSize = const Size(384, 824);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final iconLoader = FontLoader('MaterialIcons')
    ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
  await iconLoader.load();
  final loader = FontLoader('Roboto')
    ..addFont(rootBundle.load('assets/fonts/Roboto/Roboto-Regular.ttf'))
    ..addFont(rootBundle.load('assets/fonts/Roboto/Roboto-Bold.ttf'));
  await loader.load();
  await tester.pumpWidget(
    MaterialApp(
      theme: buildGrookaiTheme(brightness),
      home: Scaffold(
        body: RepaintBoundary(
          key: const ValueKey('review'),
          child: Material(
            color: GvPalette.scheme(brightness).surface,
            child: SafeArea(
              child: VaultAddReviewSheet(
                conditionPriceReader: conditionPriceReader,
                service: service,
                initialAcquiredOn: DateTime(2026, 10, 27),
                cardPrintId: 'card',
                gvId: 'GV-PK-SVP-173',
                name: 'Eevee',
                setName: 'Scarlet & Violet Promos · 173',
                printingId: 'holo',
                finish: 'Holofoil',
              ),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'actual add controls switch exact condition references without saving a copy',
    (tester) async {
      final requests = <(String, String)>[];
      await _renderReview(
        tester,
        Brightness.dark,
        conditionPriceReader: () => _Prices(requests),
      );
      expect(requests, isEmpty);
      for (final selection in [
        ('NM', '2.51'),
        ('LP', '1.16'),
        ('DMG', 'DMG price unavailable'),
      ]) {
        await tester.ensureVisible(find.text(selection.$1));
        await tester.tap(find.text(selection.$1));
        await tester.pumpAndSettle();
        expect(find.text(selection.$2), findsOneWidget);
        expect(find.text('TCGplayer via TCGTracking'), findsOneWidget);
      }
      expect(requests, [('holo', 'NM'), ('holo', 'LP'), ('holo', 'DMG')]);
      expect(find.text('2.51'), findsNothing);
      await tester.ensureVisible(find.text('Graded slab'));
      await tester.tap(find.text('Graded slab'));
      await tester.pumpAndSettle();
      expect(find.text('DMG price unavailable'), findsNothing);
      expect(find.text('TCGplayer via TCGTracking'), findsNothing);
      final add = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Add 1 copy'),
      );
      expect(add.onPressed, isNull);
      expect(tester.takeException(), isNull);
    },
  );
  for (final brightness in Brightness.values) {
    testWidgets(
      'review form fits mobile ${brightness.name} with bundled Roboto',
      (tester) async {
        await _renderReview(tester, brightness);
        expect(find.text('Unknown'), findsOneWidget);
        expect(find.text('None'), findsOneWidget);
        expect(find.text('Not recorded · optional'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.tap(find.text('Graded slab'));
        await tester.pumpAndSettle();
        expect(
          find.textContaining('Until verification finishes'),
          findsOneWidget,
        );
        final quantity = tester.widget<TextField>(find.byType(TextField).first);
        expect(quantity.controller!.text, '1');
        expect(quantity.enabled, false);
        expect(tester.takeException(), isNull);
      },
    );
    testWidgets(
      'review form artwork matches the accepted Windows ${brightness.name} rendering',
      (tester) async {
        await _renderReview(tester, brightness);
        await expectLater(
          find.byKey(const ValueKey('review')),
          matchesGoldenFile('goldens/vault_add_review_${brightness.name}.png'),
        );
      },
      tags: ['golden'],
    );
  }
}
